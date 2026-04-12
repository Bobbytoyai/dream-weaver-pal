/**
 * Bobby Minimal Conversation Engine v1.0
 * 
 * PIPELINE UNIQUE — 1 input → 1 réponse → 1 output
 * ─────────────────────────────────────────────────
 * 1. Tap to Talk (bouton)
 * 2. Capture audio (MediaRecorder)
 * 3. Transcription (Deepgram REST → browser STT → fallback)
 * 4. Intent simple (mots-clés offline)
 * 5. Réponse (offline immédiat → enrichissement cloud optionnel)
 * 6. TTS (ElevenLabs → browser speechSynthesis)
 * 7. Lecture audio
 * 
 * FAILSAFE à chaque étape → ZÉRO silence
 * OFFLINE FIRST → répond toujours sans internet
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { getOfflineResponse, getWelcomeMessage, getSilencePrompt } from "@/lib/offlineBrain";
import { eventBus } from "@/lib/eventBus";
import type { FaceState } from "@/components/hologram/useFaceAnimation";

// ── Types exportés (compatibilité VoiceScreen) ─────────────
export type ConversationState = "IDLE" | "LISTENING" | "PROCESSING" | "SPEAKING" | "ERROR" | "SLEEP";
export type VoiceState = "idle" | "listening" | "processing" | "speaking" | "interrupted" | "session_end";
export type PendingNarration = null;

export const FALLBACK_FR = {
  not_heard: "Je n'ai pas bien entendu. Réessaie !",
  thinking:  "Une seconde…",
  error:     "Petit souci ! Réessaie.",
};

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

// ── Helpers TTS ────────────────────────────────────────────

/** Fallback browser TTS — toujours disponible */
function speakBrowser(text: string, onEnd?: () => void): void {
  if (!("speechSynthesis" in window)) { onEnd?.(); return; }
  speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = "fr-FR";
  utt.rate = 1.05;
  utt.pitch = 1.1;
  utt.onend = () => onEnd?.();
  utt.onerror = () => onEnd?.();
  speechSynthesis.speak(utt);
}

/** TTS principal : ElevenLabs → fallback browser */
async function speakText(
  text: string,
  voiceId?: string,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise(async (resolve) => {
    if (signal?.aborted) { resolve(); return; }

    try {
      const { fetchTTSAudio } = await import("@/lib/voicePipeline");
      const url = await fetchTTSAudio(text, signal, voiceId);
      if (signal?.aborted) { resolve(); return; }

      if (url && url !== "__silent__" && url !== "__browser_tts__" && url !== "__piper_silent__") {
        const audio = new Audio(url);
        audio.onended = () => resolve();
        audio.onerror = () => { speakBrowser(text, resolve); };
        audio.play().catch(() => speakBrowser(text, resolve));

        // Abort support
        signal?.addEventListener("abort", () => {
          audio.pause();
          resolve();
        }, { once: true });
        return;
      }
    } catch {
      if (signal?.aborted) { resolve(); return; }
    }

    // Fallback : browser TTS
    speakBrowser(text, resolve);
  });
}

// ── STT helpers ────────────────────────────────────────────

/** Browser Web Speech API — offline fallback */
function browserSTT(): Promise<string> {
  return new Promise((resolve) => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { resolve(""); return; }
    const rec = new SR();
    rec.lang = "fr-FR";
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    const timeout = setTimeout(() => { rec.stop(); resolve(""); }, 8000);
    rec.onresult = (e: any) => {
      clearTimeout(timeout);
      resolve(e.results?.[0]?.[0]?.transcript ?? "");
    };
    rec.onerror = () => { clearTimeout(timeout); resolve(""); };
    rec.onend = () => { clearTimeout(timeout); resolve(""); };
    try { rec.start(); } catch { resolve(""); }
  });
}

