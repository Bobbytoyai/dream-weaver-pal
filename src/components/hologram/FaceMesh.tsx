/**
 * Bobby Cartoon Face — Complete Redesign
 * 
 * Cute round character with:
 * - Visible round head shape (soft blue-lavender)
 * - Huge Pixar-style eyes with detailed irises
 * - Small cute nose
 * - Expressive elastic mouth with teeth/tongue
 * - Rosy cheeks
 * - Ear bumps
 * - 60fps smooth animation
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
  const mouthGroupRef = useRef<THREE.Group>(null);
  const upperLipRef = useRef<THREE.Mesh>(null);
  const lowerLipRef = useRef<THREE.Mesh>(null);
  const mouthInteriorRef = useRef<THREE.Mesh>(null);
  const teethRef = useRef<THREE.Mesh>(null);
  const tongueRef = useRef<THREE.Mesh>(null);
  const leftEyelidRef = useRef<THREE.Mesh>(null);
  const rightEyelidRef = useRef<THREE.Mesh>(null);
  const leftCheekRef = useRef<THREE.Mesh>(null);
  const rightCheekRef = useRef<THREE.Mesh>(null);
  const leftHighlight1Ref = useRef<THREE.Mesh>(null);
  const rightHighlight1Ref = useRef<THREE.Mesh>(null);
  const leftHighlight2Ref = useRef<THREE.Mesh>(null);
  const rightHighlight2Ref = useRef<THREE.Mesh>(null);

  const squashRef = useRef({ scaleX: 1, scaleY: 1, velocity: 0 });
  const animation = useFaceAnimation(faceState, gazeRef, audioAmplitude, viseme, emotionIntensity);

  // ─── Materials ──────────────────────────────────────────

  // Head — soft warm blue-lavender, like a plush toy
  const headMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(220, 55%, 82%)"),
    emissive: new THREE.Color("hsl(225, 40%, 65%)"),
    emissiveIntensity: 0.15,
    roughness: 0.55,
    metalness: 0,
  }), []);

  // Eye whites — bright, clean
  const eyeWhiteMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("#f8faff"),
    emissive: new THREE.Color("hsl(220, 60%, 96%)"),
    emissiveIntensity: 0.35,
    roughness: 0.02,
    metalness: 0,
  }), []);

  // Iris — deep vivid blue
  const irisMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(210, 85%, 50%)"),
    emissive: new THREE.Color("hsl(215, 90%, 45%)"),
    emissiveIntensity: 0.6,
    roughness: 0.03,
    metalness: 0.08,
  }), []);

  // Inner iris ring — cyan glow
  const irisInnerMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(190, 100%, 60%)"),
    emissive: new THREE.Color("hsl(195, 95%, 55%)"),
    emissiveIntensity: 0.75,
    roughness: 0.03,
    transparent: true,
    opacity: 0.9,
  }), []);

  // Pupil — deep dark
  const pupilMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(245, 60%, 8%)"),
    emissive: new THREE.Color("hsl(235, 70%, 18%)"),
    emissiveIntensity: 0.2,
    roughness: 0.02,
  }), []);

  // Eye highlight — bright white sparkle
  const highlightMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 3.5,
    transparent: true,
    opacity: 0.95,
  }), []);

  // Eyelid
  const eyelidMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(220, 45%, 75%)"),
    emissive: new THREE.Color("hsl(225, 35%, 60%)"),
    emissiveIntensity: 0.12,
    roughness: 0.4,
  }), []);

  // Eyebrow — darker
  const eyebrowMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(225, 30%, 35%)"),
    emissive: new THREE.Color("hsl(230, 25%, 25%)"),
    emissiveIntensity: 0.08,
    roughness: 0.4,
  }), []);

  // Nose — slightly darker than head
  const noseMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(215, 50%, 72%)"),
    emissive: new THREE.Color("hsl(220, 40%, 60%)"),
    emissiveIntensity: 0.15,
    roughness: 0.45,
  }), []);

  // Upper lip
  const upperLipMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(348, 65%, 58%)"),
    emissive: new THREE.Color("hsl(345, 70%, 42%)"),
    emissiveIntensity: 0.4,
    roughness: 0.22,
    metalness: 0.04,
  }), []);

  // Lower lip
  const lowerLipMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(350, 60%, 63%)"),
    emissive: new THREE.Color("hsl(348, 65%, 45%)"),
    emissiveIntensity: 0.35,
    roughness: 0.25,
  }), []);

  // Mouth interior
  const mouthInteriorMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(348, 45%, 20%)"),
    emissive: new THREE.Color("hsl(345, 35%, 12%)"),
    emissiveIntensity: 0.12,
    roughness: 0.6,
  }), []);

  // Teeth
  const teethMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(40, 10%, 95%)"),
    emissive: new THREE.Color("hsl(40, 8%, 88%)"),
    emissiveIntensity: 0.18,
    roughness: 0.15,
  }), []);

  // Tongue
  const tongueMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(355, 60%, 55%)"),
    emissive: new THREE.Color("hsl(352, 55%, 38%)"),
    emissiveIntensity: 0.2,
    roughness: 0.35,
  }), []);

  // Cheek blush — rosy warm
  const blushMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(340, 65%, 72%)"),
    emissive: new THREE.Color("hsl(338, 70%, 58%)"),
    emissiveIntensity: 0.45,
    roughness: 0.5,
    transparent: true,
    opacity: 0.5,
  }), []);

  // Ear — same as head but slightly warmer
  const earMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(218, 50%, 78%)"),
    emissive: new THREE.Color("hsl(222, 38%, 62%)"),
    emissiveIntensity: 0.12,
    roughness: 0.5,
  }), []);

  // ─── Frame Update ──────────────────────────────────────────

  useFrame((_, delta) => {
    const state = animation.update(delta);
    if (!rootRef.current) return;

    rootRef.current.rotation.x = state.headTiltX;
    rootRef.current.rotation.y = state.headTiltY;
    rootRef.current.rotation.z = state.headTiltZ;

    // ─── Pupils ───
    const pupilTravel = 0.08;
    [leftPupilRef, rightPupilRef].forEach(ref => {
      if (ref.current) {
        ref.current.position.x = state.pupilX * pupilTravel * 8;
        ref.current.position.y = state.pupilY * pupilTravel * 8;
      }
    });
    [leftIrisRef, rightIrisRef].forEach(ref => {
      if (ref.current) {
        ref.current.position.x = state.pupilX * 0.5;
        ref.current.position.y = state.pupilY * 0.5 - 0.01;
      }
    });
    const pScale = state.pupilSize;
    if (leftPupilRef.current) leftPupilRef.current.scale.setScalar(pScale);
    if (rightPupilRef.current) rightPupilRef.current.scale.setScalar(pScale);

    // ─── Eyelids ───
    const eyelidScale = 1 - state.eyeOpenness;
    [leftEyelidRef, rightEyelidRef].forEach(ref => {
      if (ref.current) {
        ref.current.scale.y = Math.max(0.01, eyelidScale);
        ref.current.visible = eyelidScale > 0.04;
      }
    });

    // ─── Eye scale + happy squish ───
    const eyeScale = 0.85 + state.eyeOpenness * 0.2;
    const happySquish = state.mouthCurve > 0.3 ? 1 + (state.mouthCurve - 0.3) * 0.12 : 1;
    [leftEyeRef, rightEyeRef].forEach(ref => {
      if (ref.current) {
        ref.current.scale.set(eyeScale * happySquish, eyeScale / happySquish, eyeScale);
      }
    });

    // ─── Eyebrows ───
    const browLift = state.eyebrowHeight * 1.2;
    if (leftEyebrowRef.current) {
      leftEyebrowRef.current.position.y = 0.95 + browLift;
      leftEyebrowRef.current.rotation.z = -state.eyebrowTilt * 1.5;
    }
    if (rightEyebrowRef.current) {
      rightEyebrowRef.current.position.y = 0.95 + browLift;
      rightEyebrowRef.current.rotation.z = state.eyebrowTilt * 1.5;
    }

    // ─── MOUTH squash & stretch ───
    const sq = squashRef.current;
    const targetStretchX = 1 + state.mouthWidth * 0.5 + state.mouthCurve * 0.25;
    const targetStretchY = 1 + state.mouthOpenness * 1.6;
    const springK = 18;
    const damping = 0.75;
    const dx = targetStretchX - sq.scaleX;
    const dy = targetStretchY - sq.scaleY;
    sq.velocity += (dx + dy) * springK * delta;
    sq.velocity *= Math.pow(1 - damping, delta * 60);
    sq.scaleX += dx * springK * delta + sq.velocity * delta * 0.3;
    sq.scaleY += dy * springK * delta - sq.velocity * delta * 0.2;
    sq.scaleX = Math.max(0.3, Math.min(2.5, sq.scaleX));
    sq.scaleY = Math.max(0.15, Math.min(3.5, sq.scaleY));

    if (mouthGroupRef.current) {
      mouthGroupRef.current.position.y = -0.52 + state.mouthCurve * 0.08 - state.jawDrop * 0.05;
      mouthGroupRef.current.position.z = 0.72 + state.mouthOpenness * 0.03;
    }

    if (upperLipRef.current) {
      upperLipRef.current.scale.x = 0.4 * sq.scaleX;
      upperLipRef.current.scale.y = 0.1 + state.mouthOpenness * 0.12;
      upperLipRef.current.position.y = state.mouthOpenness * 0.06 + state.mouthCurve * 0.03;
      upperLipRef.current.rotation.z = state.mouthCurve * 0.1;
    }
    if (lowerLipRef.current) {
      lowerLipRef.current.scale.x = 0.38 * sq.scaleX;
      lowerLipRef.current.scale.y = 0.09 + state.mouthOpenness * 0.1;
      lowerLipRef.current.position.y = -state.mouthOpenness * 0.18 - state.jawDrop * 0.1;
      lowerLipRef.current.rotation.z = -state.mouthCurve * 0.06;
    }

    const mouthOpen = state.mouthOpenness > 0.06;
    if (mouthInteriorRef.current) {
      mouthInteriorRef.current.visible = mouthOpen;
      mouthInteriorRef.current.scale.x = 0.28 * sq.scaleX;
      mouthInteriorRef.current.scale.y = 0.06 + state.mouthOpenness * 1.0;
      mouthInteriorRef.current.scale.z = 0.6 + state.mouthRound * 0.35;
    }
    if (teethRef.current) {
      teethRef.current.visible = state.mouthOpenness > 0.1;
      teethRef.current.scale.x = 0.24 * sq.scaleX;
      teethRef.current.scale.y = 0.03 + state.mouthOpenness * 0.06;
      teethRef.current.position.y = state.mouthOpenness * 0.03;
    }
    if (tongueRef.current) {
      const showTongue = state.mouthOpenness > 0.25;
      tongueRef.current.visible = showTongue;
      if (showTongue) {
        tongueRef.current.scale.x = 0.13 * sq.scaleX;
        tongueRef.current.scale.y = 0.05 + state.mouthOpenness * 0.06;
        tongueRef.current.position.y = -state.mouthOpenness * 0.12 - 0.02;
        tongueRef.current.position.x = Math.sin(performance.now() * 0.008) * 0.008;
      }
    }

    // ─── Cheeks ───
    const smileIntensity = Math.max(0, state.mouthCurve * 2);
    [leftCheekRef, rightCheekRef].forEach(ref => {
      if (ref.current) {
        const mat = ref.current.material as THREE.MeshStandardMaterial;
        mat.opacity = 0.2 + state.cheekGlow * 0.5 + smileIntensity * 0.15;
        mat.emissiveIntensity = 0.3 + state.cheekGlow * 0.5;
        const puff = 1 + smileIntensity * 0.18;
        ref.current.scale.set(puff, puff * 0.85, 1);
        ref.current.position.y = -0.3 + smileIntensity * 0.05;
      }
    });

    // ─── Iris glow ───
    irisMat.emissiveIntensity = 0.4 + state.irisGlow * 0.5;
    irisInnerMat.emissiveIntensity = 0.5 + state.irisGlow * 0.6;

    // ─── Sparkle highlights ───
    const sparkleOpacity = 0.6 + state.eyeSparkle * 0.4;
    [leftHighlight1Ref, rightHighlight1Ref].forEach(ref => {
      if (ref.current) {
        (ref.current.material as THREE.MeshStandardMaterial).opacity = sparkleOpacity;
        ref.current.scale.setScalar(0.9 + state.eyeSparkle * 0.2);
      }
    });
    [leftHighlight2Ref, rightHighlight2Ref].forEach(ref => {
      if (ref.current) {
        (ref.current.material as THREE.MeshStandardMaterial).opacity = sparkleOpacity * 0.65;
      }
    });
  });

  // ─── Geometry Constants ────────────────────────────────────
  const eyeSpacing = 0.55;
  const eyeY = 0.18;
  const eyeRadius = 0.42;

  const renderEye = (
    side: "left" | "right",
    eyeRef: React.RefObject<THREE.Group>,
    pupilRef: React.RefObject<THREE.Mesh>,
    irisRef: React.RefObject<THREE.Mesh>,
    eyelidRef: React.RefObject<THREE.Mesh>,
    hl1Ref: React.RefObject<THREE.Mesh>,
    hl2Ref: React.RefObject<THREE.Mesh>,
  ) => {
    const xPos = side === "left" ? -eyeSpacing : eyeSpacing;
    return (
      <group ref={eyeRef} position={[xPos, eyeY, 0.55]} key={side}>
        {/* Eye white — oval, slightly tall */}
        <mesh material={eyeWhiteMat} scale={[1, 1.15, 0.6]}>
          <sphereGeometry args={[eyeRadius, 48, 48]} />
        </mesh>

        {/* Iris — large, vivid */}
        <mesh ref={irisRef} position={[0, -0.01, 0.18]} material={irisMat}>
          <sphereGeometry args={[0.28, 32, 32]} />
        </mesh>

        {/* Inner iris ring */}
        <mesh position={[0, 0.01, 0.22]} material={irisInnerMat}>
          <sphereGeometry args={[0.16, 24, 24]} />
        </mesh>

        {/* Pupil */}
        <mesh ref={pupilRef} position={[0, 0, 0.28]} material={pupilMat}>
          <sphereGeometry args={[0.1, 24, 24]} />
        </mesh>

        {/* Main highlight — big, bright */}
        <mesh ref={hl1Ref} position={[0.08, 0.11, 0.32]} material={highlightMat.clone()}>
          <sphereGeometry args={[0.065, 16, 16]} />
        </mesh>

        {/* Secondary highlight — small */}
        <mesh ref={hl2Ref} position={[-0.06, -0.06, 0.31]} material={highlightMat.clone()} scale={0.45}>
          <sphereGeometry args={[0.045, 12, 12]} />
        </mesh>

        {/* Eyelid */}
        <mesh ref={eyelidRef} position={[0, 0.26, 0.1]} material={eyelidMat}>
          <boxGeometry args={[0.95, 0.4, 0.42]} />
        </mesh>
      </group>
    );
  };

  return (
    <group ref={rootRef}>
      {/* ===== HEAD — Round soft shape ===== */}
      <mesh material={headMat} position={[0, 0.05, 0]}>
        <sphereGeometry args={[1.25, 64, 64]} />
      </mesh>

      {/* ===== EARS — Small round bumps ===== */}
      <mesh material={earMat} position={[-1.15, 0.25, 0]} scale={[0.28, 0.35, 0.2]}>
        <sphereGeometry args={[1, 24, 24]} />
      </mesh>
      <mesh material={earMat} position={[1.15, 0.25, 0]} scale={[0.28, 0.35, 0.2]}>
        <sphereGeometry args={[1, 24, 24]} />
      </mesh>

      {/* Inner ear detail — slightly pinker */}
      <mesh position={[-1.15, 0.25, 0.05]} scale={[0.16, 0.22, 0.12]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial
          color="hsl(340, 45%, 78%)"
          emissive="hsl(338, 40%, 65%)"
          emissiveIntensity={0.15}
          roughness={0.5}
        />
      </mesh>
      <mesh position={[1.15, 0.25, 0.05]} scale={[0.16, 0.22, 0.12]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial
          color="hsl(340, 45%, 78%)"
          emissive="hsl(338, 40%, 65%)"
          emissiveIntensity={0.15}
          roughness={0.5}
        />
      </mesh>

      {/* ===== EYES ===== */}
      {renderEye("left", leftEyeRef, leftPupilRef, leftIrisRef, leftEyelidRef,
        leftHighlight1Ref, leftHighlight2Ref)}
      {renderEye("right", rightEyeRef, rightPupilRef, rightIrisRef, rightEyelidRef,
        rightHighlight1Ref, rightHighlight2Ref)}

      {/* ===== EYEBROWS — Thick, expressive ===== */}
      <mesh ref={leftEyebrowRef} position={[-eyeSpacing, 0.95, 0.65]} material={eyebrowMat} rotation={[0, 0, 0.15]}>
        <capsuleGeometry args={[0.04, 0.3, 8, 14]} />
      </mesh>
      <mesh ref={rightEyebrowRef} position={[eyeSpacing, 0.95, 0.65]} material={eyebrowMat} rotation={[0, 0, -0.15]}>
        <capsuleGeometry args={[0.04, 0.3, 8, 14]} />
      </mesh>

      {/* ===== NOSE — Small cute bump ===== */}
      <mesh position={[0, -0.18, 0.95]} material={noseMat} scale={[1, 0.85, 0.7]}>
        <sphereGeometry args={[0.12, 24, 24]} />
      </mesh>
      {/* Nose highlight */}
      <mesh position={[0.02, -0.14, 1.04]}>
        <sphereGeometry args={[0.03, 12, 12]} />
        <meshStandardMaterial
          color={0xffffff}
          emissive={0xffffff}
          emissiveIntensity={2}
          transparent
          opacity={0.5}
        />
      </mesh>

      {/* ===== MOUTH ===== */}
      <group ref={mouthGroupRef} position={[0, -0.52, 0.72]}>
        <mesh ref={upperLipRef} position={[0, 0.02, 0]} material={upperLipMat}>
          <capsuleGeometry args={[0.05, 0.18, 12, 20]} />
        </mesh>
        <mesh ref={lowerLipRef} position={[0, -0.025, 0.005]} material={lowerLipMat}>
          <capsuleGeometry args={[0.045, 0.16, 12, 20]} />
        </mesh>
        <mesh ref={mouthInteriorRef} position={[0, -0.01, -0.015]} material={mouthInteriorMat}>
          <sphereGeometry args={[0.07, 16, 16]} />
        </mesh>
        <mesh ref={teethRef} position={[0, 0.012, 0.008]} material={teethMat}>
          <boxGeometry args={[0.15, 0.02, 0.018]} />
        </mesh>
        <mesh ref={tongueRef} position={[0, -0.025, -0.004]} material={tongueMat}>
          <sphereGeometry args={[0.04, 12, 12]} />
        </mesh>
      </group>

      {/* ===== CHEEK BLUSH ===== */}
      <mesh ref={leftCheekRef} position={[-0.78, -0.3, 0.7]} material={blushMat.clone()} rotation={[0, 0.3, 0]}>
        <circleGeometry args={[0.2, 32]} />
      </mesh>
      <mesh ref={rightCheekRef} position={[0.78, -0.3, 0.7]} material={blushMat.clone()} rotation={[0, -0.3, 0]}>
        <circleGeometry args={[0.2, 32]} />
      </mesh>

      {/* ===== FOREHEAD HIGHLIGHT — soft top glow ===== */}
      <mesh position={[0, 0.7, 0.85]}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial
          color="hsl(220, 50%, 90%)"
          emissive="hsl(215, 60%, 85%)"
          emissiveIntensity={0.4}
          transparent
          opacity={0.3}
          roughness={0.3}
        />
      </mesh>
    </group>
  );
}
