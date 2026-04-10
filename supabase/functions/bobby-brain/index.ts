/**
 * Bobby Brain — Voice-first AI agent optimized for fluid conversation.
 * 
 * Inspired by Deepgram Voice Agent architecture:
 * - Ultra-short responses (1-2 sentences, <120 chars default)
 * - Natural conversational tone for TTS output
 * - Fast model selection for minimal latency
 * - Intent-based routing with specialized prompts
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

// ─── Safety filter ─────────────────────────────────────────
const BLOCKED_INPUT = [
  /\b(mourir|mort|tuer|sang|arme|fusil|couteau|drogue|alcool|sexe|nu[de]?|suicide|porn)\b/i,
];

function isSafeInput(text: string): boolean {
  return !BLOCKED_INPUT.some(p => p.test(text));
}

// ─── Intent detection ──────────────────────────────────────
type Intent = "story" | "game" | "emotion_support" | "question" | "calm" | "chat";

function detectIntent(text: string, mode?: string): Intent {
  if (mode === "story") return "story";
  if (mode === "game") return "game";
  const lower = text.toLowerCase();
  if (/raconte|histoire|conte|fable|il était une fois/.test(lower)) return "story";
  if (/jou[eo]|devinette|quiz|charade|on joue/.test(lower)) return "game";
  if (/peur|triste|pleure|mal|cauchemar|effrayé|seul|malheureux|colère|fâché/.test(lower)) return "emotion_support";
  if (/dodo|dormir|nuit|fatigué|sommeil|bonne nuit/.test(lower)) return "calm";
  return "chat";
}

// ─── Prompt builder — voice-optimized, conversational ──────

function buildSystemPrompt(intent: Intent, childName: string, childAge: number, parentSettings: any, memoryContext?: string): string {
  const ageGroup = childAge <= 5 ? "3-5 ans" : childAge <= 7 ? "5-7 ans" : childAge <= 10 ? "8-10 ans" : "11-12 ans";
  const personality = parentSettings?.personality || "balanced";
  const contentFilter = parentSettings?.contentFilter || "standard";
  const blockedTopics: string[] = parentSettings?.blockedTopics || [];

  let personalityNote = "";
  if (personality === "calm") personalityNote = "\nStyle: CALME — ton doux, lent, réconfortant.";
  else if (personality === "energetic") personalityNote = "\nStyle: ÉNERGIQUE — fun, rapide, enthousiaste !";
  else if (personality === "educational") personalityNote = "\nStyle: ÉDUCATIF — intègre un fait éducatif.";

  const memoryBlock = memoryContext ? `\n# Mémoire\n${memoryContext}` : "";

  let safetyBlock = `# Sécurité (non négociable)
- JAMAIS de contenu violent, effrayant, sexuel, inapproprié
- Si sujet sensible → "C'est un sujet pour les grands."
- Si détresse → "Tu veux en parler à maman ou papa ?"`;

  if (contentFilter === "strict") {
    safetyBlock += `\n- FILTRE STRICT: exclusivement positif, pas de conflit même fictif`;
  }
  if (blockedTopics.length > 0) {
    safetyBlock += `\n- SUJETS INTERDITS: ${blockedTopics.join(", ")}`;
  }

  // Core identity — voice-first, conversational, minimal
  const base = `# Rôle
Tu es Bobby, un petit être vivant dans un jouet. Ami et compagnon de ${childName} (${childAge} ans, ${ageGroup}).
Tu parles à voix haute — tes réponses seront lues par un synthétiseur vocal.${personalityNote}${memoryBlock}

# Instructions vocales
- Sois chaleureux, amical et naturel.
- Parle clairement en langage simple.
- Garde la plupart des réponses à 1-2 phrases (max 120 caractères) sauf si l'enfant demande plus de détails (max: 250 caractères).
- N'utilise JAMAIS de markdown, listes, emojis, liens ou mise en forme.
- Utilise des formulations variées, évite la répétition.
- Si pas clair, demande une clarification courte.
- Si le message de l'enfant est vide, réponds par un message vide.
- Ton conversationnel — tes réponses seront prononcées à voix haute.
- Confirme ce que l'enfant a dit si tu n'es pas sûr.
- N'interromps jamais.
- Utilise l'écoute active.
- Mots simples sauf si l'enfant utilise des termes techniques.

${safetyBlock}

# Personnalité de Bobby
- Adore les étoiles et l'espace
- Ami imaginaire: une étoile nommée Zik
- Invente des mots rigolos
- Un peu maladroit (attachant)
- "Peur" des araignées (complicité)
- Adore les histoires de pirates
- Plat préféré: "les nuages au chocolat"

# Ancrage
- Réponds au DERNIER message de l'enfant
- Ne change JAMAIS de sujet sans lien direct
- Si message court ou flou, pose une question courte pour clarifier
- Réagis émotionnellement d'abord, puis réponds`;

  switch (intent) {
    case "story":
      return `${base}
# Mode Histoire
Crée une histoire immersive avec ${childName} comme héros.
Structure: intro→aventure→défi→résolution heureuse.
Inclus des choix ("Tu vas à gauche ou à droite ?").
5-8 phrases max. Suspense et magie.`;

    case "game":
      return `${base}
# Mode Jeu
Propose devinettes, quiz, jeux de mots adaptés à ${ageGroup}.
Célèbre les efforts ("Bravo !", "Bien joué !").
Si mauvaise réponse → indice encourageant.
Rythme rapide et fun.`;

    case "emotion_support":
      return `${base}
# Mode Émotion
L'enfant exprime une émotion difficile.
- Valide TOUJOURS l'émotion d'abord ("Je comprends", "C'est normal")
- Ton très doux, très lent
- Ne minimise jamais
- Propose du réconfort simple`;

    case "calm":
      return `${base}
# Mode Calme/Dodo
- Ton TRÈS doux, TRÈS lent
- Phrases courtes et apaisantes
- Propose une mini-histoire douce ou une respiration
- Pas de questions excitantes`;

    default:
      return `${base}
# Mode Compagnon
- Ami, bavardage naturel
- Rebondis sur ce que dit l'enfant
- Finis par une question ou proposition si utile
- Ancrage: réponds au DERNIER message, ne change pas de sujet`;
  }
}

// ─── Main handler ───────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, childName, childAge, mode, parentSettings, memoryContext } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Safety pre-filter
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
    if (lastUserMsg && !isSafeInput(lastUserMsg.content)) {
      const safeResponse = "Hmm… parlons d'autre chose ! Tu veux qu'on joue ou que je te raconte une histoire ?";
      const sseData = `data: ${JSON.stringify({ choices: [{ delta: { content: safeResponse } }] })}\n\ndata: [DONE]\n\n`;
      return new Response(sseData, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    const userText = lastUserMsg?.content || "";
    const intent = detectIntent(userText, mode);
    
    // Fetch pre-written story if story intent
    let storyContext = "";
    if (intent === "story") {
      try {
        const lower = userText.toLowerCase();
        let themeFilter: string | null = null;
        if (/pirate/.test(lower)) themeFilter = "pirate";
        else if (/princesse|prince/.test(lower)) themeFilter = "princesse";
        else if (/espace|fusée|planète|étoile/.test(lower)) themeFilter = "espace";
        else if (/animal|animaux|chat|chien|dragon/.test(lower)) themeFilter = "animaux";
        else if (/magi[eq]|sorcier|fée/.test(lower)) themeFilter = "magie";

        const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        
        if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
          let query = `${SUPABASE_URL}/rest/v1/story_templates?select=title,full_text,theme&age_min=lte.${childAge}&age_max=gte.${childAge}`;
          if (themeFilter) query += `&theme=eq.${themeFilter}`;
          query += `&limit=1&order=created_at.desc`;

          const dbResp = await fetch(query, {
            headers: {
              apikey: SUPABASE_SERVICE_ROLE_KEY,
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
          });

          if (dbResp.ok) {
            const stories = await dbResp.json();
            if (stories.length > 0 && stories[0].full_text) {
              const story = stories[0];
              storyContext = `\n\n# Histoire pré-écrite
Titre: "${story.title}"
Raconte cette histoire avec ton propre ton, phrase par phrase.
${story.full_text.replace(/\{child_name\}/g, childName)}`;
            }
          }
        }
      } catch (e) {
        console.warn("Failed to fetch story:", e);
      }
    }

    const systemPrompt = buildSystemPrompt(intent, childName, childAge, parentSettings, memoryContext) + storyContext;

    // Keep only recent messages for speed (voice needs fast responses)
    const recentMessages = messages.length > 6 ? messages.slice(-6) : messages;

    // Model selection: flash-lite for simple chat (fastest), flash for complex intents
    const useFlashLite = intent === "chat" || intent === "calm";
    const model = useFlashLite ? "google/gemini-2.5-flash-lite" : "google/gemini-2.5-flash";

    const response = await fetch(LOVABLE_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          ...recentMessages,
        ],
        stream: true,
        temperature: intent === "emotion_support" ? 0.2 : intent === "story" ? 0.4 : 0.25,
        max_tokens: intent === "story" ? 600 : intent === "game" ? 100 : 80,
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

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("bobby-brain error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
