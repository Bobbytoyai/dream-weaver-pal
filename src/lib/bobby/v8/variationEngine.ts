/**
 * Bobby Brain V8 — Response Variation Engine
 *
 * Prevents Bobby from sounding repetitive by tracking recent openings,
 * closings, structures, emojis and expressions, then varying them.
 *
 * Execution: <3ms, 100% offline.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type ResponseStructure =
  | "statement"
  | "question_then_fact"
  | "fact_then_question"
  | "exclamation_then_content"
  | "empathy_then_redirect"
  | "story_fragment"
  | "challenge"
  | "comparison";

export interface VariationContext {
  recentPhrases: string[];
  recentOpenings: string[];
  recentClosings: string[];
  recentEmojis: string[];
  recentStructures: ResponseStructure[];
}

export interface VariationResult {
  text: string;
  changesApplied: string[];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STATE — rolling window of recent responses
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const MAX_PHRASES = 20;
const MAX_OPENINGS = 10;
const MAX_CLOSINGS = 10;
const MAX_EMOJIS = 10;
const MAX_STRUCTURES = 5;

let ctx: VariationContext = createEmptyContext();

function createEmptyContext(): VariationContext {
  return {
    recentPhrases: [],
    recentOpenings: [],
    recentClosings: [],
    recentEmojis: [],
    recentStructures: [],
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PARAPHRASE MAP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const PARAPHRASE_MAP: Array<{ original: RegExp; alternatives: string[] }> = [
  { original: /^C'est super\b/i, alternatives: ["C'est génial", "Trop bien", "J'adore", "Excellent"] },
  { original: /^Tu veux\b/i, alternatives: ["Ça te dit de", "On pourrait", "Et si on"] },
  { original: /^Tu sais quoi\b/i, alternatives: ["Figure-toi que", "Devine un peu", "J'ai un truc à te dire"] },
  { original: /^Bonne question\b/i, alternatives: ["Quelle question !", "Ah, intéressant", "J'adore quand tu demandes ça"] },
  { original: /^Je comprends\b/i, alternatives: ["Je vois ce que tu veux dire", "Oui, c'est normal", "Ça se comprend"] },
  { original: /^Bravo\b/i, alternatives: ["Chapeau !", "Bien joué", "Tu assures", "Impressionnant"] },
  { original: /^On joue\b/i, alternatives: ["On s'amuse", "J'ai un jeu pour toi", "Prêt pour un défi"] },
  { original: /^Tu savais que\b/i, alternatives: ["Le sais-tu ?", "Petit secret :", "Écoute bien :"] },
  { original: /\bC'est parce que\b/i, alternatives: ["En fait,", "Le truc c'est que", "La raison c'est que"] },
  { original: /^Ah oui\b/i, alternatives: ["Effectivement", "Tout à fait", "Exact", "En effet"] },
  { original: /^Oh là là\b/i, alternatives: ["Waouh", "Incroyable", "Eh ben dis donc"] },
  { original: /^Super\b/i, alternatives: ["Génial", "Trop cool", "Fantastique", "Top"] },
  { original: /^D'accord\b/i, alternatives: ["OK !", "Compris !", "Entendu !", "C'est noté !"] },
  { original: /^Bien sûr\b/i, alternatives: ["Évidemment !", "Mais oui !", "Carrément !", "Absolument !"] },
  { original: /^C'est vrai\b/i, alternatives: ["Tout à fait", "Exactement", "Tu as raison", "Bien vu"] },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EMOJI ALTERNATIVES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const EMOJI_ALTERNATIVES: Record<string, string[]> = {
  "😊": ["😄", "🙂", "☺️", "😃"],
  "😄": ["😊", "🤗", "😃", "🥰"],
  "🌟": ["✨", "⭐", "💫", "🌠"],
  "✨": ["🌟", "💫", "⭐", "🪄"],
  "💙": ["❤️", "🩵", "💜", "🤗"],
  "❤️": ["💙", "💜", "🩷", "🤗"],
  "🎮": ["🕹️", "🎲", "🎯", "🎪"],
  "📖": ["📚", "📕", "🔖", "✨"],
  "🐾": ["🐱", "🐶", "🐰", "🦊"],
  "🚀": ["🛸", "🌍", "🪐", "💫"],
  "🤔": ["🧐", "💭", "🤨", "🔍"],
  "😅": ["😆", "😂", "🤭", "😬"],
  "👏": ["🙌", "💪", "🏆", "🎉"],
  "🎉": ["🥳", "🎊", "🪅", "✨"],
  "💪": ["🏆", "👏", "🦸", "⚡"],
};

function getAlternativeEmoji(emoji: string): string {
  const alts = EMOJI_ALTERNATIVES[emoji];
  if (!alts || alts.length === 0) return emoji;
  const available = alts.filter(e => !ctx.recentEmojis.includes(e));
  if (available.length === 0) return alts[Math.floor(Math.random() * alts.length)];
  return available[Math.floor(Math.random() * available.length)];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STRUCTURE DETECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function detectStructure(text: string): ResponseStructure {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const first = sentences[0]?.trim() ?? "";
  const hasQuestion = /\?/.test(text);
  const startsExclamation = /^[A-ZÀ-Ü].*!/.test(first);
  const startsEmpathy = /^(je comprends|je vois|c'est normal|ça se comprend|oui,? c'est)/i.test(first);
  const hasComparison = /c'est comme|ça ressemble|imagine que|un peu comme/i.test(text);
  const hasChallenge = /défi|challenge|tu arrives|tu peux|essaie de/i.test(text);
  const isStoryLike = /il était une fois|un jour|imagine/i.test(first);

  if (isStoryLike) return "story_fragment";
  if (hasChallenge) return "challenge";
  if (hasComparison) return "comparison";
  if (startsEmpathy && sentences.length > 1) return "empathy_then_redirect";
  if (startsExclamation && sentences.length > 1) return "exclamation_then_content";
  if (hasQuestion && sentences.length >= 2) {
    const qIdx = sentences.findIndex(s => /\?/.test(s));
    return qIdx === 0 ? "question_then_fact" : "fact_then_question";
  }
  return "statement";
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// OPENING / CLOSING EXTRACTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function extractOpening(text: string): string {
  // First sentence or first ~40 chars
  const match = text.match(/^[^.!?]+[.!?]?/);
  return match ? match[0].trim().slice(0, 40) : text.slice(0, 40);
}

function extractClosing(text: string): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g);
  if (!sentences || sentences.length < 2) return "";
  return sentences[sentences.length - 1].trim().slice(0, 40);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// OPENING ALTERNATIVES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const OPENING_POOLS: Record<string, string[]> = {
  empathy: [
    "Je comprends,", "Oui, c'est normal,", "Je vois ce que tu veux dire,",
    "Ça se comprend,", "C'est tout à fait normal,", "Je suis là pour toi,",
  ],
  exclamation: [
    "Oh super !", "Trop bien !", "Génial !", "Waouh !", "Eh ben !",
    "J'adore !", "Incroyable !", "Fantastique !",
  ],
  question: [
    "Tu sais quoi ?", "Devine un peu !", "Tu veux savoir ?",
    "Figure-toi que", "Écoute ça :",
  ],
  fact: [
    "En fait,", "Tu sais,", "Le truc c'est que", "Alors voilà :",
    "Petit secret :", "Écoute bien :",
  ],
  continuation: [
    "Et du coup,", "D'ailleurs,", "En plus,", "Au fait,",
    "Et puis,", "Ah et aussi,",
  ],
};

function replaceOpening(text: string, preferredType: string | undefined): string {
  const pool = OPENING_POOLS[preferredType ?? "exclamation"] ?? OPENING_POOLS.exclamation;
  const available = pool.filter(o => !ctx.recentOpenings.includes(o.slice(0, 40)));
  if (available.length === 0) return text;

  const newOpening = available[Math.floor(Math.random() * available.length)];
  // Replace first sentence
  return text.replace(/^[^.!?,]+[,]?\s*/, newOpening + " ");
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STRUCTURE RESTRUCTURING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const ALL_STRUCTURES: ResponseStructure[] = [
  "statement", "question_then_fact", "fact_then_question",
  "exclamation_then_content", "empathy_then_redirect",
  "story_fragment", "challenge", "comparison",
];

