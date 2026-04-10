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
  const leftHighlight1Ref = useRef<THREE.Mesh>(null);
  const rightHighlight1Ref = useRef<THREE.Mesh>(null);
  const leftHighlight2Ref = useRef<THREE.Mesh>(null);
  const rightHighlight2Ref = useRef<THREE.Mesh>(null);

  const animation = useFaceAnimation(faceState, gazeRef, audioAmplitude, viseme, emotionIntensity);

  // --- Materials (soft pastel cartoon, warm glow) ---
  const eyeWhiteMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xf5ffff,
    emissive: new THREE.Color("hsl(200, 85%, 88%)"),
    emissiveIntensity: 0.45, roughness: 0.08, metalness: 0,
  }), []);

  const irisMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(195, 100%, 55%)"),
    emissive: new THREE.Color("hsl(195, 100%, 48%)"),
    emissiveIntensity: 0.6, roughness: 0.08, metalness: 0.1,
  }), []);

  const pupilMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(210, 80%, 10%)"),
    emissive: new THREE.Color("hsl(200, 100%, 30%)"),
    emissiveIntensity: 0.3, roughness: 0.05, metalness: 0.1,
  }), []);

  const eyebrowMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(210, 40%, 48%)"),
    emissive: new THREE.Color("hsl(210, 50%, 30%)"),
    emissiveIntensity: 0.25, roughness: 0.5,
  }), []);

  const mouthMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(340, 50%, 55%)"),
    emissive: new THREE.Color("hsl(340, 60%, 35%)"),
    emissiveIntensity: 0.35, roughness: 0.35,
  }), []);

  const eyelidMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(210, 25%, 65%)"),
    emissive: new THREE.Color("hsl(200, 30%, 30%)"),
    emissiveIntensity: 0.2, roughness: 0.5, metalness: 0.05,
  }), []);

  const highlightMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2.5,
    transparent: true, opacity: 0.9,
  }), []);

  useFrame((_, delta) => {
    const state = animation.update(delta);
    if (!rootRef.current) return;

    // Root group rotation (head movement without a head mesh)
    rootRef.current.rotation.x = state.headTiltX;
    rootRef.current.rotation.y = state.headTiltY;
    rootRef.current.rotation.z = state.headTiltZ;

    // --- Pupils ---
    if (leftPupilRef.current) {
      leftPupilRef.current.position.x = state.pupilX;
      leftPupilRef.current.position.y = state.pupilY;
    }
    if (rightPupilRef.current) {
      rightPupilRef.current.position.x = state.pupilX;
      rightPupilRef.current.position.y = state.pupilY;
    }

    // --- Iris follows gaze (slightly less) ---
    if (leftIrisRef.current) {
      leftIrisRef.current.position.x = state.pupilX * 0.6;
      leftIrisRef.current.position.y = state.pupilY * 0.6;
    }
    if (rightIrisRef.current) {
      rightIrisRef.current.position.x = state.pupilX * 0.6;
      rightIrisRef.current.position.y = state.pupilY * 0.6;
    }

    // --- Pupil size ---
    const pScale = state.pupilSize;
    if (leftPupilRef.current) leftPupilRef.current.scale.setScalar(pScale);
    if (rightPupilRef.current) rightPupilRef.current.scale.setScalar(pScale);

    // --- Eyelids ---
    const eyelidScale = 1 - state.eyeOpenness;
    if (leftEyelidRef.current) {
      leftEyelidRef.current.scale.y = Math.max(0.01, eyelidScale);
      leftEyelidRef.current.visible = eyelidScale > 0.05;
    }
    if (rightEyelidRef.current) {
      rightEyelidRef.current.scale.y = Math.max(0.01, eyelidScale);
      rightEyelidRef.current.visible = eyelidScale > 0.05;
    }

    // --- Eye scale ---
    const eyeScale = 0.85 + state.eyeOpenness * 0.2;
    if (leftEyeRef.current) leftEyeRef.current.scale.setScalar(eyeScale);
    if (rightEyeRef.current) rightEyeRef.current.scale.setScalar(eyeScale);

    // --- Eyebrows ---
    if (leftEyebrowRef.current) {
      leftEyebrowRef.current.position.y = 0.58 + state.eyebrowHeight;
      leftEyebrowRef.current.rotation.z = -state.eyebrowTilt;
    }
    if (rightEyebrowRef.current) {
      rightEyebrowRef.current.position.y = 0.58 + state.eyebrowHeight;
      rightEyebrowRef.current.rotation.z = state.eyebrowTilt;
    }

    // --- Mouth ---
    if (mouthRef.current) {
      mouthRef.current.scale.x = 0.5 + state.mouthWidth * 0.7;
      mouthRef.current.scale.y = 0.2 + state.mouthOpenness * 2.0;
      mouthRef.current.scale.z = 0.8 + state.mouthRound * 0.5;
      mouthRef.current.position.y = -0.55 + state.mouthCurve * 0.07 - state.jawDrop * 0.04;
      mouthRef.current.position.z = 0.05 + state.mouthOpenness * 0.02;
    }

    // --- Iris glow ---
    irisMat.emissiveIntensity = 0.35 + state.irisGlow * 0.65;

    // --- Eye sparkle ---
    const sparkleOpacity = 0.4 + state.eyeSparkle * 0.6;
    if (leftHighlight1Ref.current) {
      (leftHighlight1Ref.current.material as THREE.MeshStandardMaterial).opacity = sparkleOpacity;
    }
    if (rightHighlight1Ref.current) {
      (rightHighlight1Ref.current.material as THREE.MeshStandardMaterial).opacity = sparkleOpacity;
    }
    if (leftHighlight2Ref.current) {
      (leftHighlight2Ref.current.material as THREE.MeshStandardMaterial).opacity = sparkleOpacity * 0.7;
    }
    if (rightHighlight2Ref.current) {
      (rightHighlight2Ref.current.material as THREE.MeshStandardMaterial).opacity = sparkleOpacity * 0.7;
    }
  });

  // Eye spacing & positioning (no head sphere — elements float)
  const eyeSpacing = 0.55;
  const eyeY = 0.1;

  return (
    <group ref={rootRef}>
      {/* LEFT EYE */}
      <group ref={leftEyeRef} position={[-eyeSpacing, eyeY, 0]}>
        <mesh material={eyeWhiteMat}><sphereGeometry args={[0.35, 48, 48]} /></mesh>
        <mesh ref={leftIrisRef} position={[0, 0, 0.22]} material={irisMat}><sphereGeometry args={[0.2, 32, 32]} /></mesh>
        <mesh ref={leftPupilRef} position={[0, 0, 0.3]} material={pupilMat}><sphereGeometry args={[0.09, 24, 24]} /></mesh>
        {/* Sparkle highlights */}
        <mesh ref={leftHighlight1Ref} position={[0.08, 0.09, 0.33]} material={highlightMat.clone()}>
          <sphereGeometry args={[0.045, 16, 16]} />
        </mesh>
        <mesh ref={leftHighlight2Ref} position={[-0.05, -0.04, 0.32]} material={highlightMat.clone()} scale={0.55}>
          <sphereGeometry args={[0.035, 12, 12]} />
        </mesh>
        <mesh position={[0.03, 0.12, 0.31]} material={highlightMat} scale={0.25}>
          <sphereGeometry args={[0.025, 8, 8]} />
        </mesh>
        {/* Eyelid */}
        <mesh ref={leftEyelidRef} position={[0, 0.18, 0.1]} material={eyelidMat}>
          <boxGeometry args={[0.78, 0.35, 0.35]} />
        </mesh>
      </group>

      {/* RIGHT EYE */}
      <group ref={rightEyeRef} position={[eyeSpacing, eyeY, 0]}>
        <mesh material={eyeWhiteMat}><sphereGeometry args={[0.35, 48, 48]} /></mesh>
        <mesh ref={rightIrisRef} position={[0, 0, 0.22]} material={irisMat}><sphereGeometry args={[0.2, 32, 32]} /></mesh>
        <mesh ref={rightPupilRef} position={[0, 0, 0.3]} material={pupilMat}><sphereGeometry args={[0.09, 24, 24]} /></mesh>
        <mesh ref={rightHighlight1Ref} position={[0.08, 0.09, 0.33]} material={highlightMat.clone()}>
          <sphereGeometry args={[0.045, 16, 16]} />
        </mesh>
        <mesh ref={rightHighlight2Ref} position={[-0.05, -0.04, 0.32]} material={highlightMat.clone()} scale={0.55}>
          <sphereGeometry args={[0.035, 12, 12]} />
        </mesh>
        <mesh position={[0.03, 0.12, 0.31]} material={highlightMat} scale={0.25}>
          <sphereGeometry args={[0.025, 8, 8]} />
        </mesh>
        <mesh ref={rightEyelidRef} position={[0, 0.18, 0.1]} material={eyelidMat}>
          <boxGeometry args={[0.78, 0.35, 0.35]} />
        </mesh>
      </group>

      {/* EYEBROWS — thick rounded capsules */}
      <mesh ref={leftEyebrowRef} position={[-eyeSpacing, 0.58, 0.15]} material={eyebrowMat}>
        <capsuleGeometry args={[0.055, 0.3, 8, 16]} />
      </mesh>
      <mesh ref={rightEyebrowRef} position={[eyeSpacing, 0.58, 0.15]} material={eyebrowMat}>
        <capsuleGeometry args={[0.055, 0.3, 8, 16]} />
      </mesh>

      {/* MOUTH — floating capsule */}
      <mesh ref={mouthRef} position={[0, -0.55, 0.05]} material={mouthMat}>
        <capsuleGeometry args={[0.06, 0.22, 8, 16]} />
      </mesh>
    </group>
  );
}
