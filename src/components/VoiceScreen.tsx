import { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, MessageSquare, Volume2 } from "lucide-react";
import { toast } from "sonner";
import companionAvatar from "@/assets/companion-avatar.png";
import type { ChatMode } from "./ModeSelector";

type VoiceState = "idle" | "listening" | "thinking" | "talking";
type AiMsg = { role: "user" | "assistant"; content: string };

interface VoiceScreenProps {
  childName: string;
  childAge: number;
  onSwitchToChat: () => void;
}

const VOICE_CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-chat`;
const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tts`;

const VoiceScreen = ({ childName, childAge, onSwitchToChat }: VoiceScreenProps) => {
  const [state, setState] = useState<VoiceState>("idle");
  const [subtitle, setSubtitle] = useState(`Hey ${childName}! Tap the mic to talk to me!`);
  const [conversationHistory, setConversationHistory] = useState<AiMsg[]>([]);
  const [mode] = useState<ChatMode>("chat");

  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reengageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort?.();
      recognitionRef.current?.stop?.();
      audioRef.current?.pause();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (reengageTimerRef.current) clearTimeout(reengageTimerRef.current);
    };
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
  }, []);

  const speakText = useCallback(async (text: string) => {
    setState("talking");
    setSubtitle(text);

    try {
      const response = await fetch(TTS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error("TTS failed");

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setState("idle");
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
        startReengageTimer();
      };

      await audio.play();
    } catch (e) {
      console.error("TTS error:", e);
      setState("idle");
      // Fallback: just show the text
    }
  }, []);

  const getAIResponse = useCallback(async (userText: string) => {
    setState("thinking");
    setSubtitle("Hmm… let me think…");

    const newHistory: AiMsg[] = [...conversationHistory, { role: "user", content: userText }];

    try {
      const response = await fetch(VOICE_CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: newHistory,
          childName,
          childAge,
          mode,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "AI error");
      }

      const data = await response.json();
      const aiText = data.content;

      setConversationHistory([...newHistory, { role: "assistant", content: aiText }]);
      await speakText(aiText);
    } catch (e: any) {
      console.error("AI error:", e);
      setState("idle");
      toast.error(e.message || "Something went wrong");
      setSubtitle("Oops… something went wrong. Try again?");
    }
  }, [conversationHistory, childName, childAge, mode, speakText]);

  const startReengageTimer = useCallback(() => {
    if (reengageTimerRef.current) clearTimeout(reengageTimerRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

    reengageTimerRef.current = setTimeout(() => {
      setSubtitle("Hey… still there?");
    }, 10000);

    silenceTimerRef.current = setTimeout(() => {
      setSubtitle("Hmm… I think you're busy… I'll be right here when you come back!");
    }, 40000);
  }, []);

  const startListening = useCallback(() => {
    // Interrupt if talking
    stopAudio();
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (reengageTimerRef.current) clearTimeout(reengageTimerRef.current);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognitionRef.current = recognition;
    setState("listening");
    setSubtitle("I'm listening…");

    let finalTranscript = "";

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      if (interim) setSubtitle(interim);
    };

    recognition.onend = () => {
      if (finalTranscript.trim()) {
        setSubtitle(`"${finalTranscript.trim()}"`);
        getAIResponse(finalTranscript.trim());
      } else {
        setState("idle");
        setSubtitle("I didn't catch that… can you say it again?");
        startReengageTimer();
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setState("idle");
      if (event.error === "not-allowed") {
        setSubtitle("I need microphone access to hear you! Please allow it.");
      } else {
        setSubtitle("I didn't catch that… try again?");
      }
    };

    recognition.start();
  }, [stopAudio, getAIResponse, startReengageTimer]);

  const handleMicClick = useCallback(() => {
    if (state === "listening") {
      recognitionRef.current?.stop();
      return;
    }
    if (state === "talking") {
      stopAudio();
      startListening();
      return;
    }
    startListening();
  }, [state, stopAudio, startListening]);

  const stateLabel = {
    idle: "Tap to talk",
    listening: "Listening…",
    thinking: "Thinking…",
    talking: "Speaking…",
  };

  return (
    <div className="flex flex-col items-center justify-between h-screen bg-background px-6 py-8 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between w-full">
        <h2 className="text-xl font-extrabold text-foreground">Buddy</h2>
        <button
          onClick={onSwitchToChat}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border-2 border-border text-muted-foreground font-bold text-sm hover:border-primary hover:text-primary transition-all"
        >
          <MessageSquare className="w-4 h-4" />
          Chat
        </button>
      </div>

      {/* Animated Character */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <div className="relative">
          {/* Pulse rings for listening */}
          {state === "listening" && (
            <>
              <div className="absolute inset-0 rounded-full bg-primary/20 voice-pulse-ring" />
              <div className="absolute inset-0 rounded-full bg-primary/15 voice-pulse-ring" style={{ animationDelay: "0.5s" }} />
            </>
          )}

          {/* Avatar */}
          <div
            className={`relative w-48 h-48 rounded-full bg-card flex items-center justify-center overflow-hidden border-4 transition-all duration-300 ${
              state === "listening"
                ? "border-primary voice-listening"
                : state === "talking"
                ? "border-secondary voice-talking"
                : state === "thinking"
                ? "border-muted voice-thinking"
                : "border-border"
            }`}
          >
            <img
              src={companionAvatar}
              alt="Buddy"
              width={160}
              height={160}
              className={`transition-transform duration-300 ${
                state === "talking" ? "scale-110" : state === "thinking" ? "scale-95" : ""
              }`}
            />
          </div>

          {/* State indicator */}
          {state === "talking" && (
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              <Volume2 className="w-5 h-5 text-secondary animate-pulse" />
            </div>
          )}
        </div>

        {/* Subtitle */}
        <p className="text-center text-lg font-semibold text-foreground max-w-xs leading-relaxed min-h-[3.5rem]">
          {subtitle}
        </p>

        <p className="text-sm font-bold text-muted-foreground">{stateLabel[state]}</p>
      </div>

      {/* Mic Button */}
      <div className="pb-8">
        <button
          onClick={handleMicClick}
          disabled={state === "thinking"}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg active:scale-90 disabled:opacity-50 ${
            state === "listening"
              ? "bg-destructive text-destructive-foreground scale-110"
              : "bg-primary text-primary-foreground hover:scale-110"
          }`}
        >
          {state === "listening" ? (
            <MicOff className="w-8 h-8" />
          ) : (
            <Mic className="w-8 h-8" />
          )}
        </button>
      </div>
    </div>
  );
};

export default VoiceScreen;
