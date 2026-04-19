import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

import yeuxGauche from "@/assets/bobby-face/yeux_gauche.svg";
import yeuxDroit from "@/assets/bobby-face/yeux_droit.svg";
import sourcilGauche from "@/assets/bobby-face/sourcil_gauche.svg";
import sourcilDroit from "@/assets/bobby-face/sourcil_droit.svg";
import joueGauche from "@/assets/bobby-face/joue_gauche.svg";
import joueDroite from "@/assets/bobby-face/joue_droite.svg";
import mouthSmile from "@/assets/bobby-face/mouth.svg";
import mouthOpen from "@/assets/bobby-face/mouth-1.svg";
import langue from "@/assets/bobby-face/langue.svg";
import shineBigL from "@/assets/bobby-face/ellipse_grand_gauche.svg";
import shineBigR from "@/assets/bobby-face/ellipse_grand_droit.svg";
import shineSmallL from "@/assets/bobby-face/ellipse_petit_gauche.svg";
import shineSmallR from "@/assets/bobby-face/ellipse_petit_droit.svg";

// ══════════════════════════════════════════════════════════
// REALISTIC RIGGED FACE ANIMATION SYSTEM
// ══════════════════════════════════════════════════════════
// • Eye sockets contain shines that follow the eye
// • Gaze tracking: pupils follow cursor / target
// • Auto blink with realistic timing (every 3-6s, sometimes double)
// • Breathing: subtle scale on whole face
// • Brow micro-movements (idle expressivity)
// • Mouth lip-sync from audio amplitude OR talk simulator
// • Smooth spring-based transitions between emotions

type Emotion =
  | "neutral" | "joy" | "sadness" | "surprise" | "anger"
  | "love" | "curious" | "silly" | "sleepy" | "excited" | "shy";

interface RigState {
  // Eye sockets (anchor points — shines follow these)
  leftEye:  { x: number; y: number; openness: number; scale: number };
  rightEye: { x: number; y: number; openness: number; scale: number };
  // Gaze offset (applied to shines = pupils)
  gaze: { x: number; y: number };
  // Brows
  leftBrow:  { x: number; y: number; rotate: number };
  rightBrow: { x: number; y: number; rotate: number };
  // Cheeks (blush)
  cheekScale: number;
  cheekOpacity: number;
  // Mouth
  mouth: { x: number; y: number; scale: number; rotate: number; openness: number };
  mouthVariant: "smile" | "open";
  showTongue: boolean;
  tongueY: number;
  // Whole face
  headTilt: number;
  breathing: number;
}

const NEUTRAL: RigState = {
  leftEye:  { x: -110, y: -40, openness: 1, scale: 1 },
  rightEye: { x:  110, y: -40, openness: 1, scale: 1 },
  gaze: { x: 0, y: 0 },
  leftBrow:  { x: -110, y: -150, rotate: 0 },
  rightBrow: { x:  110, y: -150, rotate: 0 },
  cheekScale: 1,
  cheekOpacity: 0.85,
  mouth: { x: 0, y: 90, scale: 1, rotate: 0, openness: 0 },
  mouthVariant: "smile",
  showTongue: false,
  tongueY: 110,
  headTilt: 0,
  breathing: 0,
};

