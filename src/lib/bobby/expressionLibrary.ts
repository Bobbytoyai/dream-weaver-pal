/**
 * Bobby Expression Library v1.0 — Modular, Scalable, Production-Ready
 * 
 * Independent component libraries for Eyes, Eyebrows, Mouth, and Animations.
 * Each component maps to FaceAnimationState parameters for the 3D renderer.
 * Intensity levels 1-5 scale each component dynamically.
 */

import type { FaceAnimationState } from "@/components/hologram/useFaceAnimation";

// ─── Component Types ─────────────────────────────────────────

export interface EyePreset {
  openness: number;       // 0 (closed) → 1.4 (wide)
  pupilSize: number;      // 0.5 → 1.4
  sparkle: number;        // 0 → 1
  irisGlow: number;       // 0 → 1
}

export interface EyebrowPreset {
  height: number;         // -0.15 → 0.35
  tilt: number;           // -0.3 → 0.3 (negative = inner up/sad)
}

export interface MouthPreset {
  openness: number;       // 0 → 0.5
  width: number;          // 0.2 → 0.85
  curve: number;          // -0.3 (sad) → 0.6 (big smile)
  round: number;          // 0 → 0.5 (O shape)
  jawDrop: number;        // 0 → 0.4
}

export interface AnimationPreset {
  headTiltX: number;
  headTiltY: number;
  headTiltZ: number;
  glowIntensity: number;
  cheekGlow: number;
  /** Optional oscillation params applied in the animation loop */
  oscillation?: {
    property: keyof FaceAnimationState;
    amplitude: number;
    frequency: number; // Hz
  }[];
}

// ─── Eyes Library (22 presets) ────────────────────────────────

export const EYES: Record<string, EyePreset> = {
  neutral:       { openness: 1.0,  pupilSize: 1.0,  sparkle: 0.5,  irisGlow: 0.4 },
  open:          { openness: 1.2,  pupilSize: 1.1,  sparkle: 0.6,  irisGlow: 0.5 },
  squint_smile:  { openness: 0.75, pupilSize: 1.15, sparkle: 0.85, irisGlow: 0.7 },
  closed:        { openness: 0.0,  pupilSize: 0.5,  sparkle: 0.0,  irisGlow: 0.1 },
  blink:         { openness: 0.0,  pupilSize: 1.0,  sparkle: 0.0,  irisGlow: 0.3 },
  look_left:     { openness: 1.05, pupilSize: 1.0,  sparkle: 0.5,  irisGlow: 0.45 },
  look_right:    { openness: 1.05, pupilSize: 1.0,  sparkle: 0.5,  irisGlow: 0.45 },
  look_up:       { openness: 1.15, pupilSize: 1.05, sparkle: 0.6,  irisGlow: 0.5 },
  look_down:     { openness: 0.9,  pupilSize: 0.95, sparkle: 0.4,  irisGlow: 0.35 },
  curious:       { openness: 1.3,  pupilSize: 1.25, sparkle: 0.85, irisGlow: 0.75 },
  worried:       { openness: 1.2,  pupilSize: 1.15, sparkle: 0.35, irisGlow: 0.4 },
  sad:           { openness: 0.75, pupilSize: 0.85, sparkle: 0.2,  irisGlow: 0.25 },
  excited:       { openness: 1.35, pupilSize: 1.35, sparkle: 1.0,  irisGlow: 0.9 },
  tired:         { openness: 0.6,  pupilSize: 0.8,  sparkle: 0.15, irisGlow: 0.2 },
  surprised:     { openness: 1.4,  pupilSize: 1.4,  sparkle: 0.95, irisGlow: 0.85 },
  focused:       { openness: 1.1,  pupilSize: 0.9,  sparkle: 0.5,  irisGlow: 0.55 },
  playful:       { openness: 1.1,  pupilSize: 1.2,  sparkle: 0.9,  irisGlow: 0.75 },
  shy:           { openness: 0.8,  pupilSize: 0.9,  sparkle: 0.4,  irisGlow: 0.35 },
  avoidant:      { openness: 0.85, pupilSize: 0.85, sparkle: 0.3,  irisGlow: 0.3 },
  fixed:         { openness: 1.0,  pupilSize: 1.0,  sparkle: 0.5,  irisGlow: 0.5 },
  wide_worried:  { openness: 1.25, pupilSize: 1.2,  sparkle: 0.3,  irisGlow: 0.4 },
  soft_sad:      { openness: 0.82, pupilSize: 0.9,  sparkle: 0.25, irisGlow: 0.3 },
};

