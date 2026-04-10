/**
 * Bobby Holographic Face — Flat 2D robot/hologram style
 * No 3D spheres — uses flat circles, rings, and bars
 */
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { FaceState, useFaceAnimation } from "./useFaceAnimation";
import { VisemeState } from "./useAudioAmplitude";

interface FaceMeshProps {
  faceState: FaceState;
  gazeRef: React.MutableRefObject<{ x: number; y: number }>;
  audioAmplitude: number;
  viseme?: VisemeState;
  emotionIntensity?: number;
}

export function FaceMesh({ faceState, gazeRef, audioAmplitude, viseme, emotionIntensity = 0.7 }: FaceMeshProps) {
  const rootRef = useRef<THREE.Group>(null);
  const leftEyeRef = useRef<THREE.Group>(null);
  const rightEyeRef = useRef<THREE.Group>(null);
  const leftPupilRef = useRef<THREE.Mesh>(null);
  const rightPupilRef = useRef<THREE.Mesh>(null);
  const leftIrisRef = useRef<THREE.Mesh>(null);
  const rightIrisRef = useRef<THREE.Mesh>(null);
  const leftEyebrowRef = useRef<THREE.Mesh>(null);
  const rightEyebrowRef = useRef<THREE.Mesh>(null);
  const mouthRef = useRef<THREE.Mesh>(null);
  const leftEyelidRef = useRef<THREE.Mesh>(null);
  const rightEyelidRef = useRef<THREE.Mesh>(null);
  const leftCheekRef = useRef<THREE.Mesh>(null);
  const rightCheekRef = useRef<THREE.Mesh>(null);

  const animation = useFaceAnimation(faceState, gazeRef, audioAmplitude, viseme, emotionIntensity);

  // ─── Materials — flat holographic glow ─────────────────────

  const eyeOuterMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("hsl(210, 80%, 75%)"),
    transparent: true, opacity: 0.3,
  }), []);

  const eyeRingMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("hsl(215, 90%, 70%)"),
    transparent: true, opacity: 0.7,
  }), []);

  const irisMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("hsl(210, 100%, 60%)"),
    transparent: true, opacity: 0.9,
  }), []);

  const pupilMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("hsl(220, 80%, 20%)"),
  }), []);

  const highlightMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("hsl(200, 100%, 95%)"),
    transparent: true, opacity: 0.9,
  }), []);

  const eyebrowMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("hsl(215, 70%, 65%)"),
    transparent: true, opacity: 0.8,
  }), []);

  const mouthMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("hsl(215, 80%, 70%)"),
    transparent: true, opacity: 0.85,
  }), []);

  const eyelidMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("hsl(230, 30%, 88%)"),
    transparent: true, opacity: 0.9,
  }), []);

  const blushMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("hsl(340, 60%, 75%)"),
    transparent: true, opacity: 0.25,
  }), []);

  // ─── Frame Update ──────────────────────────────────────────
  useFrame((_, delta) => {
    const state = animation.update(delta);
    if (!rootRef.current) return;

    rootRef.current.rotation.z = state.headTiltZ * 0.5;

    // Pupils follow gaze
    [leftPupilRef, rightPupilRef].forEach(ref => {
      if (ref.current) {
        ref.current.position.x = state.pupilX * 0.15;
        ref.current.position.y = state.pupilY * 0.12;
      }
    });
    [leftIrisRef, rightIrisRef].forEach(ref => {
      if (ref.current) {
        ref.current.position.x = state.pupilX * 0.08;
        ref.current.position.y = state.pupilY * 0.06;
      }
    });

    // Pupil size
    const ps = state.pupilSize;
    if (leftPupilRef.current) leftPupilRef.current.scale.setScalar(ps);
    if (rightPupilRef.current) rightPupilRef.current.scale.setScalar(ps);

    // Eyelids (blink) — scale down from top
    const eyelidScale = 1 - state.eyeOpenness;
    [leftEyelidRef, rightEyelidRef].forEach(ref => {
      if (ref.current) {
        ref.current.scale.y = Math.max(0.01, eyelidScale * 1.2);
        ref.current.visible = eyelidScale > 0.04;
      }
    });

    // Eye scale
    const eyeScale = 0.9 + state.eyeOpenness * 0.15;
    const happySquish = state.mouthCurve > 0.3 ? 1 + (state.mouthCurve - 0.3) * 0.1 : 1;
    [leftEyeRef, rightEyeRef].forEach(ref => {
      if (ref.current) ref.current.scale.set(eyeScale * happySquish, eyeScale / happySquish, 1);
    });

    // Eyebrows
    const browLift = state.eyebrowHeight * 0.15;
    if (leftEyebrowRef.current) {
      leftEyebrowRef.current.position.y = 0.62 + browLift;
      leftEyebrowRef.current.rotation.z = 0.1 - state.eyebrowTilt * 0.3;
    }
    if (rightEyebrowRef.current) {
      rightEyebrowRef.current.position.y = 0.62 + browLift;
      rightEyebrowRef.current.rotation.z = -0.1 + state.eyebrowTilt * 0.3;
    }

    // MOUTH — horizontal bar that stretches when speaking
    if (mouthRef.current) {
      const baseWidth = 0.4;
      const speakWidth = baseWidth + state.mouthOpenness * 0.35 + state.mouthWidth * 0.15;
      mouthRef.current.scale.x = speakWidth / 0.4; // normalize to base
      mouthRef.current.position.y = -0.55 + state.mouthCurve * 0.05;
      // Glow brighter when speaking
      const mat = mouthRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.7 + state.mouthOpenness * 0.3;
    }

    // Cheeks
    const smile = Math.max(0, state.mouthCurve * 2);
    [leftCheekRef, rightCheekRef].forEach(ref => {
      if (ref.current) {
        const mat = ref.current.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.1 + state.cheekGlow * 0.3 + smile * 0.15;
      }
    });

    // Iris glow
    irisMat.opacity = 0.7 + state.irisGlow * 0.3;
  });

  // ─── Layout ────────────────────────────────────────────────
  const eyeSpacing = 0.55;
  const eyeY = 0.1;

  const renderEye = (
    side: "left" | "right",
    eyeRef: React.RefObject<THREE.Group>,
    pupilRef: React.RefObject<THREE.Mesh>,
    irisRef: React.RefObject<THREE.Mesh>,
    eyelidRef: React.RefObject<THREE.Mesh>,
  ) => {
    const x = side === "left" ? -eyeSpacing : eyeSpacing;
    return (
      <group ref={eyeRef} position={[x, eyeY, 0]} key={side}>
        {/* Outer glow circle */}
        <mesh material={eyeOuterMat}>
          <circleGeometry args={[0.42, 48]} />
        </mesh>
        {/* Eye ring */}
        <mesh material={eyeRingMat} position={[0, 0, 0.01]}>
          <ringGeometry args={[0.32, 0.38, 48]} />
        </mesh>
        {/* Iris — flat disc */}
        <mesh ref={irisRef} position={[0, 0, 0.02]} material={irisMat}>
          <circleGeometry args={[0.28, 48]} />
        </mesh>
        {/* Pupil — dark center */}
        <mesh ref={pupilRef} position={[0, 0, 0.03]} material={pupilMat}>
          <circleGeometry args={[0.12, 32]} />
        </mesh>
        {/* Highlight — top-right sparkle */}
        <mesh position={[0.08, 0.1, 0.04]} material={highlightMat}>
          <circleGeometry args={[0.06, 16]} />
        </mesh>
        {/* Small secondary highlight */}
        <mesh position={[-0.05, -0.06, 0.04]} material={highlightMat} scale={0.5}>
          <circleGeometry args={[0.04, 12]} />
        </mesh>
        {/* Eyelid — thin bar, natural blink */}
        <mesh ref={eyelidRef} position={[0, 0.22, 0.05]} material={eyelidMat}>
          <planeGeometry args={[0.85, 0.18]} />
        </mesh>
      </group>
    );
  };

  return (
    <group ref={rootRef}>
      {/* ===== EYES ===== */}
      {renderEye("left", leftEyeRef, leftPupilRef, leftIrisRef, leftEyelidRef)}
      {renderEye("right", rightEyeRef, rightPupilRef, rightIrisRef, rightEyelidRef)}

      {/* ===== EYEBROWS — thin flat bars ===== */}
      <mesh ref={leftEyebrowRef} position={[-eyeSpacing, 0.62, 0.01]} material={eyebrowMat} rotation={[0, 0, 0.1]}>
        <planeGeometry args={[0.35, 0.045]} />
      </mesh>
      <mesh ref={rightEyebrowRef} position={[eyeSpacing, 0.62, 0.01]} material={eyebrowMat} rotation={[0, 0, -0.1]}>
        <planeGeometry args={[0.35, 0.045]} />
      </mesh>

      {/* ===== MOUTH — curved smile arc ===== */}
      <mesh ref={mouthRef} position={[0, -0.55, 0.01]} material={mouthMat}>
        <torusGeometry args={[0.22, 0.02, 8, 32, Math.PI * 0.55]} />
      </mesh>

      {/* ===== CHEEK BLUSH — subtle flat circles ===== */}
      <mesh ref={leftCheekRef} position={[-0.7, -0.25, 0]} material={blushMat}>
        <circleGeometry args={[0.18, 32]} />
      </mesh>
      <mesh ref={rightCheekRef} position={[0.7, -0.25, 0]} material={blushMat}>
        <circleGeometry args={[0.18, 32]} />
      </mesh>
    </group>
  );
}
