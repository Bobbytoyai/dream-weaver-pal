import { useState, useRef, useCallback, useEffect } from "react";
import { BookOpen, ArrowLeft, X } from "lucide-react";
import { HologramFace } from "@/components/hologram/HologramFace";
import { fetchTTSAudio, useAudioQueue } from "@/lib/voicePipeline";
import { streamStory, getRandomStory, type StoryTemplate } from "@/lib/storyEngine";
import { useChildMemory } from "@/hooks/useChildMemory";
import { eventBus } from "@/lib/eventBus";
import { initSfxEventBus } from "@/lib/sfx";
import { ParentSettings } from "@/components/parentSettings";

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
  const [storyText, setStoryText] = useState("");
  const [storyTitle, setStoryTitle] = useState("");

  const abortRef = useRef<AbortController | null>(null);
  const pendingRef = useRef(0);
  const allDoneRef = useRef(false);

  const audioQueue = useAudioQueue();
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

  const processSentenceForTTS = useCallback(async (sentence: string, signal?: AbortSignal) => {
    pendingRef.current++;
    try {
      const url = await fetchTTSAudio(sentence, signal, currentVoiceId);
      if (!signal?.aborted) {
        setVoiceState("speaking");
        eventBus.emit({ type: "SPEECH_START" });
        audioQueue.enqueue(url);
      }
    } catch {
      // skip
    } finally {
      pendingRef.current--;
      if (pendingRef.current === 0 && allDoneRef.current) {
        audioQueue.setOnAllDone(() => {
          eventBus.emit({ type: "SPEECH_STOP" });
          setVoiceState("idle");
          setPhase("done");
        });
      }
    }
  }, [audioQueue]);

  const startStory = useCallback(async (theme: string) => {
    setCurrentTheme(theme);
    setPhase("loading");
    setStoryText("");
    setVoiceState("processing");
    allDoneRef.current = false;
    pendingRef.current = 0;

    const abortController = new AbortController();
    abortRef.current = abortController;

    const template = await getRandomStory(theme, childAge);
    setStoryTitle(template?.title || `Histoire ${theme}`);

    eventBus.emit({ type: "STORY_START", theme, title: template?.title || theme });

    fetchTTSAudio("Il était une fois…", abortController.signal, currentVoiceId).then(url => {
      if (!abortController.signal.aborted) {
        setVoiceState("speaking");
        eventBus.emit({ type: "SPEECH_START" });
        audioQueue.enqueue(url);
      }
    }).catch(() => {});

    setPhase("telling");

    await streamStory({
      template: template || undefined,
      childName,
      childAge,
      theme,
      signal: abortController.signal,
      onSentence: (sentence) => {
        if (!abortController.signal.aborted) {
          setStoryText(prev => prev + (prev ? " " : "") + sentence);
          processSentenceForTTS(sentence, abortController.signal);
        }
      },
      onDone: (fullText) => {
        allDoneRef.current = true;
        setStoryText(fullText);

        if (template) {
          incrementStoriesHeard(template.id, theme);
        }
        addFavoriteTheme(theme);

        if (pendingRef.current === 0) {
          audioQueue.setOnAllDone(() => {
            eventBus.emit({ type: "SPEECH_STOP" });
            eventBus.emit({ type: "STORY_END" });
            setVoiceState("idle");
            setPhase("done");
          });
        }
      },
      onError: (error) => {
        console.error("Story error:", error);
        setVoiceState("idle");
        setPhase("pick");
      },
    });
  }, [childName, childAge, audioQueue, processSentenceForTTS, incrementStoriesHeard, addFavoriteTheme]);

  const stopStory = useCallback(() => {
    abortRef.current?.abort();
    audioQueue.stopAll();
    eventBus.emit({ type: "SPEECH_STOP" });
    eventBus.emit({ type: "STORY_END" });
    setVoiceState("idle");
    setPhase("pick");
  }, [audioQueue]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      audioQueue.stopAll();
    };
  }, []);

  return (
    <div className="child-light flex flex-col items-center justify-between h-screen px-4 py-6 max-w-lg mx-auto select-none overflow-hidden relative"
      style={{ background: `linear-gradient(180deg, hsl(270, 45%, 96%) 0%, hsl(235, 50%, 96%) 40%, hsl(215, 55%, 96%) 70%, hsl(320, 35%, 96.5%) 100%)` }}>

      {/* Floating particles */}
      <FloatingParticles />

      {/* Hologram */}
      <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0 relative z-10">
        {/* Soft glow */}
        <div className="absolute w-80 h-80 rounded-full glow-pulse pointer-events-none"
          style={{
            background: `radial-gradient(circle, 
              hsla(270, 55%, 70%, ${voiceState === "speaking" ? 0.18 : 0.1}) 0%, 
              hsla(215, 60%, 70%, 0.06) 40%,
              transparent 70%)`,
          }}
        />

        <div className="relative w-72 h-72 md:w-80 md:h-80">
          <HologramFace
            voiceState={voiceState}
            enableCamera={parentSettings?.enableCamera ?? false}
            onTripleTap={onParentMode}
          />
        </div>

        {/* Story title / status */}
        <p className="mt-3 text-sm font-bold text-foreground/70 tracking-wide uppercase">
          {phase === "pick" && "Choisis un thème !"}
          {phase === "loading" && "Préparation de l'histoire…"}
          {phase === "telling" && (storyTitle || "Il était une fois…")}
          {phase === "done" && "Fin de l'histoire ✨"}
        </p>

        {/* Scrolling story text */}
        {(phase === "telling" || phase === "done") && storyText && (
          <div className="mt-3 max-h-24 overflow-y-auto px-4 w-full">
            <p className="text-xs text-muted-foreground/70 text-center leading-relaxed">
              {storyText.slice(-200)}
            </p>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="pb-6 pt-2 w-full relative z-10">
        {phase === "pick" && (
          <>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {THEMES.map((t) => (
                <button key={t.id} onClick={() => startStory(t.id)}
                  className="flex flex-col items-center gap-1.5 py-4 px-2 rounded-3xl bg-white/70 backdrop-blur-sm border border-border/40 shadow-sm hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-300">
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
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-full bg-white/60 backdrop-blur-sm border border-destructive/20 text-destructive font-bold text-sm hover:bg-destructive/10 transition-all duration-300 active:scale-95">
            <X className="w-4 h-4" />
            Arrêter l'histoire
          </button>
        )}

        {phase === "done" && (
          <div className="flex flex-col gap-3">
            <button onClick={() => currentTheme && startStory(currentTheme)}
              className="w-full py-3.5 rounded-full bg-primary text-primary-foreground font-bold text-sm shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-300 active:scale-95">
              🔄 Encore une !
            </button>
            <button onClick={() => { setPhase("pick"); setStoryText(""); }}
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
