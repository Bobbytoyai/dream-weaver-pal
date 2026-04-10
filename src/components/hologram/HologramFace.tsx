import { Suspense, useRef, useCallback, useState, useEffect, memo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { FaceMesh } from "./FaceMesh";
import { HologramParticles, ScanRing } from "./HologramEffects";
import { useGazeTracker } from "./useGazeTracker";
import { useAudioAmplitude, type VisemeState } from "./useAudioAmplitude";
import { FaceState } from "./useFaceAnimation";
import { eventBus } from "@/lib/eventBus";

interface HologramFaceProps {
  voiceState: "idle" | "listening" | "processing" | "speaking" | "interrupted" | "session_end";
  enableCamera?: boolean;
  onTripleTap?: () => void;
  emotionOverride?: FaceState;
  emotionIntensity?: number;
  bobbyColor?: string;
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
}: HologramFaceProps) {
  const { gazeRef, cameraActive } = useGazeTracker(enableCamera);
  const { connectAudio, getAmplitude, getViseme } = useAudioAmplitude();
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<number>(0);

  const [wakeFlash, setWakeFlash] = useState(false);
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
          />
          <HologramParticles intensity={voiceState === "speaking" ? 0.8 : voiceState === "listening" ? 0.5 : 0.25} />
          <ScanRing />
        </Suspense>
      </Canvas>
    </div>
  );
}

function FaceScene({ faceState, gazeRef, getViseme, emotionIntensity, bobbyColor }: {
  faceState: FaceState;
  gazeRef: React.MutableRefObject<{ x: number; y: number }>;
  getViseme: () => VisemeState;
  emotionIntensity: number;
  bobbyColor?: string;
}) {
  const visemeRef = useRef<VisemeState>({
    viseme: "REST", amplitude: 0, mouthOpenness: 0, mouthWidth: 0.5, mouthRound: 0, jawDrop: 0,
  });

  useFrame(() => {
    visemeRef.current = getViseme();
  });

  return (
    <FaceMesh
      faceState={faceState}
      gazeRef={gazeRef}
      audioAmplitude={visemeRef.current.amplitude}
      viseme={visemeRef.current}
      emotionIntensity={emotionIntensity}
      bobbyColor={bobbyColor}
    />
  );
}

export default memo(HologramFace);
export type { HologramFaceProps };
