import { Suspense, useRef, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { FaceMesh } from "./FaceMesh";
import { HologramParticles, ScanRing } from "./HologramEffects";
import { useGazeTracker } from "./useGazeTracker";
import { useAudioAmplitude } from "./useAudioAmplitude";
import { FaceState } from "./useFaceAnimation";

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
    case "session_end": return "idle";
    default: return "idle";
  }
}

export function HologramFace({ voiceState, enableCamera = false, onTripleTap }: HologramFaceProps) {
  const { gazeRef, cameraActive } = useGazeTracker(enableCamera);
  const { connectAudio, getAmplitude } = useAudioAmplitude();
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTap = useCallback(() => {
    tapCountRef.current++;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    if (tapCountRef.current >= 3) {
      tapCountRef.current = 0;
      onTripleTap?.();
      return;
    }
    tapTimerRef.current = setTimeout(() => { tapCountRef.current = 0; }, 600);
  }, [onTripleTap]);

  const faceState = mapToFaceState(voiceState);

  return (
    <div
      className="w-full h-full relative cursor-pointer select-none"
      onClick={handleTap}
      style={{ touchAction: "manipulation" }}
    >
      {/* Ambient holographic glow */}
      <div className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, 
            hsla(200, 100%, 60%, ${voiceState === "speaking" ? 0.2 : voiceState === "listening" ? 0.15 : 0.08}) 0%, 
            hsla(260, 60%, 55%, ${voiceState === "speaking" ? 0.08 : 0.03}) 40%,
            transparent 70%)`,
          transition: "background 0.8s ease",
        }}
      />

      <Canvas
        camera={{ position: [0, 0, 3.2], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          {/* Dynamic lighting — shifts with state */}
          <ambientLight intensity={0.3} />
          <directionalLight
            position={[2, 3, 4]}
            intensity={voiceState === "speaking" ? 1.0 : 0.6}
            color={voiceState === "speaking" ? "#88ddff" : "#aaccee"}
          />
          <directionalLight
            position={[-2, 1, 3]}
            intensity={0.3}
            color="#8866cc"
          />
          <pointLight
            position={[0, 0, 3]}
            intensity={voiceState === "listening" ? 0.8 : 0.4}
            color="#66ccff"
            distance={8}
          />
          {/* Rim light for holographic edge glow */}
          <pointLight
            position={[0, -2, 1]}
            intensity={0.2}
            color="#44ffcc"
            distance={5}
          />

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
      gazeTarget={gazeRef.current}
      audioAmplitude={amplitudeRef.current}
    />
  );
}

export default HologramFace;
export type { HologramFaceProps };
