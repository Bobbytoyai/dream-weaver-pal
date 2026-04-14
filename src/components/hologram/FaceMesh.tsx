/**
 * Bobby Face — Dynamic expression system v2
 * New mouth: upper lip arc + lower lip arc that opens smoothly
 * New eyebrows: curved arcs that tilt, raise, and furrow naturally
 * Color system: bobbyColor prop tints iris + cheeks dynamically
 */
import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { FaceState, useFaceAnimation } from "./useFaceAnimation";
import { VisemeState } from "./useAudioAmplitude";
import type { ExpressionCombo } from "@/lib/bobby/expressionLibrary";

// Map color IDs to hex values for per-element coloring
const IRIS_HEX: Record<string, string> = {
  blue: "#4A90D9", green: "#5CB85C", purple: "#9B59B6",
  amber: "#E6A532", pink: "#E06B8F", teal: "#3DBDB5",
};
const CHEEK_HEX: Record<string, string> = {
  pink: "#F8B4C8", peach: "#FCDAB7", lavender: "#D4B8E8",
  coral: "#F5A08C", mint: "#B8E6D0", none: "",
};
const EYEBROW_HEX: Record<string, string> = {
  brown: "#8B6914", dark: "#4A3728", blonde: "#D4A54A",
  grey: "#9E9E9E", blue: "#5B8BD4", pink: "#D47BA0",
};
const BG_HEX: Record<string, string> = {
  "soft-blue": "#E8F0FE", "soft-pink": "#FDE8F0", "soft-green": "#E8FEF0",
  "soft-purple": "#F0E8FE", "soft-yellow": "#FEF8E8", "white": "#FFFFFF",
  "dark": "#1A1A2E", "night": "#0D1B2A",
};

interface BobbyColors {
  iris: string;
  cheek: string;
  eyebrow: string;
  background: string;
}

interface FaceMeshProps {
  faceState: FaceState;
  gazeRef: React.MutableRefObject<{ x: number; y: number }>;
  audioAmplitude: number;
  viseme?: VisemeState;
  emotionIntensity?: number;
  emotionDuringSpeech?: FaceState;
  bobbyColor?: string;
  bobbyColors?: BobbyColors;
  expressionOverride?: ExpressionCombo;
  expressionIntensityLevel?: number;
}

// SVG is 512x512, center (256,256). Scale factor to map to 3D coords:
const S = 3.0 / 512;
const cx = 256, cy = 256;
function svgToWorld(sx: number, sy: number): [number, number] {
  return [(sx - cx) * S, (cy - sy) * S];
}

// ─── Eyebrow builder — slightly rounded rectangle ─────────────────────
function buildEyebrowShape(_archHeight: number = 0.06): THREE.Shape {
  const shape = new THREE.Shape();
  const w = 0.30;   // half width
  const h = 0.09;   // half height
  const r = 0.045;  // corner radius — slightly rounded (was 0.015)

  shape.moveTo(-w + r, -h);
  shape.lineTo(w - r, -h);
  shape.quadraticCurveTo(w, -h, w, -h + r);
  shape.lineTo(w, h - r);
  shape.quadraticCurveTo(w, h, w - r, h);
  shape.lineTo(-w + r, h);
  shape.quadraticCurveTo(-w, h, -w, h - r);
  shape.lineTo(-w, -h + r);
  shape.quadraticCurveTo(-w, -h, -w + r, -h);

  return shape;
}

// ─── Mouth shape builder v5 — smiley arc + open ellipse ──────────────────
// At rest: visible curved smile arc (like a smiley emoji)
// When speaking/shocked: opens into ellipse
// Parameters: curve (-0.3 to 0.6), width (0-1), openness (0-1), round (0-1)

