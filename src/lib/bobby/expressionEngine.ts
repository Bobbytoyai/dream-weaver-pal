/**
 * Bobby Expression Engine v1.0 — Emotion → Expression Mapping
 * 
 * Maps detected emotions (with intensity & context) to modular expression combos.
 * Handles age adaptation, context memory, and fallback logic.
 */

import {
  type ExpressionCombo,
  ensureCoherence,
} from "./expressionLibrary";

// ─── Emotion Types ───────────────────────────────────────────

export type BobbyEmotion =
  | "joy" | "sadness" | "fear" | "anger" | "love"
  | "curiosity" | "pride" | "surprise" | "calm"
  | "excitement" | "boredom" | "shyness" | "embarrassment"
  | "relief" | "confusion" | "disgust" | "jealousy"
  | "gratitude" | "determination" | "neutral";

export interface EmotionState {
  emotion: BobbyEmotion;
  secondary?: BobbyEmotion;
  intensity: number; // 1-5
  intent?: string;
}

export interface ExpressionResult {
  combo: ExpressionCombo;
  emoji: string;
  emotion: BobbyEmotion;
  intensity: number;
}

// ─── Emoji Map ───────────────────────────────────────────────

const EMOJI_MAP: Record<BobbyEmotion, string[]> = {
  joy:           ["😊", "😄", "✨", "🎉", "💛"],
  sadness:       ["😔", "💧", "🫂", "😢"],
  fear:          ["😨", "👀", "🌙", "😰"],
  anger:         ["😠", "🔥", "😤"],
  love:          ["💛", "🥰", "❤️", "💕"],
  curiosity:     ["🤔", "✨", "🧐", "❓"],
  pride:         ["🌟", "💪", "🏆", "👏"],
  surprise:      ["😲", "😮", "🤯", "❗"],
  calm:          ["😌", "🌙", "✨", "🍃"],
  excitement:    ["🤩", "🎉", "🚀", "⚡"],
  boredom:       ["😐", "💤", "😑"],
  shyness:       ["😳", "🙈", "👉👈"],
  embarrassment: ["😅", "🙈", "😬"],
  relief:        ["😮‍💨", "😊", "💫"],
  confusion:     ["😵‍💫", "❓", "🤷"],
  disgust:       ["🤢", "😖"],
  jealousy:      ["😒", "💢"],
  gratitude:     ["🙏", "💛", "🤗"],
  determination: ["💪", "🔥", "⭐"],
  neutral:       ["🙂", "😊"],
};

function getEmoji(emotion: BobbyEmotion, intensity: number): string {
  const emojis = EMOJI_MAP[emotion] ?? EMOJI_MAP.neutral;
  // Low intensity → first (soft), high intensity → last (strong)
  const idx = Math.min(emojis.length - 1, Math.floor((intensity - 1) / 5 * emojis.length));
  return emojis[idx];
}

// ─── Emotion → Expression Mapping ────────────────────────────

interface IntensityVariant {
  eyes: string;
  eyebrows: string;
  mouth: string;
  animation: string;
}

