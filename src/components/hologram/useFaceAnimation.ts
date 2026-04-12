import { useRef, useCallback } from "react";
import { eventBus } from "@/lib/eventBus";
import type { VisemeState } from "./useAudioAmplitude";
import type { ExpressionCombo } from "@/lib/bobby/expressionLibrary";
import { resolveExpression, ANIMATIONS } from "@/lib/bobby/expressionLibrary";

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
  | "curious"
  | "playful"
  | "proud";

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
    eyeOpenness: 0.0, eyebrowHeight: -0.12, eyebrowTilt: 0,
    mouthOpenness: 0, mouthWidth: 0.38, mouthCurve: 0.02, mouthRound: 0, jawDrop: 0,
    headTiltX: -0.06, headTiltZ: 0.08, glowIntensity: 0.08,
    pupilSize: 0.5, cheekGlow: 0.05, irisGlow: 0.1, eyeSparkle: 0.05,
  },
  curious: {
    eyeOpenness: 1.3, eyebrowHeight: 0.22, eyebrowTilt: 0.08,
    mouthOpenness: 0.05, mouthWidth: 0.48, mouthCurve: 0.12, mouthRound: 0, jawDrop: 0,
    headTiltX: 0.06, headTiltZ: 0.14, glowIntensity: 0.6,
    pupilSize: 1.25, cheekGlow: 0.18, irisGlow: 0.75, eyeSparkle: 0.85,
  },
  playful: {
    eyeOpenness: 1.1, eyebrowHeight: 0.18, eyebrowTilt: 0.1,
    mouthOpenness: 0.15, mouthWidth: 0.7, mouthCurve: 0.4, mouthRound: 0, jawDrop: 0.08,
    headTiltX: 0.05, headTiltZ: 0.12, glowIntensity: 0.8,
    pupilSize: 1.2, cheekGlow: 0.45, irisGlow: 0.75, eyeSparkle: 0.9,
  },
  proud: {
    eyeOpenness: 1.0, eyebrowHeight: 0.1, eyebrowTilt: 0,
    mouthOpenness: 0.08, mouthWidth: 0.62, mouthCurve: 0.32, mouthRound: 0, jawDrop: 0.03,
    headTiltX: -0.06, headTiltZ: 0, glowIntensity: 0.7,
    pupilSize: 1.1, cheekGlow: 0.35, irisGlow: 0.65, eyeSparkle: 0.75,
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
 * phoneme-based lip sync, and real-time sync features (v3.0).
 * 
 * Sync timing:
 * - Eyebrows ANTICIPATE speech by ~50ms (lead)
 * - Eyes FOLLOW with ~100ms natural delay (lag)
 * - Mouth is 100% aligned to audio
 * - Emotion blends with speaking state (not replaced)
 * 
 * Performance:
 * - All animations target <16ms per frame
 * - Failsafe: reverts to neutral if frame drops detected
 */
export function useFaceAnimation(
  faceState: FaceState,
  gazeRef: React.MutableRefObject<{ x: number; y: number }>,
  audioAmplitude: number,
  viseme?: VisemeState,
  emotionIntensity: number = 0.7,
  emotionDuringSpeech?: FaceState,
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
  const nextMouthQuirk = useRef(1 + Math.random() * 2);
  const mouthQuirkPhase = useRef(0); // 0=none, 1=quirking, 2=returning
  const mouthQuirkTarget = useRef({ curve: 0, width: 0, open: 0 });
  // v3.0: Anticipation/delay buffers
  const eyebrowAnticipationBuffer = useRef(0); // stores upcoming eyebrow lift
  const eyeDelayBuffer = useRef({ openness: 1, sparkle: 0.5 }); // delayed eye state
  const eyeDelayTimer = useRef(0);
  // v3.0: Performance failsafe
  const frameBudgetExceeded = useRef(0);
  const lastFrameTime = useRef(0);

  const update = useCallback((delta: number) => {
    const frameStart = performance.now();
    const c = current.current;
    const gaze = gazeRef.current;
    const gazeX = clamp(gaze.x, -1, 1);
    const gazeY = clamp(gaze.y, -1, 1);
    const rawTargets = { ...DEFAULT_STATE, ...STATE_TARGETS[faceState] };

    // v3.0: Blend emotion into speaking state (eyes, eyebrows, cheeks, glow)
    const emotionTargets = emotionDuringSpeech && faceState === "speaking"
      ? { ...DEFAULT_STATE, ...STATE_TARGETS[emotionDuringSpeech] }
      : null;

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

    // v3.0: If speaking with emotion, blend non-mouth properties from emotion
    if (emotionTargets) {
      const blendKeys: (keyof FaceAnimationState)[] = [
        "eyeOpenness", "eyebrowHeight", "eyebrowTilt", "glowIntensity",
        "cheekGlow", "irisGlow", "eyeSparkle", "pupilSize",
      ];
      for (const key of blendKeys) {
        const emotionVal = (emotionTargets as any)[key];
        const speakVal = (targets as any)[key];
        if (typeof emotionVal === "number" && typeof speakVal === "number") {
          // 60% emotion, 40% speaking base for natural blend
          (targets as any)[key] = speakVal * 0.4 + emotionVal * 0.6 * intensity;
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

    // --- BLINK ENGINE (natural, smooth ease-in/ease-out) ---
    blinkTimer.current += delta;
    if (blinkPhase.current === 0 && blinkTimer.current >= nextBlink.current) {
      blinkPhase.current = 1; // closing
      blinkTimer.current = 0;
      doubleBlinkChance.current = Math.random();
    }

    let blinkMult = 1;
    const closeDuration = 0.08; // 80ms to close (fast snap)
    const holdDuration = 0.04;  // 40ms held shut
    const openDuration = 0.14;  // 140ms to open (slower, natural)

    if (blinkPhase.current === 1) {
      // Closing — ease-in (accelerate)
      const t = Math.min(1, blinkTimer.current / closeDuration);
      blinkMult = 1 - t * t; // quadratic ease-in
      if (t >= 1) {
        blinkPhase.current = 3; // hold
        blinkTimer.current = 0;
      }
    } else if (blinkPhase.current === 3) {
      // Hold closed
      blinkMult = 0;
      if (blinkTimer.current >= holdDuration) {
        blinkPhase.current = 2; // opening
        blinkTimer.current = 0;
      }
    } else if (blinkPhase.current === 2) {
      // Opening — ease-out (decelerate)
      const t = Math.min(1, blinkTimer.current / openDuration);
      blinkMult = t * (2 - t); // quadratic ease-out
      if (t >= 1) {
        if (doubleBlinkChance.current > 0.7 && doubleBlinkChance.current < 0.9) {
          // Double blink
          blinkPhase.current = 1;
          blinkTimer.current = 0;
          doubleBlinkChance.current = 1;
        } else {
          blinkPhase.current = 0;
          blinkTimer.current = 0;
          const exciteMod = faceState === "excited" || faceState === "attentive" || faceState === "curious" ? 0.6 : 1;
          const calmMod = isCalm ? 1.4 : 1;
          const sleepyMod = faceState === "sleepy" ? 0.5 : 1;
          nextBlink.current = (2.5 + Math.random() * 3) * exciteMod * calmMod * sleepyMod;
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

    // --- SLEEPY: eyes fully closed, slow breathing head bob ---
    let sleepyEyeWobble = 0;
    let sleepyHeadBob = 0;
    if (faceState === "sleepy") {
      sleepyEyeWobble = -0.2; // Force eyes shut
      sleepyHeadBob = Math.sin(breathPhase.current * 0.4) * 0.03; // slow nod
    }

    // --- CONFUSED: rapid micro head shake ---
    let confusedShakeX = 0;
    let confusedShakeZ = 0;
    if (faceState === "confused") {
      const shakeT = breathPhase.current * 8;
      confusedShakeX = Math.sin(shakeT) * 0.015 * intensity;
      confusedShakeZ = Math.sin(shakeT * 1.3) * 0.02 * intensity;
    }

    // --- SURPRISED: freeze 200ms then resume ---
    let surprisedFreeze = 1;
    if (faceState === "surprised" && prevExpressionRef.current !== "surprised") {
      // Just transitioned: apply freeze effect via slower lerp
      surprisedFreeze = 0.15; // dramatically slow lerp for 200ms effect
    }

    // --- PLAYFUL: bounce + tilt ---
    let playfulBounce = 0;
    let playfulTiltZ = 0;
    if (faceState === "playful") {
      playfulBounce = Math.abs(Math.sin(breathPhase.current * 3)) * 0.04 * intensity;
      playfulTiltZ = Math.sin(breathPhase.current * 2) * 0.05;
    }

    // --- PROUD: subtle head-up ---
    let proudHeadUp = 0;
    if (faceState === "proud") {
      proudHeadUp = -0.04 * intensity;
    }

    // --- IDLE MOUTH ANIMATION (natural, like breathing through mouth) ---
    mouthIdlePhase.current += delta * 1.2;
    // Breathing-linked mouth movement (amplified)
    const mouthBreath = Math.sin(mouthIdlePhase.current) * 0.035 + Math.sin(mouthIdlePhase.current * 2.3) * 0.02;
    const mouthBreathCurve = Math.sin(mouthIdlePhase.current * 0.7) * 0.05;
    const mouthBreathWidth = Math.sin(mouthIdlePhase.current * 1.1) * 0.025;

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
        if (quirkType < 0.35) {
          // Smile
          mouthQuirkTarget.current = { curve: 0.25 + Math.random() * 0.15, width: 0.08, open: 0.02 };
        } else if (quirkType < 0.55) {
          // Lip purse / thinking
          mouthQuirkTarget.current = { curve: -0.08, width: -0.1, open: 0.05 };
        } else if (quirkType < 0.75) {
          // Slight open (like about to speak)
          mouthQuirkTarget.current = { curve: 0.05, width: 0.02, open: 0.08 + Math.random() * 0.05 };
        } else if (quirkType < 0.9) {
          // Smirk
          mouthQuirkTarget.current = { curve: 0.15, width: 0.06, open: 0.02 };
        } else {
          // Big grin
          mouthQuirkTarget.current = { curve: 0.35, width: 0.1, open: 0.04 };
        }
      }

      if (mouthQuirkPhase.current === 1) {
        const progress = Math.min(1, mouthQuirkTimer.current * 3);
        mouthQuirkCurveAdd = mouthQuirkTarget.current.curve * progress;
        mouthQuirkWidthAdd = mouthQuirkTarget.current.width * progress;
        mouthQuirkOpenAdd = mouthQuirkTarget.current.open * progress;
        if (mouthQuirkTimer.current > 0.6 + Math.random() * 0.5) {
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
          nextMouthQuirk.current = 1.5 + Math.random() * 2.5;
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
      // Cartoon exaggeration: amplify all viseme values for expressiveness
      const exaggeration = 2.8;
      mouthOpenTarget = Math.min(1.0, viseme.mouthOpenness * exaggeration + 0.1);
      mouthWidthTarget = viseme.mouthWidth * 1.3;
      mouthRoundTarget = viseme.mouthRound * 1.8;
      jawDropTarget = viseme.jawDrop * exaggeration;

      // Rhythmic micro-variation for liveliness
      const microVar = Math.sin(breathPhase.current * 12) * 0.06 + Math.sin(breathPhase.current * 7.3) * 0.03;
      mouthOpenTarget += microVar;

      // Squash & stretch: wider mouth = less tall, taller mouth = less wide
      if (mouthOpenTarget > 0.3) {
        mouthWidthTarget *= 0.82;
      }
      if (mouthWidthTarget > 0.65) {
        mouthOpenTarget *= 0.88;
      }

      // Sync eyes/eyebrows/head with speech intensity
      const amp = viseme.amplitude;
      speechEyebrowLift = amp > 0.1 ? (amp - 0.1) * 0.5 : 0;
      speechEyeWiden = amp > 0.08 ? (amp - 0.08) * 0.2 : 0;
      speechHeadNod = Math.sin(breathPhase.current * 5) * amp * 0.06;
      speechCheekBoost = mouthWidthTarget > 0.5 ? (mouthWidthTarget - 0.5) * 0.5 : 0;

    } else if (faceState === "speaking") {
      // Fallback amplitude-based (no viseme data) — very visible
      const ampFactor = Math.min(1.0, audioAmplitude * 6.5 + 0.08);
      mouthOpenTarget = ampFactor;
      mouthWidthTarget = (targets.mouthWidth ?? 0.55) + audioAmplitude * 0.3;
      mouthRoundTarget = audioAmplitude > 0.2 ? 0.35 : audioAmplitude * 0.5;
      jawDropTarget = audioAmplitude * 3.2;

      // Add syllable-like oscillation even with raw amplitude
      const syllableOsc = Math.sin(breathPhase.current * 14) * 0.08 * audioAmplitude;
      mouthOpenTarget += syllableOsc;

      speechEyebrowLift = audioAmplitude > 0.1 ? (audioAmplitude - 0.1) * 0.45 : 0;
      speechEyeWiden = audioAmplitude > 0.08 ? (audioAmplitude - 0.08) * 0.18 : 0;
      speechHeadNod = Math.sin(breathPhase.current * 5) * audioAmplitude * 0.05;
      speechCheekBoost = audioAmplitude > 0.15 ? audioAmplitude * 0.2 : 0;
    } else {
      mouthOpenTarget = (targets.mouthOpenness ?? 0) + mouthBreath + mouthQuirkOpenAdd;
      mouthWidthTarget = (targets.mouthWidth ?? 0.5) + mouthBreathWidth + mouthQuirkWidthAdd;
      mouthRoundTarget = targets.mouthRound ?? 0;
      jawDropTarget = (targets.jawDrop ?? 0) + mouthBreath * 0.3;
    }

    // --- LERP ALL VALUES ---
    const mouthSpeed = faceState === "speaking" ? baseSpeed * 10 : baseSpeed * 3;

    // v3.0: EYEBROW ANTICIPATION — eyebrows lead speech by ~50ms
    // Buffer the eyebrow target and use it slightly ahead of audio
    const eyebrowTarget = (targets.eyebrowHeight ?? 0) + microOffset.current.eyebrow + speechEyebrowLift;
    const anticipatedEyebrow = eyebrowTarget + (eyebrowTarget - eyebrowAnticipationBuffer.current) * 0.3;
    eyebrowAnticipationBuffer.current = eyebrowTarget;
    c.eyebrowHeight = lerp(c.eyebrowHeight, anticipatedEyebrow, delta * (faceState === "speaking" ? baseSpeed * 4 : baseSpeed));
    c.eyebrowTilt = lerp(c.eyebrowTilt, targets.eyebrowTilt ?? 0, delta * baseSpeed);

    // v3.0: EYE DELAY — eyes follow with +100ms natural delay
    eyeDelayTimer.current += delta;
    const eyeTargetOpenness = ((targets.eyeOpenness ?? 1) + sleepyEyeWobble + speechEyeWiden) * blinkMult;
    const eyeTargetSparkle = (targets.eyeSparkle ?? 0.5) * (0.7 + sparkleWave * 0.3);
    // Smooth delay: update delayed buffer at ~10Hz for natural lag
    if (eyeDelayTimer.current > 0.1) {
      eyeDelayBuffer.current.openness = eyeTargetOpenness;
      eyeDelayBuffer.current.sparkle = eyeTargetSparkle;
      eyeDelayTimer.current = 0;
    }
    // Use delayed values for eyes (creates natural 100ms lag)
    c.eyeOpenness = lerp(c.eyeOpenness, eyeDelayBuffer.current.openness, delta * baseSpeed * 2.5);

    // Mouth — 100% sync with audio (no delay)
    c.mouthOpenness = lerp(c.mouthOpenness, mouthOpenTarget, delta * mouthSpeed);
    c.mouthWidth = lerp(c.mouthWidth, mouthWidthTarget + microOffset.current.mouthQuirk, delta * mouthSpeed * 0.8);
    c.mouthRound = lerp(c.mouthRound, mouthRoundTarget, delta * mouthSpeed * 0.7);
    c.jawDrop = lerp(c.jawDrop, jawDropTarget, delta * mouthSpeed);
    c.mouthCurve = lerp(c.mouthCurve, (targets.mouthCurve ?? 0) + mouthBreathCurve + mouthQuirkCurveAdd, delta * baseSpeed * 1.5);

    c.pupilSize = lerp(c.pupilSize, (targets.pupilSize ?? 1) + breathScale, delta * baseSpeed);

    c.headTiltX = lerp(
      c.headTiltX,
      (targets.headTiltX ?? 0) - gazeY * 0.18 + breathX + microOffset.current.headX + speechHeadNod + playfulBounce + proudHeadUp + confusedShakeX + sleepyHeadBob,
      delta * gazeSpeed * 0.7 * surprisedFreeze
    );
    // v3.9: Speaking gaze — 70% focus on user, 30% natural drift
    const speakingGazeScale = faceState === "speaking" ? 0.7 : 1.0;
    const speakingDriftScale = faceState === "speaking" ? 0.3 : 0;
    const speakingDriftX = speakingDriftScale * Math.sin(breathPhase.current * 2.1) * 0.06;
    const speakingDriftY = speakingDriftScale * Math.cos(breathPhase.current * 1.7) * 0.03;
    c.headTiltY = lerp(c.headTiltY, gazeX * 0.45 * speakingGazeScale + speakingDriftX, delta * gazeSpeed * 0.8 * surprisedFreeze);
    c.headTiltZ = lerp(
      c.headTiltZ,
      (targets.headTiltZ ?? 0) + microOffset.current.headZ + gazeX * 0.05 + curiousTiltZ + playfulTiltZ + confusedShakeZ,
      delta * gazeSpeed * 0.6 * surprisedFreeze
    );

    // Strong, fluid pupil tracking — eyes lock onto cursor position
    // v3.9: 70% focus / 30% drift during speaking
    c.pupilX = lerp(
      c.pupilX,
      gazeX * 0.32 * speakingGazeScale + thinkingPupilX + microOffset.current.pupilDrift + eyeDriftX + speakingDriftX,
      delta * pupilSpeed * 2.0
    );
    c.pupilY = lerp(
      c.pupilY,
      gazeY * 0.24 * speakingGazeScale + thinkingPupilY + breathY + eyeDriftY + speakingDriftY,
      delta * pupilSpeed * 2.0
    );

    c.glowIntensity = lerp(c.glowIntensity, targets.glowIntensity ?? 0.3, delta * baseSpeed * 0.6);
    c.cheekGlow = lerp(c.cheekGlow, (targets.cheekGlow ?? 0.1) + speechCheekBoost, delta * baseSpeed * 0.8);
    c.irisGlow = lerp(c.irisGlow, (targets.irisGlow ?? 0.4) * sparkleWave, delta * baseSpeed * 1.2);
    c.eyeSparkle = lerp(c.eyeSparkle, eyeDelayBuffer.current.sparkle, delta * baseSpeed);

    // v3.0: PERFORMANCE FAILSAFE — if frame takes >16ms, simplify next frame
    const frameTime = performance.now() - frameStart;
    if (frameTime > 16) {
      frameBudgetExceeded.current++;
      if (frameBudgetExceeded.current > 10) {
        // Too many slow frames: disable micro-expressions temporarily
        microOffset.current = { eyebrow: 0, headX: 0, headZ: 0, pupilDrift: 0, mouthQuirk: 0 };
      }
    } else {
      frameBudgetExceeded.current = Math.max(0, frameBudgetExceeded.current - 1);
    }

    return { ...c };
  }, [audioAmplitude, faceState, gazeRef, viseme, emotionIntensity, emotionDuringSpeech]);

  return { update, current };
}
