import { useRef, useCallback } from "react";
import { eventBus } from "@/lib/eventBus";

export type FaceState =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "happy"
  | "confused"
  | "excited"
  | "attentive"   // Wake detected — looking at child
  | "surprised";  // Unexpected event

interface FaceAnimationState {
  eyeOpenness: number;
  eyebrowHeight: number;
  eyebrowTilt: number;
  mouthOpenness: number;
  mouthWidth: number;
  headTiltX: number;
  headTiltY: number;
  headTiltZ: number;
  pupilX: number;
  pupilY: number;
  glowIntensity: number;
}

/**
 * Expression targets — each state defines the "personality" of Bobby.
 * Mapped from spec section 6: MAPPING ÉTAT → EXPRESSION
 */
const STATE_TARGETS: Record<FaceState, Partial<FaceAnimationState>> = {
  // Neutre + micro mouvements
  idle: {
    eyeOpenness: 1, eyebrowHeight: 0, eyebrowTilt: 0,
    mouthOpenness: 0, mouthWidth: 0.5,
    headTiltX: 0, headTiltZ: 0, glowIntensity: 0.3,
  },
  // Attentif + léger tilt tête
  listening: {
    eyeOpenness: 1.15, eyebrowHeight: 0.12, eyebrowTilt: 0,
    mouthOpenness: 0, mouthWidth: 0.45,
    headTiltX: 0.06, headTiltZ: 0.1, glowIntensity: 0.55,
  },
  // Curieux + yeux mobiles
  thinking: {
    eyeOpenness: 0.88, eyebrowHeight: 0.18, eyebrowTilt: 0.12,
    mouthOpenness: 0, mouthWidth: 0.4,
    headTiltX: -0.04, headTiltZ: -0.06, glowIntensity: 0.45,
  },
  // Content + animation lèvres (lip sync via amplitude)
  speaking: {
    eyeOpenness: 1.05, eyebrowHeight: 0.06, eyebrowTilt: 0,
    mouthWidth: 0.55,
    headTiltX: 0, headTiltZ: 0, glowIntensity: 0.6,
  },
  // Content — sourire large
  happy: {
    eyeOpenness: 0.88, eyebrowHeight: 0.14, eyebrowTilt: 0,
    mouthOpenness: 0.18, mouthWidth: 0.72,
    headTiltX: 0.03, headTiltZ: 0, glowIntensity: 0.75,
  },
  // Confused
  confused: {
    eyeOpenness: 1.12, eyebrowHeight: 0.1, eyebrowTilt: 0.22,
    mouthOpenness: 0.06, mouthWidth: 0.35,
    headTiltX: 0, headTiltZ: 0.14, glowIntensity: 0.35,
  },
  // Excité — yeux grands
  excited: {
    eyeOpenness: 1.28, eyebrowHeight: 0.22, eyebrowTilt: 0,
    mouthOpenness: 0.22, mouthWidth: 0.68,
    headTiltX: 0, headTiltZ: 0, glowIntensity: 0.85,
  },
  // Wake detected → attentif + regard direct + léger sourire
  attentive: {
    eyeOpenness: 1.2, eyebrowHeight: 0.15, eyebrowTilt: 0,
    mouthOpenness: 0.08, mouthWidth: 0.6,
    headTiltX: 0.02, headTiltZ: 0.04, glowIntensity: 0.65,
  },
  // Surpris
  surprised: {
    eyeOpenness: 1.35, eyebrowHeight: 0.25, eyebrowTilt: 0,
    mouthOpenness: 0.3, mouthWidth: 0.5,
    headTiltX: 0, headTiltZ: 0, glowIntensity: 0.7,
  },
};

const DEFAULT_STATE: FaceAnimationState = {
  eyeOpenness: 1, eyebrowHeight: 0, eyebrowTilt: 0,
  mouthOpenness: 0, mouthWidth: 0.5,
  headTiltX: 0, headTiltY: 0, headTiltZ: 0,
  pupilX: 0, pupilY: 0, glowIntensity: 0.3,
};

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * Math.min(1, t);
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

/**
 * Expression engine.
 *
 * - Reads gazeRef.current EVERY FRAME (not at render time)
 * - Natural micro-animations: blink, breathe, micro-expressions
 * - Smooth interpolation (no jerky transitions)
 * - Emits EXPRESSION_CHANGED on state transitions
 */