// Each emotion has 5 intensity levels
const EMOTION_EXPRESSIONS: Record<BobbyEmotion, IntensityVariant[]> = {
  joy: [
    { eyes: "neutral",      eyebrows: "relaxed",   mouth: "smile_small",  animation: "micro_smile" },
    { eyes: "neutral",      eyebrows: "relaxed",   mouth: "smile_small",  animation: "micro_smile" },
    { eyes: "squint_smile", eyebrows: "relaxed",   mouth: "smile_big",    animation: "bounce_soft" },
    { eyes: "squint_smile", eyebrows: "raised",    mouth: "laugh_soft",   animation: "bounce_soft" },
    { eyes: "squint_smile", eyebrows: "raised",    mouth: "laugh",        animation: "bounce_soft" },
  ],
  sadness: [
    { eyes: "neutral",     eyebrows: "soft",      mouth: "neutral",     animation: "calm_wave" },
    { eyes: "soft_sad",    eyebrows: "sad_tilt",   mouth: "small_sad",   animation: "calm_wave" },
    { eyes: "soft_sad",    eyebrows: "sad_tilt",   mouth: "sad",         animation: "calm_wave" },
    { eyes: "sad",         eyebrows: "sad_tilt",   mouth: "sad",         animation: "calm_wave" },
    { eyes: "sad",         eyebrows: "sad_tilt",   mouth: "tremble",     animation: "calm_wave" },
  ],
  fear: [
    { eyes: "open",        eyebrows: "slight_up",  mouth: "neutral",     animation: "idle_breath" },
    { eyes: "worried",     eyebrows: "worried",    mouth: "tense",       animation: "micro_shake" },
    { eyes: "wide_worried", eyebrows: "raised",    mouth: "small_open",  animation: "micro_shake" },
    { eyes: "wide_worried", eyebrows: "raised",    mouth: "worried",     animation: "micro_shake" },
    { eyes: "surprised",   eyebrows: "raised",     mouth: "surprised",   animation: "micro_shake" },
  ],
  anger: [
    { eyes: "focused",    eyebrows: "tense",      mouth: "tense",       animation: "idle_breath" },
    { eyes: "focused",    eyebrows: "lowered",     mouth: "tense",       animation: "idle_breath" },
    { eyes: "focused",    eyebrows: "angry",       mouth: "grimace",     animation: "micro_shake" },
    { eyes: "focused",    eyebrows: "angry",       mouth: "grimace",     animation: "micro_shake" },
    { eyes: "focused",    eyebrows: "angry",       mouth: "grimace",     animation: "micro_shake" },
  ],
  love: [
    { eyes: "neutral",      eyebrows: "soft",      mouth: "smile_small", animation: "micro_smile" },
    { eyes: "squint_smile", eyebrows: "soft",      mouth: "smile_small", animation: "micro_smile" },
    { eyes: "squint_smile", eyebrows: "relaxed",   mouth: "smile_big",   animation: "micro_nod" },
    { eyes: "squint_smile", eyebrows: "relaxed",   mouth: "smile_big",   animation: "bounce_soft" },
    { eyes: "squint_smile", eyebrows: "raised",    mouth: "laugh_soft",  animation: "bounce_soft" },
  ],
  curiosity: [
    { eyes: "open",     eyebrows: "slight_up",  mouth: "smile_small", animation: "idle_breath" },
    { eyes: "curious",  eyebrows: "curious",     mouth: "hmm",         animation: "look_shift" },
    { eyes: "curious",  eyebrows: "curious",     mouth: "smile_small", animation: "look_shift" },
    { eyes: "curious",  eyebrows: "slight_up",   mouth: "small_open",  animation: "look_shift" },
    { eyes: "curious",  eyebrows: "raised",      mouth: "open",        animation: "micro_nod" },
  ],
  pride: [
    { eyes: "neutral",    eyebrows: "confident", mouth: "smile_small",  animation: "micro_smile" },
    { eyes: "focused",    eyebrows: "confident", mouth: "smile_closed", animation: "micro_smile" },
    { eyes: "focused",    eyebrows: "proud",     mouth: "confident",    animation: "micro_nod" },
    { eyes: "playful",    eyebrows: "proud",     mouth: "smile_big",    animation: "bounce_soft" },
    { eyes: "excited",    eyebrows: "raised",    mouth: "yay",          animation: "bounce_soft" },
  ],
  surprise: [
    { eyes: "open",      eyebrows: "slight_up", mouth: "small_open", animation: "idle_breath" },
    { eyes: "open",      eyebrows: "raised",    mouth: "small_open", animation: "idle_breath" },
    { eyes: "surprised", eyebrows: "raised",    mouth: "open",       animation: "idle_breath" },
    { eyes: "surprised", eyebrows: "raised",    mouth: "surprised",  animation: "look_shift" },
    { eyes: "surprised", eyebrows: "raised",    mouth: "surprised",  animation: "micro_nod" },
  ],
  calm: [
    { eyes: "neutral",   eyebrows: "soft",     mouth: "neutral",     animation: "calm_wave" },
    { eyes: "neutral",   eyebrows: "soft",     mouth: "smile_small", animation: "calm_wave" },
    { eyes: "neutral",   eyebrows: "relaxed",  mouth: "smile_small", animation: "calm_wave" },
    { eyes: "squint_smile", eyebrows: "relaxed", mouth: "smile_closed", animation: "calm_wave" },
    { eyes: "closed",    eyebrows: "relaxed",  mouth: "smile_closed", animation: "calm_wave" },
  ],
  excitement: [
    { eyes: "open",     eyebrows: "raised",    mouth: "smile_small", animation: "micro_smile" },
    { eyes: "curious",  eyebrows: "raised",    mouth: "smile_big",   animation: "bounce_soft" },
    { eyes: "excited",  eyebrows: "raised",    mouth: "yay",         animation: "bounce_soft" },
    { eyes: "excited",  eyebrows: "raised",    mouth: "laugh",       animation: "bounce_soft" },
    { eyes: "excited",  eyebrows: "raised",    mouth: "laugh",       animation: "bounce_soft" },
  ],
  boredom: [
    { eyes: "neutral",  eyebrows: "neutral",   mouth: "neutral",     animation: "idle_breath" },
    { eyes: "look_down", eyebrows: "neutral",  mouth: "neutral",     animation: "calm_wave" },
    { eyes: "tired",    eyebrows: "lowered",   mouth: "tired",       animation: "calm_wave" },
    { eyes: "tired",    eyebrows: "lowered",   mouth: "pout",        animation: "calm_wave" },
    { eyes: "closed",   eyebrows: "lowered",   mouth: "tired",       animation: "calm_wave" },
  ],
  shyness: [
    { eyes: "neutral",  eyebrows: "soft",      mouth: "smile_small", animation: "idle_breath" },
    { eyes: "shy",      eyebrows: "hesitant",  mouth: "shy",         animation: "micro_smile" },
    { eyes: "avoidant", eyebrows: "hesitant",  mouth: "shy",         animation: "look_shift" },
    { eyes: "avoidant", eyebrows: "sad_tilt",  mouth: "embarrassed", animation: "look_shift" },
    { eyes: "avoidant", eyebrows: "sad_tilt",  mouth: "embarrassed", animation: "look_shift" },
  ],
  embarrassment: [
    { eyes: "neutral",  eyebrows: "soft",      mouth: "smile_small",  animation: "micro_smile" },
    { eyes: "shy",      eyebrows: "hesitant",  mouth: "embarrassed",  animation: "look_shift" },
    { eyes: "avoidant", eyebrows: "worried",   mouth: "embarrassed",  animation: "look_shift" },
    { eyes: "avoidant", eyebrows: "worried",   mouth: "grimace",      animation: "micro_shake" },
    { eyes: "avoidant", eyebrows: "tense",     mouth: "grimace",      animation: "micro_shake" },
  ],
  relief: [
    { eyes: "neutral",      eyebrows: "soft",    mouth: "smile_small", animation: "idle_breath" },
    { eyes: "neutral",      eyebrows: "relaxed", mouth: "relief",      animation: "calm_wave" },
    { eyes: "squint_smile", eyebrows: "relaxed", mouth: "relief",      animation: "calm_wave" },
    { eyes: "squint_smile", eyebrows: "relaxed", mouth: "smile_big",   animation: "micro_nod" },
    { eyes: "squint_smile", eyebrows: "raised",  mouth: "smile_big",   animation: "bounce_soft" },
  ],
  confusion: [
    { eyes: "open",     eyebrows: "one_up",   mouth: "hmm",       animation: "look_shift" },
    { eyes: "curious",  eyebrows: "one_up",   mouth: "hmm",       animation: "look_shift" },
    { eyes: "worried",  eyebrows: "one_up",   mouth: "grimace",   animation: "micro_shake" },
    { eyes: "worried",  eyebrows: "tense",    mouth: "grimace",   animation: "micro_shake" },
    { eyes: "worried",  eyebrows: "tense",    mouth: "grimace",   animation: "micro_shake" },
  ],
  disgust: [
    { eyes: "neutral",  eyebrows: "lowered",  mouth: "tense",     animation: "idle_breath" },
    { eyes: "focused",  eyebrows: "lowered",  mouth: "grimace",   animation: "micro_shake" },
    { eyes: "focused",  eyebrows: "angry",    mouth: "grimace",   animation: "micro_shake" },
    { eyes: "avoidant", eyebrows: "angry",    mouth: "pout",      animation: "look_shift" },
    { eyes: "avoidant", eyebrows: "angry",    mouth: "pout",      animation: "look_shift" },
  ],
  jealousy: [
    { eyes: "neutral",  eyebrows: "tense",    mouth: "neutral",   animation: "idle_breath" },
    { eyes: "focused",  eyebrows: "lowered",  mouth: "tense",     animation: "look_shift" },
    { eyes: "focused",  eyebrows: "angry",    mouth: "pout",      animation: "look_shift" },
    { eyes: "avoidant", eyebrows: "angry",    mouth: "grimace",   animation: "micro_shake" },
    { eyes: "avoidant", eyebrows: "angry",    mouth: "grimace",   animation: "micro_shake" },
  ],
  gratitude: [
    { eyes: "neutral",      eyebrows: "soft",    mouth: "smile_small", animation: "micro_smile" },
    { eyes: "squint_smile", eyebrows: "soft",    mouth: "smile_small", animation: "micro_nod" },
    { eyes: "squint_smile", eyebrows: "relaxed", mouth: "smile_big",   animation: "micro_nod" },
    { eyes: "squint_smile", eyebrows: "relaxed", mouth: "smile_big",   animation: "bounce_soft" },
    { eyes: "squint_smile", eyebrows: "raised",  mouth: "laugh_soft",  animation: "bounce_soft" },
  ],
  determination: [
    { eyes: "focused",  eyebrows: "confident", mouth: "tense",       animation: "idle_breath" },
    { eyes: "focused",  eyebrows: "confident", mouth: "smile_closed", animation: "micro_nod" },
    { eyes: "focused",  eyebrows: "proud",     mouth: "confident",   animation: "micro_nod" },
    { eyes: "open",     eyebrows: "proud",     mouth: "smile_big",   animation: "bounce_soft" },
    { eyes: "excited",  eyebrows: "raised",    mouth: "yay",         animation: "bounce_soft" },
  ],
  neutral: [
    { eyes: "neutral", eyebrows: "neutral", mouth: "neutral",     animation: "idle_breath" },
    { eyes: "neutral", eyebrows: "soft",    mouth: "smile_small", animation: "idle_breath" },
    { eyes: "neutral", eyebrows: "soft",    mouth: "smile_small", animation: "micro_smile" },
    { eyes: "neutral", eyebrows: "relaxed", mouth: "smile_small", animation: "micro_smile" },
    { eyes: "open",    eyebrows: "relaxed", mouth: "smile_small", animation: "micro_smile" },
  ],
};

