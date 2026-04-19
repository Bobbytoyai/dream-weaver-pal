import { useState, useRef, useEffect, useCallback } from "react";
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

// ─── Types ──────────────────────────────────────────────
type PartId =
  | "eyeL" | "eyeR"
  | "browL" | "browR"
  | "cheekL" | "cheekR"
  | "mouth" | "tongue";

interface PartTransform {
  x: number; // px from canvas center
  y: number;
  scale: number;
  rotate: number; // degrees
}

interface FaceState {
  parts: Record<PartId, PartTransform>;
  mouthVariant: "smile" | "open";
  showTongue: boolean;
}

// ─── Default positions (canvas 600x600, center 300,300) ─
const DEFAULT_FACE: FaceState = {
  parts: {
    eyeL:   { x: -110, y: -40, scale: 1,    rotate: 0 },
    eyeR:   { x:  110, y: -40, scale: 1,    rotate: 0 },
    browL:  { x: -110, y: -150, scale: 1,   rotate: 0 },
    browR:  { x:  110, y: -150, scale: 1,   rotate: 0 },
    cheekL: { x: -180, y:  90, scale: 1,    rotate: 0 },
    cheekR: { x:  180, y:  90, scale: 1,    rotate: 0 },
    mouth:  { x:    0, y:  90, scale: 1,    rotate: 0 },
    tongue: { x:    0, y: 110, scale: 1,    rotate: 0 },
  },
  mouthVariant: "smile",
  showTongue: false,
};

// ─── Emotion presets ────────────────────────────────────
const EMOTIONS: Record<string, { label: string; emoji: string; transform: (b: FaceState) => FaceState }> = {
  neutral: {
    label: "Neutre", emoji: "🙂",
    transform: (b) => b,
  },
  joy: {
    label: "Joie", emoji: "😄",
    transform: (b) => ({
      ...b,
      mouthVariant: "open",
      parts: {
        ...b.parts,
        browL: { ...b.parts.browL, y: -165, rotate: -5 },
        browR: { ...b.parts.browR, y: -165, rotate: 5 },
        eyeL:  { ...b.parts.eyeL, scale: 0.85 },
        eyeR:  { ...b.parts.eyeR, scale: 0.85 },
        mouth: { ...b.parts.mouth, scale: 1.1 },
      },
    }),
  },
  sadness: {
    label: "Tristesse", emoji: "😢",
    transform: (b) => ({
      ...b,
      mouthVariant: "smile",
      parts: {
        ...b.parts,
        browL: { ...b.parts.browL, y: -135, rotate: 18 },
        browR: { ...b.parts.browR, y: -135, rotate: -18 },
        mouth: { ...b.parts.mouth, rotate: 180, y: 110 },
      },
    }),
  },
  surprise: {
    label: "Surprise", emoji: "😲",
    transform: (b) => ({
      ...b,
      mouthVariant: "open",
      parts: {
        ...b.parts,
        browL: { ...b.parts.browL, y: -180 },
        browR: { ...b.parts.browR, y: -180 },
        eyeL:  { ...b.parts.eyeL, scale: 1.2 },
        eyeR:  { ...b.parts.eyeR, scale: 1.2 },
        mouth: { ...b.parts.mouth, scale: 0.7 },
      },
    }),
  },
  anger: {
    label: "Colère", emoji: "😠",
    transform: (b) => ({
      ...b,
      mouthVariant: "smile",
      parts: {
        ...b.parts,
        browL: { ...b.parts.browL, y: -120, rotate: -25 },
        browR: { ...b.parts.browR, y: -120, rotate: 25 },
        mouth: { ...b.parts.mouth, rotate: 180, scale: 0.9 },
      },
    }),
  },
  love: {
    label: "Amour", emoji: "🥰",
    transform: (b) => ({
      ...b,
      mouthVariant: "smile",
      parts: {
        ...b.parts,
        eyeL:  { ...b.parts.eyeL, scale: 0.7 },
        eyeR:  { ...b.parts.eyeR, scale: 0.7 },
        cheekL: { ...b.parts.cheekL, scale: 1.2 },
        cheekR: { ...b.parts.cheekR, scale: 1.2 },
        mouth: { ...b.parts.mouth, scale: 1.15 },
      },
    }),
  },
  curious: {
    label: "Curieux", emoji: "🤔",
    transform: (b) => ({
      ...b,
      parts: {
        ...b.parts,
        browL: { ...b.parts.browL, y: -170, rotate: -8 },
        browR: { ...b.parts.browR, y: -140, rotate: 5 },
      },
    }),
  },
  silly: {
    label: "Tirelangue", emoji: "😋",
    transform: (b) => ({
      ...b,
      mouthVariant: "open",
      showTongue: true,
      parts: {
        ...b.parts,
        eyeL:  { ...b.parts.eyeL, scale: 0.85 },
        eyeR:  { ...b.parts.eyeR, scale: 0.85 },
      },
    }),
  },
  sleepy: {
    label: "Endormi", emoji: "😴",
    transform: (b) => ({
      ...b,
      mouthVariant: "smile",
      parts: {
        ...b.parts,
        eyeL: { ...b.parts.eyeL, scale: 0.3 },
        eyeR: { ...b.parts.eyeR, scale: 0.3 },
        browL: { ...b.parts.browL, y: -110 },
        browR: { ...b.parts.browR, y: -110 },
      },
    }),
  },
};