/** Deepgram REST transcription — online */
async function deepgramSTT(blob: Blob): Promise<string> {
  try {
    const resp = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deepgram-token`,
      { method: "POST", headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` } }
    );
    if (!resp.ok) throw new Error("token fail");
    const { key } = await resp.json();

    const tResp = await fetch(
      "https://api.deepgram.com/v1/listen?language=fr&model=nova-2&smart_format=true",
      {
        method: "POST",
        headers: { Authorization: `Token ${key}`, "Content-Type": blob.type || "audio/webm" },
        body: blob,
      }
    );
    if (!tResp.ok) throw new Error("deepgram fail");
    const data = await tResp.json();
    return data.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";
  } catch {
    return "";
  }
}

/** AI enrichissement cloud (optionnel — silently fails) */
async function askCloud(text: string, childName: string, childAge: number, signal?: AbortSignal): Promise<string> {
  try {
    const { streamVoiceChat } = await import("@/lib/voicePipeline");
    let result = "";
    await new Promise<void>((resolve, reject) => {
      streamVoiceChat({
        messages: [{ role: "user", content: text }],
        childName, childAge, mode: "chat",
        onSentence: (s) => { result += s + " "; },
        onDone: () => resolve(),
        onError: reject,
        signal,
      });
    });
    return result.trim();
  } catch {
    return "";
  }
}