// ─── Fallback Expression ─────────────────────────────────────

const FALLBACK_COMBO: ExpressionCombo = {
  eyes: "neutral",
  eyebrows: "soft",
  mouth: "smile_small",
  animation: "blink_auto",
};

// ─── Disabled expressions config ─────────────────────────────

let _disabledEmotions: Set<string> = new Set();

/** Set which emotions Bobby should never display */
export function setDisabledExpressions(disabled: string[]) {
  _disabledEmotions = new Set(disabled);
}

/** Get current disabled expressions */
export function getDisabledExpressions(): string[] {
  return [..._disabledEmotions];
}

// ─── Main API ────────────────────────────────────────────────

/**
 * Convert an emotion state to a full expression result.
 * Applies intensity, coherence validation, emoji mapping, and disabled filter.
 */
export function emotionToExpression(state: EmotionState): ExpressionResult {
  let { emotion, intensity } = state;
  const clampedIntensity = Math.max(1, Math.min(5, Math.round(intensity)));
  
  // If this emotion is disabled, fall back to neutral
  if (_disabledEmotions.has(emotion)) {
    emotion = "neutral";
  }

  const variants = EMOTION_EXPRESSIONS[emotion];
  if (!variants) {
    return {
      combo: FALLBACK_COMBO,
      emoji: getEmoji("neutral", clampedIntensity),
      emotion: "neutral",
      intensity: clampedIntensity,
    };
  }

  const variant = variants[clampedIntensity - 1];
  const combo = ensureCoherence({
    eyes: variant.eyes,
    eyebrows: variant.eyebrows,
    mouth: variant.mouth,
    animation: variant.animation,
  });

  return {
    combo,
    emoji: getEmoji(emotion, clampedIntensity),
    emotion,
    intensity: clampedIntensity,
  };
}

/**
 * Get the fallback expression (used when no emotion is detected).
 */
export function getFallbackExpression(): ExpressionResult {
  return {
    combo: FALLBACK_COMBO,
    emoji: "🤔",
    emotion: "curiosity",
    intensity: 2,
  };
}

// ─── Age Adaptation ──────────────────────────────────────────

/**
 * Adapt intensity based on child age.
 * Younger children → more exaggerated expressions.
 * Older children → more subtle.
 */
export function adaptIntensityForAge(intensity: number, age: number): number {
  if (age <= 5) return Math.min(5, intensity + 1);  // More exaggerated for young
  if (age <= 7) return intensity;                     // Normal
  if (age <= 10) return Math.max(1, intensity - 0.5); // Slightly subtler
  return Math.max(1, intensity - 1);                  // Most subtle for 11+
}
