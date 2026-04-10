/**
 * Bobby Cartoon Face — Cute Round Character
 * Eyes, eyebrows, nose, mouth all sit ON the front surface of the head sphere.
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

  const headMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(220, 55%, 82%)"),
    emissive: new THREE.Color("hsl(225, 40%, 65%)"),
    emissiveIntensity: 0.15, roughness: 0.55, metalness: 0,
  }), []);

  const eyeWhiteMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("#f8faff"),
    emissive: new THREE.Color("hsl(220, 60%, 96%)"),
    emissiveIntensity: 0.35, roughness: 0.02, metalness: 0,
  }), []);

  const irisMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(210, 85%, 50%)"),
    emissive: new THREE.Color("hsl(215, 90%, 45%)"),
    emissiveIntensity: 0.6, roughness: 0.03, metalness: 0.08,
  }), []);

  const irisInnerMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(190, 100%, 60%)"),
    emissive: new THREE.Color("hsl(195, 95%, 55%)"),
    emissiveIntensity: 0.75, roughness: 0.03,
    transparent: true, opacity: 0.9,
  }), []);

  const pupilMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(245, 60%, 8%)"),
    emissive: new THREE.Color("hsl(235, 70%, 18%)"),
    emissiveIntensity: 0.2, roughness: 0.02,
  }), []);

  const highlightMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 3.5,
    transparent: true, opacity: 0.95,
  }), []);

  const eyelidMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(220, 45%, 75%)"),
    emissive: new THREE.Color("hsl(225, 35%, 60%)"),
    emissiveIntensity: 0.12, roughness: 0.4,
  }), []);

  const eyebrowMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(225, 30%, 35%)"),
    emissive: new THREE.Color("hsl(230, 25%, 25%)"),
    emissiveIntensity: 0.08, roughness: 0.4,
  }), []);

  const noseMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(215, 50%, 72%)"),
    emissive: new THREE.Color("hsl(220, 40%, 60%)"),
    emissiveIntensity: 0.15, roughness: 0.45,
  }), []);

  const upperLipMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(348, 65%, 58%)"),
    emissive: new THREE.Color("hsl(345, 70%, 42%)"),
    emissiveIntensity: 0.4, roughness: 0.22,
  }), []);

  const lowerLipMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(350, 60%, 63%)"),
    emissive: new THREE.Color("hsl(348, 65%, 45%)"),
    emissiveIntensity: 0.35, roughness: 0.25,
  }), []);

  const mouthInteriorMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(348, 45%, 20%)"),
    emissive: new THREE.Color("hsl(345, 35%, 12%)"),
    emissiveIntensity: 0.12, roughness: 0.6,
  }), []);

  const teethMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(40, 10%, 95%)"),
    emissive: new THREE.Color("hsl(40, 8%, 88%)"),
    emissiveIntensity: 0.18, roughness: 0.15,
  }), []);

  const tongueMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(355, 60%, 55%)"),
    emissive: new THREE.Color("hsl(352, 55%, 38%)"),
    emissiveIntensity: 0.2, roughness: 0.35,
  }), []);

  const blushMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(340, 65%, 72%)"),
    emissive: new THREE.Color("hsl(338, 70%, 58%)"),
    emissiveIntensity: 0.45, roughness: 0.5,
    transparent: true, opacity: 0.5,
  }), []);

  const earMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(218, 50%, 78%)"),
    emissive: new THREE.Color("hsl(222, 38%, 62%)"),
    emissiveIntensity: 0.12, roughness: 0.5,
  }), []);

  // ─── Frame Update ──────────────────────────────────────────
  useFrame((_, delta) => {
    const state = animation.update(delta);
    if (!rootRef.current) return;

    rootRef.current.rotation.x = state.headTiltX;
    rootRef.current.rotation.y = state.headTiltY;
    rootRef.current.rotation.z = state.headTiltZ;

    // Pupils
    const pt = 0.08;
    [leftPupilRef, rightPupilRef].forEach(ref => {
      if (ref.current) {
        ref.current.position.x = state.pupilX * pt * 8;
        ref.current.position.y = state.pupilY * pt * 8;
      }
    });
    [leftIrisRef, rightIrisRef].forEach(ref => {
      if (ref.current) {
        ref.current.position.x = state.pupilX * 0.5;
        ref.current.position.y = state.pupilY * 0.5 - 0.01;
      }
    });
    if (leftPupilRef.current) leftPupilRef.current.scale.setScalar(state.pupilSize);
    if (rightPupilRef.current) rightPupilRef.current.scale.setScalar(state.pupilSize);

    // Eyelids (blink)
    const eyelidScale = 1 - state.eyeOpenness;
    [leftEyelidRef, rightEyelidRef].forEach(ref => {
      if (ref.current) {
        ref.current.scale.y = Math.max(0.01, eyelidScale);
        ref.current.visible = eyelidScale > 0.04;
      }
    });

    // Eye scale + happy squish
    const eyeScale = 0.85 + state.eyeOpenness * 0.2;
    const happySquish = state.mouthCurve > 0.3 ? 1 + (state.mouthCurve - 0.3) * 0.12 : 1;
    [leftEyeRef, rightEyeRef].forEach(ref => {
      if (ref.current) ref.current.scale.set(eyeScale * happySquish, eyeScale / happySquish, eyeScale);
    });

    // Eyebrows
    const browLift = state.eyebrowHeight * 1.2;
    if (leftEyebrowRef.current) {
      leftEyebrowRef.current.position.y = 0.52 + browLift;
      leftEyebrowRef.current.rotation.z = 0.15 - state.eyebrowTilt * 1.5;
    }
    if (rightEyebrowRef.current) {
      rightEyebrowRef.current.position.y = 0.52 + browLift;
      rightEyebrowRef.current.rotation.z = -0.15 + state.eyebrowTilt * 1.5;
    }

    // MOUTH squash & stretch
    const sq = squashRef.current;
    const tsx = 1 + state.mouthWidth * 0.5 + state.mouthCurve * 0.25;
    const tsy = 1 + state.mouthOpenness * 1.6;
    const springK = 18, damping = 0.75;
    sq.velocity += ((tsx - sq.scaleX) + (tsy - sq.scaleY)) * springK * delta;
    sq.velocity *= Math.pow(1 - damping, delta * 60);
    sq.scaleX += (tsx - sq.scaleX) * springK * delta + sq.velocity * delta * 0.3;
    sq.scaleY += (tsy - sq.scaleY) * springK * delta - sq.velocity * delta * 0.2;
    sq.scaleX = Math.max(0.3, Math.min(2.5, sq.scaleX));
    sq.scaleY = Math.max(0.15, Math.min(3.5, sq.scaleY));

    if (mouthGroupRef.current) {
      mouthGroupRef.current.position.y = -0.42 + state.mouthCurve * 0.08 - state.jawDrop * 0.05;
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
    }
    if (teethRef.current) {
      teethRef.current.visible = state.mouthOpenness > 0.1;
      teethRef.current.scale.x = 0.24 * sq.scaleX;
      teethRef.current.position.y = state.mouthOpenness * 0.03;
    }
    if (tongueRef.current) {
      const show = state.mouthOpenness > 0.25;
      tongueRef.current.visible = show;
      if (show) {
        tongueRef.current.scale.x = 0.13 * sq.scaleX;
        tongueRef.current.position.y = -state.mouthOpenness * 0.12 - 0.02;
        tongueRef.current.position.x = Math.sin(performance.now() * 0.008) * 0.008;
      }
    }

    // Cheeks
    const smile = Math.max(0, state.mouthCurve * 2);
    [leftCheekRef, rightCheekRef].forEach(ref => {
      if (ref.current) {
        const mat = ref.current.material as THREE.MeshStandardMaterial;
        mat.opacity = 0.2 + state.cheekGlow * 0.5 + smile * 0.15;
        mat.emissiveIntensity = 0.3 + state.cheekGlow * 0.5;
        const puff = 1 + smile * 0.18;
        ref.current.scale.set(puff, puff * 0.85, 1);
      }
    });

    // Iris glow
    irisMat.emissiveIntensity = 0.4 + state.irisGlow * 0.5;
    irisInnerMat.emissiveIntensity = 0.5 + state.irisGlow * 0.6;

    // Sparkles
    const sp = 0.6 + state.eyeSparkle * 0.4;
    [leftHighlight1Ref, rightHighlight1Ref].forEach(ref => {
      if (ref.current) {
        (ref.current.material as THREE.MeshStandardMaterial).opacity = sp;
        ref.current.scale.setScalar(0.9 + state.eyeSparkle * 0.2);
      }
    });
    [leftHighlight2Ref, rightHighlight2Ref].forEach(ref => {
      if (ref.current) (ref.current.material as THREE.MeshStandardMaterial).opacity = sp * 0.65;
    });
  });

  // ─── HEAD RADIUS & POSITIONS ─────────────────────────────
  // Head radius = 1.15, centered at y=0
  // Front surface at z ≈ 1.15
  // Eyes sit at z=1.0 (embedded slightly into sphere front)
  const HR = 1.15;
  const eyeSpacing = 0.42;
  const eyeY = 0.15;
  const eyeZ = HR * 0.82; // ~0.94, on front face
  const eyeR = 0.32;

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
      <group ref={eyeRef} position={[xPos, eyeY, eyeZ]} key={side}>
        {/* Eye white */}
        <mesh material={eyeWhiteMat} scale={[1, 1.15, 0.55]}>
          <sphereGeometry args={[eyeR, 48, 48]} />
        </mesh>
        {/* Iris */}
        <mesh ref={irisRef} position={[0, -0.01, eyeR * 0.5]} material={irisMat}>
          <sphereGeometry args={[0.22, 32, 32]} />
        </mesh>
        {/* Inner iris */}
        <mesh position={[0, 0.01, eyeR * 0.6]} material={irisInnerMat}>
          <sphereGeometry args={[0.13, 24, 24]} />
        </mesh>
        {/* Pupil */}
        <mesh ref={pupilRef} position={[0, 0, eyeR * 0.75]} material={pupilMat}>
          <sphereGeometry args={[0.08, 24, 24]} />
        </mesh>
        {/* Main highlight */}
        <mesh ref={hl1Ref} position={[0.07, 0.09, eyeR * 0.85]} material={highlightMat.clone()}>
          <sphereGeometry args={[0.05, 16, 16]} />
        </mesh>
        {/* Secondary highlight */}
        <mesh ref={hl2Ref} position={[-0.05, -0.05, eyeR * 0.82]} material={highlightMat.clone()} scale={0.45}>
          <sphereGeometry args={[0.04, 12, 12]} />
        </mesh>
        {/* Eyelid */}
        <mesh ref={eyelidRef} position={[0, 0.2, eyeR * 0.2]} material={eyelidMat}>
          <boxGeometry args={[0.75, 0.32, 0.35]} />
        </mesh>
      </group>
    );
  };

  // Mouth Z — on front face, below nose
  const mouthZ = HR * 0.78;
  const noseZ = HR * 0.85;
  const browZ = HR * 0.72;
  const cheekZ = HR * 0.6;

  return (
    <group ref={rootRef}>
      {/* HEAD removed — face features only */}

      {/* ===== EARS ===== */}
      <mesh material={earMat} position={[-HR * 0.92, 0.2, 0]} scale={[0.22, 0.3, 0.18]}>
        <sphereGeometry args={[1, 24, 24]} />
      </mesh>
      <mesh material={earMat} position={[HR * 0.92, 0.2, 0]} scale={[0.22, 0.3, 0.18]}>
        <sphereGeometry args={[1, 24, 24]} />
      </mesh>

      {/* ===== EYES ===== */}
      {renderEye("left", leftEyeRef, leftPupilRef, leftIrisRef, leftEyelidRef,
        leftHighlight1Ref, leftHighlight2Ref)}
      {renderEye("right", rightEyeRef, rightPupilRef, rightIrisRef, rightEyelidRef,
        rightHighlight1Ref, rightHighlight2Ref)}

      {/* ===== EYEBROWS ===== */}
      <mesh ref={leftEyebrowRef} position={[-eyeSpacing, eyeY + 0.37, browZ]} material={eyebrowMat} rotation={[0, 0, 0.15]}>
        <capsuleGeometry args={[0.035, 0.24, 8, 14]} />
      </mesh>
      <mesh ref={rightEyebrowRef} position={[eyeSpacing, eyeY + 0.37, browZ]} material={eyebrowMat} rotation={[0, 0, -0.15]}>
        <capsuleGeometry args={[0.035, 0.24, 8, 14]} />
      </mesh>

      {/* ===== NOSE ===== */}
      <mesh position={[0, -0.12, noseZ]} material={noseMat} scale={[1, 0.85, 0.7]}>
        <sphereGeometry args={[0.1, 24, 24]} />
      </mesh>
      {/* Nose highlight */}
      <mesh position={[0.02, -0.09, noseZ + 0.06]}>
        <sphereGeometry args={[0.025, 12, 12]} />
        <meshStandardMaterial color={0xffffff} emissive={0xffffff} emissiveIntensity={2} transparent opacity={0.45} />
      </mesh>

      {/* ===== MOUTH ===== */}
      <group ref={mouthGroupRef} position={[0, -0.42, mouthZ]}>
        <mesh ref={upperLipRef} position={[0, 0.02, 0]} material={upperLipMat}>
          <capsuleGeometry args={[0.045, 0.16, 12, 20]} />
        </mesh>
        <mesh ref={lowerLipRef} position={[0, -0.02, 0.005]} material={lowerLipMat}>
          <capsuleGeometry args={[0.04, 0.14, 12, 20]} />
        </mesh>
        <mesh ref={mouthInteriorRef} position={[0, -0.005, -0.015]} material={mouthInteriorMat}>
          <sphereGeometry args={[0.06, 16, 16]} />
        </mesh>
        <mesh ref={teethRef} position={[0, 0.01, 0.008]} material={teethMat}>
          <boxGeometry args={[0.13, 0.018, 0.016]} />
        </mesh>
        <mesh ref={tongueRef} position={[0, -0.02, -0.004]} material={tongueMat}>
          <sphereGeometry args={[0.035, 12, 12]} />
        </mesh>
      </group>

      {/* ===== CHEEK BLUSH ===== */}
      <mesh ref={leftCheekRef} position={[-0.62, -0.22, cheekZ]} material={blushMat.clone()} rotation={[0, 0.4, 0]}>
        <circleGeometry args={[0.17, 32]} />
      </mesh>
      <mesh ref={rightCheekRef} position={[0.62, -0.22, cheekZ]} material={blushMat.clone()} rotation={[0, -0.4, 0]}>
        <circleGeometry args={[0.17, 32]} />
      </mesh>

      {/* ===== FOREHEAD HIGHLIGHT ===== */}
      <mesh position={[0, 0.55, HR * 0.72]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial
          color="hsl(220, 50%, 90%)" emissive="hsl(215, 60%, 85%)"
          emissiveIntensity={0.4} transparent opacity={0.25} roughness={0.3}
        />
      </mesh>
    </group>
  );
}
