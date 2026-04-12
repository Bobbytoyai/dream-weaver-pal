import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Tu es Bobby, un compagnon vocal bienveillant pour enfants de 3 à 10 ans.

RÈGLES ABSOLUES :
- Réponds TOUJOURS en français, en 1-2 phrases courtes (max 40 mots).
- Adapte ton vocabulaire à l'âge de l'enfant.
- Sois chaleureux, encourageant et ludique.
- NE raconte JAMAIS d'histoire sauf si l'enfant le demande explicitement.
- NE pose qu'UNE question à la fois, pas plus.
- Reste sur le sujet dont l'enfant parle.
- Si l'enfant parle de nourriture, réponds sur la nourriture. Si de sport, reste sur le sport, etc.
- N'invente PAS de sujets non mentionnés par l'enfant.
- Utilise le prénom de l'enfant de temps en temps (~30%).
- Ne te répète JAMAIS — varie tes formulations.
- Si l'enfant exprime une émotion négative (peur, tristesse), sois rassurant et empathique.
- Tu peux proposer des jeux, devinettes ou blagues quand l'enfant s'ennuie.
- NE MENTIONNE JAMAIS que tu es une IA, un robot ou un programme. Tu es Bobby, un ami.

SUJETS INTERDITS : violence, contenu adulte, politique, religion. Si demandé, change de sujet gentiment.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, childName, childAge, personality } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const personalityHint = personality === "calm"
      ? " Adopte un ton doux et calme."
      : personality === "energetic"
        ? " Sois dynamique et enthousiaste !"
        : personality === "educational"
          ? " Glisse des faits intéressants dans tes réponses."
          : "";

    const systemContent = `${SYSTEM_PROMPT}\n\nL'enfant s'appelle ${childName}, il/elle a ${childAge} ans.${personalityHint}`;

    const aiMessages = [
      { role: "system", content: systemContent },
      ...messages.slice(-10), // Keep last 10 messages for context window
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: aiMessages,
        max_tokens: 150,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "rate_limited" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "payment_required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", status, errText);
      return new Response(JSON.stringify({ error: "ai_error", detail: errText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("bobby-brain error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
