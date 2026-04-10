/**
 * Bobby Holographic Face — Flat 2D hologram style
 * Manga-shaped eyes, curved smile mouth, tongue on open
 */
import { useRef, useMemo, useEffect } from "react";
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
  bobbyColor?: string;
}

// Create a manga eye shape — tall oval, slightly pointed at corners
function createMangaEyeShape(w: number, h: number): THREE.Shape {
  const shape = new THREE.Shape();
  // Almond shape — wide, pointed at corners, less tall
  shape.moveTo(-w, 0);
  shape.bezierCurveTo(-w * 0.7, h * 0.9, -w * 0.2, h, 0, h * 0.95);
  shape.bezierCurveTo(w * 0.2, h, w * 0.7, h * 0.9, w, 0);
  shape.bezierCurveTo(w * 0.7, -h * 0.85, w * 0.2, -h * 0.95, 0, -h * 0.9);
  shape.bezierCurveTo(-w * 0.2, -h * 0.95, -w * 0.7, -h * 0.85, -w, 0);
  return shape;
}

export function FaceMesh({ faceState, gazeRef, audioAmplitude, viseme, emotionIntensity = 0.7, bobbyColor }: FaceMeshProps) {
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
  const tongueRef = useRef<THREE.Mesh>(null);
  const leftEyelidRef = useRef<THREE.Mesh>(null);
  const rightEyelidRef = useRef<THREE.Mesh>(null);
  const leftCheekRef = useRef<THREE.Mesh>(null);
  const rightCheekRef = useRef<THREE.Mesh>(null);

  const animation = useFaceAnimation(faceState, gazeRef, audioAmplitude, viseme, emotionIntensity);

  // ─── Color theme from parent settings ─────────────────────
  const colorHSL = useMemo(() => {
    const map: Record<string, { h: number; s: number; l: number }> = {
      blue:   { h: 215, s: 80, l: 65 },
      purple: { h: 270, s: 60, l: 60 },
      green:  { h: 155, s: 55, l: 50 },
      pink:   { h: 330, s: 65, l: 65 },
      orange: { h: 25,  s: 85, l: 58 },
      gold:   { h: 45,  s: 80, l: 55 },
    };
    return map[bobbyColor || "blue"] || map.blue;
  }, [bobbyColor]);

  // ─── Materials ─────────────────────────────────────────────

  const eyeWhiteMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("hsl(0, 0%, 100%)"),
    transparent: true, opacity: 1,
  }), []);

  const irisMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color(`hsl(25, 60%, 32%)`),
    transparent: true, opacity: 0.9,
  }), []);

  const irisInnerMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color(`hsl(30, 50%, 42%)`),
    transparent: true, opacity: 0.8,
  }), []);

  // Update iris colors when bobbyColor changes (no material recreation)
  useEffect(() => {
    irisMat.color.set(new THREE.Color(`hsl(${colorHSL.h}, ${colorHSL.s}%, ${colorHSL.l - 15}%)`));
    irisInnerMat.color.set(new THREE.Color(`hsl(${colorHSL.h}, ${Math.max(0, colorHSL.s - 10)}%, ${colorHSL.l}%)`));
  }, [colorHSL, irisMat, irisInnerMat]);

  const pupilMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("hsl(20, 50%, 8%)"),
  }), []);

  const highlightMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("hsl(200, 100%, 97%)"),
    transparent: true, opacity: 0.95,
  }), []);

  const eyebrowMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("hsl(25, 40%, 38%)"),
    transparent: true, opacity: 0.8,
  }), []);

  const mouthMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("hsl(350, 50%, 60%)"),
    transparent: true, opacity: 0.85,
  }), []);

  const tongueMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("hsl(350, 55%, 68%)"),
    transparent: true, opacity: 0,
  }), []);

  const eyelidMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("hsl(220, 20%, 85%)"),
    transparent: true, opacity: 0.97,
  }), []);

  const blushMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("hsl(340, 65%, 70%)"),
    transparent: true, opacity: 0.35,
  }), []);

  // Manga eye shape geometry
  const mangaEyeGeo = useMemo(() => {
    const shape = createMangaEyeShape(0.42, 0.3);
    return new THREE.ShapeGeometry(shape, 32);
  }, []);

  const mangaIrisGeo = useMemo(() => {
    const shape = createMangaEyeShape(0.26, 0.2);
    return new THREE.ShapeGeometry(shape, 24);
  }, []);

  // ─── Frame Update ──────────────────────────────────────────
  useFrame((_, delta) => {
    const state = animation.update(delta);
    if (!rootRef.current) return;

    // Head — very subtle follow for alignment
    rootRef.current.rotation.z = state.headTiltZ * 0.3;
    rootRef.current.rotation.y = state.headTiltY * 0.15;
    rootRef.current.rotation.x = state.headTiltX * 0.08;

    // Pupils (black) — strong cursor tracking, the main gaze driver
    const t = performance.now() * 0.001;
    const wanderX = Math.sin(t * 0.4) * 0.008 + Math.sin(t * 1.1) * 0.004;
    const wanderY = Math.cos(t * 0.3) * 0.006 + Math.sin(t * 0.8) * 0.003;
    const pupilGazeX = state.pupilX * 0.85 + wanderX;
    const pupilGazeY = state.pupilY * 0.7 + wanderY;
    [leftPupilRef, rightPupilRef].forEach(ref => {
      if (ref.current) {
        ref.current.position.x = pupilGazeX;
        ref.current.position.y = pupilGazeY;
      }
    });
    // Iris — follows less than pupil for depth parallax
    const irisGazeX = state.pupilX * 0.4 + wanderX * 0.5;
    const irisGazeY = state.pupilY * 0.3 + wanderY * 0.5;
    [leftIrisRef, rightIrisRef].forEach(ref => {
      if (ref.current) {
        ref.current.position.x = irisGazeX;
        ref.current.position.y = irisGazeY;
      }
    });

    const ps = state.pupilSize;
    if (leftPupilRef.current) leftPupilRef.current.scale.setScalar(ps);
    if (rightPupilRef.current) rightPupilRef.current.scale.setScalar(ps);

    // Eyelids (blink) — subtle sweep down
    const blinkClose = 1 - state.eyeOpenness; // 0 = open, 1 = fully closed
    [leftEyelidRef, rightEyelidRef].forEach(ref => {
      if (ref.current) {
        ref.current.scale.y = Math.max(0.01, blinkClose * 2.2);
        ref.current.position.y = 0.28 - blinkClose * 0.12;
        ref.current.visible = blinkClose > 0.03;
      }
    });

    // Eye scale + happy squish
    const eyeScale = 0.9 + state.eyeOpenness * 0.15;
    const happySquish = state.mouthCurve > 0.3 ? 1 + (state.mouthCurve - 0.3) * 0.1 : 1;
    [leftEyeRef, rightEyeRef].forEach(ref => {
      if (ref.current) ref.current.scale.set(eyeScale * happySquish, eyeScale / happySquish, 1);
    });

    // Eyebrows
    const browLift = state.eyebrowHeight * 0.15;
    if (leftEyebrowRef.current) {
      leftEyebrowRef.current.position.y = 0.68 + browLift;
      leftEyebrowRef.current.rotation.z = 0.1 - state.eyebrowTilt * 0.3;
    }
    if (rightEyebrowRef.current) {
      rightEyebrowRef.current.position.y = 0.68 + browLift;
      rightEyebrowRef.current.rotation.z = -0.1 + state.eyebrowTilt * 0.3;
    }

    // MOUTH — animate curve, width, and openness visually
    if (mouthRef.current) {
      const curveEffect = state.mouthCurve; // -0.2 to 0.55
      const speakScale = 1 + state.mouthOpenness * 0.5 + state.mouthWidth * 0.2;
      // Scale X for width, scale Y for curve emphasis (smile = wider + shorter arc)
      mouthRef.current.scale.x = speakScale * (1 + curveEffect * 0.3);
      mouthRef.current.scale.y = 1 + Math.abs(curveEffect) * 0.8 + state.mouthOpenness * 0.6;
      // Move mouth up when smiling, down when frowning
      mouthRef.current.position.y = -0.55 + curveEffect * 0.12;
      // Rotate slightly for asymmetric quirks
      mouthRef.current.rotation.z = Math.PI + state.mouthWidth * 0.02;
      const mat = mouthRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.75 + state.mouthOpenness * 0.25 + Math.abs(curveEffect) * 0.15;
    }

    // TONGUE — fade in when mouth opens
    if (tongueRef.current) {
      const showTongue = state.mouthOpenness > 0.12;
      const tMat = tongueRef.current.material as THREE.MeshBasicMaterial;
      const targetOpacity = showTongue ? Math.min(0.7, (state.mouthOpenness - 0.12) * 3) : 0;
      tMat.opacity += (targetOpacity - tMat.opacity) * delta * 8;
      tongueRef.current.position.y = -0.62 - state.mouthOpenness * 0.08;
      tongueRef.current.scale.x = 0.8 + state.mouthOpenness * 0.5;
    }

    // Cheeks
    const smile = Math.max(0, state.mouthCurve * 2);
    [leftCheekRef, rightCheekRef].forEach(ref => {
      if (ref.current) {
        const mat = ref.current.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.15 + state.cheekGlow * 0.35 + smile * 0.2;
      }
    });

    irisMat.opacity = 0.7 + state.irisGlow * 0.3;
  });

  // ─── Layout ────────────────────────────────────────────────
  const eyeSpacing = 0.55;
  const eyeY = 0.1;

  const renderEye = (
    side: "left" | "right",
    eyeRef: React.RefObject<THREE.Group>,
    pupilRef: React.RefObject<THREE.Mesh>,
    irisRef: React.RefObject<THREE.Mesh>,
    eyelidRef: React.RefObject<THREE.Mesh>,
  ) => {
    const x = side === "left" ? -eyeSpacing : eyeSpacing;
    return (
      <group ref={eyeRef} position={[x, eyeY, 0]} key={side}>
        {/* Eye white — manga shape */}
        <mesh geometry={mangaEyeGeo} material={eyeWhiteMat} />
        {/* Iris — manga shape */}
        <mesh ref={irisRef} geometry={mangaIrisGeo} position={[0, -0.02, 0.01]} material={irisMat} />
        {/* Inner iris glow */}
        <mesh position={[0, 0, 0.015]} material={irisInnerMat}>
          <circleGeometry args={[0.14, 32]} />
        </mesh>
        {/* Pupil */}
        <mesh ref={pupilRef} position={[0, 0, 0.02]} material={pupilMat}>
          <circleGeometry args={[0.1, 32]} />
        </mesh>
        {/* Main highlight */}
        <mesh position={[0.1, 0.14, 0.03]} material={highlightMat}>
          <circleGeometry args={[0.07, 16]} />
        </mesh>
        {/* Secondary highlight */}
        <mesh position={[-0.06, -0.08, 0.03]} material={highlightMat} scale={0.45}>
          <circleGeometry args={[0.045, 12]} />
        </mesh>
        {/* Eyelid — natural blink */}
        <mesh ref={eyelidRef} position={[0, 0.28, 0.04]} material={eyelidMat}>
          <planeGeometry args={[0.88, 0.14]} />
        </mesh>
      </group>
    );
  };

  return (
    <group ref={rootRef}>
      {/* ===== EYES ===== */}
      {renderEye("left", leftEyeRef, leftPupilRef, leftIrisRef, leftEyelidRef)}
      {renderEye("right", rightEyeRef, rightPupilRef, rightIrisRef, rightEyelidRef)}

      {/* ===== EYEBROWS ===== */}
      <mesh ref={leftEyebrowRef} position={[-eyeSpacing, 0.58, 0.01]} material={eyebrowMat} rotation={[0, 0, 0.15]}>
        <planeGeometry args={[0.38, 0.055]} />
      </mesh>
      <mesh ref={rightEyebrowRef} position={[eyeSpacing, 0.58, 0.01]} material={eyebrowMat} rotation={[0, 0, -0.15]}>
        <planeGeometry args={[0.38, 0.055]} />
      </mesh>

      {/* ===== MOUTH — curved smile ===== */}
      <mesh ref={mouthRef} position={[0, -0.55, 0.01]} material={mouthMat} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[0.2, 0.028, 8, 32, Math.PI * 0.55]} />
      </mesh>

      {/* ===== TONGUE — pink, fades in when mouth opens ===== */}
      <mesh ref={tongueRef} position={[0, -0.62, 0.005]} material={tongueMat}>
        <circleGeometry args={[0.06, 24]} />
      </mesh>

      {/* ===== CHEEK BLUSH (behind eyes, z=-0.05) ===== */}
      <mesh ref={leftCheekRef} position={[-0.7, -0.35, -0.05]} material={blushMat}>
        <circleGeometry args={[0.22, 32]} />
      </mesh>
      <mesh ref={rightCheekRef} position={[0.7, -0.35, -0.05]} material={blushMat}>
        <circleGeometry args={[0.22, 32]} />
      </mesh>
    </group>
  );
}
