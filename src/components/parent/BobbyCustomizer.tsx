import { useState, useRef, useCallback } from "react";
import { ChevronLeft, Shuffle, ChevronDown } from "lucide-react";
import type { ParentSettings } from "@/components/parentSettings";
import { HologramFace } from "@/components/hologram/HologramFace";
import type { FaceState } from "@/components/hologram/useFaceAnimation";
import { Switch } from "@/components/ui/switch";
import type { BobbyEmotion } from "@/lib/bobby/expressionEngine";

interface BobbyCustomizerProps {
  settings: ParentSettings;
  onUpdate: <K extends keyof ParentSettings>(key: K, value: ParentSettings[K]) => void;
  onBack: () => void;
  onSave: () => void;
  saved: boolean;
}

const SECTIONS = [
  {
    key: "iris",
    emoji: "👁️",
    label: "Yeux",
    colors: [
      { id: "blue", label: "Bleu", hex: "#4A90D9" },
      { id: "green", label: "Vert", hex: "#5CB85C" },
      { id: "purple", label: "Violet", hex: "#9B59B6" },
      { id: "amber", label: "Ambre", hex: "#E6A532" },
      { id: "pink", label: "Rose", hex: "#E06B8F" },
      { id: "teal", label: "Turquoise", hex: "#3DBDB5" },
    ],
  },
  {
    key: "cheek",
    emoji: "🔴",
    label: "Joues",
    colors: [
      { id: "pink", label: "Rose", hex: "#F8B4C8" },
      { id: "peach", label: "Pêche", hex: "#FCDAB7" },
      { id: "lavender", label: "Lavande", hex: "#D4B8E8" },
      { id: "coral", label: "Corail", hex: "#F5A08C" },
      { id: "mint", label: "Menthe", hex: "#B8E6D0" },
      { id: "none", label: "Aucune", hex: "transparent" },
    ],
  },
  {
    key: "eyebrow",
    emoji: "〰️",
    label: "Sourcils",
    colors: [
      { id: "brown", label: "Brun", hex: "#8B6914" },
      { id: "dark", label: "Foncé", hex: "#4A3728" },
      { id: "blonde", label: "Blond", hex: "#D4A54A" },
      { id: "grey", label: "Gris", hex: "#9E9E9E" },
      { id: "blue", label: "Bleu", hex: "#5B8BD4" },
      { id: "pink", label: "Rose", hex: "#D47BA0" },
    ],
  },
  {
    key: "background",
    emoji: "🖼️",
    label: "Fond",
    colors: [
      { id: "soft-blue", label: "Bleu doux", hex: "#E8F0FE" },
      { id: "soft-pink", label: "Rose doux", hex: "#FDE8F0" },
      { id: "soft-green", label: "Vert doux", hex: "#E8FEF0" },
      { id: "soft-purple", label: "Violet doux", hex: "#F0E8FE" },
      { id: "soft-yellow", label: "Jaune doux", hex: "#FEF8E8" },
      { id: "white", label: "Blanc", hex: "#FFFFFF" },
      { id: "dark", label: "Sombre", hex: "#1A1A2E" },
      { id: "night", label: "Nuit", hex: "#0D1B2A" },
    ],
  },
] as const;

const EMOTION_BUTTONS: { emoji: string; label: string; face: FaceState }[] = [
  { emoji: "😊", label: "Joie", face: "happy" },
  { emoji: "😢", label: "Triste", face: "sad" },
  { emoji: "😮", label: "Surprise", face: "surprised" },
  { emoji: "🤔", label: "Curieux", face: "curious" },
  { emoji: "😴", label: "Dodo", face: "sleepy" },
  { emoji: "🤩", label: "Excité", face: "excited" },
  { emoji: "😌", label: "Calme", face: "calm" },
  { emoji: "🏆", label: "Fier", face: "proud" },
  { emoji: "😐", label: "Neutre", face: "idle" },
  { emoji: "🎧", label: "Écoute", face: "listening" },
  { emoji: "💭", label: "Pense", face: "thinking" },
  { emoji: "🗣️", label: "Parle", face: "speaking" },
  { emoji: "😵", label: "Confus", face: "confused" },
  { emoji: "🤗", label: "Réconfort", face: "reassuring" },
  { emoji: "👀", label: "Attentif", face: "attentive" },
  { emoji: "😜", label: "Joueur", face: "playful" },
];

