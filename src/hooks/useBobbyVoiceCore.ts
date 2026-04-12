// @refresh reset
import { useCallback, useEffect, useRef, useState } from "react";
import type { ParentSettings } from "@/components/parentSettings";
import type { FaceState } from "@/components/hologram/useFaceAnimation";
import { eventBus } from "@/lib/eventBus";
import { getNetworkMode, onNetworkChange } from "@/lib/offlineEngine";
import { fetchTTSAudio } from "@/lib/voicePipeline";
import {
  buildBobbyReply,
  getBobbyMicRecoveryMessage,
  getBobbySleepMessage,
  getBobbyWelcomeMessage,
  resetBobbyBrainSession,
} from "@/lib/bobby/brain";
import { toVoiceState, type BobbyBrainReply, type ConversationState, type PendingNarration } from "@/lib/bobby/types";
import { useSessionTracker } from "./useSessionTracker";
import { useSmartSTT } from "./useSmartSTT";

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
  const [micArmed, setMicArmed] = useState(false);
  const [networkOffline, setNetworkOffline] = useState(() => getNetworkMode() === "OFFLINE");
  const [currentEmotion, setCurrentEmotion] = useState<FaceState>("idle");

  const machineRef = useRef<ConversationState>("IDLE");
  const processingRef = useRef(false);
  const stopSttRef = useRef<() => void>(() => {});
  const finalTranscriptRef = useRef<(text: string) => void>(() => {});
  const sttErrorRef = useRef<(error: string) => void>(() => {});
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listenTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const handledNarrationIdRef = useRef<string | null>(null);
  const sessionOpenRef = useRef(false);

  const { startSession, addMessage, endSession, sessionIdRef } = useSessionTracker(childName, childAge);

  const go = useCallback((nextState: ConversationState) => {
    const previousState = machineRef.current;
    machineRef.current = nextState;
    setMachineState(nextState);
    eventBus.emit({ type: "STATE_CHANGED", state: toVoiceState(nextState), prev: toVoiceState(previousState) });
  }, []);

  const clearSleepTimer = useCallback(() => {
    if (sleepTimerRef.current) {
      clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = null;
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
    }, 120_000);
  }, [clearSleepTimer, go]);

  const stopPlayback = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  const closeSession = useCallback(async () => {
    if (!sessionOpenRef.current) return;
    await endSession();
    sessionOpenRef.current = false;
    eventBus.emit({ type: "SESSION_END" });
  }, [endSession]);

  const ensureSession = useCallback(async () => {
    if (sessionOpenRef.current && sessionIdRef.current) return sessionIdRef.current;

    const sessionId = await startSession();
    if (sessionId) {
      sessionOpenRef.current = true;
      eventBus.emit({ type: "SESSION_START" });
    }

    return sessionId;
  }, [sessionIdRef, startSession]);

  const speakReply = useCallback(async (reply: BobbyBrainReply) => {
    stopPlayback();

    const controller = new AbortController();
    abortRef.current = controller;

    setCurrentEmotion(reply.emotion);
    setBobbyText(reply.text);
    setLastAiResponse(reply.text);
    go("SPEAKING");
    eventBus.emit({ type: "RESPONSE_READY", text: reply.text });
    eventBus.emit({ type: "SPEECH_START" });

    try {
      const audioUrl = await fetchTTSAudio(reply.text, controller.signal, resolveVoiceProfile(parentSettings));
      if (!controller.signal.aborted) {
        await playGeneratedAudio(audioUrl, controller.signal);
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        console.warn("[BobbyVoiceCore] TTS playback failed:", error);
      }
    }

    if (!controller.signal.aborted) {
      eventBus.emit({ type: "SPEECH_STOP" });
      go("IDLE");
      await closeSession();
      scheduleSleep();
    }
  }, [closeSession, go, parentSettings, scheduleSleep, stopPlayback]);

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
    go("ERROR");

    void closeSession();
    scheduleSleep();
  }, [closeSession, go, networkOffline, scheduleSleep, stopPlayback]);

  const handleFinalTranscript = useCallback(async (text: string) => {
    const trimmedText = text.trim();
    if (!trimmedText) {
      handleSttError("EMPTY_TRANSCRIPT");
      return;
    }

    if (processingRef.current) return;
    processingRef.current = true;

    try {
      stopSttRef.current();
      setMicArmed(false);
      setPartialText("");
      setLastRecognized(trimmedText);
      setCurrentEmotion("thinking");
      go("PROCESSING");
      eventBus.emit({ type: "VOICE_INPUT", transcript: trimmedText });

      await ensureSession();
      await addMessage("user", trimmedText);

      const reply = buildBobbyReply({ childName, childAge, userText: trimmedText });
      await addMessage("assistant", reply.text, reply.emotion);
      await speakReply(reply);
    } finally {
      processingRef.current = false;
    }
  }, [addMessage, childAge, childName, ensureSession, go, handleSttError, speakReply]);

  const smartSTT = useSmartSTT({
    onPartial: useCallback((text: string) => {
      if (machineRef.current !== "LISTENING" || !text.trim()) return;
      setPartialText(text);
      setCurrentEmotion("attentive");
    }, []),
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

  stopSttRef.current = smartSTT.stop;

  useEffect(() => {
    finalTranscriptRef.current = (text) => {
      void handleFinalTranscript(text);
    };
  }, [handleFinalTranscript]);

  useEffect(() => {
    sttErrorRef.current = handleSttError;
  }, [handleSttError]);

  const startListening = useCallback(async () => {
    clearSleepTimer();
    stopPlayback();
    processingRef.current = false;
    setPartialText("");
    setLastRecognized("");
    setMicArmed(true);
    setCurrentEmotion("attentive");
    go("LISTENING");
    eventBus.emit({ type: "WAKE_DETECTED", confidence: 1 });

    // 40s silence watchdog — if no final transcript arrives, stop listening
    if (listenTimeoutRef.current) clearTimeout(listenTimeoutRef.current);
    listenTimeoutRef.current = setTimeout(() => {
      if (machineRef.current === "LISTENING") {
        console.log("[BobbyVoiceCore] 40s silence timeout — stopping listening");
        stopSttRef.current();
        setMicArmed(false);
        setPartialText("");
        setCurrentEmotion("idle");
        go("IDLE");
        scheduleSleep();
      }
    }, 40_000);

    try {
      // CRITICAL: Acquire mic stream DIRECTLY in the tap gesture handler
      // to preserve the browser gesture chain (required on mobile Safari/Chrome).
      // This MUST happen before any other async operation.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      console.log("[BobbyVoiceCore] ✅ Mic acquired in gesture handler");

      // Pass the pre-acquired stream to STT so it doesn't need to call getUserMedia again
      await smartSTT.start(stream);
    } catch (err: any) {
      const errorName = err?.name || "";
      if (errorName === "NotAllowedError") {
        handleSttError("MIC_PERMISSION_DENIED");
      } else if (errorName === "NotFoundError") {
        handleSttError("MIC_NOT_FOUND");
      } else if (errorName === "NotReadableError") {
        handleSttError("MIC_IN_USE");
      } else {
        handleSttError("STT_START_FAILED");
      }
    }
  }, [clearSleepTimer, go, handleSttError, smartSTT, stopPlayback]);

  const interrupt = useCallback(() => {
    processingRef.current = false;
    stopSttRef.current();
    setMicArmed(false);
    setPartialText("");
    stopPlayback();
    setCurrentEmotion("idle");
    go("IDLE");
    scheduleSleep();
  }, [go, scheduleSleep, stopPlayback]);

  const handleTapBobby = useCallback(async () => {
    if (machineRef.current === "SPEAKING" || machineRef.current === "PROCESSING" || machineRef.current === "LISTENING") {
      interrupt();
      return;
    }

    await startListening();
  }, [interrupt, startListening]);

  useEffect(() => {
    const welcome = getBobbyWelcomeMessage(childName);
    handledNarrationIdRef.current = null;
    resetBobbyBrainSession();
    setPartialText("");
    setLastRecognized("");
    setBobbyText(welcome);
    setLastAiResponse(welcome);
    setCurrentEmotion("idle");
    go("IDLE");
    scheduleSleep();
  }, [childName, go, scheduleSleep]);

  useEffect(() => {
    return onNetworkChange((mode) => {
      setNetworkOffline(mode === "OFFLINE");
    });
  }, []);

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

        const reply = buildBobbyReply({
          childName,
          childAge,
          pendingNarration,
        });

        await addMessage("assistant", reply.text, reply.emotion);
        await speakReply(reply);
        onNarrationConsumed?.();
      } finally {
        processingRef.current = false;
      }
    })();
  }, [addMessage, childAge, childName, ensureSession, go, onNarrationConsumed, pendingNarration, speakReply]);

  useEffect(() => {
    return () => {
      clearSleepTimer();
      stopSttRef.current();
      stopPlayback();
      resetBobbyBrainSession();
      void closeSession();
    };
  }, [clearSleepTimer, closeSession, stopPlayback]);

  const bobbyFaceEmotion: FaceState =
    machineState === "LISTENING"
      ? "attentive"
      : machineState === "PROCESSING"
        ? "thinking"
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
        : machineState === "ERROR"
          ? 0.6
          : 0.4;

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
  };
}