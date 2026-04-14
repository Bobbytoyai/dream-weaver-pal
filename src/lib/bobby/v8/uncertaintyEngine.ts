/**
 * Bobby Brain V8 — Uncertainty Management Engine
 *
 * Evaluates confidence in Bobby's understanding and picks clarification
 * strategies when uncertain. Prevents Bobby from guessing wrong and
 * frustrating the child.
 *
 * Execution: <1ms, 100% offline.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type UncertaintySource =
  | "ambiguous_intent"    // Multiple possible intents
  | "low_nlu_confidence"  // NLU score too low
  | "gibberish"           // Unintelligible input
  | "stt_error"           // Likely speech-to-text mistake
  | "mixed_signals"       // Emotion says X, words say Y
  | "topic_unknown"       // Bobby has no knowledge on this
  | "partial_input"       // Incomplete sentence
  | "contradiction";      // Child contradicts themselves

export type ClarificationStrategy =
  | "ask_rephrase"        // "Tu peux me redire ça ?"
  | "offer_choices"       // "Tu veux dire A ou B ?"
  | "echo_back"           // "Si je comprends bien, tu veux…"
  | "ask_yes_no"          // Simplify to yes/no
  | "gentle_guess"        // Make best guess + check
  | "acknowledge_limit"   // "Je suis pas sûr de comprendre"
  | "skip_gracefully"     // Move on without dwelling
  | "redirect_topic";     // Change subject

export interface UncertaintyAssessment {
  confidenceScore: number;          // 0-1, higher = more confident
  isUncertain: boolean;             // true if below threshold
  source: UncertaintySource | null;
  strategy: ClarificationStrategy | null;
  clarificationText: string | null; // Ready-to-use prompt
}

export interface UncertaintyContext {
  intentConfidence: number;
  nluLayer: "local" | "kb" | "llm" | "fallback";
  detectedIntent: string;
  alternativeIntents?: string[];
  childAge: number;
  childName: string;
  userText: string;
  consecutiveUncertainties: number;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONSTANTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const CONFIDENCE_THRESHOLD = 0.55;
const GIBBERISH_THRESHOLD = 0.25;
const MAX_CONSECUTIVE_CLARIFICATIONS = 2; // Don't ask more than 2x in a row

// Patterns suggesting STT errors
const STT_ERROR_PATTERNS = [
  /(.)\1{4,}/,                    // Repeated chars "aaaaa"
  /^[bcdfghjklmnpqrstvwxz]{4,}/i, // Consonant clusters
  /\d{3,}/,                       // Numbers in speech
];

// Gibberish patterns
const GIBBERISH_PATTERNS = [
  /^[a-z]{1,2}$/i,               // Single/double letter
  /^(.)\1+$/,                    // All same char
  /^[^aeiouéèêëàâîïôûùü\s]{5,}$/i, // No vowels at all
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STATE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let consecutiveUncertainties = 0;
let lastStrategy: ClarificationStrategy | null = null;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CORE API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Reset state for new session */
export function resetUncertaintyEngine(): void {
  consecutiveUncertainties = 0;
  lastStrategy = null;
  console.log("[UncertaintyEngine V8] ✅ Reset");
}

/** Main assessment: evaluate how confident Bobby should be */
export function assessUncertainty(ctx: UncertaintyContext): UncertaintyAssessment {
  const { userText, intentConfidence, nluLayer, childAge, childName } = ctx;

  // Step 1: Detect source of uncertainty
  const source = detectUncertaintySource(ctx);

  // Step 2: Compute composite confidence
  const confidenceScore = computeConfidence(ctx, source);

  // Step 3: Determine if uncertain
  const isUncertain = confidenceScore < CONFIDENCE_THRESHOLD;

  // Step 4: If uncertain, pick strategy & generate text
  let strategy: ClarificationStrategy | null = null;
  let clarificationText: string | null = null;

  if (isUncertain) {
    consecutiveUncertainties++;
    strategy = pickStrategy(source, ctx);
    clarificationText = generateClarification(strategy, childName, childAge, userText);
    lastStrategy = strategy;

    console.log(
      `[UncertaintyEngine V8] ⚠️ Uncertain (${confidenceScore.toFixed(2)}) source=${source} → ${strategy}`
    );
  } else {
    consecutiveUncertainties = 0;
    lastStrategy = null;
  }

  return { confidenceScore, isUncertain, source, strategy, clarificationText };
}

/** Quick check: is this input likely gibberish or STT error? */
export function isLikelyGarbled(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0) return true;
  if (GIBBERISH_PATTERNS.some(p => p.test(trimmed))) return true;
  if (STT_ERROR_PATTERNS.some(p => p.test(trimmed))) return true;
  return false;
}

