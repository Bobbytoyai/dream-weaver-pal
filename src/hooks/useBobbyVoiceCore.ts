// @refresh reset
import { useCallback, useEffect, useRef, useState } from "react";
import type { ParentSettings } from "@/components/parentSettings";
import type { FaceState } from "@/components/hologram/useFaceAnimation";
import type { ExpressionCombo } from "@/lib/bobby/expressionLibrary";
import { detectBobbyExpression } from "@/lib/emotionMapper";
import { resetEmotionPipeline } from "@/lib/bobby/emotionPipeline";
import { eventBus } from "@/lib/eventBus";
import { getNetworkMode, onNetworkChange } from "@/lib/offlineEngine";
import { fetchTTSAudio } from "@/lib/voicePipeline";
import {
  buildBobbyReply,
  getBobbyMicRecoveryMessage,
  getBobbySleepMessage,
  getBobbyWelcomeMessage,
  resetBobbyBrainSession,
  initBobbySession,
  endBobbySession,
} from "@/lib/bobby/brain";
import { toVoiceState, type BobbyBrainReply, type ConversationState, type PendingNarration } from "@/lib/bobby/types";
import { useSessionTracker } from "./useSessionTracker";
import { useSmartSTT } from "./useSmartSTT";
import { useConversationRecorder } from "./useConversationRecorder";

// ─── Timing constants ────────────────────────────────
const WAIT_SILENCE_BEFORE_RELANCE_MS = 60_000;
const RELANCE_SILENCE_BEFORE_OFF_MS = 30_000;
const CONV_SILENCE_RELANCE_MS = 30_000;
const CONV_SILENCE_OFF_MS = 60_000;
const MIN_SESSION_MS = 90_000;
const SLEEP_TIMER_MS = 120_000;
const ANTI_ECHO_COOLDOWN_MS = 400;
const UTTERANCE_BUFFER_MS = 7500;
const ACK_MIN_INTERVAL_MS = 4000;
const ACK_MAX_INTERVAL_MS = 8000;

// ─── Natural acknowledgment sounds (breathing/hmm) ──────
const ACK_SOUNDS = [
  "hmm", "hmm hmm", "ah", "oui", "ah oui", "mmh", "oh", "d'accord", "mh mh",
];
function pickAck(): string {
  return ACK_SOUNDS[Math.floor(Math.random() * ACK_SOUNDS.length)];
}

const RELANCE_MESSAGES: string[] = [];
const GOODBYE_MESSAGES: string[] = [];
const WELCOME_PHRASES: string[] = [];

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

interface UseBobbyVoiceCoreOptions {
  childName: string;
  childAge: number;
  parentSettings?: ParentSettings;
  pendingNarration?: PendingNarration | null;
  onNarrationConsumed?: () => void;
  onParentMode?: () => void;
}

function resolveVoiceProfile(parentSettings?: ParentSettings): "child" | "female" | "male" | "sister" | "brother" {
  switch (parentSettings?.voiceType) {
    case "child":
    case "female":
    case "male":
    case "sister":
    case "brother":
      return parentSettings.voiceType;
    default:
      return "female";
  }
}

async function playGeneratedAudio(audioUrl: string, signal: AbortSignal): Promise<void> {
  if (!audioUrl || audioUrl.startsWith("__")) return;

  await new Promise<void>((resolve) => {
    const audio = new Audio(audioUrl);
    audio.crossOrigin = "anonymous";

    // Emit so HologramFace can connect its analyser for lip sync
    eventBus.emit({ type: "AUDIO_ELEMENT_CREATED", element: audio });

    const cleanup = () => {
      audio.onended = null;
      audio.onerror = null;
      signal.removeEventListener("abort", abortPlayback);
    };

    const finish = () => {
      cleanup();
      resolve();
    };

    const abortPlayback = () => {
      audio.pause();
      audio.currentTime = 0;
      finish();
    };

    audio.onended = finish;
    audio.onerror = finish;
    signal.addEventListener("abort", abortPlayback, { once: true });

    audio.play().catch(finish);
  });
}

