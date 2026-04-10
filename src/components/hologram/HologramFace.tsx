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
  /** Emotion override from AI analysis (e.g. "happy", "sad", "curious") */
  emotionOverride?: FaceState;
  /** Emotion intensity 0-1 (default 0.7) */
  emotionIntensity?: number;
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

  // Emotion override takes precedence over voiceState mapping
  const baseFaceState: FaceState = wakeFlash ? "attentive" : mapToFaceState(voiceState);
  const faceState: FaceState = emotionOverride && voiceState !== "speaking" ? emotionOverride : baseFaceState;

  return (
    <div
      className="w-full h-full relative cursor-pointer select-none"
      onClick={handleTap}
      style={{ touchAction: "manipulation" }}
    >
      {/* Ambient aura */}
      <div className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, 
            hsla(200, 100%, 65%, ${voiceState === "speaking" ? 0.22 : voiceState === "listening" ? 0.16 : 0.1}) 0%, 
            hsla(280, 50%, 55%, ${voiceState === "speaking" ? 0.1 : 0.04}) 35%,
            hsla(330, 40%, 50%, ${voiceState === "speaking" ? 0.05 : 0.02}) 55%,
            transparent 75%)`,
          transition: "background 0.6s ease",
        }}
      />

      <Canvas
        camera={{ position: [0, 0, 3.2], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.45} color="#e8f4ff" />
          <directionalLight
            position={[2, 3, 4]}
            intensity={voiceState === "speaking" ? 1.1 : 0.75}
            color={voiceState === "speaking" ? "#99ddff" : "#bbddee"}
          />
          <directionalLight position={[-2, 1, 3]} intensity={0.4} color="#cc99ff" />
          <pointLight
            position={[0, 0.5, 3]}
            intensity={voiceState === "listening" ? 0.9 : 0.55}
            color="#77ddff"
            distance={8}
          />
          <pointLight position={[0, -1.5, 1]} intensity={0.28} color="#ffccdd" distance={5} />
          <pointLight position={[0, 2, 1]} intensity={0.18} color="#aaeeff" distance={5} />

          <FaceScene
            faceState={faceState}
            gazeRef={gazeRef}
            getViseme={getViseme}
            emotionIntensity={emotionIntensity}
          />
          <HologramParticles intensity={voiceState === "speaking" ? 0.8 : voiceState === "listening" ? 0.5 : 0.25} />
          <ScanRing />
        </Suspense>
      </Canvas>
    </div>
  );
}

function FaceScene({ faceState, gazeRef, getViseme, emotionIntensity }: {
  faceState: FaceState;
  gazeRef: React.MutableRefObject<{ x: number; y: number }>;
  getViseme: () => VisemeState;
  emotionIntensity: number;
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
    />
  );
}

export default memo(HologramFace);
export type { HologramFaceProps };