function pickAlternativeStructure(current: ResponseStructure): ResponseStructure {
  const alts = ALL_STRUCTURES.filter(
    s => s !== current && !ctx.recentStructures.slice(-2).includes(s),
  );
  return alts.length > 0 ? alts[Math.floor(Math.random() * alts.length)] : "fact_then_question";
}

function restructureResponse(text: string, target: ResponseStructure): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g);
  if (!sentences || sentences.length < 2) return text;

  switch (target) {
    case "fact_then_question": {
      // Move question to end
      const questions = sentences.filter(s => /\?/.test(s));
      const facts = sentences.filter(s => !/\?/.test(s));
      if (questions.length > 0 && facts.length > 0) {
        return [...facts, ...questions].join(" ").trim();
      }
      return text;
    }
    case "question_then_fact": {
      // Move question to start
      const questions = sentences.filter(s => /\?/.test(s));
      const facts = sentences.filter(s => !/\?/.test(s));
      if (questions.length > 0 && facts.length > 0) {
        return [...questions, ...facts].join(" ").trim();
      }
      return text;
    }
    case "exclamation_then_content": {
      if (!/^.*!/.test(sentences[0])) {
        const excl = OPENING_POOLS.exclamation[Math.floor(Math.random() * OPENING_POOLS.exclamation.length)];
        return `${excl} ${text}`;
      }
      return text;
    }
    default:
      return text;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PARAPHRASE APPLICATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function varyExpressions(text: string): string {
  let varied = text;
  for (const { original, alternatives } of PARAPHRASE_MAP) {
    if (original.test(varied)) {
      const available = alternatives.filter(
        alt => !ctx.recentPhrases.some(p => p.includes(alt)),
      );
      if (available.length > 0) {
        const replacement = available[Math.floor(Math.random() * available.length)];
        varied = varied.replace(original, replacement);
      }
    }
  }
  return varied;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EMOJI VARIATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function varyEmojis(text: string): { text: string; changed: boolean } {
  let changed = false;
  let result = text;
  // Match common emoji ranges
  const emojiRe = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}]/gu;
  const emojis = text.match(emojiRe) || [];

  for (const emoji of emojis) {
    if (ctx.recentEmojis.includes(emoji)) {
      const alt = getAlternativeEmoji(emoji);
      if (alt !== emoji) {
        result = result.replace(emoji, alt);
        changed = true;
      }
    }
  }
  return { text: result, changed };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PUBLIC API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Apply variation to a response to prevent repetition.
 * Tracks the response internally for future comparisons.
 * <3ms, offline.
 */
export function applyVariation(response: string, openingType?: string): VariationResult {
  const changes: string[] = [];
  let varied = response;

  // 1. Paraphrase common expressions
  const paraphrased = varyExpressions(varied);
  if (paraphrased !== varied) {
    changes.push("paraphrase");
    varied = paraphrased;
  }

  // 2. Check opening repetition
  const opening = extractOpening(varied);
  if (opening && ctx.recentOpenings.includes(opening)) {
    varied = replaceOpening(varied, openingType);
    changes.push("opening_varied");
  }

  // 3. Check structure repetition (3 identical in a row → force change)
  const structure = detectStructure(varied);
  const lastThree = ctx.recentStructures.slice(-3);
  if (lastThree.length === 3 && lastThree.every(s => s === structure)) {
    const alt = pickAlternativeStructure(structure);
    varied = restructureResponse(varied, alt);
    changes.push(`structure_${structure}→${alt}`);
  }

  // 4. Vary emojis
  const { text: emojiVaried, changed: emojiChanged } = varyEmojis(varied);
  if (emojiChanged) {
    varied = emojiVaried;
    changes.push("emoji_varied");
  }

  // 5. Record in context
  recordResponse(varied);

  if (changes.length > 0) {
    console.log(`[Variation V8] 🎲 Applied: ${changes.join(", ")}`);
  }

  return { text: varied, changesApplied: changes };
}

/**
 * Record a response into the variation tracking context (called automatically by applyVariation).
 */
function recordResponse(text: string): void {
  ctx.recentPhrases.push(text);
  if (ctx.recentPhrases.length > MAX_PHRASES) ctx.recentPhrases.shift();

  const opening = extractOpening(text);
  if (opening) {
    ctx.recentOpenings.push(opening);
    if (ctx.recentOpenings.length > MAX_OPENINGS) ctx.recentOpenings.shift();
  }

  const closing = extractClosing(text);
  if (closing) {
    ctx.recentClosings.push(closing);
    if (ctx.recentClosings.length > MAX_CLOSINGS) ctx.recentClosings.shift();
  }

  const emojiRe = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;
  const emojis = text.match(emojiRe) || [];
  for (const e of emojis) {
    ctx.recentEmojis.push(e);
    if (ctx.recentEmojis.length > MAX_EMOJIS) ctx.recentEmojis.shift();
  }

  ctx.recentStructures.push(detectStructure(text));
  if (ctx.recentStructures.length > MAX_STRUCTURES) ctx.recentStructures.shift();
}

/** Get the current variation context (for debugging) */
export function getVariationContext(): VariationContext {
  return ctx;
}

/** Reset variation tracking */
export function resetVariationEngine(): void {
  ctx = createEmptyContext();
}
