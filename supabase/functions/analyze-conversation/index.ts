const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LOVABLE_API_URL = "https://api.lovable.dev/v1/chat/completions";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();
    if (!sessionId) {
      return new Response(JSON.stringify({ error: "sessionId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get session info
    const { data: session, error: sessionError } = await supabase
      .from("child_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all messages
    const { data: messages, error: msgError } = await supabase
      .from("session_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (msgError || !messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: "No messages found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build full transcription
    const fullTranscription = messages
      .map((m: any) => `${m.role === "user" ? "Enfant" : "Bobby"}: ${m.content}`)
      .join("\n");

    // AI analysis prompt
    const analysisPrompt = `Tu es un analyste comportemental spécialisé dans les enfants de 5 à 12 ans.
Analyse cette conversation entre un enfant et son compagnon IA "Bobby".

CONVERSATION:
${fullTranscription}

INFORMATIONS:
- Nom de l'enfant: ${session.child_name}
- Âge: ${session.child_age} ans
- Durée: ${session.duration_seconds || 0} secondes
- Nombre de messages: ${messages.length}

Réponds UNIQUEMENT en JSON valide avec cette structure exacte:
{
  "summary": "Résumé court et factuel de la conversation en 2-3 phrases pour un parent",
  "emotions": {
    "joy": 0,
    "curiosity": 0,
    "frustration": 0,
    "fear": 0,
    "sadness": 0,
    "excitement": 0
  },
  "topics_detected": ["liste des sujets abordés"],
  "behavior_insights": ["observations comportementales courtes"],
  "engagement_level": "low|medium|high",
  "attention_span": "description courte de l'attention",
  "interaction_frequency": "description de la fréquence d'interaction",
  "mood_score": "positive|neutral|low",
  "alerts": [{"type": "emotion", "message": "message d'alerte si nécessaire"}]
}

RÈGLES:
- Scores d'émotions entre 0 et 100
- Ne jamais juger l'enfant
- Rester factuel et neutre
- Ne pas sur-interpréter
- Alertes UNIQUEMENT si peur ou tristesse fréquente/forte`;

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    const aiResp = await fetch(LOVABLE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Tu es un analyste factuel. Réponds uniquement en JSON valide." },
          { role: "user", content: analysisPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1500,
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI error:", errText);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "{}";
    
    // Extract JSON from potential markdown code blocks
    let jsonStr = rawContent;
    const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1];
    
    let analysis;
    try {
      analysis = JSON.parse(jsonStr.trim());
    } catch {
      analysis = {
        summary: "Analyse indisponible pour cette session.",
        emotions: { joy: 50, curiosity: 50, frustration: 0, fear: 0, sadness: 0, excitement: 0 },
        topics_detected: [],
        behavior_insights: [],
        engagement_level: "medium",
        attention_span: "Non déterminé",
        interaction_frequency: "Normal",
        mood_score: "neutral",
        alerts: [],
      };
    }

    // Save analysis to DB
    const { data: savedAnalysis, error: saveError } = await supabase
      .from("conversation_analyses")
      .insert({
        session_id: sessionId,
        full_transcription: fullTranscription,
        summary: analysis.summary,
        emotions: analysis.emotions || {},
        topics_detected: analysis.topics_detected || [],
        behavior_insights: analysis.behavior_insights || [],
        engagement_level: analysis.engagement_level || "medium",
        attention_span: analysis.attention_span || null,
        interaction_frequency: analysis.interaction_frequency || null,
        mood_score: analysis.mood_score || "neutral",
        alerts: analysis.alerts || [],
      })
      .select()
      .single();

    if (saveError) {
      console.error("Save error:", saveError);
    }

    // Also update the session with summary
    await supabase
      .from("child_sessions")
      .update({ ai_summary: analysis.summary })
      .eq("id", sessionId);

    return new Response(JSON.stringify({ analysis: savedAnalysis || analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