/** Get consecutive uncertainty count (for parent dashboard) */
export function getUncertaintyStats(): { consecutive: number; lastStrategy: ClarificationStrategy | null } {
  return { consecutive: consecutiveUncertainties, lastStrategy };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INTERNAL HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function detectUncertaintySource(ctx: UncertaintyContext): UncertaintySource | null {
  const { userText, intentConfidence, nluLayer, alternativeIntents } = ctx;
  const trimmed = userText.trim();

  // Gibberish check
  if (GIBBERISH_PATTERNS.some(p => p.test(trimmed))) return "gibberish";

  // STT error check
  if (STT_ERROR_PATTERNS.some(p => p.test(trimmed))) return "stt_error";

  // Very short / partial
  if (trimmed.length > 0 && trimmed.length <= 2 && !["ok", "no", "si"].includes(trimmed.toLowerCase())) {
    return "partial_input";
  }

  // Low NLU confidence
  if (intentConfidence < GIBBERISH_THRESHOLD) return "gibberish";
  if (intentConfidence < CONFIDENCE_THRESHOLD) return "low_nlu_confidence";

  // Multiple competing intents
  if (alternativeIntents && alternativeIntents.length >= 2) {
    return "ambiguous_intent";
  }

  // Fallback layer means we're guessing
  if (nluLayer === "fallback") return "topic_unknown";

  return null; // Confident
}

function computeConfidence(ctx: UncertaintyContext, source: UncertaintySource | null): number {
  let score = ctx.intentConfidence;

  // Penalties
  if (source === "gibberish") score *= 0.2;
  if (source === "stt_error") score *= 0.4;
  if (source === "partial_input") score *= 0.5;
  if (source === "ambiguous_intent") score *= 0.7;
  if (source === "topic_unknown") score *= 0.6;

  // Layer bonus: local brain is more reliable for known intents
  if (ctx.nluLayer === "local" && score > 0.5) score = Math.min(1, score * 1.1);

  // Penalty for repeated uncertainties
  if (consecutiveUncertainties >= 2) score *= 0.85;

  return Math.max(0, Math.min(1, score));
}

function pickStrategy(
  source: UncertaintySource | null,
  ctx: UncertaintyContext,
): ClarificationStrategy {
  // If we've asked too many times, just move on
  if (consecutiveUncertainties > MAX_CONSECUTIVE_CLARIFICATIONS) {
    return "skip_gracefully";
  }

  // Avoid repeating the same strategy
  const avoid = lastStrategy;

  switch (source) {
    case "gibberish":
    case "stt_error":
      return avoid === "ask_rephrase" ? "acknowledge_limit" : "ask_rephrase";

    case "partial_input":
      return "ask_rephrase";

    case "ambiguous_intent":
      return avoid === "offer_choices" ? "echo_back" : "offer_choices";

    case "low_nlu_confidence":
      return avoid === "gentle_guess" ? "echo_back" : "gentle_guess";

    case "topic_unknown":
      return avoid === "acknowledge_limit" ? "redirect_topic" : "acknowledge_limit";

    case "mixed_signals":
      return "echo_back";

    case "contradiction":
      return "ask_yes_no";

    default:
      return "gentle_guess";
  }
}

function generateClarification(
  strategy: ClarificationStrategy,
  childName: string,
  childAge: number,
  userText: string,
): string {
  const young = childAge <= 6;
  const templates = getClarificationTemplates(young);
  const options = templates[strategy];
  if (!options || options.length === 0) return "";

  const pick = options[Math.floor(Math.random() * options.length)];
  return pick.replace("{name}", childName).replace("{input}", userText.slice(0, 30));
}

function getClarificationTemplates(young: boolean): Record<ClarificationStrategy, string[]> {
  return {
    ask_rephrase: young
      ? [
          "Oups, j'ai pas bien entendu ! Tu peux me redire ? 😊",
          "Hmm, tu peux répéter, {name} ? 🤔",
          "Dis-le moi encore une fois ! 🎤",
        ]
      : [
          "J'ai pas bien capté, tu peux reformuler ?",
          "Pardon, tu peux répéter, {name} ?",
          "J'ai pas bien compris, redis-moi !",
        ],

    offer_choices: young
      ? [
          "Tu veux jouer, écouter une histoire, ou autre chose ? 😊",
          "C'est pour rigoler ou pour apprendre ? 🤔",
          "Tu veux qu'on parle ou qu'on joue, {name} ?",
        ]
      : [
          "Tu voulais dire quoi exactement ? Un jeu, une histoire, ou autre chose ?",
          "Je suis pas sûr de ce que tu veux ! C'est plutôt A ou B ?",
        ],

    echo_back: young
      ? [
          "Alors si je comprends bien, tu veux… 🤔 C'est ça ?",
          "Attends, tu me parles de \"{input}\" ? 😊",
        ]
      : [
          "Si j'ai bien compris, tu parles de \"{input}\" ? Corrige-moi si je me trompe !",
          "Tu veux dire \"{input}\" ? Dis-moi si c'est ça.",
        ],

    ask_yes_no: young
      ? [
          "C'est oui ou c'est non, {name} ? 😄",
          "Tu veux ou tu veux pas ? 🤔",
        ]
      : [
          "Oui ou non, {name} ?",
          "C'est ça ou pas ?",
        ],

    gentle_guess: young
      ? [
          "Je crois que tu veux… hmm… c'est ça ? 🤔",
          "Ah, je pense que tu parles de… j'ai raison ? 😊",
        ]
      : [
          "Si je devais deviner, je dirais que… C'est correct ?",
          "Je pense comprendre, mais dis-moi si je me trompe !",
        ],

    acknowledge_limit: young
      ? [
          "Hmm, je connais pas ça encore ! Mais je peux apprendre ! 📚",
          "Oh, c'est un mot que je connais pas ! Tu m'expliques ? 🌟",
        ]
      : [
          "Là, j'avoue, je suis pas sûr de savoir ! Tu peux m'en dire plus ?",
          "Bonne question ! Je connais pas tout, mais on peut en parler !",
        ],

    skip_gracefully: young
      ? [
          "Pas grave ! On fait autre chose ? 🎮",
          "C'est pas grave, {name} ! Tu veux jouer ? 😄",
        ]
      : [
          "Pas de souci ! On passe à autre chose ?",
          "OK, on change de sujet, {name} !",
        ],

    redirect_topic: young
      ? [
          "Oh, j'ai une idée ! Et si on parlait d'autre chose ? 🌟",
          "Hé, tu savais un truc rigolo ? 😄",
        ]
      : [
          "Au fait, j'ai pensé à un truc cool !",
          "On change de sujet ? J'ai une anecdote !",
        ],
  };
}
