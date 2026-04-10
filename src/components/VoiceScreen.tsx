/* v3 — SmartSTT + Wake Word Engine */
import { useState, useEffect, useRef, useCallback } from "react";
import { BookOpen, Settings, Camera, Mic, MicOff } from "lucide-react";
import { streamVoiceChat, fetchTTSAudio, useAudioQueue, preloadVoiceProfile, detectEmotionForTTS } from "@/lib/voicePipeline";
import type { Emotion } from "@/lib/voicePipeline";
import { useSessionTracker } from "@/hooks/useSessionTracker";
import { useSmartSTT } from "@/hooks/useSmartSTT";
import { ParentSettings } from "@/components/parentSettings";
import { HologramFace } from "@/components/hologram/HologramFace";
import { setSfxVolume, initSfxEventBus } from "@/lib/sfx";
import { useChildMemory } from "@/hooks/useChildMemory";
import { useConversationRecorder } from "@/hooks/useConversationRecorder";
import { eventBus } from "@/lib/eventBus";
import { getCachedResponse, isSimpleGreeting } from "@/lib/responseCache";
import { hasWakeWord, stripWakeWord, isJustWakeWord, computeWakeConfidence } from "@/lib/wakeWordEngine";

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
// Wake word functions imported from @/lib/wakeWordEngine

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

interface VoiceScreenProps {
  childName: string;
  childAge: number;
  onSwitchToChat: () => void;
  onSwitchToStory?: () => void;
  onParentMode: () => void;
  parentSettings?: ParentSettings;
}

const SILENCE_TIMEOUT = 40000;

/* ── Sound Wave Visualizer ── */
const SoundWave = ({ active }: { active: boolean }) => {
  const bars = 5;
  return (
    <div className="flex items-center gap-[3px] h-5">
      {Array.from({ length: bars }, (_, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full transition-all duration-150"
          style={{
            backgroundColor: "hsl(var(--primary))",
            height: active ? `${8 + Math.sin(Date.now() / 200 + i * 1.2) * 6 + Math.random() * 4}px` : "4px",
            opacity: active ? 0.9 : 0.3,
            animation: active ? `soundbar-${i} 0.4s ease-in-out infinite alternate` : "none",
          }}
        />
      ))}
      <style>{`
        ${Array.from({ length: bars }, (_, i) => `
          @keyframes soundbar-${i} {
            0% { height: ${4 + i * 2}px; }
            100% { height: ${12 + ((i + 2) % bars) * 3}px; }
          }
        `).join("")}
      `}</style>
    </div>
  );
};

