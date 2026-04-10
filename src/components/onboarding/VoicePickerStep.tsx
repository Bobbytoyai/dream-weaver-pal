import { useState, useRef } from "react";
import { Volume2, Loader2, Play, Pause } from "lucide-react";
import { fetchTTSAudio, type VoiceProfile } from "@/lib/voicePipeline";
import { HologramFace } from "../hologram/HologramFace";

interface VoicePickerStepProps {
  childName: string;
  selectedVoice: VoiceProfile;
  onSelect: (v: VoiceProfile) => void;
  onNext: () => void;
}

const VOICE_OPTIONS: { id: VoiceProfile; label: string; emoji: string; desc: string }[] = [
  { id: "child", label: "Cartoon", emoji: "🧒", desc: "Voix fun et dynamique" },
  { id: "sister", label: "Grande Sœur", emoji: "👧", desc: "Cool et complice" },
  { id: "brother", label: "Grand Frère", emoji: "🧑", desc: "Aventurier et drôle" },
  { id: "female", label: "Maman", emoji: "👩", desc: "Douce et rassurante" },
  { id: "male", label: "Papa", emoji: "👨", desc: "Calme et chaleureuse" },
];

const PREVIEW_TEXT_FN = (name: string) =>
  `Salut ${name} ! C'est Bobby, ton compagnon magique !`;

export default function VoicePickerStep({ childName, selectedVoice, onSelect, onNext }: VoicePickerStepProps) {
  const [playing, setPlaying] = useState<VoiceProfile | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const preview = async (profile: VoiceProfile) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (playing === profile) {
      setPlaying(null);
      return;
    }
    setPlaying(profile);
    onSelect(profile);
    try {
      const url = await fetchTTSAudio(PREVIEW_TEXT_FN(childName), undefined, profile);
      if (url === "__silent__" || url === "__browser_tts__") {
        setPlaying(null);
        return;
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setPlaying(null);
      audio.onerror = () => setPlaying(null);
      await audio.play();
    } catch {
      setPlaying(null);
    }
  };

  return (
    <div className="flex flex-col items-center text-center w-full">
      <div className="w-24 h-24 mb-5 relative animate-fadeInUp">
        <div className="absolute inset-0 rounded-full bg-[hsla(var(--primary),0.15)] blur-2xl scale-150 glow-pulse" />
        <HologramFace voiceState={playing ? "speaking" : "idle"} enableCamera={false} emotionOverride={playing ? "happy" : undefined} />
      </div>
      <h2 className="text-3xl font-extrabold text-foreground mb-2 animate-fadeInUp" style={{ animationDelay: "0.05s" }}>
        Quelle voix pour Bobby ?
      </h2>
      <p className="text-muted-foreground text-sm mb-5 animate-fadeInUp" style={{ animationDelay: "0.1s" }}>
        Appuie sur ▶ pour écouter chaque voix !
      </p>

      <div className="flex flex-col gap-2.5 w-full mb-6">
        {VOICE_OPTIONS.map((v, idx) => {
          const isSelected = selectedVoice === v.id;
          const isPlaying = playing === v.id;
          return (
            <button
              key={v.id}
              onClick={() => onSelect(v.id)}
              className={`animate-fadeInUp relative flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-300 ${
                isSelected
                  ? "bg-gradient-to-r from-[hsl(var(--primary))]/20 to-[hsl(var(--secondary))]/15 border-2 border-[hsl(var(--primary))] shadow-lg shadow-[hsla(200,100%,60%,0.15)] scale-[1.02]"
                  : "bg-[hsl(var(--muted))]/50 border-2 border-transparent hover:border-[hsl(var(--primary))]/30 hover:bg-[hsl(var(--muted))]"
              }`}
              style={{ animationDelay: `${0.12 + idx * 0.06}s` }}
            >
              <span className={`text-2xl transition-transform duration-300 ${isSelected ? "scale-110" : ""}`}>{v.emoji}</span>
              <div className="flex-1 text-left">
                <div className="font-bold text-foreground text-base leading-tight">{v.label}</div>
                <div className="text-muted-foreground text-xs">{v.desc}</div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  preview(v.id);
                }}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isPlaying
                    ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-md shadow-[hsla(200,100%,60%,0.3)] scale-110"
                    : "bg-[hsl(var(--muted))] text-muted-foreground hover:bg-[hsl(var(--primary))]/30 hover:text-foreground hover:scale-105"
                }`}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
            </button>
          );
        })}
      </div>

      <button
        onClick={onNext}
        className="animate-fadeInUp w-full py-4 rounded-2xl bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--secondary))] text-[hsl(var(--primary-foreground))] font-bold text-lg shadow-lg shadow-[hsla(200,100%,60%,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
        style={{ animationDelay: "0.5s" }}
      >
        Suivant ✨
      </button>
    </div>
  );
}
