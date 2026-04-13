import { useState, useRef, useCallback, useEffect } from "react";
import { ArrowLeft, X } from "lucide-react";
import { HologramFace } from "@/components/hologram/HologramFace";
import { fetchTTSAudio, detectEmotionForTTS } from "@/lib/voicePipeline";
import type { Emotion } from "@/lib/voicePipeline";
import { streamStory, getRandomStory } from "@/lib/storyEngine";
import { useChildMemory } from "@/hooks/useChildMemory";
import { eventBus } from "@/lib/eventBus";
import { initSfxEventBus } from "@/lib/sfx";
import { ParentSettings } from "@/components/parentSettings";
import StoryNarrationPlayer from "./StoryNarrationPlayer";

type StoryPhase = "pick" | "loading" | "telling" | "done";
type VoiceState = "idle" | "listening" | "processing" | "speaking" | "interrupted" | "session_end";

const THEMES = [
  { id: "princesse", label: "Princesse", emoji: "👸" },
  { id: "pirate", label: "Pirate", emoji: "🏴‍☠️" },
  { id: "espace", label: "Espace", emoji: "🚀" },
  { id: "animaux", label: "Animaux", emoji: "🐾" },
  { id: "éducatif", label: "Éducatif", emoji: "🧠" },
  { id: "aventure", label: "Aventure", emoji: "⚔️" },
];

interface StoryModeProps {
  childName: string;
  childAge: number;
  onBack: () => void;
  parentSettings?: ParentSettings;
  onParentMode: () => void;
}

