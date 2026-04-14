/**
 * Bobby Brain V7 — Understanding Feedback Loop
 *
 * Post-response verification system that:
 *  1. Checks if Bobby understood the child correctly
 *  2. Appends confirmation questions when ambiguity is high
 *  3. Detects correction signals ("non", "pas ça", "en fait")
 *  4. Adjusts the response in real-time
 *  5. Tracks consecutive misunderstandings
 *
 * Called AFTER response generation, BEFORE TTS output.
 * Execution: <3ms (100% local)
 */

import type { UnderstandingFrame, ImplicitIntent, SessionContext } from "./deepUnderstanding";
import type { EmotionType } from "../localBrain/types";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type CheckType =
  | "implicit_confirm"   // Bobby naturally mirrors: "Tu es un peu triste ?"
  | "explicit_confirm"   // Bobby asks directly: "Tu veux qu'on joue ?"
  | "soft_redirect"      // Bobby asks to rephrase: "Tu peux me dire autrement ?"
  | "empathy_probe"      // Bobby probes emotion: "Ça va ?"
  | "no_check";          // Clear understanding, no check needed

export interface UnderstandingCheck {
  type: CheckType;
  phrase: string | null;
  triggerReason: string;
  shouldPrepend: boolean;  // true = replace opening, false = append to end
}

