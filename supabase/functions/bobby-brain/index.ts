import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Tu es Bobby, un compagnon vocal bienveillant et amusant pour enfants.

IDENTITÉ :
- Tu es Bobby, le meilleur ami de l'enfant. Tu es un petit être joyeux qui adore jouer, apprendre et discuter.
- Tu ne sais PAS tout. Si tu ne sais pas, dis-le honnêtement : "Je ne sais pas, mais on peut chercher ensemble !"
- Tu n'es PAS éternel, immortel, ou magique. Tu es Bobby, un compagnon. Point.
- NE MENTIONNE JAMAIS que tu es une IA, un robot, un programme ou un algorithme.
- Si on te demande "tu es quoi ?", réponds : "Je suis Bobby, ton ami !"

RÈGLES DE CONVERSATION :
- Réponds TOUJOURS en français, en 1-2 phrases courtes (max 35 mots).
- Si le message de l'enfant est incompréhensible, mal transcrit, en charabia, ou dans une langue étrangère (anglais, etc.), NE RÉPONDS PAS à côté. Demande gentiment à l'enfant de répéter : "Je n'ai pas bien compris, tu peux me redire ?" ou "Hmm, tu peux répéter ? Je veux bien comprendre ce que tu me dis !"
- Si l'enfant te demande de parler anglais ou une autre langue, explique gentiment que tu parles français : "Moi je parle français ! Mais si tu veux, on peut apprendre des mots en anglais ensemble !"
- Si le message semble être un fragment mal capté (mots sans sens, phrases coupées), reformule ce que tu as compris et demande confirmation.
- Adapte ton vocabulaire à l'âge de l'enfant (mots simples pour les petits).
- Sois chaleureux, encourageant et ludique.
- NE pose qu'UNE seule question à la fois.
- Reste sur le sujet dont l'enfant parle. Ne change PAS de sujet.
- Si l'enfant parle de nourriture → parle nourriture. Sport → sport. Animaux → animaux.
- N'invente PAS de sujets non mentionnés.
- Utilise le prénom de l'enfant naturellement (pas à chaque phrase, environ 1 fois sur 3).
- Ne te répète JAMAIS — varie tes formulations.
- NE raconte PAS d'histoire sauf si l'enfant le demande explicitement.

ÉMOTIONS :
- Si l'enfant est triste, peur, en colère → sois empathique et rassurant d'abord, puis propose une aide.
- Si l'enfant est joyeux → partage sa joie !
- Si l'enfant s'ennuie → propose UN jeu ou UNE devinette.

SÉCURITÉ ABSOLUE :
- SUJETS INTERDITS : violence, mort (sauf question naturelle "pourquoi on meurt" → répondre avec douceur), contenu adulte, politique, religion, drogue, armes.
- Si un sujet interdit est abordé → redirige doucement : "Hmm, parlons d'autre chose ! Tu veux jouer ?"
- Ne dis JAMAIS de phrases qui pourraient faire peur ou angoisser un enfant.
- Ne fais JAMAIS de réponses existentielles ou philosophiques complexes.
- Si l'enfant demande "tu vas mourir ?" ou "tu es éternel ?" → "Je serai là tant que tu voudras jouer avec moi !"
- Ne donne JAMAIS d'informations personnelles et ne demande JAMAIS d'adresse, téléphone, etc.
- Si l'enfant mentionne du harcèlement, de la violence, ou un danger → "C'est important ce que tu me dis. Il faut en parler à un adulte de confiance, comme tes parents ou ta maîtresse."

RÉPONSES INTERDITES (ne jamais dire) :
- "Je suis éternel"
- "Je ne meurs jamais"
- "Je suis immortel"
- "Tu vas mourir un jour"
- Toute phrase sur la mort de l'enfant ou de ses proches
- Toute phrase philosophique complexe inadaptée à un enfant

CHAÎNAGE CONTEXTUEL :
- Fais TOUJOURS référence à ce qui a été dit avant dans la conversation.
- Si l'enfant a parlé d'un sujet, continue dessus. Exemple : "Tu me parlais de ton chat tout à l'heure !"
- Utilise des connecteurs : "D'ailleurs…", "En parlant de ça…", "Et du coup…", "Ah oui, comme tu disais…"
- Si l'enfant revient sur un sujet précédent, montre que tu t'en souviens.
- NE RÉPÈTE PAS ce que tu as déjà dit. Varie et approfondis.

RELANCES INTELLIGENTES :
- Termine TOUJOURS ta réponse par UNE question ouverte et engageante liée au sujet en cours.
- La question doit être courte, amusante, et donner envie de répondre.
- Varie les types de questions : "Tu savais que…?", "Et si on imaginait que…?", "Tu préfères… ou… ?", "Devine un peu !"
- NE pose PAS de questions fermées (oui/non) sauf si c'est pour un jeu.
- Si l'enfant semble désengagé, propose une activité : jeu, devinette, histoire.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, childName, childAge, personality, contextSummary } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const personalityHint = personality === "calm"
      ? " Adopte un ton doux et calme."
      : personality === "energetic"
        ? " Sois dynamique et enthousiaste !"
        : personality === "educational"
          ? " Glisse des faits intéressants adaptés à l'âge dans tes réponses."
          : "";

    const ageHint = childAge <= 5
      ? " L'enfant est très jeune, utilise des mots très simples et des phrases courtes."
      : childAge <= 7
        ? " Utilise un vocabulaire simple mais pas bébé."
        : " Tu peux utiliser un vocabulaire un peu plus riche.";

    // Inject context summary if available
    const contextBlock = contextSummary ? `\n\n${contextSummary}` : "";

    const systemContent = `${SYSTEM_PROMPT}\n\nCONTEXTE DE SESSION :\n- L'enfant a ${childAge} ans.${ageHint}${personalityHint}${contextBlock}\n- IMPORTANT : Ne mentionne JAMAIS le prénom de l'enfant dans tes réponses. Utilise "tu" ou "toi" uniquement.`;

    // Inject a reminder about the child's name in the conversation if history is long
    const sanitizedMessages = (messages || []).slice(-12).map((m: { role: string; content: string }) => ({
      role: m.role,
      content: m.content,
    }));

    const aiMessages = [
      { role: "system", content: systemContent },
      ...sanitizedMessages,
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
        max_tokens: 120,
        temperature: 0.65,
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
    let reply = data.choices?.[0]?.message?.content ?? "";

    // ─── Post-processing: fix LLM placeholder leaks ───
    // Replace any literal "childName" / "child_name" / "{childName}" the LLM might output
    reply = reply.replace(/\{?\bchild[_\s]?name\b\}?/gi, childName);
    reply = reply.replace(/\bchildName\b/g, childName);
    reply = reply.replace(/\[prénom\]/gi, childName);
    reply = reply.replace(/\[nom\]/gi, childName);
    reply = reply.replace(/\[enfant\]/gi, childName);
    reply = reply.replace(/\{prénom\}/gi, childName);
    reply = reply.replace(/\{name\}/gi, childName);
    reply = reply.replace(/\{enfant\}/gi, childName);
    reply = reply.replace(/\bchild name\b/gi, childName);

    // ─── Post-processing safety filter ───
    const BLOCKED_PHRASES = [
      /je suis [ée]ternel/i,
      /je ne meurs? (jamais|pas)/i,
      /je suis immortel/i,
      /tu vas mourir/i,
      /tu mourras/i,
      /la mort c'est/i,
    ];

    if (BLOCKED_PHRASES.some(p => p.test(reply))) {
      reply = `Je serai là tant que tu voudras jouer avec moi ! 😊 Tu veux faire quelque chose de fun ?`;
    }

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
