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

    const fullTranscription = messages
      .map((m: any) => `${m.role === "user" ? "Enfant" : "Bobby"}: ${m.content}`)
      .join("\n");

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
  "alerts": [{"type": "emotion", "message": "message d'alerte si nécessaire"}],
  "sociability_score": 50,
  "curiosity_score": 50,
  "emotional_stability_score": 50,
  "extracted_interests": ["centres d'intérêt détectés"],
  "session_tags": ["fun", "learning", "emotion", "story"]
}

RÈGLES:
- Scores d'émotions entre 0 et 100
- sociability_score: 0-100 (interactions sociales, expressivité, ouverture)
- curiosity_score: 0-100 (questions posées, exploration de sujets)
- emotional_stability_score: 0-100 (équilibre émotionnel, pas de changements brusques)
- extracted_interests: mots-clés des centres d'intérêt (ex: "dinosaures", "espace", "animaux")
- session_tags: choisir parmi ["fun", "learning", "emotion", "story"] selon le contenu
- Ne jamais juger l'enfant
- Rester factuel et neutre
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
        max_tokens: 2000,
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
        sociability_score: 50,
        curiosity_score: 50,
        emotional_stability_score: 50,
        extracted_interests: [],
        session_tags: [],
      };
    }

    // Save analysis with new fields
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
        sociability_score: analysis.sociability_score ?? 50,
        curiosity_score: analysis.curiosity_score ?? 50,
        emotional_stability_score: analysis.emotional_stability_score ?? 50,
        extracted_interests: analysis.extracted_interests || [],
      })
      .select()
      .single();

    if (saveError) {
      console.error("Save error:", saveError);
    }

    // Update session with summary and tags
    await supabase
      .from("child_sessions")
      .update({
        ai_summary: analysis.summary,
        tags: analysis.session_tags || [],
      })
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
