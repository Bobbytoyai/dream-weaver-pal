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
  | "reassuring";

interface FaceAnimationState {
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
}

const STATE_TARGETS: Record<FaceState, Partial<FaceAnimationState>> = {
  idle: {
    eyeOpenness: 1, eyebrowHeight: 0, eyebrowTilt: 0,
    mouthOpenness: 0, mouthWidth: 0.5, mouthCurve: 0.05, mouthRound: 0, jawDrop: 0,
    headTiltX: 0, headTiltZ: 0, glowIntensity: 0.3,
    pupilSize: 1, cheekGlow: 0.1,
  },
  listening: {
    eyeOpenness: 1.2, eyebrowHeight: 0.15, eyebrowTilt: 0,
    mouthOpenness: 0, mouthWidth: 0.45, mouthCurve: 0.08, mouthRound: 0, jawDrop: 0,
    headTiltX: 0.08, headTiltZ: 0.12, glowIntensity: 0.55,
    pupilSize: 1.15, cheekGlow: 0.15,
  },
  thinking: {
    eyeOpenness: 0.9, eyebrowHeight: 0.2, eyebrowTilt: 0.15,
    mouthOpenness: 0, mouthWidth: 0.38, mouthCurve: 0, mouthRound: 0, jawDrop: 0,
    headTiltX: -0.05, headTiltZ: -0.08, glowIntensity: 0.45,
    pupilSize: 0.9, cheekGlow: 0.08,
  },
  speaking: {
    eyeOpenness: 1.05, eyebrowHeight: 0.08, eyebrowTilt: 0,
    mouthWidth: 0.55, mouthCurve: 0.15, mouthRound: 0, jawDrop: 0,
    headTiltX: 0, headTiltZ: 0, glowIntensity: 0.6,
    pupilSize: 1.05, cheekGlow: 0.2,
  },
  happy: {
    eyeOpenness: 0.85, eyebrowHeight: 0.16, eyebrowTilt: 0,
    mouthOpenness: 0.2, mouthWidth: 0.78, mouthCurve: 0.5, mouthRound: 0, jawDrop: 0.1,
    headTiltX: 0.04, headTiltZ: 0, glowIntensity: 0.8,
    pupilSize: 1.2, cheekGlow: 0.6,
  },
  confused: {
    eyeOpenness: 1.15, eyebrowHeight: 0.1, eyebrowTilt: 0.25,
    mouthOpenness: 0.08, mouthWidth: 0.32, mouthCurve: -0.05, mouthRound: 0, jawDrop: 0,
    headTiltX: 0, headTiltZ: 0.18, glowIntensity: 0.35,
    pupilSize: 1.1, cheekGlow: 0.05,
  },
  excited: {
    eyeOpenness: 1.35, eyebrowHeight: 0.25, eyebrowTilt: 0,
    mouthOpenness: 0.25, mouthWidth: 0.72, mouthCurve: 0.4, mouthRound: 0, jawDrop: 0.15,
    headTiltX: 0, headTiltZ: 0, glowIntensity: 0.9,
    pupilSize: 1.35, cheekGlow: 0.5,
  },
  attentive: {
    eyeOpenness: 1.25, eyebrowHeight: 0.18, eyebrowTilt: 0,
    mouthOpenness: 0.1, mouthWidth: 0.6, mouthCurve: 0.2, mouthRound: 0, jawDrop: 0.05,
    headTiltX: 0.03, headTiltZ: 0.05, glowIntensity: 0.65,
    pupilSize: 1.2, cheekGlow: 0.3,
  },
  surprised: {
    eyeOpenness: 1.4, eyebrowHeight: 0.3, eyebrowTilt: 0,
    mouthOpenness: 0.35, mouthWidth: 0.5, mouthCurve: 0, mouthRound: 0.4, jawDrop: 0.3,
    headTiltX: 0, headTiltZ: 0, glowIntensity: 0.75,
    pupilSize: 1.4, cheekGlow: 0.2,
  },
  calm: {
    eyeOpenness: 0.92, eyebrowHeight: 0.02, eyebrowTilt: 0,
    mouthOpenness: 0, mouthWidth: 0.48, mouthCurve: 0.1, mouthRound: 0, jawDrop: 0,
    headTiltX: 0, headTiltZ: 0, glowIntensity: 0.25,
    pupilSize: 0.95, cheekGlow: 0.12,
  },
  reassuring: {
    eyeOpenness: 0.95, eyebrowHeight: 0.06, eyebrowTilt: 0,
    mouthOpenness: 0.05, mouthWidth: 0.6, mouthCurve: 0.25, mouthRound: 0, jawDrop: 0.03,
    headTiltX: 0.02, headTiltZ: 0.03, glowIntensity: 0.4,
    pupilSize: 1.1, cheekGlow: 0.25,
  },
};

