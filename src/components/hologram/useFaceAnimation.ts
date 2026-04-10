import { useRef, useMemo, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export type FaceState = "idle" | "listening" | "thinking" | "speaking" | "happy" | "confused" | "excited";

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

const STATE_TARGETS: Record<FaceState, Partial<FaceAnimationState>> = {
  idle: { eyeOpenness: 1, eyebrowHeight: 0, eyebrowTilt: 0, mouthOpenness: 0, mouthWidth: 0.5, headTiltX: 0, headTiltZ: 0, glowIntensity: 0.3 },
  listening: { eyeOpenness: 1.15, eyebrowHeight: 0.1, eyebrowTilt: 0, mouthOpenness: 0, mouthWidth: 0.45, headTiltX: 0.05, headTiltZ: 0.08, glowIntensity: 0.5 },
  thinking: { eyeOpenness: 0.85, eyebrowHeight: 0.15, eyebrowTilt: 0.1, mouthOpenness: 0, mouthWidth: 0.4, headTiltX: -0.03, headTiltZ: -0.05, glowIntensity: 0.4 },
  speaking: { eyeOpenness: 1.05, eyebrowHeight: 0.05, eyebrowTilt: 0, mouthWidth: 0.55, headTiltX: 0, headTiltZ: 0, glowIntensity: 0.6 },
  happy: { eyeOpenness: 0.9, eyebrowHeight: 0.12, eyebrowTilt: 0, mouthOpenness: 0.15, mouthWidth: 0.7, headTiltX: 0.02, headTiltZ: 0, glowIntensity: 0.7 },
  confused: { eyeOpenness: 1.1, eyebrowHeight: 0.08, eyebrowTilt: 0.2, mouthOpenness: 0.05, mouthWidth: 0.35, headTiltX: 0, headTiltZ: 0.12, glowIntensity: 0.35 },
  excited: { eyeOpenness: 1.25, eyebrowHeight: 0.2, eyebrowTilt: 0, mouthOpenness: 0.2, mouthWidth: 0.65, headTiltX: 0, headTiltZ: 0, glowIntensity: 0.8 },
};

const DEFAULT_STATE: FaceAnimationState = {
  eyeOpenness: 1, eyebrowHeight: 0, eyebrowTilt: 0,
  mouthOpenness: 0, mouthWidth: 0.5,
  headTiltX: 0, headTiltY: 0, headTiltZ: 0,
  pupilX: 0, pupilY: 0, glowIntensity: 0.3,
};

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

export function useFaceAnimation(faceState: FaceState, gazeTarget: { x: number; y: number }, audioAmplitude: number) {
  const current = useRef<FaceAnimationState>({ ...DEFAULT_STATE });
  const blinkTimer = useRef(0);
  const blinkState = useRef(0); // 0 = open, 1 = closing, 2 = opening
  const nextBlink = useRef(2 + Math.random() * 3);
  const breathPhase = useRef(0);
  const microTimer = useRef(0);
  const microOffset = useRef({ eyebrow: 0, headX: 0, headZ: 0 });

  const update = useCallback((delta: number) => {
    const c = current.current;
    const targets = { ...DEFAULT_STATE, ...STATE_TARGETS[faceState] };
    const speed = 4;

    // Blinking
    blinkTimer.current += delta;
    if (blinkState.current === 0 && blinkTimer.current >= nextBlink.current) {
      blinkState.current = 1;
      blinkTimer.current = 0;
    }
    let blinkMult = 1;
    if (blinkState.current === 1) {
      blinkMult = Math.max(0, 1 - blinkTimer.current * 12);
      if (blinkMult <= 0.05) { blinkState.current = 2; blinkTimer.current = 0; }
    } else if (blinkState.current === 2) {
      blinkMult = Math.min(1, blinkTimer.current * 8);
      if (blinkMult >= 0.95) {
        blinkState.current = 0;
        blinkTimer.current = 0;
        nextBlink.current = 2 + Math.random() * 4;
      }
    }

    // Breathing
    breathPhase.current += delta * 1.2;
    const breathOffset = Math.sin(breathPhase.current) * 0.01;

    // Micro-expressions (subtle random movements)
    microTimer.current += delta;
    if (microTimer.current > 1.5 + Math.random() * 2) {
      microTimer.current = 0;
      microOffset.current = {
        eyebrow: (Math.random() - 0.5) * 0.04,
        headX: (Math.random() - 0.5) * 0.02,
        headZ: (Math.random() - 0.5) * 0.03,
      };
    }

    // Lip sync from audio amplitude
    const mouthTarget = faceState === "speaking" ? Math.min(0.6, audioAmplitude * 2.5) : targets.mouthOpenness;

    // Lerp all values
    c.eyeOpenness = lerp(c.eyeOpenness, targets.eyeOpenness * blinkMult, delta * speed * 2);
    c.eyebrowHeight = lerp(c.eyebrowHeight, targets.eyebrowHeight + microOffset.current.eyebrow, delta * speed);
    c.eyebrowTilt = lerp(c.eyebrowTilt, targets.eyebrowTilt, delta * speed);
    c.mouthOpenness = lerp(c.mouthOpenness, mouthTarget, delta * speed * 3);
    c.mouthWidth = lerp(c.mouthWidth, targets.mouthWidth, delta * speed);
    c.headTiltX = lerp(c.headTiltX, targets.headTiltX + breathOffset + microOffset.current.headX, delta * speed * 0.8);
    c.headTiltY = lerp(c.headTiltY, gazeTarget.x * 0.3, delta * speed * 0.5);
    c.headTiltZ = lerp(c.headTiltZ, targets.headTiltZ + microOffset.current.headZ, delta * speed * 0.8);
    c.pupilX = lerp(c.pupilX, gazeTarget.x * 0.12, delta * speed);
    c.pupilY = lerp(c.pupilY, gazeTarget.y * 0.08, delta * speed);
    c.glowIntensity = lerp(c.glowIntensity, targets.glowIntensity, delta * speed * 0.5);

    return { ...c };
  }, [faceState, gazeTarget, audioAmplitude]);

  return { update, current };
}
