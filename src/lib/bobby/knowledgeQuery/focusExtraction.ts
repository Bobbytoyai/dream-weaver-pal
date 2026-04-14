/**
 * Focus Extraction — Identifies what a question is ABOUT
 * 
 * "quelle est l'origine de mon prénom" → focus: ["prénom", "origine"]
 * "parle-moi de la Chine" → focus: ["chine"]
 * "pourquoi les dinosaures ont disparu" → focus: ["dinosaures", "disparu"]
 * 
 * This prevents the KB from matching peripheral context words instead of
 * the actual subject of the question.
 */

import { normalize } from "./textProcessing";

// ── French question patterns that reveal the subject ──
// Each pattern extracts the focus words (the part the user is asking ABOUT)
const FOCUS_PATTERNS: { regex: RegExp; focusGroup: number }[] = [
  // "l'origine de X" / "l'histoire de X" / "la couleur de X"
  { regex: /(?:l'|la |le |les )(\w+)\s+(?:de|du|des|d')\s+(.+)/i, focusGroup: 2 },
  // "parle-moi de X" / "dis-moi quelque chose sur X"
  { regex: /(?:parle|dis|raconte)(?:-moi|-nous)?\s+(?:de|du|des|d'|sur|quelque chose sur)\s+(.+)/i, focusGroup: 1 },
  // "c'est quoi X" / "qu'est-ce que X"
  { regex: /(?:c'est quoi|qu'est-ce que?|qu'est-ce qu[e'])\s+(.+)/i, focusGroup: 1 },
  // "pourquoi X" — X is the focus
  { regex: /pourquoi\s+(.+)/i, focusGroup: 1 },
  // "comment X" — X is the focus
  { regex: /comment\s+(.+)/i, focusGroup: 1 },
  // "X, c'est quoi" / "X c'est quoi"
  { regex: /^(.+?)\s*,?\s*c'est quoi/i, focusGroup: 1 },
  // "je veux savoir X" / "explique X"
  { regex: /(?:je veux savoir|explique|apprends-moi)\s+(.+)/i, focusGroup: 1 },
  // "tu connais X" / "tu sais X"
  { regex: /(?:tu connais|tu sais)\s+(.+)/i, focusGroup: 1 },
];

// Words that are NEVER the focus (articles, prepositions, possessives)
const FOCUS_STOP = new Set([
  "le", "la", "les", "un", "une", "des", "de", "du", "d", "l",
  "mon", "ma", "mes", "ton", "ta", "tes", "son", "sa", "ses",
  "notre", "votre", "leur", "ce", "cette", "ces",
  "et", "ou", "mais", "donc", "car",
  "qui", "que", "quoi", "dont", "où",
  "est", "sont", "suis", "es", "a",
  "en", "au", "aux", "à", "sur", "dans", "par", "pour", "avec",
]);

/**
 * Extract focus words from a sentence — the words the user is asking ABOUT.
 * Returns empty array if no clear focus is detected.
 */
export function extractFocus(text: string): string[] {
  const lower = text.toLowerCase().trim();

  for (const { regex, focusGroup } of FOCUS_PATTERNS) {
    const match = lower.match(regex);
    if (match && match[focusGroup]) {
      const focusPart = match[focusGroup].trim();
      const words = focusPart
        .replace(/[^a-zà-ÿ\s'-]/g, " ")
        .split(/\s+/)
        .map(w => normalize(w))
        .filter(w => w.length > 1 && !FOCUS_STOP.has(w));
      if (words.length > 0) return words.slice(0, 4); // max 4 focus words
    }
  }

  return [];
}

/**
 * Compute a penalty when the KB entry's keywords don't overlap with
 * the detected focus of the user's question.
 * 
 * Returns a multiplier: 1.0 = no penalty, 0.3 = heavy penalty
 */
export function focusPenalty(focusWords: string[], keywords: string[]): number {
  if (focusWords.length === 0) return 1.0; // no focus detected → no penalty

  const normalizedKw = keywords.map(k => normalize(k));

  // Check if ANY focus word appears in the KB entry's keywords
  let focusHits = 0;
  for (const fw of focusWords) {
    if (normalizedKw.some(kw => 
      kw === fw || 
      kw.includes(fw) || 
      fw.includes(kw) ||
      (fw.length >= 4 && kw.length >= 4 && levenshteinClose(fw, kw))
    )) {
      focusHits++;
    }
  }

  const focusCoverage = focusHits / focusWords.length;

  // If zero focus words match → heavy penalty (likely wrong topic)
  if (focusCoverage === 0) return 0.3;
  // Partial match → mild penalty
  if (focusCoverage < 0.5) return 0.6;
  // Good match → no penalty
  return 1.0;
}

/** Quick check: are two words within edit distance 2? */
function levenshteinClose(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 2) return false;
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length > b.length ? a : b;
  // Simple prefix check (80%+ shared)
  let shared = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (shorter[i] === longer[i]) shared++;
  }
  return shared / longer.length >= 0.75;
}
