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
    mouthOpenness: 0, mouthWidth: 0.52, mouthCurve: 0.08, mouthRound: 0, jawDrop: 0,
    headTiltX: 0, headTiltZ: 0, glowIntensity: 0.35,
    pupilSize: 1, cheekGlow: 0.15, irisGlow: 0.45, eyeSparkle: 0.55,
  },
  listening: {
    eyeOpenness: 1.35, eyebrowHeight: 0.25, eyebrowTilt: 0,
    mouthOpenness: 0, mouthWidth: 0.48, mouthCurve: 0.22, mouthRound: 0, jawDrop: 0,
    headTiltX: 0.12, headTiltZ: 0.18, glowIntensity: 0.7,
    pupilSize: 1.3, cheekGlow: 0.3, irisGlow: 0.75, eyeSparkle: 0.85,
  },
  thinking: {
    eyeOpenness: 0.75, eyebrowHeight: 0.35, eyebrowTilt: 0.25,
    mouthOpenness: 0, mouthWidth: 0.32, mouthCurve: 0.02, mouthRound: 0, jawDrop: 0,
    headTiltX: -0.1, headTiltZ: -0.15, glowIntensity: 0.5,
    pupilSize: 0.8, cheekGlow: 0.08, irisGlow: 0.55, eyeSparkle: 0.35,
  },
  speaking: {
    eyeOpenness: 1.1, eyebrowHeight: 0.12, eyebrowTilt: 0,
    mouthWidth: 0.6, mouthCurve: 0.2, mouthRound: 0, jawDrop: 0,
    headTiltX: 0, headTiltZ: 0, glowIntensity: 0.7,
    pupilSize: 1.1, cheekGlow: 0.35, irisGlow: 0.65, eyeSparkle: 0.7,
  },
  happy: {
    eyeOpenness: 0.7, eyebrowHeight: 0.28, eyebrowTilt: 0,
    mouthOpenness: 0.1, mouthWidth: 0.85, mouthCurve: 0.7, mouthRound: 0, jawDrop: 0.05,
    headTiltX: 0.06, headTiltZ: 0, glowIntensity: 1.0,
    pupilSize: 1.4, cheekGlow: 0.85, irisGlow: 0.95, eyeSparkle: 1.0,
  },
  confused: {
    eyeOpenness: 1.3, eyebrowHeight: 0.15, eyebrowTilt: 0.4,
    mouthOpenness: 0, mouthWidth: 0.28, mouthCurve: -0.2, mouthRound: 0.1, jawDrop: 0,
    headTiltX: 0, headTiltZ: 0.28, glowIntensity: 0.35,
    pupilSize: 1.15, cheekGlow: 0.05, irisGlow: 0.45, eyeSparkle: 0.35,
  },
  excited: {
    eyeOpenness: 1.5, eyebrowHeight: 0.45, eyebrowTilt: 0,
    mouthOpenness: 0.35, mouthWidth: 0.85, mouthCurve: 0.6, mouthRound: 0.1, jawDrop: 0.3,
    headTiltX: 0, headTiltZ: 0, glowIntensity: 1.0,
    pupilSize: 1.5, cheekGlow: 0.8, irisGlow: 1.0, eyeSparkle: 1.0,
  },
  attentive: {
    eyeOpenness: 1.4, eyebrowHeight: 0.3, eyebrowTilt: 0,
    mouthOpenness: 0, mouthWidth: 0.55, mouthCurve: 0.25, mouthRound: 0, jawDrop: 0,
    headTiltX: 0.05, headTiltZ: 0.08, glowIntensity: 0.8,
    pupilSize: 1.35, cheekGlow: 0.45, irisGlow: 0.85, eyeSparkle: 0.9,
  },
  surprised: {
    eyeOpenness: 1.6, eyebrowHeight: 0.5, eyebrowTilt: 0,
    mouthOpenness: 0.5, mouthWidth: 0.35, mouthCurve: 0, mouthRound: 0.7, jawDrop: 0.5,
    headTiltX: 0, headTiltZ: 0, glowIntensity: 0.85,
    pupilSize: 1.6, cheekGlow: 0.25, irisGlow: 0.95, eyeSparkle: 1.0,
  },
  calm: {
    eyeOpenness: 0.85, eyebrowHeight: 0.02, eyebrowTilt: 0,
    mouthOpenness: 0, mouthWidth: 0.5, mouthCurve: 0.18, mouthRound: 0, jawDrop: 0,
    headTiltX: 0, headTiltZ: 0, glowIntensity: 0.25,
    pupilSize: 0.9, cheekGlow: 0.18, irisGlow: 0.35, eyeSparkle: 0.3,
  },
  reassuring: {
    eyeOpenness: 0.9, eyebrowHeight: 0.08, eyebrowTilt: 0,
    mouthOpenness: 0, mouthWidth: 0.65, mouthCurve: 0.45, mouthRound: 0, jawDrop: 0,
    headTiltX: 0.04, headTiltZ: 0.05, glowIntensity: 0.5,
    pupilSize: 1.15, cheekGlow: 0.4, irisGlow: 0.6, eyeSparkle: 0.7,
  },
  sad: {
    eyeOpenness: 0.6, eyebrowHeight: -0.12, eyebrowTilt: -0.35,
    mouthOpenness: 0, mouthWidth: 0.35, mouthCurve: -0.4, mouthRound: 0, jawDrop: 0,
    headTiltX: -0.1, headTiltZ: -0.08, glowIntensity: 0.15,
    pupilSize: 0.75, cheekGlow: 0.03, irisGlow: 0.2, eyeSparkle: 0.15,
  },
  sleepy: {
    eyeOpenness: 0.1, eyebrowHeight: -0.2, eyebrowTilt: 0,
    mouthOpenness: 0, mouthWidth: 0.35, mouthCurve: 0.08, mouthRound: 0, jawDrop: 0,
    headTiltX: -0.12, headTiltZ: 0.15, glowIntensity: 0.06,
    pupilSize: 0.4, cheekGlow: 0.06, irisGlow: 0.08, eyeSparkle: 0.08,
  },
  curious: {
    eyeOpenness: 1.45, eyebrowHeight: 0.35, eyebrowTilt: 0.15,
    mouthOpenness: 0, mouthWidth: 0.48, mouthCurve: 0.2, mouthRound: 0, jawDrop: 0,
    headTiltX: 0.1, headTiltZ: 0.22, glowIntensity: 0.75,
    pupilSize: 1.4, cheekGlow: 0.3, irisGlow: 0.85, eyeSparkle: 0.95,
  },
  playful: {
    eyeOpenness: 1.2, eyebrowHeight: 0.3, eyebrowTilt: 0.18,
    mouthOpenness: 0.2, mouthWidth: 0.8, mouthCurve: 0.55, mouthRound: 0, jawDrop: 0.1,
    headTiltX: 0.08, headTiltZ: 0.18, glowIntensity: 0.9,
    pupilSize: 1.35, cheekGlow: 0.65, irisGlow: 0.85, eyeSparkle: 1.0,
  },
  proud: {
    eyeOpenness: 1.05, eyebrowHeight: 0.18, eyebrowTilt: 0,
    mouthOpenness: 0, mouthWidth: 0.7, mouthCurve: 0.5, mouthRound: 0, jawDrop: 0,
    headTiltX: -0.1, headTiltZ: 0, glowIntensity: 0.85,
    pupilSize: 1.2, cheekGlow: 0.55, irisGlow: 0.8, eyeSparkle: 0.9,
  },
};

