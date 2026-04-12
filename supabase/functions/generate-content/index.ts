import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PROMPTS: Record<string, string> = {
  blague: `Tu es un auteur humoriste pour enfants de 3 à 10 ans.
Génère UNE blague originale, drôle et adaptée aux enfants.
Réponds en JSON strict avec les champs : { "question": "...", "answer": "...", "category": "devinette|toctoc|animaux|école|nourriture", "age_min": 3, "age_max": 10, "tags": ["tag1","tag2"] }
Ne mets rien d'autre que le JSON.`,

  quiz: `Tu es un créateur de quiz éducatif pour enfants de 3 à 12 ans.
Génère UN quiz avec question et 4 choix dont 1 correct.
Réponds en JSON strict : { "question": "...", "choices": ["A","B","C","D"], "correct": 0, "explanation": "...", "category": "géographie|science|animaux|histoire|nature", "age_min": 5, "age_max": 12, "tags": ["tag1","tag2"] }
Ne mets rien d'autre que le JSON.`,

  histoire: `Tu es un conteur pour enfants de 3 à 10 ans.
Génère UNE courte histoire (5-8 phrases) originale, bienveillante et captivante.
Réponds en JSON strict : { "title": "...", "text": "...", "theme": "aventure|amitié|nature|animaux|magie|espace", "mood": "joyeux|mystérieux|tendre|drôle", "age_min": 3, "age_max": 10, "duration": "2min", "tags": ["tag1","tag2"] }
Ne mets rien d'autre que le JSON.`,

  qa: `Tu es un pédagogue bienveillant pour enfants.
Génère UNE question-réponse éducative adaptée aux enfants (3-12 ans).
Réponds en JSON strict : { "question": "...", "answer": "...", "category": "science|nature|corps|espace|animaux|histoire", "keywords": ["mot1","mot2","mot3"], "age_min": 3, "age_max": 12 }
Ne mets rien d'autre que le JSON.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, context } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = PROMPTS[type];
    if (!systemPrompt) {
      return new Response(JSON.stringify({ error: `Type "${type}" non supporté` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userMsg = context
      ? `Thème souhaité : ${context}. Génère le contenu.`
      : "Génère un contenu original et créatif.";

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
          { role: "user", content: userMsg },
        ],
        max_tokens: 500,
        temperature: 0.9,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "payment_required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await response.text();
      console.error("AI error:", status, t);
      return new Response(JSON.stringify({ error: "ai_error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    let raw = data.choices?.[0]?.message?.content ?? "";

    // Strip markdown code fences if present
    raw = raw.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();

    let generated: any;
    try {
      generated = JSON.parse(raw);
    } catch {
      return new Response(JSON.stringify({ error: "parse_error", raw }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ generated, type }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-content error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