// ─── Eyebrows Library (17 presets) ───────────────────────────

export const EYEBROWS: Record<string, EyebrowPreset> = {
  neutral:    { height: 0,     tilt: 0 },
  raised:     { height: 0.25,  tilt: 0 },
  lowered:    { height: -0.08, tilt: 0 },
  angry:      { height: -0.05, tilt: 0.25 },
  sad_tilt:   { height: -0.03, tilt: -0.2 },
  one_up:     { height: 0.15,  tilt: 0.18 },
  relaxed:    { height: 0.04,  tilt: 0 },
  tense:      { height: -0.03, tilt: 0.1 },
  curious:    { height: 0.22,  tilt: 0.08 },
  worried:    { height: 0.1,   tilt: -0.12 },
  confident:  { height: 0.08,  tilt: 0 },
  playful:    { height: 0.18,  tilt: 0.1 },
  hesitant:   { height: 0.06,  tilt: -0.05 },
  proud:      { height: 0.1,   tilt: 0 },
  soft:       { height: 0.03,  tilt: 0 },
  slight_up:  { height: 0.12,  tilt: 0 },
  tilted:     { height: 0.05,  tilt: -0.15 },
};

// ─── Mouth Library (27 presets) ──────────────────────────────

export const MOUTHS: Record<string, MouthPreset> = {
  neutral:       { openness: 0,    width: 0.5,  curve: 0,     round: 0,    jawDrop: 0 },
  smile_small:   { openness: 0.05, width: 0.58, curve: 0.22,  round: 0,    jawDrop: 0.02 },
  smile_big:     { openness: 0.2,  width: 0.78, curve: 0.55,  round: 0,    jawDrop: 0.1 },
  smile_closed:  { openness: 0,    width: 0.62, curve: 0.35,  round: 0,    jawDrop: 0 },
  open:          { openness: 0.18, width: 0.56, curve: 0.04,  round: 0.03, jawDrop: 0.1 },
  round_o:       { openness: 0.26, width: 0.44, curve: 0,     round: 0.24, jawDrop: 0.14 },
  sad:           { openness: 0.02, width: 0.4,  curve: -0.2,  round: 0,    jawDrop: 0 },
  pout:          { openness: 0.04, width: 0.38, curve: -0.12, round: 0.04, jawDrop: 0.02 },
  laugh:         { openness: 0.35, width: 0.8,  curve: 0.5,   round: 0,    jawDrop: 0.2 },
  laugh_soft:    { openness: 0.15, width: 0.68, curve: 0.4,   round: 0,    jawDrop: 0.08 },
  tense:         { openness: 0.02, width: 0.42, curve: -0.05, round: 0,    jawDrop: 0.01 },
  tremble:       { openness: 0.04, width: 0.38, curve: -0.12, round: 0.05, jawDrop: 0.02 },
  smirk:         { openness: 0.03, width: 0.55, curve: 0.18,  round: 0,    jawDrop: 0.01 },
  grimace:       { openness: 0.08, width: 0.48, curve: -0.08, round: 0,    jawDrop: 0.04 },
  surprised:     { openness: 0.24, width: 0.52, curve: 0.02,  round: 0.18, jawDrop: 0.16 },
  tired:         { openness: 0,    width: 0.38, curve: 0.02,  round: 0,    jawDrop: 0 },
  worried:       { openness: 0.05, width: 0.38, curve: -0.1,  round: 0.04, jawDrop: 0.02 },
  confident:     { openness: 0.08, width: 0.62, curve: 0.32,  round: 0,    jawDrop: 0.03 },
  shy:           { openness: 0.02, width: 0.42, curve: 0.12,  round: 0,    jawDrop: 0 },
  embarrassed:   { openness: 0.04, width: 0.45, curve: 0.08,  round: 0.03, jawDrop: 0.01 },
  wow:           { openness: 0.26, width: 0.5,  curve: 0.02,  round: 0.22, jawDrop: 0.18 },
  hmm:           { openness: 0.02, width: 0.4,  curve: 0.02,  round: 0.02, jawDrop: 0.01 },
  oh:            { openness: 0.14, width: 0.48, curve: 0.02,  round: 0.12, jawDrop: 0.08 },
  yay:           { openness: 0.3,  width: 0.82, curve: 0.55,  round: 0,    jawDrop: 0.15 },
  relief:        { openness: 0.08, width: 0.55, curve: 0.25,  round: 0,    jawDrop: 0.04 },
  small_open:    { openness: 0.08, width: 0.48, curve: 0.02,  round: 0.02, jawDrop: 0.04 },
  small_sad:     { openness: 0.03, width: 0.38, curve: -0.15, round: 0,    jawDrop: 0.01 },
};

