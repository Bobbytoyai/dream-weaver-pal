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
  const leftHighlight1Ref = useRef<THREE.Mesh>(null);
  const rightHighlight1Ref = useRef<THREE.Mesh>(null);
  const leftHighlight2Ref = useRef<THREE.Mesh>(null);
  const rightHighlight2Ref = useRef<THREE.Mesh>(null);
  const leftLashRef = useRef<THREE.Mesh>(null);
  const rightLashRef = useRef<THREE.Mesh>(null);

  const animation = useFaceAnimation(faceState, gazeRef, audioAmplitude, viseme, emotionIntensity);

  // --- Materials: kawaii pastel style ---

  // Eye whites — bright, sparkling white with warm undertone
  const eyeWhiteMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("#f5f8ff"),
    emissive: new THREE.Color("hsl(225, 50%, 94%)"),
    emissiveIntensity: 0.35, roughness: 0.03, metalness: 0,
  }), []);

  // Iris — vibrant blue-violet gradient anime style
  const irisMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(225, 70%, 48%)"),
    emissive: new THREE.Color("hsl(215, 85%, 52%)"),
    emissiveIntensity: 0.65, roughness: 0.04, metalness: 0.12,
  }), []);

  // Iris inner ring — cyan/sky blue for anime sparkle depth
  const irisInnerMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(195, 100%, 58%)"),
    emissive: new THREE.Color("hsl(200, 95%, 55%)"),
    emissiveIntensity: 0.75, roughness: 0.04, metalness: 0.08,
    transparent: true, opacity: 0.88,
  }), []);

  // Pupil — deep dark with subtle violet glow
  const pupilMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(240, 55%, 10%)"),
    emissive: new THREE.Color("hsl(230, 70%, 22%)"),
    emissiveIntensity: 0.22, roughness: 0.02, metalness: 0.08,
  }), []);

  // Eye highlights — bright white sparkles
  const highlightMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 3,
    transparent: true, opacity: 0.95,
  }), []);

  // Tiny star sparkles inside iris
  const starMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xffffff, emissive: 0xeeeeff, emissiveIntensity: 2,
    transparent: true, opacity: 0.7,
  }), []);

  // Eyelash — soft dark with slight warmth
  const lashMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(235, 28%, 20%)"),
    emissive: new THREE.Color("hsl(240, 30%, 14%)"),
    emissiveIntensity: 0.1, roughness: 0.55,
  }), []);

  // Eyebrow — warm dark, rounded feel
  const eyebrowMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(235, 22%, 24%)"),
    emissive: new THREE.Color("hsl(240, 25%, 16%)"),
    emissiveIntensity: 0.1, roughness: 0.45,
  }), []);

  // Mouth — soft coral-pink, cute and expressive
  const mouthMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(350, 65%, 55%)"),
    emissive: new THREE.Color("hsl(345, 70%, 40%)"),
    emissiveIntensity: 0.38, roughness: 0.28,
  }), []);

  // Mouth inner — warm pink
  const mouthInnerMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(355, 70%, 62%)"),
    emissive: new THREE.Color("hsl(350, 75%, 48%)"),
    emissiveIntensity: 0.32, roughness: 0.28,
  }), []);

  // Cheek blush — warm peachy-pink, anime style
  const blushMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(340, 55%, 74%)"),
    emissive: new THREE.Color("hsl(335, 65%, 58%)"),
    emissiveIntensity: 0.45, roughness: 0.5,
    transparent: true, opacity: 0.4,
  }), []);

  // Eyelid — soft lavender/skin tone
  const eyelidMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(245, 18%, 82%)"),
    emissive: new THREE.Color("hsl(245, 14%, 62%)"),
    emissiveIntensity: 0.13, roughness: 0.45,
  }), []);

  useFrame((_, delta) => {
    const state = animation.update(delta);
    if (!rootRef.current) return;

    rootRef.current.rotation.x = state.headTiltX;
    rootRef.current.rotation.y = state.headTiltY;
    rootRef.current.rotation.z = state.headTiltZ;

    // --- Pupils ---
    if (leftPupilRef.current) {
      leftPupilRef.current.position.x = state.pupilX * 0.8;
      leftPupilRef.current.position.y = state.pupilY * 0.8;
    }
    if (rightPupilRef.current) {
      rightPupilRef.current.position.x = state.pupilX * 0.8;
      rightPupilRef.current.position.y = state.pupilY * 0.8;
    }

    // --- Iris follows gaze ---
    if (leftIrisRef.current) {
      leftIrisRef.current.position.x = state.pupilX * 0.5;
      leftIrisRef.current.position.y = state.pupilY * 0.5;
    }
    if (rightIrisRef.current) {
      rightIrisRef.current.position.x = state.pupilX * 0.5;
      rightIrisRef.current.position.y = state.pupilY * 0.5;
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

    // --- Eyelashes scale with eyes ---
    if (leftLashRef.current) leftLashRef.current.scale.x = eyeScale;
    if (rightLashRef.current) rightLashRef.current.scale.x = eyeScale;

    // --- Eyebrows ---
    if (leftEyebrowRef.current) {
      leftEyebrowRef.current.position.y = 0.68 + state.eyebrowHeight;
      leftEyebrowRef.current.rotation.z = -state.eyebrowTilt;
    }
    if (rightEyebrowRef.current) {
      rightEyebrowRef.current.position.y = 0.68 + state.eyebrowHeight;
      rightEyebrowRef.current.rotation.z = state.eyebrowTilt;
    }

    // --- Mouth ---
    if (mouthRef.current) {
      mouthRef.current.scale.x = 0.4 + state.mouthWidth * 0.5;
      mouthRef.current.scale.y = 0.15 + state.mouthOpenness * 1.8;
      mouthRef.current.scale.z = 0.8 + state.mouthRound * 0.4;
      mouthRef.current.position.y = -0.5 + state.mouthCurve * 0.06 - state.jawDrop * 0.03;
      mouthRef.current.position.z = 0.05 + state.mouthOpenness * 0.02;
    }

    // --- Cheek blush intensity ---
    if (leftCheekRef.current) {
      (leftCheekRef.current.material as THREE.MeshStandardMaterial).opacity = 0.15 + state.cheekGlow * 0.5;
      (leftCheekRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3 + state.cheekGlow * 0.5;
    }
    if (rightCheekRef.current) {
      (rightCheekRef.current.material as THREE.MeshStandardMaterial).opacity = 0.15 + state.cheekGlow * 0.5;
      (rightCheekRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3 + state.cheekGlow * 0.5;
    }

    // --- Iris glow (shimmering alive eyes) ---
    irisMat.emissiveIntensity = 0.45 + state.irisGlow * 0.5;
    irisInnerMat.emissiveIntensity = 0.5 + state.irisGlow * 0.6;

    // --- Sparkle highlights ---
    const sparkleOpacity = 0.5 + state.eyeSparkle * 0.5;
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

  const eyeSpacing = 0.6;
  const eyeY = 0.05;
  const eyeRadius = 0.4; // BIG kawaii eyes

  return (
    <group ref={rootRef}>

      {/* ===== LEFT EYE ===== */}
      <group ref={leftEyeRef} position={[-eyeSpacing, eyeY, 0]}>
        {/* Eye white — large oval sphere */}
        <mesh material={eyeWhiteMat} scale={[1, 1.05, 0.7]}>
          <sphereGeometry args={[eyeRadius, 48, 48]} />
        </mesh>
        {/* Iris — deep blue-purple, large */}
        <mesh ref={leftIrisRef} position={[0, -0.02, 0.2]} material={irisMat}>
          <sphereGeometry args={[0.26, 32, 32]} />
        </mesh>
        {/* Iris inner glow ring — lighter blue */}
        <mesh position={[0, 0.02, 0.28]} material={irisInnerMat}>
          <sphereGeometry args={[0.15, 24, 24]} />
        </mesh>
        {/* Pupil */}
        <mesh ref={leftPupilRef} position={[0, 0, 0.32]} material={pupilMat}>
          <sphereGeometry args={[0.1, 24, 24]} />
        </mesh>
        {/* Main highlight — big white circle (top-right like reference) */}
        <mesh ref={leftHighlight1Ref} position={[0.08, 0.1, 0.36]} material={highlightMat.clone()}>
          <sphereGeometry args={[0.06, 16, 16]} />
        </mesh>
        {/* Second highlight — smaller, bottom-left */}
        <mesh ref={leftHighlight2Ref} position={[-0.06, -0.06, 0.35]} material={highlightMat.clone()} scale={0.5}>
          <sphereGeometry args={[0.045, 12, 12]} />
        </mesh>
        {/* Star sparkles scattered in iris */}
        <mesh position={[0.12, 0.0, 0.33]} material={starMat} scale={0.3}>
          <sphereGeometry args={[0.025, 8, 8]} />
        </mesh>
        <mesh position={[-0.02, 0.12, 0.32]} material={starMat} scale={0.22}>
          <sphereGeometry args={[0.025, 8, 8]} />
        </mesh>
        <mesh position={[0.05, -0.1, 0.34]} material={starMat} scale={0.18}>
          <sphereGeometry args={[0.02, 8, 8]} />
        </mesh>
        {/* Eyelash — dark curved bar at top of eye */}
        <mesh ref={leftLashRef} position={[0, 0.28, 0.12]} material={lashMat} scale={[1, 1, 1]}>
          <capsuleGeometry args={[0.04, 0.38, 6, 12]} />
        </mesh>
        {/* Eyelid (for blink) */}
        <mesh ref={leftEyelidRef} position={[0, 0.2, 0.12]} material={eyelidMat}>
          <boxGeometry args={[0.9, 0.4, 0.4]} />
        </mesh>
      </group>

      {/* ===== RIGHT EYE ===== */}
      <group ref={rightEyeRef} position={[eyeSpacing, eyeY, 0]}>
        <mesh material={eyeWhiteMat} scale={[1, 1.05, 0.7]}>
          <sphereGeometry args={[eyeRadius, 48, 48]} />
        </mesh>
        <mesh ref={rightIrisRef} position={[0, -0.02, 0.2]} material={irisMat}>
          <sphereGeometry args={[0.26, 32, 32]} />
        </mesh>
        <mesh position={[0, 0.02, 0.28]} material={irisInnerMat}>
          <sphereGeometry args={[0.15, 24, 24]} />
        </mesh>
        <mesh ref={rightPupilRef} position={[0, 0, 0.32]} material={pupilMat}>
          <sphereGeometry args={[0.1, 24, 24]} />
        </mesh>
        <mesh ref={rightHighlight1Ref} position={[0.08, 0.1, 0.36]} material={highlightMat.clone()}>
          <sphereGeometry args={[0.06, 16, 16]} />
        </mesh>
        <mesh ref={rightHighlight2Ref} position={[-0.06, -0.06, 0.35]} material={highlightMat.clone()} scale={0.5}>
          <sphereGeometry args={[0.045, 12, 12]} />
        </mesh>
        <mesh position={[0.12, 0.0, 0.33]} material={starMat} scale={0.3}>
          <sphereGeometry args={[0.025, 8, 8]} />
        </mesh>
        <mesh position={[-0.02, 0.12, 0.32]} material={starMat} scale={0.22}>
          <sphereGeometry args={[0.025, 8, 8]} />
        </mesh>
        <mesh position={[0.05, -0.1, 0.34]} material={starMat} scale={0.18}>
          <sphereGeometry args={[0.02, 8, 8]} />
        </mesh>
        <mesh ref={rightLashRef} position={[0, 0.28, 0.12]} material={lashMat} scale={[1, 1, 1]}>
          <capsuleGeometry args={[0.04, 0.38, 6, 12]} />
        </mesh>
        <mesh ref={rightEyelidRef} position={[0, 0.2, 0.12]} material={eyelidMat}>
          <boxGeometry args={[0.9, 0.4, 0.4]} />
        </mesh>
      </group>

      {/* ===== EYEBROWS — thin dark arcs ===== */}
      <mesh ref={leftEyebrowRef} position={[-eyeSpacing, 0.68, 0.18]} material={eyebrowMat}>
        <capsuleGeometry args={[0.025, 0.32, 6, 12]} />
      </mesh>
      <mesh ref={rightEyebrowRef} position={[eyeSpacing, 0.68, 0.18]} material={eyebrowMat}>
        <capsuleGeometry args={[0.025, 0.32, 6, 12]} />
      </mesh>

      {/* ===== MOUTH — small, cute, pink-red ===== */}
      <mesh ref={mouthRef} position={[0, -0.5, 0.05]} material={mouthMat}>
        <capsuleGeometry args={[0.055, 0.14, 8, 16]} />
      </mesh>
      {/* Inner mouth / tongue hint */}
      <mesh position={[0, -0.52, 0.03]} material={mouthInnerMat} scale={[0.7, 0.5, 0.6]}>
        <sphereGeometry args={[0.06, 12, 12]} />
      </mesh>

      {/* ===== CHEEK BLUSH — soft pink circles ===== */}
      <mesh ref={leftCheekRef} position={[-0.85, -0.25, 0.05]} material={blushMat.clone()}>
        <circleGeometry args={[0.2, 32]} />
      </mesh>
      <mesh ref={rightCheekRef} position={[0.85, -0.25, 0.05]} material={blushMat.clone()}>
        <circleGeometry args={[0.2, 32]} />
      </mesh>
    </group>
  );
}
