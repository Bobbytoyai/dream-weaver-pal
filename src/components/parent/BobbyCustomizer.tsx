import { useState } from "react";
import { ChevronLeft, Shuffle, ChevronDown } from "lucide-react";
import type { ParentSettings } from "@/components/parentSettings";
import { HologramFace } from "@/components/hologram/HologramFace";

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

const BobbyCustomizer = ({ settings, onUpdate, onBack, onSave, saved }: BobbyCustomizerProps) => {
  const [openSection, setOpenSection] = useState<string | null>(null);

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

  const selectedBg = SECTIONS[3].colors.find(c => c.id === colors.background) || SECTIONS[3].colors[0];

  const getSelectedHex = (sectionKey: string): string => {
    const section = SECTIONS.find(s => s.key === sectionKey);
    const selectedId = (colors as any)[sectionKey];
    const found = section?.colors.find(c => c.id === selectedId);
    return found?.hex || "#ccc";
  };

  return (
    <div className="p-4 space-y-4" style={{ fontFamily: "'Nunito', sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack}
          className="flex items-center gap-1 text-[13px] font-extrabold text-primary hover:underline active:scale-95 transition-all">
          <ChevronLeft className="w-4 h-4" /> Retour
        </button>
        <button
          onClick={randomizeBobby}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-accent-foreground text-[12px] font-extrabold hover:opacity-90 active:scale-95 transition-all shadow-sm"
        >
          <Shuffle className="w-3.5 h-3.5" /> Aléatoire
        </button>
      </div>

      {/* Preview */}
      <div
        className="rounded-2xl overflow-hidden border-2 border-border/20 relative"
        style={{ backgroundColor: selectedBg.hex, aspectRatio: "16/9" }}
      >
        <div className="w-full h-full">
          <HologramFace voiceState="idle" enableCamera={false} bobbyColor={colors.iris} bobbyColors={colors} />
        </div>
      </div>

      {/* Compact cards grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {SECTIONS.map((section) => {
          const isOpen = openSection === section.key;
          const currentHex = getSelectedHex(section.key);
          const isTransparent = currentHex === "transparent";

          return (
            <div key={section.key} className={`transition-all duration-200 ${isOpen ? "col-span-2" : ""}`}>
              {/* Card button */}
              <button
                onClick={() => setOpenSection(isOpen ? null : section.key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 transition-all duration-200 active:scale-[0.97] ${
                  isOpen
                    ? "border-primary/40 bg-primary/5 shadow-md"
                    : "border-border/30 bg-card hover:border-border/50 hover:shadow-sm"
                }`}
              >
                <span className="text-[16px]">{section.emoji}</span>
                <span className="text-[12px] font-bold text-foreground flex-1 text-left">{section.label}</span>
                {/* Current color dot */}
                <div
                  className="w-6 h-6 rounded-lg border-2 border-border/40 shrink-0"
                  style={{
                    backgroundColor: isTransparent ? undefined : currentHex,
                    ...(isTransparent ? { background: "repeating-conic-gradient(#ddd 0% 25%, transparent 0% 50%) 50% / 8px 8px" } : {}),
                  }}
                />
                <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Expanded color picker */}
              {isOpen && (
                <div className="flex gap-2 flex-wrap mt-2 px-1 pb-1 animate-fade-in">
                  {section.colors.map((c) => {
                    const isSelected = (colors as any)[section.key] === c.id;
                    const isTrans = c.hex === "transparent";
                    return (
                      <button
                        key={c.id}
                        onClick={() => updateColor(section.key, c.id)}
                        className={`w-9 h-9 rounded-xl transition-all duration-150 active:scale-90 border-[2.5px] flex items-center justify-center ${
                          isSelected
                            ? "border-primary shadow-md scale-110 ring-2 ring-primary/25"
                            : "border-transparent hover:scale-105 hover:border-border/40"
                        }`}
                        style={{
                          backgroundColor: isTrans ? undefined : c.hex,
                          ...(isTrans ? { background: "repeating-conic-gradient(#ddd 0% 25%, transparent 0% 50%) 50% / 10px 10px" } : {}),
                        }}
                        title={c.label}
                      >
                        {isTrans && <span className="text-[9px] text-muted-foreground font-bold">∅</span>}
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
        className={`w-full py-3 rounded-2xl text-[13px] font-black transition-all active:scale-95 ${
          saved
            ? "bg-success/15 text-success border-2 border-success/30"
            : "bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/25"
        }`}>
        {saved ? "✅ Enregistré !" : "💾 Enregistrer"}
      </button>
    </div>
  );
};

export default BobbyCustomizer;