const FACE_TO_EMOTION: Record<string, BobbyEmotion> = {
  happy: "joy", sad: "sadness", surprised: "surprise", curious: "curiosity",
  excited: "excitement", calm: "calm", proud: "pride", confused: "confusion",
  reassuring: "love", playful: "boredom", attentive: "determination",
};

const TOGGLEABLE_EMOTIONS = EMOTION_BUTTONS.filter(
  e => !["idle", "listening", "thinking", "speaking", "sleepy"].includes(e.face)
);

const RETRO_COLORS = ["var(--retro-blue)", "var(--retro-yellow)", "var(--retro-green)", "var(--retro-red)"];

const BobbyCustomizer = ({ settings, onUpdate, onBack, onSave, saved }: BobbyCustomizerProps) => {
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [activeEmotion, setActiveEmotion] = useState<FaceState | undefined>(undefined);
  const [showEmotions, setShowEmotions] = useState(true);
  const emotionTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const colors = settings.bobbyColors || {
    iris: "blue",
    cheek: "pink",
    eyebrow: "brown",
    background: "soft-blue",
  };

  const updateColor = (element: string, colorId: string) => {
    onUpdate("bobbyColors" as keyof ParentSettings, {
      ...colors,
      [element]: colorId,
    } as any);
  };

  const randomizeBobby = () => {
    const pick = <T extends { id: string }>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)].id;
    onUpdate("bobbyColors" as keyof ParentSettings, {
      iris: pick(SECTIONS[0].colors),
      cheek: pick(SECTIONS[1].colors),
      eyebrow: pick(SECTIONS[2].colors),
      background: pick(SECTIONS[3].colors),
    } as any);
  };

  const testEmotion = useCallback((face: FaceState) => {
    if (emotionTimerRef.current) clearTimeout(emotionTimerRef.current);
    if (activeEmotion === face) {
      setActiveEmotion(undefined);
      return;
    }
    setActiveEmotion(face);
    emotionTimerRef.current = setTimeout(() => setActiveEmotion(undefined), 4000);
  }, [activeEmotion]);

  const selectedBg = SECTIONS[3].colors.find(c => c.id === colors.background) || SECTIONS[3].colors[0];

  const getSelectedHex = (sectionKey: string): string => {
    const section = SECTIONS.find(s => s.key === sectionKey);
    const selectedId = (colors as any)[sectionKey];
    const found = section?.colors.find(c => c.id === selectedId);
    return found?.hex || "#ccc";
  };

  const voiceStateMap: Record<string, "idle" | "listening" | "processing" | "speaking"> = {
    speaking: "speaking",
    listening: "listening",
    thinking: "processing",
  };
  const previewVoiceState = activeEmotion && voiceStateMap[activeEmotion] ? voiceStateMap[activeEmotion] : "idle";
  const previewEmotionOverride = activeEmotion && !voiceStateMap[activeEmotion] && activeEmotion !== "idle" ? activeEmotion : undefined;

  return (
    <div className="p-4 space-y-4" style={{ fontFamily: "'Nunito', sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack}
          className="flex items-center gap-1 text-[13px] font-black uppercase text-foreground hover:opacity-70 active:scale-95 transition-all border-2 border-black px-3 py-1.5 bg-white">
          <ChevronLeft className="w-4 h-4" /> RETOUR
        </button>
        <button
          onClick={randomizeBobby}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--retro-yellow)] text-foreground text-[12px] font-black uppercase hover:opacity-90 active:scale-95 transition-all border-4 border-black"
          style={{ boxShadow: "3px 3px 0px rgba(0,0,0,0.25)" }}
        >
          <Shuffle className="w-3.5 h-3.5" /> ALÉATOIRE
        </button>
      </div>

      {/* Preview */}
      <div
        className="retro-card retro-card-tilt-1 overflow-hidden relative"
        style={{ backgroundColor: selectedBg.hex, aspectRatio: "16/9" }}
      >
        <div className="w-full h-full">
          <HologramFace
            voiceState={previewVoiceState}
            enableCamera={false}
            bobbyColor={colors.iris}
            bobbyColors={colors}
            emotionOverride={previewEmotionOverride}
          />
        </div>
        {activeEmotion && (
          <div className="absolute top-2 right-2 px-2.5 py-1 border-2 border-black bg-white text-foreground text-[10px] font-black uppercase">
            {EMOTION_BUTTONS.find(e => e.face === activeEmotion)?.emoji}{" "}
            {EMOTION_BUTTONS.find(e => e.face === activeEmotion)?.label}
          </div>
        )}
      </div>

      {/* Emotion test buttons */}
      <div>
        <button
          onClick={() => setShowEmotions(!showEmotions)}
          className="w-full flex items-center justify-between px-3 py-2 border-4 border-black bg-[var(--retro-purple)] hover:opacity-90 transition-all"
          style={{ boxShadow: "3px 3px 0px rgba(0,0,0,0.2)" }}
        >
          <span className="text-[12px] font-black text-foreground uppercase">🎭 TESTER LES EXPRESSIONS</span>
          <ChevronDown className={`w-3.5 h-3.5 text-foreground transition-transform duration-200 ${showEmotions ? "rotate-180" : ""}`} />
        </button>

        {showEmotions && (
          <div className="grid grid-cols-4 gap-1.5 mt-2">
            {EMOTION_BUTTONS.map((emo) => {
              const isActive = activeEmotion === emo.face;
              return (
                <button
                  key={emo.face}
                  onClick={() => testEmotion(emo.face)}
                  className={`flex flex-col items-center gap-0.5 py-1.5 px-1 transition-all duration-150 active:scale-90 border-2 border-black ${
                    isActive
                      ? "bg-[var(--retro-yellow)] shadow-md scale-[1.08]"
                      : "bg-white hover:bg-[var(--retro-blue)]/30 hover:scale-105"
                  }`}
                  style={{ boxShadow: isActive ? "3px 3px 0px rgba(0,0,0,0.2)" : "1px 1px 0px rgba(0,0,0,0.1)" }}
                >
                  <span className="text-[18px] leading-none">{emo.emoji}</span>
                  <span className={`text-[9px] font-black leading-tight uppercase ${isActive ? "text-foreground" : "text-foreground/60"}`}>
                    {emo.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Expression enable/disable toggles */}
      <div>
        <button
          onClick={() => setOpenSection(openSection === "expr-toggles" ? null : "expr-toggles")}
          className="w-full flex items-center justify-between px-3 py-2 border-4 border-black bg-[var(--retro-red)] hover:opacity-90 transition-all"
          style={{ boxShadow: "3px 3px 0px rgba(0,0,0,0.2)" }}
        >
          <span className="text-[12px] font-black text-foreground uppercase">🚫 ACTIVER / DÉSACTIVER</span>
          <ChevronDown className={`w-3.5 h-3.5 text-foreground transition-transform duration-200 ${openSection === "expr-toggles" ? "rotate-180" : ""}`} />
        </button>

        {openSection === "expr-toggles" && (
          <div className="mt-2 space-y-1">
            <p className="text-[9px] text-foreground/60 px-1 mb-1.5 font-bold">Désactivez les expressions que Bobby ne doit jamais utiliser en conversation.</p>
            {TOGGLEABLE_EMOTIONS.map((emo) => {
              const emotionKey = FACE_TO_EMOTION[emo.face];
              if (!emotionKey) return null;
              const isDisabled = (settings.disabledExpressions || []).includes(emotionKey);
              return (
                <div key={emo.face} className="flex items-center justify-between px-3 py-1.5 bg-white border-2 border-black hover:bg-[var(--retro-blue)]/20 transition-all">
                  <div className="flex items-center gap-2">
                    <span className="text-[16px]">{emo.emoji}</span>
                    <span className="text-[11px] font-black text-foreground uppercase">{emo.label}</span>
                  </div>
                  <Switch
                    checked={!isDisabled}
                    onCheckedChange={(enabled) => {
                      const current = settings.disabledExpressions || [];
                      const updated = enabled
                        ? current.filter(e => e !== emotionKey)
                        : [...current, emotionKey];
                      onUpdate("disabledExpressions" as keyof ParentSettings, updated as any);
                    }}
                    className="scale-75"
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Compact color cards grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {SECTIONS.map((section, idx) => {
          const isOpen = openSection === section.key;
          const currentHex = getSelectedHex(section.key);
          const isTransparent = currentHex === "transparent";
          const retroBg = RETRO_COLORS[idx % RETRO_COLORS.length];

          return (
            <div key={section.key} className={`transition-all duration-200 ${isOpen ? "col-span-2" : ""} retro-card-tilt-${(idx % 6) + 1}`}>
              <button
                onClick={() => setOpenSection(isOpen ? null : section.key)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 border-4 border-black transition-all duration-200 active:scale-[0.97]"
                style={{
                  backgroundColor: isOpen ? retroBg : "var(--card)",
                  boxShadow: isOpen ? "4px 4px 0px rgba(0,0,0,0.25)" : "2px 2px 0px rgba(0,0,0,0.15)",
                }}
              >
                <span className="text-[16px]">{section.emoji}</span>
                <span className="text-[12px] font-black text-foreground flex-1 text-left uppercase">{section.label}</span>
                <div
                  className="w-6 h-6 border-2 border-black shrink-0"
                  style={{
                    backgroundColor: isTransparent ? undefined : currentHex,
                    ...(isTransparent ? { background: "repeating-conic-gradient(#ddd 0% 25%, transparent 0% 50%) 50% / 8px 8px" } : {}),
                  }}
                />
                <ChevronDown className={`w-3.5 h-3.5 text-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
              </button>

              {isOpen && (
                <div className="flex gap-2 flex-wrap mt-2 px-1 pb-1">
                  {section.colors.map((c) => {
                    const isSelected = (colors as any)[section.key] === c.id;
                    const isTrans = c.hex === "transparent";
                    return (
                      <button
                        key={c.id}
                        onClick={() => updateColor(section.key, c.id)}
                        className={`w-9 h-9 transition-all duration-150 active:scale-90 border-4 flex items-center justify-center ${
                          isSelected
                            ? "border-black scale-110 ring-2 ring-foreground/25"
                            : "border-black/30 hover:scale-105 hover:border-black"
                        }`}
                        style={{
                          backgroundColor: isTrans ? undefined : c.hex,
                          boxShadow: isSelected ? "3px 3px 0px rgba(0,0,0,0.25)" : "none",
                          ...(isTrans ? { background: "repeating-conic-gradient(#ddd 0% 25%, transparent 0% 50%) 50% / 10px 10px" } : {}),
                        }}
                        title={c.label}
                      >
                        {isTrans && <span className="text-[9px] text-foreground/60 font-black">∅</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Save */}
      <button onClick={onSave}
        className={`w-full py-3 text-[13px] font-black transition-all active:scale-95 border-4 border-black uppercase ${
          saved
            ? "bg-[var(--retro-green)] text-foreground"
            : "bg-foreground text-background hover:opacity-90"
        }`}
        style={{ boxShadow: "5px 5px 0px rgba(0,0,0,0.3)" }}>
        {saved ? "✅ ENREGISTRÉ !" : "💾 ENREGISTRER"}
      </button>
    </div>
  );
};

export default BobbyCustomizer;
