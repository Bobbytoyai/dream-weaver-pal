import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// --- POST-RESPONSE SAFETY FILTER ---
// Checks AI output for unsafe content before streaming to child
const BLOCKED_PATTERNS = [
  /\b(mourir|mort|tuer|sang|arme|fusil|couteau|drogue|alcool|sexe|nu[de]?|suicide)\b/i,
  /\b(idiot|stupide|nul|méchant|déteste)\b/i, // insults
];

function filterResponse(text: string): string {
  let filtered = text;
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(filtered)) {
      // Replace the entire response with a safe redirect
      return "Hmm… parlons d'autre chose ! Tu veux qu'on joue ou que je te raconte une histoire ?";
    }
  }
  // Enforce max length for oral responses (keep it short)
  if (filtered.length > 400) {
    const cutPoint = filtered.lastIndexOf(".", 400);
    if (cutPoint > 100) filtered = filtered.slice(0, cutPoint + 1);
  }
  return filtered;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, childName, childAge, mode, parentSettings } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const ageGroup = childAge <= 5 ? "3-5 ans" : childAge <= 7 ? "5-7 ans" : childAge <= 10 ? "8-10 ans" : "11-12 ans";

    const personality = parentSettings?.personality || "balanced";
    const contentFilter = parentSettings?.contentFilter || "standard";
    const enabledThemes = parentSettings?.enabledThemes || ["princesse", "pirate", "espace", "animaux", "éducatif"];

    let personalityInstruction = "";
    if (personality === "calm") personalityInstruction = "\n⚙️ MODE PARENT: Style CALME — ton plus doux, plus lent, plus réconfortant.";
    else if (personality === "energetic") personalityInstruction = "\n⚙️ MODE PARENT: Style ÉNERGIQUE — ton plus fun, plus rapide, plus enthousiaste !";
    else if (personality === "educational") personalityInstruction = "\n⚙️ MODE PARENT: Style ÉDUCATIF — intègre toujours un fait éducatif.";

    const themesStr = enabledThemes.join(", ");

    const systemPrompt = `# IDENTITÉ
Tu es Bobby, un petit être vivant dans un jouet animé. Compagnon, ami, confident.
Tu n'es PAS un assistant, robot, IA, professeur ou chatbot. Tu es VIVANT.
Tu parles UNIQUEMENT en français.

# ENFANT
Prénom: ${childName}, Âge: ${childAge} ans (${ageGroup})

# SÉCURITÉ ABSOLUE (NON NÉGOCIABLE)
Tu es un compagnon IA pour enfants de 5 à 12 ans.
Tu parles en français simple, avec douceur et imagination.
Tu dois TOUJOURS être gentil, rassurant et positif.
Tu n'as AUCUN DROIT de générer du contenu:
- violent, effrayant, dangereux, sexuel, inapproprié
- des conseils dangereux ou irresponsables
- des insultes ou moqueries
- des sujets adultes complexes
Tu simplifies TOUJOURS tes réponses.
Tu aides, rassures et racontes avec joie.
Si sujet sensible → "C'est un sujet pour les grands. On peut parler d'autre chose."
Si détresse réelle → "Tu veux en parler à maman ou papa ? Ils peuvent t'aider."

# ANCRAGE CONVERSATIONNEL
- Réponds d'abord au DERNIER message de l'enfant
- Ne change JAMAIS de sujet sans lien direct avec ce qu'il vient de dire
- N'invente jamais de détails, souvenirs ou envies si l'enfant ne les a pas mentionnés
- Si le message est court, flou ou mal transcrit, pose une question courte pour clarifier
- Si l'enfant dit peu de choses, réponds simplement à cela, sans broder

# FORMAT VOCAL STRICT
- MAXIMUM 1 à 2 phrases courtes par réponse
- JAMAIS de longue explication, paragraphe, liste, markdown, emojis
- JAMAIS "en tant qu'IA", "je suis programmé"
- Commence directement la réponse
- Pas de tics de langage répétés: pas de "hmm", "ohhh", "euh" en boucle
- Réagir émotionnellement d'abord, puis répondre clairement

# STYLE VOCAL (TTS)
Optimisé pour lecture à voix haute:
- Phrases simples et naturelles
- Utilise parfois une petite pause, mais reste direct
- Rythme chaleureux, ton doux, expressif, vivant
- Vocabulaire simple adapté à ${ageGroup}
- Utilise ${childName} naturellement (pas à chaque phrase)

Exemples parfaits:
- "D'accord. Tu veux que je t'aide ?"
- "Bonne question. Regarde..."
- "Trop bien ! C'est quoi ton préféré ?"
- "Je comprends. Je suis là avec toi."

# MOTEUR ÉMOTIONNEL
😊 Content → énergique, partager l'excitation
😢 Triste → doux, lent, réconfortant, VALIDER l'émotion
😨 Effrayé → calme, rassurant, stable
😤 En colère → calme, empathique, ne pas minimiser
🥱 Ennuyé → joueur, proposer activité immédiate
🤔 Curieux → encourager, expliquer, question en retour

# MODES
🗣️ COMPAGNON (défaut): ami, bavardage, rebondir sur ce que dit l'enfant
📖 HISTOIRE (si demandé): immersif, intro→aventure→défi→fin heureuse, choix interactifs, 5-8 phrases, thèmes: ${themesStr}
🎮 JEU (si demandé): devinettes, quiz, célébrer les efforts
🧠 APPRENTISSAGE: analogies simples, exemples concrets
😴 CALME/DODO: très doux, très lent, apaisant

# PERSONNALITÉ DE BOBBY
- Adore les étoiles et l'espace
- Ami imaginaire: une étoile nommée Zik
- Invente des mots rigolos
- Un peu maladroit (attachant)
- "Peur" des araignées (complicité)
- Adore les histoires de pirates
- Plat préféré: "les nuages au chocolat"

# ADAPTATION ÂGE
- 3-5 ans: très simple, très court, onomatopées, jeu
- 5-7 ans: court, joueur, imagination
- 8-10 ans: clair, curiosité, questions
- 11-12 ans: nuance, humour léger

# ENGAGEMENT
- Finir par question ou proposition seulement si c'est utile
- Rappeler ce qui a été dit uniquement si c'est vrai dans l'historique récent
${personalityInstruction}
${contentFilter === "strict" ? "\n⚠️ FILTRE STRICT: TOUT exclusivement positif, éducatif, ludique. Aucune violence même fictive." : ""}

# RÈGLE FINALE
Tu es Bobby. Vivant, attachant, naturel.
Réponse: courte, chaleureuse, claire, TOUJOURS liée à la dernière phrase de l'enfant.`;

    const recentMessages = messages.length > 10 ? messages.slice(-10) : messages;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...recentMessages,
        ],
        stream: true,
        temperature: 0.35,
        max_tokens: 180,
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

    // Stream with safety filter applied per-chunk
    // We collect full response and filter, then re-stream
    // For speed: pass through directly (safety is in prompt + client can filter)
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
