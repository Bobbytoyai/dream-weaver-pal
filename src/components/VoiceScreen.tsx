import { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, MessageSquare } from "lucide-react";
import { streamVoiceChat, fetchTTSAudio, useAudioQueue } from "@/lib/voicePipeline";
import { useSessionTracker } from "@/hooks/useSessionTracker";
import { ParentSettings } from "@/components/ParentMode";
import { HologramFace } from "@/components/hologram/HologramFace";

type VoiceState = "idle" | "listening" | "processing" | "speaking" | "interrupted" | "session_end";
type AiMsg = { role: "user" | "assistant"; content: string };

const FALLBACK_FR: Record<string, string> = {
  not_heard: "Hmm… j'ai pas bien entendu… tu peux répéter ?",
  thinking: "hmm… attends…",
  error: "Oh… un petit souci… réessaie !",
  reengage: "Tu es encore là ?",
  session_end: "Je suis là quand tu veux revenir",
  welcome: "Salut ! Appuie sur le micro pour me parler !",
  interrupted: "Ah oui, pardon ! Dis-moi",
};

// Simple emotion detection from text
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

interface VoiceScreenProps {
  childName: string;
  childAge: number;
  onSwitchToChat: () => void;
  onParentMode: () => void;
  parentSettings?: ParentSettings;
}

