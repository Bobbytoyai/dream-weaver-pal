import { Suspense, useRef, useCallback, useState, useEffect, useMemo, memo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { FaceMesh } from "./FaceMesh";
import { HologramParticles, ScanRing } from "./HologramEffects";
import { useGazeTracker } from "./useGazeTracker";
import { useAudioAmplitude, type VisemeState } from "./useAudioAmplitude";
import { FaceState } from "./useFaceAnimation";
import type { ExpressionCombo } from "@/lib/bobby/expressionLibrary";
import { eventBus } from "@/lib/eventBus";
// Audio connector managed externally

interface BobbyColors {
  iris: string;
  cheek: string;
  eyebrow: string;
  background: string;
}

interface HologramFaceProps {
  voiceState: "idle" | "listening" | "processing" | "speaking" | "interrupted" | "session_end";
  enableCamera?: boolean;
  onTripleTap?: () => void;
  emotionOverride?: FaceState;
  emotionIntensity?: number;
  bobbyColor?: string;
  bobbyColors?: BobbyColors;
  expressionOverride?: ExpressionCombo;
  expressionIntensityLevel?: number;
}

function mapToFaceState(voiceState: HologramFaceProps["voiceState"]): FaceState {
  switch (voiceState) {
    case "listening": return "listening";
    case "processing": return "thinking";
    case "speaking": return "speaking";
    case "interrupted": return "confused";
    case "session_end": return "calm";
    default: return "idle";
  }
}

export function HologramFace({
  voiceState,
  enableCamera = false,
  onTripleTap,
  emotionOverride,
  emotionIntensity = 0.7,
  bobbyColor,
  bobbyColors,
  expressionOverride,
  expressionIntensityLevel,
}: HologramFaceProps) {
  const { gazeRef, cameraActive } = useGazeTracker(enableCamera);
  const { connectAudio, getAmplitude, getViseme } = useAudioAmplitude();
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<number>(0);
  const [wakeFlash, setWakeFlash] = useState(false);
  // Audio connector is now managed by VoiceScreen
  useEffect(() => {
    const unsub = eventBus.on("WAKE_DETECTED", () => {
      setWakeFlash(true);
      setTimeout(() => setWakeFlash(false), 700);
    });
    return unsub;
  }, []);
  const handleTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now();
    if (now - tapTimerRef.current > 600) {
      tapCountRef.current = 0;
    }
    tapCountRef.current++;
    tapTimerRef.current = now;
    if (tapCountRef.current >= 7) {
      tapCountRef.current = 0;
      eventBus.emit({ type: "TRIPLE_TAP" });
      onTripleTap?.();
    }
  }, [onTripleTap]);
  const baseFaceState: FaceState = wakeFlash ? "attentive" : mapToFaceState(voiceState);
  // v3.0: Keep emotion override active DURING speaking for expression coherence
  const faceState: FaceState = emotionOverride && voiceState === "speaking" ? "speaking" : (emotionOverride || baseFaceState);
  // Pass emotion to FaceScene for blending during speech
  const emotionDuringSpeech: FaceState | undefined = voiceState === "speaking" ? emotionOverride : undefined;
  return (
    <div
      className="w-full h-full relative cursor-pointer select-none"
      onClick={handleTap}
      style={{ touchAction: "manipulation" }}
    >
      {/* Soft pastel aura — warm glow behind face */}
      <div className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, 
            hsla(215, 80%, 75%, ${voiceState === "speaking" ? 0.25 : voiceState === "listening" ? 0.18 : 0.12}) 0%, 
            hsla(270, 45%, 75%, ${voiceState === "speaking" ? 0.14 : 0.06}) 30%,
            hsla(320, 40%, 75%, ${voiceState === "speaking" ? 0.06 : 0.03}) 50%,
            hsla(45, 60%, 80%, 0.02) 65%,
            transparent 80%)`,
          transition: "background 0.6s ease",
        }}
      />
      <Canvas
        camera={{ position: [0, 0, 3.2], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          {/* Soft warm lighting — pastel anime style */}
          <ambientLight intensity={0.55} color="#f0f0ff" />
          <directionalLight
            position={[2, 3, 4]}
            intensity={voiceState === "speaking" ? 1.2 : 0.85}
            color={voiceState === "speaking" ? "#aaddff" : "#cce0f0"}
          />
          <directionalLight position={[-2, 1, 3]} intensity={0.45} color="#ddb3ff" />
          <pointLight
            position={[0, 0.5, 3]}
            intensity={voiceState === "listening" ? 0.95 : 0.6}
            color="#88ccff"
            distance={8}
          />
          {/* Warm bottom fill — gives anime/Pixar warmth */}
          <pointLight position={[0, -1.5, 1]} intensity={0.35} color="#ffd4e8" distance={5} />
          {/* Top rim — cool highlight */}
          <pointLight position={[0, 2, 1]} intensity={0.22} color="#bbddff" distance={5} />
          {/* Side accent — lavender */}
          <pointLight position={[-2, 0, 2]} intensity={0.15} color="#ccaaff" distance={6} />
          <FaceScene
            faceState={faceState}
            gazeRef={gazeRef}
            getViseme={getViseme}
            emotionIntensity={emotionIntensity}
            emotionDuringSpeech={emotionDuringSpeech}
            bobbyColor={bobbyColor}
            bobbyColors={bobbyColors}
            expressionOverride={expressionOverride}
            expressionIntensityLevel={expressionIntensityLevel}
          />
          {faceState === "sleepy" && <SleepZzz />}
        </Suspense>
      </Canvas>
    </div>
  );
}

// ─── Floating "Z z z" sleep animation ─────────────────────────────────
function SleepZzz() {
  const groupRef = useRef<THREE.Group>(null);
  const zLetters = useRef<THREE.Mesh[]>([]);
  const phases = useRef([0, 0.7, 1.5]); // staggered start

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    zLetters.current.forEach((mesh, i) => {
      if (!mesh) return;
      phases.current[i] += delta * 0.5;
      const p = phases.current[i] % 4;
      const t = p / 4;

      // Float up and slightly right — stay within face bounds
      mesh.position.x = 0.35 + t * 0.5 + i * 0.2;
      mesh.position.y = 0.15 + t * 1.5;
      mesh.position.z = 0.15;

      const scale = (1.5 + i * 0.6) * (0.3 + Math.sin(t * Math.PI) * 0.7);
      mesh.scale.setScalar(scale);

      // Gentle wobble
      mesh.rotation.z = Math.sin(phases.current[i] * 1.8) * 0.15;

      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.sin(t * Math.PI) * 0.85;
    });
  });

  // Dark purple colors for Z's
  const zMat = useMemo(() => [
    new THREE.MeshBasicMaterial({ color: "#6B21A8", transparent: true, opacity: 0 }),
    new THREE.MeshBasicMaterial({ color: "#7C3AED", transparent: true, opacity: 0 }),
    new THREE.MeshBasicMaterial({ color: "#8B5CF6", transparent: true, opacity: 0 }),
  ], []);

  // Simple Z shape using a plane (text would need font loading)
  const zGeo = useMemo(() => {
    const shape = new THREE.Shape();
    // Z letter path
    shape.moveTo(-0.08, 0.08);
    shape.lineTo(0.08, 0.08);
    shape.lineTo(-0.06, -0.08);
    shape.lineTo(0.08, -0.08);
    // Thicken with lines
    const geo = new THREE.ShapeGeometry(shape, 1);
    return geo;
  }, []);

  // Use simple text-like planes for Z
  const planeGeo = useMemo(() => new THREE.PlaneGeometry(0.18, 0.18), []);

  return (
    <group ref={groupRef}>
      {[0, 1, 2].map(i => (
        <mesh
          key={i}
          ref={(el) => { if (el) zLetters.current[i] = el; }}
          material={zMat[i]}
          position={[0.3 + i * 0.1, 0.1, 0.1]}
        >
          {/* Z shape built from 3 thick boxes — 5x bigger */}
          <group>
            {/* Top bar */}
            <mesh position={[0, 0.06, 0]} material={zMat[i]}>
              <boxGeometry args={[0.16, 0.035, 0.02]} />
            </mesh>
            {/* Diagonal */}
            <mesh position={[0, 0, 0]} rotation={[0, 0, -0.65]} material={zMat[i]}>
              <boxGeometry args={[0.20, 0.03, 0.02]} />
            </mesh>
            {/* Bottom bar */}
            <mesh position={[0, -0.06, 0]} material={zMat[i]}>
              <boxGeometry args={[0.16, 0.035, 0.02]} />
            </mesh>
          </group>
        </mesh>
      ))}
    </group>
  );
}

function FaceScene({ faceState, gazeRef, getViseme, emotionIntensity, emotionDuringSpeech, bobbyColor, bobbyColors, expressionOverride, expressionIntensityLevel }: {
  faceState: FaceState;
  gazeRef: React.MutableRefObject<{ x: number; y: number }>;
  getViseme: () => VisemeState;
  emotionIntensity: number;
  emotionDuringSpeech?: FaceState;
  bobbyColor?: string;
  bobbyColors?: BobbyColors;
  expressionOverride?: ExpressionCombo;
  expressionIntensityLevel?: number;
}) {
  const visemeRef = useRef<VisemeState>({
    viseme: "REST", amplitude: 0, mouthOpenness: 0, mouthWidth: 0.5, mouthRound: 0, jawDrop: 0,
  });
  useFrame(() => {
    const v = getViseme();
    visemeRef.current.viseme = v.viseme;
    visemeRef.current.amplitude = v.amplitude;
    visemeRef.current.mouthOpenness = v.mouthOpenness;
    visemeRef.current.mouthWidth = v.mouthWidth;
    visemeRef.current.mouthRound = v.mouthRound;
    visemeRef.current.jawDrop = v.jawDrop;
  });
  return (
    <FaceMesh
      faceState={faceState}
      gazeRef={gazeRef}
      audioAmplitude={visemeRef.current.amplitude}
      viseme={visemeRef.current}
      emotionIntensity={emotionIntensity}
      emotionDuringSpeech={emotionDuringSpeech}
      bobbyColor={bobbyColor}
      bobbyColors={bobbyColors}
      expressionOverride={expressionOverride}
      expressionIntensityLevel={expressionIntensityLevel}
    />
  );
}
    />
  );
}

export default memo(HologramFace);
export type { HologramFaceProps };
