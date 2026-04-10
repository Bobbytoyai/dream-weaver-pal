import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { FaceState, useFaceAnimation } from "./useFaceAnimation";

interface FaceMeshProps {
  faceState: FaceState;
  gazeTarget: { x: number; y: number };
  audioAmplitude: number;
}

/** Stylized child-friendly 3D face */
export function FaceMesh({ faceState, gazeTarget, audioAmplitude }: FaceMeshProps) {
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

  const animation = useFaceAnimation(faceState, gazeTarget, audioAmplitude);

  // Materials
  const skinMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(35, 80%, 85%)"),
    roughness: 0.7,
    metalness: 0.05,
  }), []);

  const eyeWhiteMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.3,
    metalness: 0,
  }), []);

  const pupilMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(220, 70%, 35%)"),
    roughness: 0.2,
    metalness: 0.1,
    emissive: new THREE.Color("hsl(220, 60%, 20%)"),
    emissiveIntensity: 0.3,
  }), []);

  const irisMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(200, 80%, 55%)"),
    roughness: 0.2,
    metalness: 0.15,
    emissive: new THREE.Color("hsl(200, 70%, 40%)"),
    emissiveIntensity: 0.2,
  }), []);

  const eyebrowMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(30, 40%, 35%)"),
    roughness: 0.8,
  }), []);

  const mouthMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(350, 60%, 65%)"),
    roughness: 0.5,
  }), []);

  const eyelidMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(35, 75%, 80%)"),
    roughness: 0.7,
    metalness: 0.05,
  }), []);

  // Cheek blush material
  const blushMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(350, 70%, 80%)"),
    roughness: 0.8,
    transparent: true,
    opacity: 0.4,
  }), []);

  // Holographic glow material for highlight
  const glowMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(200, 100%, 80%)"),
    emissive: new THREE.Color("hsl(200, 100%, 60%)"),
    emissiveIntensity: 0.5,
    transparent: true,
    opacity: 0.15,
    roughness: 0,
    metalness: 0.8,
  }), []);

  useFrame((_, delta) => {
    const state = animation.update(delta);
    if (!headRef.current) return;

    // Head rotation
    headRef.current.rotation.x = state.headTiltX;
    headRef.current.rotation.y = state.headTiltY;
    headRef.current.rotation.z = state.headTiltZ;

    // Pupil gaze
    if (leftPupilRef.current) {
      leftPupilRef.current.position.x = state.pupilX;
      leftPupilRef.current.position.y = state.pupilY;
    }
    if (rightPupilRef.current) {
      rightPupilRef.current.position.x = state.pupilX;
      rightPupilRef.current.position.y = state.pupilY;
    }

    // Eyelids (blinking) - scale Y to close
    const eyelidScale = 1 - state.eyeOpenness;
    if (leftEyelidRef.current) {
      leftEyelidRef.current.scale.y = Math.max(0.01, eyelidScale);
      leftEyelidRef.current.visible = eyelidScale > 0.05;
    }
    if (rightEyelidRef.current) {
      rightEyelidRef.current.scale.y = Math.max(0.01, eyelidScale);
      rightEyelidRef.current.visible = eyelidScale > 0.05;
    }

    // Eye scale for expressiveness
    const eyeScale = 0.9 + state.eyeOpenness * 0.15;
    if (leftEyeRef.current) leftEyeRef.current.scale.setScalar(eyeScale);
    if (rightEyeRef.current) rightEyeRef.current.scale.setScalar(eyeScale);

    // Eyebrows
    if (leftEyebrowRef.current) {
      leftEyebrowRef.current.position.y = 0.65 + state.eyebrowHeight;
      leftEyebrowRef.current.rotation.z = -state.eyebrowTilt;
    }
    if (rightEyebrowRef.current) {
      rightEyebrowRef.current.position.y = 0.65 + state.eyebrowHeight;
      rightEyebrowRef.current.rotation.z = state.eyebrowTilt;
    }

    // Mouth
    if (mouthRef.current) {
      mouthRef.current.scale.x = 0.8 + state.mouthWidth * 0.4;
      mouthRef.current.scale.y = 0.3 + state.mouthOpenness * 1.5;
    }

    // Glow intensity
    glowMat.opacity = state.glowIntensity * 0.2;
    glowMat.emissiveIntensity = state.glowIntensity;
  });

  return (
    <group ref={headRef} position={[0, 0, 0]}>
      {/* Head - slightly elongated sphere */}
      <mesh material={skinMat}>
        <sphereGeometry args={[1, 32, 32]} />
      </mesh>

      {/* Holographic glow overlay */}
      <mesh material={glowMat} scale={1.02}>
        <sphereGeometry args={[1, 32, 32]} />
      </mesh>

      {/* Left Eye */}
      <group ref={leftEyeRef} position={[-0.32, 0.2, 0.85]}>
        {/* Eye white */}
        <mesh material={eyeWhiteMat}>
          <sphereGeometry args={[0.18, 24, 24]} />
        </mesh>
        {/* Iris */}
        <mesh position={[0, 0, 0.12]} material={irisMat}>
          <sphereGeometry args={[0.1, 20, 20]} />
        </mesh>
        {/* Pupil */}
        <mesh ref={leftPupilRef} position={[0, 0, 0.16]} material={pupilMat}>
          <sphereGeometry args={[0.05, 16, 16]} />
        </mesh>
        {/* Eye highlight */}
        <mesh position={[0.04, 0.04, 0.17]}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshStandardMaterial color={0xffffff} emissive={0xffffff} emissiveIntensity={1} />
        </mesh>
        {/* Eyelid */}
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
        <mesh position={[0.04, 0.04, 0.17]}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshStandardMaterial color={0xffffff} emissive={0xffffff} emissiveIntensity={1} />
        </mesh>
        <mesh ref={rightEyelidRef} position={[0, 0.08, 0.05]} material={eyelidMat}>
          <boxGeometry args={[0.4, 0.2, 0.2]} />
        </mesh>
      </group>

      {/* Left Eyebrow */}
      <mesh ref={leftEyebrowRef} position={[-0.32, 0.65, 0.82]} material={eyebrowMat}>
        <capsuleGeometry args={[0.03, 0.2, 4, 8]} />
        <mesh rotation={[0, 0, Math.PI / 2]} />
      </mesh>

      {/* Right Eyebrow */}
      <mesh ref={rightEyebrowRef} position={[0.32, 0.65, 0.82]} material={eyebrowMat}>
        <capsuleGeometry args={[0.03, 0.2, 4, 8]} />
      </mesh>

      {/* Nose - subtle bump */}
      <mesh position={[0, 0.02, 0.95]} material={skinMat}>
        <sphereGeometry args={[0.06, 12, 12]} />
      </mesh>

      {/* Mouth */}
      <mesh ref={mouthRef} position={[0, -0.3, 0.9]} material={mouthMat}>
        <capsuleGeometry args={[0.04, 0.15, 4, 8]} />
      </mesh>

      {/* Left Cheek Blush */}
      <mesh position={[-0.55, -0.05, 0.7]} material={blushMat} rotation={[0, -0.4, 0]}>
        <circleGeometry args={[0.12, 16]} />
      </mesh>

      {/* Right Cheek Blush */}
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
