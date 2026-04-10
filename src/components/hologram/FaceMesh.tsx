import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { FaceState, useFaceAnimation } from "./useFaceAnimation";

interface FaceMeshProps {
  faceState: FaceState;
  /** Pass the REF so we read .current every frame — not a stale snapshot */
  gazeRef: React.MutableRefObject<{ x: number; y: number }>;
  audioAmplitude: number;
}

/** Holographic child-friendly 3D face with dark-mode glow aesthetic */
export function FaceMesh({ faceState, gazeRef, audioAmplitude }: FaceMeshProps) {
  const headRef = useRef<THREE.Group>(null);
  const leftEyeRef = useRef<THREE.Group>(null);
  const rightEyeRef = useRef<THREE.Group>(null);
  const leftPupilRef = useRef<THREE.Mesh>(null);
  const rightPupilRef = useRef<THREE.Mesh>(null);
  const leftEyebrowRef = useRef<THREE.Mesh>(null);
  const rightEyebrowRef = useRef<THREE.Mesh>(null);
  const mouthRef = useRef<THREE.Mesh>(null);
  const leftEyelidRef = useRef<THREE.Mesh>(null);
  const rightEyelidRef = useRef<THREE.Mesh>(null);
  const glowShellRef = useRef<THREE.Mesh>(null);

  // Pass the gazeRef (not .current) so animation reads it every frame
  const animation = useFaceAnimation(faceState, gazeRef, audioAmplitude);

  // Holographic skin — translucent blue-white
  const skinMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(200, 30%, 70%)"),
    emissive: new THREE.Color("hsl(200, 50%, 25%)"),
    emissiveIntensity: 0.3,
    roughness: 0.4,
    metalness: 0.2,
    transparent: true,
    opacity: 0.85,
  }), []);

  const eyeWhiteMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xeeffff,
    emissive: new THREE.Color("hsl(200, 80%, 80%)"),
    emissiveIntensity: 0.2,
    roughness: 0.2,
    metalness: 0,
  }), []);

  const pupilMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(200, 100%, 30%)"),
    emissive: new THREE.Color("hsl(200, 100%, 50%)"),
    emissiveIntensity: 0.6,
    roughness: 0.1,
    metalness: 0.3,
  }), []);

  const irisMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(200, 100%, 55%)"),
    emissive: new THREE.Color("hsl(200, 100%, 45%)"),
    emissiveIntensity: 0.5,
    roughness: 0.15,
    metalness: 0.2,
  }), []);

  const eyebrowMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(200, 40%, 55%)"),
    emissive: new THREE.Color("hsl(200, 60%, 35%)"),
    emissiveIntensity: 0.2,
    roughness: 0.6,
  }), []);

  const mouthMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(200, 60%, 60%)"),
    emissive: new THREE.Color("hsl(200, 80%, 40%)"),
    emissiveIntensity: 0.3,
    roughness: 0.4,
  }), []);

  const eyelidMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(200, 30%, 60%)"),
    emissive: new THREE.Color("hsl(200, 40%, 25%)"),
    emissiveIntensity: 0.2,
    roughness: 0.5,
    metalness: 0.1,
  }), []);

  // Cheek blush — subtle holographic
  const blushMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(260, 50%, 65%)"),
    emissive: new THREE.Color("hsl(260, 60%, 40%)"),
    emissiveIntensity: 0.3,
    roughness: 0.6,
    transparent: true,
    opacity: 0.25,
  }), []);

  // Outer glow shell
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

  // Eye highlight
  const highlightMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 1.5,
  }), []);

  useFrame((_, delta) => {
    const state = animation.update(delta);
    if (!headRef.current) return;

    headRef.current.rotation.x = state.headTiltX;
    headRef.current.rotation.y = state.headTiltY;
    headRef.current.rotation.z = state.headTiltZ;

    if (leftPupilRef.current) {
      leftPupilRef.current.position.x = state.pupilX;
      leftPupilRef.current.position.y = state.pupilY;
    }
    if (rightPupilRef.current) {
      rightPupilRef.current.position.x = state.pupilX;
      rightPupilRef.current.position.y = state.pupilY;
    }

    const eyelidScale = 1 - state.eyeOpenness;
    if (leftEyelidRef.current) {
      leftEyelidRef.current.scale.y = Math.max(0.01, eyelidScale);
      leftEyelidRef.current.visible = eyelidScale > 0.05;
    }
    if (rightEyelidRef.current) {
      rightEyelidRef.current.scale.y = Math.max(0.01, eyelidScale);
      rightEyelidRef.current.visible = eyelidScale > 0.05;
    }

    const eyeScale = 0.9 + state.eyeOpenness * 0.15;
    if (leftEyeRef.current) leftEyeRef.current.scale.setScalar(eyeScale);
    if (rightEyeRef.current) rightEyeRef.current.scale.setScalar(eyeScale);

    if (leftEyebrowRef.current) {
      leftEyebrowRef.current.position.y = 0.65 + state.eyebrowHeight;
      leftEyebrowRef.current.rotation.z = -state.eyebrowTilt;
    }
    if (rightEyebrowRef.current) {
      rightEyebrowRef.current.position.y = 0.65 + state.eyebrowHeight;
      rightEyebrowRef.current.rotation.z = state.eyebrowTilt;
    }

    if (mouthRef.current) {
      mouthRef.current.scale.x = 0.8 + state.mouthWidth * 0.4;
      mouthRef.current.scale.y = 0.3 + state.mouthOpenness * 1.5;
    }

    // Dynamic glow
    glowMat.opacity = state.glowIntensity * 0.15;
    glowMat.emissiveIntensity = 0.3 + state.glowIntensity * 0.8;

    // Pulse skin emissive with state
    skinMat.emissiveIntensity = 0.2 + state.glowIntensity * 0.3;
  });

  return (
    <group ref={headRef}>
      {/* Head */}
      <mesh material={skinMat}>
        <sphereGeometry args={[1, 32, 32]} />
      </mesh>

      {/* Glow shell */}
      <mesh ref={glowShellRef} material={glowMat} scale={1.05}>
        <sphereGeometry args={[1, 32, 32]} />
      </mesh>

      {/* Left Eye */}
      <group ref={leftEyeRef} position={[-0.32, 0.2, 0.85]}>
        <mesh material={eyeWhiteMat}>
          <sphereGeometry args={[0.18, 24, 24]} />
        </mesh>
        <mesh position={[0, 0, 0.12]} material={irisMat}>
          <sphereGeometry args={[0.1, 20, 20]} />
        </mesh>
        <mesh ref={leftPupilRef} position={[0, 0, 0.16]} material={pupilMat}>
          <sphereGeometry args={[0.05, 16, 16]} />
        </mesh>
        <mesh position={[0.04, 0.04, 0.17]} material={highlightMat}>
          <sphereGeometry args={[0.02, 8, 8]} />
        </mesh>
        <mesh ref={leftEyelidRef} position={[0, 0.08, 0.05]} material={eyelidMat}>
          <boxGeometry args={[0.4, 0.2, 0.2]} />
        </mesh>
      </group>

      {/* Right Eye */}
      <group ref={rightEyeRef} position={[0.32, 0.2, 0.85]}>
        <mesh material={eyeWhiteMat}>
          <sphereGeometry args={[0.18, 24, 24]} />
        </mesh>
        <mesh position={[0, 0, 0.12]} material={irisMat}>
          <sphereGeometry args={[0.1, 20, 20]} />
        </mesh>
        <mesh ref={rightPupilRef} position={[0, 0, 0.16]} material={pupilMat}>
          <sphereGeometry args={[0.05, 16, 16]} />
        </mesh>
        <mesh position={[0.04, 0.04, 0.17]} material={highlightMat}>
          <sphereGeometry args={[0.02, 8, 8]} />
        </mesh>
        <mesh ref={rightEyelidRef} position={[0, 0.08, 0.05]} material={eyelidMat}>
          <boxGeometry args={[0.4, 0.2, 0.2]} />
        </mesh>
      </group>

      {/* Eyebrows */}
      <mesh ref={leftEyebrowRef} position={[-0.32, 0.65, 0.82]} material={eyebrowMat}>
        <capsuleGeometry args={[0.03, 0.2, 4, 8]} />
      </mesh>
      <mesh ref={rightEyebrowRef} position={[0.32, 0.65, 0.82]} material={eyebrowMat}>
        <capsuleGeometry args={[0.03, 0.2, 4, 8]} />
      </mesh>

      {/* Nose */}
      <mesh position={[0, 0.02, 0.95]} material={skinMat}>
        <sphereGeometry args={[0.06, 12, 12]} />
      </mesh>

      {/* Mouth */}
      <mesh ref={mouthRef} position={[0, -0.3, 0.9]} material={mouthMat}>
        <capsuleGeometry args={[0.04, 0.15, 4, 8]} />
      </mesh>

      {/* Cheek blush */}
      <mesh position={[-0.55, -0.05, 0.7]} material={blushMat} rotation={[0, -0.4, 0]}>
        <circleGeometry args={[0.12, 16]} />
      </mesh>
      <mesh position={[0.55, -0.05, 0.7]} material={blushMat} rotation={[0, 0.4, 0]}>
        <circleGeometry args={[0.12, 16]} />
      </mesh>

      {/* Ears */}
      <mesh position={[-0.9, 0.15, 0]} material={skinMat}>
        <sphereGeometry args={[0.15, 12, 12]} />
      </mesh>
      <mesh position={[0.9, 0.15, 0]} material={skinMat}>
        <sphereGeometry args={[0.15, 12, 12]} />
      </mesh>
    </group>
  );
}
