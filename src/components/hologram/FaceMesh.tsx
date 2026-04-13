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

// ─── Eyebrow builder — rounded rectangle ─────────────────────
function buildEyebrowShape(_archHeight: number = 0.06): THREE.Shape {
  const shape = new THREE.Shape();
  const w = 0.24;   // half width
  const h = 0.05;   // half height (thicker bar)
  const r = 0.015;  // corner radius

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

// ─── Mouth shape builders ────────────────────────────────────
// Upper lip: a curved arc (smile/frown)
function buildUpperLipShape(curve: number, width: number): THREE.Shape {
  const shape = new THREE.Shape();
  const halfW = 0.20 + width * 0.12;
  const depth = curve * 0.20;
  const thickness = 0.035;

  shape.moveTo(-halfW, 0);
  shape.quadraticCurveTo(0, -depth, halfW, 0);
  shape.quadraticCurveTo(0, -depth + thickness, -halfW, 0);

  return shape;
}

// Lower lip: drops down when mouth opens
function buildLowerLipShape(curve: number, width: number, openness: number, round: number): THREE.Shape {
  const shape = new THREE.Shape();
  const halfW = (0.20 + width * 0.12) * (1 - round * 0.3);
  const depth = curve * 0.20;
  const dropAmount = openness * 0.28 + round * 0.18;
  const thickness = 0.028;

  shape.moveTo(-halfW, 0);
  shape.quadraticCurveTo(0, -depth, halfW, 0);
  shape.quadraticCurveTo(0, -depth + dropAmount + thickness, -halfW, 0);

  return shape;
}

// Interior fill when mouth is open (dark inside)
function buildMouthInteriorShape(curve: number, width: number, openness: number, round: number): THREE.Shape {
  const shape = new THREE.Shape();
  const halfW = (0.15 + width * 0.10) * (1 - round * 0.3);
  const depth = curve * 0.15;
  const dropAmount = openness * 0.24 + round * 0.15;

  shape.moveTo(-halfW, -0.01);
  shape.quadraticCurveTo(0, -depth - 0.01, halfW, -0.01);
  shape.quadraticCurveTo(0, -depth + dropAmount, -halfW, -0.01);

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
  const lowerLipRef = useRef<THREE.Mesh>(null);
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
  const [leftCheekX, leftCheekY] = useMemo(() => svgToWorld(155, 320), []);
  const [rightCheekX, rightCheekY] = useMemo(() => svgToWorld(357, 320), []);

  // ─── Materials ────────────────────────────────────────────
  const eyeOutlineMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("#3A3A5C"), transparent: true, opacity: 0.35,
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

  // Lip material — #E91E63 (magenta)
  const lipMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("#E91E63"), side: THREE.DoubleSide,
  }), []);

  // Mouth interior — dark red
  const mouthInteriorMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("#8B0000"), transparent: true, opacity: 0, side: THREE.DoubleSide,
  }), []);

  // Tongue — #FF80AB
  const tongueMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("#FF80AB"), transparent: true, opacity: 0,
  }), []);

  // Eyelid
  const eyelidMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("hsl(225, 25%, 82%)"), transparent: false, opacity: 1.0, depthWrite: true,
  }), []);

  // Cheeks — #FF69B4
  const blushMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("#FF69B4"), transparent: true, opacity: 0.6,
  }), []);

  // ─── Apply per-element colors ───────────────
  useEffect(() => {
    if (bobbyColors) {
      const irisHex = IRIS_HEX[bobbyColors.iris] || IRIS_HEX.blue;
      irisOuterMat.color.set(irisHex);
      const cheekHex = CHEEK_HEX[bobbyColors.cheek];
      if (cheekHex) {
        blushMat.color.set(cheekHex);
        blushMat.opacity = 0.6;
      } else {
        blushMat.opacity = 0;
      }
      const browHex = EYEBROW_HEX[bobbyColors.eyebrow] || EYEBROW_HEX.brown;
      eyebrowMat.color.set(browHex);
      // Eyelid matches background with slight darkening for contrast
      const bgHex = BG_HEX[bobbyColors.background] || BG_HEX["soft-blue"];
      const bgColor = new THREE.Color(bgHex);
      // Darken slightly for eyelid contrast (mix with a darker shade)
      const isDark = bgColor.getHSL({ h: 0, s: 0, l: 0 }).l < 0.3;
      if (isDark) {
        // For dark backgrounds, lighten slightly
        bgColor.lerp(new THREE.Color("#FFFFFF"), 0.08);
      } else {
        // For light backgrounds, darken slightly
        bgColor.lerp(new THREE.Color("#000000"), 0.06);
      }
      eyelidMat.color.set(bgColor);
    } else if (bobbyColor) {
      const irisHex = IRIS_HEX[bobbyColor] || IRIS_HEX.blue;
      irisOuterMat.color.set(irisHex);
    }
  }, [bobbyColor, bobbyColors, irisOuterMat, blushMat, eyebrowMat, eyelidMat]);

  const eyeOutlineGeo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.absellipse(0, 0, 0.41, 0.35, 0, Math.PI * 2, false, 0);
    const hole = new THREE.Path();
    hole.absellipse(0, 0, 0.38, 0.32, 0, Math.PI * 2, false, 0);
    shape.holes.push(hole);
    return new THREE.ShapeGeometry(shape, 32);
  }, []);

  const eyeWhiteGeo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.absellipse(0, 0, 0.38, 0.32, 0, Math.PI * 2, false, 0);
    return new THREE.ShapeGeometry(shape, 32);
  }, []);

  const irisOuterGeo = useMemo(() => new THREE.CircleGeometry(0.264, 32), []);
  const pupilGeo = useMemo(() => new THREE.CircleGeometry(0.17, 32), []);
  const highlightLargeGeo = useMemo(() => new THREE.CircleGeometry(0.07, 16), []);
  const highlightSmallGeo = useMemo(() => new THREE.CircleGeometry(0.047, 12), []);

  // Initial eyebrow geometry
  const eyebrowGeo = useMemo(() => new THREE.ShapeGeometry(buildEyebrowShape(0.06), 16), []);

  // Initial mouth geometries
  const upperLipGeo = useMemo(() => new THREE.ShapeGeometry(buildUpperLipShape(0.15, 0.5), 16), []);
  const lowerLipGeo = useMemo(() => new THREE.ShapeGeometry(buildLowerLipShape(0.15, 0.5, 0, 0), 16), []);
  const mouthInteriorGeo = useMemo(() => new THREE.ShapeGeometry(buildMouthInteriorShape(0.15, 0.5, 0, 0), 16), []);

  // Cheek oval
  const cheekGeo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.absellipse(0, 0, 0.19, 0.14, 0, Math.PI * 2, false, 0);
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
      leftHl1Ref.current.position.x = -0.10 + hlFollowX;
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

    // Eyelids (blink) — smooth curtain sliding down naturally
    const blinkClose = 1 - state.eyeOpenness;
    const isSleepingNow = faceState === "sleepy";
    [leftEyelidRef, rightEyelidRef].forEach(ref => {
      if (ref.current) {
        // During sleep, force eyelids mostly closed regardless of eyeOpenness
        const coverAmount = isSleepingNow
          ? 0.97 // almost fully shut
          : Math.max(0, Math.min(1, blinkClose));
        
        if (coverAmount < 0.01) {
          ref.current.visible = false;
          return;
        }
        
        ref.current.visible = true;
        
        // Smooth quintic ease for very natural, organic slide
        const t = coverAmount;
        const easedCover = t * t * t * (t * (t * 6 - 15) + 10);
        
        // Slide from fully hidden above to well below center
        const hiddenY = 0.55;
        const closedY = 0.10; // much higher = only covers top portion of eye
        let targetY = hiddenY - easedCover * (hiddenY - closedY);
        
        // Sleeping: slow breathing lifts eyelid UP slightly to reveal bottom sliver
        if (isSleepingNow) {
          const flutterT = performance.now() * 0.001;
          // Positive = eyelid moves up = reveals bottom of eye
          const breathLift = Math.sin(flutterT * 0.35) * 0.045;
          const peekCycle = Math.sin(flutterT * 0.12) > 0.85 ? Math.sin(flutterT * 1.5) * 0.03 : 0;
          targetY += Math.max(0, breathLift) + Math.max(0, peekCycle);
        }
        
        ref.current.position.y = targetY;
        
        // Slightly squash the eyelid shape as it closes for organic feel
        const squashX = 1 + easedCover * 0.04;
        ref.current.scale.set(squashX, 1, 1);
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

    // ─── MOUTH — upper lip + lower lip + interior ───────────
    const mc = state.mouthCurve;
    const mw = state.mouthWidth;
    const mo = state.mouthOpenness;
    const mr = state.mouthRound;
    // Build a simple key to avoid rebuilding every single frame
    const mouthKey = `${mc.toFixed(2)}_${mw.toFixed(2)}_${mo.toFixed(2)}_${mr.toFixed(2)}`;
    
    if (mouthKey !== prevMouthKey.current) {
      prevMouthKey.current = mouthKey;

      // Upper lip
      if (upperLipRef.current) {
        const newShape = buildUpperLipShape(mc, mw);
        const newGeo = new THREE.ShapeGeometry(newShape, 16);
        upperLipRef.current.geometry.dispose();
        upperLipRef.current.geometry = newGeo;
      }

      // Lower lip — drops down when open
      if (lowerLipRef.current) {
        const newShape = buildLowerLipShape(mc, mw, mo, mr);
        const newGeo = new THREE.ShapeGeometry(newShape, 16);
        lowerLipRef.current.geometry.dispose();
        lowerLipRef.current.geometry = newGeo;
        // Move lower lip down proportional to openness
        lowerLipRef.current.position.y = -0.65 - mo * 0.06;
      }

      // Mouth interior (dark fill visible when open)
      const isOpen = mo > 0.03 || mr > 0.05;
      if (mouthInteriorRef.current) {
        if (isOpen) {
          const newShape = buildMouthInteriorShape(mc, mw, mo, mr);
          const newGeo = new THREE.ShapeGeometry(newShape, 16);
          mouthInteriorRef.current.geometry.dispose();
          mouthInteriorRef.current.geometry = newGeo;
          mouthInteriorMat.opacity = Math.min(0.85, mo * 3 + mr * 2);
        } else {
          mouthInteriorMat.opacity = 0;
        }
      }
    }

    // Tongue — appears inside open mouth
    if (tongueRef.current) {
      const showTongue = mo > 0.15;
      const targetOpacity = showTongue ? Math.min(0.75, (mo - 0.15) * 3) : 0;
      tongueMat.opacity += (targetOpacity - tongueMat.opacity) * delta * 8;
      tongueRef.current.position.y = -0.72 - mo * 0.08;
      tongueRef.current.scale.set(0.5 + mo * 0.5, 0.3 + mo * 0.5, 1);
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
    hl1Ref: React.RefObject<THREE.Mesh>,
    hl2Ref: React.RefObject<THREE.Mesh>,
    eyeX: number,
    eyeY: number,
    hl1: [number, number],
    hl2: [number, number],
  ) => (
    <group ref={eyeRef} position={[eyeX, eyeY, 0.01]} key={side}>
      {/* Eye outline ring */}
      <mesh geometry={eyeOutlineGeo} material={eyeOutlineMat} position={[0, 0, -0.005]} />
      <mesh geometry={eyeWhiteGeo} material={eyeWhiteMat} />
      <mesh ref={irisRef} geometry={irisOuterGeo} position={[0, -0.03, 0.01]} material={irisOuterMat} />
      <mesh ref={pupilRef} geometry={pupilGeo} position={[0, -0.02, 0.02]} material={pupilMat} />
      <mesh ref={hl1Ref} position={[hl1[0], hl1[1], 0.03]} material={highlightMat} geometry={highlightLargeGeo} />
      <mesh ref={hl2Ref} position={[hl2[0], hl2[1], 0.03]} material={highlightSmallMat} geometry={highlightSmallGeo} />
      {/* Eyelid */}
      <mesh ref={eyelidRef} position={[0, 0.55, 0.044]} material={eyelidMat}>
        <shapeGeometry args={[(() => {
          const s = new THREE.Shape();
          s.absellipse(0, 0, 0.38, 0.32, 0, Math.PI * 2, false, 0);
          return s;
        })(), 32]} />
      </mesh>
    </group>
  );

  return (
    <group ref={rootRef}>
      {/* Cheeks */}
      <mesh ref={leftCheekRef} position={[leftCheekX, leftCheekY, 0.005]} material={blushMat} geometry={cheekGeo} rotation={[0, 0, 0.08]} />
      <mesh ref={rightCheekRef} position={[rightCheekX, rightCheekY, 0.005]} material={blushMat} geometry={cheekGeo} rotation={[0, 0, -0.08]} />

      {/* Eyes */}
      {renderEye("left", leftEyeRef, leftPupilRef, leftIrisRef, leftEyelidRef, leftHl1Ref, leftHl2Ref, leftEyeX, leftEyeY, hl1Offset, hl2Offset)}
      {renderEye("right", rightEyeRef, rightPupilRef, rightIrisRef, rightEyelidRef, rightHl1Ref, rightHl2Ref, rightEyeX, rightEyeY, hl1OffsetR, hl2OffsetR)}

      {/* Eyebrows — curved arcs */}
      <mesh ref={leftEyebrowRef} position={[leftBrowX, leftBrowY, 0.01]} material={eyebrowMat} geometry={eyebrowGeo} />
      <mesh ref={rightEyebrowRef} position={[rightBrowX, rightBrowY, 0.01]} material={eyebrowMat} geometry={eyebrowGeo} />

      {/* Upper lip */}
      <mesh ref={upperLipRef} position={[0, -0.65, 0.008]} geometry={upperLipGeo} material={lipMat} />

      {/* Lower lip — moves down when mouth opens */}
      <mesh ref={lowerLipRef} position={[0, -0.65, 0.007]} geometry={lowerLipGeo} material={lipMat} />

      {/* Mouth interior — dark, visible when open */}
      <mesh ref={mouthInteriorRef} position={[0, -0.65, 0.005]} geometry={mouthInteriorGeo} material={mouthInteriorMat} />

      {/* Tongue */}
      <mesh ref={tongueRef} position={[0, -0.73, 0.006]} material={tongueMat}>
        <circleGeometry args={[0.06, 24]} />
      </mesh>
    </group>
  );
}
