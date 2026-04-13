import { useState } from "react";
import { Play, Loader2, ChevronLeft } from "lucide-react";
import type { ParentSettings } from "@/components/parentSettings";

interface VoiceSettingsProps {
  settings: ParentSettings;
  onUpdate: <K extends keyof ParentSettings>(key: K, value: ParentSettings[K]) => void;
  onBack: () => void;
  onSave: () => void;
  saved: boolean;
}

const VOICES: {
  type: ParentSettings["voiceType"];
  label: string;
  emoji: string;
  character: string;
  tone: string;
  desc: string;
  bestFor: string;
  locked?: boolean;
}[] = [
  {
    type: "child",
    label: "Mélodie",
    emoji: "🧒",
    character: "Joyeuse & Espiègle",
    tone: "Voix enfantine, fun et expressive",
    desc: "Mélodie est une petite voix pétillante et pleine d'énergie. Elle parle comme une amie de l'enfant, avec des intonations ludiques et beaucoup d'enthousiasme.",
    bestFor: "Idéale pour les jeux, les blagues et les moments de fun",
  },
  {
    type: "female",
    label: "Mila",
    emoji: "👩",
    character: "Douce & Rassurante",
    tone: "Voix maternelle, calme et apaisante",
    desc: "Mila a une voix chaleureuse et enveloppante, comme une maman qui raconte une histoire du soir. Elle rassure et accompagne avec tendresse.",
    bestFor: "Parfaite pour les histoires du soir et les moments émotionnels",
  },
  {
    type: "male",
    label: "Vincent",
    emoji: "👨",
    character: "Calme & Protecteur",
    tone: "Voix grave et posée, chaleureuse",
    desc: "Vincent a une voix calme et posée qui inspire confiance. Il parle avec douceur et assurance, comme un papa bienveillant.",
    bestFor: "Idéal pour l'apprentissage et les conversations rassurantes",
  },
  {
    type: "sister",
    label: "Marine",
    emoji: "👧",
    character: "Cool & Complice",
    tone: "Voix adolescente, naturelle et enjouée",
    desc: "Marine parle comme une grande sœur complice. Elle est décontractée, cool et sait rendre les choses intéressantes avec un ton naturel.",
    bestFor: "Top pour les quiz, découvertes et conversations de copine",
  },
  {
    type: "brother",
    label: "Yanis",
    emoji: "👦",
    character: "Aventurier & Drôle",
    tone: "Voix dynamique, pleine d'énergie",
    desc: "Yanis est le grand frère aventurier ! Il raconte tout avec passion et humour, transformant chaque échange en mini-aventure.",
    bestFor: "Parfait pour les aventures, les défis et les moments de rire",
  },
  {
    type: "custom",
    label: "Personnaliser",
    emoji: "🎨",
    character: "Bientôt",
    tone: "Clonez votre propre voix",
    desc: "Bientôt, vous pourrez enregistrer votre propre voix pour que Bobby parle exactement comme vous le souhaitez.",
    bestFor: "Disponible dans une prochaine mise à jour",
    locked: true,
  },
];

const SPEEDS = [
  { value: "slow" as const, emoji: "🐢", label: "Lent", desc: "Articulation claire, idéal pour les petits" },
  { value: "normal" as const, emoji: "🔊", label: "Normal", desc: "Rythme naturel et fluide" },
  { value: "fast" as const, emoji: "⚡", label: "Rapide", desc: "Dynamique, pour les grands" },
];

const PERSONALITIES = [
  { value: "balanced" as const, emoji: "⚖️", label: "Équilibré", desc: "Mix parfait fun & éducatif" },
  { value: "calm" as const, emoji: "🧘", label: "Calme", desc: "Ton doux, pauses naturelles" },
  { value: "energetic" as const, emoji: "🎉", label: "Dynamique", desc: "Enthousiaste et motivant" },
  { value: "educational" as const, emoji: "🎓", label: "Éducatif", desc: "Focus sur l'apprentissage" },
];