// ── Main Hook ───────────────────────────────────────────────
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
  const [bobbyText,  setBobbyText]  = useState(() => getWelcomeMessage(childName));

  const stateRef     = useRef<ConversationState>("IDLE");
  const abortRef     = useRef<AbortController | null>(null);
  const recorderRef  = useRef<MediaRecorder | null>(null);
  const chunksRef    = useRef<Blob[]>([]);
  const silenceRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRunningRef = useRef(false);

  // ── Helpers ───────────────────────────────────────────────
  const go = useCallback((s: ConversationState) => {
    stateRef.current = s;
    setState(s);
    eventBus.emit({ type: "STATE_CHANGED", state: toVoiceState(s), prev: toVoiceState(stateRef.current) });
  }, []);

  const clearSilenceTimer = () => {
    if (silenceRef.current) { clearTimeout(silenceRef.current); silenceRef.current = null; }
  };

  // ── STEP 7: Lecture audio ─────────────────────────────────
  const playResponse = useCallback(async (text: string) => {
    if (!text.trim()) { go("IDLE"); return; }

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    go("SPEAKING");
    setBobbyText(text);
    eventBus.emit({ type: "SPEECH_START" });

    await speakText(text, voiceId, abortRef.current.signal);

    if (!abortRef.current.signal.aborted) {
      eventBus.emit({ type: "SPEECH_STOP" });
      go("IDLE");
      // Relance si silence après 20s
      silenceRef.current = setTimeout(() => {
        if (stateRef.current === "IDLE") {
          const prompt = getSilencePrompt();
          setBobbyText(prompt);
          playResponse(prompt);
        }
      }, 20000);
    }
  }, [go, voiceId]);

  // ── STEP 5-6: Réponse (offline first) ───────────────────
  const getResponse = useCallback(async (text: string): Promise<string> => {
    // Réponse offline instantanée
    const offline = getOfflineResponse(text, childName);

    // Si pas en ligne → retourner réponse offline
    if (!navigator.onLine) return offline;

    // En ligne → enrichissement cloud optionnel (timeout 3s)
    try {
      const cloud = await Promise.race([
        askCloud(text, childName, childAge, abortRef.current?.signal),
        new Promise<string>(r => setTimeout(() => r(""), 3000)),
      ]);
      return cloud || offline;
    } catch {
      return offline;
    }
  }, [childName, childAge]);

  // ── STEP 4: Intent + réponse ─────────────────────────────
  const processText = useCallback(async (text: string) => {
    go("PROCESSING");
    setTranscript(text);
    const response = await getResponse(text);
    await playResponse(response);
  }, [go, getResponse, playResponse]);

  // ── STEP 3: Transcription (cascade de fallbacks) ─────────
  const transcribeAudio = useCallback(async (blob: Blob): Promise<string> => {
    // Trop petit → silence, pas de parole capturée
    if (blob.size < 500) return "";

    // Online → Deepgram REST
    if (navigator.onLine) {
      const text = await deepgramSTT(blob);
      if (text.trim()) return text;
    }

    // Fallback → browser STT
    const text = await browserSTT();
    return text;
  }, []);

  // ── STEP 2: Stop recording → transcribe ─────────────────
  const stopRecording = useCallback(async () => {
    if (stateRef.current !== "LISTENING" || !recorderRef.current) return;

    go("PROCESSING");

    // Arrêter le recorder
    const recorder = recorderRef.current;
    recorderRef.current = null;

    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      try { recorder.stop(); } catch { resolve(); }
    });

    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    chunksRef.current = [];

    // Transcription
    const text = await transcribeAudio(blob);

    if (text.trim()) {
      await processText(text);
    } else {
      // Silence / non entendu → réponse fallback
      await playResponse(getOfflineResponse("", childName));
    }
  }, [go, transcribeAudio, processText, playResponse, childName]);

  // ── STEP 2: Start recording ───────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => stream.getTracks().forEach(t => t.stop());
      recorder.start(100);
      recorderRef.current = recorder;

      go("LISTENING");
      eventBus.emit({ type: "WAKE_DETECTED", confidence: 1.0 });

      // Auto-stop après 8s de silence
      setTimeout(() => {
        if (stateRef.current === "LISTENING") stopRecording();
      }, 8000);

    } catch {
      // Micro indisponible → fallback browserSTT direct
      go("LISTENING");
      const text = await browserSTT();
      if (text.trim()) {
        await processText(text);
      } else {
        await playResponse(getOfflineResponse("Coucou", childName));
      }
    }
  }, [go, stopRecording, processText, playResponse, childName]);

  // ── STEP 1: Tap to Talk ───────────────────────────────────
  const handleTapBobby = useCallback(async () => {
    clearSilenceTimer();

    if (stateRef.current === "SPEAKING" || stateRef.current === "PROCESSING") {
      // Interruption
      abortRef.current?.abort();
      speechSynthesis.cancel();
      eventBus.emit({ type: "SPEECH_STOP" });
      go("IDLE");
      return;
    }

    if (stateRef.current === "LISTENING") {
      // 2ème tap → arrêter et traiter
      await stopRecording();
      return;
    }

    // IDLE → commencer l'enregistrement
    await startRecording();
  }, [go, startRecording, stopRecording]);

  // ── Bienvenue au montage ──────────────────────────────────
  useEffect(() => {
    const welcome = getWelcomeMessage(childName);
    setBobbyText(welcome);

    // Joue le message de bienvenue
    playResponse(welcome);

    return () => {
      clearSilenceTimer();
      abortRef.current?.abort();
      speechSynthesis.cancel();
      if (recorderRef.current) {
        try { recorderRef.current.stop(); } catch {}
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Valeurs dérivées pour l'UI ───────────────────────────
  const displayState = toVoiceState(state);

  const bobbyFaceEmotion: FaceState =
    state === "SPEAKING"   ? "speaking"   :
    state === "LISTENING"  ? "listening"  :
    state === "PROCESSING" ? "thinking"   : "idle";

  const bobbyEmotionIntensity =
    state === "SPEAKING"  ? 0.9 :
    state === "LISTENING" ? 0.7 : 0.4;

  // ── Return API ────────────────────────────────────────────
  return {
    // State
    state,
    machineState:         state,
    displayState,
    transcript,
    partialText:          transcript,
    lastRecognized:       transcript,
    bobbyText,
    lastAiResponse:       bobbyText,
    emotion:              displayState,
    currentEmotion:       displayState,
    bobbyFaceEmotion,
    bobbyEmotionIntensity,
    micArmed:             state === "LISTENING",
    networkOffline:       !navigator.onLine,

    // STT compat
    sttIsRunning:  isRunningRef,
    sttBackend:    navigator.onLine ? "deepgram" : "offline",
    deepgramSTT: {
      isRunning: isRunningRef,
      backend:   navigator.onLine ? "deepgram" : "offline",
    },

    // Actions
    handleTapBobby,
    handleParentMode: onParentMode ?? (() => {}),
    startListening:   handleTapBobby,
    processTranscript: processText,
    sendMessage:       processText,
    interrupt: () => {
      abortRef.current?.abort();
      speechSynthesis.cancel();
      go("IDLE");
    },
  };
}
