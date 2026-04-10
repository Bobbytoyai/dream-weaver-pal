/**
 * useSmartSTT — Unified STT with automatic fallback.
 * 
 * Priority: Deepgram (streaming, high quality) → Native browser STT (fallback)
 * Auto-switches if Deepgram fails 2+ times consecutively.
 * Auto-switches to native when OFFLINE (no internet).
 * Can be forced back to Deepgram via retry.
 */
import { useRef, useCallback, useEffect, useState } from "react";
import { useDeepgramSTT } from "./useDeepgramSTT";
import { useNativeSTT } from "./useNativeSTT";
import { isOffline, onNetworkChange } from "@/lib/offlineEngine";

type STTBackend = "deepgram" | "native";

interface UseSmartSTTOptions {
  onPartial: (text: string) => void;
  onFinal: (text: string) => void;
  onError?: (error: string) => void;
  onUtteranceEnd?: () => void;
  onSpeechStarted?: () => void;
  language?: string;
}

const MAX_DEEPGRAM_FAILURES = 2;

export function useSmartSTT({ onPartial, onFinal, onError, onUtteranceEnd, onSpeechStarted, language = "fr" }: UseSmartSTTOptions) {
  const [backend, setBackend] = useState<STTBackend>(isOffline() ? "native" : "deepgram");
  const deepgramFailCountRef = useRef(0);
  const activeBackendRef = useRef<STTBackend>(isOffline() ? "native" : "deepgram");
  const isRunningRef = useRef(false);
  const preferredBackendRef = useRef<STTBackend>("deepgram"); // what user wants when online

  const onPartialRef = useRef(onPartial);
  const onFinalRef = useRef(onFinal);
  const onErrorRef = useRef(onError);
  const onUtteranceEndRef = useRef(onUtteranceEnd);
  const onSpeechStartedRef = useRef(onSpeechStarted);
  useEffect(() => { onPartialRef.current = onPartial; }, [onPartial]);
  useEffect(() => { onFinalRef.current = onFinal; }, [onFinal]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);
  useEffect(() => { onUtteranceEndRef.current = onUtteranceEnd; }, [onUtteranceEnd]);
  useEffect(() => { onSpeechStartedRef.current = onSpeechStarted; }, [onSpeechStarted]);

  // ─── Auto-switch on network change ───
  useEffect(() => {
    return onNetworkChange((mode) => {
      if (mode === "OFFLINE") {
        console.log("[SmartSTT] 🔌 Network offline → switching to native STT");
        activeBackendRef.current = "native";
        setBackend("native");
      } else {
        // Restore preferred backend when back online
        console.log("[SmartSTT] 🌐 Network online → restoring Deepgram");
        deepgramFailCountRef.current = 0;
        activeBackendRef.current = preferredBackendRef.current;
        setBackend(preferredBackendRef.current);
      }
    });
  }, []);

  // Reset failure count on successful transcription
  const handleDeepgramFinal = useCallback((text: string) => {
    deepgramFailCountRef.current = 0; // success resets counter
    onFinalRef.current(text);
  }, []);

  const handleDeepgramError = useCallback((err: string) => {
    deepgramFailCountRef.current++;
    console.warn(`[SmartSTT] Deepgram error #${deepgramFailCountRef.current}: ${err}`);

    if (deepgramFailCountRef.current >= MAX_DEEPGRAM_FAILURES) {
      console.log("[SmartSTT] ⚠️ Switching to native STT fallback");
      activeBackendRef.current = "native";
      setBackend("native");
      onErrorRef.current?.("Deepgram indisponible, mode fallback activé");
    }
  }, []);

  const deepgram = useDeepgramSTT({
    onPartial: useCallback((text: string) => onPartialRef.current(text), []),
    onFinal: handleDeepgramFinal,
    onError: handleDeepgramError,
    onUtteranceEnd: useCallback(() => onUtteranceEndRef.current?.(), []),
    onSpeechStarted: useCallback(() => onSpeechStartedRef.current?.(), []),
    language,
  });

  const native = useNativeSTT({
    onPartial: useCallback((text: string) => onPartialRef.current(text), []),
    onFinal: useCallback((text: string) => onFinalRef.current(text), []),
    onError: useCallback((err: string) => {
      console.warn("[SmartSTT] Native STT error:", err);
      onErrorRef.current?.(err);
    }, []),
    language: language === "fr" ? "fr-FR" : language,
  });

  const start = useCallback(async () => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;

    // Force native if offline
    if (isOffline()) {
      activeBackendRef.current = "native";
      setBackend("native");
      await native.start();
      return;
    }

    if (activeBackendRef.current === "deepgram") {
      try {
        await deepgram.start();
      } catch {
        // If Deepgram fails to start, immediately fallback
        console.log("[SmartSTT] Deepgram start failed, using native");
        activeBackendRef.current = "native";
        setBackend("native");
        await native.start();
      }
    } else {
      await native.start();
    }
  }, [deepgram, native]);

  const stop = useCallback(() => {
    isRunningRef.current = false;
    deepgram.stop();
    native.stop();
  }, [deepgram, native]);

  // When backend changes while running, swap live
  useEffect(() => {
    if (!isRunningRef.current) return;

    if (backend === "native") {
      deepgram.stop();
      native.start();
    } else {
      native.stop();
      deepgram.start();
    }
  }, [backend, deepgram, native]);

  const retryDeepgram = useCallback(() => {
    if (isOffline()) return; // Don't retry when offline
    deepgramFailCountRef.current = 0;
    activeBackendRef.current = "deepgram";
    preferredBackendRef.current = "deepgram";
    setBackend("deepgram");
    console.log("[SmartSTT] 🔄 Retrying Deepgram");
  }, []);

  return {
    start,
    stop,
    isRunning: isRunningRef,
    backend,
    retryDeepgram,
  };
}
