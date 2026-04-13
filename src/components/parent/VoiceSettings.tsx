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

const RETRO_COLORS = ["var(--retro-blue)", "var(--retro-yellow)", "var(--retro-green)", "var(--retro-red)", "var(--retro-purple)", "var(--retro-orange)"];

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
        className="flex items-center gap-1.5 text-[13px] font-black uppercase text-foreground hover:opacity-70 mb-1 active:scale-95 transition-all border-2 border-black px-3 py-1.5 bg-white">
        <ChevronLeft className="w-4 h-4" /> RÉGLAGES
      </button>

      <h2 className="text-[18px] font-black text-foreground uppercase tracking-wide">🎤 VOIX DE BOBBY</h2>
      <p className="text-[12px] text-muted-foreground -mt-2 font-bold">
        Choisissez la voix et le caractère qui conviennent le mieux à votre enfant
      </p>

      {/* Voice Cards */}
      <div className="space-y-2.5">
        {VOICES.map((v, i) => {
          const selected = settings.voiceType === v.type;
          const isPlaying = previewPlaying === v.type;
          const retroBg = RETRO_COLORS[i % RETRO_COLORS.length];
          return (
            <button
              key={v.type}
              onClick={() => !v.locked && onUpdate("voiceType", v.type)}
              disabled={v.locked}
              className={`retro-card retro-card-tilt-${(i % 6) + 1} w-full text-left p-4 transition-all duration-200 ${
                v.locked ? "opacity-40 cursor-not-allowed" :
                selected ? "ring-4 ring-foreground/20" : "hover:translate-y-[-2px]"
              }`}
              style={{ backgroundColor: selected ? retroBg : "var(--card)" }}
            >
              <div className="flex items-start gap-3">
                <div className="w-14 h-14 border-4 border-black flex items-center justify-center text-3xl shrink-0 bg-white">
                  {v.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[15px] font-black text-foreground uppercase">{v.label}</h3>
                    <span className="text-[9px] px-2 py-0.5 border-2 border-black font-black bg-white text-foreground">
                      {v.character}
                    </span>
                  </div>
                  <p className="text-[11px] text-foreground/70 font-bold mt-0.5">{v.tone}</p>
                  <p className="text-[10px] text-foreground/60 mt-1 leading-snug">{v.desc}</p>
                  <p className="text-[9px] mt-1.5 font-black text-foreground/80">✨ {v.bestFor}</p>
                </div>
                {!v.locked && selected && (
                  <button
                    onClick={(e) => { e.stopPropagation(); previewVoice(v.type); }}
                    disabled={!!previewPlaying}
                    className="w-10 h-10 border-4 border-black bg-white text-foreground flex items-center justify-center shrink-0 hover:opacity-90 active:scale-90 transition-all"
                    style={{ boxShadow: "3px 3px 0px rgba(0,0,0,0.3)" }}>
                    {isPlaying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Speed */}
      <div className="retro-card retro-card-tilt-2 p-4" style={{ backgroundColor: "var(--retro-yellow)" }}>
        <h3 className="text-[14px] font-black text-foreground mb-3 uppercase">⚡ VITESSE DE PAROLE</h3>
        <div className="grid grid-cols-3 gap-2">
          {SPEEDS.map(s => (
            <button key={s.value} onClick={() => onUpdate("voiceSpeed", s.value)}
              className={`p-3 text-center transition-all border-4 border-black ${
                settings.voiceSpeed === s.value
                  ? "bg-white ring-2 ring-foreground/20"
                  : "bg-white/60 hover:bg-white"
              }`}
              style={{ boxShadow: settings.voiceSpeed === s.value ? "4px 4px 0px rgba(0,0,0,0.25)" : "2px 2px 0px rgba(0,0,0,0.15)" }}>
              <span className="text-2xl block">{s.emoji}</span>
              <span className="text-[11px] font-black block mt-1 text-foreground uppercase">{s.label}</span>
              <span className="text-[9px] text-foreground/60 leading-tight block mt-0.5 font-bold">{s.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Personality / Ton */}
      <div className="retro-card retro-card-tilt-5 p-4" style={{ backgroundColor: "var(--retro-purple)" }}>
        <h3 className="text-[14px] font-black text-foreground mb-1 uppercase">🎭 TON DE BOBBY</h3>
        <p className="text-[11px] text-foreground/70 mb-3 font-bold">Influence la manière dont Bobby s'exprime</p>
        <div className="grid grid-cols-2 gap-2">
          {PERSONALITIES.map(p => (
            <button key={p.value} onClick={() => onUpdate("personality", p.value)}
              className={`p-3 text-left transition-all border-4 border-black ${
                settings.personality === p.value
                  ? "bg-white ring-2 ring-foreground/20"
                  : "bg-white/60 hover:bg-white"
              }`}
              style={{ boxShadow: settings.personality === p.value ? "4px 4px 0px rgba(0,0,0,0.25)" : "2px 2px 0px rgba(0,0,0,0.15)" }}>
              <span className="text-2xl">{p.emoji}</span>
              <h4 className="text-[12px] font-black mt-1 text-foreground uppercase">{p.label}</h4>
              <p className="text-[9px] text-foreground/60 mt-0.5 font-bold">{p.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* SFX Volume */}
      <div className="retro-card retro-card-tilt-1 p-4" style={{ backgroundColor: "var(--retro-green)" }}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[13px] font-black text-foreground uppercase">🔊 VOLUME DES SONS</h3>
          <span className="text-[12px] font-mono font-black text-foreground border-2 border-black px-2 py-0.5 bg-white">{Math.round(settings.sfxVolume * 100)}%</span>
        </div>
        <input type="range" min="0" max="100" value={Math.round(settings.sfxVolume * 100)}
          onChange={(e) => onUpdate("sfxVolume", Number(e.target.value) / 100)}
          className="w-full h-3 appearance-none bg-white border-2 border-black accent-foreground" />
        <div className="flex justify-between text-[9px] text-foreground/60 mt-1 font-black">
          <span>🔇 MUET</span><span>🔊 MAX</span>
        </div>
      </div>

      {/* Save */}
      <button
        onClick={onSave}
        className={`w-full py-3.5 text-[14px] font-black transition-all active:scale-95 border-4 border-black uppercase ${
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

export default VoiceSettings;
