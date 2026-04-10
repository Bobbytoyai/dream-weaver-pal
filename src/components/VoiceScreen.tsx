import { useState, useEffect, useRef, useCallback } from "react";
import { BookOpen, Settings, Camera } from "lucide-react";
import { streamVoiceChat, fetchTTSAudio, useAudioQueue } from "@/lib/voicePipeline";
import { useSessionTracker } from "@/hooks/useSessionTracker";
import { useWakeWord } from "@/hooks/useWakeWord";
import { ParentSettings } from "@/components/ParentMode";
import { HologramFace } from "@/components/hologram/HologramFace";
import { setSfxVolume, initSfxEventBus } from "@/lib/sfx";
import { useChildMemory } from "@/hooks/useChildMemory";
import { eventBus } from "@/lib/eventBus";

type VoiceState = "idle" | "listening" | "processing" | "speaking" | "interrupted" | "session_end";
type AiMsg = { role: "user" | "assistant"; content: string };

const FALLBACK_FR: Record<string, string> = {
  not_heard: "Hmm… j'ai pas bien entendu… tu peux répéter ?",
  thinking: "hmm… attends…",
  error: "Oh… un petit souci… réessaie !",
  reengage: "Tu es encore là ? Dis Bobby si tu veux me parler !",
  session_end: "Je suis là quand tu veux revenir… dis juste Bobby !",
  welcome: "Salut ! Dis Bobby pour me parler !",
  interrupted: "Ah oui, pardon ! Dis-moi",
  wake_greeting: "Oui ? Je suis là !",
};

