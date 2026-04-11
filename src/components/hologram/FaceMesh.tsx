/**
 * Bobby Face — Faithful reproduction of the physical toy
 * Blue/lavender face disc, sage-green eyes, brown brows, pink cheeks & smile
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
  emotionDuringSpeech?: FaceState;
  bobbyColor?: string;
}

// Almond/oval eye shape matching the toy
function createAlmondEyeShape(w: number, h: number): THREE.Shape {
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

export function FaceMesh({ faceState, gazeRef, audioAmplitude, viseme, emotionIntensity = 0.7, emotionDuringSpeech }: FaceMeshProps) {
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

  // ─── Materials matching the physical toy ──────────────────

  // Blue/lavender face disc background
  const faceDiscMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("hsl(230, 55%, 72%)"),
    transparent: true, opacity: 1,
  }), []);

  // Eye whites
  const eyeWhiteMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("hsl(0, 0%, 100%)"),
    transparent: true, opacity: 1,
  }), []);

  // Outer iris — sage/olive green like the toy
  const irisMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("hsl(120, 35%, 35%)"),
    transparent: true, opacity: 0.95,
  }), []);

  // Inner iris — slightly lighter green
  const irisInnerMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("hsl(120, 30%, 42%)"),
    transparent: true, opacity: 0.85,
  }), []);

  // Pure black pupil
  const pupilMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("hsl(0, 0%, 5%)"),
  }), []);

  // Single white highlight dot
  const highlightMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("hsl(0, 0%, 100%)"),
    transparent: true, opacity: 0.95,
  }), []);

  // Brown eyebrows
  const eyebrowMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("hsl(20, 40%, 42%)"),
    transparent: true, opacity: 0.9,
  }), []);

  // Pink/coral mouth
  const mouthMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("hsl(345, 60%, 55%)"),
    transparent: true, opacity: 0.9,
  }), []);

  const tongueMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("hsl(345, 55%, 65%)"),
    transparent: true, opacity: 0,
  }), []);

  // Eyelid matches face disc color for natural blink
  const eyelidMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("hsl(230, 55%, 72%)"),
    transparent: true, opacity: 0.97,
  }), []);

  // Coral/pink round cheeks
  const blushMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("hsl(350, 55%, 72%)"),
    transparent: true, opacity: 0.7,
  }), []);

  // ─── Geometries ───────────────────────────────────────────

  // Almond eye white (wider than tall)
  const eyeWhiteGeo = useMemo(() => {
    const shape = createAlmondEyeShape(0.3, 0.34);
    return new THREE.ShapeGeometry(shape, 32);
  }, []);

  // Iris circle
  const irisGeo = useMemo(() => new THREE.CircleGeometry(0.24, 32), []);

  // ─── Frame Update ──────────────────────────────────────────
  useFrame((_, delta) => {
    const state = animation.update(delta);
    if (!rootRef.current) return;

    // Head — very subtle follow
    rootRef.current.rotation.z = state.headTiltZ * 0.3;
    rootRef.current.rotation.y = state.headTiltY * 0.15;
    rootRef.current.rotation.x = state.headTiltX * 0.08;

    // Pupils — strong cursor tracking
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
    // Iris parallax
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

    // Eyelids (blink) — sweeps down from top, matches face disc color
    const blinkClose = 1 - state.eyeOpenness;
    [leftEyelidRef, rightEyelidRef].forEach(ref => {
      if (ref.current) {
        ref.current.scale.y = Math.max(0.01, blinkClose * 2.2);
        ref.current.position.y = 0.3 - blinkClose * 0.14;
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
      leftEyebrowRef.current.position.y = 0.62 + browLift;
      leftEyebrowRef.current.rotation.z = 0.1 - state.eyebrowTilt * 0.3;
    }
    if (rightEyebrowRef.current) {
      rightEyebrowRef.current.position.y = 0.62 + browLift;
      rightEyebrowRef.current.rotation.z = -0.1 + state.eyebrowTilt * 0.3;
    }

    // Mouth
    if (mouthRef.current) {
      const curveEffect = state.mouthCurve;
      const speakScale = 1 + state.mouthOpenness * 0.5 + state.mouthWidth * 0.2;
      mouthRef.current.scale.x = speakScale * (1 + curveEffect * 0.3);
      mouthRef.current.scale.y = 1 + Math.abs(curveEffect) * 0.8 + state.mouthOpenness * 0.6;
      mouthRef.current.position.y = -0.48 + curveEffect * 0.1;
      mouthRef.current.rotation.z = Math.PI + state.mouthWidth * 0.02;
      const mat = mouthRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.75 + state.mouthOpenness * 0.25 + Math.abs(curveEffect) * 0.15;
    }

    // Tongue
    if (tongueRef.current) {
      const showTongue = state.mouthOpenness > 0.12;
      const tMat = tongueRef.current.material as THREE.MeshBasicMaterial;
      const targetOpacity = showTongue ? Math.min(0.7, (state.mouthOpenness - 0.12) * 3) : 0;
      tMat.opacity += (targetOpacity - tMat.opacity) * delta * 8;
      tongueRef.current.position.y = -0.56 - state.mouthOpenness * 0.08;
      tongueRef.current.scale.x = 0.8 + state.mouthOpenness * 0.5;
    }

    // Cheeks
    const smile = Math.max(0, state.mouthCurve * 2);
    [leftCheekRef, rightCheekRef].forEach(ref => {
      if (ref.current) {
        const mat = ref.current.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.4 + state.cheekGlow * 0.3 + smile * 0.2;
      }
    });

    irisMat.opacity = 0.7 + state.irisGlow * 0.3;
  });

  // ─── Layout ────────────────────────────────────────────────
  const eyeSpacing = 0.48;
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
      <group ref={eyeRef} position={[x, eyeY, 0.01]} key={side}>
        {/* Eye white — almond oval */}
        <mesh geometry={eyeWhiteGeo} material={eyeWhiteMat} />
        {/* Iris — sage green circle */}
        <mesh ref={irisRef} geometry={irisGeo} position={[0, -0.02, 0.01]} material={irisMat} />
        {/* Inner iris ring */}
        <mesh position={[0, -0.02, 0.015]} material={irisInnerMat}>
          <circleGeometry args={[0.16, 32]} />
        </mesh>
        {/* Pupil — black */}
        <mesh ref={pupilRef} position={[0, 0, 0.02]} material={pupilMat}>
          <circleGeometry args={[0.09, 32]} />
        </mesh>
        {/* Single highlight — top left like the toy */}
        <mesh position={[-0.06, 0.1, 0.03]} material={highlightMat}>
          <circleGeometry args={[0.055, 16]} />
        </mesh>
        {/* Eyelid — matches face disc blue for natural blink */}
        <mesh ref={eyelidRef} position={[0, 0.3, 0.04]} material={eyelidMat}>
          <planeGeometry args={[0.68, 0.16]} />
        </mesh>
      </group>
    );
  };

  return (
    <group ref={rootRef}>
      {/* ===== FACE DISC — blue/lavender background ===== */}
      <mesh position={[0, -0.05, -0.02]} material={faceDiscMat}>
        <circleGeometry args={[1.35, 64]} />
      </mesh>

      {/* ===== EYES ===== */}
      {renderEye("left", leftEyeRef, leftPupilRef, leftIrisRef, leftEyelidRef)}
      {renderEye("right", rightEyeRef, rightPupilRef, rightIrisRef, rightEyelidRef)}

      {/* ===== EYEBROWS — brown rounded rectangles ===== */}
      <mesh ref={leftEyebrowRef} position={[-eyeSpacing, 0.58, 0.01]} material={eyebrowMat} rotation={[0, 0, 0]}>
        <shapeGeometry args={[createRoundedRectShape(0.28, 0.065, 0.03)]} />
      </mesh>
      <mesh ref={rightEyebrowRef} position={[eyeSpacing, 0.58, 0.01]} material={eyebrowMat} rotation={[0, 0, 0]}>
        <shapeGeometry args={[createRoundedRectShape(0.28, 0.065, 0.03)]} />
      </mesh>

      {/* ===== MOUTH — small pink curved smile ===== */}
      <mesh ref={mouthRef} position={[0, -0.48, 0.01]} material={mouthMat} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[0.13, 0.022, 8, 32, Math.PI * 0.45]} />
      </mesh>

      {/* ===== TONGUE ===== */}
      <mesh ref={tongueRef} position={[0, -0.56, 0.005]} material={tongueMat}>
        <circleGeometry args={[0.05, 24]} />
      </mesh>

      {/* ===== CHEEKS — round coral/pink circles ===== */}
      <mesh ref={leftCheekRef} position={[-0.58, -0.28, 0.005]} material={blushMat}>
        <circleGeometry args={[0.16, 32]} />
      </mesh>
      <mesh ref={rightCheekRef} position={[0.58, -0.28, 0.005]} material={blushMat}>
        <circleGeometry args={[0.16, 32]} />
      </mesh>
    </group>
  );
}
