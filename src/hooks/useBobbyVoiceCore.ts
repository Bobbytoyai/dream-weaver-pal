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
import { useConversationRecorder } from "./useConversationRecorder";

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
  const lastAiResponseRef = useRef(welcomeMessage);
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
  const lastSpeechEndRef = useRef(0);
  // Track ALL recent Bobby messages for anti-echo (not just the last one)
  const recentBobbyMessagesRef = useRef<string[]>([]);
  const handledNarrationIdRef = useRef<string | null>(null);
  const sessionOpenRef = useRef(false);
  const startListeningRef = useRef<() => Promise<void>>(async () => {});

  const { startSession, addMessage, endSession, sessionIdRef } = useSessionTracker(childName, childAge);
  const { startRecording, stopRecording } = useConversationRecorder();

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
  }, []);

  const closeSession = useCallback(async () => {
    if (!sessionOpenRef.current) return;
    // Stop recording and upload audio
    if (sessionIdRef.current) {
      const audioPath = await stopRecording(sessionIdRef.current);
      if (audioPath) {
        console.log("[BobbyVoiceCore] 🎙️ Audio saved:", audioPath);
      }
    }
    await endSession();
    sessionOpenRef.current = false;
    eventBus.emit({ type: "SESSION_END" });
  }, [endSession, stopRecording, sessionIdRef]);

  const ensureSession = useCallback(async () => {
    if (sessionOpenRef.current && sessionIdRef.current) return sessionIdRef.current;

    const sessionId = await startSession();
    if (sessionId) {
      sessionOpenRef.current = true;
      eventBus.emit({ type: "SESSION_START" });
      // Start recording the conversation audio
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

  // Track consecutive silence timeouts to know when to end conversation
  const silenceCountRef = useRef(0);

  const speakReply = useCallback(async (reply: BobbyBrainReply) => {
    stopPlayback();

    // ─── CRITICAL: Stop STT before Bobby speaks to prevent self-listening ───
    stopSttRef.current();
    setMicArmed(false);

    const controller = new AbortController();
    abortRef.current = controller;

    setCurrentEmotion(reply.emotion);
    setBobbyText(reply.text);
    setLastAiResponse(reply.text);
    lastAiResponseRef.current = reply.text;
    // Track last 5 Bobby messages for multi-message anti-echo
    recentBobbyMessagesRef.current = [
      reply.text.toLowerCase(),
      ...recentBobbyMessagesRef.current.slice(0, 4),
    ];
    go("SPEAKING");
    eventBus.emit({ type: "RESPONSE_READY", text: reply.text });
    eventBus.emit({ type: "SPEECH_START" });

    // Double-stop STT to be absolutely sure it's off during playback
    stopSttRef.current();

    try {
      const audioUrl = await fetchTTSAudio(reply.text, controller.signal, resolveVoiceProfile(parentSettings));
      if (!controller.signal.aborted) {
        // Stop STT again right before playback (belt and suspenders)
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
      silenceCountRef.current = 0;
      // ─── Wait 1.5s after Bobby finishes before restarting STT ───
      // This ensures the speaker audio fully dissipates before mic listens
      console.log("[BobbyVoiceCore] 🔄 Waiting 1500ms before restarting listening");
      await new Promise(r => setTimeout(r, 1500));
      // Verify we're still in SPEAKING state (user hasn't interrupted)
      if (!abortRef.current?.signal.aborted && machineRef.current === "SPEAKING") {
        void startListeningRef.current();
      }
    }
  }, [go, parentSettings, stopPlayback]);

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

  const handleFinalTranscript = useCallback(async (text: string) => {
    const trimmedText = text.trim();
    if (!trimmedText) {
      handleSttError("EMPTY_TRANSCRIPT");
      return;
    }

    // ─── HARD BLOCK: reject if Bobby is speaking or processing ───
    if (machineRef.current === "SPEAKING" || machineRef.current === "PROCESSING") {
      console.warn("[BobbyVoiceCore] 🔇 Rejected transcript during", machineRef.current, "state:", trimmedText.slice(0, 40));
      return;
    }

    // ─── Cooldown: reject transcripts arriving too soon after Bobby stopped speaking ───
    const msSinceSpeech = Date.now() - lastSpeechEndRef.current;
    if (msSinceSpeech < 1500) {
      console.warn("[BobbyVoiceCore] 🔇 Anti-echo cooldown: rejected transcript", msSinceSpeech, "ms after speech end");
      return;
    }

    // ─── Anti-echo: reject transcript if it's nearly identical to Bobby's last message ───
    // Only reject at very high similarity (>0.7) to avoid blocking legitimate user input
    const incoming = trimmedText.toLowerCase();
    const incomingWords = incoming.split(/\s+/).filter(w => w.length > 2); // ignore short words
    for (const recentMsg of recentBobbyMessagesRef.current) {
      if (recentMsg.length < 15) continue;
      const bobbyWords = new Set(recentMsg.split(/\s+/).filter(w => w.length > 2));
      const matchCount = incomingWords.filter(w => bobbyWords.has(w)).length;
      const similarity = matchCount / Math.max(incomingWords.length, 1);
      if (similarity > 0.7) {
        console.warn("[BobbyVoiceCore] 🔇 Anti-echo: rejected (similarity:", similarity.toFixed(2), "):", trimmedText.slice(0, 50));
        processingRef.current = false;
        void startListeningRef.current();
        return;
      }
    }

    if (processingRef.current) return;
    processingRef.current = true;

    try {
      if (listenTimeoutRef.current) { clearTimeout(listenTimeoutRef.current); listenTimeoutRef.current = null; }
      stopSttRef.current();
      setMicArmed(false);
      setPartialText("");
      setLastRecognized(trimmedText);
      setCurrentEmotion("thinking");
      go("PROCESSING");
      eventBus.emit({ type: "VOICE_INPUT", transcript: trimmedText });

      await ensureSession();
      await addMessage("user", trimmedText);

      const reply = buildBobbyReply({ childName, childAge, userText: trimmedText, parentSettings });
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

    // 60s silence watchdog — if no speech, Bobby relaunches the child
    if (listenTimeoutRef.current) clearTimeout(listenTimeoutRef.current);
    listenTimeoutRef.current = setTimeout(() => {
      if (machineRef.current !== "LISTENING") return;
      silenceCountRef.current++;

      if (silenceCountRef.current >= 1) {
        // Already waited once — end conversation silently
        console.log("[BobbyVoiceCore] Silence timeout — ending conversation");
        stopSttRef.current();
        setMicArmed(false);
        setPartialText("");
        setCurrentEmotion("idle");
        go("IDLE");
        void closeSession();
        scheduleSleep();
        return;
      }

      // First timeout — show text prompt only, NO SPEECH (avoids echo loop)
      console.log("[BobbyVoiceCore] 60s silence — showing text prompt (no speech)");
      setBobbyText(`${childName}, touche Bobby si tu veux me parler ! 😊`);
      setCurrentEmotion("idle");
      stopSttRef.current();
      setMicArmed(false);
      go("IDLE");
      scheduleSleep();
    }, 60_000);

    try {
      // Native SpeechRecognition manages its own mic — just start it
      await smartSTT.start();
      console.log("[BobbyVoiceCore] ✅ Native STT started");
    } catch (err: any) {
      handleSttError("STT_START_FAILED");
    }
  }, [childName, clearSleepTimer, closeSession, go, handleSttError, scheduleSleep, smartSTT, speakReply, stopPlayback]);

  // Keep the ref in sync so speakReply can call it without circular deps
  useEffect(() => { startListeningRef.current = startListening; }, [startListening]);

  const interrupt = useCallback(() => {
    processingRef.current = false;
    if (listenTimeoutRef.current) { clearTimeout(listenTimeoutRef.current); listenTimeoutRef.current = null; }
    stopSttRef.current();
    setMicArmed(false);
    setPartialText("");
    stopPlayback();
    setCurrentEmotion("idle");
    go("IDLE");
    scheduleSleep();
  }, [go, scheduleSleep, stopPlayback]);

  const wakeWordEnabled = false;

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
    lastAiResponseRef.current = welcome;
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

  useEffect(() => {
    return () => {
      clearSleepTimer();
      if (listenTimeoutRef.current) clearTimeout(listenTimeoutRef.current);
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
    wakeWordEnabled,
  };
}