const DEFAULT_STATE: FaceAnimationState = {
  eyeOpenness: 1, eyebrowHeight: 0, eyebrowTilt: 0,
  mouthOpenness: 0, mouthWidth: 0.5, mouthCurve: 0, mouthRound: 0, jawDrop: 0,
  headTiltX: 0, headTiltY: 0, headTiltZ: 0,
  pupilX: 0, pupilY: 0, pupilSize: 1,
  glowIntensity: 0.3, cheekGlow: 0.1,
};

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * Math.min(1, t);
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

/**
 * Expression engine with phoneme-based lip sync.
 * 
 * When speaking, mouth shape is driven by viseme data from frequency analysis:
 * - AA: wide open (a, o sounds)
 * - EE: wide spread (i, e sounds)  
 * - OO: rounded/pursed (ou, u sounds)
 * - FF: narrow opening (f, s, ch sounds)
 * - MM: nearly closed (m, n, b, p sounds)
 * - REST: closed (silence)
 */
export function useFaceAnimation(
  faceState: FaceState,
  gazeRef: React.MutableRefObject<{ x: number; y: number }>,
  audioAmplitude: number,
  viseme?: VisemeState
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

  const update = useCallback((delta: number) => {
    const c = current.current;
    const gaze = gazeRef.current;
    const gazeX = clamp(gaze.x, -1, 1);
    const gazeY = clamp(gaze.y, -1, 1);
    const targets = { ...DEFAULT_STATE, ...STATE_TARGETS[faceState] };

    if (faceState !== prevExpressionRef.current) {
      eventBus.emit({
        type: "EXPRESSION_CHANGED",
        expression: faceState,
        prev: prevExpressionRef.current,
      });
      prevExpressionRef.current = faceState;
    }

    const isCalm = faceState === "calm" || faceState === "reassuring";
    const speedMult = isCalm ? 0.6 : 1;
    const baseSpeed = 5 * speedMult;
    const gazeSpeed = 7 * speedMult;
    const pupilSpeed = 9;

    // --- BLINK ENGINE ---
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
        if (doubleBlinkChance.current > 0.8 && doubleBlinkChance.current < 0.99) {
          blinkPhase.current = 1;
          blinkTimer.current = 0;
          doubleBlinkChance.current = 1;
        } else {
          blinkPhase.current = 0;
          blinkTimer.current = 0;
          const exciteMod = faceState === "excited" || faceState === "attentive" ? 0.6 : 1;
          const calmMod = isCalm ? 1.3 : 1;
          nextBlink.current = (2 + Math.random() * 2.5) * exciteMod * calmMod;
        }
      }
    }

    // --- BREATHING ---
    breathPhase.current += delta * (isCalm ? 0.8 : 1.1);
    const breathX = Math.sin(breathPhase.current) * 0.01;
    const breathY = Math.cos(breathPhase.current * 0.7) * 0.006;
    const breathScale = Math.sin(breathPhase.current * 0.9) * 0.003;

    // --- MICRO-EXPRESSIONS ---
    microTimer.current += delta;
    if (microTimer.current > 1 + Math.random() * 2) {
      microTimer.current = 0;
      microOffset.current = {
        eyebrow: (Math.random() - 0.5) * 0.04,
        headX: (Math.random() - 0.5) * 0.02,
        headZ: (Math.random() - 0.5) * 0.03,
        pupilDrift: (Math.random() - 0.5) * 0.015,
        mouthQuirk: (Math.random() - 0.5) * 0.02,
      };
    }

    // --- THINKING: wandering pupils ---
    let thinkingPupilX = 0;
    let thinkingPupilY = 0;
    if (faceState === "thinking") {
      const t = breathPhase.current * 2;
      thinkingPupilX = Math.sin(t * 1.3) * 0.04;
      thinkingPupilY = Math.cos(t * 0.9) * 0.025;
    }

    // --- LIP SYNC (viseme-driven when speaking) ---
    let mouthOpenTarget: number;
    let mouthWidthTarget: number;
    let mouthRoundTarget: number;
    let jawDropTarget: number;

    if (faceState === "speaking" && viseme && viseme.amplitude > 0.01) {
      // Viseme-driven lip sync: use frequency-analyzed mouth shapes
      mouthOpenTarget = viseme.mouthOpenness;
      mouthWidthTarget = viseme.mouthWidth;
      mouthRoundTarget = viseme.mouthRound;
      jawDropTarget = viseme.jawDrop;

      // Add subtle micro-variation for naturalness
      const microVar = Math.sin(breathPhase.current * 8) * 0.03;
      mouthOpenTarget += microVar;
    } else if (faceState === "speaking") {
      // Fallback: amplitude-only (legacy behavior)
      mouthOpenTarget = Math.min(0.7, audioAmplitude * 3);
      mouthWidthTarget = targets.mouthWidth ?? 0.55;
      mouthRoundTarget = 0;
      jawDropTarget = audioAmplitude * 1.5;
    } else {
      // Non-speaking states use expression targets
      mouthOpenTarget = targets.mouthOpenness ?? 0;
      mouthWidthTarget = targets.mouthWidth ?? 0.5;
      mouthRoundTarget = targets.mouthRound ?? 0;
      jawDropTarget = targets.jawDrop ?? 0;
    }

    // --- LERP ALL VALUES ---
    // Mouth uses faster lerp for responsive lip sync
    const mouthSpeed = faceState === "speaking" ? baseSpeed * 5 : baseSpeed * 3;

    c.eyeOpenness = lerp(c.eyeOpenness, (targets.eyeOpenness ?? 1) * blinkMult, delta * baseSpeed * 2.5);
    c.eyebrowHeight = lerp(c.eyebrowHeight, (targets.eyebrowHeight ?? 0) + microOffset.current.eyebrow, delta * baseSpeed);
    c.eyebrowTilt = lerp(c.eyebrowTilt, targets.eyebrowTilt ?? 0, delta * baseSpeed);

    c.mouthOpenness = lerp(c.mouthOpenness, mouthOpenTarget, delta * mouthSpeed);
    c.mouthWidth = lerp(c.mouthWidth, mouthWidthTarget + microOffset.current.mouthQuirk, delta * mouthSpeed * 0.8);
    c.mouthRound = lerp(c.mouthRound, mouthRoundTarget, delta * mouthSpeed * 0.7);
    c.jawDrop = lerp(c.jawDrop, jawDropTarget, delta * mouthSpeed);
    c.mouthCurve = lerp(c.mouthCurve, targets.mouthCurve ?? 0, delta * baseSpeed * 1.5);

    c.pupilSize = lerp(c.pupilSize, (targets.pupilSize ?? 1) + breathScale, delta * baseSpeed);

    c.headTiltX = lerp(
      c.headTiltX,
      (targets.headTiltX ?? 0) - gazeY * 0.18 + breathX + microOffset.current.headX,
      delta * gazeSpeed * 0.7
    );
    c.headTiltY = lerp(c.headTiltY, gazeX * 0.45, delta * gazeSpeed * 0.8);
    c.headTiltZ = lerp(
      c.headTiltZ,
      (targets.headTiltZ ?? 0) + microOffset.current.headZ + gazeX * 0.05,
      delta * gazeSpeed * 0.6
    );

    c.pupilX = lerp(
      c.pupilX,
      gazeX * 0.08 + thinkingPupilX + microOffset.current.pupilDrift,
      delta * pupilSpeed
    );
    c.pupilY = lerp(
      c.pupilY,
      gazeY * 0.06 + thinkingPupilY + breathY,
      delta * pupilSpeed
    );

    c.glowIntensity = lerp(c.glowIntensity, targets.glowIntensity ?? 0.3, delta * baseSpeed * 0.6);
    c.cheekGlow = lerp(c.cheekGlow, targets.cheekGlow ?? 0.1, delta * baseSpeed * 0.8);

    return { ...c };
  }, [audioAmplitude, faceState, gazeRef, viseme]);

  return { update, current };
}
