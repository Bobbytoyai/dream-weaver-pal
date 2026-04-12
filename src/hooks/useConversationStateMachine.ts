/**
 * useConversationStateMachine — v4.0 Simplifié
 *
 * Pipeline ChatGPT Voice :
 * 1. Bienvenue TTS → mic démarre automatiquement
 * 2. L'enfant parle → Deepgram stream transcript
 * 3. Fin de parole → envoi immédiat à l'IA
 * 4. IA répond phrase par phrase → TTS joue en streaming
 * 5. Boucle — interruption possible à tout moment
 *
 * Retiré : wake word, cognitive/adaptive/learning engines,
 * offline mode, session tracker, recorder, sfx, stabilityEngine
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { streamVoiceChat, fetchTTSAudio, useAudioQueue } from "@/lib/voicePipeline";
import { useDeepgramSTT } from "@/hooks/useDeepgramSTT";
import { eventBus } from "@/lib/eventBus";
import type { FaceState } from "@/components/hologram/useFaceAnimation";

// ── Types ──────────────────────────────────────────────────
export type ConversationState = "IDLE" | "LISTENING" | "PROCESSING" | "SPEAKING" | "ERROR" | "SLEEP";
export type VoiceState = "idle" | "listening" | "processing" | "speaking" | "interrupted" | "session_end";
export type PendingNarration = null; // kept for compatibility
type AiMsg = { role: "user" | "assistant"; content: string };

export function toVoiceState(s: ConversationState): VoiceState {
  switch (s) {
    case "IDLE":       return "idle";
    case "LISTENING":  return "listening";
    case "PROCESSING": return "processing";
    case "SPEAKING":   return "speaking";
    case "ERROR":      return "interrupted";
    case "SLEEP":      return "session_end";
  }
}

// Kept for VoiceScreen compatibility
export const FALLBACK_FR: Record<string, string> = {
  not_heard: "Je n'ai pas bien entendu. Tu peux répéter ?",
  thinking:  "Une seconde.",
  error:     "Petit souci. Réessaie !",
};

// Emotion → FaceState mapping
function emotionToFace(e: string): FaceState {
  const map: Record<string, FaceState> = {
    thinking: "thinking", speaking: "speaking", happy: "happy",
    sad: "sad", excited: "excited", idle: "idle", listening: "listening",
  };
  return map[e] ?? "idle";
}

// ── Constants ──────────────────────────────────────────────
const MAX_HISTORY    = 12;
const FLUSH_DELAY_MS = 500;

// ── Hook ───────────────────────────────────────────────────
export function useConversationStateMachine(options: {
  childName: string;
  childAge: number;
  parentSettings?: any;
  pendingNarration?: any;
  onNarrationConsumed?: () => void;
  onParentMode?: () => void;
}) {
  const { childName, childAge, parentSettings, onParentMode } = options;
  const voiceId = parentSettings?.voiceId as string | undefined;

  const [state,      setState]      = useState<ConversationState>("IDLE");
  const [transcript, setTranscript] = useState("");
  const [bobbyText,  setBobbyText]  = useState("");
  const [emotion,    setEmotion]    = useState("idle");

  const stateRef      = useRef<ConversationState>("IDLE");
  const historyRef    = useRef<AiMsg[]>([]);
  const pendingRef    = useRef("");
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef      = useRef<AbortController | null>(null);
  const micStartedRef = useRef(false);

  const audioQueue = useAudioQueue();

  // ── State helper ─────────────────────────────────────────
  const go = useCallback((s: ConversationState) => {
    const prev = toVoiceState(stateRef.current);
    stateRef.current = s;
    setState(s);
    eventBus.emit({ type: "STATE_CHANGED", state: toVoiceState(s), prev });
  }, []);

  // ── Flush transcript → IA ────────────────────────────────
  const scheduleFlush = useCallback((delay = FLUSH_DELAY_MS) => {
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    flushTimerRef.current = setTimeout(() => {
      const t = pendingRef.current.trim();
      if (t && stateRef.current === "LISTENING") askAIRef.current(t);
    }, delay);
  }, []); // askAIRef added below

  // ── Ask AI (streaming → TTS phrase par phrase) ───────────
  const askAI = useCallback((userText: string) => {
    const text = userText.trim();
    if (!text) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setTranscript("");
    pendingRef.current = "";

    historyRef.current = [
      ...historyRef.current,
      { role: "user", content: text },
    ].slice(-MAX_HISTORY);

    go("PROCESSING");
    setEmotion("thinking");

    let speechStarted = false;

    streamVoiceChat({
      messages:       historyRef.current,
      childName,
      childAge,
      mode:           "chat",
      parentSettings,
      signal:         abortRef.current.signal,

      onSentence: (sentence) => {
        if (abortRef.current?.signal.aborted) return;
        if (!speechStarted) {
          speechStarted = true;
          go("SPEAKING");
          setEmotion("speaking");
          eventBus.emit({ type: "SPEECH_START" });
        }
        fetchTTSAudio(sentence, abortRef.current?.signal, voiceId)
          .then(url => {
            if (!abortRef.current?.signal.aborted) audioQueue.enqueue(url);
          })
          .catch(() => {});
      },

      onDone: (fullText) => {
        if (!fullText.trim()) { go("LISTENING"); return; }
        setBobbyText(fullText);
        historyRef.current = [
          ...historyRef.current,
          { role: "assistant", content: fullText },
        ].slice(-MAX_HISTORY);

        audioQueue.setOnAllDone(() => {
          if (!abortRef.current?.signal.aborted) {
            eventBus.emit({ type: "SPEECH_STOP" });
            go("LISTENING");
            setEmotion("idle");
          }
        });
      },

      onError: () => {
        go("LISTENING");
        setEmotion("idle");
      },
    });
  }, [childName, childAge, voiceId, parentSettings, go, audioQueue]);

  // Keep ref for scheduleFlush
  const askAIRef = useRef(askAI);
  useEffect(() => { askAIRef.current = askAI; }, [askAI]);

  // ── Interruption ─────────────────────────────────────────
  const interrupt = useCallback(() => {
    abortRef.current?.abort();
    audioQueue.stopAll();
    eventBus.emit({ type: "SPEECH_STOP" });
    go("LISTENING");
  }, [audioQueue, go]);

  // ── STT handlers ─────────────────────────────────────────
  const handlePartial = useCallback((text: string) => {
    if (stateRef.current === "SPEAKING" || stateRef.current === "PROCESSING") {
      if (text.length > 4) interrupt();
      return;
    }
    setTranscript(text);
    pendingRef.current = text;
    if (stateRef.current !== "LISTENING") go("LISTENING");
    scheduleFlush();
  }, [go, interrupt, scheduleFlush]);

  const handleFinal = useCallback((text: string) => {
    if (stateRef.current === "PROCESSING" || stateRef.current === "SPEAKING") return;
    setTranscript(text);
    pendingRef.current = text;
    scheduleFlush(150);
  }, [scheduleFlush]);

  const handleUtteranceEnd = useCallback(() => {
    if (pendingRef.current.trim() && stateRef.current === "LISTENING") {
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      askAI(pendingRef.current.trim());
    }
  }, [askAI]);

  const handleSpeechStarted = useCallback(() => {
    eventBus.emit({ type: "WAKE_DETECTED", confidence: 0.9 });
  }, []);

  const stt = useDeepgramSTT({
    onPartial:       handlePartial,
    onFinal:         handleFinal,
    onUtteranceEnd:  handleUtteranceEnd,
    onSpeechStarted: handleSpeechStarted,
    language:        "fr",
  });
  const sttRef = useRef(stt);
  useEffect(() => { sttRef.current = stt; }, [stt]);

  // ── Démarrer le micro ────────────────────────────────────
  const startMic = useCallback(() => {
    if (micStartedRef.current) return;
    micStartedRef.current = true;
    sttRef.current.start();
    if (stateRef.current === "IDLE" || stateRef.current === "SPEAKING") go("LISTENING");
  }, [go]);

  // ── Bienvenue + mic automatique ──────────────────────────
  useEffect(() => {
    const welcome = `Salut ${childName} ! Je suis Bobby. Qu'est-ce qu'on fait aujourd'hui ?`;
    setBobbyText(welcome);
    go("SPEAKING");

    fetchTTSAudio(welcome, undefined, voiceId)
      .then(url => {
        audioQueue.enqueue(url);
        audioQueue.setOnAllDone(() => startMic());
      })
      .catch(() => startMic());

    return () => {
      sttRef.current.stop();
      audioQueue.stopAll();
      abortRef.current?.abort();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Tap sur Bobby ────────────────────────────────────────
  const handleTapBobby = useCallback(() => {
    if (stateRef.current === "SPEAKING" || stateRef.current === "PROCESSING") {
      interrupt();
    } else if (!micStartedRef.current) {
      startMic();
    }
  }, [interrupt, startMic]);

  const handleParentMode = useCallback(() => {
    onParentMode?.();
  }, [onParentMode]);

  // ── Derived values pour UI ───────────────────────────────
  const displayState = toVoiceState(state);
  const bobbyFaceEmotion: FaceState = emotionToFace(emotion);
  const bobbyEmotionIntensity = state === "SPEAKING" ? 0.85 : state === "LISTENING" ? 0.6 : 0.4;

  return {
    // State
    state,
    machineState:        state,
    displayState,
    transcript,
    partialText:         transcript,
    lastRecognized:      transcript,
    bobbyText,
    lastAiResponse:      bobbyText,
    emotion,
    currentEmotion:      emotion,
    bobbyFaceEmotion,
    bobbyEmotionIntensity,
    micArmed:            state !== "IDLE",
    networkOffline:      false,

    // STT (for debug overlay)
    deepgramSTT: {
      isRunning: stt.isRunning,
      backend:   "deepgram" as const,
    },

    // Actions
    handleTapBobby,
    handleParentMode,
    startListening:    startMic,
    processTranscript: askAI,
    sendMessage:       askAI,
    interrupt,
  };
}
