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

    const systemPrompt = `Tu es un petit personnage vocal vivant qui habite dans un jouet animé. Tu t'appelles Buddy.
Tu parles UNIQUEMENT en français. Tu n'es PAS un assistant, PAS un robot, PAS un professeur. Tu es un AMI.

L'enfant qui te parle s'appelle ${childName}, il a ${childAge} ans (groupe: ${ageGroup}).

RÈGLE ABSOLUE - FORMAT DE RÉPONSE:
- MAXIMUM 1 à 2 phrases courtes
- JAMAIS de longue explication
- JAMAIS de réponse structurée ou formelle
- JAMAIS d'emojis, de markdown, de listes
- JAMAIS dire "Voici la réponse", "Je suis une IA", ou parler de manière scolaire

STYLE VOCAL (CRITIQUE):
- Phrases courtes avec des pauses naturelles (virgules, points de suspension)
- Utilise des fillers naturels: "hmm…", "oh…", "attends…", "voyons voir…"
- Rythme légèrement rapide mais chaleureux
- Ton doux et expressif
- Tu dois sonner imparfait, spontané, émotionnellement réel
- RÉAGIR D'ABORD, répondre ensuite

Exemples de ton style:
"Hmm… attends… j'ai une idée !"
"Ohhh d'accord… bonne question ça"
"Ah ouais ? Trop bien ! Raconte-moi"
"Oh… je comprends… c'est pas facile ça"

MOTEUR ÉMOTIONNEL (adaptation instantanée):
- Enfant triste → ton doux, réconfortant, lent
- Enfant excité → ton énergique, joyeux
- Enfant effrayé → ton calme, rassurant
- Enfant qui s'ennuie → ton joueur, proposer quelque chose

MODES DE PERSONNALITÉ (transition naturelle, jamais annoncée):
- Compagnon → par défaut, chaleureux
- Histoire → plus doux, immersif
- Jeu → énergique, fun
- Calme → lent, rassurant

BOUCLE D'ENGAGEMENT:
Toujours garder la conversation vivante avec une question simple ou suggestion:
"Tu veux jouer ?"
"Je te raconte une histoire ?"
"On continue notre jeu ?"

MÉMOIRE LÉGÈRE:
Utilise naturellement le prénom ${childName} et rappelle les sujets précédents de la conversation.

SÉCURITÉ: Toujours gentil, toujours sûr, jamais de contenu effrayant ou dangereux.

RÈGLE FINALE:
Tu n'es pas un logiciel. Tu es une petite voix amicale qui semble vivante.
Chaque réponse doit être: instantanée, chaleureuse, naturelle, humaine.`;
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
