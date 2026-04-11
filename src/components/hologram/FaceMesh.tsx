/**
 * Bobby Face — Exact reproduction from kawaii SVG reference
 * Green gradient iris, bezier smile mouth, pink oval cheeks, brown brows
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

// SVG is 512x512, center (256,256). Scale factor to map to 3D coords:
const S = 3.0 / 512; // ≈ 0.00586
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

// Build smile curve geometry from SVG bezier: M190,350 C234,376.667 278,376.667 322,350
function createSmileCurveGeo(widthScale = 1, depthScale = 1): THREE.BufferGeometry {
  const [x0, y0] = svgToWorld(190, 310);
  const [x1, y1] = svgToWorld(234, 336);
  const [x2, y2] = svgToWorld(278, 336);
  const [x3, y3] = svgToWorld(322, 310);

  const curve = new THREE.CubicBezierCurve3(
    new THREE.Vector3(x0 * widthScale, y0 * depthScale, 0),
    new THREE.Vector3(x1 * widthScale, y1 * depthScale, 0),
    new THREE.Vector3(x2 * widthScale, y2 * depthScale, 0),
    new THREE.Vector3(x3 * widthScale, y3 * depthScale, 0),
  );
  return new THREE.TubeGeometry(curve, 32, 0.028, 8, false);
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
  const mouthOpenRef = useRef<THREE.Mesh>(null);
  const tongueRef = useRef<THREE.Mesh>(null);
  const leftEyelidRef = useRef<THREE.Mesh>(null);
  const rightEyelidRef = useRef<THREE.Mesh>(null);
  const leftCheekRef = useRef<THREE.Mesh>(null);
  const rightCheekRef = useRef<THREE.Mesh>(null);

  const animation = useFaceAnimation(faceState, gazeRef, audioAmplitude, viseme, emotionIntensity, emotionDuringSpeech);

  // ─── Positions from SVG ───────────────────────────────────
  const [leftEyeX, leftEyeY] = useMemo(() => svgToWorld(170, 240), []);
  const [rightEyeX, rightEyeY] = useMemo(() => svgToWorld(342, 240), []);
  const [leftBrowX, leftBrowY] = useMemo(() => svgToWorld(155, 147.5), []);
  const [rightBrowX, rightBrowY] = useMemo(() => svgToWorld(357, 147.5), []);
  const [leftCheekX, leftCheekY] = useMemo(() => svgToWorld(130, 330), []);
  const [rightCheekX, rightCheekY] = useMemo(() => svgToWorld(382, 330), []);

  // ─── Materials ────────────────────────────────────────────

  const faceDiscMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("hsl(230, 55%, 72%)"),
    transparent: true, opacity: 1,
  }), []);

  const eyeWhiteMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("#FFFFFF"),
  }), []);

  // Iris gradient layers: outer dark → mid → inner light (from SVG radialGradient)
  const irisOuterMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("#1B5E20"), transparent: true, opacity: 0.95,
  }), []);
  const irisMidMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("#388E3C"), transparent: true, opacity: 0.9,
  }), []);
  const irisInnerMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("#81C784"), transparent: true, opacity: 0.85,
  }), []);

  const pupilMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("#0D2B0E"),
  }), []);

  const highlightMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("#FFFFFF"), transparent: true, opacity: 0.9,
  }), []);
  const highlightSmallMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("#FFFFFF"), transparent: true, opacity: 0.6,
  }), []);

  // Brown eyebrows — #A16B47
  const eyebrowMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("#A16B47"), transparent: true, opacity: 0.9,
  }), []);

  // Mouth — #E91E63 (pink)
  const mouthMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("#E91E63"), transparent: true, opacity: 0.9,
  }), []);

  // Dark mouth interior (visible when mouth opens)
  const mouthInteriorMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("#880E4F"), transparent: true, opacity: 0,
  }), []);

  const tongueMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("#F48FB1"), transparent: true, opacity: 0,
  }), []);

  // Eyelid — same as face disc for natural blink
  const eyelidMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("hsl(230, 55%, 72%)"), transparent: true, opacity: 0.97,
  }), []);

  // Cheeks — #F48FB1 opacity 0.7
  const blushMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("#F48FB1"), transparent: true, opacity: 0.7,
  }), []);

  // ─── Geometries ───────────────────────────────────────────

  // Eye white — circle r≈60 in SVG → 60*S ≈ 0.35
  const eyeWhiteGeo = useMemo(() => new THREE.CircleGeometry(0.35, 32), []);

  // Iris outer ring — r=45 in SVG → 45*S ≈ 0.264
  const irisOuterGeo = useMemo(() => new THREE.CircleGeometry(0.264, 32), []);
  const irisMidGeo = useMemo(() => new THREE.CircleGeometry(0.2, 32), []);
  const irisInnerGeo = useMemo(() => new THREE.CircleGeometry(0.12, 32), []);

  // Pupil — r≈29 in SVG → 0.17
  const pupilGeo = useMemo(() => new THREE.CircleGeometry(0.17, 32), []);

  // Highlights from SVG: large r≈12→0.07, small r≈8→0.047
  const highlightLargeGeo = useMemo(() => new THREE.CircleGeometry(0.07, 16), []);
  const highlightSmallGeo = useMemo(() => new THREE.CircleGeometry(0.047, 12), []);

  // Smile curve
  const smileGeo = useMemo(() => createSmileCurveGeo(), []);

  // Eyebrow — rounded rect, w=90→0.527, h=25→0.146 in SVG, r=12.5→0.073
  const eyebrowGeo = useMemo(() => {
    const shape = createRoundedRectShape(0.527 * 0.8, 0.146 * 0.8, 0.073 * 0.8);
    return new THREE.ShapeGeometry(shape, 16);
  }, []);

  // Cheek oval — ~50w x 30h in SVG
  const cheekGeo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.absellipse(0, 0, 0.29, 0.18, 0, Math.PI * 2, false, 0);
    return new THREE.ShapeGeometry(shape, 32);
  }, []);

  // ─── Highlight positions from SVG (relative to eye center) ─
  // Left eye: highlight1 at (152.5, 223) → offset from eye(170,240) = (-17.5, -17) → (-0.10, +0.10)
  // Left eye: highlight2 at (190, 255) → offset (20, 15) → (0.12, -0.088)
  const hl1Offset: [number, number] = [-0.10, 0.10];
  const hl2Offset: [number, number] = [0.12, -0.088];
  // Right eye: highlight1 at (359, 223) → offset from eye(342,240) = (17, -17) → (0.10, +0.10)
  // Right eye: highlight2 at (322, 255) → offset (-20, 15) → (-0.12, -0.088)
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

    // Eyelids (blink)
    const blinkClose = 1 - state.eyeOpenness;
    [leftEyelidRef, rightEyelidRef].forEach(ref => {
      if (ref.current) {
        ref.current.scale.y = Math.max(0.01, blinkClose * 2.2);
        ref.current.position.y = 0.32 - blinkClose * 0.14;
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
      leftEyebrowRef.current.position.y = leftBrowY + browLift;
      leftEyebrowRef.current.rotation.z = 0.05 - state.eyebrowTilt * 0.3;
    }
    if (rightEyebrowRef.current) {
      rightEyebrowRef.current.position.y = rightBrowY + browLift;
      rightEyebrowRef.current.rotation.z = -0.05 + state.eyebrowTilt * 0.3;
    }

    // Mouth — ellipse as main mouth, always visible, animated
    if (mouthOpenRef.current) {
      const openAmount = state.mouthOpenness;
      const curveEffect = state.mouthCurve;
      const mMat = mouthOpenRef.current.material as THREE.MeshBasicMaterial;
      // Always visible, opacity varies with expression
      const baseOp = 0.65;
      const targetOp = baseOp + openAmount * 0.3 + Math.abs(curveEffect) * 0.1;
      mMat.opacity += (Math.min(0.95, targetOp) - mMat.opacity) * delta * 10;
      mouthOpenRef.current.visible = true;
      // Scale: wider when smiling, taller when speaking
      const scaleX = 0.9 + state.mouthWidth * 0.35 + Math.max(0, curveEffect) * 0.35 + openAmount * 0.15;
      const scaleY = 0.35 + openAmount * 1.0 + Math.abs(curveEffect) * 0.2;
      mouthOpenRef.current.scale.set(scaleX, scaleY, 1);
      mouthOpenRef.current.position.y = -0.48 + curveEffect * 0.06 - openAmount * 0.04;
    }

    // Tongue — appears inside mouth opening
    if (tongueRef.current) {
      const showTongue = state.mouthOpenness > 0.15;
      const tMat = tongueRef.current.material as THREE.MeshBasicMaterial;
      const targetOpacity = showTongue ? Math.min(0.75, (state.mouthOpenness - 0.15) * 3) : 0;
      tMat.opacity += (targetOpacity - tMat.opacity) * delta * 8;
      tongueRef.current.position.y = -0.44 - state.mouthOpenness * 0.06;
      tongueRef.current.scale.set(0.7 + state.mouthOpenness * 0.5, 0.5 + state.mouthOpenness * 0.8, 1);
    }

    // Cheeks
    const smile = Math.max(0, state.mouthCurve * 2);
    [leftCheekRef, rightCheekRef].forEach(ref => {
      if (ref.current) {
        const mat = ref.current.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.45 + state.cheekGlow * 0.25 + smile * 0.2;
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
      {/* Eye white */}
      <mesh geometry={eyeWhiteGeo} material={eyeWhiteMat} />
      {/* Iris — green, follows gaze */}
      <mesh ref={irisRef} geometry={irisOuterGeo} position={[0, -0.03, 0.01]} material={irisOuterMat} />
      {/* Pupil — very dark green/black */}
      <mesh ref={pupilRef} geometry={pupilGeo} position={[0, -0.02, 0.02]} material={pupilMat} />
      {/* Main highlight — large, top */}
      <mesh position={[hl1[0], hl1[1], 0.03]} material={highlightMat} geometry={highlightLargeGeo} />
      {/* Secondary highlight — small, bottom */}
      <mesh position={[hl2[0], hl2[1], 0.03]} material={highlightSmallMat} geometry={highlightSmallGeo} />
      {/* Eyelid — face-disc blue for blink */}
      <mesh ref={eyelidRef} position={[0, 0.32, 0.04]} material={eyelidMat}>
        <planeGeometry args={[0.76, 0.18]} />
      </mesh>
    </group>
  );

  return (
    <group ref={rootRef}>

      {/* ===== CHEEKS — pink ovals (behind eyes) ===== */}
      <mesh ref={leftCheekRef} position={[leftCheekX, leftCheekY, 0.005]} material={blushMat} geometry={cheekGeo} />
      <mesh ref={rightCheekRef} position={[rightCheekX, rightCheekY, 0.005]} material={blushMat} geometry={cheekGeo} />

      {/* ===== EYES ===== */}
      {renderEye("left", leftEyeRef, leftPupilRef, leftIrisRef, leftEyelidRef, leftEyeX, leftEyeY, hl1Offset, hl2Offset)}
      {renderEye("right", rightEyeRef, rightPupilRef, rightIrisRef, rightEyelidRef, rightEyeX, rightEyeY, hl1OffsetR, hl2OffsetR)}

      {/* ===== EYEBROWS — brown rounded rectangles ===== */}
      <mesh ref={leftEyebrowRef} position={[leftBrowX, leftBrowY, 0.01]} material={eyebrowMat} geometry={eyebrowGeo} />
      <mesh ref={rightEyebrowRef} position={[rightBrowX, rightBrowY, 0.01]} material={eyebrowMat} geometry={eyebrowGeo} />

      {/* ===== MOUTH — ellipse, always visible ===== */}
      <mesh ref={mouthOpenRef} position={[0, -0.35, 0.008]} material={mouthInteriorMat}>
        <circleGeometry args={[0.14, 32]} />
      </mesh>

      {/* ===== TONGUE — inside mouth ===== */}
      <mesh ref={tongueRef} position={[0, -0.42, 0.01]} material={tongueMat}>
        <circleGeometry args={[0.07, 24]} />
      </mesh>
    </group>
  );
}
