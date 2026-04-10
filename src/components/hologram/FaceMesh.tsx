/**
 * Emotional Face Engine — Eyes + Eyebrows + Mouth Only
 * Style: Anime / Pixar / Disney cartoon — ultra expressive
 * NO nose, NO full face — just the expressive trio
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
  const mouthOuterRef = useRef<THREE.Mesh>(null);
  const mouthInnerRef = useRef<THREE.Mesh>(null);
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
  // Extra sparkle refs for living eyes
  const leftSparkle1 = useRef<THREE.Mesh>(null);
  const rightSparkle1 = useRef<THREE.Mesh>(null);
  const leftSparkle2 = useRef<THREE.Mesh>(null);
  const rightSparkle2 = useRef<THREE.Mesh>(null);

  const animation = useFaceAnimation(faceState, gazeRef, audioAmplitude, viseme, emotionIntensity);

  // ─── Materials: Ultra Cartoon Kawaii ────────────────────────

  // Eye whites — pure bright, slightly warm
  const eyeWhiteMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("#f8faff"),
    emissive: new THREE.Color("hsl(220, 60%, 96%)"),
    emissiveIntensity: 0.4, roughness: 0.02, metalness: 0,
  }), []);

  // Iris outer — rich deep blue-violet anime gradient
  const irisMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(230, 75%, 45%)"),
    emissive: new THREE.Color("hsl(220, 90%, 50%)"),
    emissiveIntensity: 0.7, roughness: 0.03, metalness: 0.1,
  }), []);

  // Iris inner ring — bright cyan sparkle depth
  const irisInnerMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(190, 100%, 60%)"),
    emissive: new THREE.Color("hsl(195, 95%, 55%)"),
    emissiveIntensity: 0.85, roughness: 0.03, metalness: 0.06,
    transparent: true, opacity: 0.9,
  }), []);

  // Iris mid ring — teal/green for depth
  const irisMidMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(210, 80%, 55%)"),
    emissive: new THREE.Color("hsl(205, 85%, 48%)"),
    emissiveIntensity: 0.6, roughness: 0.04, metalness: 0.08,
    transparent: true, opacity: 0.85,
  }), []);

  // Pupil — deep dark with violet glow
  const pupilMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(245, 60%, 8%)"),
    emissive: new THREE.Color("hsl(235, 70%, 18%)"),
    emissiveIntensity: 0.25, roughness: 0.02, metalness: 0.06,
  }), []);

  // Big main highlight — bright white
  const highlightMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 3.5,
    transparent: true, opacity: 0.97,
  }), []);

  // Star sparkles — magical floating dots
  const starMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xffffff, emissive: 0xeeeeff, emissiveIntensity: 2.5,
    transparent: true, opacity: 0.8,
  }), []);

  // Eyelash — soft dark, thick cartoon lashes
  const lashMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(240, 30%, 16%)"),
    emissive: new THREE.Color("hsl(245, 28%, 10%)"),
    emissiveIntensity: 0.08, roughness: 0.5,
  }), []);

  // Eyebrow — warm, rounded, expressive
  const eyebrowMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(240, 20%, 22%)"),
    emissive: new THREE.Color("hsl(245, 22%, 14%)"),
    emissiveIntensity: 0.1, roughness: 0.4,
  }), []);

  // Mouth outer — soft coral-pink, cartoon
  const mouthMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(348, 70%, 52%)"),
    emissive: new THREE.Color("hsl(345, 75%, 38%)"),
    emissiveIntensity: 0.42, roughness: 0.25,
  }), []);

  // Mouth inner — warmer pink for depth
  const mouthInnerMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(352, 75%, 60%)"),
    emissive: new THREE.Color("hsl(350, 80%, 45%)"),
    emissiveIntensity: 0.35, roughness: 0.25,
  }), []);

  // Cheek blush — peachy-pink anime blush
  const blushMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(338, 60%, 72%)"),
    emissive: new THREE.Color("hsl(335, 70%, 55%)"),
    emissiveIntensity: 0.5, roughness: 0.5,
    transparent: true, opacity: 0.45,
  }), []);

  // Eyelid — lavender tone for blinks
  const eyelidMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(248, 20%, 80%)"),
    emissive: new THREE.Color("hsl(248, 16%, 60%)"),
    emissiveIntensity: 0.12, roughness: 0.4,
  }), []);

  // ─── Frame Update ──────────────────────────────────────────

  useFrame((_, delta) => {
    const state = animation.update(delta);
    if (!rootRef.current) return;

    // Head tilt
    rootRef.current.rotation.x = state.headTiltX;
    rootRef.current.rotation.y = state.headTiltY;
    rootRef.current.rotation.z = state.headTiltZ;

    // ─── Pupils follow gaze ───
    const pupilTravel = 0.1; // exaggerated travel for cartoon
    [leftPupilRef, rightPupilRef].forEach(ref => {
      if (ref.current) {
        ref.current.position.x = state.pupilX * pupilTravel * 8;
        ref.current.position.y = state.pupilY * pupilTravel * 8;
      }
    });

    // ─── Iris follows gaze (less than pupil) ───
    [leftIrisRef, rightIrisRef].forEach(ref => {
      if (ref.current) {
        ref.current.position.x = state.pupilX * 0.6;
        ref.current.position.y = state.pupilY * 0.6 - 0.02;
      }
    });

    // ─── Pupil size (dilates with excitement) ───
    const pScale = state.pupilSize;
    if (leftPupilRef.current) leftPupilRef.current.scale.setScalar(pScale);
    if (rightPupilRef.current) rightPupilRef.current.scale.setScalar(pScale);

    // ─── Eyelids (blink) ───
    const eyelidScale = 1 - state.eyeOpenness;
    [leftEyelidRef, rightEyelidRef].forEach(ref => {
      if (ref.current) {
        ref.current.scale.y = Math.max(0.01, eyelidScale);
        ref.current.visible = eyelidScale > 0.04;
      }
    });

    // ─── Eye scale (bigger when excited) ───
    const eyeScale = 0.82 + state.eyeOpenness * 0.25;
    if (leftEyeRef.current) leftEyeRef.current.scale.setScalar(eyeScale);
    if (rightEyeRef.current) rightEyeRef.current.scale.setScalar(eyeScale);

    // ─── Lashes follow eye scale ───
    if (leftLashRef.current) leftLashRef.current.scale.x = eyeScale;
    if (rightLashRef.current) rightLashRef.current.scale.x = eyeScale;

    // ─── Eyebrows — very mobile, exaggerated ───
    const browLift = state.eyebrowHeight * 1.3; // exaggerate
    if (leftEyebrowRef.current) {
      leftEyebrowRef.current.position.y = 0.78 + browLift;
      leftEyebrowRef.current.rotation.z = -state.eyebrowTilt * 1.5;
    }
    if (rightEyebrowRef.current) {
      rightEyebrowRef.current.position.y = 0.78 + browLift;
      rightEyebrowRef.current.rotation.z = state.eyebrowTilt * 1.5;
    }

    // ─── Mouth — exaggerated cartoon shapes ───
    if (mouthGroupRef.current) {
      mouthGroupRef.current.position.y = -0.58 + state.mouthCurve * 0.08 - state.jawDrop * 0.04;
      mouthGroupRef.current.position.z = 0.06 + state.mouthOpenness * 0.03;
    }
    if (mouthOuterRef.current) {
      // Wider range for cartoon effect
      mouthOuterRef.current.scale.x = 0.5 + state.mouthWidth * 0.7;
      mouthOuterRef.current.scale.y = 0.18 + state.mouthOpenness * 2.2;
      mouthOuterRef.current.scale.z = 0.9 + state.mouthRound * 0.5;
    }
    if (mouthInnerRef.current) {
      mouthInnerRef.current.scale.x = 0.35 + state.mouthWidth * 0.5;
      mouthInnerRef.current.scale.y = 0.1 + state.mouthOpenness * 1.8;
      mouthInnerRef.current.visible = state.mouthOpenness > 0.08;
    }

    // ─── Cheek blush intensity ───
    [leftCheekRef, rightCheekRef].forEach(ref => {
      if (ref.current) {
        const mat = ref.current.material as THREE.MeshStandardMaterial;
        mat.opacity = 0.15 + state.cheekGlow * 0.55;
        mat.emissiveIntensity = 0.35 + state.cheekGlow * 0.55;
      }
    });

    // ─── Iris glow (alive, shimmering) ───
    irisMat.emissiveIntensity = 0.5 + state.irisGlow * 0.6;
    irisInnerMat.emissiveIntensity = 0.6 + state.irisGlow * 0.7;
    irisMidMat.emissiveIntensity = 0.4 + state.irisGlow * 0.5;

    // ─── Sparkle highlights pulse ───
    const sparkleOpacity = 0.55 + state.eyeSparkle * 0.45;
    [leftHighlight1Ref, rightHighlight1Ref].forEach(ref => {
      if (ref.current) {
        (ref.current.material as THREE.MeshStandardMaterial).opacity = sparkleOpacity;
        ref.current.scale.setScalar(0.85 + state.eyeSparkle * 0.25);
      }
    });
    [leftHighlight2Ref, rightHighlight2Ref].forEach(ref => {
      if (ref.current) {
        (ref.current.material as THREE.MeshStandardMaterial).opacity = sparkleOpacity * 0.7;
      }
    });

    // ─── Floating star sparkles animate ───
    const t = performance.now() * 0.003;
    [leftSparkle1, rightSparkle1].forEach(ref => {
      if (ref.current) {
        ref.current.position.y = 0.05 + Math.sin(t * 1.3) * 0.04;
        ref.current.scale.setScalar(0.2 + Math.sin(t * 2.1) * 0.1);
        (ref.current.material as THREE.MeshStandardMaterial).opacity = 0.5 + Math.sin(t * 1.8) * 0.3;
      }
    });
    [leftSparkle2, rightSparkle2].forEach(ref => {
      if (ref.current) {
        ref.current.position.x = -0.04 + Math.sin(t * 0.9) * 0.03;
        ref.current.scale.setScalar(0.15 + Math.cos(t * 2.5) * 0.08);
        (ref.current.material as THREE.MeshStandardMaterial).opacity = 0.4 + Math.cos(t * 2.0) * 0.25;
      }
    });
  });

  // ─── Geometry constants ────────────────────────────────────
  const eyeSpacing = 0.65;
  const eyeY = 0.08;
  const eyeRadius = 0.46; // BIGGER anime eyes

  const renderEye = (
    side: "left" | "right",
    eyeRef: React.RefObject<THREE.Group>,
    pupilRef: React.RefObject<THREE.Mesh>,
    irisRef: React.RefObject<THREE.Mesh>,
    eyelidRef: React.RefObject<THREE.Mesh>,
    lashRef: React.RefObject<THREE.Mesh>,
    hl1Ref: React.RefObject<THREE.Mesh>,
    hl2Ref: React.RefObject<THREE.Mesh>,
    sp1Ref: React.RefObject<THREE.Mesh>,
    sp2Ref: React.RefObject<THREE.Mesh>,
  ) => {
    const xPos = side === "left" ? -eyeSpacing : eyeSpacing;
    return (
      <group ref={eyeRef} position={[xPos, eyeY, 0]} key={side}>
        {/* Eye white — large oval, slightly taller than wide */}
        <mesh material={eyeWhiteMat} scale={[1, 1.1, 0.65]}>
          <sphereGeometry args={[eyeRadius, 48, 48]} />
        </mesh>
        {/* Iris outer — deep blue-violet */}
        <mesh ref={irisRef} position={[0, -0.02, 0.22]} material={irisMat}>
          <sphereGeometry args={[0.30, 36, 36]} />
        </mesh>
        {/* Iris mid — blue layer for depth */}
        <mesh position={[0, 0.0, 0.26]} material={irisMidMat}>
          <sphereGeometry args={[0.20, 28, 28]} />
        </mesh>
        {/* Iris inner — bright cyan sparkle */}
        <mesh position={[0, 0.02, 0.30]} material={irisInnerMat}>
          <sphereGeometry args={[0.14, 24, 24]} />
        </mesh>
        {/* Pupil — deep dark, big */}
        <mesh ref={pupilRef} position={[0, 0, 0.34]} material={pupilMat}>
          <sphereGeometry args={[0.11, 24, 24]} />
        </mesh>
        {/* Main highlight — big bright circle (top-right, Disney style) */}
        <mesh ref={hl1Ref} position={[0.09, 0.12, 0.38]} material={highlightMat.clone()}>
          <sphereGeometry args={[0.07, 16, 16]} />
        </mesh>
        {/* Second highlight — smaller, bottom-left */}
        <mesh ref={hl2Ref} position={[-0.07, -0.07, 0.37]} material={highlightMat.clone()} scale={0.5}>
          <sphereGeometry args={[0.05, 12, 12]} />
        </mesh>
        {/* Floating star sparkles (animated in useFrame) */}
        <mesh ref={sp1Ref} position={[0.14, 0.05, 0.35]} material={starMat.clone()} scale={0.25}>
          <sphereGeometry args={[0.03, 8, 8]} />
        </mesh>
        <mesh ref={sp2Ref} position={[-0.04, 0.14, 0.34]} material={starMat.clone()} scale={0.2}>
          <sphereGeometry args={[0.025, 8, 8]} />
        </mesh>
        {/* Extra tiny sparkle */}
        <mesh position={[0.06, -0.11, 0.36]} material={starMat} scale={0.15}>
          <sphereGeometry args={[0.02, 8, 8]} />
        </mesh>
        {/* Eyelash — thick curved bar at top (cartoon style) */}
        <mesh ref={lashRef} position={[0, 0.32, 0.12]} material={lashMat}>
          <capsuleGeometry args={[0.05, 0.44, 8, 14]} />
        </mesh>
        {/* Eyelid (for blink) */}
        <mesh ref={eyelidRef} position={[0, 0.24, 0.14]} material={eyelidMat}>
          <boxGeometry args={[1.0, 0.45, 0.45]} />
        </mesh>
      </group>
    );
  };

  return (
    <group ref={rootRef}>
      {/* ===== LEFT EYE ===== */}
      {renderEye("left", leftEyeRef, leftPupilRef, leftIrisRef, leftEyelidRef, leftLashRef,
        leftHighlight1Ref, leftHighlight2Ref, leftSparkle1, leftSparkle2)}

      {/* ===== RIGHT EYE ===== */}
      {renderEye("right", rightEyeRef, rightPupilRef, rightIrisRef, rightEyelidRef, rightLashRef,
        rightHighlight1Ref, rightHighlight2Ref, rightSparkle1, rightSparkle2)}

      {/* ===== EYEBROWS — thick, rounded, very expressive ===== */}
      <mesh ref={leftEyebrowRef} position={[-eyeSpacing, 0.78, 0.2]} material={eyebrowMat}>
        <capsuleGeometry args={[0.032, 0.36, 8, 14]} />
      </mesh>
      <mesh ref={rightEyebrowRef} position={[eyeSpacing, 0.78, 0.2]} material={eyebrowMat}>
        <capsuleGeometry args={[0.032, 0.36, 8, 14]} />
      </mesh>

      {/* ===== MOUTH — cartoon expressive, NO nose ===== */}
      <group ref={mouthGroupRef} position={[0, -0.58, 0.06]}>
        {/* Outer mouth shape */}
        <mesh ref={mouthOuterRef} material={mouthMat}>
          <capsuleGeometry args={[0.06, 0.16, 10, 18]} />
        </mesh>
        {/* Inner mouth (visible when open) */}
        <mesh ref={mouthInnerRef} position={[0, -0.01, -0.01]} material={mouthInnerMat} scale={[0.7, 0.5, 0.6]}>
          <sphereGeometry args={[0.065, 14, 14]} />
        </mesh>
      </group>

      {/* ===== CHEEK BLUSH — soft anime pink circles ===== */}
      <mesh ref={leftCheekRef} position={[-0.95, -0.28, 0.04]} material={blushMat.clone()}>
        <circleGeometry args={[0.22, 32]} />
      </mesh>
      <mesh ref={rightCheekRef} position={[0.95, -0.28, 0.04]} material={blushMat.clone()}>
        <circleGeometry args={[0.22, 32]} />
      </mesh>
    </group>
  );
}