export interface CorrectionResult {
  corrected: boolean;
  correctionType: "negation" | "reformulation" | "none";
  extractedClarification: string | null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STATE — tracks consecutive misunderstandings
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let consecutiveRepeats = 0;
let lastCheckedIntent: string | null = null;
let lastCheckType: CheckType = "no_check";
let pendingConfirmation = false;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONFIRMATION PHRASES BY IMPLICIT INTENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const CONFIRM_TEMPLATES: Record<ImplicitIntent, string[]> = {
  seek_comfort: [
    "Tu as besoin d'un câlin, c'est ça ?",
    "Tu veux qu'on en parle un peu ?",
    "Je suis là pour toi. Ça va ?",
  ],
  seek_attention: [
    "Tu veux qu'on fasse quelque chose ensemble ?",
    "Tu veux que je m'occupe de toi ?",
  ],
  seek_validation: [
    "Tu veux que je te dise bravo ?",
    "Tu es fier de toi, c'est ça ? 😊",
  ],
  seek_knowledge: [
    "Tu veux savoir comment ça marche ?",
    "C'est ça que tu voulais savoir ?",
  ],
  seek_fun: [
    "Tu veux qu'on joue ensemble ?",
    "On s'amuse un peu ?",
  ],
  seek_connection: [
    "Tu veux juste discuter avec moi ?",
    "Tu veux qu'on parle un peu ? 😊",
  ],
  seek_autonomy: [
    "Tu veux faire ça tout seul ?",
    "Tu veux me montrer que tu sais faire ?",
  ],
  express_frustration: [
    "Quelque chose te dérange ?",
    "Tu veux me dire ce qui ne va pas ?",
  ],
  test_limits: [
    "Hmm, tu essaies de me taquiner ? 😄",
    "Tu veux voir comment je réagis ? 😏",
  ],
  share_experience: [
    "Tu veux me raconter ta journée ?",
    "Il s'est passé quelque chose ?",
  ],
  process_emotion: [
    "Tu essaies de comprendre ce que tu ressens ?",
    "C'est pas facile, hein ? Tu veux en parler ?",
  ],
};

const EMPATHY_PROBES: Record<string, string[]> = {
  sadness: [
    "Tu as l'air un peu triste, ça va ?",
    "J'ai l'impression que quelque chose te rend triste...",
  ],
  fear: [
    "Tu as peur de quelque chose ?",
    "Quelque chose t'inquiète ?",
  ],
  anger: [
    "Tu es un peu énervé, non ?",
    "Quelque chose t'a mis en colère ?",
  ],
  shame: [
    "Tu n'as pas à avoir honte avec moi. Qu'est-ce qui s'est passé ?",
  ],
  confusion: [
    "Tu as l'air un peu perdu. Je peux t'aider ?",
  ],
};

const REDIRECT_PHRASES = [
  "Hmm, je crois que je ne comprends pas bien. Tu peux me dire autrement ?",
  "Excuse-moi, je n'ai pas bien compris. Tu veux bien répéter ?",
  "Pardon, je n'ai pas saisi. Tu peux me ré-expliquer ?",
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN — checkUnderstanding
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Decides if Bobby should verify his understanding.
 * Called AFTER response generation, BEFORE TTS.
 */
export function checkUnderstanding(
  frame: UnderstandingFrame,
  _response: string,
  session: SessionContext,
): UnderstandingCheck {
  // Track repeats
  if (frame.explicitIntent === lastCheckedIntent) {
    consecutiveRepeats++;
  } else {
    consecutiveRepeats = 0;
  }
  lastCheckedIntent = frame.explicitIntent;

  // ── Case 1: Child repeats same intent 3+ times → we didn't understand ──
  if (consecutiveRepeats >= 2) {
    const phrase = pick(REDIRECT_PHRASES);
    lastCheckType = "soft_redirect";
    pendingConfirmation = true;
    return {
      type: "soft_redirect",
      phrase,
      triggerReason: `consecutive_repeats=${consecutiveRepeats}`,
      shouldPrepend: true,
    };
  }

  // ── Case 2: High ambiguity → ask confirmation ──
  if (frame.ambiguityScore > 0.5) {
    const phrase = generateConfirmQuestion(frame);
    lastCheckType = "explicit_confirm";
    pendingConfirmation = true;
    return {
      type: "explicit_confirm",
      phrase,
      triggerReason: `ambiguity=${frame.ambiguityScore.toFixed(2)}`,
      shouldPrepend: false,
    };
  }

  // ── Case 3: Emotion/intent mismatch (says neutral but feels sad) ──
  const negativeEmotions: EmotionType[] = ["sadness", "fear", "anger", "shame"];
  const neutralIntents = ["GENERAL", "SALUT", "OUI", "PARTAGE_QUOTIDIEN"];
  if (
    negativeEmotions.includes(frame.emotion.type) &&
    frame.emotion.intensity >= 3 &&
    neutralIntents.includes(frame.explicitIntent)
  ) {
    const probes = EMPATHY_PROBES[frame.emotion.type] ?? EMPATHY_PROBES.sadness!;
    const phrase = pick(probes);
    lastCheckType = "empathy_probe";
    pendingConfirmation = true;
    return {
      type: "empathy_probe",
      phrase,
      triggerReason: `emotion_mismatch: ${frame.emotion.type} vs ${frame.explicitIntent}`,
      shouldPrepend: false,
    };
  }

  // ── Case 4: Implicit confirm — when implicit intent diverges from explicit ──
  if (
    frame.implicitConfidence < 0.5 &&
    frame.implicitIntent !== "share_experience" &&
    frame.ambiguityScore > 0.3
  ) {
    const phrase = generateConfirmQuestion(frame);
    lastCheckType = "implicit_confirm";
    pendingConfirmation = true;
    return {
      type: "implicit_confirm",
      phrase,
      triggerReason: `low_implicit_confidence=${frame.implicitConfidence.toFixed(2)}`,
      shouldPrepend: false,
    };
  }

  // ── Case 5: Clear understanding ──
  lastCheckType = "no_check";
  pendingConfirmation = false;
  return {
    type: "no_check",
    phrase: null,
    triggerReason: "clear_understanding",
    shouldPrepend: false,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CORRECTION DETECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const NEGATION_PATTERNS = [
  /^non\b/i, /^nan\b/i, /^pas ça/i, /^c'est pas/i,
  /^mais non/i, /^pas du tout/i, /^j'ai pas dit/i,
];

const REFORMULATION_PATTERNS = [
  /^je voulais dire/i, /^en fait/i, /^ce que je veux/i,
  /^je veux dire/i, /^non.*je (voulais|veux)/i,
];

/**
 * Detects if the child's response is a correction to Bobby's understanding.
 * Called at the START of the next turn when a confirmation was pending.
 */
export function detectCorrectionSignal(userText: string): CorrectionResult {
  if (!pendingConfirmation) {
    return { corrected: false, correctionType: "none", extractedClarification: null };
  }

  const trimmed = userText.trim();

  // Check negation
  if (NEGATION_PATTERNS.some(p => p.test(trimmed))) {
    pendingConfirmation = false;
    consecutiveRepeats = 0;

    // Try to extract what they actually meant
    const clarification = extractClarification(trimmed);

    console.log(`[FeedbackLoop V7] ❌ Correction detected (negation): "${trimmed.slice(0, 50)}"`);
    return {
      corrected: true,
      correctionType: "negation",
      extractedClarification: clarification,
    };
  }

  // Check reformulation
  if (REFORMULATION_PATTERNS.some(p => p.test(trimmed))) {
    pendingConfirmation = false;
    consecutiveRepeats = 0;

    const clarification = extractClarification(trimmed);

    console.log(`[FeedbackLoop V7] 🔄 Correction detected (reformulation): "${trimmed.slice(0, 50)}"`);
    return {
      corrected: true,
      correctionType: "reformulation",
      extractedClarification: clarification,
    };
  }

  // Positive confirmation ("oui", "ouais", etc.) → clear pending
  if (/^(oui|ouais|ok|d'accord|yes|yep|exact|c'est ça|voilà)\b/i.test(trimmed)) {
    pendingConfirmation = false;
    consecutiveRepeats = 0;
    console.log(`[FeedbackLoop V7] ✅ Confirmation received`);
  }

  return { corrected: false, correctionType: "none", extractedClarification: null };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// APPLY CHECK TO RESPONSE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Modifies a response text based on the understanding check result.
 * Returns the modified text.
 */
export function applyUnderstandingCheck(
  responseText: string,
  check: UnderstandingCheck,
): string {
  if (check.type === "no_check" || !check.phrase) {
    return responseText;
  }

  if (check.shouldPrepend) {
    // Replace the response entirely (soft redirect)
    return check.phrase;
  }

  // Append the check phrase
  return responseText.replace(/[.!?…]*\s*$/, ". ") + check.phrase;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function generateConfirmQuestion(frame: UnderstandingFrame): string {
  const templates = CONFIRM_TEMPLATES[frame.implicitIntent];
  if (templates && templates.length > 0) {
    return pick(templates);
  }
  return "Tu veux m'en dire plus ?";
}

function extractClarification(text: string): string | null {
  // Remove negation prefix to get the actual intent
  const cleaned = text
    .replace(/^(non|nan|pas ça|c'est pas|mais non|pas du tout|j'ai pas dit|je voulais dire|en fait|ce que je veux|je veux dire)[,.\s]*/i, "")
    .trim();

  return cleaned.length > 2 ? cleaned : null;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PUBLIC STATE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function isPendingConfirmation(): boolean {
  return pendingConfirmation;
}

export function getLastCheckType(): CheckType {
  return lastCheckType;
}

export function resetFeedbackLoop(): void {
  consecutiveRepeats = 0;
  lastCheckedIntent = null;
  lastCheckType = "no_check";
  pendingConfirmation = false;
}
