/**
 * Cartoon Face Engine — Disney/Pixar Level Expressivity
 * 
 * Features:
 * - Squash & stretch mouth with elastic bounce
 * - Visible teeth row + tongue hint when mouth open
 * - Upper & lower lip curves with independent control
 * - Cheek squish when smiling big
 * - Cartoon eye squish (happy squint)
 * - Soft toon shading materials
 * - 60fps smooth interpolation
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
  const leftLashRef = useRef<THREE.Mesh>(null);
  const rightLashRef = useRef<THREE.Mesh>(null);
  const leftSparkle1 = useRef<THREE.Mesh>(null);
  const rightSparkle1 = useRef<THREE.Mesh>(null);
  const leftSparkle2 = useRef<THREE.Mesh>(null);
  const rightSparkle2 = useRef<THREE.Mesh>(null);

  // Squash & stretch state
  const squashRef = useRef({ scaleX: 1, scaleY: 1, velocity: 0 });

  const animation = useFaceAnimation(faceState, gazeRef, audioAmplitude, viseme, emotionIntensity);

  // ─── Materials: Disney/Pixar Cartoon ──────────────────────

  const eyeWhiteMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("#f8faff"),
    emissive: new THREE.Color("hsl(220, 60%, 96%)"),
    emissiveIntensity: 0.4, roughness: 0.02, metalness: 0,
  }), []);

  const irisMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(230, 75%, 45%)"),
    emissive: new THREE.Color("hsl(220, 90%, 50%)"),
    emissiveIntensity: 0.7, roughness: 0.03, metalness: 0.1,
  }), []);

  const irisInnerMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(190, 100%, 60%)"),
    emissive: new THREE.Color("hsl(195, 95%, 55%)"),
    emissiveIntensity: 0.85, roughness: 0.03, metalness: 0.06,
    transparent: true, opacity: 0.9,
  }), []);

  const irisMidMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(210, 80%, 55%)"),
    emissive: new THREE.Color("hsl(205, 85%, 48%)"),
    emissiveIntensity: 0.6, roughness: 0.04, metalness: 0.08,
    transparent: true, opacity: 0.85,
  }), []);

  const pupilMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(245, 60%, 8%)"),
    emissive: new THREE.Color("hsl(235, 70%, 18%)"),
    emissiveIntensity: 0.25, roughness: 0.02, metalness: 0.06,
  }), []);

  const highlightMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 3.5,
    transparent: true, opacity: 0.97,
  }), []);

  const starMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xffffff, emissive: 0xeeeeff, emissiveIntensity: 2.5,
    transparent: true, opacity: 0.8,
  }), []);

  const lashMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(240, 30%, 16%)"),
    emissive: new THREE.Color("hsl(245, 28%, 10%)"),
    emissiveIntensity: 0.08, roughness: 0.5,
  }), []);

  const eyebrowMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(240, 20%, 22%)"),
    emissive: new THREE.Color("hsl(245, 22%, 14%)"),
    emissiveIntensity: 0.1, roughness: 0.4,
  }), []);

  // Upper lip — rich coral-pink, glossy cartoon
  const upperLipMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(348, 72%, 55%)"),
    emissive: new THREE.Color("hsl(345, 78%, 40%)"),
    emissiveIntensity: 0.45, roughness: 0.2, metalness: 0.05,
  }), []);

  // Lower lip — slightly lighter, softer
  const lowerLipMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(350, 68%, 60%)"),
    emissive: new THREE.Color("hsl(348, 75%, 42%)"),
    emissiveIntensity: 0.4, roughness: 0.22,
  }), []);

  // Mouth interior — dark warm cavity
  const mouthInteriorMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(348, 50%, 22%)"),
    emissive: new THREE.Color("hsl(345, 40%, 12%)"),
    emissiveIntensity: 0.15, roughness: 0.6,
  }), []);

  // Teeth — soft white, not too bright
  const teethMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(40, 10%, 94%)"),
    emissive: new THREE.Color("hsl(40, 8%, 85%)"),
    emissiveIntensity: 0.2, roughness: 0.15,
  }), []);

  // Tongue — warm pink
  const tongueMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(355, 65%, 58%)"),
    emissive: new THREE.Color("hsl(352, 60%, 40%)"),
    emissiveIntensity: 0.25, roughness: 0.35,
  }), []);

  const blushMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(338, 60%, 72%)"),
    emissive: new THREE.Color("hsl(335, 70%, 55%)"),
    emissiveIntensity: 0.5, roughness: 0.5,
    transparent: true, opacity: 0.45,
  }), []);

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
    const pupilTravel = 0.1;
    [leftPupilRef, rightPupilRef].forEach(ref => {
      if (ref.current) {
        ref.current.position.x = state.pupilX * pupilTravel * 8;
        ref.current.position.y = state.pupilY * pupilTravel * 8;
      }
    });

    [leftIrisRef, rightIrisRef].forEach(ref => {
      if (ref.current) {
        ref.current.position.x = state.pupilX * 0.6;
        ref.current.position.y = state.pupilY * 0.6 - 0.02;
      }
    });

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

    // ─── Eye scale + cartoon squish for happy ───
    const eyeScale = 0.82 + state.eyeOpenness * 0.25;
    const happySquish = state.mouthCurve > 0.3 ? 1 + (state.mouthCurve - 0.3) * 0.15 : 1;
    if (leftEyeRef.current) {
      leftEyeRef.current.scale.set(eyeScale * happySquish, eyeScale / happySquish, eyeScale);
    }
    if (rightEyeRef.current) {
      rightEyeRef.current.scale.set(eyeScale * happySquish, eyeScale / happySquish, eyeScale);
    }

    if (leftLashRef.current) leftLashRef.current.scale.x = eyeScale * happySquish;
    if (rightLashRef.current) rightLashRef.current.scale.x = eyeScale * happySquish;

    // ─── Eyebrows ───
    const browLift = state.eyebrowHeight * 1.3;
    if (leftEyebrowRef.current) {
      leftEyebrowRef.current.position.y = 0.78 + browLift;
      leftEyebrowRef.current.rotation.z = -state.eyebrowTilt * 1.5;
    }
    if (rightEyebrowRef.current) {
      rightEyebrowRef.current.position.y = 0.78 + browLift;
      rightEyebrowRef.current.rotation.z = state.eyebrowTilt * 1.5;
    }

    // ─── MOUTH — Disney squash & stretch ───
    const sq = squashRef.current;

    // Calculate target squash/stretch from mouth state
    const targetStretchX = 1 + state.mouthWidth * 0.6 + state.mouthCurve * 0.3;
    const targetStretchY = 1 + state.mouthOpenness * 1.8;

    // Spring physics for elastic bounce
    const springK = 18; // stiffness
    const damping = 0.75;
    const dx = targetStretchX - sq.scaleX;
    const dy = targetStretchY - sq.scaleY;
    sq.velocity += (dx + dy) * springK * delta;
    sq.velocity *= Math.pow(1 - damping, delta * 60);
    sq.scaleX += (dx * springK * delta) + sq.velocity * delta * 0.3;
    sq.scaleY += (dy * springK * delta) - sq.velocity * delta * 0.2;

    // Clamp
    sq.scaleX = Math.max(0.3, Math.min(2.5, sq.scaleX));
    sq.scaleY = Math.max(0.15, Math.min(3.5, sq.scaleY));

    if (mouthGroupRef.current) {
      mouthGroupRef.current.position.y = -0.58 + state.mouthCurve * 0.1 - state.jawDrop * 0.06;
      mouthGroupRef.current.position.z = 0.06 + state.mouthOpenness * 0.04;
    }

    // Upper lip — stretches wider, curves up for smile
    if (upperLipRef.current) {
      upperLipRef.current.scale.x = 0.45 * sq.scaleX;
      upperLipRef.current.scale.y = 0.12 + state.mouthOpenness * 0.15;
      upperLipRef.current.position.y = state.mouthOpenness * 0.08 + state.mouthCurve * 0.04;
      upperLipRef.current.rotation.z = state.mouthCurve * 0.12; // curve with smile
    }

    // Lower lip — drops down, stretches
    if (lowerLipRef.current) {
      lowerLipRef.current.scale.x = 0.42 * sq.scaleX;
      lowerLipRef.current.scale.y = 0.11 + state.mouthOpenness * 0.12;
      lowerLipRef.current.position.y = -state.mouthOpenness * 0.22 - state.jawDrop * 0.12;
      lowerLipRef.current.rotation.z = -state.mouthCurve * 0.08;
    }

    // Mouth interior — visible when open
    const mouthOpen = state.mouthOpenness > 0.06;
    if (mouthInteriorRef.current) {
      mouthInteriorRef.current.visible = mouthOpen;
      mouthInteriorRef.current.scale.x = 0.32 * sq.scaleX;
      mouthInteriorRef.current.scale.y = 0.08 + state.mouthOpenness * 1.2;
      mouthInteriorRef.current.scale.z = 0.7 + state.mouthRound * 0.4;
    }

    // Teeth — peek out when mouth opens enough
    if (teethRef.current) {
      teethRef.current.visible = state.mouthOpenness > 0.1;
      teethRef.current.scale.x = 0.28 * sq.scaleX;
      teethRef.current.scale.y = 0.04 + state.mouthOpenness * 0.08;
      teethRef.current.position.y = state.mouthOpenness * 0.04;
    }

    // Tongue — visible on wide opens and AA viseme
    if (tongueRef.current) {
      const showTongue = state.mouthOpenness > 0.25;
      tongueRef.current.visible = showTongue;
      if (showTongue) {
        tongueRef.current.scale.x = 0.15 * sq.scaleX;
        tongueRef.current.scale.y = 0.06 + state.mouthOpenness * 0.08;
        tongueRef.current.position.y = -state.mouthOpenness * 0.14 - 0.02;
        // Tongue wiggles slightly during speech
        tongueRef.current.position.x = Math.sin(performance.now() * 0.008) * 0.01;
      }
    }

    // ─── Cheek squish when smiling big ───
    const smileIntensity = Math.max(0, state.mouthCurve * 2);
    [leftCheekRef, rightCheekRef].forEach((ref, i) => {
      if (ref.current) {
        const mat = ref.current.material as THREE.MeshStandardMaterial;
        mat.opacity = 0.15 + state.cheekGlow * 0.55 + smileIntensity * 0.15;
        mat.emissiveIntensity = 0.35 + state.cheekGlow * 0.55;
        // Cheeks puff up when smiling
        const puff = 1 + smileIntensity * 0.2;
        ref.current.scale.set(puff, puff * 0.85, 1);
        // Move cheeks up slightly when smiling (Disney squish)
        ref.current.position.y = -0.28 + smileIntensity * 0.06;
      }
    });

    // ─── Iris glow ───
    irisMat.emissiveIntensity = 0.5 + state.irisGlow * 0.6;
    irisInnerMat.emissiveIntensity = 0.6 + state.irisGlow * 0.7;
    irisMidMat.emissiveIntensity = 0.4 + state.irisGlow * 0.5;

    // ─── Sparkle highlights ───
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

    // ─── Floating star sparkles ───
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

  // ─── Geometry ─────────────────────────────────────────────
  const eyeSpacing = 0.65;
  const eyeY = 0.08;
  const eyeRadius = 0.46;

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
        <mesh material={eyeWhiteMat} scale={[1, 1.1, 0.65]}>
          <sphereGeometry args={[eyeRadius, 48, 48]} />
        </mesh>
        <mesh ref={irisRef} position={[0, -0.02, 0.22]} material={irisMat}>
          <sphereGeometry args={[0.30, 36, 36]} />
        </mesh>
        <mesh position={[0, 0.0, 0.26]} material={irisMidMat}>
          <sphereGeometry args={[0.20, 28, 28]} />
        </mesh>
        <mesh position={[0, 0.02, 0.30]} material={irisInnerMat}>
          <sphereGeometry args={[0.14, 24, 24]} />
        </mesh>
        <mesh ref={pupilRef} position={[0, 0, 0.34]} material={pupilMat}>
          <sphereGeometry args={[0.11, 24, 24]} />
        </mesh>
        <mesh ref={hl1Ref} position={[0.09, 0.12, 0.38]} material={highlightMat.clone()}>
          <sphereGeometry args={[0.07, 16, 16]} />
        </mesh>
        <mesh ref={hl2Ref} position={[-0.07, -0.07, 0.37]} material={highlightMat.clone()} scale={0.5}>
          <sphereGeometry args={[0.05, 12, 12]} />
        </mesh>
        <mesh ref={sp1Ref} position={[0.14, 0.05, 0.35]} material={starMat.clone()} scale={0.25}>
          <sphereGeometry args={[0.03, 8, 8]} />
        </mesh>
        <mesh ref={sp2Ref} position={[-0.04, 0.14, 0.34]} material={starMat.clone()} scale={0.2}>
          <sphereGeometry args={[0.025, 8, 8]} />
        </mesh>
        <mesh position={[0.06, -0.11, 0.36]} material={starMat} scale={0.15}>
          <sphereGeometry args={[0.02, 8, 8]} />
        </mesh>
        <mesh ref={lashRef} position={[0, 0.32, 0.12]} material={lashMat}>
          <capsuleGeometry args={[0.05, 0.44, 8, 14]} />
        </mesh>
        <mesh ref={eyelidRef} position={[0, 0.24, 0.14]} material={eyelidMat}>
          <boxGeometry args={[1.0, 0.45, 0.45]} />
        </mesh>
      </group>
    );
  };

  return (
    <group ref={rootRef}>
      {/* ===== EYES ===== */}
      {renderEye("left", leftEyeRef, leftPupilRef, leftIrisRef, leftEyelidRef, leftLashRef,
        leftHighlight1Ref, leftHighlight2Ref, leftSparkle1, leftSparkle2)}
      {renderEye("right", rightEyeRef, rightPupilRef, rightIrisRef, rightEyelidRef, rightLashRef,
        rightHighlight1Ref, rightHighlight2Ref, rightSparkle1, rightSparkle2)}

      {/* ===== EYEBROWS ===== */}
      <mesh ref={leftEyebrowRef} position={[-eyeSpacing, 0.78, 0.2]} material={eyebrowMat}>
        <capsuleGeometry args={[0.032, 0.36, 8, 14]} />
      </mesh>
      <mesh ref={rightEyebrowRef} position={[eyeSpacing, 0.78, 0.2]} material={eyebrowMat}>
        <capsuleGeometry args={[0.032, 0.36, 8, 14]} />
      </mesh>

      {/* ===== MOUTH — Disney/Pixar Cartoon ===== */}
      <group ref={mouthGroupRef} position={[0, -0.58, 0.06]}>
        {/* Upper lip — capsule shape, curves with smile */}
        <mesh ref={upperLipRef} position={[0, 0.02, 0]} material={upperLipMat}>
          <capsuleGeometry args={[0.055, 0.2, 12, 20]} />
        </mesh>

        {/* Lower lip — slightly larger, softer */}
        <mesh ref={lowerLipRef} position={[0, -0.03, 0.005]} material={lowerLipMat}>
          <capsuleGeometry args={[0.05, 0.18, 12, 20]} />
        </mesh>

        {/* Mouth interior — dark cavity behind lips */}
        <mesh ref={mouthInteriorRef} position={[0, -0.01, -0.02]} material={mouthInteriorMat}>
          <sphereGeometry args={[0.08, 16, 16]} />
        </mesh>

        {/* Teeth row — small white bar, peeks out */}
        <mesh ref={teethRef} position={[0, 0.015, 0.01]} material={teethMat}>
          <boxGeometry args={[0.18, 0.025, 0.02]} />
        </mesh>

        {/* Tongue — soft pink blob */}
        <mesh ref={tongueRef} position={[0, -0.03, -0.005]} material={tongueMat}>
          <sphereGeometry args={[0.045, 12, 12]} />
        </mesh>
      </group>

      {/* ===== CHEEK BLUSH ===== */}
      <mesh ref={leftCheekRef} position={[-0.95, -0.28, 0.04]} material={blushMat.clone()}>
        <circleGeometry args={[0.22, 32]} />
      </mesh>
      <mesh ref={rightCheekRef} position={[0.95, -0.28, 0.04]} material={blushMat.clone()}>
        <circleGeometry args={[0.22, 32]} />
      </mesh>
    </group>
  );
}