// ─── Animation Presets (9 presets) ───────────────────────────

export const ANIMATIONS: Record<string, AnimationPreset> = {
  idle_breath: {
    headTiltX: 0, headTiltY: 0, headTiltZ: 0,
    glowIntensity: 0.3, cheekGlow: 0.1,
  },
  blink_auto: {
    headTiltX: 0, headTiltY: 0, headTiltZ: 0,
    glowIntensity: 0.3, cheekGlow: 0.1,
  },
  bounce_soft: {
    headTiltX: 0, headTiltY: 0, headTiltZ: 0,
    glowIntensity: 0.8, cheekGlow: 0.4,
    oscillation: [
      { property: "headTiltX", amplitude: 0.04, frequency: 3 },
    ],
  },
  talk_sync: {
    headTiltX: 0, headTiltY: 0, headTiltZ: 0,
    glowIntensity: 0.6, cheekGlow: 0.2,
    oscillation: [
      { property: "headTiltX", amplitude: 0.02, frequency: 5 },
      { property: "headTiltZ", amplitude: 0.015, frequency: 3 },
    ],
  },
  micro_smile: {
    headTiltX: 0.02, headTiltY: 0, headTiltZ: 0.03,
    glowIntensity: 0.5, cheekGlow: 0.25,
  },
  look_shift: {
    headTiltX: 0, headTiltY: 0, headTiltZ: 0.03,
    glowIntensity: 0.4, cheekGlow: 0.12,
    oscillation: [
      { property: "headTiltZ", amplitude: 0.015, frequency: 1.2 },
    ],
  },
  calm_wave: {
    headTiltX: 0, headTiltY: 0, headTiltZ: 0,
    glowIntensity: 0.25, cheekGlow: 0.12,
    oscillation: [
      { property: "headTiltX", amplitude: 0.015, frequency: 0.7 },
    ],
  },
  micro_shake: {
    headTiltX: 0, headTiltY: 0, headTiltZ: 0,
    glowIntensity: 0.35, cheekGlow: 0.08,
    oscillation: [
      { property: "headTiltX", amplitude: 0.008, frequency: 6 },
      { property: "headTiltZ", amplitude: 0.01, frequency: 5 },
    ],
  },
  micro_nod: {
    headTiltX: -0.03, headTiltY: 0, headTiltZ: 0,
    glowIntensity: 0.45, cheekGlow: 0.15,
    oscillation: [
      { property: "headTiltX", amplitude: 0.025, frequency: 2.5 },
    ],
  },
};

// ─── Expression Combo ────────────────────────────────────────

export interface ExpressionCombo {
  eyes: string;
  eyebrows: string;
  mouth: string;
  animation: string;
}

/**
 * Resolve an ExpressionCombo into a full FaceAnimationState target.
 * Applies intensity scaling (1-5 → 0.3-1.0 factor).
 */
