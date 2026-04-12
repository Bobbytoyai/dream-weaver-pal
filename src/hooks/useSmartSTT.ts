/**
 * useSmartSTT — Unified STT interface using browser native SpeechRecognition.
 * 
 * No external API needed. Works offline on most devices.
 * Wraps useNativeSTT with a stable interface for useBobbyVoiceCore.
 */
import { useRef, useCallback, useEffect } from "react";
import { useNativeSTT } from "./useNativeSTT";

interface UseSmartSTTOptions {
  onPartial: (text: string) => void;
  onFinal: (text: string) => void;
  onError?: (error: string) => void;
  onUtteranceEnd?: () => void;
  onSpeechStarted?: () => void;
  language?: string;
}

export function useSmartSTT({ onPartial, onFinal, onError, onSpeechStarted, language = "fr" }: UseSmartSTTOptions) {
  const isRunningRef = useRef(false);

  const onPartialRef = useRef(onPartial);
  const onFinalRef = useRef(onFinal);
  const onErrorRef = useRef(onError);
  const onSpeechStartedRef = useRef(onSpeechStarted);
  useEffect(() => { onPartialRef.current = onPartial; }, [onPartial]);
  useEffect(() => { onFinalRef.current = onFinal; }, [onFinal]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);
  useEffect(() => { onSpeechStartedRef.current = onSpeechStarted; }, [onSpeechStarted]);

  const native = useNativeSTT({
    onPartial: useCallback((text: string) => {
      onSpeechStartedRef.current?.();
      onPartialRef.current(text);
    }, []),
    onFinal: useCallback((text: string) => {
      onFinalRef.current(text);
    }, []),
    onError: useCallback((err: string) => {
      console.warn("[SmartSTT] Native STT error:", err);
      onErrorRef.current?.(err);
    }, []),
    language: language === "fr" ? "fr-FR" : language,
  });

  const nativeStartRef = useRef(native.start);
  const nativeStopRef = useRef(native.stop);
  useEffect(() => { nativeStartRef.current = native.start; }, [native.start]);
  useEffect(() => { nativeStopRef.current = native.stop; }, [native.stop]);

  /**
   * Start STT. The externalStream parameter is accepted for API compatibility
   * but native SpeechRecognition manages its own mic access.
   */
  const start = useCallback(async (_externalStream?: MediaStream) => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    await nativeStartRef.current();
  }, []);

  const stop = useCallback(() => {
    isRunningRef.current = false;
    nativeStopRef.current();
  }, []);

  return {
    start,
    stop,
    isRunning: isRunningRef,
    backend: "native" as const,
    retryDeepgram: () => {},
    streamRef: { current: null } as React.MutableRefObject<MediaStream | null>,
  };
}
