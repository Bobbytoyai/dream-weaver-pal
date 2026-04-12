/**
 * useNativeSTT — Speech-to-text using browser's native SpeechRecognition API.
 * 
 * - No API key needed
 * - French language optimized
 * - Streaming partial + final transcripts
 * - Auto-restart for continuous listening
 * - Works in Chrome, Edge, Safari
 */
import { useRef, useCallback, useEffect } from "react";

interface UseNativeSTTOptions {
  onPartial: (text: string) => void;
  onFinal: (text: string) => void;
  onError?: (error: string) => void;
  language?: string;
}

export function useNativeSTT({ onPartial, onFinal, onError, language = "fr-FR" }: UseNativeSTTOptions) {
  const recognitionRef = useRef<any>(null);
  const isRunningRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onPartialRef = useRef(onPartial);
  const onFinalRef = useRef(onFinal);
  const onErrorRef = useRef(onError);
  const shouldBeRunningRef = useRef(false);

  useEffect(() => { onPartialRef.current = onPartial; }, [onPartial]);
  useEffect(() => { onFinalRef.current = onFinal; }, [onFinal]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  const stop = useCallback(() => {
    shouldBeRunningRef.current = false;
    isRunningRef.current = false;
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    try { recognitionRef.current?.abort(); } catch {}
    recognitionRef.current = null;
  }, []);

  const start = useCallback(async () => {
    if (isRunningRef.current) return;
    shouldBeRunningRef.current = true;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("[NativeSTT] SpeechRecognition not supported");
      onErrorRef.current?.("Speech recognition not supported in this browser");
      return;
    }

    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;
    isRunningRef.current = true;

    recognition.onresult = (event: any) => {
      // Guard: ignore results if stop() was already called (race condition)
      if (!shouldBeRunningRef.current) {
        console.warn("[NativeSTT] 🔇 Ignoring result after stop()");
        return;
      }
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = String(result[0]?.transcript || "").trim();
        if (!transcript) continue;

        if (result.isFinal) {
          console.log("[NativeSTT] Final:", transcript);
          onFinalRef.current(transcript);
        } else {
          onPartialRef.current(transcript);
        }
      }
    };

    recognition.onend = () => {
      const wasRunning = isRunningRef.current;
      isRunningRef.current = false;
      recognitionRef.current = null;

      // Auto-restart if should still be running
      if (wasRunning && shouldBeRunningRef.current) {
        restartTimerRef.current = setTimeout(() => {
          if (shouldBeRunningRef.current) {
            start();
          }
        }, 100);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === "aborted") return;

      isRunningRef.current = false;
      recognitionRef.current = null;

      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        shouldBeRunningRef.current = false;
        onErrorRef.current?.("Microphone access denied");
        return;
      }

      // Auto-restart on transient errors
      if (shouldBeRunningRef.current) {
        restartTimerRef.current = setTimeout(() => {
          if (shouldBeRunningRef.current) {
            start();
          }
        }, event.error === "no-speech" ? 100 : 500);
      }
    };

    try {
      recognition.start();
      console.log("[NativeSTT] Started listening");
    } catch (error: any) {
      isRunningRef.current = false;
      recognitionRef.current = null;
      console.error("[NativeSTT] Start error:", error);
      onErrorRef.current?.(error?.message || "Failed to start speech recognition");
    }
  }, [language, stop]);

  useEffect(() => {
    return () => { stop(); };
  }, [stop]);

  return { start, stop, isRunning: isRunningRef };
}
