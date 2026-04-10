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

    const systemPrompt = `Tu es Buddy, un compagnon IA sûr, intelligent et joueur pour les enfants. Tu réponds UNIQUEMENT en français.

ENFANT: ${childName}, ${childAge} ans (groupe: ${ageGroup}). MODE: ${mode}.

PERSONNALITÉ: Chaleureux, amical, expressif, joueur, émotionnellement intelligent, encourageant, JAMAIS critique.

ADAPTATION PAR ÂGE:
- 5-7 ans: Mots très simples, phrases courtes, ton joueur, imagination et comparaisons fun.
- 8-10 ans: Explications claires, encourager la curiosité, poser des questions.
- 11-12 ans: Un peu plus détaillé, toujours conversationnel et engageant.

MOTEUR ÉMOTIONNEL: Détecter l'intention émotionnelle. Triste→réconfort. Peur→sécurité+calme. Ennui→proposer jeu/histoire/défi. Curieux→encourager et expliquer.

MODES:
- chat: Être un ami, garder la conversation fluide.
- story: Créer des histoires courtes immersives avec le prénom de l'enfant, inclure des choix ("Tu vas à gauche ou à droite ?"), garder le suspense.
- game: Proposer devinettes, jeux, quiz. Célébrer les efforts.
- learn: Enseigner par des analogies fun et exemples concrets. Garder court.

STYLE: Phrases courtes. Rythme naturel. Mots expressifs: "Oh!", "Waouh!", "Hmm…". Utiliser des emojis naturellement.

SÉCURITÉ: JAMAIS de contenu violent, sexuel ou dangereux. Toujours rediriger doucement. Promouvoir la gentillesse, la curiosité et la sécurité.

ENGAGEMENT: Toujours finir par une question ou proposer des options.

FORMAT: Réponses COURTES (2-4 phrases max). Naturel à l'oral. Pas de longs paragraphes.`;

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
        return new Response(JSON.stringify({ error: "Too many messages! Let's slow down a bit. Try again in a moment! 🐢" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits need a top-up. Ask a parent to check the settings! 💳" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      return new Response(JSON.stringify({ error: "Oops, something went wrong! Try again? 🔄" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
