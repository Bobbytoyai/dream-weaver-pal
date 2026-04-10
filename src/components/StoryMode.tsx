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

  // Init SFX bus
  useEffect(() => {
    const cleanup = initSfxEventBus();
    return cleanup;
  }, []);

  // Emit state changes
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

    // Try to get a template for this theme
    const template = await getRandomStory(theme, childAge);
    setStoryTitle(template?.title || `Histoire ${theme}`);

    eventBus.emit({ type: "STORY_START", theme, title: template?.title || theme });

    // Play a "hmm" filler while loading
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

        // Save to memory
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      audioQueue.stopAll();
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-between h-screen bg-background px-4 py-6 max-w-lg mx-auto select-none overflow-hidden">
      {/* Hologram */}
      <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0">
        <div className="relative w-72 h-72 md:w-80 md:h-80">
          <HologramFace
            voiceState={voiceState}
            enableCamera={parentSettings?.enableCamera ?? false}
            onTripleTap={onParentMode}
          />
        </div>

        {/* Story title / status */}
        <p className="mt-3 text-sm font-semibold text-muted-foreground tracking-wide uppercase">
          {phase === "pick" && "Choisis un thème !"}
          {phase === "loading" && "Préparation de l'histoire…"}
          {phase === "telling" && (storyTitle || "Il était une fois…")}
          {phase === "done" && "Fin de l'histoire ✨"}
        </p>

        {/* Scrolling story text when telling */}
        {(phase === "telling" || phase === "done") && storyText && (
          <div className="mt-3 max-h-24 overflow-y-auto px-4 w-full">
            <p className="text-xs text-muted-foreground/70 text-center leading-relaxed">
              {storyText.slice(-200)}
            </p>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="pb-6 pt-2 w-full">
        {phase === "pick" && (
          <>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => startStory(t.id)}
                  className="flex flex-col items-center gap-1 py-3 px-2 rounded-2xl bg-card border-2 border-border hover:border-primary hover:scale-105 active:scale-95 transition-all"
                >
                  <span className="text-2xl">{t.emoji}</span>
                  <span className="text-xs font-bold text-foreground">{t.label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={onBack}
              className="flex items-center justify-center gap-2 w-full py-3 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </button>
          </>
        )}

        {(phase === "telling" || phase === "loading") && (
          <button
            onClick={stopStory}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-full bg-destructive/10 text-destructive font-bold text-sm hover:bg-destructive/20 transition-all active:scale-95"
          >
            <X className="w-4 h-4" />
            Arrêter l'histoire
          </button>
        )}

        {phase === "done" && (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => currentTheme && startStory(currentTheme)}
              className="w-full py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm hover:scale-105 transition-all active:scale-95"
            >
              🔄 Encore une !
            </button>
            <button
              onClick={() => { setPhase("pick"); setStoryText(""); }}
              className="w-full py-3 rounded-full bg-card border-2 border-border text-foreground font-bold text-sm hover:border-primary transition-all"
            >
              📚 Autre thème
            </button>
            <button
              onClick={onBack}
              className="flex items-center justify-center gap-2 w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