export function useFaceAnimation(
  faceState: FaceState,
  gazeRef: React.MutableRefObject<{ x: number; y: number }>,
  audioAmplitude: number
) {
  const current = useRef<FaceAnimationState>({ ...DEFAULT_STATE });
  const blinkTimer = useRef(0);
  const blinkPhase = useRef(0); // 0=open, 1=closing, 2=opening
  const nextBlink = useRef(2 + Math.random() * 3);
  const breathPhase = useRef(0);
  const microTimer = useRef(0);
  const microOffset = useRef({ eyebrow: 0, headX: 0, headZ: 0, pupilDrift: 0 });
  const prevExpressionRef = useRef<FaceState>("idle");

  const update = useCallback((delta: number) => {
    const c = current.current;
    const gaze = gazeRef.current;
    const gazeX = clamp(gaze.x, -1, 1);
    const gazeY = clamp(gaze.y, -1, 1);
    const targets = { ...DEFAULT_STATE, ...STATE_TARGETS[faceState] };

    // Emit EXPRESSION_CHANGED on state transitions
    if (faceState !== prevExpressionRef.current) {
      eventBus.emit({
        type: "EXPRESSION_CHANGED",
        expression: faceState,
        prev: prevExpressionRef.current,
      });
      prevExpressionRef.current = faceState;
    }

    // --- Speed factors ---
    // Fast for responsiveness (< 300ms feel), smooth for naturalness
    const baseSpeed = 6;
    const gazeSpeed = 8;
    const pupilSpeed = 10;

    // --- BLINK ENGINE (section 7: clignement aléatoire) ---
    blinkTimer.current += delta;
    if (blinkPhase.current === 0 && blinkTimer.current >= nextBlink.current) {
      blinkPhase.current = 1;
      blinkTimer.current = 0;
    }

    let blinkMult = 1;
    if (blinkPhase.current === 1) {
      // Close fast
      blinkMult = Math.max(0, 1 - blinkTimer.current * 14);
      if (blinkMult <= 0.03) {
        blinkPhase.current = 2;
        blinkTimer.current = 0;
      }
    } else if (blinkPhase.current === 2) {
      // Open slower
      blinkMult = Math.min(1, blinkTimer.current * 7);
      if (blinkMult >= 0.95) {
        blinkPhase.current = 0;
        blinkTimer.current = 0;
        // Randomize next blink: 2-5s, more frequent when excited
        const exciteMod = faceState === "excited" || faceState === "attentive" ? 0.5 : 1;
        nextBlink.current = (1.8 + Math.random() * 3.5) * exciteMod;
      }
    }

    // --- BREATHING (section 7: respiration légère) ---
    breathPhase.current += delta * 1.1;
    const breathX = Math.sin(breathPhase.current) * 0.008;
    const breathY = Math.cos(breathPhase.current * 0.7) * 0.005;

    // --- MICRO-EXPRESSIONS (section 7: micro mouvements) ---
    microTimer.current += delta;
    if (microTimer.current > 1.2 + Math.random() * 2.5) {
      microTimer.current = 0;
      microOffset.current = {
        eyebrow: (Math.random() - 0.5) * 0.035,
        headX: (Math.random() - 0.5) * 0.018,
        headZ: (Math.random() - 0.5) * 0.025,
        pupilDrift: (Math.random() - 0.5) * 0.01,
      };
    }

    // --- THINKING: add wandering pupil movement ---
    let thinkingPupilX = 0;
    let thinkingPupilY = 0;
    if (faceState === "thinking") {
      const t = breathPhase.current * 2;
      thinkingPupilX = Math.sin(t * 1.3) * 0.03;
      thinkingPupilY = Math.cos(t * 0.9) * 0.02;
    }

    // --- LIP SYNC ---
    const mouthTarget = faceState === "speaking"
      ? Math.min(0.65, audioAmplitude * 2.8)
      : targets.mouthOpenness;

    // --- LERP ALL VALUES ---
    c.eyeOpenness = lerp(c.eyeOpenness, targets.eyeOpenness * blinkMult, delta * baseSpeed * 2.5);
    c.eyebrowHeight = lerp(c.eyebrowHeight, targets.eyebrowHeight + microOffset.current.eyebrow, delta * baseSpeed);
    c.eyebrowTilt = lerp(c.eyebrowTilt, targets.eyebrowTilt, delta * baseSpeed);
    c.mouthOpenness = lerp(c.mouthOpenness, mouthTarget, delta * baseSpeed * 3.5);
    c.mouthWidth = lerp(c.mouthWidth, targets.mouthWidth, delta * baseSpeed);

    // Head follows gaze (full amplitude, smooth)
    c.headTiltX = lerp(
      c.headTiltX,
      targets.headTiltX - gazeY * 0.2 + breathX + microOffset.current.headX,
      delta * gazeSpeed * 0.7
    );
    c.headTiltY = lerp(c.headTiltY, gazeX * 0.5, delta * gazeSpeed * 0.8);
    c.headTiltZ = lerp(
      c.headTiltZ,
      targets.headTiltZ + microOffset.current.headZ + gazeX * 0.06,
      delta * gazeSpeed * 0.6
    );

    // Pupils track gaze (fast, visible range)
    c.pupilX = lerp(
      c.pupilX,
      gazeX * 0.07 + thinkingPupilX + microOffset.current.pupilDrift,
      delta * pupilSpeed
    );
    c.pupilY = lerp(
      c.pupilY,
      gazeY * 0.05 + thinkingPupilY + breathY,
      delta * pupilSpeed
    );

    c.glowIntensity = lerp(c.glowIntensity, targets.glowIntensity, delta * baseSpeed * 0.6);

    return { ...c };
  }, [audioAmplitude, faceState, gazeRef]);

  return { update, current };
}
