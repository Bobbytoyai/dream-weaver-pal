import { useState, useMemo, useCallback, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { HologramFace } from "@/components/hologram/HologramFace";
import { EYES, EYEBROWS, MOUTHS, ANIMATIONS, type ExpressionCombo } from "@/lib/bobby/expressionLibrary";
import { type BobbyEmotion, emotionToExpression } from "@/lib/bobby/expressionEngine";
import { DEFAULT_PARENT_SETTINGS } from "@/components/parentSettings";

const EMOTIONS: BobbyEmotion[] = [
  "joy", "sadness", "fear", "anger", "love", "curiosity", "pride",
  "surprise", "calm", "excitement", "boredom", "shyness", "embarrassment",
  "relief", "confusion", "disgust", "jealousy", "gratitude", "determination", "neutral",
];

const EMOTION_EMOJI: Record<string, string> = {
  joy: "😄", sadness: "😢", fear: "😨", anger: "😠", love: "🥰", curiosity: "🤔",
  pride: "🌟", surprise: "😲", calm: "😌", excitement: "🤩", boredom: "😐",
  shyness: "😳", embarrassment: "😅", relief: "😮‍💨", confusion: "😵‍💫",
  disgust: "🤢", jealousy: "😒", gratitude: "🙏", determination: "💪", neutral: "🙂",
};

const eyeKeys = Object.keys(EYES);
const browKeys = Object.keys(EYEBROWS);
const mouthKeys = Object.keys(MOUTHS);
const animKeys = Object.keys(ANIMATIONS);

export default function ExpressionPreview({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<"emotion" | "manual">("emotion");

  // Load saved parent settings for consistent Bobby appearance
  const [savedSettings] = useState(() => {
    try {
      const raw = localStorage.getItem("bobby_parent_settings");
      if (raw) return { ...DEFAULT_PARENT_SETTINGS, ...JSON.parse(raw) };
    } catch {}
    return DEFAULT_PARENT_SETTINGS;
  });

  // Emotion mode
  const [selectedEmotion, setSelectedEmotion] = useState<BobbyEmotion>("joy");
  const [intensity, setIntensity] = useState(3);

  // Manual mode
  const [eyeIdx, setEyeIdx] = useState(0);
  const [browIdx, setBrowIdx] = useState(0);
  const [mouthIdx, setMouthIdx] = useState(0);
  const [animIdx, setAnimIdx] = useState(0);
  const [manualIntensity, setManualIntensity] = useState(3);

  const combo: ExpressionCombo = useMemo(() => {
    if (mode === "emotion") {
      return emotionToExpression({ emotion: selectedEmotion, intensity }).combo;
    }
    return {
      eyes: eyeKeys[eyeIdx],
      eyebrows: browKeys[browIdx],
      mouth: mouthKeys[mouthIdx],
      animation: animKeys[animIdx],
    };
  }, [mode, selectedEmotion, intensity, eyeIdx, browIdx, mouthIdx, animIdx]);

  const currentIntensity = mode === "emotion" ? intensity : manualIntensity;

  const comboCount = eyeKeys.length * browKeys.length * mouthKeys.length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(240,60%,8%)] to-[hsl(250,40%,15%)] p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" onClick={onBack} className="text-white/70 p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-lg font-bold text-white">🎭 Expression Preview</h1>
          <p className="text-[10px] text-white/40">{comboCount.toLocaleString()} combinaisons possibles</p>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode("emotion")}
          className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
            mode === "emotion"
              ? "bg-violet-600 text-white"
              : "bg-white/5 text-white/50 hover:bg-white/10"
          }`}
        >
          🎭 Par Émotion
        </button>
        <button
          onClick={() => setMode("manual")}
          className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
            mode === "manual"
              ? "bg-violet-600 text-white"
              : "bg-white/5 text-white/50 hover:bg-white/10"
          }`}
        >
          🎛️ Manuel
        </button>
      </div>

      {/* Face Preview */}
      <div className="w-full aspect-square max-w-[280px] mx-auto mb-4 rounded-2xl overflow-hidden border border-white/10 bg-black/30">
        <HologramFace
          voiceState="idle"
          expressionOverride={combo}
          expressionIntensityLevel={currentIntensity}
          bobbyColor={savedSettings.bobbyColor}
          bobbyColors={savedSettings.bobbyColors}
        />
      </div>

      {/* Current combo display */}
      <div className="bg-white/5 rounded-xl p-3 mb-4 border border-white/10">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
          <div className="text-white/40">👀 Yeux</div>
          <div className="text-cyan-300 font-mono">{combo.eyes}</div>
          <div className="text-white/40">👁️ Sourcils</div>
          <div className="text-violet-300 font-mono">{combo.eyebrows}</div>
          <div className="text-white/40">👄 Bouche</div>
          <div className="text-pink-300 font-mono">{combo.mouth}</div>
          <div className="text-white/40">🎬 Animation</div>
          <div className="text-amber-300 font-mono">{combo.animation}</div>
          <div className="text-white/40">⚡ Intensité</div>
          <div className="text-emerald-300 font-mono">{currentIntensity}/5</div>
        </div>
      </div>

      {/* Controls */}
      {mode === "emotion" ? (
        <div className="space-y-4">
          {/* Intensity Slider */}
          <div>
            <label className="text-[10px] text-white/50 uppercase tracking-wider font-semibold mb-2 block">
              Intensité : {intensity}
            </label>
            <Slider
              value={[intensity]}
              onValueChange={([v]) => setIntensity(v)}
              min={1} max={5} step={1}
              className="w-full"
            />
            <div className="flex justify-between text-[9px] text-white/30 mt-1">
              <span>Subtil</span><span>Normal</span><span>Exagéré</span>
            </div>
          </div>

          {/* Emotion Grid */}
          <div>
            <label className="text-[10px] text-white/50 uppercase tracking-wider font-semibold mb-2 block">
              Émotion
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {EMOTIONS.map(e => (
                <button
                  key={e}
                  onClick={() => setSelectedEmotion(e)}
                  className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl text-[10px] transition-all ${
                    selectedEmotion === e
                      ? "bg-violet-600/40 border border-violet-400/50 text-white"
                      : "bg-white/5 border border-transparent text-white/50 hover:bg-white/10"
                  }`}
                >
                  <span className="text-lg">{EMOTION_EMOJI[e]}</span>
                  <span className="truncate w-full text-center">{e}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Manual Intensity */}
          <div>
            <label className="text-[10px] text-white/50 uppercase tracking-wider font-semibold mb-2 block">
              Intensité : {manualIntensity}
            </label>
            <Slider
              value={[manualIntensity]}
              onValueChange={([v]) => setManualIntensity(v)}
              min={1} max={5} step={1}
              className="w-full"
            />
          </div>

          {/* Eyes Slider */}
          <SliderPicker
            label="👀 Yeux"
            items={eyeKeys}
            value={eyeIdx}
            onChange={setEyeIdx}
            color="text-cyan-300"
          />

          {/* Eyebrows Slider */}
          <SliderPicker
            label="👁️ Sourcils"
            items={browKeys}
            value={browIdx}
            onChange={setBrowIdx}
            color="text-violet-300"
          />

          {/* Mouth Slider */}
          <SliderPicker
            label="👄 Bouche"
            items={mouthKeys}
            value={mouthIdx}
            onChange={setMouthIdx}
            color="text-pink-300"
          />

          {/* Animation Slider */}
          <SliderPicker
            label="🎬 Animation"
            items={animKeys}
            value={animIdx}
            onChange={setAnimIdx}
            color="text-amber-300"
          />
        </div>
      )}
    </div>
  );
}

function SliderPicker({
  label,
  items,
  value,
  onChange,
  color,
}: {
  label: string;
  items: string[];
  value: number;
  onChange: (v: number) => void;
  color: string;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <label className="text-[10px] text-white/50 uppercase tracking-wider font-semibold">{label}</label>
        <span className={`text-xs font-mono ${color}`}>{items[value]}</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={0}
        max={items.length - 1}
        step={1}
        className="w-full"
      />
      <div className="flex justify-between text-[8px] text-white/20 mt-0.5">
        <span>{items[0]}</span>
        <span>{items[items.length - 1]}</span>
      </div>
    </div>
  );
}
