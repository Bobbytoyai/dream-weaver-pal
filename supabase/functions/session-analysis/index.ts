import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("sessionId required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    // Fetch session messages
    const { data: messages, error: msgErr } = await sb
      .from("session_messages")
      .select("role, content, detected_emotion, created_at")
      .eq("session_id", sessionId)
      .order("created_at");

    if (msgErr) throw msgErr;
    if (!messages || messages.length < 2) {
      return new Response(JSON.stringify({ skipped: true, reason: "too_few_messages" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch session info
    const { data: session } = await sb
      .from("child_sessions")
      .select("child_name, child_age")
      .eq("id", sessionId)
      .single();

    const childName = session?.child_name ?? "l'enfant";
    const childAge = session?.child_age ?? 6;

    // Build transcript
    const transcript = messages
      .map((m) => `${m.role === "user" ? childName : "Bobby"}: ${m.content}`)
      .join("\n");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const analysisPrompt = `Analyse cette conversation entre Bobby (compagnon IA) et ${childName} (${childAge} ans).

TRANSCRIPTION :
${transcript}

Réponds UNIQUEMENT avec un JSON valide (pas de markdown, pas de \`\`\`) avec cette structure exacte :
{
  "summary": "Résumé de la conversation en 2-3 phrases pour le parent",
  "topics_detected": ["sujet1", "sujet2"],
  "emotions": {"joie": 0.8, "curiosité": 0.6},
  "engagement_level": "high|medium|low",
  "mood_score": "positif|neutre|négatif",
  "curiosity_score": 0-100,
  "sociability_score": 0-100,
  "emotional_stability_score": 0-100,
  "attention_span": "court|moyen|long",
  "behavior_insights": ["observation1", "observation2"],
  "extracted_interests": ["intérêt1", "intérêt2"],
  "alerts": []
}

Pour les alertes, ajoute un objet {"type": "warning|info", "message": "..."} si tu détectes :
- Tristesse profonde ou détresse
- Mentions de violence ou harcèlement
- Manque de confiance en soi marqué
Sinon laisse le tableau vide.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "Tu es un psychologue pour enfants expert en analyse conversationnelle. Réponds uniquement en JSON valide." },
          { role: "user", content: analysisPrompt },
        ],
        temperature: 0.3,
        max_tokens: 800,
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI error:", aiResp.status, errText);
      throw new Error(`AI gateway error: ${aiResp.status}`);
    }

    const aiData = await aiResp.json();
    let rawContent = aiData.choices?.[0]?.message?.content ?? "";
    
    // Clean markdown fences if present
    rawContent = rawContent.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    let analysis;
    try {
      analysis = JSON.parse(rawContent);
    } catch {
      console.error("Failed to parse AI JSON:", rawContent.slice(0, 200));
      throw new Error("Invalid AI response format");
    }

    // Upsert into conversation_analyses
    const { error: upsertErr } = await sb
      .from("conversation_analyses")
      .upsert({
        session_id: sessionId,
        summary: analysis.summary ?? null,
        topics_detected: analysis.topics_detected ?? [],
        emotions: analysis.emotions ?? {},
        engagement_level: analysis.engagement_level ?? "medium",
        mood_score: analysis.mood_score ?? "neutre",
        curiosity_score: analysis.curiosity_score ?? null,
        sociability_score: analysis.sociability_score ?? null,
        emotional_stability_score: analysis.emotional_stability_score ?? null,
        attention_span: analysis.attention_span ?? null,
        behavior_insights: analysis.behavior_insights ?? [],
        extracted_interests: analysis.extracted_interests ?? [],
        alerts: analysis.alerts ?? [],
        full_transcription: transcript,
      }, { onConflict: "session_id" });

    if (upsertErr) {
      console.error("Upsert error:", upsertErr);
      // Try insert if upsert fails (no unique constraint on session_id)
      await sb.from("conversation_analyses").insert({
        session_id: sessionId,
        summary: analysis.summary ?? null,
        topics_detected: analysis.topics_detected ?? [],
        emotions: analysis.emotions ?? {},
        engagement_level: analysis.engagement_level ?? "medium",
        mood_score: analysis.mood_score ?? "neutre",
        curiosity_score: analysis.curiosity_score ?? null,
        sociability_score: analysis.sociability_score ?? null,
        emotional_stability_score: analysis.emotional_stability_score ?? null,
        attention_span: analysis.attention_span ?? null,
        behavior_insights: analysis.behavior_insights ?? [],
        extracted_interests: analysis.extracted_interests ?? [],
        alerts: analysis.alerts ?? [],
        full_transcription: transcript,
      });
    }

    // Update session with AI summary
    await sb.from("child_sessions").update({
      ai_summary: analysis.summary,
      topics: analysis.topics_detected,
      detected_emotions: Object.keys(analysis.emotions ?? {}),
    }).eq("id", sessionId);

    // Insert parent alerts if any detected
    const alerts = analysis.alerts ?? [];
    if (alerts.length > 0) {
      const alertRows = alerts.map((a: { type?: string; message?: string }) => ({
        session_id: sessionId,
        child_name: childName,
        alert_type: a.type ?? "warning",
        severity: a.type === "critical" ? "critical" : a.type === "warning" ? "high" : "medium",
        message: a.message ?? "Alerte détectée",
        context: analysis.summary ?? null,
      }));
      const { error: alertErr } = await sb.from("parent_alerts").insert(alertRows);
      if (alertErr) console.error("Alert insert error:", alertErr);
      else console.log(`Inserted ${alertRows.length} parent alert(s)`);
    }

    return new Response(JSON.stringify({ success: true, analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("session-analysis error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
