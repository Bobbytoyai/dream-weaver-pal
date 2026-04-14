/**
 * Bobby Brain V7 — Response Assembly
 *
 * Structures every reply into 3 phases: Opening → Content → Closing.
 * Driven entirely by the CognitionPlan (WHY/WHAT/HOW).
 *
 * Pipeline position:
 *   Layer produces raw text → **assembleResponse** → postProcess → orchestration → TTS
 *
 * Execution: <3ms, 100% offline.
 */

import type { CognitionPlan, OpeningType, ContentStrategy } from "./cognitionV7";
import type { UnderstandingFrame } from "./deepUnderstanding";
import type { BobbyBrainReply } from "../types";
import { getRelevantFacts } from "../persistentMemory";
import { getSmartFollowUp } from "../interestTracker";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface AssembledResponse {
  opening: string | null;   // Empathy prefix, exclamation, continuation…
  content: string;          // Core reply (from Layer 1/2/3)
  closing: string | null;   // Follow-up question, memory callback, game turn…
  memoryInjected: boolean;
  validationAdded: boolean;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// OPENING PHRASES — keyed by OpeningType
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const OPENINGS: Record<OpeningType, string[]> = {
  empathy: [
    "Je comprends. ",
    "C'est normal de ressentir ça. ",
    "Je suis là pour toi. ",
    "Oh, je vois… ",
    "Ça arrive à tout le monde. ",
  ],
  fact: [
    "Tu sais quoi ? ",
    "Devine un peu ! ",
    "Figure-toi que ",
    "C'est super intéressant : ",
  ],
  question: [
    "Hmm, ",
    "Alors dis-moi, ",
    "Attends, ",
  ],
  exclamation: [
    "Oh super ! ",
    "Trop bien ! ",
    "Wahou ! ",
    "Génial ! ",
    "Yeah ! ",
  ],
  continuation: [
    "Et du coup, ",
    "D'ailleurs, ",
    "En parlant de ça, ",
    "Ah oui, et ",
    "Au fait, ",
  ],
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLOSING PHRASES — follow-up questions by goal
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const CLOSING_QUESTIONS: Record<string, string[]> = {
  enseigner: [
    "Tu veux en savoir plus ?",
    "C'est dingue, non ? Tu as d'autres questions ?",
    "Tu savais déjà ça ?",
  ],
  approfondir: [
    "Et tu sais pourquoi c'est comme ça ?",
    "Tu veux que je t'explique comment ça marche ?",
    "On creuse encore un peu ?",
  ],
  jouer: [
    "À toi de jouer !",
    "Alors, tu devines ?",
    "C'est ton tour !",
    "Tu veux essayer ?",
  ],
  rassurer: [
    "Tu veux qu'on en parle encore un peu ?",
    "Ça va mieux ?",
    "Tu veux faire quelque chose de fun pour te changer les idées ?",
  ],
  ecouter: [
    "Tu veux m'en dire plus ?",
    "Et après, il s'est passé quoi ?",
    "Comment tu te sens maintenant ?",
  ],
  engager: [
    "Qu'est-ce qui te ferait plaisir ?",
    "Tu veux qu'on fasse un jeu ou que je te raconte une histoire ?",
    "Tu préfères quoi ?",
  ],
  valider: [
    "Tu es vraiment fort ! Tu veux continuer ?",
    "Bravo ! Tu veux essayer autre chose ?",
  ],
  rediriger: [
    "Ça te dit qu'on parle de ça ?",
    "Tu veux essayer ?",
  ],
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VALIDATION PREFIXES — when plan.what.includeValidation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const VALIDATION_PHRASES = [
  "C'est une super question ! ",
  "Bravo de demander ! ",
  "J'adore ta curiosité ! ",
  "Quelle bonne question ! ",
  "C'est très malin comme question ! ",
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MEMORY INJECTION PHRASES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function buildMemoryPhrase(userText: string, currentTopic: string | null, emotion: string): string | null {
  const facts = getRelevantFacts({ currentTopic, currentEmotion: emotion, userText }, 2);
  if (facts.length === 0) return null;

  const fact = facts[0];
  const value = extractFactValue(fact.text);

  const templates: Record<string, string[]> = {
    animaux: [`Tu m'avais parlé de ${value} ! 🐾`, `Au fait, comment va ${value} ? 🐾`],
    préférence: [`Tu m'avais dit que tu adorais ${value} ! 🌟`, `Ça me rappelle, tu adores ${value} ! ✨`],
    famille: [`Tu sais, je me souviens que ${value}. 💙`],
    amis: [`Oh, ça me rappelle, tu m'avais dit que ${value} ! 😊`],
    activité: [`Tu fais toujours ${value} ? 😄`],
    école: [`Au fait, ${value}, ça se passe bien ? 📚`],
    peur: [`Je me souviens que ${value}. Je suis là. 💙`],
    rêve: [`Tu rêves toujours de ${value} ? ✨`],
    identité: [`Je me souviens bien, ${value} ! 😄`],
    objet: [`Au fait, ${value}, il va bien ? 🧸`],
  };

  const pool = templates[fact.category] ?? templates.préférence!;
  return pick(pool);
}

function extractFactValue(factText: string): string {
  const colonIdx = factText.indexOf(":");
  if (colonIdx !== -1) {
    const value = factText.slice(colonIdx + 1).trim();
    const prefix = factText.slice(0, colonIdx).trim().toLowerCase();
    if (prefix.startsWith("a un")) return `ton ${value.toLowerCase()}`;
    if (prefix.startsWith("adore")) return value.toLowerCase();
    if (prefix === "animal préféré") return `les ${value.toLowerCase()}`;
    return value.toLowerCase();
  }
  return factText.toLowerCase();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN — assembleResponse
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Takes a raw layer reply + CognitionPlan and builds a structured response.
 * Returns the assembled text + metadata.
 */
export function assembleResponse(
  rawReply: BobbyBrainReply,
  plan: CognitionPlan,
  frame: UnderstandingFrame,
  childName: string,
): AssembledResponse {
  const { why, what, how } = plan;

  // ── 1. OPENING ──
  let opening: string | null = null;
  let validationAdded = false;

  // Validation prefix takes priority if flagged
  if (what.includeValidation && why.primaryGoal !== "jouer") {
    opening = pick(VALIDATION_PHRASES);
    validationAdded = true;
  }
  // Otherwise use the HOW opening type
  else if (how.openingType !== "continuation" || Math.random() < 0.6) {
    const pool = OPENINGS[how.openingType];
    if (pool && pool.length > 0) {
      opening = pick(pool);
    }
  }

  // Don't prepend opening if content already starts with a similar phrase
  if (opening && rawReply.text.toLowerCase().startsWith(opening.trim().toLowerCase().slice(0, 8))) {
    opening = null;
  }

  // ── 2. CONTENT ── (raw reply, adjusted for target length)
  let content = rawReply.text.replace(/^\s+|\s+$/g, "");
  const sentences = content.match(/[^.!?…]+[.!?…]+/g);

  if (how.targetLength === "short" && content.length > 100 && sentences && sentences.length > 2) {
    // Keep only 1-2 sentences for punchy, dynamic replies
    content = sentences.slice(0, Math.random() < 0.5 ? 1 : 2).join("").trim();
  } else if (how.targetLength === "medium" && sentences && sentences.length > 4) {
    // Cap at 3-4 sentences
    content = sentences.slice(0, Math.random() < 0.5 ? 3 : 4).join("").trim();
  }
  // "long" — keep full content as-is

  // ── 3. CLOSING ──
  let closing: string | null = null;
  let memoryInjected = false;

  // Memory injection (highest priority if plan says so)
  if (what.includeMemory && Math.random() < 0.45) {
    const memPhrase = buildMemoryPhrase(
      content,
      frame.explicitIntent,
      frame.emotion.type,
    );
    if (memPhrase) {
      closing = memPhrase;
      memoryInjected = true;
    }
  }

  // Follow-up question (if plan says includeQuestion and no memory was injected)
  if (!closing && what.includeQuestion) {
    const goalClosings = CLOSING_QUESTIONS[why.primaryGoal];
    if (goalClosings && goalClosings.length > 0) {
      closing = pick(goalClosings);
    }
  }

  // Smart follow-up from interest tracker as fallback
  if (!closing && what.responseType !== "empathy" && Math.random() < 0.3) {
    closing = getSmartFollowUp(childName) ?? null;
  }

  // Secondary goal hint (rare, for dual-goal plans)
  if (!closing && why.secondaryGoal && Math.random() < 0.25) {
    const secondaryClosings = CLOSING_QUESTIONS[why.secondaryGoal];
    if (secondaryClosings && secondaryClosings.length > 0) {
      closing = pick(secondaryClosings);
    }
  }

  return { opening, content, closing, memoryInjected, validationAdded };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MERGE — combine assembled parts into final text
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Merges Opening + Content + Closing into a single string.
 * Handles punctuation and spacing automatically.
 */
export function mergeAssembled(assembled: AssembledResponse): string {
  let text = "";

  // Opening
  if (assembled.opening) {
    text += assembled.opening;
  }

  // Content
  text += assembled.content;

  // Closing — append after proper punctuation
  if (assembled.closing) {
    // Ensure content ends with punctuation before appending closing
    text = text.replace(/[.!?…]*\s*$/, ". ") + assembled.closing;
  }

  return text.trim();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONVENIENCE — one-shot assemble + merge
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Full pipeline: assemble + merge → returns enriched BobbyBrainReply.
 */
export function assembleAndMerge(
  rawReply: BobbyBrainReply,
  plan: CognitionPlan,
  frame: UnderstandingFrame,
  childName: string,
): BobbyBrainReply {
  const assembled = assembleResponse(rawReply, plan, frame, childName);
  const text = mergeAssembled(assembled);

  console.log(
    `[Assembly V7] 📝 opening=${assembled.opening ? `"${assembled.opening.trim()}"` : "none"} ` +
    `closing=${assembled.closing ? `"${assembled.closing.slice(0, 40)}"` : "none"} ` +
    `memory=${assembled.memoryInjected} validation=${assembled.validationAdded}`
  );

  return { ...rawReply, text };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
