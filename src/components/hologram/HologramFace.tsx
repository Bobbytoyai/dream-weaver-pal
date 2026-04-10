import { Suspense, useRef, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { FaceMesh } from "./FaceMesh";
import { HologramParticles, ScanRing } from "./HologramEffects";
import { useGazeTracker } from "./useGazeTracker";
import { useAudioAmplitude } from "./useAudioAmplitude";
import { FaceState } from "./useFaceAnimation";

interface HologramFaceProps {
  /** Current voice/interaction state */
  voiceState: "idle" | "listening" | "processing" | "speaking" | "interrupted" | "session_end";
  /** Enable camera-based face tracking */
  enableCamera?: boolean;
  /** Called when triple-tapped for parent mode */
  onTripleTap?: () => void;
}

/** Maps voice states to face animation states */
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
      {/* Holographic background glow */}
      <div className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle, hsla(200, 100%, 70%, ${voiceState === "speaking" ? 0.15 : voiceState === "listening" ? 0.12 : 0.06}) 0%, transparent 70%)`,
          transition: "background 0.5s ease",
        }}
      />

      <Canvas
        camera={{ position: [0, 0, 3.2], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          {/* Lighting */}
          <ambientLight intensity={0.5} />
          <directionalLight position={[2, 3, 4]} intensity={0.8} color="hsl(40, 80%, 95%)" />
          <directionalLight position={[-2, 1, 3]} intensity={0.3} color="hsl(200, 80%, 85%)" />
          <pointLight position={[0, 0, 3]} intensity={0.4} color="hsl(200, 100%, 80%)" distance={8} />

          {/* 3D Face */}
          <FaceScene faceState={faceState} gazeRef={gazeRef} getAmplitude={getAmplitude} />

          {/* Holographic effects */}
          <HologramParticles intensity={voiceState === "speaking" ? 0.7 : voiceState === "listening" ? 0.5 : 0.3} />
          <ScanRing />
        </Suspense>
      </Canvas>

      {/* State indicator overlay */}
      {voiceState === "listening" && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
          <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0.3s" }} />
          <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0.6s" }} />
        </div>
      )}
    </div>
  );
}

/** Inner scene component that uses useFrame */
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
