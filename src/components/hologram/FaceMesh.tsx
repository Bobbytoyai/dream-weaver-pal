/**
 * Bobby Face — Dynamic expression system with SVG-matched colors
 * Green gradient iris (#4CAF50→#1B5E20), black pupils, brown brows (#8B6F47),
 * pink cheeks (#FF69B4), magenta mouth (#E91E63) with real-time morphing
 */
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { FaceState, useFaceAnimation } from "./useFaceAnimation";
import { VisemeState } from "./useAudioAmplitude";
import type { ExpressionCombo } from "@/lib/bobby/expressionLibrary";

interface FaceMeshProps {
  faceState: FaceState;
  gazeRef: React.MutableRefObject<{ x: number; y: number }>;
  audioAmplitude: number;
  viseme?: VisemeState;
  emotionIntensity?: number;
  emotionDuringSpeech?: FaceState;
  bobbyColor?: string;
  expressionOverride?: ExpressionCombo;
  expressionIntensityLevel?: number;
}

// SVG is 512x512, center (256,256). Scale factor to map to 3D coords:
const S = 3.0 / 512;
const cx = 256, cy = 256;
function svgToWorld(sx: number, sy: number): [number, number] {
  return [(sx - cx) * S, (cy - sy) * S];
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

// ─── Dynamic mouth curve builder ─────────────────────────────
// Returns points for a quadratic bezier curve based on expression state
const MOUTH_SEGMENTS = 32;

function buildMouthTubeGeo(
  mouthCurve: number,
  mouthWidth: number,
  mouthRound: number,
): THREE.TubeGeometry {
  const halfW = (0.18 + mouthWidth * 0.14) * (1 - mouthRound * 0.5);
  const curveDepth = mouthCurve * 0.22;

  const p0 = new THREE.Vector3(-halfW, 0, 0);
  const p1 = new THREE.Vector3(0, -curveDepth, 0);
  const p2 = new THREE.Vector3(halfW, 0, 0);

  const curve = new THREE.QuadraticBezierCurve3(p0, p1, p2);
  return new THREE.TubeGeometry(curve, 24, 0.032, 8, false);
}

function buildMouthFillShape(
  mouthCurve: number,
  mouthWidth: number,
  mouthOpenness: number,
  mouthRound: number,
): THREE.Shape {
  const shape = new THREE.Shape();
  const halfW = (0.18 + mouthWidth * 0.14) * (1 - mouthRound * 0.5);
  const curveDepth = mouthCurve * 0.22;
  const openDepth = mouthOpenness * 0.32 + mouthRound * 0.25;

  // Top lip line (same as the curve)
  shape.moveTo(-halfW, 0);
  shape.quadraticCurveTo(0, -curveDepth, halfW, 0);
  // Bottom lip — goes down by openDepth
  shape.quadraticCurveTo(0, -curveDepth + openDepth, -halfW, 0);

  return shape;
}

export function FaceMesh({ faceState, gazeRef, audioAmplitude, viseme, emotionIntensity = 0.7, emotionDuringSpeech, expressionOverride, expressionIntensityLevel }: FaceMeshProps) {
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
  const mouthLineObjRef = useRef<THREE.Mesh | null>(null);
  const mouthFillRef = useRef<THREE.Mesh>(null);
  const prevMouthState = useRef({ curve: -999, width: -999, round: -999 });
  const tongueRef = useRef<THREE.Mesh>(null);
  const leftEyelidRef = useRef<THREE.Mesh>(null);
  const rightEyelidRef = useRef<THREE.Mesh>(null);
  const leftCheekRef = useRef<THREE.Mesh>(null);
  const rightCheekRef = useRef<THREE.Mesh>(null);

  const animation = useFaceAnimation(faceState, gazeRef, audioAmplitude, viseme, emotionIntensity, emotionDuringSpeech, expressionOverride, expressionIntensityLevel);

  // ─── Positions from SVG ───────────────────────────────────
  const [leftEyeX, leftEyeY] = useMemo(() => svgToWorld(170, 240), []);
  const [rightEyeX, rightEyeY] = useMemo(() => svgToWorld(342, 240), []);
  const [leftBrowX, leftBrowY] = useMemo(() => svgToWorld(155, 147.5), []);
  const [rightBrowX, rightBrowY] = useMemo(() => svgToWorld(357, 147.5), []);
  const [leftCheekX, leftCheekY] = useMemo(() => svgToWorld(155, 340), []);
  const [rightCheekX, rightCheekY] = useMemo(() => svgToWorld(357, 340), []);

  // ─── Materials ────────────────────────────────────────────

  const eyeWhiteMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("#FFFFFF"),
  }), []);

  const irisOuterMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("#1B5E20"), transparent: true, opacity: 0.95,
  }), []);
  const irisMidMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("#388E3C"), transparent: true, opacity: 0.9,
  }), []);
  const irisInnerMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("#4CAF50"), transparent: true, opacity: 0.85,
  }), []);

  const pupilMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("#000000"),
  }), []);

  const highlightMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("#FFFFFF"), transparent: true, opacity: 0.9,
  }), []);
  const highlightSmallMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("#FFFFFF"), transparent: true, opacity: 0.6,
  }), []);

  // Brown eyebrows — #8B6F47
  const eyebrowMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("#8B6F47"), transparent: true, opacity: 0.9,
  }), []);

  // Mouth line material — #E91E63 (magenta)
  const mouthMeshMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("#E91E63"),
  }), []);

  // Mouth fill (visible when open) — #C2185B
  const mouthFillMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("#C2185B"), transparent: true, opacity: 0, side: THREE.DoubleSide,
  }), []);

  // Tongue — #FF80AB
  const tongueMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("#FF80AB"), transparent: true, opacity: 0,
  }), []);

  // Eyelid — match background
  const eyelidMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("hsl(230, 55%, 72%)"), transparent: true, opacity: 0.97,
  }), []);

  // Cheeks — #FF69B4 opacity 0.6
  const blushMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("#FF69B4"), transparent: true, opacity: 0.6,
  }), []);

  // ─── Geometries ───────────────────────────────────────────

  // Eye white — almond shape
  const eyeWhiteGeo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.absellipse(0, 0, 0.38, 0.32, 0, Math.PI * 2, false, 0);
    return new THREE.ShapeGeometry(shape, 32);
  }, []);

  const irisOuterGeo = useMemo(() => new THREE.CircleGeometry(0.264, 32), []);
  const irisMidGeo = useMemo(() => new THREE.CircleGeometry(0.2, 32), []);
  const irisInnerGeo = useMemo(() => new THREE.CircleGeometry(0.12, 32), []);
  const pupilGeo = useMemo(() => new THREE.CircleGeometry(0.17, 32), []);
  const highlightLargeGeo = useMemo(() => new THREE.CircleGeometry(0.07, 16), []);
  const highlightSmallGeo = useMemo(() => new THREE.CircleGeometry(0.047, 12), []);

  // Mouth tube geo ref — rebuilt each frame
  const mouthTubeGeoRef = useRef<THREE.TubeGeometry | null>(null);

  // Dynamic mouth fill geometry (will be replaced each frame when open)
  const mouthFillGeo = useMemo(() => {
    const shape = buildMouthFillShape(0.08, 0.5, 0, 0);
    return new THREE.ShapeGeometry(shape, 16);
  }, []);

  // Eyebrow
  const eyebrowGeo = useMemo(() => {
    const shape = createRoundedRectShape(0.527 * 0.8, 0.146 * 0.8, 0.073 * 0.8);
    return new THREE.ShapeGeometry(shape, 16);
  }, []);

  // Cheek oval
  const cheekGeo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.absellipse(0, 0, 0.16, 0.12, 0, Math.PI * 2, false, 0);
    return new THREE.ShapeGeometry(shape, 32);
  }, []);

  // Highlight positions
  const hl1Offset: [number, number] = [-0.10, 0.10];
  const hl2Offset: [number, number] = [0.12, -0.088];
  const hl1OffsetR: [number, number] = [0.10, 0.10];
  const hl2OffsetR: [number, number] = [-0.12, -0.088];

  // ─── Frame Update ──────────────────────────────────────────
  useFrame((_, delta) => {
    const state = animation.update(delta);
    if (!rootRef.current) return;

    rootRef.current.rotation.z = state.headTiltZ * 0.3;
    rootRef.current.rotation.y = state.headTiltY * 0.15;
    rootRef.current.rotation.x = state.headTiltX * 0.08;

    // Pupils — gaze tracking
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

    // Eyelids (blink) — slides down from top to fully cover eye
    const blinkClose = 1 - state.eyeOpenness;
    [leftEyelidRef, rightEyelidRef].forEach(ref => {
      if (ref.current) {
        // When fully closed (blinkClose=1), eyelid must cover entire eye
        // Eye ellipse goes from -0.32 to +0.32 (height 0.64)
        // Eyelid starts above eye and slides down proportionally
        const coverAmount = blinkClose; // 0=open, 1=fully closed
        ref.current.scale.y = Math.max(0.01, coverAmount * 1.0);
        // Position: start at top of eye, slide down as closing
        ref.current.position.y = 0.32 - coverAmount * 0.32;
        ref.current.visible = coverAmount > 0.02;
      }
    });

    // Eye scale + happy squish
    const eyeScale = 0.9 + state.eyeOpenness * 0.15;
    const happySquish = state.mouthCurve > 0.3 ? 1 + (state.mouthCurve - 0.3) * 0.1 : 1;
    [leftEyeRef, rightEyeRef].forEach(ref => {
      if (ref.current) ref.current.scale.set(eyeScale * happySquish, eyeScale / happySquish, 1);
    });

    // Eyebrows — amplified lift and tilt for visible expressiveness
    const browLift = state.eyebrowHeight * 0.35;
    if (leftEyebrowRef.current) {
      leftEyebrowRef.current.position.y = leftBrowY + browLift;
      leftEyebrowRef.current.rotation.z = 0.05 - state.eyebrowTilt * 0.6;
    }
    if (rightEyebrowRef.current) {
      rightEyebrowRef.current.position.y = rightBrowY + browLift;
      rightEyebrowRef.current.rotation.z = -0.05 + state.eyebrowTilt * 0.6;
    }

    // ─── DYNAMIC MOUTH ─────────────────────────────────────
    // Only rebuild tube when shape changes meaningfully (perf optimization)
    const mc = state.mouthCurve, mw = state.mouthWidth, mr = state.mouthRound;
    const prev = prevMouthState.current;
    const needsRebuild = Math.abs(mc - prev.curve) > 0.005 || Math.abs(mw - prev.width) > 0.005 || Math.abs(mr - prev.round) > 0.005;
    
    if (mouthGroupRef.current && needsRebuild) {
      prev.curve = mc; prev.width = mw; prev.round = mr;
      // Remove old tube
      if (mouthLineObjRef.current) {
        mouthGroupRef.current.remove(mouthLineObjRef.current);
        mouthLineObjRef.current.geometry.dispose();
        mouthLineObjRef.current = null;
      }
      // Build new tube from current expression
      const newTubeGeo = buildMouthTubeGeo(mc, mw, mr);
      const tubeObj = new THREE.Mesh(newTubeGeo, mouthMeshMat);
      mouthGroupRef.current.add(tubeObj);
      mouthGroupRef.current.add(tubeObj);
      mouthLineObjRef.current = tubeObj;
    }

    // Update mouth fill (visible when mouth is open)
    if (mouthFillRef.current) {
      const openAmount = state.mouthOpenness;
      const isOpen = openAmount > 0.03 || state.mouthRound > 0.05;
      
      if (isOpen) {
        // Rebuild fill shape geometry
        const newShape = buildMouthFillShape(
          state.mouthCurve,
          state.mouthWidth,
          state.mouthOpenness,
          state.mouthRound,
        );
        const newGeo = new THREE.ShapeGeometry(newShape, 16);
        mouthFillRef.current.geometry.dispose();
        mouthFillRef.current.geometry = newGeo;
        mouthFillMat.opacity = Math.min(0.9, openAmount * 3 + state.mouthRound * 2);
      } else {
        mouthFillMat.opacity = 0;
      }
    }

    // Tongue — appears inside open mouth
    if (tongueRef.current) {
      const showTongue = state.mouthOpenness > 0.15;
      const targetOpacity = showTongue ? Math.min(0.75, (state.mouthOpenness - 0.15) * 3) : 0;
      tongueMat.opacity += (targetOpacity - tongueMat.opacity) * delta * 8;
      tongueRef.current.position.y = -0.70 - state.mouthOpenness * 0.08;
      tongueRef.current.scale.set(0.6 + state.mouthOpenness * 0.5, 0.4 + state.mouthOpenness * 0.6, 1);
    }

    // Cheeks — glow with emotion
    const smile = Math.max(0, state.mouthCurve * 2);
    [leftCheekRef, rightCheekRef].forEach(ref => {
      if (ref.current) {
        const mat = ref.current.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.4 + state.cheekGlow * 0.3 + smile * 0.2;
      }
    });

    irisOuterMat.opacity = 0.75 + (state as any).irisGlow * 0.25;
  });

  // ─── Render ────────────────────────────────────────────────

  const renderEye = (
    side: "left" | "right",
    eyeRef: React.RefObject<THREE.Group>,
    pupilRef: React.RefObject<THREE.Mesh>,
    irisRef: React.RefObject<THREE.Mesh>,
    eyelidRef: React.RefObject<THREE.Mesh>,
    eyeX: number,
    eyeY: number,
    hl1: [number, number],
    hl2: [number, number],
  ) => (
    <group ref={eyeRef} position={[eyeX, eyeY, 0.01]} key={side}>
      <mesh geometry={eyeWhiteGeo} material={eyeWhiteMat} />
      <mesh ref={irisRef} geometry={irisOuterGeo} position={[0, -0.03, 0.01]} material={irisOuterMat} />
      <mesh ref={pupilRef} geometry={pupilGeo} position={[0, -0.02, 0.02]} material={pupilMat} />
      <mesh position={[hl1[0], hl1[1], 0.03]} material={highlightMat} geometry={highlightLargeGeo} />
      <mesh position={[hl2[0], hl2[1], 0.03]} material={highlightSmallMat} geometry={highlightSmallGeo} />
      <mesh ref={eyelidRef} position={[0, 0.32, 0.04]} material={eyelidMat}>
        <planeGeometry args={[0.86, 0.72]} />
      </mesh>
    </group>
  );

  return (
    <group ref={rootRef}>
      {/* Cheeks */}
      <mesh ref={leftCheekRef} position={[leftCheekX, leftCheekY, 0.005]} material={blushMat} geometry={cheekGeo} />
      <mesh ref={rightCheekRef} position={[rightCheekX, rightCheekY, 0.005]} material={blushMat} geometry={cheekGeo} />

      {/* Eyes */}
      {renderEye("left", leftEyeRef, leftPupilRef, leftIrisRef, leftEyelidRef, leftEyeX, leftEyeY, hl1Offset, hl2Offset)}
      {renderEye("right", rightEyeRef, rightPupilRef, rightIrisRef, rightEyelidRef, rightEyeX, rightEyeY, hl1OffsetR, hl2OffsetR)}

      {/* Eyebrows */}
      <mesh ref={leftEyebrowRef} position={[leftBrowX, leftBrowY, 0.01]} material={eyebrowMat} geometry={eyebrowGeo} />
      <mesh ref={rightEyebrowRef} position={[rightBrowX, rightBrowY, 0.01]} material={eyebrowMat} geometry={eyebrowGeo} />

      {/* Mouth group — contains dynamic THREE.Line + fill mesh */}
      <group ref={mouthGroupRef} position={[0, -0.65, 0.008]} />

      {/* Mouth fill — visible when open */}
      <mesh ref={mouthFillRef} position={[0, -0.65, 0.006]} geometry={mouthFillGeo} material={mouthFillMat} />

      {/* Tongue */}
      <mesh ref={tongueRef} position={[0, -0.73, 0.01]} material={tongueMat}>
        <circleGeometry args={[0.07, 24]} />
      </mesh>
    </group>
  );
}
