import { ChevronLeft } from "lucide-react";
import type { ParentSettings } from "@/components/parentSettings";
import { BOBBY_COLORS } from "@/components/parentSettings";
import { HologramFace } from "@/components/hologram/HologramFace";

interface BobbyCustomizerProps {
  settings: ParentSettings;
  onUpdate: <K extends keyof ParentSettings>(key: K, value: ParentSettings[K]) => void;
  onBack: () => void;
  onSave: () => void;
  saved: boolean;
}

const SLIDERS: {
  key: keyof ParentSettings["bobbyCustomization"];
  label: string;
  emoji: string;
  min: number;
  max: number;
  step: number;
  desc: string;
}[] = [
  { key: "eyeSize", label: "Taille des yeux", emoji: "👁️", min: 0.5, max: 1.5, step: 0.05, desc: "Gros yeux mignons ou petits yeux malins" },
  { key: "eyeSpacing", label: "Écartement des yeux", emoji: "↔️", min: 0.5, max: 1.5, step: 0.05, desc: "Rapprochés ou éloignés" },
  { key: "pupilSize", label: "Taille des pupilles", emoji: "⚫", min: 0.5, max: 1.5, step: 0.05, desc: "Petites pupilles ou grands yeux kawaii" },
  { key: "eyelidDroop", label: "Paupières", emoji: "😌", min: 0, max: 1, step: 0.05, desc: "Ouvertes ou mi-closes (style cool)" },
  { key: "eyebrowHeight", label: "Hauteur des sourcils", emoji: "🤨", min: 0.5, max: 1.5, step: 0.05, desc: "Sourcils hauts (surpris) ou bas (sérieux)" },
  { key: "eyebrowCurve", label: "Courbe des sourcils", emoji: "〰️", min: 0, max: 1, step: 0.05, desc: "Droits ou très courbés" },
  { key: "eyebrowThickness", label: "Épaisseur des sourcils", emoji: "━", min: 0.5, max: 1.5, step: 0.05, desc: "Fins et discrets ou épais et expressifs" },
  { key: "mouthWidth", label: "Largeur de la bouche", emoji: "👄", min: 0.5, max: 1.5, step: 0.05, desc: "Petite bouche ou grand sourire" },
  { key: "mouthCurve", label: "Sourire", emoji: "😊", min: 0, max: 1, step: 0.05, desc: "Neutre, souriant ou très joyeux" },
  { key: "cheekSize", label: "Joues", emoji: "🔴", min: 0, max: 1.5, step: 0.05, desc: "Sans joues ou grosses joues rondes" },
];

const BobbyCustomizer = ({ settings, onUpdate, onBack, onSave, saved }: BobbyCustomizerProps) => {
  const custom = settings.bobbyCustomization;

  const updateCustom = (key: keyof ParentSettings["bobbyCustomization"], value: number) => {
    onUpdate("bobbyCustomization", { ...custom, [key]: value });
  };

  const resetAll = () => {
    onUpdate("bobbyCustomization", {
      eyeSize: 1, eyeSpacing: 1, pupilSize: 1,
      eyebrowHeight: 1, eyebrowCurve: 0.5, eyebrowThickness: 1,
      mouthWidth: 1, mouthCurve: 0.7, cheekSize: 1, eyelidDroop: 0.2,
    });
  };

  return (
    <div className="p-4 space-y-4" style={{ fontFamily: "'Nunito', sans-serif" }}>
      <button onClick={onBack}
        className="flex items-center gap-1.5 text-[13px] font-extrabold text-primary hover:underline mb-1 active:scale-95 transition-all">
        <ChevronLeft className="w-4 h-4" /> Retour
      </button>

      <h2 className="text-[18px] font-black text-foreground animate-fadeInUp">🎨 Personnaliser Bobby</h2>
      <p className="text-[12px] text-muted-foreground -mt-2 animate-fadeInUp" style={{ animationDelay: "0.05s" }}>
        Modifie l'apparence de Bobby pour qu'il soit unique !
      </p>

      {/* Live Preview */}
      <div className="animate-fadeInUp bg-gradient-to-br from-muted/50 via-background to-muted/30 rounded-3xl p-4 border-2 border-border/30" style={{ animationDelay: "0.1s" }}>
        <div className="w-32 h-32 mx-auto relative">
          <HologramFace voiceState="idle" enableCamera={false} bobbyColor={settings.bobbyColor} />
        </div>
        <p className="text-center text-[10px] text-muted-foreground mt-2 font-bold">Aperçu en direct</p>
      </div>

      {/* Colors */}
      <div className="animate-fadeInUp" style={{ animationDelay: "0.15s" }}>
        <h3 className="text-[14px] font-black text-foreground mb-2">🎨 Couleur principale</h3>
        <div className="flex gap-3 flex-wrap">
          {BOBBY_COLORS.map((c) => {
            const selected = settings.bobbyColor === c.id;
            return (
              <button key={c.id} onClick={() => onUpdate("bobbyColor", c.id)}
                className={`w-12 h-12 rounded-2xl transition-all duration-200 active:scale-90 border-3 ${
                  selected ? "border-foreground shadow-lg scale-110" : "border-transparent hover:scale-105"
                }`}
                style={{ backgroundColor: `hsl(${c.hsl})` }}
                title={c.label}
              />
            );
          })}
        </div>
      </div>

      {/* Face sliders */}
      <div className="space-y-3">
        {SLIDERS.map((s, i) => (
          <div key={s.key} className="bg-card rounded-2xl p-3 border-2 border-border/20 animate-fadeInUp"
            style={{ animationDelay: `${0.2 + i * 0.03}s` }}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-base">{s.emoji}</span>
                <h4 className="text-[12px] font-black text-foreground">{s.label}</h4>
              </div>
              <span className="text-[11px] font-mono font-bold text-primary">{custom[s.key].toFixed(2)}</span>
            </div>
            <p className="text-[9px] text-muted-foreground mb-2">{s.desc}</p>
            <input
              type="range"
              min={s.min}
              max={s.max}
              step={s.step}
              value={custom[s.key]}
              onChange={(e) => updateCustom(s.key, Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none bg-muted accent-primary"
            />
          </div>
        ))}
      </div>

      {/* Reset + Save */}
      <div className="flex gap-2">
        <button onClick={resetAll}
          className="flex-1 py-3 rounded-2xl text-[12px] font-black bg-muted text-muted-foreground hover:bg-muted/80 transition-all active:scale-95">
          🔄 Réinitialiser
        </button>
        <button onClick={onSave}
          className={`flex-[2] py-3 rounded-2xl text-[14px] font-black transition-all active:scale-95 ${
            saved
              ? "bg-emerald-500/15 text-emerald-700 border-2 border-emerald-500/30"
              : "bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/25"
          }`}>
          {saved ? "✅ Enregistré !" : "💾 Enregistrer"}
        </button>
      </div>
    </div>
  );
};

export default BobbyCustomizer;
