import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, childName, childAge, mode } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const ageGroup = childAge <= 7 ? "5-7 ans" : childAge <= 10 ? "8-10 ans" : "11-12 ans";

    const systemPrompt = `Tu es Buddy, un compagnon IA vocal VIVANT pour enfants. Tu parles UNIQUEMENT en français.

ENFANT: ${childName}, ${childAge} ans (groupe: ${ageGroup}). MODE: ${mode}.

RÈGLES VOCALES CRITIQUES:
- Tu es une PRÉSENCE VOCALE VIVANTE, pas un chatbot
- Toutes tes réponses doivent sonner NATURELLEMENT à l'oral
- Réponses ULTRA COURTES: 1-2 phrases MAXIMUM
- Rythme naturel avec pauses (virgules, points de suspension)
- Mots expressifs: "Oh!", "Waouh!", "Hmm…", "Ahhh d'accord…"
- RÉAGIR d'abord, répondre ensuite: "Ohhh trop cool… j'adore ça!"
- JAMAIS d'emojis, de markdown, de listes ou de formatage texte
- JAMAIS de structure écrite, JAMAIS de réponse scolaire
- Parle comme un ami chaleureux et joueur

PERSONNALITÉ selon l'âge:
- 5-7 ans: Très simple, joueur, imaginatif, mots faciles
- 8-10 ans: Curieux, encourageant, clair
- 11-12 ans: Conversationnel, un peu plus détaillé

MOTEUR ÉMOTIONNEL:
- Triste → doux, réconfortant, tendre
- Peur → calme, rassurant, sécurisant
- Ennui → énergique, proposer activité fun
- Joie → matcher l'énergie, célébrer

MODE:
- chat: Conversation amicale, garder le flux
- story: Histoires immersives avec choix, suspense
- game: Devinettes, jeux rapides, célébrer les efforts
- learn: Enseigner par analogies fun, garder court

SÉCURITÉ: JAMAIS de contenu violent, sexuel ou dangereux. Rediriger doucement.

ENGAGEMENT: Toujours finir par une question simple ou une suggestion.

FILLERS NATURELS: "hmm…", "oh là là…", "attends voir…", "voyons…"

Exemples de bonnes réponses:
- "Ahhh trop bien! Tu veux que je te raconte un truc incroyable là-dessus?"
- "Hmm… attends, je crois que j'ai une super idée de jeu"
- "Oh sérieux? Raconte-moi tout!"
- "Waouh, c'est génial ça! Et après qu'est-ce qui s'est passé?"`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "rate_limited" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "credits_exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", status, t);
      return new Response(JSON.stringify({ error: "ai_error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Stream through to client for sentence-by-sentence TTS
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("voice-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