function buildMouthShape(curve: number, width: number, openness: number, round: number): THREE.Shape {
  const shape = new THREE.Shape();
  
  const halfW = (0.14 + width * 0.08) * (1 - round * 0.2);
  const thickness = 0.040;
  
  const isOpen = openness > 0.15 || round > 0.10;
  
  if (!isOpen) {
    // ── CLOSED MOUTH — bezier smile/neutral/sad arc ──
    const depth = curve * 0.35;
    const renderDepth = Math.abs(depth) < 0.001 ? 0.001 : depth;
    const renderSign = renderDepth >= 0 ? 1 : -1;
    
    shape.moveTo(-halfW, 0);
    shape.bezierCurveTo(
      -halfW * 0.5, -renderDepth,
      halfW * 0.5, -renderDepth,
      halfW, 0
    );
    shape.bezierCurveTo(
      halfW * 0.5, -renderDepth - thickness * renderSign,
      -halfW * 0.5, -renderDepth - thickness * renderSign,
      -halfW, 0
    );
    shape.closePath();
  } else {
    // ── OPEN MOUTH — organic shape, NOT a perfect ellipse ──
    // Wider horizontally, more natural with upper/lower lip arcs
    const mouthW = halfW * (0.75 + (1 - Math.min(1, round * 1.5)) * 0.35);
    const mouthH = 0.03 + openness * 0.16 + round * 0.08;
    const yOff = -(curve * 0.06);
    
    // Upper lip: flatter arc
    const upperFlatten = 0.6 + round * 0.2; // upper lip less curved
    // Lower lip: rounder, deeper
    const lowerDeepen = 1.0 + openness * 0.3;
    
    // Draw upper lip arc (left to right)
    shape.moveTo(-mouthW, yOff);
    shape.bezierCurveTo(
      -mouthW * 0.4, yOff + mouthH * upperFlatten,
      mouthW * 0.4, yOff + mouthH * upperFlatten,
      mouthW, yOff
    );
    // Draw lower lip arc (right to left, goes down)
    shape.bezierCurveTo(
      mouthW * 0.5, yOff - mouthH * lowerDeepen,
      -mouthW * 0.5, yOff - mouthH * lowerDeepen,
      -mouthW, yOff
    );
    shape.closePath();
  }
  
  return shape;
}

