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
      // Check all results for wake word
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        // Check all alternatives
        for (let j = 0; j < result.length; j++) {
          const transcript = result[j].transcript.trim();
          const lower = transcript.toLowerCase();

          // Show partial text
          if (!result.isFinal && onPartial) {
            onPartial(transcript);
          }

          // Check for wake word in any alternative
          const hasWakeWord = WAKE_WORDS.some(w => lower.includes(w));

          if (hasWakeWord && result.isFinal) {
            // Stop continuous listening, pass full transcript
            stopListening();
            onWake(transcript);
            return;
          }
        }
      }
    };

    recognition.onend = () => {
      // Auto-restart if still enabled (browser stops after silence)
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
      if (event.error === "aborted" || event.error === "no-speech") {
        // Normal — will auto-restart via onend
        return;
      }
      console.warn("Wake word STT error:", event.error);
      isRunningRef.current = false;
      // Retry after delay
      if (enabledRef.current) {
        restartTimerRef.current = setTimeout(() => {
          startListening();
        }, 2000);
      }
    };

    try {
      recognition.start();
    } catch {
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