// ─── Emotion presets (target rigs) ─────────────────────────
const EMOTION_PRESETS: Record<Emotion, { emoji: string; label: string; rig: Partial<RigState> }> = {
  neutral: {
    emoji: "🙂", label: "Neutre",
    rig: {},
  },
  joy: {
    emoji: "😄", label: "Joie",
    rig: {
      leftEye:  { x: -110, y: -40, openness: 0.55, scale: 1 },
      rightEye: { x:  110, y: -40, openness: 0.55, scale: 1 },
      leftBrow:  { x: -110, y: -170, rotate: -6 },
      rightBrow: { x:  110, y: -170, rotate:  6 },
      cheekScale: 1.2, cheekOpacity: 1,
      mouth: { x: 0, y: 95, scale: 1.15, rotate: 0, openness: 0.4 },
      mouthVariant: "open",
      showTongue: true,
    },
  },
  sadness: {
    emoji: "😢", label: "Tristesse",
    rig: {
      leftEye:  { x: -110, y: -30, openness: 0.7, scale: 0.95 },
      rightEye: { x:  110, y: -30, openness: 0.7, scale: 0.95 },
      gaze: { x: 0, y: 12 },
      leftBrow:  { x: -110, y: -135, rotate:  22 },
      rightBrow: { x:  110, y: -135, rotate: -22 },
      cheekScale: 0.85, cheekOpacity: 0.5,
      mouth: { x: 0, y: 110, scale: 0.9, rotate: 180, openness: 0 },
      mouthVariant: "smile",
      headTilt: -3,
    },
  },
  surprise: {
    emoji: "😲", label: "Surprise",
    rig: {
      leftEye:  { x: -110, y: -40, openness: 1.25, scale: 1.1 },
      rightEye: { x:  110, y: -40, openness: 1.25, scale: 1.1 },
      leftBrow:  { x: -110, y: -185, rotate: -2 },
      rightBrow: { x:  110, y: -185, rotate:  2 },
      mouth: { x: 0, y: 100, scale: 0.6, rotate: 0, openness: 1 },
      mouthVariant: "open",
    },
  },
  anger: {
    emoji: "😠", label: "Colère",
    rig: {
      leftEye:  { x: -110, y: -40, openness: 0.75, scale: 1 },
      rightEye: { x:  110, y: -40, openness: 0.75, scale: 1 },
      leftBrow:  { x: -100, y: -120, rotate: -28 },
      rightBrow: { x:  100, y: -120, rotate:  28 },
      cheekOpacity: 0.4,
      mouth: { x: 0, y: 100, scale: 0.85, rotate: 180, openness: 0.1 },
      mouthVariant: "smile",
    },
  },
  love: {
    emoji: "🥰", label: "Amour",
    rig: {
      leftEye:  { x: -110, y: -40, openness: 0.45, scale: 0.9 },
      rightEye: { x:  110, y: -40, openness: 0.45, scale: 0.9 },
      leftBrow:  { x: -110, y: -165, rotate: -4 },
      rightBrow: { x:  110, y: -165, rotate:  4 },
      cheekScale: 1.3, cheekOpacity: 1,
      mouth: { x: 0, y: 95, scale: 1.2, rotate: 0, openness: 0.2 },
      mouthVariant: "smile",
      headTilt: 4,
    },
  },
  curious: {
    emoji: "🤔", label: "Curieux",
    rig: {
      leftBrow:  { x: -110, y: -175, rotate: -10 },
      rightBrow: { x:  110, y: -135, rotate:   8 },
      gaze: { x: 8, y: -6 },
      mouth: { x: 0, y: 95, scale: 0.85, rotate: 0, openness: 0.15 },
      headTilt: 6,
    },
  },
  silly: {
    emoji: "😋", label: "Tirelangue",
    rig: {
      leftEye:  { x: -110, y: -40, openness: 0.4, scale: 1 },
      rightEye: { x:  110, y: -40, openness: 0.4, scale: 1 },
      cheekScale: 1.15, cheekOpacity: 1,
      mouth: { x: 0, y: 95, scale: 1.05, rotate: 0, openness: 0.5 },
      mouthVariant: "open",
      showTongue: true, tongueY: 130,
    },
  },
  sleepy: {
    emoji: "😴", label: "Endormi",
    rig: {
      leftEye:  { x: -110, y: -25, openness: 0.12, scale: 1 },
      rightEye: { x:  110, y: -25, openness: 0.12, scale: 1 },
      leftBrow:  { x: -110, y: -110, rotate: 4 },
      rightBrow: { x:  110, y: -110, rotate: -4 },
      cheekOpacity: 0.6,
      mouth: { x: 0, y: 95, scale: 0.8, rotate: 0, openness: 0.05 },
      mouthVariant: "smile",
      headTilt: -5,
    },
  },
  excited: {
    emoji: "🤩", label: "Excité",
    rig: {
      leftEye:  { x: -110, y: -45, openness: 1.15, scale: 1.05 },
      rightEye: { x:  110, y: -45, openness: 1.15, scale: 1.05 },
      leftBrow:  { x: -110, y: -180, rotate: -8 },
      rightBrow: { x:  110, y: -180, rotate:  8 },
      cheekScale: 1.25, cheekOpacity: 1,
      mouth: { x: 0, y: 95, scale: 1.2, rotate: 0, openness: 0.7 },
      mouthVariant: "open",
    },
  },
  shy: {
    emoji: "😳", label: "Timide",
    rig: {
      leftEye:  { x: -110, y: -35, openness: 0.7, scale: 0.95 },
      rightEye: { x:  110, y: -35, openness: 0.7, scale: 0.95 },
      gaze: { x: -10, y: 8 },
      cheekScale: 1.4, cheekOpacity: 1,
      mouth: { x: 0, y: 95, scale: 0.75, rotate: 0, openness: 0.05 },
      mouthVariant: "smile",
      headTilt: -3,
    },
  },
};