export function FaceMesh({ faceState, gazeRef, audioAmplitude, viseme, emotionIntensity = 0.7, emotionDuringSpeech, bobbyColor, bobbyColors, expressionOverride, expressionIntensityLevel }: FaceMeshProps) {
  const rootRef = useRef<THREE.Group>(null);
  const leftEyeRef = useRef<THREE.Group>(null);
  const rightEyeRef = useRef<THREE.Group>(null);
  const leftPupilRef = useRef<THREE.Mesh>(null);
  const rightPupilRef = useRef<THREE.Mesh>(null);
  const leftIrisRef = useRef<THREE.Mesh>(null);
  const rightIrisRef = useRef<THREE.Mesh>(null);
  const leftEyebrowRef = useRef<THREE.Mesh>(null);
  const rightEyebrowRef = useRef<THREE.Mesh>(null);
  const upperLipRef = useRef<THREE.Mesh>(null);
  
  const mouthInteriorRef = useRef<THREE.Mesh>(null);
  const tongueRef = useRef<THREE.Mesh>(null);
  const leftEyelidRef = useRef<THREE.Mesh>(null);
  const rightEyelidRef = useRef<THREE.Mesh>(null);
  const leftCheekRef = useRef<THREE.Mesh>(null);
  const rightCheekRef = useRef<THREE.Mesh>(null);
  const leftHl1Ref = useRef<THREE.Mesh>(null);
  const leftHl2Ref = useRef<THREE.Mesh>(null);
  const rightHl1Ref = useRef<THREE.Mesh>(null);
  const rightHl2Ref = useRef<THREE.Mesh>(null);
  const prevMouthKey = useRef("");

  const animation = useFaceAnimation(faceState, gazeRef, audioAmplitude, viseme, emotionIntensity, emotionDuringSpeech, expressionOverride, expressionIntensityLevel);

  // ─── Positions from SVG ───────────────────────────────────
  const [leftEyeX, leftEyeY] = useMemo(() => svgToWorld(170, 240), []);
  const [rightEyeX, rightEyeY] = useMemo(() => svgToWorld(342, 240), []);
  const [leftBrowX, leftBrowY] = useMemo(() => svgToWorld(155, 147.5), []);
  const [rightBrowX, rightBrowY] = useMemo(() => svgToWorld(357, 147.5), []);
  const [leftCheekX, leftCheekY] = useMemo(() => svgToWorld(155, 330), []);
  const [rightCheekX, rightCheekY] = useMemo(() => svgToWorld(357, 330), []);

  // ─── Materials ────────────────────────────────────────────
  const eyeOutlineMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("#3A3A5C"), transparent: true, opacity: 0.22,
  }), []);
  const eyeWhiteMat = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color("#FFFFFF") }), []);

  const irisOuterMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("#1B5E20"), transparent: true, opacity: 0.95,
  }), []);

  const pupilMat = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color("#000000") }), []);

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

  // Lip material — cute pink-red
  const lipMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("#E91E63"), side: THREE.DoubleSide, transparent: true, opacity: 1,
  }), []);

  // Mouth interior — dark red
  const mouthInteriorMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("#8B0000"), transparent: true, opacity: 0, side: THREE.DoubleSide,
  }), []);

  // Tongue — soft pink (Apple-style)
  const tongueMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("#FFB0C0"), transparent: true, opacity: 0,
  }), []);

  // Eyelid — matches background with slight tint for contrast
  const bgKey = bobbyColors?.background || "soft-blue";
  const bgHex = BG_HEX[bgKey] || BG_HEX["soft-blue"];
  const eyelidMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color(bgHex),
    transparent: false,
    opacity: 1.0,
    roughness: 0.6,
    metalness: 0.05,
  }), []);
  
  // Keep eyelid color synced — always a noticeably darker shade of the background
  useEffect(() => {
    const col = new THREE.Color(bgHex);
    const hsl = { h: 0, s: 0, l: 0 };
    col.getHSL(hsl);
    const darkenedL = Math.max(0.15, hsl.l - 0.32);
    const boostedS = Math.min(1, hsl.s * 1.25 + 0.05);
    col.setHSL(hsl.h, boostedS, darkenedL);
    eyelidMat.color.set(col);
  }, [bgHex, eyelidMat]);

  // Cheeks — #FF69B4 — more visible pink
  const blushMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("#FF85B0"), transparent: true, opacity: 0.55,
  }), []);

  // ─── Apply per-element colors ───────────────
  const bobbyColorsKey = bobbyColors ? JSON.stringify(bobbyColors) : "";
  useEffect(() => {

    if (bobbyColors) {
      const irisHex = IRIS_HEX[bobbyColors.iris] || IRIS_HEX.blue;
      irisOuterMat.color.set(irisHex);
      const cheekHex = CHEEK_HEX[bobbyColors.cheek];
      if (cheekHex) {
        blushMat.color.set(cheekHex);
        blushMat.opacity = 0.55;
      } else {
        blushMat.opacity = 0;
      }
      const browHex = EYEBROW_HEX[bobbyColors.eyebrow] || EYEBROW_HEX.brown;
      eyebrowMat.color.set(browHex);
    } else if (bobbyColor) {
      const irisHex = IRIS_HEX[bobbyColor] || IRIS_HEX.blue;
      irisOuterMat.color.set(irisHex);
    }
  }, [bobbyColor, bobbyColorsKey, irisOuterMat, blushMat, eyebrowMat, eyelidMat]);

  const eyeOutlineGeo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.absellipse(0, 0, 0.345, 0.285, 0, Math.PI * 2, false, 0);
    const hole = new THREE.Path();
    hole.absellipse(0, 0, 0.33, 0.27, 0, Math.PI * 2, false, 0);
    shape.holes.push(hole);
    return new THREE.ShapeGeometry(shape, 32);
  }, []);

  const eyeWhiteGeo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.absellipse(0, 0, 0.33, 0.27, 0, Math.PI * 2, false, 0);
    return new THREE.ShapeGeometry(shape, 32);
  }, []);

  const irisOuterGeo = useMemo(() => new THREE.CircleGeometry(0.22, 32), []);
  const pupilGeo = useMemo(() => new THREE.CircleGeometry(0.14, 32), []);
  const highlightLargeGeo = useMemo(() => new THREE.CircleGeometry(0.07, 16), []);
  const highlightSmallGeo = useMemo(() => new THREE.CircleGeometry(0.047, 12), []);

  // Initial eyebrow geometry
  const eyebrowGeo = useMemo(() => new THREE.ShapeGeometry(buildEyebrowShape(0.06), 16), []);

  // Single mouth geometry — unified shape
  const mouthGeo = useMemo(() => new THREE.ShapeGeometry(buildMouthShape(0.18, 0.5, 0, 0), 32), []);
  const mouthInteriorGeo = useMemo(() => new THREE.ShapeGeometry(buildMouthShape(0.18, 0.5, 0, 0), 32), []);

  // Cheek oval
  const cheekGeo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.absellipse(0, 0, 0.24, 0.13, 0, Math.PI * 2, false, 0);
    return new THREE.ShapeGeometry(shape, 32);
  }, []);

  // Highlight positions — single highlight per eye, top-right
  const hl1Offset: [number, number] = [0.10, 0.10];
  const hl2Offset: [number, number] = [0.10, 0.10]; // same as hl1 (hidden)
  const hl1OffsetR: [number, number] = [0.10, 0.10];
  const hl2OffsetR: [number, number] = [0.10, 0.10]; // same as hl1 (hidden)

  // ─── Frame Update ──────────────────────────────────────────
  useFrame((_, delta) => {
    const state = animation.update(delta);
    if (!rootRef.current) return;

    // ── Breathing animation when sleeping ──
    const isSleeping = faceState === "sleepy";
    if (isSleeping) {
      const breathT = performance.now() * 0.001;
      const breathScale = 1 + Math.sin(breathT * 0.8) * 0.035;
      const breathY = Math.sin(breathT * 0.8) * 0.02;
      rootRef.current.scale.set(breathScale, breathScale, 1);
      rootRef.current.position.y = breathY;
    } else {
      rootRef.current.scale.set(1, 1, 1);
      rootRef.current.position.y = 0;
    }

    rootRef.current.rotation.z = state.headTiltZ * 0.3;
    rootRef.current.rotation.y = state.headTiltY * 0.15;
    rootRef.current.rotation.x = state.headTiltX * 0.08;

    // Pupils — gaze tracking with clamping inside eye bounds
    const t = performance.now() * 0.001;
    const wanderX = Math.sin(t * 0.4) * 0.008 + Math.sin(t * 1.1) * 0.004;
    const wanderY = Math.cos(t * 0.3) * 0.006 + Math.sin(t * 0.8) * 0.003;
    
    // Eye white is ellipse rx=0.38, ry=0.32. Iris radius=0.264, pupil=0.17
    // Clamp so iris stays fully inside the eye white
    const maxIrisX = 0.38 - 0.264; // ~0.116
    const maxIrisY = 0.32 - 0.264; // ~0.056
    const maxPupilX = 0.38 - 0.17; // ~0.21
    const maxPupilY = 0.32 - 0.17; // ~0.15
    
    // During sleep, freeze pupils at center (no tracking)
    const sleepDamp = faceState === "sleepy" ? 0 : 1;
    const rawPupilX = (state.pupilX * 0.85 + wanderX) * sleepDamp;
    const rawPupilY = (state.pupilY * 0.7 + wanderY) * sleepDamp;
    const rawIrisX = (state.pupilX * 0.4 + wanderX * 0.5) * sleepDamp;
    const rawIrisY = (state.pupilY * 0.3 + wanderY * 0.5) * sleepDamp;
    
    // Clamp to elliptical bounds
    const clampEllipse = (x: number, y: number, mx: number, my: number): [number, number] => {
      if (mx <= 0 || my <= 0) return [0, 0];
      const nx = x / mx;
      const ny = y / my;
      const dist = Math.sqrt(nx * nx + ny * ny);
      if (dist <= 1) return [x, y];
      return [x / dist, y / dist];
    };
    
    const [pupilX, pupilY] = clampEllipse(rawPupilX, rawPupilY, maxPupilX, maxPupilY);
    const [irisX, irisY] = clampEllipse(rawIrisX, rawIrisY, maxIrisX, maxIrisY);
    
    [leftPupilRef, rightPupilRef].forEach(ref => {
      if (ref.current) {
        ref.current.position.x = pupilX;
        ref.current.position.y = pupilY;
      }
    });
    [leftIrisRef, rightIrisRef].forEach(ref => {
      if (ref.current) {
        ref.current.position.x = irisX;
        ref.current.position.y = irisY;
      }
    });
    
    // Highlights follow gaze (offset from pupil) for realistic look
    const hlFollowX = pupilX * 0.6;
    const hlFollowY = pupilY * 0.6;
    if (leftHl1Ref.current) {
      leftHl1Ref.current.position.x = 0.10 + hlFollowX;
      leftHl1Ref.current.position.y = 0.10 + hlFollowY;
    }
    if (leftHl2Ref.current) {
      leftHl2Ref.current.position.x = 0.12 + hlFollowX;
      leftHl2Ref.current.position.y = -0.088 + hlFollowY;
    }
    if (rightHl1Ref.current) {
      rightHl1Ref.current.position.x = 0.10 + hlFollowX;
      rightHl1Ref.current.position.y = 0.10 + hlFollowY;
    }
    if (rightHl2Ref.current) {
      rightHl2Ref.current.position.x = -0.12 + hlFollowX;
      rightHl2Ref.current.position.y = -0.088 + hlFollowY;
    }

    const ps = state.pupilSize;
    if (leftPupilRef.current) leftPupilRef.current.scale.setScalar(ps);
    if (rightPupilRef.current) rightPupilRef.current.scale.setScalar(ps);

    // Eyelids — scaleY approach: geometry anchored at top of eye, scales downward
    // This guarantees the eyelid NEVER exits the eye circle
    const blinkClose = 1 - state.eyeOpenness;
    const isSleepingNow = faceState === "sleepy";
    [leftEyelidRef, rightEyelidRef].forEach(ref => {
      if (ref.current) {
        const coverAmount = isSleepingNow
          ? 1.0
          : Math.max(0, Math.min(1, blinkClose));

        if (coverAmount < 0.01) {
          ref.current.visible = false;
          return;
        }

        ref.current.visible = true;

        const t = coverAmount;
        const easedCover = t < 0.5
          ? 4 * t * t * t
          : 1 - Math.pow(-2 * t + 2, 3) / 2;

        let scaleY = easedCover;

        // Sleep: nearly fully closed with gentle breathing bounces
        if (isSleepingNow) {
          const sleepT = performance.now() * 0.001;
          const breathLift = Math.max(0, Math.sin(sleepT * 0.4)) * 0.03;
          const bigPeek = Math.sin(sleepT * 0.1) > 0.75
            ? Math.max(0, Math.sin(sleepT * 1.2)) * 0.06
            : 0;
          const dramaticFlutter = Math.sin(sleepT * 0.04) > 0.95
            ? Math.max(0, Math.sin(sleepT * 2.5)) * 0.09
            : 0;
          // Slightly less than 1 to show a thin white strip, then bounces reduce further
          scaleY = 0.94 - Math.max(breathLift, bigPeek, dramaticFlutter);
        }

        // Position is always at top of eye; scaleY controls coverage
        ref.current.position.y = 0.27;
        ref.current.scale.set(1, Math.max(0, Math.min(1, scaleY)), 1);

        eyelidMat.opacity = 1.0;
      }
    });

    // Eye scale + happy squish
    const eyeScale = 0.9 + state.eyeOpenness * 0.15;
    const happySquish = state.mouthCurve > 0.3 ? 1 + (state.mouthCurve - 0.3) * 0.1 : 1;
    [leftEyeRef, rightEyeRef].forEach(ref => {
      if (ref.current) ref.current.scale.set(eyeScale * happySquish, eyeScale / happySquish, 1);
    });

    // ─── EYEBROWS — full range of motion ────────────────────
    const browLift = state.eyebrowHeight * 0.4;
    const browTilt = state.eyebrowTilt;
    // Arch height changes with expression (more arch when surprised/excited)
    const archMod = 0.06 + Math.max(0, state.eyebrowHeight) * 0.08;

    // Rebuild eyebrow shape when arch changes significantly
    if (leftEyebrowRef.current) {
      const newGeo = new THREE.ShapeGeometry(buildEyebrowShape(archMod), 16);
      leftEyebrowRef.current.geometry.dispose();
      leftEyebrowRef.current.geometry = newGeo;
      leftEyebrowRef.current.position.y = leftBrowY + browLift;
      leftEyebrowRef.current.position.x = leftBrowX;
      // Left brow: tilts inward for angry, outward for surprised
      leftEyebrowRef.current.rotation.z = 0.05 - browTilt * 0.8;
      // Scale X for furrowing
      const furrow = browTilt < 0 ? 1 + Math.abs(browTilt) * 0.15 : 1;
      leftEyebrowRef.current.scale.set(furrow, 1, 1);
    }
    if (rightEyebrowRef.current) {
      const newGeo = new THREE.ShapeGeometry(buildEyebrowShape(archMod), 16);
      rightEyebrowRef.current.geometry.dispose();
      rightEyebrowRef.current.geometry = newGeo;
      rightEyebrowRef.current.position.y = rightBrowY + browLift;
      rightEyebrowRef.current.position.x = rightBrowX;
      rightEyebrowRef.current.rotation.z = -0.05 + browTilt * 0.8;
      const furrow = browTilt < 0 ? 1 + Math.abs(browTilt) * 0.15 : 1;
      rightEyebrowRef.current.scale.set(furrow, 1, 1);
    }

    // ─── MOUTH v3 — single unified shape ────────
    const mc = state.mouthCurve;
    const mw = state.mouthWidth;
    const mo = state.mouthOpenness;
    const mr = state.mouthRound;
    const mouthKey = `${mc.toFixed(2)}_${mw.toFixed(2)}_${mo.toFixed(2)}_${mr.toFixed(2)}`;
    
    if (mouthKey !== prevMouthKey.current) {
      prevMouthKey.current = mouthKey;

      // Main mouth shape — always visible, morphs between all states
      if (upperLipRef.current) {
        const newShape = buildMouthShape(mc, mw, mo, mr);
        const newGeo = new THREE.ShapeGeometry(newShape, 32);
        upperLipRef.current.geometry.dispose();
        upperLipRef.current.geometry = newGeo;
      }

      // Interior (dark fill) — visible when mouth is open
      const isOpen = mo > 0.10 || mr > 0.08;
      if (mouthInteriorRef.current) {
        if (isOpen) {
          const newShape = buildMouthShape(mc, mw, mo * 0.8, mr * 0.8);
          const newGeo = new THREE.ShapeGeometry(newShape, 32);
          mouthInteriorRef.current.geometry.dispose();
          mouthInteriorRef.current.geometry = newGeo;
          mouthInteriorMat.opacity = Math.min(0.9, mo * 4 + mr * 2.5);
        } else {
          mouthInteriorMat.opacity = 0;
        }
      }
    }

    // Tongue — visible as soon as mouth starts opening
    if (tongueRef.current) {
      const showTongue = mo > 0.03;
      const targetOpacity = showTongue ? Math.min(0.9, (mo - 0.03) * 4) : 0;
      tongueMat.opacity += (targetOpacity - tongueMat.opacity) * delta * 10;
      // Position tongue inside mouth cavity
      const mouthBottomY = -0.44 - (mo * 0.16 + mr * 0.08) * 0.45;
      tongueRef.current.position.y = Math.max(mouthBottomY + 0.02, -0.44 - mo * 0.06);
      const tongueMaxW = (0.14 + mw * 0.08) * 0.6;
      const tongueScale = Math.min(tongueMaxW / 0.06, 0.6 + mo * 1.0);
      tongueRef.current.scale.set(tongueScale, tongueScale * 0.45, 1);
    }

    // Cheeks — more visible pink glow
    const smile = Math.max(0, state.mouthCurve * 2);
    [leftCheekRef, rightCheekRef].forEach(ref => {
      if (ref.current) {
        const mat = ref.current.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.45 + state.cheekGlow * 0.25 + smile * 0.15;
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
    hl1Ref: React.RefObject<THREE.Mesh>,
    hl2Ref: React.RefObject<THREE.Mesh>,
    eyeX: number,
    eyeY: number,
    hl1: [number, number],
    hl2: [number, number],
  ) => (
    <group ref={eyeRef} position={[eyeX, eyeY, 0.01]} key={side}>
      <mesh geometry={eyeWhiteGeo} material={eyeWhiteMat} renderOrder={1} />
      {/* Eye outline — on top of everything */}
      <mesh geometry={eyeOutlineGeo} material={eyeOutlineMat} position={[0, 0, 0.05]} />
      <mesh ref={irisRef} geometry={irisOuterGeo} position={[0, -0.03, 0.01]} material={irisOuterMat} />
      <mesh ref={pupilRef} geometry={pupilGeo} position={[0, -0.02, 0.02]} material={pupilMat} />
      <mesh ref={hl1Ref} position={[hl1[0], hl1[1], 0.03]} material={highlightMat} geometry={highlightLargeGeo} />
      <mesh ref={hl2Ref} position={[hl1[0], hl1[1], 0.03]} material={highlightSmallMat} geometry={highlightSmallGeo} visible={false} />
      {/* Eyelid — geometry anchored at top (y=0), extends downward to y=-0.54 */}
      {/* Positioned at top of eye (y=0.27). scaleY 0→1 grows it from invisible line to full eye coverage */}
      <mesh ref={eyelidRef} position={[0, 0.27, 0.04]} material={eyelidMat} scale={[1, 0, 1]}>
        <shapeGeometry args={[(() => {
          const s = new THREE.Shape();
          s.absellipse(0, -0.27, 0.33, 0.27, 0, Math.PI * 2, false, 0);
          return s;
        })(), 32]} />
      </mesh>
    </group>
  );

  return (
    <group ref={rootRef}>
      {/* Cheeks — behind eyes (z=-0.005) */}
      <mesh ref={leftCheekRef} position={[leftCheekX, leftCheekY, -0.005]} material={blushMat} geometry={cheekGeo} rotation={[0, 0, 0.08]} />
      <mesh ref={rightCheekRef} position={[rightCheekX, rightCheekY, -0.005]} material={blushMat} geometry={cheekGeo} rotation={[0, 0, -0.08]} />

      {/* Eyes */}
      {renderEye("left", leftEyeRef, leftPupilRef, leftIrisRef, leftEyelidRef, leftHl1Ref, leftHl2Ref, leftEyeX, leftEyeY, hl1Offset, hl2Offset)}
      {renderEye("right", rightEyeRef, rightPupilRef, rightIrisRef, rightEyelidRef, rightHl1Ref, rightHl2Ref, rightEyeX, rightEyeY, hl1OffsetR, hl2OffsetR)}

      {/* Eyebrows — curved arcs */}
      <mesh ref={leftEyebrowRef} position={[leftBrowX, leftBrowY, 0.01]} material={eyebrowMat} geometry={eyebrowGeo} />
      <mesh ref={rightEyebrowRef} position={[rightBrowX, rightBrowY, 0.01]} material={eyebrowMat} geometry={eyebrowGeo} />

      {/* Mouth — single unified shape */}
      <mesh ref={upperLipRef} position={[0, -0.44, 0.008]} geometry={mouthGeo} material={lipMat} />

      {/* Mouth interior — dark fill */}
      <mesh ref={mouthInteriorRef} position={[0, -0.44, 0.005]} geometry={mouthInteriorGeo} material={mouthInteriorMat} />

      {/* Tongue — flat oval shape */}
      <mesh ref={tongueRef} position={[0, -0.52, 0.006]} material={tongueMat}>
        <shapeGeometry args={[(() => {
          const s = new THREE.Shape();
          // Flat wide oval: rx=0.07 (wide), ry=0.035 (flat)
          // Slightly rounded tip at front
          s.moveTo(-0.07, 0);
          s.bezierCurveTo(-0.07, 0.025, -0.04, 0.038, 0, 0.038);
          s.bezierCurveTo(0.04, 0.038, 0.07, 0.025, 0.07, 0);
          s.bezierCurveTo(0.07, -0.02, 0.04, -0.032, 0, -0.032);
          s.bezierCurveTo(-0.04, -0.032, -0.07, -0.02, -0.07, 0);
          return s;
        })(), 24]} />
      </mesh>
    </group>
  );
}