/* ── Floating Particles ── */
const FloatingParticles = () => {
  const particles = Array.from({ length: 10 }, (_, i) => ({
    id: i,
    size: 3 + Math.random() * 6,
    left: Math.random() * 100,
    delay: Math.random() * 10,
    duration: 12 + Math.random() * 12,
    color: [
      "hsla(270, 55%, 65%, 0.2)",
      "hsla(215, 80%, 60%, 0.18)",
      "hsla(45, 80%, 65%, 0.15)",
      "hsla(320, 50%, 65%, 0.15)",
      "hsla(155, 55%, 55%, 0.15)",
    ][i % 5],
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <div key={p.id} className="floating-particle"
          style={{
            width: p.size, height: p.size,
            left: `${p.left}%`, bottom: "-10px",
            backgroundColor: p.color,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
};

export default function StoryMode({ childName, childAge, onBack, parentSettings, onParentMode }: StoryModeProps) {
  const currentVoiceId = parentSettings?.voiceType || "female";
  const [phase, setPhase] = useState<StoryPhase>("pick");
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [currentTheme, setCurrentTheme] = useState<string | null>(null);
  const [storyTitle, setStoryTitle] = useState("");
  const [sentences, setSentences] = useState<string[]>([]);
  const [isStoryComplete, setIsStoryComplete] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const { incrementStoriesHeard, addFavoriteTheme } = useChildMemory(childName);

  useEffect(() => {
    const cleanup = initSfxEventBus();
    return cleanup;
  }, []);

  const prevVoiceState = useRef<VoiceState>("idle");
  useEffect(() => {
    if (voiceState === prevVoiceState.current) return;
    eventBus.emit({ type: "STATE_CHANGED", state: voiceState, prev: prevVoiceState.current });
    prevVoiceState.current = voiceState;
  }, [voiceState]);

  // Emotion-aware TTS fetcher for the player
  const fetchStoryAudio = useCallback(async (text: string, emotion?: Emotion): Promise<string> => {
    // For stories, use more expressive settings
    const storyEmotion = emotion || detectEmotionForTTS(text) || "excited";
    return fetchTTSAudio(text, abortRef.current?.signal, currentVoiceId, storyEmotion);
  }, [currentVoiceId]);

  const startStory = useCallback(async (theme: string) => {
    setCurrentTheme(theme);
    setPhase("loading");
    setSentences([]);
    setIsStoryComplete(false);
    setVoiceState("processing");

    const abortController = new AbortController();
    abortRef.current = abortController;

    const template = await getRandomStory(theme, childAge);
    setStoryTitle(template?.title || `Histoire ${theme}`);

    eventBus.emit({ type: "STORY_START", theme, title: template?.title || theme });

    setPhase("telling");
    setVoiceState("speaking");

    await streamStory({
      template: template || undefined,
      childName,
      childAge,
      theme,
      signal: abortController.signal,
      onSentence: (sentence) => {
        if (!abortController.signal.aborted) {
          setSentences(prev => [...prev, sentence]);
        }
      },
      onDone: (fullText) => {
        setIsStoryComplete(true);
        if (template) {
          incrementStoriesHeard(template.id, theme);
        }
        addFavoriteTheme(theme);
      },
      onError: (error) => {
        console.error("Story error:", error);
        setVoiceState("idle");
        setPhase("pick");
      },
    });
  }, [childName, childAge, incrementStoriesHeard, addFavoriteTheme]);

  const stopStory = useCallback(() => {
    abortRef.current?.abort();
    eventBus.emit({ type: "SPEECH_STOP" });
    eventBus.emit({ type: "STORY_END" });
    setVoiceState("idle");
    setPhase("pick");
    setSentences([]);
    setIsStoryComplete(false);
  }, []);

  const handleNarrationFinished = useCallback(() => {
    eventBus.emit({ type: "SPEECH_STOP" });
    eventBus.emit({ type: "STORY_END" });
    setVoiceState("idle");
    setPhase("done");
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return (
    <div className="child-light flex flex-col items-center justify-between h-screen px-4 py-6 max-w-lg mx-auto select-none overflow-hidden relative"
      style={{ background: `linear-gradient(180deg, hsl(270, 45%, 96%) 0%, hsl(235, 50%, 96%) 40%, hsl(215, 55%, 96%) 70%, hsl(320, 35%, 96.5%) 100%)` }}>

      <FloatingParticles />

      {/* Hologram */}
      <div className="flex-shrink-0 flex flex-col items-center w-full relative z-10">
        <div className="absolute w-80 h-80 rounded-full glow-pulse pointer-events-none"
          style={{
            background: `radial-gradient(circle, 
              hsla(270, 55%, 70%, ${voiceState === "speaking" ? 0.18 : 0.1}) 0%, 
              hsla(215, 60%, 70%, 0.06) 40%,
              transparent 70%)`,
          }}
        />
        <div className="relative w-52 h-52 md:w-60 md:h-60">
          <HologramFace
            voiceState={voiceState}
            enableCamera={parentSettings?.enableCamera ?? false}
            onTripleTap={onParentMode}
          />
        </div>

        {/* Story title / status */}
        <p className="mt-2 text-sm font-bold text-foreground/70 tracking-wide uppercase">
          {phase === "pick" && "Choisis un thème !"}
          {phase === "loading" && "Préparation de l'histoire…"}
          {phase === "telling" && (storyTitle || "Il était une fois…")}
          {phase === "done" && "Fin de l'histoire ✨"}
        </p>
      </div>

      {/* Narration Player */}
      {(phase === "telling" || phase === "done") && sentences.length > 0 && (
        <div className="flex-1 min-h-0 w-full relative z-10 flex flex-col justify-center py-3">
          <StoryNarrationPlayer
            sentences={sentences}
            isComplete={isStoryComplete}
            fetchAudio={fetchStoryAudio}
            onFinished={handleNarrationFinished}
            voiceState={voiceState}
          />
        </div>
      )}

      {/* Bottom controls */}
      <div className="pb-4 pt-2 w-full relative z-10 flex-shrink-0">
        {phase === "pick" && (
          <>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {THEMES.map((t) => (
                <button key={t.id} onClick={() => startStory(t.id)}
                  className="flex flex-col items-center gap-1.5 py-4 px-2 rounded-3xl bg-white/70 backdrop-blur-sm border border-border/40 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-300">
                  <span className="text-3xl">{t.emoji}</span>
                  <span className="text-xs font-bold text-foreground">{t.label}</span>
                </button>
              ))}
            </div>
            <button onClick={onBack}
              className="flex items-center justify-center gap-2 w-full py-3 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors duration-300">
              <ArrowLeft className="w-4 h-4" />
              Retour
            </button>
          </>
        )}

        {(phase === "telling" || phase === "loading") && (
          <button onClick={stopStory}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-full bg-white/60 backdrop-blur-sm border border-destructive/20 text-destructive font-bold text-sm hover:bg-destructive/10 transition-all duration-300">
            <X className="w-4 h-4" />
            Arrêter l'histoire
          </button>
        )}

        {phase === "done" && (
          <div className="flex flex-col gap-3">
            <button onClick={() => currentTheme && startStory(currentTheme)}
              className="w-full py-3.5 rounded-full bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--secondary))] text-[hsl(var(--primary-foreground))] font-bold text-sm shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
              🔄 Encore une !
            </button>
            <button onClick={() => { setPhase("pick"); setSentences([]); setIsStoryComplete(false); }}
              className="w-full py-3.5 rounded-full bg-white/70 backdrop-blur-sm border border-border/40 text-foreground font-bold text-sm shadow-sm hover:shadow-md transition-all duration-300">
              📚 Autre thème
            </button>
            <button onClick={onBack}
              className="flex items-center justify-center gap-2 w-full py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors duration-300">
              <ArrowLeft className="w-4 h-4" />
              Retour
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