/* ── Floating Particles Component ── */
const FloatingParticles = () => {
  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    size: 4 + Math.random() * 8,
    left: Math.random() * 100,
    delay: Math.random() * 8,
    duration: 10 + Math.random() * 15,
    color: [
      "hsla(215, 85%, 58%, 0.25)",
      "hsla(270, 55%, 62%, 0.2)",
      "hsla(320, 55%, 65%, 0.18)",
      "hsla(180, 60%, 55%, 0.2)",
      "hsla(45, 80%, 65%, 0.15)",
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

const VoiceScreen = ({ childName, childAge, onSwitchToChat, onSwitchToStory, onParentMode, parentSettings }: VoiceScreenProps) => {
  const currentVoiceId = parentSettings?.voiceType || "female";
  const currentVoiceSpeed = parentSettings?.voiceSpeed || "normal";
  const isCalmMode = parentSettings?.nightMode?.active || parentSettings?.personality === "calm";
  const [state, setState] = useState<VoiceState>("idle");
  const [conversationHistory, setConversationHistory] = useState<AiMsg[]>([]);
  const [partialText, setPartialText] = useState("");
  const [micArmed, setMicArmed] = useState(false);
  const currentEmotionRef = useRef<Emotion | undefined>(undefined);

  useEffect(() => {
    preloadVoiceProfile(currentVoiceId as any);
  }, [currentVoiceId]);

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

  useEffect(() => { initSfxEventBus(); }, []);

  const prevStateRef = useRef<VoiceState>("idle");
  useEffect(() => {
    if (state === prevStateRef.current) return;
    eventBus.emit({ type: "STATE_CHANGED", state, prev: prevStateRef.current });
    prevStateRef.current = state;
  }, [state]);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { setSfxVolume(parentSettings?.sfxVolume ?? 0.7); }, [parentSettings?.sfxVolume]);

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
    setState("idle");

    if (sessionStartedRef.current) {
      const messageCount = session.messageCountRef?.current ?? 0;
      const sessionId = await session.endSession();
      eventBus.emit({ type: "SESSION_END" });
      sessionStartedRef.current = false;

      if (sessionId) {
        recorder.stopRecording(sessionId).then(() => undefined);
        if (messageCount > 0) {
          recorder.triggerAnalysis(sessionId).then(() => undefined);
        }
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
    setPartialText("");
    startSilenceTimers();
  }, [startSilenceTimers]);

  const speakFallback = useCallback(async (key: string) => {
    const fallbackText = FALLBACK_FR[key] || FALLBACK_FR.error;
    if (!fallbackText) {
      if (key === "session_end") {
        setState("idle");
        conversationActiveRef.current = false;
      }
      return;
    }

    try {
      setState("speaking");
      eventBus.emit({ type: "SPEECH_START" });
      recentBobbyTextsRef.current = [fallbackText, ...recentBobbyTextsRef.current].slice(0, 5);
      const url = await fetchTTSAudio(fallbackText, undefined, currentVoiceId, undefined, currentVoiceSpeed, isCalmMode);
      audioQueue.enqueue(url);
      audioQueue.setOnAllDone(() => {
        eventBus.emit({ type: "SPEECH_STOP" });
        if (key === "session_end") {
          setState("idle");
          conversationActiveRef.current = false;
        } else {
          goToListening();
        }
      });
    } catch {
      setState("idle");
    }
  }, [audioQueue, goToListening, currentVoiceId, currentVoiceSpeed, isCalmMode]);

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
    const responseEmotion = detectEmotionForTTS(sentence) || currentEmotionRef.current;

    try {
      const url = await fetchTTSAudio(sentence, signal, currentVoiceId, responseEmotion, currentVoiceSpeed, isCalmMode);
      if (!signal?.aborted) {
        setState("speaking");
        audioQueue.enqueue(url);
      }
    } catch {
      // ignore
    } finally {
      pendingSentencesRef.current--;
      if (pendingSentencesRef.current === 0 && allSentencesDoneRef.current) {
        audioQueue.setOnAllDone(() => {
          eventBus.emit({ type: "SPEECH_STOP" });
          goToListening();
        });
      }
    }
  }, [audioQueue, currentVoiceId, currentVoiceSpeed, isCalmMode, goToListening]);

  const getAIResponse = useCallback(async (userText: string, intent?: Intent) => {
    setState("processing");
    clearTimers();
    setPartialText("");

    const emotion = detectEmotion(userText);
    currentEmotionRef.current = (emotion as Emotion) || detectEmotionForTTS(userText);
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

    const memoryParts: string[] = [];
    if (memory) {
      if (memory.favoriteThemes.length > 0) memoryParts.push(`Thèmes favoris: ${memory.favoriteThemes.join(", ")}`);
      if (memory.totalStoriesHeard > 0) memoryParts.push(`Histoires écoutées: ${memory.totalStoriesHeard}`);
      const prefs = memory.preferences as Record<string, unknown>;
      if (prefs && Object.keys(prefs).length > 0) {
        const prefStr = Object.entries(prefs).map(([k, v]) => `${k}: ${v}`).join(", ");
        memoryParts.push(`Préférences: ${prefStr}`);
      }
    }
    const memoryContext = memoryParts.length > 0 ? memoryParts.join("\n") : undefined;

    const recoveryTimer = setTimeout(() => {
      if (stateRef.current === "processing") {
        console.warn("[VoiceScreen] AI response timeout — recovering");
        abortController.abort();
        speakFallback("error");
      }
    }, 6000);

    try {
      await streamVoiceChat({
        messages: newHistory,
        childName,
        childAge,
        mode,
        parentSettings,
        memoryContext,
        signal: abortController.signal,
        onSentence: (sentence) => {
          clearTimeout(recoveryTimer);
          if (!abortController.signal.aborted) {
            eventBus.emit({ type: "SPEECH_START" });
            processSentenceForTTS(sentence, abortController.signal);
          }
        },
        onDone: (text) => {
          clearTimeout(recoveryTimer);
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
          if (!text || text.trim().length === 0) {
            goToListening();
          }
        },
        onError: (error) => {
          clearTimeout(recoveryTimer);
          console.error("AI error:", error);
          if (!abortController.signal.aborted) speakFallback("error");
        },
      });
    } catch (e) {
      clearTimeout(recoveryTimer);
      console.error("AI call exception:", e);
      if (!abortController.signal.aborted) speakFallback("error");
    }
  }, [audioQueue, childAge, childName, clearTimers, conversationHistory, goToListening, memory, parentSettings, processSentenceForTTS, session, speakFallback]);

  // ─── Unified Deepgram handler — wake word + conversation ───

  const handleTranscript = useCallback((text: string) => {
    const trimmed = text.trim();
    if (trimmed.length < 2) return;
    console.log("[VoiceScreen] Transcript:", trimmed, "state:", stateRef.current);

    // Skip echoes (Bobby hearing himself)
    if (isEcho(trimmed)) {
      console.log("[VoiceScreen] Echo — ignoring");
      return;
    }

    const wake = hasWakeWord(trimmed);

    // ─── IDLE / SESSION_END: wake word mode ───
    if (stateRef.current === "idle" || stateRef.current === "session_end") {
      if (!wake) {
        // No wake word → show partial but ignore
        return;
      }

      // Wake word detected!
      console.log("[VoiceScreen] 🎤 Wake word detected!");
      eventBus.emit({ type: "WAKE_DETECTED", confidence: 0.9 });

      if (!sessionStartedRef.current) {
        session.startSession();
        sessionStartedRef.current = true;
        recorder.startRecording();
        eventBus.emit({ type: "SESSION_START" });
      }
      conversationActiveRef.current = true;
      eventBus.emit({ type: "WAKE_TRIGGERED" });

      // Just wake word alone → greet
      if (isJustWakeWord(trimmed)) {
        speakFallback("wake_greeting");
        return;
      }

      // Wake word + message → respond directly
      const command = stripWakeWord(trimmed);
      console.log("[VoiceScreen] Command after wake:", command);

      if (isSimpleGreeting(command)) {
        const cached = getCachedResponse("greeting");
        setState("speaking");
        eventBus.emit({ type: "SPEECH_START" });
        recentBobbyTextsRef.current = [cached, ...recentBobbyTextsRef.current].slice(0, 8);
        fetchTTSAudio(cached, undefined, currentVoiceId, undefined, currentVoiceSpeed, isCalmMode).then(url => {
          audioQueue.enqueue(url);
          audioQueue.setOnAllDone(() => {
            eventBus.emit({ type: "SPEECH_STOP" });
            goToListening();
          });
        }).catch(() => goToListening());
        setConversationHistory(prev => [...prev, { role: "user", content: command }, { role: "assistant", content: cached }]);
        session.addMessage("user", command);
        session.addMessage("assistant", cached);
        return;
      }

      getAIResponse(command);
      return;
    }

    // ─── SPEAKING / PROCESSING: user interrupts ───
    if (stateRef.current === "speaking" || stateRef.current === "processing") {
      interrupt();
      // Fall through to handle as conversation input
    }

    // ─── LISTENING / INTERRUPTED: conversation mode ───
    clearTimers();
    const cleaned = wake ? stripWakeWord(trimmed) : trimmed;

    if (cleaned.length < 3) {
      if (wake) speakFallback("wake_greeting");
      else startSilenceTimers();
      return;
    }

    if (isSimpleGreeting(cleaned)) {
      const cached = getCachedResponse("greeting");
      setState("speaking");
      eventBus.emit({ type: "SPEECH_START" });
      recentBobbyTextsRef.current = [cached, ...recentBobbyTextsRef.current].slice(0, 8);
      fetchTTSAudio(cached, undefined, currentVoiceId, undefined, currentVoiceSpeed, isCalmMode).then(url => {
        audioQueue.enqueue(url);
        audioQueue.setOnAllDone(() => {
          eventBus.emit({ type: "SPEECH_STOP" });
          goToListening();
        });
      }).catch(() => goToListening());
      setConversationHistory(prev => [...prev, { role: "user", content: cleaned }, { role: "assistant", content: cached }]);
      session.addMessage("user", cleaned);
      session.addMessage("assistant", cached);
      return;
    }

    getAIResponse(cleaned);
  }, [audioQueue, clearTimers, currentVoiceId, currentVoiceSpeed, getAIResponse, goToListening, interrupt, isCalmMode, recorder, session, speakFallback, startSilenceTimers]);

  // ─── Smart STT with Deepgram → Native fallback ───
  // Wake word detection on PARTIALS for instant reaction (<200ms)
  const wakeTriggeredFromPartialRef = useRef(false);

  const deepgramSTT = useSmartSTT({
    onPartial: useCallback((text: string) => {
      setPartialText(text);

      // Detect wake word on partial transcripts when idle — instant reaction!
      if (
        (stateRef.current === "idle" || stateRef.current === "session_end") &&
        !wakeTriggeredFromPartialRef.current &&
        hasWakeWord(text, true) // true = partial mode, slightly higher threshold
      ) {
        console.log("[VoiceScreen] ⚡ Wake word on PARTIAL — instant activation!");
        wakeTriggeredFromPartialRef.current = true;
        // Don't process yet — wait for final transcript to get full sentence
        // But start visual feedback immediately
        eventBus.emit({ type: "WAKE_DETECTED", confidence: computeWakeConfidence(text) });

        if (!sessionStartedRef.current) {
          session.startSession();
          sessionStartedRef.current = true;
          recorder.startRecording();
          eventBus.emit({ type: "SESSION_START" });
        }
        conversationActiveRef.current = true;
        eventBus.emit({ type: "WAKE_TRIGGERED" });
      }
    }, [session, recorder]),
    onFinal: useCallback((text: string) => {
      wakeTriggeredFromPartialRef.current = false; // reset for next utterance
      if (text.trim().length > 2) {
        setPartialText("");
        handleTranscript(text.trim());
      }
    }, [handleTranscript]),
    onError: useCallback((err: string) => {
      console.warn("[STT] Error:", err);
    }, []),
    language: "fr",
  });

  // Start/stop STT — keep running during speaking for interruption detection
  const shouldListen = micArmed;
  const shouldListenRef = useRef(shouldListen);
  shouldListenRef.current = shouldListen;

  useEffect(() => {
    if (shouldListen) {
      deepgramSTT.start();
    } else {
      deepgramSTT.stop();
    }
  }, [shouldListen, deepgramSTT]);

  // ─── Tap to arm microphone (browser policy) ───
  const armMic = useCallback(() => {
    if (micArmed) return;
    console.log("[VoiceScreen] 🎙️ Mic armed by user gesture");
    setMicArmed(true);
  }, [micArmed]);

  const handleTapBobby = useCallback(() => {
    if (stateRef.current === "speaking" || stateRef.current === "processing") return;

    // First tap ever: arm the microphone
    armMic();

    // If idle/session_end → start conversation immediately
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
  }, [armMic, recorder, session, speakFallback]);

  const handleParentMode = useCallback(() => {
    conversationActiveRef.current = false;
    if (sessionStartedRef.current) {
      session.endSession();
      eventBus.emit({ type: "SESSION_END" });
      sessionStartedRef.current = false;
    }
    onParentMode();
  }, [onParentMode, session]);

  const stateLabel = {
    idle: partialText ? `"${partialText}"` : (micArmed ? 'Dis "Bobby" pour me parler !' : 'Touche Bobby pour commencer !'),
    listening: partialText ? `"${partialText}"` : "J'écoute…",
    processing: "Je réfléchis…",
    speaking: "Je parle…",
    interrupted: "Dis-moi !",
    session_end: 'Dis "Bobby" pour revenir !',
  }[state];

  return (
    <div className="child-light flex flex-col items-center justify-between h-screen px-4 py-6 max-w-lg mx-auto select-none overflow-hidden relative"
      style={{ background: `linear-gradient(180deg, hsl(220, 60%, 97%) 0%, hsl(235, 50%, 96%) 40%, hsl(270, 40%, 96%) 70%, hsl(320, 35%, 96%) 100%)` }}>

      <FloatingParticles />

      {/* Top bar */}
      <div className="w-full flex items-center justify-end px-2 relative z-10">
        <div className="flex items-center gap-2" />
        <div className="flex items-center gap-2">
          {parentSettings?.enableCamera && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/60 backdrop-blur-sm border border-primary/20 text-primary">
              <Camera className="w-3.5 h-3.5" />
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            </div>
          )}
          <button onClick={handleParentMode}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/70 backdrop-blur-sm border border-border/50 text-muted-foreground text-sm font-semibold shadow-sm hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-300">
            <Settings className="w-4 h-4" />
            Parent
          </button>
        </div>
      </div>

      {/* Hologram area */}
      <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0 relative z-10">
        <div className="absolute w-96 h-96 rounded-full pointer-events-none transition-all duration-500"
          style={{
            background: partialText && state === "listening"
              ? `radial-gradient(circle, 
                  hsla(210, 100%, 65%, 0.35) 0%, 
                  hsla(210, 90%, 60%, 0.2) 30%,
                  hsla(230, 70%, 65%, 0.08) 55%,
                  transparent 75%)`
              : `radial-gradient(circle, 
                  hsla(215, 85%, 70%, ${state === "speaking" ? 0.2 : 0.12}) 0%, 
                  hsla(270, 50%, 70%, ${state === "speaking" ? 0.12 : 0.06}) 35%,
                  hsla(320, 40%, 70%, 0.03) 55%,
                  transparent 75%)`,
            animation: partialText && state === "listening" ? "glow-voice 1.2s ease-in-out infinite alternate" : undefined,
          }}
        />

        <div
          className="relative w-80 h-80 md:w-96 md:h-96"
          onPointerDownCapture={handleTapBobby}
        >
          <HologramFace
            voiceState={state}
            enableCamera={parentSettings?.enableCamera ?? false}
            onTripleTap={handleParentMode}
          />
        </div>

        {/* State label */}
        <p className="mt-4 text-sm font-bold text-foreground/70 tracking-wide text-center px-4">
          {stateLabel}
        </p>

        {/* Mic status with sound wave */}
        <div className="mt-2 flex flex-col items-center gap-1.5">
          {state === "listening" ? (
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-primary/10 backdrop-blur-sm">
              <SoundWave active={partialText.length > 0} />
              <span className="text-xs text-primary font-bold">
                {partialText ? "Bobby t'entend…" : "J'écoute…"}
              </span>
              <SoundWave active={partialText.length > 0} />
            </div>
          ) : state === "idle" && micArmed ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 backdrop-blur-sm">
              <Mic className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">En attente de "Bobby"</span>
            </div>
          ) : state === "idle" && !micArmed ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 backdrop-blur-sm animate-pulse">
              <span className="text-xs text-primary font-bold">👆 Touche Bobby pour activer le micro</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="pb-4" />
    </div>
  );
};

export default VoiceScreen;
