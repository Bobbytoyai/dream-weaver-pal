import { useState, useRef } from "react";
import { Volume2, Loader2 } from "lucide-react";
import { fetchTTSAudio, type VoiceProfile } from "@/lib/voicePipeline";

interface VoicePickerStepProps {
  childName: string;
  selectedVoice: VoiceProfile;
  onSelect: (v: VoiceProfile) => void;
  onNext: () => void;
}

const VOICE_OPTIONS: { id: VoiceProfile; label: string; emoji: string; desc: string }[] = [
  { id: "child", label: "Cartoon", emoji: "🧒", desc: "Voix fun et dynamique" },
  { id: "female", label: "Maman", emoji: "👩", desc: "Douce et rassurante" },
  { id: "male", label: "Papa", emoji: "👨", desc: "Calme et chaleureuse" },
];

const PREVIEW_TEXT_FN = (name: string) =>
  `Salut ${name} ! C'est Bobby, ton compagnon magique !`;

export default function VoicePickerStep({ childName, selectedVoice, onSelect, onNext }: VoicePickerStepProps) {
  const [playing, setPlaying] = useState<VoiceProfile | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const preview = async (profile: VoiceProfile) => {
    // Stop any current playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
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
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] flex items-center justify-center mb-6 shadow-lg shadow-[hsla(200,100%,60%,0.25)]">
        <span className="text-4xl">🎙️</span>
      </div>
      <h2 className="text-3xl font-extrabold text-foreground mb-2">
        Quelle voix pour Bobby ?
      </h2>
      <p className="text-muted-foreground text-sm mb-6">
        Appuie sur le 🔊 pour écouter !
      </p>

      <div className="flex flex-col gap-3 w-full mb-8">
        {VOICE_OPTIONS.map((v) => {
          const isSelected = selectedVoice === v.id;
          const isPlaying = playing === v.id;
          return (
            <button
              key={v.id}
              onClick={() => onSelect(v.id)}
              className={`relative flex items-center gap-4 rounded-2xl px-5 py-4 transition-all duration-200 ${
                isSelected
                  ? "bg-gradient-to-r from-[hsl(var(--primary))]/20 to-[hsl(var(--secondary))]/15 border-2 border-[hsl(var(--primary))] shadow-lg shadow-[hsla(200,100%,60%,0.15)]"
                  : "bg-[hsl(var(--muted))]/50 border-2 border-transparent hover:border-[hsl(var(--primary))]/30 hover:bg-[hsl(var(--muted))]"
              }`}
            >
              <span className="text-3xl">{v.emoji}</span>
              <div className="flex-1 text-left">
                <div className="font-bold text-foreground text-lg">{v.label}</div>
                <div className="text-muted-foreground text-xs">{v.desc}</div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  preview(v.id);
                }}
                disabled={isPlaying}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  isPlaying
                    ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] animate-pulse"
                    : "bg-[hsl(var(--muted))] text-muted-foreground hover:bg-[hsl(var(--primary))]/30 hover:text-foreground"
                }`}
              >
                {isPlaying ? <Loader2 className="w-5 h-5 animate-spin" /> : <Volume2 className="w-5 h-5" />}
              </button>
            </button>
          );
        })}
      </div>

      <button
        onClick={onNext}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--secondary))] text-[hsl(var(--primary-foreground))] font-bold text-lg shadow-lg shadow-[hsla(200,100%,60%,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
      >
        Suivant ✨
      </button>
    </div>
  );
}
