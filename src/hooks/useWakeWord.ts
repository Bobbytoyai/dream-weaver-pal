import { useRef, useCallback, useEffect } from "react";

const WAKE_WORDS = ["bobby", "boby", "bobbie", "bob y", "bo bi"];

/**
 * Continuous speech recognition that listens for the wake word "Bobby".
 * When detected, returns the full transcript so the rest of the phrase
 * can be processed as a command.
 *
 * Uses Web Speech API in continuous + interimResults mode.
 */
export function useWakeWord({
  enabled,
  onWake,
  onPartial,
}: {
  enabled: boolean;
  onWake: (transcript: string) => void;
  onPartial?: (text: string) => void;
}) {
  const recognitionRef = useRef<any>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enabledRef = useRef(enabled);
  const isRunningRef = useRef(false);

  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

  const stopListening = useCallback(() => {
    isRunningRef.current = false;
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    try { recognitionRef.current?.abort(); } catch {}
    recognitionRef.current = null;
  }, []);

  const startListening = useCallback(() => {
    console.log("[WakeWord] startListening called, isRunning:", isRunningRef.current);
    if (isRunningRef.current) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("[WakeWord] SpeechRecognition NOT supported in this browser");
      return;
    }

    console.log("[WakeWord] Creating SpeechRecognition instance...");
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "fr-FR";
    recognition.maxAlternatives = 3;
    recognitionRef.current = recognition;
    isRunningRef.current = true;

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        for (let j = 0; j < result.length; j++) {
          const transcript = result[j].transcript.trim();
          const lower = transcript.toLowerCase();

          console.log(`[WakeWord] transcript: "${transcript}" (isFinal: ${result.isFinal}, alt: ${j})`);

          if (!result.isFinal && onPartial) {
            onPartial(transcript);
          }

          const hasWakeWord = WAKE_WORDS.some(w => lower.includes(w));
          console.log(`[WakeWord] hasWakeWord: ${hasWakeWord}, lower: "${lower}"`);

          if (hasWakeWord && result.isFinal) {
            console.log("[WakeWord] ✅ WAKE WORD DETECTED! Stopping listener, calling onWake");
            stopListening();
            onWake(transcript);
            return;
          }
        }
      }
    };

    recognition.onend = () => {
      console.log("[WakeWord] onend fired, enabled:", enabledRef.current, "isRunning:", isRunningRef.current);
      if (enabledRef.current && isRunningRef.current) {
        restartTimerRef.current = setTimeout(() => {
          isRunningRef.current = false;
          startListening();
        }, 300);
      } else {
        isRunningRef.current = false;
      }
    };

    recognition.onerror = (event: any) => {
      console.warn("[WakeWord] onerror:", event.error);
      if (event.error === "aborted" || event.error === "no-speech") {
        return;
      }
      isRunningRef.current = false;
      if (enabledRef.current) {
        restartTimerRef.current = setTimeout(() => {
          startListening();
        }, 2000);
      }
    };

    try {
      recognition.start();
      console.log("[WakeWord] recognition.start() called successfully");
    } catch (e) {
      console.error("[WakeWord] recognition.start() failed:", e);
      isRunningRef.current = false;
    }
  }, [onWake, onPartial, stopListening]);

  // Auto-start/stop based on enabled prop
  useEffect(() => {
    if (enabled) {
      startListening();
    } else {
      stopListening();
    }
    return () => { stopListening(); };
  }, [enabled, startListening, stopListening]);

  return { stopListening, startListening };
}