const VoiceScreen = ({ childName, childAge, onSwitchToChat, onParentMode, parentSettings }: VoiceScreenProps) => {
  const [state, setState] = useState<VoiceState>("idle");
  const [conversationHistory, setConversationHistory] = useState<AiMsg[]>([]);

  const recognitionRef = useRef<any>(null);
  const abortRef = useRef<AbortController | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reengageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef<VoiceState>("idle");
  const pendingSentencesRef = useRef(0);
  const allSentencesDoneRef = useRef(false);
  const sessionStartedRef = useRef(false);



  const audioQueue = useAudioQueue();
  const session = useSessionTracker(childName, childAge);

  useEffect(() => { stateRef.current = state; }, [state]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort?.();
      recognitionRef.current?.stop?.();
      abortRef.current?.abort();
      audioQueue.stopAll();
      clearTimers();
      if (sessionStartedRef.current) {
        session.endSession();
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
      if (stateRef.current === "idle") {
        speakFallback("reengage");
      }
    }, 8000);
    silenceTimerRef.current = setTimeout(() => {
      if (stateRef.current === "idle" || stateRef.current === "speaking") {
        setState("session_end");
        speakFallback("session_end");
        session.endSession();
        sessionStartedRef.current = false;
      }
    }, 40000);
  }, []);

  const speakFallback = useCallback(async (key: string) => {
    try {
      setState("speaking");
      const url = await fetchTTSAudio(FALLBACK_FR[key] || FALLBACK_FR.error);
      audioQueue.enqueue(url);
      audioQueue.setOnAllDone(() => {
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
    recognitionRef.current?.stop?.();
    clearTimers();
    setState("interrupted");
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
          setState("idle");
          startSilenceTimers();
        });
      }
    }
  }, [audioQueue, startSilenceTimers]);

  const getAIResponse = useCallback(async (userText: string) => {
    setState("processing");
    clearTimers();

    // Detect emotion and track
    const emotion = detectEmotion(userText);
    session.addMessage("user", userText, emotion);

    const newHistory: AiMsg[] = [...conversationHistory, { role: "user", content: userText }];
    const abortController = new AbortController();
    abortRef.current = abortController;
    allSentencesDoneRef.current = false;
    pendingSentencesRef.current = 0;

    // Filler for latency masking
    fetchTTSAudio("hmm…", abortController.signal).then(url => {
      if (!abortController.signal.aborted && stateRef.current === "processing") {
        setState("speaking");
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
        }
        if (pendingSentencesRef.current === 0) {
          audioQueue.setOnAllDone(() => {
            setState("idle");
            startSilenceTimers();
          });
        }
      },
      onError: (error) => {
        console.error("AI error:", error);
        if (!abortController.signal.aborted) {
          speakFallback("error");
        }
      },
    });
  }, [conversationHistory, childName, childAge, audioQueue, clearTimers, processSentenceForTTS, speakFallback, startSilenceTimers, session]);

  const startListening = useCallback(() => {
    if (stateRef.current === "speaking" || stateRef.current === "processing") {
      interrupt();
    }
    clearTimers();

    // Start session on first listen
    if (!sessionStartedRef.current) {
      session.startSession();
      sessionStartedRef.current = true;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      speakFallback("error");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "fr-FR";
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;
    setState("listening");

    recognition.onresult = (event: any) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) {
        getAIResponse(transcript);
      } else {
        speakFallback("not_heard");
      }
    };

    recognition.onend = () => {
      if (stateRef.current === "listening") {
        speakFallback("not_heard");
      }
    };

    recognition.onerror = (event: any) => {
      console.error("STT error:", event.error);
      if (event.error === "no-speech") {
        setState("idle");
        startSilenceTimers();
      } else if (event.error !== "aborted") {
        speakFallback("not_heard");
      }
    };

    recognition.start();
  }, [interrupt, clearTimers, getAIResponse, speakFallback, startSilenceTimers, session]);

  const handleMicPress = useCallback(() => {
    if (state === "session_end") setState("idle");
    if (state === "listening") {
      recognitionRef.current?.stop();
      return;
    }
    startListening();
  }, [state, startListening]);

  // Parent mode handler (moved from triple-tap on avatar to HologramFace)
  const handleParentMode = useCallback(() => {
    if (sessionStartedRef.current) {
      session.endSession();
      sessionStartedRef.current = false;
    }
    onParentMode();
  }, [onParentMode, session]);

  const avatarAnimation = {
    idle: "", listening: "voice-listening", processing: "voice-thinking",
    speaking: "voice-talking", interrupted: "", session_end: "",
  }[state];

  const borderColor = {
    idle: "border-border", listening: "border-primary", processing: "border-muted-foreground",
    speaking: "border-secondary", interrupted: "border-primary", session_end: "border-border opacity-60",
  }[state];

  return (
    <div className="flex flex-col items-center justify-between h-screen bg-background px-6 py-8 max-w-lg mx-auto select-none">
      {/* Header */}
      <div className="flex items-center justify-end w-full">
        <button
          onClick={onSwitchToChat}
          className="w-10 h-10 rounded-full bg-card border-2 border-border text-muted-foreground flex items-center justify-center hover:border-primary hover:text-primary transition-all"
          aria-label="Mode texte"
        >
          <MessageSquare className="w-4 h-4" />
        </button>
      </div>

      {/* 3D Hologram Face */}
      <div className="flex-1 flex flex-col items-center justify-center w-full">
        <div className="relative w-72 h-72 md:w-80 md:h-80">
          <HologramFace
            voiceState={state}
            enableCamera={false}
            onTripleTap={handleParentMode}
          />
        </div>
      </div>

      {/* Mic Button */}
      <div className="pb-10">
        <button
          onClick={handleMicPress}
          disabled={state === "processing"}
          className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl active:scale-90 disabled:opacity-40 ${
            state === "listening"
              ? "bg-destructive text-destructive-foreground scale-110 shadow-destructive/30"
              : state === "session_end"
              ? "bg-muted text-muted-foreground"
              : "bg-primary text-primary-foreground hover:scale-110 shadow-primary/30"
          }`}
          aria-label={state === "listening" ? "Arrêter l'écoute" : "Parler"}
        >
          {state === "listening" ? (
            <MicOff className="w-10 h-10" />
          ) : (
            <Mic className="w-10 h-10" />
          )}
        </button>
      </div>
    </div>
  );
};

export default VoiceScreen;
