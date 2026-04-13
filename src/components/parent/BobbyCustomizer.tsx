import { ChevronLeft, Shuffle } from "lucide-react";
import type { ParentSettings } from "@/components/parentSettings";
import { HologramFace } from "@/components/hologram/HologramFace";

interface BobbyCustomizerProps {
  settings: ParentSettings;
  onUpdate: <K extends keyof ParentSettings>(key: K, value: ParentSettings[K]) => void;
  onBack: () => void;
  onSave: () => void;
  saved: boolean;
}

// ─── Per-element color palettes (kid-friendly pastels matching toy/case aesthetics) ───

const IRIS_COLORS = [
  { id: "blue", label: "Bleu", hex: "#4A90D9" },
  { id: "green", label: "Vert", hex: "#5CB85C" },
  { id: "purple", label: "Violet", hex: "#9B59B6" },
  { id: "amber", label: "Ambre", hex: "#E6A532" },
  { id: "pink", label: "Rose", hex: "#E06B8F" },
  { id: "teal", label: "Turquoise", hex: "#3DBDB5" },
];

const CHEEK_COLORS = [
  { id: "pink", label: "Rose", hex: "#F8B4C8" },
  { id: "peach", label: "Pêche", hex: "#FCDAB7" },
  { id: "lavender", label: "Lavande", hex: "#D4B8E8" },
  { id: "coral", label: "Corail", hex: "#F5A08C" },
  { id: "mint", label: "Menthe", hex: "#B8E6D0" },
  { id: "none", label: "Aucune", hex: "transparent" },
];

const EYEBROW_COLORS = [
  { id: "brown", label: "Brun", hex: "#8B6914" },
  { id: "dark", label: "Foncé", hex: "#4A3728" },
  { id: "blonde", label: "Blond", hex: "#D4A54A" },
  { id: "grey", label: "Gris", hex: "#9E9E9E" },
  { id: "blue", label: "Bleu", hex: "#5B8BD4" },
  { id: "pink", label: "Rose", hex: "#D47BA0" },
];

const BG_COLORS = [
  { id: "soft-blue", label: "Bleu doux", hex: "#E8F0FE", hsl: "220, 80%, 95%" },
  { id: "soft-pink", label: "Rose doux", hex: "#FDE8F0", hsl: "340, 80%, 95%" },
  { id: "soft-green", label: "Vert doux", hex: "#E8FEF0", hsl: "150, 80%, 95%" },
  { id: "soft-purple", label: "Violet doux", hex: "#F0E8FE", hsl: "270, 80%, 95%" },
  { id: "soft-yellow", label: "Jaune doux", hex: "#FEF8E8", hsl: "45, 80%, 95%" },
  { id: "white", label: "Blanc", hex: "#FFFFFF", hsl: "0, 0%, 100%" },
  { id: "dark", label: "Sombre", hex: "#1A1A2E", hsl: "240, 28%, 14%" },
  { id: "night", label: "Nuit", hex: "#0D1B2A", hsl: "210, 55%, 11%" },
];

