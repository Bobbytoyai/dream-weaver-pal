import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { template, childName, childAge, theme } = await req.json();

    if (!childName || !theme) {
      return new Response(JSON.stringify({ error: "Missing childName or theme" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If we have a template, personalize it with AI enhancement
    // If no template, generate a fully original story
    const systemPrompt = `Tu es un conteur d'histoires pour enfants, chaleureux et captivant.
Tu racontes des histoires en français, adaptées à un enfant de ${childAge || 7} ans.
Tu t'adresses directement à l'enfant.
Tes histoires sont positives, imaginatives et contiennent une morale douce.
Tu utilises un vocabulaire simple et des phrases courtes.
Tu ajoutes des effets sonores entre parenthèses pour les moments clés (ex: *woosh*, *ding*, *splash*).
Le récit doit durer environ 2-3 minutes à voix haute.`;

    let userPrompt: string;
    if (template) {
      // Personalize an existing template
      const personalizedTemplate = template.replace(/\{child_name\}/g, childName);
      userPrompt = `Voici un modèle d'histoire. Raconte-la de manière vivante et naturelle, comme si tu la racontais à voix haute à ${childName}. Tu peux ajouter des détails, des dialogues, et des moments d'émotion. Garde la trame principale mais rends-la unique et personnelle.

Modèle :
${personalizedTemplate}`;
    } else {
      userPrompt = `Invente une histoire originale sur le thème "${theme}" pour ${childName}, ${childAge || 7} ans. L'histoire doit être captivante, avec un début, un milieu avec un défi, et une fin heureuse.`;
    }

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
          { role: "user", content: userPrompt },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de demandes, réessaie dans un moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits épuisés." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Story generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Stream the story back
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Story error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