// ─── Part metadata ──────────────────────────────────────
const PART_META: { id: PartId; label: string; src: string; w: number; h: number; flipX?: boolean }[] = [
  { id: "browL",  label: "Sourcil G",  src: sourcilGauche, w: 94,  h: 52  },
  { id: "browR",  label: "Sourcil D",  src: sourcilDroit,  w: 94,  h: 53  },
  { id: "eyeL",   label: "Œil G",      src: yeuxGauche,    w: 155, h: 152 },
  { id: "eyeR",   label: "Œil D",      src: yeuxDroit,     w: 155, h: 152 },
  { id: "cheekL", label: "Joue G",     src: joueGauche,    w: 124, h: 61  },
  { id: "cheekR", label: "Joue D",     src: joueDroite,    w: 124, h: 61  },
  { id: "mouth",  label: "Bouche",     src: mouthSmile,    w: 175, h: 76  },
  { id: "tongue", label: "Langue",     src: langue,        w: 89,  h: 44  },
];

const STORAGE_KEY = "bobby_face_test_v1";

export default function FaceTest() {
  const [face, setFace] = useState<FaceState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_FACE;
  });

  const [selectedPart, setSelectedPart] = useState<PartId>("eyeL");
  const [bgColor, setBgColor] = useState("#FDF6EC");
  const [showGuides, setShowGuides] = useState(true);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ partId: PartId; startX: number; startY: number; origX: number; origY: number } | null>(null);

  // Save to localStorage on change
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(face)); } catch {}
  }, [face]);

  const updatePart = useCallback((id: PartId, patch: Partial<PartTransform>) => {
    setFace(f => ({
      ...f,
      parts: { ...f.parts, [id]: { ...f.parts[id], ...patch } },
    }));
  }, []);

  // Drag handlers
  const handlePointerDown = (e: React.PointerEvent, id: PartId) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedPart(id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragState.current = {
      partId: id,
      startX: e.clientX,
      startY: e.clientY,
      origX: face.parts[id].x,
      origY: face.parts[id].y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState.current) return;
    const { partId, startX, startY, origX, origY } = dragState.current;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    // Scale to canvas coords (canvas is 600px logical, but rendered at variable size)
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scale = 600 / rect.width;
    updatePart(partId, { x: origX + dx * scale, y: origY + dy * scale });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    dragState.current = null;
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  };

  const applyEmotion = (key: string) => {
    setFace(EMOTIONS[key].transform(DEFAULT_FACE));
  };

  const exportConfig = () => {
    const json = JSON.stringify(face, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      alert("Config copiée dans le presse-papier !");
    });
  };

  const sel = face.parts[selectedPart];

  return (
    <div className="min-h-screen bg-[#FDF6EC] p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-black">🎭 Bobby Face Test</h1>
            <p className="text-xs text-black/60 font-bold">Drag les pièces ou utilise les sliders</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setFace(DEFAULT_FACE)} variant="outline" className="border-2 border-black font-black">Reset</Button>
            <Button onClick={exportConfig} className="bg-black text-white font-black hover:bg-black/80">Export JSON</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          {/* Canvas */}
          <div className="border-4 border-black rounded-2xl overflow-hidden shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
            <div
              ref={canvasRef}
              className="relative w-full aspect-square touch-none select-none"
              style={{ background: bgColor }}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              {/* Guides */}
              {showGuides && (
                <>
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-black/10" />
                    <div className="absolute top-1/2 left-0 right-0 h-px bg-black/10" />
                  </div>
                </>
              )}

              {/* Render parts in z-order */}
              {(["cheekL","cheekR","browL","browR","eyeL","eyeR","mouth","tongue"] as PartId[]).map(id => {
                if (id === "tongue" && !face.showTongue) return null;
                const meta = PART_META.find(p => p.id === id)!;
                const t = face.parts[id];
                const src = id === "mouth" ? (face.mouthVariant === "open" ? mouthOpen : mouthSmile) : meta.src;
                const isSelected = selectedPart === id;
                return (
                  <img
                    key={id}
                    src={src}
                    alt={meta.label}
                    draggable={false}
                    onPointerDown={(e) => handlePointerDown(e, id)}
                    className={`absolute cursor-move transition-shadow ${isSelected ? "ring-2 ring-pink-500 ring-offset-2 rounded-md" : ""}`}
                    style={{
                      left: "50%",
                      top: "50%",
                      width: `${(meta.w / 600) * 100}%`,
                      transform: `translate(calc(-50% + ${(t.x / 600) * 100}cqw), calc(-50% + ${(t.y / 600) * 100}cqw)) scale(${t.scale}) rotate(${t.rotate}deg)`,
                      transformOrigin: "center",
                      containerType: "inline-size",
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-4">
            {/* Emotions */}
            <div className="border-4 border-black rounded-2xl p-3 bg-white shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
              <h3 className="font-black text-black mb-2 text-sm">😊 Émotions</h3>
              <div className="grid grid-cols-3 gap-1.5">
                {Object.entries(EMOTIONS).map(([key, e]) => (
                  <button
                    key={key}
                    onClick={() => applyEmotion(key)}
                    className="flex flex-col items-center py-2 px-1 rounded-lg border-2 border-black bg-[#FDF6EC] hover:bg-pink-100 transition-colors font-bold text-[10px]"
                  >
                    <span className="text-xl">{e.emoji}</span>
                    <span className="text-black truncate w-full text-center">{e.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Part picker */}
            <div className="border-4 border-black rounded-2xl p-3 bg-white shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
              <h3 className="font-black text-black mb-2 text-sm">🎯 Pièce sélectionnée</h3>
              <div className="grid grid-cols-4 gap-1 mb-3">
                {PART_META.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPart(p.id)}
                    className={`py-1.5 px-1 rounded border-2 border-black text-[9px] font-black transition-colors ${
                      selectedPart === p.id ? "bg-pink-300 text-black" : "bg-[#FDF6EC] hover:bg-pink-100"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Sliders */}
              <div className="space-y-2.5 text-xs">
                <SliderRow label="X" value={sel.x} min={-300} max={300} step={1} onChange={(v) => updatePart(selectedPart, { x: v })} />
                <SliderRow label="Y" value={sel.y} min={-300} max={300} step={1} onChange={(v) => updatePart(selectedPart, { y: v })} />
                <SliderRow label="Scale" value={sel.scale} min={0.1} max={3} step={0.05} onChange={(v) => updatePart(selectedPart, { scale: v })} />
                <SliderRow label="Rotate" value={sel.rotate} min={-180} max={180} step={1} onChange={(v) => updatePart(selectedPart, { rotate: v })} />
              </div>
            </div>

            {/* Mouth options */}
            <div className="border-4 border-black rounded-2xl p-3 bg-white shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
              <h3 className="font-black text-black mb-2 text-sm">👄 Bouche</h3>
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => setFace(f => ({ ...f, mouthVariant: "smile" }))}
                  className={`flex-1 py-2 rounded border-2 border-black font-black text-xs ${face.mouthVariant === "smile" ? "bg-pink-300" : "bg-[#FDF6EC]"}`}
                >Sourire</button>
                <button
                  onClick={() => setFace(f => ({ ...f, mouthVariant: "open" }))}
                  className={`flex-1 py-2 rounded border-2 border-black font-black text-xs ${face.mouthVariant === "open" ? "bg-pink-300" : "bg-[#FDF6EC]"}`}
                >Ouverte</button>
              </div>
              <label className="flex items-center gap-2 text-xs font-bold text-black">
                <input
                  type="checkbox"
                  checked={face.showTongue}
                  onChange={(e) => setFace(f => ({ ...f, showTongue: e.target.checked }))}
                  className="w-4 h-4 accent-pink-500"
                />
                Afficher la langue
              </label>
            </div>

            {/* Display options */}
            <div className="border-4 border-black rounded-2xl p-3 bg-white shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
              <h3 className="font-black text-black mb-2 text-sm">🎨 Affichage</h3>
              <label className="flex items-center gap-2 text-xs font-bold text-black mb-2">
                <input type="checkbox" checked={showGuides} onChange={(e) => setShowGuides(e.target.checked)} className="w-4 h-4 accent-pink-500" />
                Guides centrés
              </label>
              <label className="flex items-center gap-2 text-xs font-bold text-black">
                Fond :
                <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-8 h-8 rounded border-2 border-black cursor-pointer" />
                <span className="font-mono text-[10px]">{bgColor}</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SliderRow({
  label, value, min, max, step, onChange,
}: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-0.5">
        <span className="font-black text-black text-[10px] uppercase">{label}</span>
        <span className="font-mono text-[10px] text-black/60">{value.toFixed(label === "Scale" ? 2 : 0)}</span>
      </div>
      <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={min} max={max} step={step} />
    </div>
  );
}
