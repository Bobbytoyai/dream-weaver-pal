import { Suspense, useRef, useCallback, useState, useEffect, memo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { FaceMesh } from "./FaceMesh";
import { HologramParticles, ScanRing } from "./HologramEffects";
import { useGazeTracker } from "./useGazeTracker";
import { useAudioAmplitude } from "./useAudioAmplitude";
import { FaceState } from "./useFaceAnimation";
import { eventBus } from "@/lib/eventBus";

interface HologramFaceProps {
  voiceState: "idle" | "listening" | "processing" | "speaking" | "interrupted" | "session_end";
  enableCamera?: boolean;
  onTripleTap?: () => void;
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

export function HologramFace({ voiceState, enableCamera = false, onTripleTap }: HologramFaceProps) {
  const { gazeRef, cameraActive } = useGazeTracker(enableCamera);
  const { connectAudio, getAmplitude } = useAudioAmplitude();
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<number>(0);

  // Wake animation: briefly show "attentive" face on wake
  const [wakeFlash, setWakeFlash] = useState(false);
  useEffect(() => {
    const unsub = eventBus.on("WAKE_DETECTED", () => {
      setWakeFlash(true);
      setTimeout(() => setWakeFlash(false), 700);
    });
    return unsub;
  }, []);

  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - tapTimerRef.current > 400) {
      tapCountRef.current = 0;
    }
    tapCountRef.current++;
    tapTimerRef.current = now;

    eventBus.emit({ type: "TAP_TRIGGERED" });

    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0;
      eventBus.emit({ type: "TRIPLE_TAP" });
      onTripleTap?.();
    }
  }, [onTripleTap]);

  // Map voice state → face state, with wake flash override
  const faceState: FaceState = wakeFlash ? "attentive" : mapToFaceState(voiceState);

  return (
    <div
      className="w-full h-full relative cursor-pointer select-none"
      onClick={handleTap}
      style={{ touchAction: "manipulation" }}
    >
      {/* Ambient holographic glow — warm */}
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
          {/* Warm, soft lighting */}
          <ambientLight intensity={0.4} color="#e8f4ff" />
          <directionalLight
            position={[2, 3, 4]}
            intensity={voiceState === "speaking" ? 1.1 : 0.7}
            color={voiceState === "speaking" ? "#99ddff" : "#bbddee"}
          />
          <directionalLight position={[-2, 1, 3]} intensity={0.35} color="#cc99ff" />
          {/* Key light — warm front glow */}
          <pointLight
            position={[0, 0.5, 3]}
            intensity={voiceState === "listening" ? 0.9 : 0.5}
            color="#77ddff"
            distance={8}
          />
          {/* Rim light — subtle warmth */}
          <pointLight position={[0, -1.5, 1]} intensity={0.25} color="#ffccdd" distance={5} />
          <pointLight position={[0, 2, 1]} intensity={0.15} color="#aaeeff" distance={5} />

          <FaceScene faceState={faceState} gazeRef={gazeRef} getAmplitude={getAmplitude} />
          <HologramParticles intensity={voiceState === "speaking" ? 0.8 : voiceState === "listening" ? 0.5 : 0.25} />
          <ScanRing />
        </Suspense>
      </Canvas>
    </div>
  );
}

function FaceScene({ faceState, gazeRef, getAmplitude }: {
  faceState: FaceState;
  gazeRef: React.MutableRefObject<{ x: number; y: number }>;
  getAmplitude: () => number;
}) {
  const amplitudeRef = useRef(0);

  useFrame(() => {
    amplitudeRef.current = getAmplitude();
  });

  return (
    <FaceMesh
      faceState={faceState}
      gazeRef={gazeRef}
      audioAmplitude={amplitudeRef.current}
    />
  );
}

export default memo(HologramFace);
export type { HologramFaceProps };