// ─── Lerp utility ──────────────────────────────────────────
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
function lerpRig(a: RigState, b: RigState, t: number): RigState {
  return {
    leftEye: {
      x: lerp(a.leftEye.x, b.leftEye.x, t),
      y: lerp(a.leftEye.y, b.leftEye.y, t),
      openness: lerp(a.leftEye.openness, b.leftEye.openness, t),
      scale: lerp(a.leftEye.scale, b.leftEye.scale, t),
    },
    rightEye: {
      x: lerp(a.rightEye.x, b.rightEye.x, t),
      y: lerp(a.rightEye.y, b.rightEye.y, t),
      openness: lerp(a.rightEye.openness, b.rightEye.openness, t),
      scale: lerp(a.rightEye.scale, b.rightEye.scale, t),
    },
    gaze: { x: lerp(a.gaze.x, b.gaze.x, t), y: lerp(a.gaze.y, b.gaze.y, t) },
    leftBrow: {
      x: lerp(a.leftBrow.x, b.leftBrow.x, t),
      y: lerp(a.leftBrow.y, b.leftBrow.y, t),
      rotate: lerp(a.leftBrow.rotate, b.leftBrow.rotate, t),
    },
    rightBrow: {
      x: lerp(a.rightBrow.x, b.rightBrow.x, t),
      y: lerp(a.rightBrow.y, b.rightBrow.y, t),
      rotate: lerp(a.rightBrow.rotate, b.rightBrow.rotate, t),
    },
    cheekScale: lerp(a.cheekScale, b.cheekScale, t),
    cheekOpacity: lerp(a.cheekOpacity, b.cheekOpacity, t),
    mouth: {
      x: lerp(a.mouth.x, b.mouth.x, t),
      y: lerp(a.mouth.y, b.mouth.y, t),
      scale: lerp(a.mouth.scale, b.mouth.scale, t),
      rotate: lerp(a.mouth.rotate, b.mouth.rotate, t),
      openness: lerp(a.mouth.openness, b.mouth.openness, t),
    },
    mouthVariant: t > 0.5 ? b.mouthVariant : a.mouthVariant,
    showTongue: t > 0.5 ? b.showTongue : a.showTongue,
    tongueY: lerp(a.tongueY, b.tongueY, t),
    headTilt: lerp(a.headTilt, b.headTilt, t),
    breathing: lerp(a.breathing, b.breathing, t),
  };
}

function applyPreset(base: RigState, preset: Partial<RigState>): RigState {
  return { ...base, ...preset };
}