function detectEmotion(text: string): string | undefined {
  const lower = text.toLowerCase();
  if (lower.match(/triste|pleure|mal|manque|malheureux/)) return "sad";
  if (lower.match(/peur|effrayé|cauchemar|noir|monstre/)) return "scared";
  if (lower.match(/ennui|ennuie|rien à faire|boring/)) return "bored";
  if (lower.match(/content|super|génial|trop bien|cool|adore|aime|heureux|yay/)) return "happy";
  if (lower.match(/pourquoi|comment|c'est quoi|sais pas/)) return "curious";
  if (lower.match(/wow|waouh|incroyable|fou|dingue/)) return "excited";
  return undefined;
}

/** Strip wake word from transcript to get the actual command */
function stripWakeWord(text: string): string {
  return text.replace(/\b(bobby|boby|bobbie)\b/gi, "").replace(/\s+/g, " ").trim();
}

/** Check if transcript is just the wake word with no real command */
function isJustWakeWord(text: string): boolean {
  const stripped = stripWakeWord(text);
  // If after removing bobby, there's barely anything left
  return stripped.length < 3 || /^[?,!.\s]*$/.test(stripped);
}

interface VoiceScreenProps {
  childName: string;
  childAge: number;
  onSwitchToChat: () => void;
  onSwitchToStory?: () => void;
  onParentMode: () => void;
  parentSettings?: ParentSettings;
}

const VoiceScreen = ({ childName, childAge, onSwitchToChat, onSwitchToStory, onParentMode, parentSettings }: VoiceScreenProps) => {
  const [state, setState] = useState<VoiceState>("idle");
  const [conversationHistory, setConversationHistory] = useState<AiMsg[]>([]);
  const [partialText, setPartialText] = useState("");

  const abortRef = useRef<AbortController | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reengageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef<VoiceState>("idle");
  const pendingSentencesRef = useRef(0);
  const allSentencesDoneRef = useRef(false);
  const sessionStartedRef = useRef(false);

  const audioQueue = useAudioQueue();
  const session = useSessionTracker(childName, childAge);
  const { memory, addFavoriteTheme } = useChildMemory(childName);

  // Wake word is active when Bobby is idle or session_end
  const wakeWordEnabled = state === "idle" || state === "session_end";

  // Initialize SFX event bus listener (once)
  useEffect(() => {
    const cleanup = initSfxEventBus();
    return cleanup;
  }, []);

  // Emit STATE_CHANGED on every state transition
  const prevStateRef = useRef<VoiceState>("idle");
  useEffect(() => {
    if (state === prevStateRef.current) return;
    eventBus.emit({ type: "STATE_CHANGED", state, prev: prevStateRef.current });
    prevStateRef.current = state;
  }, [state]);

  useEffect(() => { stateRef.current = state; }, [state]);

  // Sync SFX volume from parent settings
  useEffect(() => {
    setSfxVolume(parentSettings?.sfxVolume ?? 0.7);
  }, [parentSettings?.sfxVolume]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      audioQueue.stopAll();
      clearTimers();
      if (sessionStartedRef.current) {
        session.endSession();
        eventBus.emit({ type: "SESSION_END" });
      }
    };
  }, []);

  const clearTimers = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (reengageTimerRef.current) clearTimeout(reengageTimerRef.current);
  }, []);

  const startSilenceTimers = useCallback(() => {
    clearTimers();
    reengageTimerRef.current = setTimeout(() => {
      if (stateRef.current === "idle") speakFallback("reengage");
    }, 15000);
    silenceTimerRef.current = setTimeout(() => {
      if (stateRef.current === "idle" || stateRef.current === "speaking") {
        setState("session_end");
        speakFallback("session_end");
        session.endSession();
        eventBus.emit({ type: "SESSION_END" });
        sessionStartedRef.current = false;
      }
    }, 60000);
  }, []);

  const speakFallback = useCallback(async (key: string) => {
    try {
      setState("speaking");
      eventBus.emit({ type: "SPEECH_START" });
      const url = await fetchTTSAudio(FALLBACK_FR[key] || FALLBACK_FR.error);
      audioQueue.enqueue(url);
      audioQueue.setOnAllDone(() => {
        eventBus.emit({ type: "SPEECH_STOP" });
        if (key === "session_end") {
          setState("session_end");
        } else {
          setState("idle");
          startSilenceTimers();
        }
      });
    } catch {
      setState("idle");
    }
  }, [audioQueue, startSilenceTimers]);

  const interrupt = useCallback(() => {
    abortRef.current?.abort();
    audioQueue.stopAll();
    clearTimers();
    setState("interrupted");
    eventBus.emit({ type: "SPEECH_STOP" });
  }, [audioQueue, clearTimers]);

  const processSentenceForTTS = useCallback(async (sentence: string, signal?: AbortSignal) => {
    pendingSentencesRef.current++;
    try {
      const url = await fetchTTSAudio(sentence, signal);
      if (!signal?.aborted) {
        setState("speaking");
        audioQueue.enqueue(url);
      }
    } catch {
      // continue
    } finally {
      pendingSentencesRef.current--;
      if (pendingSentencesRef.current === 0 && allSentencesDoneRef.current) {
        audioQueue.setOnAllDone(() => {
          eventBus.emit({ type: "SPEECH_STOP" });
          setState("idle");
          startSilenceTimers();
        });
      }
    }
  }, [audioQueue, startSilenceTimers]);

  const getAIResponse = useCallback(async (userText: string) => {
    setState("processing");
    clearTimers();
    setPartialText("");

    const emotion = detectEmotion(userText);
    session.addMessage("user", userText, emotion);
    eventBus.emit({ type: "VOICE_INPUT", transcript: userText });
    if (emotion) {
      eventBus.emit({ type: "EMOTION_DETECTED", emotion });
    }

    const newHistory: AiMsg[] = [...conversationHistory, { role: "user", content: userText }];
    const abortController = new AbortController();
    abortRef.current = abortController;
    allSentencesDoneRef.current = false;
    pendingSentencesRef.current = 0;

    fetchTTSAudio("hmm…", abortController.signal).then(url => {
      if (!abortController.signal.aborted && stateRef.current === "processing") {
        setState("speaking");
        eventBus.emit({ type: "SPEECH_START" });
        audioQueue.enqueue(url);
      }
    }).catch(() => {});

    let fullResponse = "";

    await streamVoiceChat({
      messages: newHistory,
      childName,
      childAge,
      mode: "chat",
      parentSettings,
      signal: abortController.signal,
      onSentence: (sentence) => {
        if (!abortController.signal.aborted) {
          processSentenceForTTS(sentence, abortController.signal);
        }
      },
      onDone: (text) => {
        fullResponse = text;
        allSentencesDoneRef.current = true;
        if (text) {
          setConversationHistory([...newHistory, { role: "assistant", content: text }]);
          session.addMessage("assistant", text);
          eventBus.emit({ type: "RESPONSE_READY", text });
        }
        if (pendingSentencesRef.current === 0) {
          audioQueue.setOnAllDone(() => {
            eventBus.emit({ type: "SPEECH_STOP" });
            setState("idle");
            startSilenceTimers();
          });
        }
      },
      onError: (error) => {
        console.error("AI error:", error);
        if (!abortController.signal.aborted) speakFallback("error");
      },
    });
  }, [conversationHistory, childName, childAge, audioQueue, clearTimers, processSentenceForTTS, speakFallback, startSilenceTimers, session]);

  // Handle wake word detection
  const handleWake = useCallback((transcript: string) => {
    if (stateRef.current === "speaking" || stateRef.current === "processing") {
      interrupt();
    }

    if (!sessionStartedRef.current) {
      session.startSession();
      sessionStartedRef.current = true;
      eventBus.emit({ type: "SESSION_START" });
    }

    eventBus.emit({ type: "WAKE_TRIGGERED" });

    // If just "Bobby" with no command, greet and wait
    if (isJustWakeWord(transcript)) {
      speakFallback("wake_greeting");
      return;
    }

    // Otherwise process the full phrase (minus wake word)
    const command = stripWakeWord(transcript);
    getAIResponse(command);
  }, [interrupt, session, speakFallback, getAIResponse]);

  // Wake word listener
  useWakeWord({
    enabled: wakeWordEnabled,
    onWake: handleWake,
    onPartial: setPartialText,
  });

  const handleParentMode = useCallback(() => {
    if (sessionStartedRef.current) {
      session.endSession();
      eventBus.emit({ type: "SESSION_END" });
      sessionStartedRef.current = false;
    }
    onParentMode();
  }, [onParentMode, session]);

  // State label
  const stateLabel = {
    idle: partialText ? `"${partialText}"` : 'Dis "Bobby" pour me parler !',
    listening: "J'écoute…",
    processing: "Je réfléchis…",
    speaking: "Je parle…",
    interrupted: "Dis-moi !",
    session_end: 'Dis "Bobby" pour revenir !',
  }[state];

  return (
    <div className="flex flex-col items-center justify-between h-screen bg-background px-4 py-6 max-w-lg mx-auto select-none overflow-hidden">
      {/* Top bar — parent mode + story */}
      <div className="w-full flex items-center justify-between px-2">
        <button
          onClick={onSwitchToStory}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border text-foreground text-sm font-semibold hover:border-primary hover:scale-105 active:scale-95 transition-all"
        >
          <BookOpen className="w-4 h-4" />
          Histoires
        </button>
        <button
          onClick={handleParentMode}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border text-muted-foreground text-sm hover:border-primary hover:scale-105 active:scale-95 transition-all"
        >
          <Settings className="w-4 h-4" />
          Parent
        </button>
      </div>

      {/* 3D Hologram Face — takes most of the screen */}
      <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0">
        <div className="relative w-80 h-80 md:w-96 md:h-96">
          <HologramFace
            voiceState={state}
            enableCamera={parentSettings?.enableCamera ?? false}
            onTripleTap={handleParentMode}
          />
        </div>

        {/* State label */}
        <p className="mt-4 text-sm font-semibold text-muted-foreground tracking-wide uppercase text-center px-4">
          {stateLabel}
        </p>

        {/* Wake word indicator */}
        {wakeWordEnabled && (
          <div className="mt-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs text-muted-foreground/60">Écoute active</span>
          </div>
        )}
      </div>

      {/* Bottom spacer */}
      <div className="pb-4" />
    </div>
  );
};

export default VoiceScreen;
