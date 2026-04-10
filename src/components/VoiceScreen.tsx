import { useState, useEffect, useRef, useCallback } from "react";
import { BookOpen, Settings, Camera, Mic, MicOff } from "lucide-react";
import { streamVoiceChat, fetchTTSAudio, useAudioQueue } from "@/lib/voicePipeline";
import { useSessionTracker } from "@/hooks/useSessionTracker";
import { useWakeWord } from "@/hooks/useWakeWord";
import { ParentSettings } from "@/components/ParentMode";
import { HologramFace } from "@/components/hologram/HologramFace";
import { setSfxVolume, initSfxEventBus } from "@/lib/sfx";
import { useChildMemory } from "@/hooks/useChildMemory";
import { useConversationRecorder } from "@/hooks/useConversationRecorder";
import { eventBus } from "@/lib/eventBus";

type VoiceState = "idle" | "listening" | "processing" | "speaking" | "interrupted" | "session_end";
type AiMsg = { role: "user" | "assistant"; content: string };

const FALLBACK_FR: Record<string, string> = {
  not_heard: "Je n'ai pas bien entendu. Tu peux répéter ?",
  thinking: "Une seconde.",
  error: "Petit souci. Réessaie !",
  reengage: "",
  session_end: "",
  welcome: "Salut ! Dis Bobby pour me parler !",
  interrupted: "Pardon. Je t'écoute.",
  wake_greeting: "Oui ? Je t'écoute.",
};

type Intent = "story" | "game" | "emotion_support" | "question" | "chat";

function detectIntent(text: string): Intent {
  const lower = text.toLowerCase();
  if (lower.match(/raconte|histoire|conte|fable|il était une fois/)) return "story";
  if (lower.match(/jou[eo]|devinette|quiz|charade|on joue/)) return "game";
  if (lower.match(/peur|triste|pleure|mal|cauchemar|monstre|effrayé|seul|malheureux|colère|énervé|fâché/)) return "emotion_support";
  if (lower.match(/pourquoi|comment|c'est quoi|qu'est-ce que|sais pas|explique/)) return "question";
  return "chat";
}

