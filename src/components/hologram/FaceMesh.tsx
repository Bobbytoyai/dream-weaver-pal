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
  emotionDuringSpeech?: FaceState;
  bobbyColor?: string;
}

// Create a manga eye shape — tall oval, slightly pointed at corners
function createRoundEyeShape(radius: number): THREE.Shape {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, radius, 0, Math.PI * 2, false);
  return shape;
}

function createOvalShape(w: number, h: number): THREE.Shape {
  const shape = new THREE.Shape();
  shape.absellipse(0, 0, w, h, 0, Math.PI * 2, false, 0);
  return shape;
}

function createRoundedRectShape(w: number, h: number, r: number): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 + r, -h / 2);
  shape.lineTo(w / 2 - r, -h / 2);
  shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  shape.lineTo(w / 2, h / 2 - r);
  shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  shape.lineTo(-w / 2 + r, h / 2);
  shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  shape.lineTo(-w / 2, -h / 2 + r);
  shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  return shape;
}

export function FaceMesh({ faceState, gazeRef, audioAmplitude, viseme, emotionIntensity = 0.7, emotionDuringSpeech, bobbyColor }: FaceMeshProps) {
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

  const animation = useFaceAnimation(faceState, gazeRef, audioAmplitude, viseme, emotionIntensity, emotionDuringSpeech);

  // ─── Bobby canonical colors (green eyes, brown brows, pink mouth/cheeks) ──
  const _bobbyGreen = useMemo(() => ({ h: 140, s: 55, l: 28 }), []);

  // ─── Materials ─────────────────────────────────────────────

  const eyeWhiteMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("hsl(0, 0%, 100%)"),
    transparent: true, opacity: 1,
  }), []);

  // Outer iris ring — dark green
  const irisMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color(`hsl(140, 55%, 22%)`),
    transparent: true, opacity: 0.95,
  }), []);

  // Inner iris — lighter green
  const irisInnerMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color(`hsl(140, 45%, 32%)`),
    transparent: true, opacity: 0.85,
  }), []);

  // Update iris tint when bobbyColor changes (subtle hue shift)
  useEffect(() => {
    const colorHSL = (() => {
      const map: Record<string, { h: number; s: number; l: number }> = {
        blue:   { h: 155, s: 55, l: 28 },
        purple: { h: 160, s: 50, l: 26 },
        green:  { h: 140, s: 55, l: 22 },
        pink:   { h: 145, s: 50, l: 25 },
        orange: { h: 148, s: 52, l: 24 },
        gold:   { h: 150, s: 48, l: 26 },
      };
      return map[bobbyColor || "green"] || map.green;
    })();
    irisMat.color.set(new THREE.Color(`hsl(${colorHSL.h}, ${colorHSL.s}%, ${colorHSL.l}%)`));
    irisInnerMat.color.set(new THREE.Color(`hsl(${colorHSL.h}, ${Math.max(0, colorHSL.s - 10)}%, ${colorHSL.l + 10}%)`));
  }, [bobbyColor, irisMat, irisInnerMat]);

  const pupilMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("hsl(0, 0%, 5%)"),
  }), []);

  const highlightMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("hsl(0, 0%, 100%)"),
    transparent: true, opacity: 0.95,
  }), []);

  // Brown eyebrows matching reference
  const eyebrowMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("hsl(25, 45%, 40%)"),
    transparent: true, opacity: 0.9,
  }), []);

  // Pink mouth
  const mouthMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("hsl(340, 65%, 50%)"),
    transparent: true, opacity: 0.9,
  }), []);

  const tongueMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("hsl(345, 55%, 65%)"),
    transparent: true, opacity: 0,
  }), []);

  const eyelidMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("hsl(0, 0%, 96%)"),
    transparent: true, opacity: 0.97,
  }), []);

  // Light pink blush cheeks — oval
  const blushMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("hsl(340, 60%, 80%)"),
    transparent: true, opacity: 0.55,
  }), []);

  // Round eye geometry (circle)
  const roundEyeGeo = useMemo(() => {
    const shape = createRoundEyeShape(0.32);
    return new THREE.ShapeGeometry(shape, 32);
  }, []);

  // Iris circle (smaller)
  const roundIrisGeo = useMemo(() => {
    const shape = createRoundEyeShape(0.26);
    return new THREE.ShapeGeometry(shape, 32);
  }, []);

  // Oval cheek geometry
  const cheekGeo = useMemo(() => {
    const shape = createOvalShape(0.26, 0.16);
    return new THREE.ShapeGeometry(shape, 32);
  }, []);

  // Rounded rectangle eyebrow geometry
  const eyebrowGeo = useMemo(() => {
    const shape = createRoundedRectShape(0.32, 0.07, 0.035);
    return new THREE.ShapeGeometry(shape, 16);
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
        {/* Eye white — round */}
        <mesh geometry={roundEyeGeo} material={eyeWhiteMat} />
        {/* Iris — round, dark green */}
        <mesh ref={irisRef} geometry={roundIrisGeo} position={[0, 0, 0.01]} material={irisMat} />
        {/* Inner iris — lighter green */}
        <mesh position={[0, 0, 0.015]} material={irisInnerMat}>
          <circleGeometry args={[0.18, 32]} />
        </mesh>
        {/* Pupil — black */}
        <mesh ref={pupilRef} position={[0, 0, 0.02]} material={pupilMat}>
          <circleGeometry args={[0.1, 32]} />
        </mesh>
        {/* Main highlight — top right */}
        <mesh position={[0.08, 0.1, 0.03]} material={highlightMat}>
          <circleGeometry args={[0.065, 16]} />
        </mesh>
        {/* Secondary highlight — bottom left smaller */}
        <mesh position={[-0.05, -0.06, 0.03]} material={highlightMat} scale={0.5}>
          <circleGeometry args={[0.04, 12]} />
        </mesh>
        {/* Eyelid — natural blink */}
        <mesh ref={eyelidRef} position={[0, 0.28, 0.04]} material={eyelidMat}>
          <planeGeometry args={[0.7, 0.14]} />
        </mesh>
      </group>
    );
  };

  return (
    <group ref={rootRef}>
      {/* ===== EYES ===== */}
      {renderEye("left", leftEyeRef, leftPupilRef, leftIrisRef, leftEyelidRef)}
      {renderEye("right", rightEyeRef, rightPupilRef, rightIrisRef, rightEyelidRef)}

      {/* ===== EYEBROWS — rounded rectangles, brown ===== */}
      <mesh ref={leftEyebrowRef} position={[-eyeSpacing, 0.58, 0.01]} material={eyebrowMat} rotation={[0, 0, 0]}>
        <shapeGeometry args={[createRoundedRectShape(0.32, 0.07, 0.035)]} />
      </mesh>
      <mesh ref={rightEyebrowRef} position={[eyeSpacing, 0.58, 0.01]} material={eyebrowMat} rotation={[0, 0, 0]}>
        <shapeGeometry args={[createRoundedRectShape(0.32, 0.07, 0.035)]} />
      </mesh>

      {/* ===== MOUTH — curved pink smile ===== */}
      <mesh ref={mouthRef} position={[0, -0.5, 0.01]} material={mouthMat} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[0.18, 0.025, 8, 32, Math.PI * 0.5]} />
      </mesh>

      {/* ===== TONGUE — pink, fades in when mouth opens ===== */}
      <mesh ref={tongueRef} position={[0, -0.58, 0.005]} material={tongueMat}>
        <circleGeometry args={[0.06, 24]} />
      </mesh>

      {/* ===== CHEEK BLUSH — pink ovals ===== */}
      <mesh ref={leftCheekRef} position={[-0.65, -0.3, -0.05]} material={blushMat}>
        <shapeGeometry args={[createOvalShape(0.26, 0.16)]} />
      </mesh>
      <mesh ref={rightCheekRef} position={[0.65, -0.3, -0.05]} material={blushMat}>
        <shapeGeometry args={[createOvalShape(0.26, 0.16)]} />
      </mesh>
    </group>
  );
}
