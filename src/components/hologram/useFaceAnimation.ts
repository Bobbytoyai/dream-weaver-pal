import { useRef, useCallback } from "react";
import { eventBus } from "@/lib/eventBus";
import type { VisemeState } from "./useAudioAmplitude";

export type FaceState =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "happy"
  | "confused"
  | "excited"
  | "attentive"
  | "surprised"
  | "calm"
  | "reassuring"
  | "sad"
  | "sleepy"
  | "curious";

export interface FaceAnimationState {
  eyeOpenness: number;
  eyebrowHeight: number;
  eyebrowTilt: number;
  mouthOpenness: number;
  mouthWidth: number;
  mouthCurve: number;
  mouthRound: number;
  jawDrop: number;
  headTiltX: number;
  headTiltY: number;
  headTiltZ: number;
  pupilX: number;
  pupilY: number;
  pupilSize: number;
  glowIntensity: number;
  cheekGlow: number;
  irisGlow: number;
  eyeSparkle: number;
}

const STATE_TARGETS: Record<FaceState, Partial<FaceAnimationState>> = {
  idle: {
    eyeOpenness: 1, eyebrowHeight: 0, eyebrowTilt: 0,
    mouthOpenness: 0, mouthWidth: 0.5, mouthCurve: 0.08, mouthRound: 0, jawDrop: 0,
    headTiltX: 0, headTiltZ: 0, glowIntensity: 0.3,
    pupilSize: 1, cheekGlow: 0.1, irisGlow: 0.4, eyeSparkle: 0.5,
  },
  listening: {
    eyeOpenness: 1.2, eyebrowHeight: 0.15, eyebrowTilt: 0,
    mouthOpenness: 0, mouthWidth: 0.45, mouthCurve: 0.1, mouthRound: 0, jawDrop: 0,
    headTiltX: 0.08, headTiltZ: 0.12, glowIntensity: 0.55,
    pupilSize: 1.15, cheekGlow: 0.15, irisGlow: 0.6, eyeSparkle: 0.7,
  },
  thinking: {
    eyeOpenness: 0.9, eyebrowHeight: 0.2, eyebrowTilt: 0.15,
    mouthOpenness: 0, mouthWidth: 0.38, mouthCurve: 0, mouthRound: 0, jawDrop: 0,
    headTiltX: -0.05, headTiltZ: -0.08, glowIntensity: 0.45,
    pupilSize: 0.9, cheekGlow: 0.08, irisGlow: 0.5, eyeSparkle: 0.4,
  },
  speaking: {
    eyeOpenness: 1.05, eyebrowHeight: 0.08, eyebrowTilt: 0,
    mouthWidth: 0.55, mouthCurve: 0.15, mouthRound: 0, jawDrop: 0,
    headTiltX: 0, headTiltZ: 0, glowIntensity: 0.6,
    pupilSize: 1.05, cheekGlow: 0.2, irisGlow: 0.55, eyeSparkle: 0.6,
  },
  happy: {
    eyeOpenness: 0.85, eyebrowHeight: 0.16, eyebrowTilt: 0,
    mouthOpenness: 0.2, mouthWidth: 0.78, mouthCurve: 0.55, mouthRound: 0, jawDrop: 0.1,
    headTiltX: 0.04, headTiltZ: 0, glowIntensity: 0.85,
    pupilSize: 1.2, cheekGlow: 0.65, irisGlow: 0.8, eyeSparkle: 0.9,
  },
  confused: {
    eyeOpenness: 1.15, eyebrowHeight: 0.1, eyebrowTilt: 0.25,
    mouthOpenness: 0.08, mouthWidth: 0.32, mouthCurve: -0.05, mouthRound: 0, jawDrop: 0,
    headTiltX: 0, headTiltZ: 0.18, glowIntensity: 0.35,
    pupilSize: 1.1, cheekGlow: 0.05, irisGlow: 0.45, eyeSparkle: 0.4,
  },
  excited: {
    eyeOpenness: 1.35, eyebrowHeight: 0.28, eyebrowTilt: 0,
    mouthOpenness: 0.28, mouthWidth: 0.75, mouthCurve: 0.45, mouthRound: 0, jawDrop: 0.15,
    headTiltX: 0, headTiltZ: 0, glowIntensity: 0.95,
    pupilSize: 1.35, cheekGlow: 0.55, irisGlow: 0.9, eyeSparkle: 1.0,
  },
  attentive: {
    eyeOpenness: 1.25, eyebrowHeight: 0.18, eyebrowTilt: 0,
    mouthOpenness: 0.1, mouthWidth: 0.6, mouthCurve: 0.2, mouthRound: 0, jawDrop: 0.05,
    headTiltX: 0.03, headTiltZ: 0.05, glowIntensity: 0.65,
    pupilSize: 1.2, cheekGlow: 0.3, irisGlow: 0.7, eyeSparkle: 0.8,
  },
  surprised: {
    eyeOpenness: 1.4, eyebrowHeight: 0.32, eyebrowTilt: 0,
    mouthOpenness: 0.35, mouthWidth: 0.5, mouthCurve: 0, mouthRound: 0.4, jawDrop: 0.3,
    headTiltX: 0, headTiltZ: 0, glowIntensity: 0.75,
    pupilSize: 1.4, cheekGlow: 0.2, irisGlow: 0.85, eyeSparkle: 0.95,
  },
  calm: {
    eyeOpenness: 0.92, eyebrowHeight: 0.02, eyebrowTilt: 0,
    mouthOpenness: 0, mouthWidth: 0.48, mouthCurve: 0.1, mouthRound: 0, jawDrop: 0,
    headTiltX: 0, headTiltZ: 0, glowIntensity: 0.25,
    pupilSize: 0.95, cheekGlow: 0.12, irisGlow: 0.35, eyeSparkle: 0.3,
  },
  reassuring: {
    eyeOpenness: 0.95, eyebrowHeight: 0.06, eyebrowTilt: 0,
    mouthOpenness: 0.05, mouthWidth: 0.6, mouthCurve: 0.28, mouthRound: 0, jawDrop: 0.03,
    headTiltX: 0.02, headTiltZ: 0.03, glowIntensity: 0.4,
    pupilSize: 1.1, cheekGlow: 0.25, irisGlow: 0.5, eyeSparkle: 0.6,
  },
  sad: {
    eyeOpenness: 0.75, eyebrowHeight: -0.05, eyebrowTilt: -0.2,
    mouthOpenness: 0.02, mouthWidth: 0.4, mouthCurve: -0.2, mouthRound: 0, jawDrop: 0,
    headTiltX: -0.06, headTiltZ: -0.04, glowIntensity: 0.2,
    pupilSize: 0.85, cheekGlow: 0.05, irisGlow: 0.25, eyeSparkle: 0.2,
  },
  sleepy: {
    eyeOpenness: 0.4, eyebrowHeight: -0.08, eyebrowTilt: 0,
    mouthOpenness: 0, mouthWidth: 0.42, mouthCurve: 0.03, mouthRound: 0, jawDrop: 0,
    headTiltX: -0.04, headTiltZ: 0.06, glowIntensity: 0.15,
    pupilSize: 0.8, cheekGlow: 0.08, irisGlow: 0.2, eyeSparkle: 0.15,
  },
  curious: {
    eyeOpenness: 1.3, eyebrowHeight: 0.22, eyebrowTilt: 0.08,
    mouthOpenness: 0.05, mouthWidth: 0.48, mouthCurve: 0.12, mouthRound: 0, jawDrop: 0,
    headTiltX: 0.06, headTiltZ: 0.14, glowIntensity: 0.6,
    pupilSize: 1.25, cheekGlow: 0.18, irisGlow: 0.75, eyeSparkle: 0.85,
  },
};

