import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { FaceState, useFaceAnimation } from "./useFaceAnimation";

interface FaceMeshProps {
  faceState: FaceState;
  gazeRef: React.MutableRefObject<{ x: number; y: number }>;
  audioAmplitude: number;
}

/**
 * Child-friendly holographic 3D face.
 *
 * Design principles:
 * - Big round eyes (main expressive element)
 * - Soft colors, warm tones
 * - Exaggerated but gentle expressions
 * - No uncanny valley — cartoonish & lovable
 * - Always alive with micro-animations
 */
export function FaceMesh({ faceState, gazeRef, audioAmplitude }: FaceMeshProps) {
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

  const animation = useFaceAnimation(faceState, gazeRef, audioAmplitude);

  // --- Materials: warm, soft, child-friendly ---

  // Head: soft warm-tinted translucent
  const skinMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(210, 35%, 75%)"),
    emissive: new THREE.Color("hsl(200, 50%, 30%)"),
    emissiveIntensity: 0.25,
    roughness: 0.5,
    metalness: 0.1,
    transparent: true,
    opacity: 0.88,
  }), []);

  // Big, bright eye whites — soft glow
  const eyeWhiteMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xf0ffff,
    emissive: new THREE.Color("hsl(200, 90%, 85%)"),
    emissiveIntensity: 0.35,
    roughness: 0.15,
    metalness: 0,
  }), []);

  // Iris — vibrant cyan-blue, visible and friendly
  const irisMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(195, 100%, 55%)"),
    emissive: new THREE.Color("hsl(195, 100%, 45%)"),
    emissiveIntensity: 0.55,
    roughness: 0.12,
    metalness: 0.15,
  }), []);

  // Pupil — dark center with subtle inner glow
  const pupilMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(210, 80%, 15%)"),
    emissive: new THREE.Color("hsl(200, 100%, 40%)"),
    emissiveIntensity: 0.4,
    roughness: 0.1,
    metalness: 0.2,
  }), []);

  // Eyebrow — slightly darker, friendly
  const eyebrowMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(210, 40%, 50%)"),
    emissive: new THREE.Color("hsl(210, 50%, 30%)"),
    emissiveIntensity: 0.2,
    roughness: 0.55,
  }), []);

  // Mouth — warm pinkish tone
  const mouthMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(340, 50%, 55%)"),
    emissive: new THREE.Color("hsl(340, 60%, 35%)"),
    emissiveIntensity: 0.3,
    roughness: 0.4,
  }), []);

  // Eyelid — matches skin
  const eyelidMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(210, 30%, 65%)"),
    emissive: new THREE.Color("hsl(200, 40%, 30%)"),
    emissiveIntensity: 0.2,
    roughness: 0.5,
    metalness: 0.1,
  }), []);

  // Cheek blush — warm pink/purple glow
  const blushMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(330, 60%, 65%)"),
    emissive: new THREE.Color("hsl(330, 70%, 45%)"),
    emissiveIntensity: 0.4,
    roughness: 0.6,
    transparent: true,
    opacity: 0.3,
  }), []);

  // Outer glow shell — holographic aura
  const glowMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(200, 100%, 70%)"),
    emissive: new THREE.Color("hsl(200, 100%, 60%)"),
    emissiveIntensity: 0.6,
    transparent: true,
    opacity: 0.08,
    roughness: 0,
    metalness: 1,
    side: THREE.BackSide,
  }), []);

  // Eye highlight — sparkle of life
  const highlightMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 2,
  }), []);

  // Nose — subtle, cute
  const noseMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(210, 30%, 68%)"),
    emissive: new THREE.Color("hsl(200, 40%, 28%)"),
    emissiveIntensity: 0.2,
    roughness: 0.45,
    metalness: 0.05,
  }), []);

  // Inner ear
  const earInnerMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(330, 40%, 70%)"),
    emissive: new THREE.Color("hsl(330, 50%, 35%)"),
    emissiveIntensity: 0.15,
    roughness: 0.5,
  }), []);

  useFrame((_, delta) => {
    const state = animation.update(delta);
    if (!headRef.current) return;

    headRef.current.rotation.x = state.headTiltX;
    headRef.current.rotation.y = state.headTiltY;
    headRef.current.rotation.z = state.headTiltZ;

    // Pupils follow gaze
    if (leftPupilRef.current) {
      leftPupilRef.current.position.x = state.pupilX;
      leftPupilRef.current.position.y = state.pupilY;
    }
    if (rightPupilRef.current) {
      rightPupilRef.current.position.x = state.pupilX;
      rightPupilRef.current.position.y = state.pupilY;
    }

    // Iris follows pupil (slightly less)
    if (leftIrisRef.current) {
      leftIrisRef.current.position.x = state.pupilX * 0.6;
      leftIrisRef.current.position.y = state.pupilY * 0.6;
    }
    if (rightIrisRef.current) {
      rightIrisRef.current.position.x = state.pupilX * 0.6;
      rightIrisRef.current.position.y = state.pupilY * 0.6;
    }

    // Pupil size
    const pScale = state.pupilSize;
    if (leftPupilRef.current) leftPupilRef.current.scale.setScalar(pScale);
    if (rightPupilRef.current) rightPupilRef.current.scale.setScalar(pScale);

    // Eyelids = blink
    const eyelidScale = 1 - state.eyeOpenness;
    if (leftEyelidRef.current) {
      leftEyelidRef.current.scale.y = Math.max(0.01, eyelidScale);
      leftEyelidRef.current.visible = eyelidScale > 0.05;
    }
    if (rightEyelidRef.current) {
      rightEyelidRef.current.scale.y = Math.max(0.01, eyelidScale);
      rightEyelidRef.current.visible = eyelidScale > 0.05;
    }

    // Eye scale (openness)
    const eyeScale = 0.9 + state.eyeOpenness * 0.15;
    if (leftEyeRef.current) leftEyeRef.current.scale.setScalar(eyeScale);
    if (rightEyeRef.current) rightEyeRef.current.scale.setScalar(eyeScale);

    // Eyebrows
    if (leftEyebrowRef.current) {
      leftEyebrowRef.current.position.y = 0.7 + state.eyebrowHeight;
      leftEyebrowRef.current.rotation.z = -state.eyebrowTilt;
    }
    if (rightEyebrowRef.current) {
      rightEyebrowRef.current.position.y = 0.7 + state.eyebrowHeight;
      rightEyebrowRef.current.rotation.z = state.eyebrowTilt;
    }

    // Mouth — shape + smile curve
    if (mouthRef.current) {
      mouthRef.current.scale.x = 0.7 + state.mouthWidth * 0.5;
      mouthRef.current.scale.y = 0.25 + state.mouthOpenness * 1.8;
      // Subtle vertical shift for smile curve
      mouthRef.current.position.y = -0.32 + state.mouthCurve * 0.06;
    }

    // Cheek glow
    if (leftCheekRef.current) {
      (leftCheekRef.current.material as THREE.MeshStandardMaterial).opacity = 
        0.1 + state.cheekGlow * 0.5;
      (leftCheekRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 
        0.2 + state.cheekGlow * 0.6;
    }
    if (rightCheekRef.current) {
      (rightCheekRef.current.material as THREE.MeshStandardMaterial).opacity = 
        0.1 + state.cheekGlow * 0.5;
      (rightCheekRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 
        0.2 + state.cheekGlow * 0.6;
    }

    // Dynamic glow shell
    glowMat.opacity = state.glowIntensity * 0.15;
    glowMat.emissiveIntensity = 0.3 + state.glowIntensity * 0.8;

    // Pulse skin emissive
    skinMat.emissiveIntensity = 0.18 + state.glowIntensity * 0.25;
  });

  return (
    <group ref={headRef}>
      {/* Head — slightly egg-shaped for cuteness */}
      <mesh material={skinMat}>
        <sphereGeometry args={[1, 32, 32]} />
      </mesh>

      {/* Glow shell */}
      <mesh ref={glowShellRef} material={glowMat} scale={1.06}>
        <sphereGeometry args={[1, 32, 32]} />
      </mesh>

      {/* ===== LEFT EYE (BIG, round, expressive) ===== */}
      <group ref={leftEyeRef} position={[-0.34, 0.18, 0.82]}>
        {/* Eye white — larger for child-friendly look */}
        <mesh material={eyeWhiteMat}>
          <sphereGeometry args={[0.22, 24, 24]} />
        </mesh>
        {/* Iris — visible, colorful */}
        <mesh ref={leftIrisRef} position={[0, 0, 0.13]} material={irisMat}>
          <sphereGeometry args={[0.13, 20, 20]} />
        </mesh>
        {/* Pupil — large, dark */}
        <mesh ref={leftPupilRef} position={[0, 0, 0.18]} material={pupilMat}>
          <sphereGeometry args={[0.06, 16, 16]} />
        </mesh>
        {/* Highlight sparkle — gives life */}
        <mesh position={[0.05, 0.05, 0.2]} material={highlightMat}>
          <sphereGeometry args={[0.025, 8, 8]} />
        </mesh>
        {/* Second smaller highlight for extra cute */}
        <mesh position={[-0.03, -0.02, 0.2]} material={highlightMat} scale={0.5}>
          <sphereGeometry args={[0.02, 8, 8]} />
        </mesh>
        {/* Eyelid */}
        <mesh ref={leftEyelidRef} position={[0, 0.1, 0.06]} material={eyelidMat}>
          <boxGeometry args={[0.48, 0.22, 0.22]} />
        </mesh>
      </group>

      {/* ===== RIGHT EYE ===== */}
      <group ref={rightEyeRef} position={[0.34, 0.18, 0.82]}>
        <mesh material={eyeWhiteMat}>
          <sphereGeometry args={[0.22, 24, 24]} />
        </mesh>
        <mesh ref={rightIrisRef} position={[0, 0, 0.13]} material={irisMat}>
          <sphereGeometry args={[0.13, 20, 20]} />
        </mesh>
        <mesh ref={rightPupilRef} position={[0, 0, 0.18]} material={pupilMat}>
          <sphereGeometry args={[0.06, 16, 16]} />
        </mesh>
        <mesh position={[0.05, 0.05, 0.2]} material={highlightMat}>
          <sphereGeometry args={[0.025, 8, 8]} />
        </mesh>
        <mesh position={[-0.03, -0.02, 0.2]} material={highlightMat} scale={0.5}>
          <sphereGeometry args={[0.02, 8, 8]} />
        </mesh>
        <mesh ref={rightEyelidRef} position={[0, 0.1, 0.06]} material={eyelidMat}>
          <boxGeometry args={[0.48, 0.22, 0.22]} />
        </mesh>
      </group>

      {/* ===== EYEBROWS — soft rounded ===== */}
      <mesh ref={leftEyebrowRef} position={[-0.34, 0.7, 0.8]} material={eyebrowMat}>
        <capsuleGeometry args={[0.035, 0.22, 4, 8]} />
      </mesh>
      <mesh ref={rightEyebrowRef} position={[0.34, 0.7, 0.8]} material={eyebrowMat}>
        <capsuleGeometry args={[0.035, 0.22, 4, 8]} />
      </mesh>

      {/* ===== NOSE — small, cute button ===== */}
      <mesh position={[0, 0, 0.96]} material={noseMat}>
        <sphereGeometry args={[0.065, 12, 12]} />
      </mesh>

      {/* ===== MOUTH — expressive capsule ===== */}
      <mesh ref={mouthRef} position={[0, -0.32, 0.88]} material={mouthMat}>
        <capsuleGeometry args={[0.045, 0.16, 4, 8]} />
      </mesh>

      {/* ===== CHEEK BLUSH — warm glow ===== */}
      <mesh ref={leftCheekRef} position={[-0.58, -0.08, 0.65]} material={blushMat.clone()} rotation={[0, -0.4, 0]}>
        <circleGeometry args={[0.14, 16]} />
      </mesh>
      <mesh ref={rightCheekRef} position={[0.58, -0.08, 0.65]} material={blushMat.clone()} rotation={[0, 0.4, 0]}>
        <circleGeometry args={[0.14, 16]} />
      </mesh>

      {/* ===== EARS — round, cute, with inner pink ===== */}
      <group position={[-0.92, 0.15, 0]}>
        <mesh material={skinMat}>
          <sphereGeometry args={[0.16, 12, 12]} />
        </mesh>
        <mesh position={[0.03, 0, 0.05]} material={earInnerMat} scale={0.6}>
          <sphereGeometry args={[0.16, 12, 12]} />
        </mesh>
      </group>
      <group position={[0.92, 0.15, 0]}>
        <mesh material={skinMat}>
          <sphereGeometry args={[0.16, 12, 12]} />
        </mesh>
        <mesh position={[-0.03, 0, 0.05]} material={earInnerMat} scale={0.6}>
          <sphereGeometry args={[0.16, 12, 12]} />
        </mesh>
      </group>
    </group>
  );
}
