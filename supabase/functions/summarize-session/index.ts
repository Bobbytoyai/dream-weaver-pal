import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("sessionId required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get session messages
    const { data: messages, error: msgError } = await supabase
      .from("session_messages")
      .select("role, content, detected_emotion, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (msgError) throw msgError;
    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ summary: "Aucune conversation enregistrée." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get session info
    const { data: session } = await supabase
      .from("child_sessions")
      .select("child_name, child_age, started_at, ended_at")
      .eq("id", sessionId)
      .single();

    const conversationText = messages
      .map((m: any) => `${m.role === "user" ? "Enfant" : "Buddy"}: ${m.content}`)
      .join("\n");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = `Analyse cette conversation entre un enfant (${session?.child_name}, ${session?.child_age} ans) et son compagnon IA vocal Buddy.

Conversation:
${conversationText}

Génère un résumé COURT pour les parents en français avec:
1. **Résumé** : 2-3 phrases sur ce dont ils ont parlé
2. **Humeur** : L'état émotionnel général de l'enfant (joyeux, curieux, triste, etc.)
3. **Centres d'intérêt** : Les sujets qui ont captivé l'enfant
4. **Comportement** : Observations sur l'engagement (actif, timide, créatif, etc.)
5. **Suggestion** : Un conseil pour les parents basé sur la conversation

Sois concis et bienveillant. Format en texte simple, pas de markdown.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Tu es un psychologue pour enfants qui analyse des conversations pour les parents. Réponds en français, de manière concise et bienveillante." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI error:", t);
      throw new Error("AI analysis failed");
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content || "Analyse indisponible.";

    // Detect emotions and topics from messages
    const emotions = [...new Set(messages
      .filter((m: any) => m.detected_emotion)
      .map((m: any) => m.detected_emotion))];

    // Update session with summary
    await supabase
      .from("child_sessions")
      .update({
        ai_summary: summary,
        detected_emotions: emotions,
        message_count: messages.length,
      })
      .eq("id", sessionId);

    return new Response(JSON.stringify({ summary, emotions, messageCount: messages.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("summarize error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
