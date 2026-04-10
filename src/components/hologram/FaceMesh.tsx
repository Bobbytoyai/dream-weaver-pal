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
  const headRef = useRef<THREE.Group>(null);
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
  const glowShellRef = useRef<THREE.Mesh>(null);
  const leftCheekRef = useRef<THREE.Mesh>(null);
  const rightCheekRef = useRef<THREE.Mesh>(null);
  const leftHighlight1Ref = useRef<THREE.Mesh>(null);
  const rightHighlight1Ref = useRef<THREE.Mesh>(null);
  const leftHighlight2Ref = useRef<THREE.Mesh>(null);
  const rightHighlight2Ref = useRef<THREE.Mesh>(null);

  const animation = useFaceAnimation(faceState, gazeRef, audioAmplitude, viseme, emotionIntensity);

  // --- Materials (soft pastel cartoon style) ---
  const skinMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(210, 30%, 78%)"),
    emissive: new THREE.Color("hsl(200, 45%, 32%)"),
    emissiveIntensity: 0.25, roughness: 0.55, metalness: 0.05,
    transparent: true, opacity: 0.9,
  }), []);

  const eyeWhiteMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xf5ffff,
    emissive: new THREE.Color("hsl(200, 85%, 88%)"),
    emissiveIntensity: 0.4, roughness: 0.1, metalness: 0,
  }), []);

  const irisMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(195, 100%, 55%)"),
    emissive: new THREE.Color("hsl(195, 100%, 48%)"),
    emissiveIntensity: 0.6, roughness: 0.1, metalness: 0.1,
  }), []);

  const pupilMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(210, 80%, 12%)"),
    emissive: new THREE.Color("hsl(200, 100%, 35%)"),
    emissiveIntensity: 0.35, roughness: 0.08, metalness: 0.15,
  }), []);

  const eyebrowMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(210, 35%, 52%)"),
    emissive: new THREE.Color("hsl(210, 45%, 32%)"),
    emissiveIntensity: 0.2, roughness: 0.6,
  }), []);

  const mouthMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(340, 45%, 58%)"),
    emissive: new THREE.Color("hsl(340, 55%, 38%)"),
    emissiveIntensity: 0.3, roughness: 0.4,
  }), []);

  const eyelidMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(210, 28%, 68%)"),
    emissive: new THREE.Color("hsl(200, 35%, 32%)"),
    emissiveIntensity: 0.2, roughness: 0.5, metalness: 0.05,
  }), []);

  const blushMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(330, 55%, 68%)"),
    emissive: new THREE.Color("hsl(330, 65%, 48%)"),
    emissiveIntensity: 0.4, roughness: 0.6,
    transparent: true, opacity: 0.3,
  }), []);

  const glowMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(200, 100%, 72%)"),
    emissive: new THREE.Color("hsl(200, 100%, 62%)"),
    emissiveIntensity: 0.6, transparent: true, opacity: 0.08,
    roughness: 0, metalness: 1, side: THREE.BackSide,
  }), []);

  const highlightMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2,
    transparent: true, opacity: 0.9,
  }), []);

  const noseMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(210, 28%, 70%)"),
    emissive: new THREE.Color("hsl(200, 38%, 30%)"),
    emissiveIntensity: 0.2, roughness: 0.45, metalness: 0.03,
  }), []);

  const earInnerMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(330, 35%, 72%)"),
    emissive: new THREE.Color("hsl(330, 45%, 38%)"),
    emissiveIntensity: 0.15, roughness: 0.5,
  }), []);

  useFrame((_, delta) => {
    const state = animation.update(delta);
    if (!headRef.current) return;

    headRef.current.rotation.x = state.headTiltX;
    headRef.current.rotation.y = state.headTiltY;
    headRef.current.rotation.z = state.headTiltZ;

    // --- Pupils follow gaze ---
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

    // --- Eyelids (blink) ---
    const eyelidScale = 1 - state.eyeOpenness;
    if (leftEyelidRef.current) {
      leftEyelidRef.current.scale.y = Math.max(0.01, eyelidScale);
      leftEyelidRef.current.visible = eyelidScale > 0.05;
    }
    if (rightEyelidRef.current) {
      rightEyelidRef.current.scale.y = Math.max(0.01, eyelidScale);
      rightEyelidRef.current.visible = eyelidScale > 0.05;
    }

    // --- Eye scale (bigger = more interest) ---
    const eyeScale = 0.88 + state.eyeOpenness * 0.18;
    if (leftEyeRef.current) leftEyeRef.current.scale.setScalar(eyeScale);
    if (rightEyeRef.current) rightEyeRef.current.scale.setScalar(eyeScale);

    // --- Eyebrows ---
    if (leftEyebrowRef.current) {
      leftEyebrowRef.current.position.y = 0.72 + state.eyebrowHeight;
      leftEyebrowRef.current.rotation.z = -state.eyebrowTilt;
    }
    if (rightEyebrowRef.current) {
      rightEyebrowRef.current.position.y = 0.72 + state.eyebrowHeight;
      rightEyebrowRef.current.rotation.z = state.eyebrowTilt;
    }

    // --- Mouth (viseme-driven) ---
    if (mouthRef.current) {
      mouthRef.current.scale.x = 0.5 + state.mouthWidth * 0.7;
      mouthRef.current.scale.y = 0.2 + state.mouthOpenness * 2.0;
      mouthRef.current.scale.z = 0.8 + state.mouthRound * 0.5;
      mouthRef.current.position.y = -0.32 + state.mouthCurve * 0.07 - state.jawDrop * 0.04;
      mouthRef.current.position.z = 0.88 + state.mouthOpenness * 0.03;
    }

    // --- Cheek blush ---
    if (leftCheekRef.current) {
      (leftCheekRef.current.material as THREE.MeshStandardMaterial).opacity = 0.1 + state.cheekGlow * 0.55;
      (leftCheekRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.2 + state.cheekGlow * 0.65;
    }
    if (rightCheekRef.current) {
      (rightCheekRef.current.material as THREE.MeshStandardMaterial).opacity = 0.1 + state.cheekGlow * 0.55;
      (rightCheekRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.2 + state.cheekGlow * 0.65;
    }

    // --- Iris glow (living eyes, always slightly shimmering) ---
    irisMat.emissiveIntensity = 0.35 + state.irisGlow * 0.6;

    // --- Eye sparkle highlights (dynamic intensity) ---
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

    // --- Global glow ---
    glowMat.opacity = state.glowIntensity * 0.15;
    glowMat.emissiveIntensity = 0.3 + state.glowIntensity * 0.8;
    skinMat.emissiveIntensity = 0.18 + state.glowIntensity * 0.25;
  });

  return (
    <group ref={headRef}>
      {/* Head sphere (rounded, soft) */}
      <mesh material={skinMat}><sphereGeometry args={[1, 48, 48]} /></mesh>
      <mesh ref={glowShellRef} material={glowMat} scale={1.06}><sphereGeometry args={[1, 32, 32]} /></mesh>

      {/* LEFT EYE — bigger, rounder, more segments for softness */}
      <group ref={leftEyeRef} position={[-0.34, 0.18, 0.82]}>
        <mesh material={eyeWhiteMat}><sphereGeometry args={[0.24, 32, 32]} /></mesh>
        <mesh ref={leftIrisRef} position={[0, 0, 0.14]} material={irisMat}><sphereGeometry args={[0.14, 24, 24]} /></mesh>
        <mesh ref={leftPupilRef} position={[0, 0, 0.19]} material={pupilMat}><sphereGeometry args={[0.065, 20, 20]} /></mesh>
        {/* Primary sparkle */}
        <mesh ref={leftHighlight1Ref} position={[0.06, 0.06, 0.22]} material={highlightMat.clone()}>
          <sphereGeometry args={[0.03, 12, 12]} />
        </mesh>
        {/* Secondary sparkle */}
        <mesh ref={leftHighlight2Ref} position={[-0.035, -0.025, 0.21]} material={highlightMat.clone()} scale={0.6}>
          <sphereGeometry args={[0.025, 10, 10]} />
        </mesh>
        {/* Third tiny sparkle for extra life */}
        <mesh position={[0.02, 0.08, 0.2]} material={highlightMat} scale={0.3}>
          <sphereGeometry args={[0.02, 8, 8]} />
        </mesh>
        {/* Eyelid — rounded box */}
        <mesh ref={leftEyelidRef} position={[0, 0.11, 0.06]} material={eyelidMat}>
          <boxGeometry args={[0.52, 0.24, 0.24]} />
        </mesh>
      </group>

      {/* RIGHT EYE */}
      <group ref={rightEyeRef} position={[0.34, 0.18, 0.82]}>
        <mesh material={eyeWhiteMat}><sphereGeometry args={[0.24, 32, 32]} /></mesh>
        <mesh ref={rightIrisRef} position={[0, 0, 0.14]} material={irisMat}><sphereGeometry args={[0.14, 24, 24]} /></mesh>
        <mesh ref={rightPupilRef} position={[0, 0, 0.19]} material={pupilMat}><sphereGeometry args={[0.065, 20, 20]} /></mesh>
        <mesh ref={rightHighlight1Ref} position={[0.06, 0.06, 0.22]} material={highlightMat.clone()}>
          <sphereGeometry args={[0.03, 12, 12]} />
        </mesh>
        <mesh ref={rightHighlight2Ref} position={[-0.035, -0.025, 0.21]} material={highlightMat.clone()} scale={0.6}>
          <sphereGeometry args={[0.025, 10, 10]} />
        </mesh>
        <mesh position={[0.02, 0.08, 0.2]} material={highlightMat} scale={0.3}>
          <sphereGeometry args={[0.02, 8, 8]} />
        </mesh>
        <mesh ref={rightEyelidRef} position={[0, 0.11, 0.06]} material={eyelidMat}>
          <boxGeometry args={[0.52, 0.24, 0.24]} />
        </mesh>
      </group>

      {/* EYEBROWS — thicker, softer capsule */}
      <mesh ref={leftEyebrowRef} position={[-0.34, 0.72, 0.8]} material={eyebrowMat}>
        <capsuleGeometry args={[0.04, 0.24, 6, 12]} />
      </mesh>
      <mesh ref={rightEyebrowRef} position={[0.34, 0.72, 0.8]} material={eyebrowMat}>
        <capsuleGeometry args={[0.04, 0.24, 6, 12]} />
      </mesh>

      {/* NOSE — soft round */}
      <mesh position={[0, 0, 0.96]} material={noseMat}><sphereGeometry args={[0.07, 16, 16]} /></mesh>

      {/* MOUTH — capsule for roundness */}
      <mesh ref={mouthRef} position={[0, -0.32, 0.88]} material={mouthMat}>
        <capsuleGeometry args={[0.05, 0.18, 6, 12]} />
      </mesh>

      {/* CHEEKS — soft blush circles */}
      <mesh ref={leftCheekRef} position={[-0.58, -0.08, 0.65]} material={blushMat.clone()} rotation={[0, -0.4, 0]}>
        <circleGeometry args={[0.15, 24]} />
      </mesh>
      <mesh ref={rightCheekRef} position={[0.58, -0.08, 0.65]} material={blushMat.clone()} rotation={[0, 0.4, 0]}>
        <circleGeometry args={[0.15, 24]} />
      </mesh>

      {/* EARS — rounded */}
      <group position={[-0.92, 0.15, 0]}>
        <mesh material={skinMat}><sphereGeometry args={[0.17, 16, 16]} /></mesh>
        <mesh position={[0.03, 0, 0.05]} material={earInnerMat} scale={0.6}><sphereGeometry args={[0.17, 12, 12]} /></mesh>
      </group>
      <group position={[0.92, 0.15, 0]}>
        <mesh material={skinMat}><sphereGeometry args={[0.17, 16, 16]} /></mesh>
        <mesh position={[-0.03, 0, 0.05]} material={earInnerMat} scale={0.6}><sphereGeometry args={[0.17, 12, 12]} /></mesh>
      </group>
    </group>
  );
}
