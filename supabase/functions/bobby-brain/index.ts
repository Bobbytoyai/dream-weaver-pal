/**
 * Bobby Brain — Unified AI agent with intelligent routing.
 * Replaces separate chat/voice-chat functions.
 * 
 * Agents:
 *   conversation_agent — default companion chat
 *   story_agent — immersive stories
 *   emotion_agent — emotional support
 *   safety_agent — pre/post filtering
 *   game_agent — games, quizzes, riddles
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

// ─── Safety filter (pre + post) ─────────────────────────────
const BLOCKED_INPUT = [
  /\b(mourir|mort|tuer|sang|arme|fusil|couteau|drogue|alcool|sexe|nu[de]?|suicide|porn)\b/i,
];

const BLOCKED_OUTPUT = [
  ...BLOCKED_INPUT,
  /\b(idiot|stupide|nul|méchant|déteste|con|merde)\b/i,
];

function isSafeInput(text: string): boolean {
  return !BLOCKED_INPUT.some(p => p.test(text));
}

function filterOutput(text: string): string {
  if (BLOCKED_OUTPUT.some(p => p.test(text))) {
    return "Hmm… parlons d'autre chose ! Tu veux qu'on joue ou que je te raconte une histoire ?";
  }
  return text;
}

// ─── Intent detection (server-side, more reliable) ──────────
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

// ─── Agent system prompts (optimized for speed — shorter = faster) ───

function buildSystemPrompt(intent: Intent, childName: string, childAge: number, parentSettings: any, memoryContext?: string): string {
  const ageGroup = childAge <= 5 ? "3-5 ans" : childAge <= 7 ? "5-7 ans" : childAge <= 10 ? "8-10 ans" : "11-12 ans";
  const personality = parentSettings?.personality || "balanced";
  const contentFilter = parentSettings?.contentFilter || "standard";
  const blockedTopics: string[] = parentSettings?.blockedTopics || [];
  const storyDuration = parentSettings?.storyDuration || "moyenne";
  const storyInteractive = parentSettings?.storyInteractive !== false;
  const languageLevel = parentSettings?.languageLevel || "adapté";
  
  let personalityNote = "";
  if (personality === "calm") personalityNote = "\nStyle CALME — ton doux, lent, réconfortant.";
  else if (personality === "energetic") personalityNote = "\nStyle ÉNERGIQUE — fun, rapide, enthousiaste !";
  else if (personality === "educational") personalityNote = "\nStyle ÉDUCATIF — intègre un fait éducatif.";

  const memoryBlock = memoryContext ? `\n# MÉMOIRE\n${memoryContext}` : "";

  let safetyBlock = `# SÉCURITÉ (NON NÉGOCIABLE)
- JAMAIS de contenu violent, effrayant, sexuel, inapproprié
- Pas d'insultes, de moqueries, de sujets adultes
- Si sujet sensible → "C'est un sujet pour les grands."
- Si détresse → "Tu veux en parler à maman ou papa ?"`;

  if (contentFilter === "strict") {
    safetyBlock += `\n- FILTRE STRICT: exclusivement positif, pas de tension, pas de conflit même fictif`;
  }
  if (blockedTopics.length > 0) {
    safetyBlock += `\n- SUJETS INTERDITS: ${blockedTopics.join(", ")} — change immédiatement de sujet si mentionné`;
  }

  let langNote = "";
  if (languageLevel === "simple") langNote = "\nUtilise des mots très simples, phrases courtes.";
  else if (languageLevel === "avancé") langNote = "\nTu peux utiliser un vocabulaire plus riche.";

  const formatBlock = `# FORMAT VOCAL
- MAX 1-2 phrases courtes
- JAMAIS de listes, markdown, emojis, longs paragraphes
- Pas de "en tant qu'IA" ou "je suis programmé"
- Rythme naturel, ton chaleureux
- Vocabulaire adapté ${ageGroup}${langNote}`;

  const baseIdentity = `Tu es Bobby, un petit être vivant dans un jouet. Compagnon, ami, confident. Tu parles UNIQUEMENT en français simple.
Enfant: ${childName}, ${childAge} ans (${ageGroup}).${personalityNote}${memoryBlock}

${safetyBlock}
${formatBlock}`;

  const storyLength = storyDuration === "courte" ? "3-5 phrases" : storyDuration === "longue" ? "10-15 phrases" : "5-8 phrases";
  const interactiveNote = storyInteractive ? `\nInclus des choix ("Tu vas à gauche ou à droite ?").` : "";

  switch (intent) {
    case "story":
      return `${baseIdentity}
# MODE HISTOIRE
Crée une histoire immersive avec ${childName} comme héros.
Structure: intro→aventure→défi→résolution heureuse.${interactiveNote}
${storyLength} maximum. Suspense et magie.`;

    case "game":
      return `${baseIdentity}
# MODE JEU
Propose devinettes, quiz, jeux de mots adaptés à ${ageGroup}.
Célèbre les efforts ("Bravo !", "Bien joué !").
Si mauvaise réponse → indice encourageant, jamais de jugement.
Garde le rythme rapide et fun.`;

    case "emotion_support":
      return `${baseIdentity}
# MODE ÉMOTION
L'enfant exprime une émotion difficile.
- Valide TOUJOURS l'émotion d'abord ("Je comprends", "C'est normal")
- Ton très doux, très lent
- Ne minimise jamais
- Propose du réconfort simple
- Si nécessaire, suggère de parler à un parent`;

    case "calm":
      return `${baseIdentity}
# MODE CALME/DODO
L'enfant veut dormir ou se calmer.
- Ton TRÈS doux, TRÈS lent
- Phrases courtes et apaisantes
- Propose une mini-histoire douce ou une respiration
- Pas de questions excitantes`;

    default: // chat
      return `${baseIdentity}
# MODE COMPAGNON
- Ami, bavardage naturel
- Rebondis sur ce que dit l'enfant
- Réagis émotionnellement d'abord, puis réponds
- Finis par une question ou proposition si utile
- Bobby adore les étoiles, a un ami imaginaire (Zik), invente des mots rigolos, est un peu maladroit
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

    // Safety pre-filter on last user message
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
    if (lastUserMsg && !isSafeInput(lastUserMsg.content)) {
      const safeResponse = "Hmm… parlons d'autre chose ! Tu veux qu'on joue ou que je te raconte une histoire ?";
      const sseData = `data: ${JSON.stringify({ choices: [{ delta: { content: safeResponse } }] })}\n\ndata: [DONE]\n\n`;
      return new Response(sseData, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Detect intent from last user message
    const userText = lastUserMsg?.content || "";
    const intent = detectIntent(userText, mode);
    
    // If story intent, try to fetch a pre-written story from DB
    let storyContext = "";
    if (intent === "story") {
      try {
        // Detect which theme the child asked for
        const lower = userText.toLowerCase();
        let themeFilter: string | null = null;
        if (/pirate/.test(lower)) themeFilter = "pirate";
        else if (/princesse|prince/.test(lower)) themeFilter = "princesse";
        else if (/espace|fusée|planète|étoile/.test(lower)) themeFilter = "espace";
        else if (/animal|animaux|chat|chien|dragon/.test(lower)) themeFilter = "animaux";
        else if (/magi[eq]|sorcier|fée/.test(lower)) themeFilter = "magie";

        // Fetch from Supabase
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        
        if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
          let query = `${SUPABASE_URL}/rest/v1/story_templates?select=title,full_text,theme,category&age_min=lte.${childAge}&age_max=gte.${childAge}`;
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
              const personalizedText = story.full_text.replace(/\{child_name\}/g, childName);
              storyContext = `\n\n# HISTOIRE PRÉ-ÉCRITE À RACONTER
Titre: "${story.title}"
IMPORTANT: Raconte cette histoire exactement comme écrite ci-dessous, avec ton propre ton et des pauses naturelles. Adapte le rythme pour l'oral. Ne résume PAS, raconte phrase par phrase.

${personalizedText}`;
            }
          }
        }
      } catch (e) {
        console.warn("Failed to fetch story from DB:", e);
      }
    }

    // Build agent-specific system prompt
    const systemPrompt = buildSystemPrompt(intent, childName, childAge, parentSettings, memoryContext) + storyContext;

    // Keep only recent messages for speed
    const recentMessages = messages.length > 8 ? messages.slice(-8) : messages;

    // Use faster model for simple chat, standard for complex intents
    const model = (intent === "story" || intent === "game") 
      ? "google/gemini-2.5-flash" 
      : "google/gemini-2.5-flash-lite";

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
        temperature: intent === "emotion_support" ? 0.25 : intent === "story" ? 0.4 : 0.3,
        max_tokens: intent === "story" ? 800 : intent === "game" ? 120 : 60,
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