function detectEmotion(text: string): string | undefined {
  const lower = text.toLowerCase();
  if (lower.match(/triste|pleure|mal|manque|malheureux/)) return "sad";
  if (lower.match(/peur|effrayé|cauchemar|noir|monstre/)) return "scared";
  if (lower.match(/ennui|ennuie|rien à faire|boring/)) return "bored";
  if (lower.match(/content|super|génial|trop bien|cool|adore|aime|heureux|yay/)) return "happy";
  if (lower.match(/pourquoi|comment|c'est quoi|sais pas/)) return "curious";
  if (lower.match(/wow|waouh|incroyable|fou|dingue/)) return "excited";
  if (lower.match(/colère|énervé|fâché|énerve|rage|grrr/)) return "angry";
  return undefined;
}

function stripWakeWord(text: string): string {
  return text.replace(/\b(bobby|boby|bobbie|bobi)\b/gi, "").replace(/\s+/g, " ").trim();
}

function isJustWakeWord(text: string): boolean {
  const stripped = stripWakeWord(text);
  return stripped.length < 3 || /^[?,!.\s]*$/.test(stripped);
}

const recentBobbyTextsRef = { current: [] as string[] };

function normalizeForComparison(text: string): string {
  return text.toLowerCase().replace(/[^a-zàâäéèêëïîôùûüÿç0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

function isEcho(transcript: string): boolean {
  const normalized = normalizeForComparison(transcript);
  if (normalized.length < 5) return false;

  for (const bobbyText of recentBobbyTextsRef.current) {
    const bobbyNorm = normalizeForComparison(bobbyText);
    if (!bobbyNorm) continue;
    if (bobbyNorm.includes(normalized)) return true;
    if (normalized.includes(bobbyNorm) && bobbyNorm.length > 10) return true;

    const transcriptWords = normalized.split(" ");
    const bobbyWords = new Set(bobbyNorm.split(" "));
    const overlap = transcriptWords.filter((word) => bobbyWords.has(word)).length;
    if (transcriptWords.length > 3 && overlap / transcriptWords.length > 0.6) return true;
  }

  return false;
}

function useContinuousListening(onResult: (text: string) => void, enabled: boolean) {
  const recognitionRef = useRef<any>(null);
  const enabledRef = useRef(enabled);
  const isRunningRef = useRef(false);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const start = useCallback(() => {
    if (isRunningRef.current) return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "fr-FR";
    rec.maxAlternatives = 3;
    recognitionRef.current = rec;
    isRunningRef.current = true;

    rec.onresult = (event: any) => {
      let best = "";
      for (let i = 0; i < event.results.length; i++) {
        const transcript = String(event.results[i][0].transcript || "").trim();
        if (transcript.length > best.length) best = transcript;
      }

      if (best.length > 2) {
        if (isEcho(best)) return;
        onResult(best);
      }
    };

    rec.onend = () => {
      isRunningRef.current = false;
      recognitionRef.current = null;
      if (enabledRef.current) {
        setTimeout(() => start(), 200);
      }
    };

    rec.onerror = (e: any) => {
      isRunningRef.current = false;
      recognitionRef.current = null;
      if (e.error === "no-speech" && enabledRef.current) {
        setTimeout(() => start(), 200);
      }
    };

    try {
      rec.start();
    } catch {
      isRunningRef.current = false;
    }
  }, [onResult]);

  const stop = useCallback(() => {
    enabledRef.current = false;
    isRunningRef.current = false;
    try {
      recognitionRef.current?.abort();
    } catch {}
    recognitionRef.current = null;
  }, []);

  return { start, stop };
}

interface VoiceScreenProps {
  childName: string;
  childAge: number;
  onSwitchToChat: () => void;
  onSwitchToStory?: () => void;
  onParentMode: () => void;
  parentSettings?: ParentSettings;
}

const SILENCE_TIMEOUT = 40000;

const VoiceScreen = ({ childName, childAge, onSwitchToChat, onSwitchToStory, onParentMode, parentSettings }: VoiceScreenProps) => {
  const [state, setState] = useState<VoiceState>("idle");
  const [conversationHistory, setConversationHistory] = useState<AiMsg[]>([]);
  const [partialText, setPartialText] = useState("");
  const [micStatus, setMicStatus] = useState<"ready" | "blocked" | "active">("ready");

  const abortRef = useRef<AbortController | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef<VoiceState>("idle");
  const pendingSentencesRef = useRef(0);
  const allSentencesDoneRef = useRef(false);
  const sessionStartedRef = useRef(false);
  const conversationActiveRef = useRef(false);

  const audioQueue = useAudioQueue();
  const session = useSessionTracker(childName, childAge);
  const { memory, loading, saveSettings } = useChildMemory(childName);
  const recorder = useConversationRecorder();

  const wakeWordEnabled = (state === "idle" || state === "session_end") && !conversationActiveRef.current;
  const [continuousListenEnabled, setContinuousListenEnabled] = useState(false);

  useEffect(() => {
    initSfxEventBus();
  }, []);

  const prevStateRef = useRef<VoiceState>("idle");
  useEffect(() => {
    if (state === prevStateRef.current) return;
    eventBus.emit({ type: "STATE_CHANGED", state, prev: prevStateRef.current });
    prevStateRef.current = state;
  }, [state]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    setSfxVolume(parentSettings?.sfxVolume ?? 0.7);
  }, [parentSettings?.sfxVolume]);

  const clearTimers = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
  }, []);

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
  }, [audioQueue, clearTimers, session]);

  const endConversation = useCallback(async () => {
    clearTimers();
    conversationActiveRef.current = false;
    setContinuousListenEnabled(false);
    setMicStatus("ready");
    setState("session_end");

    if (sessionStartedRef.current) {
      const sessionId = await session.endSession();
      eventBus.emit({ type: "SESSION_END" });
      sessionStartedRef.current = false;

      if (sessionId) {
        recorder.stopRecording(sessionId).then(() => undefined);
        recorder.triggerAnalysis(sessionId).then(() => undefined);
      }
    }
  }, [clearTimers, recorder, session]);

  const startSilenceTimers = useCallback(() => {
    clearTimers();
    silenceTimerRef.current = setTimeout(() => {
      if (stateRef.current === "listening" || stateRef.current === "idle") {
        endConversation();
      }
    }, SILENCE_TIMEOUT);
  }, [clearTimers, endConversation]);

  const goToListening = useCallback(() => {
    setState("listening");
    setMicStatus("active");
    setTimeout(() => {
      setContinuousListenEnabled(true);
    }, 600);
    startSilenceTimers();
  }, [startSilenceTimers]);

  const speakFallback = useCallback(async (key: string) => {
    const fallbackText = FALLBACK_FR[key] || FALLBACK_FR.error;
    if (!fallbackText) {
      if (key === "session_end") {
        setState("session_end");
        setContinuousListenEnabled(false);
      }
      return;
    }

    try {
      setState("speaking");
      setContinuousListenEnabled(false);
      eventBus.emit({ type: "SPEECH_START" });
      recentBobbyTextsRef.current = [fallbackText, ...recentBobbyTextsRef.current].slice(0, 5);
      const url = await fetchTTSAudio(fallbackText);
      audioQueue.enqueue(url);
      audioQueue.setOnAllDone(() => {
        eventBus.emit({ type: "SPEECH_STOP" });
        if (key === "session_end") {
          setState("session_end");
          conversationActiveRef.current = false;
          setContinuousListenEnabled(false);
        } else {
          goToListening();
        }
      });
    } catch {
      setState("idle");
    }
  }, [audioQueue, goToListening]);

  const interrupt = useCallback(() => {
    abortRef.current?.abort();
    audioQueue.stopAll();
    clearTimers();
    setState("interrupted");
    eventBus.emit({ type: "SPEECH_STOP" });
  }, [audioQueue, clearTimers]);

  const processSentenceForTTS = useCallback(async (sentence: string, signal?: AbortSignal) => {
    pendingSentencesRef.current++;
    recentBobbyTextsRef.current = [sentence, ...recentBobbyTextsRef.current].slice(0, 8);

    try {
      const url = await fetchTTSAudio(sentence, signal);
      if (!signal?.aborted) {
        setState("speaking");
        setContinuousListenEnabled(false);
        audioQueue.enqueue(url);
      }
    } catch {
      // ignore and continue
    } finally {
      pendingSentencesRef.current--;
      if (pendingSentencesRef.current === 0 && allSentencesDoneRef.current) {
        audioQueue.setOnAllDone(() => {
          eventBus.emit({ type: "SPEECH_STOP" });
          goToListening();
        });
      }
    }
  }, [audioQueue, goToListening]);

  const getAIResponse = useCallback(async (userText: string, intent?: Intent) => {
    setState("processing");
    clearTimers();
    setContinuousListenEnabled(false);
    setPartialText("");

    const emotion = detectEmotion(userText);
    session.addMessage("user", userText, emotion);
    eventBus.emit({ type: "VOICE_INPUT", transcript: userText });
    if (emotion) eventBus.emit({ type: "EMOTION_DETECTED", emotion });

    const detectedIntent = intent || detectIntent(userText);
    let mode = "chat";
    if (detectedIntent === "story") mode = "story";
    else if (detectedIntent === "game") mode = "game";

    const trimmedHistory = conversationHistory.length > 10 ? conversationHistory.slice(-10) : conversationHistory;
    const newHistory: AiMsg[] = [...trimmedHistory, { role: "user", content: userText }];
    const abortController = new AbortController();
    abortRef.current = abortController;
    allSentencesDoneRef.current = false;
    pendingSentencesRef.current = 0;

    await streamVoiceChat({
      messages: newHistory,
      childName,
      childAge,
      mode,
      parentSettings,
      signal: abortController.signal,
      onSentence: (sentence) => {
        if (!abortController.signal.aborted) {
          processSentenceForTTS(sentence, abortController.signal);
        }
      },
      onDone: (text) => {
        allSentencesDoneRef.current = true;
        if (text) {
          setConversationHistory([...newHistory, { role: "assistant", content: text }]);
          session.addMessage("assistant", text);
          eventBus.emit({ type: "RESPONSE_READY", text });
        }
        if (pendingSentencesRef.current === 0) {
          audioQueue.setOnAllDone(() => {
            eventBus.emit({ type: "SPEECH_STOP" });
            goToListening();
          });
        }
      },
      onError: (error) => {
        console.error("AI error:", error);
        if (!abortController.signal.aborted) speakFallback("error");
      },
    });
  }, [audioQueue, childAge, childName, clearTimers, conversationHistory, goToListening, parentSettings, processSentenceForTTS, session, speakFallback]);

  const handleContinuousResult = useCallback((text: string) => {
    clearTimers();

    if (stateRef.current === "speaking" || stateRef.current === "processing") {
      interrupt();
    }

    const hasWake = /\b(bobby|boby|bobbie|bobi)\b/i.test(text);
    const cleaned = hasWake ? stripWakeWord(text) : text;

    if (cleaned.length < 3) {
      if (hasWake) speakFallback("wake_greeting");
      return;
    }

    getAIResponse(cleaned);
  }, [clearTimers, getAIResponse, interrupt, speakFallback]);

  const continuousListening = useContinuousListening(handleContinuousResult, continuousListenEnabled);

  useEffect(() => {
    if (continuousListenEnabled) {
      continuousListening.start();
    } else {
      continuousListening.stop();
    }
  }, [continuousListenEnabled, continuousListening]);

  const handleWake = useCallback((transcript: string) => {
    if (stateRef.current === "speaking" || stateRef.current === "processing") {
      interrupt();
    }

    if (!sessionStartedRef.current) {
      session.startSession();
      sessionStartedRef.current = true;
      recorder.startRecording();
      eventBus.emit({ type: "SESSION_START" });
    }

    conversationActiveRef.current = true;
    eventBus.emit({ type: "WAKE_TRIGGERED" });

    if (isJustWakeWord(transcript)) {
      speakFallback("wake_greeting");
      return;
    }

    const command = stripWakeWord(transcript);
    getAIResponse(command);
  }, [getAIResponse, interrupt, recorder, session, speakFallback]);

  const { startListening } = useWakeWord({
    enabled: wakeWordEnabled,
    onWake: handleWake,
    onPartial: setPartialText,
  });

  const handleParentMode = useCallback(() => {
    setContinuousListenEnabled(false);
    conversationActiveRef.current = false;
    if (sessionStartedRef.current) {
      session.endSession();
      eventBus.emit({ type: "SESSION_END" });
      sessionStartedRef.current = false;
    }
    onParentMode();
  }, [onParentMode, session]);

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
      <div className="w-full flex items-center justify-between px-2">
        <button
          onClick={onSwitchToStory}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border text-foreground text-sm font-semibold hover:border-primary hover:scale-105 active:scale-95 transition-all"
        >
          <BookOpen className="w-4 h-4" />
          Histoires
        </button>

        {parentSettings?.enableCamera && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary">
            <Camera className="w-3.5 h-3.5" />
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          </div>
        )}

        <button
          onClick={handleParentMode}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border text-muted-foreground text-sm hover:border-primary hover:scale-105 active:scale-95 transition-all"
        >
          <Settings className="w-4 h-4" />
          Parent
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0">
        <div
          className="relative w-80 h-80 md:w-96 md:h-96"
          onPointerDownCapture={() => {
            if (stateRef.current === "speaking" || stateRef.current === "processing") return;
            startListening({ fromUserGesture: true });

            if (stateRef.current === "idle" || stateRef.current === "session_end") {
              if (!sessionStartedRef.current) {
                session.startSession();
                sessionStartedRef.current = true;
                recorder.startRecording();
                eventBus.emit({ type: "SESSION_START" });
              }
              conversationActiveRef.current = true;
              eventBus.emit({ type: "WAKE_TRIGGERED" });
              eventBus.emit({ type: "WAKE_DETECTED", confidence: 1.0 });
              speakFallback("wake_greeting");
            }
          }}
        >
          <HologramFace
            voiceState={state}
            enableCamera={parentSettings?.enableCamera ?? false}
            onTripleTap={handleParentMode}
          />
        </div>

        <p className="mt-4 text-sm font-semibold text-muted-foreground tracking-wide uppercase text-center px-4">
          {stateLabel}
        </p>

        <div className="mt-2 flex flex-col items-center gap-1.5">
          {state === "listening" ? (
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-xs text-primary font-medium">Écoute active</span>
            </div>
          ) : wakeWordEnabled ? (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs text-muted-foreground/60">En attente de "Bobby"</span>
            </div>
          ) : null}

          {wakeWordEnabled && (
            <span className="text-[11px] text-muted-foreground/50 text-center">
              Touche Bobby si le micro ne s'active pas
            </span>
          )}
        </div>
      </div>

      <div className="pb-4" />
    </div>
  );
};

export default VoiceScreen;