const BobbyCustomizer = ({ settings, onUpdate, onBack, onSave, saved }: BobbyCustomizerProps) => {
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
    const pick = <T extends { id: string }>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)].id;
    onUpdate("bobbyColors" as keyof ParentSettings, {
      iris: pick(IRIS_COLORS),
      cheek: pick(CHEEK_COLORS),
      eyebrow: pick(EYEBROW_COLORS),
      background: pick(BG_COLORS),
    } as any);
  };

  const selectedBg = BG_COLORS.find(c => c.id === colors.background) || BG_COLORS[0];

  return (
    <div className="p-4 space-y-5" style={{ fontFamily: "'Nunito', sans-serif" }}>
      <button onClick={onBack}
        className="flex items-center gap-1.5 text-[13px] font-extrabold text-primary hover:underline mb-1 active:scale-95 transition-all">
        <ChevronLeft className="w-4 h-4" /> Retour
      </button>

      <div className="flex items-center justify-between">
        <h2 className="text-[18px] font-black text-foreground animate-fadeInUp">🎨 Personnaliser Bobby</h2>
        <button
          onClick={randomizeBobby}
          className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-accent text-accent-foreground text-[13px] font-extrabold hover:opacity-90 active:scale-95 transition-all animate-fadeInUp shadow-sm"
        >
          <Shuffle className="w-4 h-4" /> Aléatoire
        </button>
      </div>

      {/* Full-width landscape preview */}
      <div
        className="animate-fadeInUp rounded-3xl overflow-hidden border-2 border-border/30 relative"
        style={{
          animationDelay: "0.05s",
          backgroundColor: selectedBg.hex,
          aspectRatio: "16/9",
        }}
      >
        <div className="w-full h-full">
          <HologramFace
            voiceState="idle"
            enableCamera={false}
            bobbyColor={colors.iris}
            bobbyColors={colors}
          />
        </div>
        <p className="absolute bottom-2 left-0 right-0 text-center text-[10px] font-bold"
          style={{ color: selectedBg.id === "dark" || selectedBg.id === "night" ? "#ffffff88" : "#00000055" }}>
          Aperçu en direct
        </p>
      </div>

      {/* ── Color sections ── */}
      <ColorSection
        label="👁️ Couleur des yeux"
        colors={IRIS_COLORS}
        selected={colors.iris}
        onSelect={(id) => updateColor("iris", id)}
        delay="0.1s"
      />

      <ColorSection
        label="🔴 Couleur des joues"
        colors={CHEEK_COLORS}
        selected={colors.cheek}
        onSelect={(id) => updateColor("cheek", id)}
        delay="0.15s"
      />

      <ColorSection
        label="〰️ Couleur des sourcils"
        colors={EYEBROW_COLORS}
        selected={colors.eyebrow}
        onSelect={(id) => updateColor("eyebrow", id)}
        delay="0.2s"
      />

      <ColorSection
        label="🖼️ Fond d'écran"
        colors={BG_COLORS}
        selected={colors.background}
        onSelect={(id) => updateColor("background", id)}
        delay="0.25s"
        large
      />

      {/* Save */}
      <button onClick={onSave}
        className={`w-full py-3.5 rounded-2xl text-[14px] font-black transition-all active:scale-95 animate-fadeInUp ${
          saved
            ? "bg-success/15 text-success border-2 border-success/30"
            : "bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/25"
        }`}
        style={{ animationDelay: "0.3s" }}>
        {saved ? "✅ Enregistré !" : "💾 Enregistrer"}
      </button>
    </div>
  );
};

// ─── Reusable color picker row ───
function ColorSection({ label, colors, selected, onSelect, delay, large }: {
  label: string;
  colors: { id: string; label: string; hex: string }[];
  selected: string;
  onSelect: (id: string) => void;
  delay: string;
  large?: boolean;
}) {
  return (
    <div className="animate-fadeInUp" style={{ animationDelay: delay }}>
      <h3 className="text-[13px] font-black text-foreground mb-2.5">{label}</h3>
      <div className="flex gap-2.5 flex-wrap">
        {colors.map((c) => {
          const isSelected = selected === c.id;
          const isTransparent = c.hex === "transparent";
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={`${large ? "w-10 h-10" : "w-11 h-11"} rounded-2xl transition-all duration-200 active:scale-90 border-[3px] flex items-center justify-center ${
                isSelected
                  ? "border-primary shadow-lg scale-110 ring-2 ring-primary/30"
                  : "border-transparent hover:scale-105 hover:border-border/40"
              }`}
              style={{
                backgroundColor: isTransparent ? undefined : c.hex,
                ...(isTransparent ? { background: "repeating-conic-gradient(#ddd 0% 25%, transparent 0% 50%) 50% / 12px 12px" } : {}),
              }}
              title={c.label}
            >
              {isTransparent && <span className="text-[10px] text-muted-foreground font-bold">∅</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default BobbyCustomizer;