// ─── Main component ────────────────────────────────────────
export default function FaceTest() {
  const [emotion, setEmotion] = useState<Emotion>("neutral");
  const [bgColor, setBgColor] = useState("#FDF6EC");

  // Animation toggles
  const [autoBlink, setAutoBlink] = useState(true);
  const [gazeFollow, setGazeFollow] = useState(true);
  const [breathing, setBreathing] = useState(true);
  const [microMoves, setMicroMoves] = useState(true);
  const [talking, setTalking] = useState(false);

  // Live rig state
  const [rig, setRig] = useState<RigState>(NEUTRAL);
  const targetRig = useRef<RigState>(NEUTRAL);
  const currentRig = useRef<RigState>(NEUTRAL);

  // Blink state (multiplier 0..1 on openness)
  const blinkRef = useRef(1);
  const nextBlinkRef = useRef(performance.now() + 3000);

  // Gaze target (smoothed)
  const gazeTargetRef = useRef({ x: 0, y: 0 });

  // Talk state
  const talkPhaseRef = useRef(0);

  // Canvas
  const canvasRef = useRef<HTMLDivElement>(null);

  // ─── Update target rig on emotion change ───
  useEffect(() => {
    targetRig.current = applyPreset(NEUTRAL, EMOTION_PRESETS[emotion].rig);
  }, [emotion]);

  // ─── Mouse gaze tracking ───
  useEffect(() => {
    if (!gazeFollow) {
      gazeTargetRef.current = { x: 0, y: 0 };
      return;
    }
    const handler = (e: PointerEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);
      // Clamp & scale to pupil travel range (px in 600-canvas coords)
      const maxX = 18, maxY = 14;
      gazeTargetRef.current = {
        x: Math.max(-maxX, Math.min(maxX, dx * maxX * 1.2)),
        y: Math.max(-maxY, Math.min(maxY, dy * maxY * 1.2)),
      };
    };
    window.addEventListener("pointermove", handler);
    return () => window.removeEventListener("pointermove", handler);
  }, [gazeFollow]);

  // ─── Animation loop ───
  useEffect(() => {
    let rafId = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(64, now - last) / 1000;
      last = now;

      // 1. Spring toward target rig
      const ease = 1 - Math.pow(0.001, dt); // critically damped feel ~time-constant 150ms
      currentRig.current = lerpRig(currentRig.current, targetRig.current, ease * 0.85);

      // 2. Blink overlay
      if (autoBlink) {
        if (now > nextBlinkRef.current) {
          // schedule blink: 130ms close, 80ms hold, 160ms open
          const start = now;
          const closeDur = 110, openDur = 170;
          const animateBlink = (t: number) => {
            if (t < closeDur) blinkRef.current = 1 - t / closeDur;
            else if (t < closeDur + openDur) blinkRef.current = (t - closeDur) / openDur;
            else { blinkRef.current = 1; return true; }
            return false;
          };
          // Mark next blink (3s-6s, sometimes 2 quick)
          const isDouble = Math.random() < 0.18;
          nextBlinkRef.current = now + (isDouble ? 350 : 3000 + Math.random() * 3500);
          // Run inline using closure
          const blinkLoop = (n: number) => {
            const elapsed = n - start;
            if (!animateBlink(elapsed)) requestAnimationFrame(blinkLoop);
          };
          requestAnimationFrame(blinkLoop);
        }
      } else {
        blinkRef.current = 1;
      }

      // 3. Breathing — subtle vertical bob & scale
      const breath = breathing ? Math.sin(now / 1400) * 0.5 + 0.5 : 0;

      // 4. Micro saccades — tiny random eye flicks every 1-3s
      // (handled inside gaze smoothing via small noise)
      const microNoise = microMoves
        ? { x: Math.sin(now / 730) * 1.5 + Math.cos(now / 1100) * 1.2,
            y: Math.cos(now / 870) * 1.0 }
        : { x: 0, y: 0 };

      // 5. Smooth gaze toward target
      const gx = lerp(currentRig.current.gaze.x, gazeTargetRef.current.x + microNoise.x, ease * 0.3);
      const gy = lerp(currentRig.current.gaze.y, gazeTargetRef.current.y + microNoise.y, ease * 0.3);

      // 6. Talking — modulate mouth openness
      let mouthOpenAdd = 0;
      if (talking) {
        talkPhaseRef.current += dt * 8;
        const env = (Math.sin(talkPhaseRef.current) * 0.5 + 0.5) *
                    (Math.sin(talkPhaseRef.current * 0.37) * 0.5 + 0.5);
        mouthOpenAdd = env * 0.6;
      }

      // 7. Compose final rig
      const final: RigState = {
        ...currentRig.current,
        gaze: { x: gx, y: gy },
        leftEye: {
          ...currentRig.current.leftEye,
          openness: currentRig.current.leftEye.openness * blinkRef.current,
        },
        rightEye: {
          ...currentRig.current.rightEye,
          openness: currentRig.current.rightEye.openness * blinkRef.current,
        },
        mouth: {
          ...currentRig.current.mouth,
          openness: Math.min(1, currentRig.current.mouth.openness + mouthOpenAdd),
          scale: currentRig.current.mouth.scale + mouthOpenAdd * 0.1,
        },
        breathing: breath,
      };

      setRig(final);
      currentRig.current.gaze = { x: gx, y: gy };

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [autoBlink, breathing, microMoves, talking]);

  // ─── Renderer helpers (% of 600 canvas) ───
  const pct = (v: number) => `${(v / 600) * 100}%`;

  // Compute final positions
  const headTransform = `translate(-50%, -50%) rotate(${rig.headTilt}deg) translateY(${rig.breathing * 4 - 2}px) scale(${1 + rig.breathing * 0.012})`;

  // Eye openness via vertical scale (clamp min so it doesn't fully disappear)
  const leftEyeScaleY = Math.max(0.02, rig.leftEye.openness);
  const rightEyeScaleY = Math.max(0.02, rig.rightEye.openness);

  // Shines = pupils. Position relative to eye + gaze offset, clipped by openness
  const shineL = (sx: number, sy: number) => ({
    x: rig.leftEye.x + sx + rig.gaze.x,
    y: rig.leftEye.y + sy + rig.gaze.y * leftEyeScaleY,
    opacity: leftEyeScaleY > 0.15 ? 1 : leftEyeScaleY / 0.15,
  });
  const shineR = (sx: number, sy: number) => ({
    x: rig.rightEye.x + sx + rig.gaze.x,
    y: rig.rightEye.y + sy + rig.gaze.y * rightEyeScaleY,
    opacity: rightEyeScaleY > 0.15 ? 1 : rightEyeScaleY / 0.15,
  });

  // Big shine offset within eye, small shine offset within eye
  const SHINE_BIG = { x: -22, y: -25 };
  const SHINE_SMALL = { x: 12, y: 25 };

  const sBigL = shineL(SHINE_BIG.x, SHINE_BIG.y);
  const sBigR = shineR(SHINE_BIG.x, SHINE_BIG.y);
  const sSmL  = shineL(SHINE_SMALL.x, SHINE_SMALL.y);
  const sSmR  = shineR(SHINE_SMALL.x, SHINE_SMALL.y);

  // Mouth: always use mouth-1 (open variant only)
  const mouthSrc = mouthOpen;
  const mouthScaleY = rig.mouth.scale * (1 + rig.mouth.openness * 0.4);

  return (
    <div className="min-h-screen bg-[#FDF6EC] p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-black">🎭 Bobby Face — Realistic</h1>
            <p className="text-xs text-black/60 font-bold">Animation rig avec gaze, blink, breathing, lip-sync</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          {/* ─── Canvas ─── */}
          <div className="border-4 border-black rounded-2xl overflow-hidden shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
            <div
              ref={canvasRef}
              className="relative w-full aspect-square select-none overflow-hidden"
              style={{ background: bgColor }}
            >
              {/* Head container — applies tilt, breathing */}
              <div
                className="absolute left-1/2 top-1/2 w-full h-full"
                style={{ transform: headTransform, transformOrigin: "center" }}
              >
                {/* Cheeks */}
                <FacePart src={joueGauche} w={124} h={61}
                  x={-180} y={90} scale={rig.cheekScale} opacity={rig.cheekOpacity} />
                <FacePart src={joueDroite} w={124} h={61}
                  x={180} y={90} scale={rig.cheekScale} opacity={rig.cheekOpacity} />

                {/* Brows — new shape: rounded rectangles 191x69 */}
                <FacePart src={sourcilGauche} w={130} h={47}
                  x={rig.leftBrow.x} y={rig.leftBrow.y} rotate={rig.leftBrow.rotate} />
                <FacePart src={sourcilDroit} w={130} h={47}
                  x={rig.rightBrow.x} y={rig.rightBrow.y} rotate={rig.rightBrow.rotate} />

                {/* Left eye socket — clips shines inside */}
                <EyeSocket
                  eyeSrc={yeuxGauche}
                  shineBigSrc={shineBigL}
                  shineSmallSrc={shineSmallL}
                  x={rig.leftEye.x} y={rig.leftEye.y}
                  scale={rig.leftEye.scale}
                  scaleY={leftEyeScaleY}
                  gazeX={rig.gaze.x} gazeY={rig.gaze.y}
                  shineOpacity={sBigL.opacity}
                />

                {/* Right eye socket */}
                <EyeSocket
                  eyeSrc={yeuxDroit}
                  shineBigSrc={shineBigR}
                  shineSmallSrc={shineSmallR}
                  x={rig.rightEye.x} y={rig.rightEye.y}
                  scale={rig.rightEye.scale}
                  scaleY={rightEyeScaleY}
                  gazeX={rig.gaze.x} gazeY={rig.gaze.y}
                  shineOpacity={sBigR.opacity}
                />

                {/* Mouth socket — contains tongue clipped inside */}
                <MouthSocket
                  mouthSrc={mouthSrc}
                  tongueSrc={langue}
                  x={rig.mouth.x} y={rig.mouth.y}
                  scale={rig.mouth.scale}
                  scaleY={mouthScaleY}
                  rotate={rig.mouth.rotate}
                  openness={rig.mouth.openness}
                  showTongue={rig.showTongue}
                />
              </div>
            </div>
          </div>

          {/* ─── Controls ─── */}
          <div className="space-y-4">
            {/* Emotions */}
            <div className="border-4 border-black rounded-2xl p-3 bg-white shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
              <h3 className="font-black text-black mb-2 text-sm">😊 Émotions</h3>
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.keys(EMOTION_PRESETS) as Emotion[]).map(key => (
                  <button
                    key={key}
                    onClick={() => setEmotion(key)}
                    className={`flex flex-col items-center py-2 px-1 rounded-lg border-2 border-black transition-colors font-bold text-[10px] ${
                      emotion === key ? "bg-pink-300" : "bg-[#FDF6EC] hover:bg-pink-100"
                    }`}
                  >
                    <span className="text-xl">{EMOTION_PRESETS[key].emoji}</span>
                    <span className="text-black truncate w-full text-center">{EMOTION_PRESETS[key].label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Animation toggles */}
            <div className="border-4 border-black rounded-2xl p-3 bg-white shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
              <h3 className="font-black text-black mb-2 text-sm">🎬 Animations</h3>
              <div className="space-y-2">
                <Toggle label="👁️ Clignement auto" value={autoBlink} onChange={setAutoBlink} />
                <Toggle label="👀 Regard suit la souris" value={gazeFollow} onChange={setGazeFollow} />
                <Toggle label="🫁 Respiration" value={breathing} onChange={setBreathing} />
                <Toggle label="✨ Micro-mouvements" value={microMoves} onChange={setMicroMoves} />
                <Toggle label="🗣️ Parle (lip-sync)" value={talking} onChange={setTalking} />
              </div>
            </div>

            {/* Manual blink trigger */}
            <div className="border-4 border-black rounded-2xl p-3 bg-white shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
              <h3 className="font-black text-black mb-2 text-sm">🎯 Actions</h3>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => { nextBlinkRef.current = performance.now(); }}
                  variant="outline"
                  className="border-2 border-black font-black text-xs"
                >Cligner</Button>
                <Button
                  onClick={() => setEmotion("neutral")}
                  variant="outline"
                  className="border-2 border-black font-black text-xs"
                >Reset</Button>
              </div>
            </div>

            {/* Background */}
            <div className="border-4 border-black rounded-2xl p-3 bg-white shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
              <h3 className="font-black text-black mb-2 text-sm">🎨 Fond</h3>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="w-10 h-10 rounded border-2 border-black cursor-pointer"
                />
                <span className="font-mono text-xs text-black">{bgColor}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────
function FacePart({
  src, w, h, x, y, scale = 1, scaleY, rotate = 0, opacity = 1,
}: {
  src: string; w: number; h: number;
  x: number; y: number;
  scale?: number; scaleY?: number; rotate?: number; opacity?: number;
}) {
  const sy = scaleY ?? scale;
  return (
    <img
      src={src}
      alt=""
      draggable={false}
      className="absolute pointer-events-none will-change-transform"
      style={{
        left: "50%",
        top: "50%",
        width: `${(w / 600) * 100}%`,
        opacity,
        transform: `translate(calc(-50% + ${(x / 600) * 100}cqw), calc(-50% + ${(y / 600) * 100}cqw)) scale(${scale}, ${sy}) rotate(${rotate}deg)`,
        transformOrigin: "center",
        containerType: "inline-size",
      }}
    />
  );
}

// ─── EyeSocket: clips pupils inside the eye ───────────────
function EyeSocket({
  eyeSrc, shineBigSrc, shineSmallSrc,
  x, y, scale, scaleY, gazeX, gazeY, shineOpacity,
}: {
  eyeSrc: string; shineBigSrc: string; shineSmallSrc: string;
  x: number; y: number; scale: number; scaleY: number;
  gazeX: number; gazeY: number; shineOpacity: number;
}) {
  // Eye is 155x152 in original SVG, rendered as 155/600 of canvas
  const EYE_W = 155, EYE_H = 152;
  // Big white reflection (main highlight) — top-left, large
  const BIG = { x: -16, y: -18, w: 78, h: 80 };
  // Small white reflection — separated, bottom-right outside big shine
  const SMALL = { x: 30, y: 32, w: 22, h: 22 };
  // Clamp gaze so reflections stay inside the eye
  const maxX = 28, maxY = 22;
  const gx = Math.max(-maxX, Math.min(maxX, gazeX));
  const gy = Math.max(-maxY, Math.min(maxY, gazeY * scaleY));

  return (
    <div
      className="absolute pointer-events-none will-change-transform"
      style={{
        left: "50%",
        top: "50%",
        width: `${(EYE_W / 600) * 100}%`,
        aspectRatio: `${EYE_W} / ${EYE_H}`,
        transform: `translate(calc(-50% + ${(x / 600) * 100}cqw), calc(-50% + ${(y / 600) * 100}cqw)) scale(${scale}, ${scaleY})`,
        transformOrigin: "center",
        containerType: "inline-size",
      }}
    >
      {/* Eye base (black) */}
      <img src={eyeSrc} alt="" draggable={false}
        className="absolute inset-0 w-full h-full" />
      {/* Reflections — clipped to eye ellipse, both follow gaze together */}
      <div
        className="absolute inset-0"
        style={{
          clipPath: "ellipse(50% 50% at 50% 50%)",
          opacity: shineOpacity,
        }}
      >
        {/* Big white highlight */}
        <img
          src={shineBigSrc} alt="" draggable={false}
          className="absolute"
          style={{
            width: `${(BIG.w / EYE_W) * 100}%`,
            left: "50%", top: "50%",
            transform: `translate(calc(-50% + ${(BIG.x + gx) / EYE_W * 100}%), calc(-50% + ${(BIG.y + gy) / EYE_H * 100}%))`,
          }}
        />
        {/* Small white highlight — sits near big one */}
        <img
          src={shineSmallSrc} alt="" draggable={false}
          className="absolute"
          style={{
            width: `${(SMALL.w / EYE_W) * 100}%`,
            left: "50%", top: "50%",
            transform: `translate(calc(-50% + ${(SMALL.x + gx) / EYE_W * 100}%), calc(-50% + ${(SMALL.y + gy) / EYE_H * 100}%))`,
          }}
        />
      </div>
    </div>
  );
}

// ─── MouthSocket: tongue clipped inside mouth shape ───────
function MouthSocket({
  mouthSrc, tongueSrc, x, y, scale, scaleY, rotate, openness, showTongue,
}: {
  mouthSrc: string; tongueSrc: string;
  x: number; y: number; scale: number; scaleY: number; rotate: number;
  openness: number; showTongue: boolean;
}) {
  const MOUTH_W = 175, MOUTH_H = 76;
  const TONGUE_W = 89, TONGUE_H = 44;
  // Tongue sits at the bottom-center of the mouth opening
  // mouth-1 has an opening that occupies most of the shape
  return (
    <div
      className="absolute pointer-events-none will-change-transform"
      style={{
        left: "50%",
        top: "50%",
        width: `${(MOUTH_W / 600) * 100}%`,
        aspectRatio: `${MOUTH_W} / ${MOUTH_H}`,
        transform: `translate(calc(-50% + ${(x / 600) * 100}cqw), calc(-50% + ${(y / 600) * 100}cqw)) scale(${scale}, ${scaleY}) rotate(${rotate}deg)`,
        transformOrigin: "center",
        containerType: "inline-size",
      }}
    >
      {/* Mouth base */}
      <img src={mouthSrc} alt="" draggable={false}
        className="absolute inset-0 w-full h-full" />
      {/* Tongue clipped inside mouth opening */}
      {showTongue && (
        <div
          className="absolute inset-0 overflow-hidden"
          style={{
            // The mouth-1 opening is roughly an ellipse — clip tongue to stay inside
            clipPath: "ellipse(46% 44% at 50% 52%)",
          }}
        >
          <img
            src={tongueSrc} alt="" draggable={false}
            className="absolute"
            style={{
              width: `${(TONGUE_W / MOUTH_W) * 100}%`,
              left: "50%",
              bottom: `${-TONGUE_H * 0.3 / MOUTH_H * 100}%`,
              transform: `translateX(-50%) scaleY(${0.6 + openness * 0.6})`,
              transformOrigin: "bottom center",
            }}
          />
        </div>
      )}
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-2 text-xs font-bold text-black cursor-pointer">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 accent-pink-500"
      />
    </label>
  );
}
