/**
 * Wake Word Detection Engine — Shared logic for detecting "Bobby"
 * 
 * Multi-pass fuzzy matching optimized for children's speech:
 * 1. Exact substring match
 * 2. Extended variants (misspellings, child pronunciations)
 * 3. Phonetic encoding + sliding window
 * 4. Levenshtein-like character diff tolerance
 * 
 * Used by both Deepgram (partials + finals) and native STT fallback.
 */

// ─── Extended wake word variants for child speech tolerance ───
const WAKE_WORDS = [
  "bobby", "boby", "bobbie", "bob y", "bo bi", "bobi", "babi", "bobe",
  "bob", "booby", "bobee", "bobé", "bo by", "bob bee",
  "bobbyyy", "bobbi", "bobiii", "baubee", "baubi", "bauby",
  "bobey", "bobay", "bubi", "buby", "bubbi", "bubby",
  "boobee", "boobi", "boobie", "babby", "babie",
  "bo bee", "bob e", "bob i", "bobb", "obby", "obbie",
];

// Also match full wake phrases
const WAKE_PHRASES = [
  "hey bobby", "bobby tu es la", "bobby viens", "bobby ecoute",
  "bobby comment ca va", "dis bobby", "oh bobby", "eh bobby",
  "hé bobby", "bobby bobby",
];

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

function phoneticEncode(word: string): string {
  return word
    .replace(/ph/g, "f")
    .replace(/ck/g, "k")
    .replace(/ee|ea|ie|ey|ay/g, "i")
    .replace(/oo|ou/g, "u")
    .replace(/bb/g, "b")
    .replace(/tt/g, "t")
    .replace(/dd/g, "d")
    .replace(/y$/g, "i")
    .replace(/au|eau/g, "o")
    .replace(/[aeiou]+/g, (m) => m[0])
    .replace(/(.)\1+/g, "$1");
}

/**
 * Compute confidence score (0–1) that the transcript contains a wake word.
 */
export function computeWakeConfidence(transcript: string): number {
  const normalized = normalizeText(transcript);
  const words = normalized.split(/\s+/);
  const joined = normalized.replace(/\s+/g, "");
  const phoneticInput = phoneticEncode(joined);
  let best = 0;

  // Check full wake phrases first
  for (const phrase of WAKE_PHRASES) {
    const phraseNorm = normalizeText(phrase);
    if (normalized.includes(phraseNorm)) {
      return 0.98;
    }
  }

  for (const wake of WAKE_WORDS) {
    const wakeNorm = wake.replace(/\s+/g, "");
    const wakePhonetic = phoneticEncode(wakeNorm);

    // Pass 1: exact substring (highest confidence)
    if (joined.includes(wakeNorm)) {
      best = Math.max(best, 0.95);
      continue;
    }

    // Pass 1b: word-boundary match (for short variants like "bob")
    if (wakeNorm.length <= 3) {
      if (words.some(w => w === wakeNorm)) {
        best = Math.max(best, 0.80);
      }
      continue; // Skip fuzzy for very short words to avoid false positives
    }

    // Pass 2: phonetic substring match
    if (phoneticInput.includes(wakePhonetic) && wakePhonetic.length >= 2) {
      best = Math.max(best, 0.88);
      continue;
    }

    // Pass 3: sliding window with char diff tolerance
    for (let i = 0; i <= joined.length - wakeNorm.length; i++) {
      const slice = joined.slice(i, i + wakeNorm.length);
      let diff = 0;
      for (let j = 0; j < wakeNorm.length; j++) {
        if (slice[j] !== wakeNorm[j]) diff++;
      }
      if (diff === 0) best = Math.max(best, 0.95);
      else if (diff === 1 && wakeNorm.length >= 3) best = Math.max(best, 0.78);
      else if (diff === 2 && wakeNorm.length >= 5) best = Math.max(best, 0.65);
    }

    // Pass 4: phonetic sliding window
    // FIX MINEUR: require wakePhonetic.length >= 4 (was 2) to prevent false positives
    // e.g. "c'est beau" phonetic "cestbi" matched "obi" (3 chars) with 1 diff → false wake
    for (let i = 0; i <= phoneticInput.length - wakePhonetic.length; i++) {
      const slice = phoneticInput.slice(i, i + wakePhonetic.length);
      let diff = 0;
      for (let j = 0; j < wakePhonetic.length; j++) {
        if (slice[j] !== wakePhonetic[j]) diff++;
      }
      if (diff <= 1 && wakePhonetic.length >= 4) {
        best = Math.max(best, 0.82);
      }
    }
  }
  return best;
}

/** Confidence thresholds */
export const WAKE_THRESHOLD_PARTIAL = 0.65; // FIX I3: was 0.72 — more sensitive for whispering children
export const WAKE_THRESHOLD_FINAL = 0.55;   // FIX I2: was 0.60 — more tolerant for childlike pronunciations

/**
 * Quick boolean check — does this text contain a wake word?
 * Uses confidence scoring internally.
 */
export function hasWakeWord(text: string, isPartial = false): boolean {
  const threshold = isPartial ? WAKE_THRESHOLD_PARTIAL : WAKE_THRESHOLD_FINAL;
  return computeWakeConfidence(text) >= threshold;
}

/**
 * Strip wake word from transcript to get the actual command.
 */
export function stripWakeWord(text: string): string {
  return text
    .replace(/\b(hey\s+)?(bobby|boby|bobbie|bobi|babi|buby|bubby|booby|obby)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Is the transcript ONLY a wake word with no real content?
 */
export function isJustWakeWord(text: string): boolean {
  const stripped = stripWakeWord(text);
  return stripped.length < 3 || /^[?,!.\s]*$/.test(stripped);
}