const DEFAULT_STATE: FaceAnimationState = {
  eyeOpenness: 1, eyebrowHeight: 0, eyebrowTilt: 0,
  mouthOpenness: 0, mouthWidth: 0.5, mouthCurve: 0, mouthRound: 0, jawDrop: 0,
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
  /** New modular expression override — takes priority over STATE_TARGETS */
  expressionOverride?: ExpressionCombo,
  expressionIntensityLevel?: number,
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
    // Use modular expression override if provided, else fall back to STATE_TARGETS
    const rawTargets = expressionOverride
      ? { ...DEFAULT_STATE, ...resolveExpression(expressionOverride, expressionIntensityLevel ?? 3) }
      : { ...DEFAULT_STATE, ...STATE_TARGETS[faceState] };
    
    // Apply oscillations from animation preset if using modular expression
    if (expressionOverride) {
      const animPreset = ANIMATIONS[expressionOverride.animation];
      if (animPreset?.oscillation) {
        for (const osc of animPreset.oscillation) {
          const wave = Math.sin(breathPhase.current * osc.frequency * Math.PI * 2) * osc.amplitude;
          (rawTargets as any)[osc.property] = ((rawTargets as any)[osc.property] ?? 0) + wave;
        }
      }
    }

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
    const closeDuration = 0.12; // 120ms to close (smooth, visible descent)
    const holdDuration = 0.06;  // 60ms held shut (slightly longer hold)
    const openDuration = 0.22;  // 220ms to open (slow, natural rise)

    if (blinkPhase.current === 1) {
      // Closing — smooth ease-in
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
      // Opening — slow ease-out (decelerate gently)
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
          nextBlink.current = (3.5 + Math.random() * 4) * exciteMod * calmMod * sleepyMod;
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

    // --- MICRO-EXPRESSIONS (every 1.5-3s, more exaggerated) ---
    microTimer.current += delta;
    if (microTimer.current > 1.5 + Math.random() * 1.5) {
      microTimer.current = 0;
      microOffset.current = {
        eyebrow: (Math.random() - 0.5) * 0.06,
        headX: (Math.random() - 0.5) * 0.025,
        headZ: (Math.random() - 0.5) * 0.035,
        pupilDrift: (Math.random() - 0.5) * 0.02,
        mouthQuirk: (Math.random() - 0.5) * 0.025,
      };
    }

    // --- THINKING: dramatic wandering pupils ---
    let thinkingPupilX = 0;
    let thinkingPupilY = 0;
    if (faceState === "thinking") {
      const t = breathPhase.current * 2;
      thinkingPupilX = Math.sin(t * 1.3) * 0.08;
      thinkingPupilY = Math.cos(t * 0.9) * 0.06;
    }

    // --- CURIOUS: exaggerated head tilt oscillation ---
    let curiousTiltZ = 0;
    if (faceState === "curious") {
      curiousTiltZ = Math.sin(breathPhase.current * 1.5) * 0.06;
    }

    // --- LISTENING: subtle eyebrow micro-movements (attentive, alive) ---
    let listeningEyebrowPulse = 0;
    if (faceState === "listening") {
      const listenT = breathPhase.current * 1.8;
      // Gentle asymmetric raise — one brow slightly higher, alternating
      listeningEyebrowPulse = Math.sin(listenT) * 0.04 + Math.sin(listenT * 2.5) * 0.02;
    }

    // --- SLEEPY: eyes nearly closed with drowsy flutter, ready to wake ---
    let sleepyEyeWobble = 0;
    let sleepyHeadBob = 0;
    if (faceState === "sleepy") {
      const sleepT = breathPhase.current * 0.4;
      // Eyes mostly closed but slightly open (drowsy) with gentle flutter
      const baseClose = -0.75; // not fully shut — slight gap
      const flutter = Math.sin(sleepT) * 0.06 + Math.sin(sleepT * 2.3) * 0.03; // organic flutter
      sleepyEyeWobble = baseClose + flutter; // oscillates between -0.84 and -0.66
      sleepyHeadBob = Math.sin(sleepT) * 0.03; // slow nod
    }

    // --- CONFUSED: dramatic micro head shake ---
    let confusedShakeX = 0;
    let confusedShakeZ = 0;
    if (faceState === "confused") {
      const shakeT = breathPhase.current * 8;
      confusedShakeX = Math.sin(shakeT) * 0.035 * intensity;
      confusedShakeZ = Math.sin(shakeT * 1.3) * 0.04 * intensity;
    }

    // --- SURPRISED: freeze 200ms then resume ---
    let surprisedFreeze = 1;
    if (faceState === "surprised" && prevExpressionRef.current !== "surprised") {
      // Just transitioned: apply freeze effect via slower lerp
      surprisedFreeze = 0.15; // dramatically slow lerp for 200ms effect
    }

    // --- PLAYFUL: exaggerated bounce + tilt ---
    let playfulBounce = 0;
    let playfulTiltZ = 0;
    if (faceState === "playful") {
      playfulBounce = Math.abs(Math.sin(breathPhase.current * 3)) * 0.08 * intensity;
      playfulTiltZ = Math.sin(breathPhase.current * 2) * 0.1;
    }

    // --- PROUD: dramatic head-up ---
    let proudHeadUp = 0;
    if (faceState === "proud") {
      proudHeadUp = -0.08 * intensity;
    }

    // --- IDLE MOUTH ANIMATION (natural, like breathing through mouth) ---
    mouthIdlePhase.current += delta * 1.2;
    // Breathing-linked mouth movement (amplified)
    const mouthBreath = Math.sin(mouthIdlePhase.current) * 0.035 + Math.sin(mouthIdlePhase.current * 2.3) * 0.02;
    const mouthBreathCurve = Math.abs(Math.sin(mouthIdlePhase.current * 0.7)) * 0.03; // always >= 0, never frown
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
        if (quirkType < 0.45) {
          mouthQuirkTarget.current = { curve: 0.12 + Math.random() * 0.05, width: 0.04, open: 0 };
        } else if (quirkType < 0.75) {
          mouthQuirkTarget.current = { curve: 0.04, width: 0.03, open: 0 };
        } else if (quirkType < 0.92) {
          mouthQuirkTarget.current = { curve: 0.08, width: 0.02, open: 0 };
        } else {
          mouthQuirkTarget.current = { curve: 0.03, width: 0.015, open: 0 };
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
      // Classic stretch lip sync: pronounced openness/width, controlled roundness
      const exaggeration = 3.1;
      mouthOpenTarget = Math.min(0.95, viseme.mouthOpenness * exaggeration + 0.08);
      mouthWidthTarget = Math.min(0.92, viseme.mouthWidth * 1.55);
      mouthRoundTarget = Math.min(0.28, viseme.mouthRound * 1.1);
      jawDropTarget = Math.min(0.75, viseme.jawDrop * 2.9);

      const microVar = Math.sin(breathPhase.current * 10) * 0.04 + Math.sin(breathPhase.current * 6.8) * 0.02;
      mouthOpenTarget += microVar;

      if (mouthOpenTarget > 0.24) {
        mouthWidthTarget *= 0.92;
      }
      if (mouthWidthTarget > 0.72) {
        mouthOpenTarget *= 0.92;
      }

      const amp = viseme.amplitude;
      speechEyebrowLift = amp > 0.1 ? (amp - 0.1) * 0.35 : 0;
      speechEyeWiden = amp > 0.08 ? (amp - 0.08) * 0.14 : 0;
      speechHeadNod = Math.sin(breathPhase.current * 4.2) * amp * 0.04;
      speechCheekBoost = mouthWidthTarget > 0.52 ? (mouthWidthTarget - 0.52) * 0.35 : 0;

    } else if (faceState === "speaking") {
      const rawAmp = (viseme?.amplitude ?? 0) > 0.005 ? viseme!.amplitude : audioAmplitude;
      const ampFactor = Math.min(0.9, rawAmp * 5.8 + 0.1);
      mouthOpenTarget = ampFactor;
      mouthWidthTarget = Math.min(0.88, (targets.mouthWidth ?? 0.55) + rawAmp * 0.24);
      mouthRoundTarget = rawAmp > 0.2 ? 0.16 : rawAmp * 0.22;
      jawDropTarget = Math.min(0.7, rawAmp * 2.6);

      const syllableOsc = Math.sin(breathPhase.current * 12) * 0.05 * rawAmp;
      mouthOpenTarget += syllableOsc;

      if (rawAmp < 0.01) {
        // No audio — close mouth quickly, don't animate idle mouth movements
        mouthOpenTarget = 0;
        mouthWidthTarget = targets.mouthWidth ?? 0.5;
        mouthRoundTarget = 0;
        jawDropTarget = 0;
      }

      speechEyebrowLift = rawAmp > 0.1 ? (rawAmp - 0.1) * 0.3 : 0;
      speechEyeWiden = rawAmp > 0.08 ? (rawAmp - 0.08) * 0.12 : 0;
      speechHeadNod = Math.sin(breathPhase.current * 4.5) * Math.max(rawAmp, 0.05) * 0.035;
      speechCheekBoost = rawAmp > 0.15 ? rawAmp * 0.16 : 0;
    } else {
      // Non-speaking: mouth stays CLOSED. Breath affects only curve (smile), NOT openness.
      mouthOpenTarget = 0;
      mouthWidthTarget = (targets.mouthWidth ?? 0.5) + mouthBreathWidth + mouthQuirkWidthAdd;
      mouthRoundTarget = 0;
      jawDropTarget = 0;
    }

    // --- LERP ALL VALUES ---
    const mouthSpeed = faceState === "speaking" ? baseSpeed * 12 : baseSpeed * 1.8;

    // v3.0: EYEBROW ANTICIPATION — eyebrows lead speech by ~50ms
    const eyebrowTarget = (targets.eyebrowHeight ?? 0) + microOffset.current.eyebrow + speechEyebrowLift + listeningEyebrowPulse;
    const anticipatedEyebrow = eyebrowTarget + (eyebrowTarget - eyebrowAnticipationBuffer.current) * 0.2;
    eyebrowAnticipationBuffer.current = eyebrowTarget;
    c.eyebrowHeight = lerp(c.eyebrowHeight, anticipatedEyebrow, delta * (faceState === "speaking" ? baseSpeed * 3 : baseSpeed * 0.9));
    c.eyebrowTilt = lerp(c.eyebrowTilt, targets.eyebrowTilt ?? 0, delta * baseSpeed * 0.9);

    // v3.0: EYE DELAY — eyes follow with +100ms natural delay
    eyeDelayTimer.current += delta;
    const eyeTargetOpenness = ((targets.eyeOpenness ?? 1) + sleepyEyeWobble + speechEyeWiden) * blinkMult;
    const eyeTargetSparkle = (targets.eyeSparkle ?? 0.5) * (0.7 + sparkleWave * 0.3);
    if (eyeDelayTimer.current > 0.1) {
      eyeDelayBuffer.current.openness = eyeTargetOpenness;
      eyeDelayBuffer.current.sparkle = eyeTargetSparkle;
      eyeDelayTimer.current = 0;
    }
    c.eyeOpenness = lerp(c.eyeOpenness, eyeDelayBuffer.current.openness, delta * (faceState === "speaking" ? baseSpeed * 2.2 : baseSpeed * 1.6));

    // Mouth — fluid classic stretch sync
    c.mouthOpenness = lerp(c.mouthOpenness, mouthOpenTarget, delta * mouthSpeed);
    c.mouthWidth = lerp(c.mouthWidth, mouthWidthTarget + microOffset.current.mouthQuirk, delta * mouthSpeed * 0.72);
    c.mouthRound = lerp(c.mouthRound, mouthRoundTarget, delta * mouthSpeed * 0.45);
    c.jawDrop = lerp(c.jawDrop, jawDropTarget, delta * mouthSpeed * 0.9);
    c.mouthCurve = lerp(c.mouthCurve, (targets.mouthCurve ?? 0) + mouthBreathCurve + mouthQuirkCurveAdd, delta * baseSpeed);

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
  }, [audioAmplitude, faceState, gazeRef, viseme, emotionIntensity, emotionDuringSpeech, expressionOverride, expressionIntensityLevel]);

  return { update, current };
}