export function useBobbyVoiceCore({
  childName,
  childAge,
  parentSettings,
  pendingNarration,
  onNarrationConsumed,
  onParentMode,
}: UseBobbyVoiceCoreOptions) {
  const welcomeMessage = getBobbyWelcomeMessage(childName);

  const [machineState, setMachineState] = useState<ConversationState>("IDLE");
  const [partialText, setPartialText] = useState("");
  const [lastRecognized, setLastRecognized] = useState("");
  const [bobbyText, setBobbyText] = useState(welcomeMessage);
  const [lastAiResponse, setLastAiResponse] = useState(welcomeMessage);
  const lastAiResponseRef = useRef(welcomeMessage);
  const [micArmed, setMicArmed] = useState(false);
  const [networkOffline, setNetworkOffline] = useState(() => getNetworkMode() === "OFFLINE");
  const [currentEmotion, setCurrentEmotion] = useState<FaceState>("happy");
  const [currentExpressionCombo, setCurrentExpressionCombo] = useState<ExpressionCombo | undefined>();
  const [currentExpressionIntensity, setCurrentExpressionIntensity] = useState<number>(3);

  const machineRef = useRef<ConversationState>("IDLE");
  const processingRef = useRef(false);
  const stopSttRef = useRef<() => void>(() => {});
  const finalTranscriptRef = useRef<(text: string) => void>(() => {});
  const sttErrorRef = useRef<(error: string) => void>(() => {});
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastSpeechEndRef = useRef(0);
  const recentBobbyMessagesRef = useRef<string[]>([]);
  const handledNarrationIdRef = useRef<string | null>(null);
  const sessionOpenRef = useRef(false);
  const startListeningRef = useRef<() => Promise<void>>(async () => {});
  // Track whether voice was detected at least once in this activation
  const voiceDetectedRef = useRef(false);
  // Track session start time for minimum session guarantee
  const sessionStartTimeRef = useRef(0);
  // Track relance count during conversation
  const convRelanceCountRef = useRef(0);
  // Utterance accumulation buffer — don't cut the child mid-sentence
  const utteranceBufferRef = useRef<string[]>([]);
  const utteranceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Natural acknowledgment sounds timer
  const ackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAckTimeRef = useRef(0);

  const { startSession, addMessage, endSession, sessionIdRef } = useSessionTracker(childName, childAge);
  const { startRecording, stopRecording } = useConversationRecorder();

  const go = useCallback((nextState: ConversationState) => {
    const previousState = machineRef.current;
    machineRef.current = nextState;
    setMachineState(nextState);
    eventBus.emit({ type: "STATE_CHANGED", state: toVoiceState(nextState), prev: toVoiceState(previousState) });
  }, []);

  // ─── Timer management ──────────────────────────────
  const clearSleepTimer = useCallback(() => {
    if (sleepTimerRef.current) {
      clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }
  }, []);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const scheduleSleep = useCallback(() => {
    clearSleepTimer();
    sleepTimerRef.current = setTimeout(() => {
      if (machineRef.current === "IDLE") {
        setCurrentEmotion("sleepy");
        setBobbyText(getBobbySleepMessage());
        go("SLEEP");
      }
    }, SLEEP_TIMER_MS);
  }, [clearSleepTimer, go]);

  const stopPlayback = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  // ─── Session management ────────────────────────────
  const closeSession = useCallback(async () => {
    if (!sessionOpenRef.current) return;
    const sid = sessionIdRef.current;
    if (sid) {
      const audioPath = await stopRecording(sid);
      if (audioPath) {
        console.log("[BobbyVoiceCore] 🎙️ Audio saved:", audioPath);
        try {
          const { supabase } = await import("@/integrations/supabase/client");
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from("conversation_analyses").upsert({
              session_id: sid,
              audio_path: audioPath,
              user_id: user.id,
            }, { onConflict: "session_id" });
          }
        } catch (e) {
          console.warn("[BobbyVoiceCore] Failed to save audio path:", e);
        }
      }
    }
    await endSession();
    sessionOpenRef.current = false;
    eventBus.emit({ type: "SESSION_END" });

    if (sid) {
      console.log("[BobbyVoiceCore] 🧠 Triggering AI session analysis for:", sid);
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/session-analysis`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ sessionId: sid }),
      }).catch((e) => console.warn("[BobbyVoiceCore] AI analysis failed:", e));
    }
  }, [endSession, stopRecording, sessionIdRef]);

  const ensureSession = useCallback(async () => {
    if (sessionOpenRef.current && sessionIdRef.current) return sessionIdRef.current;

    const sessionId = await startSession();
    if (sessionId) {
      sessionOpenRef.current = true;
      sessionStartTimeRef.current = Date.now();
      eventBus.emit({ type: "SESSION_START" });
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        await startRecording(stream);
        console.log("[BobbyVoiceCore] 🎙️ Recording started for session:", sessionId);
      } catch (e) {
        console.warn("[BobbyVoiceCore] Could not start recording:", e);
      }
    }

    return sessionId;
  }, [sessionIdRef, startSession, startRecording]);

  // ─── Speak a short system message (relance, welcome, goodbye) ──────
  const speakSystemMessage = useCallback(async (text: string, emotion: FaceState = "idle") => {
    stopPlayback();
    stopSttRef.current();
    setMicArmed(false);

    const controller = new AbortController();
    abortRef.current = controller;

    setCurrentEmotion(emotion);
    setBobbyText(text);
    setLastAiResponse(text);
    lastAiResponseRef.current = text;
    recentBobbyMessagesRef.current = [text.toLowerCase(), ...recentBobbyMessagesRef.current.slice(0, 4)];

    try {
      const audioUrl = await fetchTTSAudio(text, controller.signal, resolveVoiceProfile(parentSettings));
      if (!controller.signal.aborted) {
        eventBus.emit({ type: "SPEECH_START" });
        await playGeneratedAudio(audioUrl, controller.signal);
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        console.warn("[BobbyVoiceCore] System TTS failed:", error);
      }
    }

    if (!controller.signal.aborted) {
      eventBus.emit({ type: "SPEECH_STOP" });
      lastSpeechEndRef.current = Date.now();
    }
  }, [parentSettings, stopPlayback]);

  // ─── Speak a brain reply ───────────────────────────
  const speakReply = useCallback(async (reply: BobbyBrainReply) => {
    stopPlayback();
    stopSttRef.current();
    setMicArmed(false);

    const controller = new AbortController();
    abortRef.current = controller;

    setCurrentEmotion(reply.emotion);
    const exprResult = detectBobbyExpression(reply.text, parentSettings?.childAge ?? 7);
    setCurrentExpressionCombo(exprResult.expression.combo);
    setCurrentExpressionIntensity(exprResult.expression.intensity);
    setBobbyText(reply.text);
    setLastAiResponse(reply.text);
    lastAiResponseRef.current = reply.text;
    recentBobbyMessagesRef.current = [reply.text.toLowerCase(), ...recentBobbyMessagesRef.current.slice(0, 4)];

    // Don't emit SPEAKING/SPEECH_START yet — wait for audio to be ready
    eventBus.emit({ type: "RESPONSE_READY", text: reply.text });

    stopSttRef.current();

    try {
      const audioUrl = await fetchTTSAudio(reply.text, controller.signal, resolveVoiceProfile(parentSettings));
      if (!controller.signal.aborted) {
        // Audio is ready — NOW start speaking state & mouth animation
        go("SPEAKING");
        eventBus.emit({ type: "SPEECH_START" });
        stopSttRef.current();
        await playGeneratedAudio(audioUrl, controller.signal);
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        console.warn("[BobbyVoiceCore] TTS playback failed:", error);
      }
    }

    if (!controller.signal.aborted) {
      eventBus.emit({ type: "SPEECH_STOP" });
      lastSpeechEndRef.current = Date.now();
      convRelanceCountRef.current = 0;
      await new Promise(r => setTimeout(r, ANTI_ECHO_COOLDOWN_MS));
      if (!abortRef.current?.signal.aborted && machineRef.current === "SPEAKING") {
        void startListeningRef.current();
      }
    }
  }, [go, parentSettings, stopPlayback]);

  // ─── Deactivate Bobby (go idle/sleep) ──────────────
  const deactivate = useCallback(async (withGoodbye: boolean = false) => {
    clearSilenceTimer();

    // Minimum session guarantee: don't deactivate before 90s if voice was detected
    if (voiceDetectedRef.current && sessionStartTimeRef.current > 0) {
      const elapsed = Date.now() - sessionStartTimeRef.current;
      if (elapsed < MIN_SESSION_MS) {
        console.log("[BobbyVoiceCore] Min session not reached, extending...");
        // Schedule another check after remaining time
        silenceTimerRef.current = setTimeout(() => {
          void deactivate(withGoodbye);
        }, MIN_SESSION_MS - elapsed);
        return;
      }
    }

    // No generic goodbye — just deactivate silently

    stopSttRef.current();
    setMicArmed(false);
    setPartialText("");
    utteranceBufferRef.current = [];
    if (utteranceTimerRef.current) { clearTimeout(utteranceTimerRef.current); utteranceTimerRef.current = null; }
    setCurrentEmotion("happy");
    voiceDetectedRef.current = false;
    convRelanceCountRef.current = 0;
    go("IDLE");
    void closeSession();
    scheduleSleep();
  }, [clearSilenceTimer, closeSession, go, scheduleSleep, speakSystemMessage]);

  // ─── Schedule silence timer based on current context ───
  const scheduleSilenceWatch = useCallback((context: "waiting" | "conversation" | "relance") => {
    clearSilenceTimer();

    let timeout: number;
    switch (context) {
      case "waiting":
        // First activation, no voice yet — 60s then relance
        timeout = WAIT_SILENCE_BEFORE_RELANCE_MS;
        break;
      case "conversation":
        // During active conversation — 20s then relance
        timeout = CONV_SILENCE_RELANCE_MS;
        break;
      case "relance":
        // After relance — 30s (initial) or 60s (conversation) then off
        timeout = voiceDetectedRef.current ? CONV_SILENCE_OFF_MS : RELANCE_SILENCE_BEFORE_OFF_MS;
        break;
    }

    silenceTimerRef.current = setTimeout(async () => {
      if (machineRef.current !== "LISTENING" && machineRef.current !== "RELANCE") return;

      if (context === "relance") {
        // Already relanced — deactivate silently
        console.log("[BobbyVoiceCore] Silence after relance — deactivating");
        void deactivate(false);
        return;
      }

      // Silence detected — just deactivate silently (no generic relance phrase)
      console.log("[BobbyVoiceCore] Silence detected — deactivating");
      void deactivate(false);
    }, timeout);
  }, [clearSilenceTimer, deactivate, go, speakSystemMessage]);

  // ─── STT error handler ─────────────────────────────
  const handleSttError = useCallback((error: string) => {
    console.warn("[BobbyVoiceCore] STT error:", error);
    processingRef.current = false;
    setMicArmed(false);
    setPartialText("");
    stopSttRef.current();
    stopPlayback();
    setCurrentEmotion("confused");

    const recoveryMessage = getBobbyMicRecoveryMessage(networkOffline);
    setBobbyText(recoveryMessage);
    setLastAiResponse(recoveryMessage);
    lastAiResponseRef.current = recoveryMessage;
    go("ERROR");

    void closeSession();
    scheduleSleep();
  }, [closeSession, go, networkOffline, scheduleSleep, stopPlayback]);

  // ─── Final transcript handler ──────────────────────
  const handleFinalTranscript = useCallback(async (text: string) => {
    const trimmedText = text.trim();
    if (!trimmedText) {
      handleSttError("EMPTY_TRANSCRIPT");
      return;
    }

    if (machineRef.current === "SPEAKING" || machineRef.current === "PROCESSING") {
      console.warn("[BobbyVoiceCore] 🔇 Rejected transcript during", machineRef.current);
      return;
    }

    const msSinceSpeech = Date.now() - lastSpeechEndRef.current;
    if (msSinceSpeech < ANTI_ECHO_COOLDOWN_MS) {
      console.warn("[BobbyVoiceCore] 🔇 Anti-echo cooldown:", msSinceSpeech, "ms");
      return;
    }

    // Anti-echo: reject if too similar to recent Bobby messages
    const incoming = trimmedText.toLowerCase();
    const incomingWords = incoming.split(/\s+/).filter(w => w.length > 2);
    for (const recentMsg of recentBobbyMessagesRef.current) {
      if (recentMsg.length < 15) continue;
      const bobbyWords = new Set(recentMsg.split(/\s+/).filter(w => w.length > 2));
      const matchCount = incomingWords.filter(w => bobbyWords.has(w)).length;
      const similarity = matchCount / Math.max(incomingWords.length, 1);
      if (similarity > 0.7) {
        console.warn("[BobbyVoiceCore] 🔇 Anti-echo rejected:", similarity.toFixed(2));
        processingRef.current = false;
        void startListeningRef.current();
        return;
      }
    }

    if (processingRef.current) return;
    processingRef.current = true;

    try {
      // Voice detected! Mark session as active conversation
      voiceDetectedRef.current = true;
      clearSilenceTimer();

      stopSttRef.current();
      setMicArmed(false);
      setPartialText("");
      // Clear any pending buffer
      utteranceBufferRef.current = [];
      if (utteranceTimerRef.current) { clearTimeout(utteranceTimerRef.current); utteranceTimerRef.current = null; }
      setLastRecognized(trimmedText);

      // Empathetic pre-reaction
      const { detectChildExpression } = await import("@/lib/emotionMapper");
      const childExpr = detectChildExpression(trimmedText, parentSettings?.childAge ?? 7);
      setCurrentEmotion(childExpr.faceState);
      setCurrentExpressionCombo(childExpr.expression.combo);
      setCurrentExpressionIntensity(childExpr.expression.intensity);

      eventBus.emit({ type: "VOICE_INPUT", transcript: trimmedText });

      await ensureSession();
      await addMessage("user", trimmedText);

      const { supabase: sb } = await import("@/integrations/supabase/client");
      const { data: { user: currentUser } } = await sb.auth.getUser();
      const reply = await buildBobbyReply({ childName, childAge, userText: trimmedText, parentSettings, userId: currentUser?.id, sessionId: sessionIdRef.current });
      await addMessage("assistant", reply.text, reply.emotion);
      await speakReply(reply);
    } finally {
      processingRef.current = false;
    }
  }, [addMessage, childAge, childName, clearSilenceTimer, ensureSession, handleSttError, parentSettings, speakReply]);

  // ─── STT setup ─────────────────────────────────────
  const smartSTT = useSmartSTT({
    onPartial: useCallback((text: string) => {
      if (machineRef.current !== "LISTENING" || !text.trim()) return;
      setPartialText(text);
      setCurrentEmotion("attentive");
      // Reset silence timer on partial speech detection
      if (voiceDetectedRef.current) {
        // During conversation, reset the 20s silence timer
        clearSilenceTimer();
        scheduleSilenceWatch("conversation");
      }
    }, [clearSilenceTimer, scheduleSilenceWatch]),
    onFinal: useCallback((text: string) => {
      finalTranscriptRef.current(text);
    }, []),
    onError: useCallback((error: string) => {
      sttErrorRef.current(error);
    }, []),
    onSpeechStarted: useCallback(() => {
      if (machineRef.current !== "LISTENING") return;
      setCurrentEmotion("attentive");
    }, []),
    language: "fr",
  });

  // Keep a ref to smartSTT for use in scheduleSilenceWatch
  const smartSTTRef = useRef(smartSTT);
  smartSTTRef.current = smartSTT;
  stopSttRef.current = smartSTT.stop;

  useEffect(() => {
    finalTranscriptRef.current = (text) => {
      // Accumulate fragments — don't process immediately, wait for child to finish
      const trimmed = text.trim();
      if (!trimmed) return;

      utteranceBufferRef.current.push(trimmed);
      setPartialText(utteranceBufferRef.current.join(" "));

      // Reset the debounce timer each time a new fragment arrives
      if (utteranceTimerRef.current) clearTimeout(utteranceTimerRef.current);
      utteranceTimerRef.current = setTimeout(() => {
        // Child has been silent for UTTERANCE_BUFFER_MS — now process the full sentence
        const fullText = utteranceBufferRef.current.join(" ").trim();
        utteranceBufferRef.current = [];
        utteranceTimerRef.current = null;
        if (fullText) {
          void handleFinalTranscript(fullText);
        }
      }, UTTERANCE_BUFFER_MS);
    };
  }, [handleFinalTranscript]);

  useEffect(() => {
    sttErrorRef.current = handleSttError;
  }, [handleSttError]);

  // ─── Start listening (activation) ──────────────────
  const startListening = useCallback(async () => {
    clearSleepTimer();
    clearSilenceTimer();
    stopPlayback();
    processingRef.current = false;
    setPartialText("");
    setLastRecognized("");
    setMicArmed(true);
    setCurrentEmotion("attentive");
    go("LISTENING");
    eventBus.emit({ type: "WAKE_DETECTED", confidence: 1 });

    // Schedule silence watch based on context
    if (voiceDetectedRef.current) {
      // Already in a conversation — use shorter timer
      scheduleSilenceWatch("conversation");
    } else {
      // Fresh activation — wait 60s for first voice
      scheduleSilenceWatch("waiting");
    }

    try {
      await smartSTT.start();
      console.log("[BobbyVoiceCore] ✅ Native STT started");
    } catch (err: any) {
      handleSttError("STT_START_FAILED");
    }
  }, [clearSleepTimer, clearSilenceTimer, go, handleSttError, scheduleSilenceWatch, smartSTT, stopPlayback]);

  useEffect(() => { startListeningRef.current = startListening; }, [startListening]);

  // ─── Interrupt ─────────────────────────────────────
  const interrupt = useCallback(() => {
    processingRef.current = false;
    clearSilenceTimer();
    stopSttRef.current();
    setMicArmed(false);
    setPartialText("");
    stopPlayback();
    setCurrentEmotion("idle");
    voiceDetectedRef.current = false;
    convRelanceCountRef.current = 0;
    go("IDLE");
    scheduleSleep();
  }, [clearSilenceTimer, go, scheduleSleep, stopPlayback]);

  // ─── Tap Bobby handler ────────────────────────────
  const handleTapBobby = useCallback(async () => {
    // Don't interrupt Bobby while speaking — let him finish naturally
    if (machineRef.current === "SPEAKING" || machineRef.current === "PROCESSING") {
      console.log("[BobbyVoiceCore] 🔇 Tap ignored — Bobby is", machineRef.current);
      return;
    }

    if (machineRef.current === "LISTENING") {
      interrupt();
      return;
    }

    // Wake up Bobby — go straight to listening (no generic welcome phrase)
    clearSleepTimer();
    voiceDetectedRef.current = false;
    convRelanceCountRef.current = 0;

    await startListening();
  }, [clearSleepTimer, go, interrupt, speakSystemMessage, startListening]);

  // ─── Init on child change ──────────────────────────
  useEffect(() => {
    const welcome = getBobbyWelcomeMessage(childName);
    handledNarrationIdRef.current = null;
    resetBobbyBrainSession();
    // Load persistent memory for this child (async, non-blocking)
    initBobbySession(childName).catch(console.warn);
    setPartialText("");
    setLastRecognized("");
    setBobbyText(welcome);
    setLastAiResponse(welcome);
    lastAiResponseRef.current = welcome;
    setCurrentEmotion("idle");
    voiceDetectedRef.current = false;
    go("IDLE");
    scheduleSleep();
  }, [childName, go, scheduleSleep]);

  // ─── Network change ───────────────────────────────
  useEffect(() => {
    return onNetworkChange((mode) => {
      setNetworkOffline(mode === "OFFLINE");
    });
  }, []);

  // ─── Pending narration ────────────────────────────
  useEffect(() => {
    if (!pendingNarration || pendingNarration.storyId === handledNarrationIdRef.current) return;

    handledNarrationIdRef.current = pendingNarration.storyId;

    void (async () => {
      processingRef.current = true;

      try {
        stopSttRef.current();
        setMicArmed(false);
        setPartialText("");
        setCurrentEmotion("curious");
        go("PROCESSING");

        await ensureSession();

        const reply = await buildBobbyReply({
          childName,
          childAge,
          pendingNarration,
          parentSettings,
        });

        await addMessage("assistant", reply.text, reply.emotion);
        await speakReply(reply);
        onNarrationConsumed?.();
      } finally {
        processingRef.current = false;
      }
    })();
  }, [addMessage, childAge, childName, ensureSession, go, onNarrationConsumed, pendingNarration, speakReply]);

  // ─── Cleanup ──────────────────────────────────────
  useEffect(() => {
    return () => {
      clearSleepTimer();
      clearSilenceTimer();
      stopSttRef.current();
      stopPlayback();
      // Save persistent memory before cleanup
      endBobbySession(childName).catch(console.warn);
      resetBobbyBrainSession();
      resetEmotionPipeline();
      void closeSession();
    };
  }, [clearSleepTimer, clearSilenceTimer, closeSession, stopPlayback]);

  // ─── Computed face state ──────────────────────────
  const bobbyFaceEmotion: FaceState =
    machineState === "LISTENING"
      ? "attentive"
      : machineState === "RELANCE"
        ? "reassuring"
        : machineState === "PROCESSING"
          ? currentEmotion
          : machineState === "SPEAKING"
            ? currentEmotion
            : machineState === "ERROR"
              ? "confused"
              : machineState === "SLEEP"
                ? "sleepy"
                : "idle";

  const bobbyEmotionIntensity =
    machineState === "SPEAKING"
      ? 0.95
      : machineState === "LISTENING"
        ? 0.75
        : machineState === "RELANCE"
          ? 0.6
          : machineState === "ERROR"
            ? 0.6
            : 0.4;

  const wakeWordEnabled = false;

  return {
    state: machineState,
    machineState,
    displayState: toVoiceState(machineState),
    transcript: lastRecognized,
    partialText,
    lastRecognized,
    bobbyText,
    lastAiResponse,
    emotion: toVoiceState(machineState),
    currentEmotion: toVoiceState(machineState),
    bobbyFaceEmotion,
    bobbyEmotionIntensity,
    expressionCombo: currentExpressionCombo,
    expressionIntensityLevel: currentExpressionIntensity,
    micArmed,
    networkOffline,
    sttIsRunning: smartSTT.isRunning,
    sttBackend: smartSTT.backend,
    deepgramSTT: {
      isRunning: smartSTT.isRunning,
      backend: smartSTT.backend,
    },
    handleTapBobby,
    handleParentMode: onParentMode ?? (() => {}),
    startListening: handleTapBobby,
    processTranscript: handleFinalTranscript,
    sendMessage: handleFinalTranscript,
    interrupt,
    wakeWordEnabled,
  };
}