const DEFAULT_STATE: FaceAnimationState = {
  eyeOpenness: 1, eyebrowHeight: 0, eyebrowTilt: 0,
  mouthOpenness: 0, mouthWidth: 0.5, mouthCurve: 0.08, mouthRound: 0, jawDrop: 0,
  headTiltX: 0, headTiltY: 0, headTiltZ: 0,
  pupilX: 0, pupilY: 0, pupilSize: 1,
  glowIntensity: 0.3, cheekGlow: 0.1, irisGlow: 0.4, eyeSparkle: 0.5,
};

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * Math.min(1, t);
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

/**
 * Expression engine with emotion intensity, enhanced micro-animations,
 * and phoneme-based lip sync.
 * 
 * New features vs previous version:
 * - sad / sleepy / curious states
 * - irisGlow + eyeSparkle channels for "living eyes"
 * - Emotion intensity multiplier (0-1)
 * - Faster micro-animation cycle (2-4s)
 * - Double-blink, eye-sparkle pulse, idle eye drift
 */
export function useFaceAnimation(
  faceState: FaceState,
  gazeRef: React.MutableRefObject<{ x: number; y: number }>,
  audioAmplitude: number,
  viseme?: VisemeState,
  emotionIntensity: number = 0.7,
) {
  const current = useRef<FaceAnimationState>({ ...DEFAULT_STATE });
  const blinkTimer = useRef(0);
  const blinkPhase = useRef(0);
  const nextBlink = useRef(2 + Math.random() * 2);
  const breathPhase = useRef(0);
  const microTimer = useRef(0);
  const microOffset = useRef({ eyebrow: 0, headX: 0, headZ: 0, pupilDrift: 0, mouthQuirk: 0 });
  const prevExpressionRef = useRef<FaceState>("idle");
  const doubleBlinkChance = useRef(0);
  const sparklePhase = useRef(Math.random() * Math.PI * 2);
  const eyeDriftPhase = useRef(Math.random() * Math.PI * 2);
  // Mouth idle animation refs
  const mouthIdlePhase = useRef(Math.random() * Math.PI * 2);
  const mouthQuirkTimer = useRef(0);
  const nextMouthQuirk = useRef(3 + Math.random() * 4);
  const mouthQuirkPhase = useRef(0); // 0=none, 1=quirking, 2=returning
  const mouthQuirkTarget = useRef({ curve: 0, width: 0, open: 0 });

  const update = useCallback((delta: number) => {
    const c = current.current;
    const gaze = gazeRef.current;
    const gazeX = clamp(gaze.x, -1, 1);
    const gazeY = clamp(gaze.y, -1, 1);
    const rawTargets = { ...DEFAULT_STATE, ...STATE_TARGETS[faceState] };

    // Apply emotion intensity: lerp between idle and target
    const idleTargets = STATE_TARGETS.idle;
    const intensity = clamp(emotionIntensity, 0, 1);
    const targets = { ...rawTargets };
    if (faceState !== "idle" && faceState !== "speaking") {
      for (const key of Object.keys(rawTargets) as (keyof FaceAnimationState)[]) {
        const idleVal = (idleTargets as any)[key] ?? (DEFAULT_STATE as any)[key];
        const targetVal = (rawTargets as any)[key];
        if (typeof targetVal === "number" && typeof idleVal === "number") {
          (targets as any)[key] = idleVal + (targetVal - idleVal) * intensity;
        }
      }
    }

    if (faceState !== prevExpressionRef.current) {
      eventBus.emit({
        type: "EXPRESSION_CHANGED",
        expression: faceState,
        prev: prevExpressionRef.current,
      });
      prevExpressionRef.current = faceState;
    }

    const isCalm = faceState === "calm" || faceState === "reassuring" || faceState === "sleepy";
    const isSad = faceState === "sad";
    const speedMult = isCalm ? 0.55 : isSad ? 0.7 : 1;
    const baseSpeed = 5 * speedMult;
    const gazeSpeed = 7 * speedMult;
    const pupilSpeed = 9;

    // --- BLINK ENGINE (natural, with double-blink) ---
    blinkTimer.current += delta;
    if (blinkPhase.current === 0 && blinkTimer.current >= nextBlink.current) {
      blinkPhase.current = 1;
      blinkTimer.current = 0;
      doubleBlinkChance.current = Math.random();
    }

    let blinkMult = 1;
    if (blinkPhase.current === 1) {
      blinkMult = Math.max(0, 1 - blinkTimer.current * 12);
      if (blinkMult <= 0.03) {
        blinkPhase.current = 2;
        blinkTimer.current = 0;
      }
    } else if (blinkPhase.current === 2) {
      blinkMult = Math.min(1, blinkTimer.current * 6);
      if (blinkMult >= 0.95) {
        if (doubleBlinkChance.current > 0.75 && doubleBlinkChance.current < 0.95) {
          blinkPhase.current = 1;
          blinkTimer.current = 0;
          doubleBlinkChance.current = 1;
        } else {
          blinkPhase.current = 0;
          blinkTimer.current = 0;
          const exciteMod = faceState === "excited" || faceState === "attentive" || faceState === "curious" ? 0.6 : 1;
          const calmMod = isCalm ? 1.4 : 1;
          const sleepyMod = faceState === "sleepy" ? 0.5 : 1; // blink more when sleepy
          nextBlink.current = (2 + Math.random() * 2.5) * exciteMod * calmMod * sleepyMod;
        }
      }
    }

    // --- BREATHING ---
    breathPhase.current += delta * (isCalm ? 0.7 : 1.1);
    const breathX = Math.sin(breathPhase.current) * 0.012;
    const breathY = Math.cos(breathPhase.current * 0.7) * 0.007;
    const breathScale = Math.sin(breathPhase.current * 0.9) * 0.004;

    // --- EYE SPARKLE PULSE (living eyes, never static) ---
    sparklePhase.current += delta * 2.5;
    const sparkleWave = 0.5 + Math.sin(sparklePhase.current) * 0.3 + Math.sin(sparklePhase.current * 2.7) * 0.2;

    // --- IDLE EYE DRIFT (eyes never fully still > 2s) ---
    eyeDriftPhase.current += delta * 0.8;
    const eyeDriftX = Math.sin(eyeDriftPhase.current * 1.1) * 0.008 + Math.sin(eyeDriftPhase.current * 2.3) * 0.004;
    const eyeDriftY = Math.cos(eyeDriftPhase.current * 0.9) * 0.005;

    // --- MICRO-EXPRESSIONS (every 2-4s) ---
    microTimer.current += delta;
    if (microTimer.current > 2 + Math.random() * 2) {
      microTimer.current = 0;
      microOffset.current = {
        eyebrow: (Math.random() - 0.5) * 0.05,
        headX: (Math.random() - 0.5) * 0.025,
        headZ: (Math.random() - 0.5) * 0.035,
        pupilDrift: (Math.random() - 0.5) * 0.018,
        mouthQuirk: (Math.random() - 0.5) * 0.025,
      };
    }

    // --- THINKING: wandering pupils ---
    let thinkingPupilX = 0;
    let thinkingPupilY = 0;
    if (faceState === "thinking") {
      const t = breathPhase.current * 2;
      thinkingPupilX = Math.sin(t * 1.3) * 0.045;
      thinkingPupilY = Math.cos(t * 0.9) * 0.03;
    }

    // --- CURIOUS: slight head tilt oscillation ---
    let curiousTiltZ = 0;
    if (faceState === "curious") {
      curiousTiltZ = Math.sin(breathPhase.current * 1.5) * 0.03;
    }

    // --- SLEEPY: slow eye drift + occasional heavy blink ---
    let sleepyEyeWobble = 0;
    if (faceState === "sleepy") {
      sleepyEyeWobble = Math.sin(breathPhase.current * 0.5) * 0.08;
    }

    // --- IDLE MOUTH ANIMATION (natural, like breathing through mouth) ---
    mouthIdlePhase.current += delta * 0.6;
    // Gentle breathing-linked mouth movement
    const mouthBreath = Math.sin(mouthIdlePhase.current) * 0.015 + Math.sin(mouthIdlePhase.current * 2.3) * 0.008;
    const mouthBreathCurve = Math.sin(mouthIdlePhase.current * 0.7) * 0.02;
    const mouthBreathWidth = Math.sin(mouthIdlePhase.current * 1.1) * 0.01;

    // Occasional mouth quirks (like a small smile, lip purse, or twitch)
    let mouthQuirkCurveAdd = 0;
    let mouthQuirkWidthAdd = 0;
    let mouthQuirkOpenAdd = 0;

    if (faceState !== "speaking") {
      mouthQuirkTimer.current += delta;
      if (mouthQuirkPhase.current === 0 && mouthQuirkTimer.current >= nextMouthQuirk.current) {
        mouthQuirkPhase.current = 1;
        mouthQuirkTimer.current = 0;
        // Random quirk type
        const quirkType = Math.random();
        if (quirkType < 0.4) {
          // Small smile
          mouthQuirkTarget.current = { curve: 0.12 + Math.random() * 0.08, width: 0.04, open: 0 };
        } else if (quirkType < 0.65) {
          // Lip purse / thinking
          mouthQuirkTarget.current = { curve: -0.03, width: -0.06, open: 0.02 };
        } else if (quirkType < 0.85) {
          // Slight open (like about to speak)
          mouthQuirkTarget.current = { curve: 0.02, width: 0, open: 0.04 + Math.random() * 0.03 };
        } else {
          // Asymmetric smirk
          mouthQuirkTarget.current = { curve: 0.06, width: 0.03, open: 0.01 };
        }
      }

      if (mouthQuirkPhase.current === 1) {
        const progress = Math.min(1, mouthQuirkTimer.current * 3);
        mouthQuirkCurveAdd = mouthQuirkTarget.current.curve * progress;
        mouthQuirkWidthAdd = mouthQuirkTarget.current.width * progress;
        mouthQuirkOpenAdd = mouthQuirkTarget.current.open * progress;
        if (mouthQuirkTimer.current > 0.4 + Math.random() * 0.3) {
          mouthQuirkPhase.current = 2;
          mouthQuirkTimer.current = 0;
        }
      } else if (mouthQuirkPhase.current === 2) {
        const fadeOut = Math.max(0, 1 - mouthQuirkTimer.current * 2);
        mouthQuirkCurveAdd = mouthQuirkTarget.current.curve * fadeOut;
        mouthQuirkWidthAdd = mouthQuirkTarget.current.width * fadeOut;
        mouthQuirkOpenAdd = mouthQuirkTarget.current.open * fadeOut;
        if (fadeOut <= 0.01) {
          mouthQuirkPhase.current = 0;
          mouthQuirkTimer.current = 0;
          nextMouthQuirk.current = 3 + Math.random() * 5;
        }
      }
    }

    // --- LIP SYNC + EXPRESSIVE FACE (cartoon-exaggerated viseme mapping) ---
    let mouthOpenTarget: number;
    let mouthWidthTarget: number;
    let mouthRoundTarget: number;
    let jawDropTarget: number;
    // Speech-reactive expression modifiers
    let speechEyebrowLift = 0;
    let speechEyeWiden = 0;
    let speechHeadNod = 0;
    let speechCheekBoost = 0;

    if (faceState === "speaking" && viseme && viseme.amplitude > 0.01) {
      // Cartoon exaggeration: amplify all viseme values
      const exaggeration = 1.4;
      mouthOpenTarget = viseme.mouthOpenness * exaggeration;
      mouthWidthTarget = viseme.mouthWidth;
      mouthRoundTarget = viseme.mouthRound * 1.3;
      jawDropTarget = viseme.jawDrop * exaggeration;

      // Add micro-variation for liveliness
      const microVar = Math.sin(breathPhase.current * 10) * 0.04;
      mouthOpenTarget += microVar;

      // Squash & stretch: wider mouth = less tall, taller mouth = less wide
      if (mouthOpenTarget > 0.3) {
        mouthWidthTarget *= 0.85;
      }
      if (mouthWidthTarget > 0.65) {
        mouthOpenTarget *= 0.9;
      }

      // ── Sync eyes/eyebrows/head with speech intensity ──
      const amp = viseme.amplitude;
      // Eyebrows rise on emphasis (loud syllables)
      speechEyebrowLift = amp > 0.15 ? (amp - 0.15) * 0.35 : 0;
      // Eyes widen slightly on emphasis
      speechEyeWiden = amp > 0.12 ? (amp - 0.12) * 0.15 : 0;
      // Subtle head nod on rhythm
      speechHeadNod = Math.sin(breathPhase.current * 6) * amp * 0.04;
      // Cheeks glow more when smiling/speaking enthusiastically
      speechCheekBoost = mouthWidthTarget > 0.6 ? (mouthWidthTarget - 0.6) * 0.4 : 0;

    } else if (faceState === "speaking") {
      // Fallback amplitude-based (cartoon style)
      mouthOpenTarget = Math.min(0.85, audioAmplitude * 4);
      mouthWidthTarget = targets.mouthWidth ?? 0.55;
      mouthRoundTarget = audioAmplitude > 0.3 ? 0.2 : 0;
      jawDropTarget = audioAmplitude * 2;

      speechEyebrowLift = audioAmplitude > 0.15 ? (audioAmplitude - 0.15) * 0.3 : 0;
      speechEyeWiden = audioAmplitude > 0.12 ? (audioAmplitude - 0.12) * 0.12 : 0;
      speechHeadNod = Math.sin(breathPhase.current * 6) * audioAmplitude * 0.03;
      speechCheekBoost = audioAmplitude > 0.2 ? audioAmplitude * 0.15 : 0;
    } else {
      mouthOpenTarget = (targets.mouthOpenness ?? 0) + mouthBreath + mouthQuirkOpenAdd;
      mouthWidthTarget = (targets.mouthWidth ?? 0.5) + mouthBreathWidth + mouthQuirkWidthAdd;
      mouthRoundTarget = targets.mouthRound ?? 0;
      jawDropTarget = (targets.jawDrop ?? 0) + mouthBreath * 0.3;
    }

    // --- LERP ALL VALUES ---
    const mouthSpeed = faceState === "speaking" ? baseSpeed * 5 : baseSpeed * 3;

    c.eyeOpenness = lerp(c.eyeOpenness, ((targets.eyeOpenness ?? 1) + sleepyEyeWobble + speechEyeWiden) * blinkMult, delta * baseSpeed * 2.5);
    c.eyebrowHeight = lerp(c.eyebrowHeight, (targets.eyebrowHeight ?? 0) + microOffset.current.eyebrow + speechEyebrowLift, delta * (faceState === "speaking" ? baseSpeed * 3 : baseSpeed));
    c.eyebrowTilt = lerp(c.eyebrowTilt, targets.eyebrowTilt ?? 0, delta * baseSpeed);

    c.mouthOpenness = lerp(c.mouthOpenness, mouthOpenTarget, delta * mouthSpeed);
    c.mouthWidth = lerp(c.mouthWidth, mouthWidthTarget + microOffset.current.mouthQuirk, delta * mouthSpeed * 0.8);
    c.mouthRound = lerp(c.mouthRound, mouthRoundTarget, delta * mouthSpeed * 0.7);
    c.jawDrop = lerp(c.jawDrop, jawDropTarget, delta * mouthSpeed);
    c.mouthCurve = lerp(c.mouthCurve, targets.mouthCurve ?? 0, delta * baseSpeed * 1.5);

    c.pupilSize = lerp(c.pupilSize, (targets.pupilSize ?? 1) + breathScale, delta * baseSpeed);

    c.headTiltX = lerp(
      c.headTiltX,
      (targets.headTiltX ?? 0) - gazeY * 0.18 + breathX + microOffset.current.headX + speechHeadNod,
      delta * gazeSpeed * 0.7
    );
    c.headTiltY = lerp(c.headTiltY, gazeX * 0.45, delta * gazeSpeed * 0.8);
    c.headTiltZ = lerp(
      c.headTiltZ,
      (targets.headTiltZ ?? 0) + microOffset.current.headZ + gazeX * 0.05 + curiousTiltZ,
      delta * gazeSpeed * 0.6
    );

    // Strong, fluid pupil tracking — eyes lock onto cursor position
    c.pupilX = lerp(
      c.pupilX,
      gazeX * 0.32 + thinkingPupilX + microOffset.current.pupilDrift + eyeDriftX,
      delta * pupilSpeed * 2.0
    );
    c.pupilY = lerp(
      c.pupilY,
      gazeY * 0.24 + thinkingPupilY + breathY + eyeDriftY,
      delta * pupilSpeed * 2.0
    );

    c.glowIntensity = lerp(c.glowIntensity, targets.glowIntensity ?? 0.3, delta * baseSpeed * 0.6);
    c.cheekGlow = lerp(c.cheekGlow, (targets.cheekGlow ?? 0.1) + speechCheekBoost, delta * baseSpeed * 0.8);
    c.irisGlow = lerp(c.irisGlow, (targets.irisGlow ?? 0.4) * sparkleWave, delta * baseSpeed * 1.2);
    c.eyeSparkle = lerp(c.eyeSparkle, (targets.eyeSparkle ?? 0.5) * (0.7 + sparkleWave * 0.3), delta * baseSpeed);

    return { ...c };
  }, [audioAmplitude, faceState, gazeRef, viseme, emotionIntensity]);

  return { update, current };
}
