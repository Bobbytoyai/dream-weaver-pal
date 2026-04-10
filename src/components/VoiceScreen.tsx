import { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, MessageSquare } from "lucide-react";
import { streamVoiceChat, fetchTTSAudio, useAudioQueue } from "@/lib/voicePipeline";
import companionAvatar from "@/assets/companion-avatar.png";

type VoiceState = "idle" | "listening" | "processing" | "speaking" | "interrupted" | "session_end";
type AiMsg = { role: "user" | "assistant"; content: string };

// Fallback spoken messages for errors
const FALLBACK_FR: Record<string, string> = {
  not_heard: "Hmm… j'ai pas bien entendu… tu peux répéter ?",
  thinking: "hmm… attends…",
  error: "Oh… un petit souci… réessaie !",
  reengage: "Tu es encore là ?",
  session_end: "Je suis là quand tu veux revenir",
  welcome: "Salut ! Appuie sur le micro pour me parler !",
  interrupted: "Ah oui, pardon ! Dis-moi",
};

interface VoiceScreenProps {
  childName: string;
  childAge: number;
  onSwitchToChat: () => void;
}

const VoiceScreen = ({ childName, childAge, onSwitchToChat }: VoiceScreenProps) => {
  const [state, setState] = useState<VoiceState>("idle");
  const [conversationHistory, setConversationHistory] = useState<AiMsg[]>([]);

  const recognitionRef = useRef<any>(null);
  const abortRef = useRef<AbortController | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reengageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef<VoiceState>("idle");
  const pendingSentencesRef = useRef(0);
  const allSentencesDoneRef = useRef(false);

  const audioQueue = useAudioQueue();

  // Keep stateRef in sync
  useEffect(() => { stateRef.current = state; }, [state]);

  // Cleanup
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort?.();
      recognitionRef.current?.stop?.();
      abortRef.current?.abort();
      audioQueue.stopAll();
      clearTimers();
    };
  }, []);

  const clearTimers = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (reengageTimerRef.current) clearTimeout(reengageTimerRef.current);
  }, []);

  const startSilenceTimers = useCallback(() => {
    clearTimers();
    // 8 seconds → soft re-engage
    reengageTimerRef.current = setTimeout(() => {
      if (stateRef.current === "idle") {
        speakFallback("reengage");
      }
    }, 8000);
    // 40 seconds → session end
    silenceTimerRef.current = setTimeout(() => {
      if (stateRef.current === "idle" || stateRef.current === "speaking") {
        setState("session_end");
        speakFallback("session_end");
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
    // Stop everything immediately
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
      // TTS failed for this sentence, continue
    } finally {
      pendingSentencesRef.current--;
      // If all sentences done and stream is done, mark complete
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

    const newHistory: AiMsg[] = [...conversationHistory, { role: "user", content: userText }];
    const abortController = new AbortController();
    abortRef.current = abortController;
    allSentencesDoneRef.current = false;
    pendingSentencesRef.current = 0;

    let fullResponse = "";

    // Send a "thinking" filler TTS immediately for latency masking
    const fillerPromise = fetchTTSAudio("hmm…", abortController.signal).then(url => {
      if (!abortController.signal.aborted && stateRef.current === "processing") {
        setState("speaking");
        audioQueue.enqueue(url);
      }
    }).catch(() => {});

    await streamVoiceChat({
      messages: newHistory,
      childName,
      childAge,
      mode: "chat",
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
        }
        // If no pending TTS, go idle
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
  }, [conversationHistory, childName, childAge, audioQueue, clearTimers, processSentenceForTTS, speakFallback, startSilenceTimers]);

  const startListening = useCallback(() => {
    // If currently speaking or processing, interrupt first
    if (stateRef.current === "speaking" || stateRef.current === "processing") {
      interrupt();
    }

    clearTimers();

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
        // No result received
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
  }, [interrupt, clearTimers, getAIResponse, speakFallback, startSilenceTimers]);

  const handleMicPress = useCallback(() => {
    if (state === "session_end") {
      setState("idle");
    }
    if (state === "listening") {
      recognitionRef.current?.stop();
      return;
    }
    startListening();
  }, [state, startListening]);

  // Avatar animation class based on state
  const avatarAnimation = {
    idle: "",
    listening: "voice-listening",
    processing: "voice-thinking",
    speaking: "voice-talking",
    interrupted: "",
    session_end: "",
  }[state];

  const borderColor = {
    idle: "border-border",
    listening: "border-primary",
    processing: "border-muted-foreground",
    speaking: "border-secondary",
    interrupted: "border-primary",
    session_end: "border-border opacity-60",
  }[state];

  return (
    <div className="flex flex-col items-center justify-between h-screen bg-background px-6 py-8 max-w-lg mx-auto select-none">
      {/* Minimal header - no text */}
      <div className="flex items-center justify-end w-full">
        <button
          onClick={onSwitchToChat}
          className="w-10 h-10 rounded-full bg-card border-2 border-border text-muted-foreground flex items-center justify-center hover:border-primary hover:text-primary transition-all"
          aria-label="Mode texte"
        >
          <MessageSquare className="w-4 h-4" />
        </button>
      </div>

      {/* Animated Character - the main visual focus */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="relative">
          {/* Pulse rings for listening */}
          {state === "listening" && (
            <>
              <div className="absolute inset-[-16px] rounded-full bg-primary/20 voice-pulse-ring" />
              <div className="absolute inset-[-16px] rounded-full bg-primary/10 voice-pulse-ring" style={{ animationDelay: "0.5s" }} />
              <div className="absolute inset-[-16px] rounded-full bg-primary/5 voice-pulse-ring" style={{ animationDelay: "1s" }} />
            </>
          )}

          {/* Processing rings */}
          {state === "processing" && (
            <div className="absolute inset-[-8px] rounded-full border-4 border-muted-foreground/30 border-t-muted-foreground animate-spin" />
          )}

          {/* Speaking wave effect */}
          {state === "speaking" && (
            <>
              <div className="absolute inset-[-12px] rounded-full bg-secondary/15 voice-pulse-ring" style={{ animationDuration: "2s" }} />
            </>
          )}

          {/* Avatar */}
          <div
            className={`relative w-56 h-56 rounded-full bg-card flex items-center justify-center overflow-hidden border-4 transition-all duration-300 ${borderColor} ${avatarAnimation}`}
          >
            <img
              src={companionAvatar}
              alt="Buddy"
              width={200}
              height={200}
              className={`transition-transform duration-300 ${
                state === "speaking" ? "scale-110" : 
                state === "processing" ? "scale-95 opacity-80" : 
                state === "session_end" ? "scale-90 opacity-50" : ""
              }`}
            />
          </div>
        </div>

        {/* Subtle state indicator dots - no text */}
        <div className="flex gap-2 mt-8">
          {state === "listening" && (
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-primary animate-pulse" />
              <span className="w-3 h-3 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0.3s" }} />
              <span className="w-3 h-3 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0.6s" }} />
            </div>
          )}
          {state === "processing" && (
            <div className="flex gap-1.5">
              <span className="w-2 h-2 rounded-full bg-muted-foreground typing-dot" />
              <span className="w-2 h-2 rounded-full bg-muted-foreground typing-dot" style={{ animationDelay: "0.2s" }} />
              <span className="w-2 h-2 rounded-full bg-muted-foreground typing-dot" style={{ animationDelay: "0.4s" }} />
            </div>
          )}
          {state === "speaking" && (
            <div className="flex gap-1 items-end">
              {[1, 2, 3, 4, 5].map((i) => (
                <span
                  key={i}
                  className="w-1.5 rounded-full bg-secondary animate-pulse"
                  style={{
                    height: `${8 + Math.random() * 16}px`,
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: "0.5s",
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mic Button - large, prominent, the only interaction */}
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