const VoiceSettings = ({ settings, onUpdate, onBack, onSave, saved }: VoiceSettingsProps) => {
  const [previewPlaying, setPreviewPlaying] = useState<string | false>(false);

  const previewVoice = async (voiceType: string) => {
    if (previewPlaying || voiceType === "custom") return;
    setPreviewPlaying(voiceType);
    try {
      const { previewVoiceProfile } = await import("@/lib/voicePipeline");
      await previewVoiceProfile(voiceType as any);
    } catch (e) { console.warn("Preview error:", e); }
    finally { setPreviewPlaying(false); }
  };

  return (
    <div className="p-4 space-y-4" style={{ fontFamily: "'Nunito', sans-serif" }}>
      <button onClick={onBack}
        className="flex items-center gap-1.5 text-[13px] font-extrabold text-primary hover:underline mb-1 active:scale-95 transition-all">
        <ChevronLeft className="w-4 h-4" /> Réglages
      </button>

      <h2 className="text-[18px] font-black text-foreground animate-fadeInUp">🎤 Voix de Bobby</h2>
      <p className="text-[12px] text-muted-foreground -mt-2 animate-fadeInUp" style={{ animationDelay: "0.05s" }}>
        Choisissez la voix et le caractère qui conviennent le mieux à votre enfant
      </p>

      {/* Voice Cards */}
      <div className="space-y-2.5">
        {VOICES.map((v, i) => {
          const selected = settings.voiceType === v.type;
          const isPlaying = previewPlaying === v.type;
          return (
            <button
              key={v.type}
              onClick={() => !v.locked && onUpdate("voiceType", v.type)}
              disabled={v.locked}
              className={`animate-fadeInUp w-full text-left rounded-2xl p-4 transition-all duration-200 border-2 ${
                v.locked ? "opacity-40 cursor-not-allowed border-border/20 bg-muted/20" :
                selected
                  ? "bg-primary/8 border-primary/30 shadow-md shadow-primary/10"
                  : "bg-card border-border/20 hover:border-primary/15 hover:shadow-sm"
              }`}
              style={{ animationDelay: `${0.05 + i * 0.04}s` }}
            >
              <div className="flex items-start gap-3">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0 ${
                  selected ? "bg-primary/15" : "bg-muted/50"
                }`}>
                  {v.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-[15px] font-black ${selected ? "text-primary" : "text-foreground"}`}>{v.label}</h3>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                      selected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                    }`}>{v.character}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">{v.tone}</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1 leading-snug">{v.desc}</p>
                  <p className="text-[9px] mt-1.5 font-bold text-primary/70">✨ {v.bestFor}</p>
                </div>
                {/* Preview button */}
                {!v.locked && selected && (
                  <button
                    onClick={(e) => { e.stopPropagation(); previewVoice(v.type); }}
                    disabled={!!previewPlaying}
                    className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 hover:opacity-90 active:scale-90 transition-all shadow-md shadow-primary/30">
                    {isPlaying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Speed */}
      <div className="animate-fadeInUp" style={{ animationDelay: "0.3s" }}>
        <h3 className="text-[14px] font-black text-foreground mb-2">⚡ Vitesse de parole</h3>
        <div className="grid grid-cols-3 gap-2">
          {SPEEDS.map(s => (
            <button key={s.value} onClick={() => onUpdate("voiceSpeed", s.value)}
              className={`p-3 rounded-2xl text-center transition-all border-2 ${
                settings.voiceSpeed === s.value
                  ? "bg-primary/8 border-primary/30 shadow-sm"
                  : "bg-card border-border/20 hover:border-primary/15"
              }`}>
              <span className="text-2xl block">{s.emoji}</span>
              <span className={`text-[11px] font-black block mt-1 ${settings.voiceSpeed === s.value ? "text-primary" : "text-foreground"}`}>{s.label}</span>
              <span className="text-[9px] text-muted-foreground leading-tight block mt-0.5">{s.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Personality / Ton */}
      <div className="animate-fadeInUp" style={{ animationDelay: "0.35s" }}>
        <h3 className="text-[14px] font-black text-foreground mb-2">🎭 Ton de Bobby</h3>
        <p className="text-[11px] text-muted-foreground mb-2 -mt-1">Influence la manière dont Bobby s'exprime</p>
        <div className="grid grid-cols-2 gap-2">
          {PERSONALITIES.map(p => (
            <button key={p.value} onClick={() => onUpdate("personality", p.value)}
              className={`p-3 rounded-2xl text-left transition-all border-2 ${
                settings.personality === p.value
                  ? "bg-primary/8 border-primary/30"
                  : "bg-card border-border/20 hover:border-primary/15"
              }`}>
              <span className="text-2xl">{p.emoji}</span>
              <h4 className={`text-[12px] font-black mt-1 ${settings.personality === p.value ? "text-primary" : "text-foreground"}`}>{p.label}</h4>
              <p className="text-[9px] text-muted-foreground mt-0.5">{p.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* SFX Volume */}
      <div className="bg-card rounded-2xl p-4 border-2 border-border/20 animate-fadeInUp" style={{ animationDelay: "0.4s" }}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[13px] font-black text-foreground">🔊 Volume des sons</h3>
          <span className="text-[12px] font-mono font-bold text-primary">{Math.round(settings.sfxVolume * 100)}%</span>
        </div>
        <input type="range" min="0" max="100" value={Math.round(settings.sfxVolume * 100)}
          onChange={(e) => onUpdate("sfxVolume", Number(e.target.value) / 100)}
          className="w-full h-2 rounded-full appearance-none bg-muted accent-primary" />
        <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
          <span>🔇 Muet</span><span>🔊 Max</span>
        </div>
      </div>

      {/* Save */}
      <button
        onClick={onSave}
        className={`w-full py-3.5 rounded-2xl text-[14px] font-black transition-all active:scale-95 ${
          saved
            ? "bg-emerald-500/15 text-emerald-700 border-2 border-emerald-500/30"
            : "bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/25"
        }`}>
        {saved ? "✅ Enregistré !" : "💾 Enregistrer"}
      </button>
    </div>
  );
};

export default VoiceSettings;