export function resolveExpression(
  combo: ExpressionCombo,
  intensity: number = 3,
): Partial<FaceAnimationState> {
  const eye = EYES[combo.eyes] ?? EYES.neutral;
  const brow = EYEBROWS[combo.eyebrows] ?? EYEBROWS.neutral;
  const mouth = MOUTHS[combo.mouth] ?? MOUTHS.neutral;
  const anim = ANIMATIONS[combo.animation] ?? ANIMATIONS.idle_breath;

  // Intensity factor: 1→0.3, 2→0.5, 3→0.7, 4→0.85, 5→1.0
  const factor = [0.3, 0.5, 0.7, 0.85, 1.0][Math.max(0, Math.min(4, intensity - 1))];

  // Lerp from neutral toward target based on intensity
  const n_eye = EYES.neutral;
  const n_brow = EYEBROWS.neutral;
  const n_mouth = MOUTHS.neutral;

  const mix = (neutral: number, target: number) => neutral + (target - neutral) * factor;

  // For properties where we want full range even at low intensity (like closing eyes)
  // use a stronger factor that ensures the target is reached more completely
  const strongMix = (neutral: number, target: number) => {
    // When target is very different from neutral (like closing eyes), use at least 0.7 factor
    const strongFactor = Math.max(factor, 0.7);
    return neutral + (target - neutral) * strongFactor;
  };

  return {
    // Eyes: use strong mix so closed eyes actually close
    eyeOpenness: strongMix(n_eye.openness, eye.openness),
    pupilSize: mix(n_eye.pupilSize, eye.pupilSize),
    eyeSparkle: mix(n_eye.sparkle, eye.sparkle),
    irisGlow: mix(n_eye.irisGlow, eye.irisGlow),

    eyebrowHeight: mix(n_brow.height, brow.height),
    eyebrowTilt: mix(n_brow.tilt, brow.tilt),

    mouthOpenness: mix(n_mouth.openness, mouth.openness),
    mouthWidth: mix(n_mouth.width, mouth.width),
    mouthCurve: mix(n_mouth.curve, mouth.curve),
    mouthRound: mix(n_mouth.round, mouth.round),
    jawDrop: mix(n_mouth.jawDrop, mouth.jawDrop),

    headTiltX: anim.headTiltX * factor,
    headTiltY: anim.headTiltY,
    headTiltZ: anim.headTiltZ * factor,
    glowIntensity: anim.glowIntensity,
    cheekGlow: anim.cheekGlow * factor,
  };
}

// ─── Coherence Validation ────────────────────────────────────

const COHERENCE_RULES: Array<{
  test: (combo: ExpressionCombo) => boolean;
  fix: (combo: ExpressionCombo) => ExpressionCombo;
}> = [
  // Rule: happy eyes + sad mouth → fix mouth
  {
    test: (c) => (c.eyes === "squint_smile" || c.eyes === "excited" || c.eyes === "playful") &&
                 (c.mouth === "sad" || c.mouth === "pout" || c.mouth === "tremble" || c.mouth === "small_sad"),
    fix: (c) => ({ ...c, mouth: "smile_small" }),
  },
  // Rule: sad eyes + big smile → fix eyes
  {
    test: (c) => (c.eyes === "sad" || c.eyes === "soft_sad") &&
                 (c.mouth === "smile_big" || c.mouth === "laugh" || c.mouth === "yay"),
    fix: (c) => ({ ...c, eyes: "squint_smile" }),
  },
  // Rule: worried eyes + playful brows → fix brows
  {
    test: (c) => (c.eyes === "worried" || c.eyes === "wide_worried") &&
                 (c.eyebrows === "playful" || c.eyebrows === "confident"),
    fix: (c) => ({ ...c, eyebrows: "worried" }),
  },
  // Rule: angry brows + smile → fix brows
  {
    test: (c) => c.eyebrows === "angry" &&
                 (c.mouth === "smile_big" || c.mouth === "laugh" || c.mouth === "yay"),
    fix: (c) => ({ ...c, eyebrows: "raised" }),
  },
  // Rule: closed eyes + surprised mouth → fix mouth
  {
    test: (c) => (c.eyes === "closed" || c.eyes === "tired") &&
                 (c.mouth === "surprised" || c.mouth === "wow"),
    fix: (c) => ({ ...c, mouth: "neutral" }),
  },
];

/**
 * Validate & fix expression coherence — no contradictory combos.
 */
export function ensureCoherence(combo: ExpressionCombo): ExpressionCombo {
  let result = { ...combo };
  for (const rule of COHERENCE_RULES) {
    if (rule.test(result)) {
      result = rule.fix(result);
    }
  }
  return result;
}
