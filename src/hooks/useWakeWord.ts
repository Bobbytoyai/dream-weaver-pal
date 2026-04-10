import { useRef, useCallback, useEffect } from "react";

const WAKE_WORDS = ["bobby", "boby", "bobbie", "bob y", "bo bi", "bobi"];

function normalizeTranscript(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

const NORMALIZED_WAKE_WORDS = WAKE_WORDS.map(normalizeTranscript);

/**
 * Continuous speech recognition that listens for the wake word "Bobby".
 * IMPORTANT: the first activation must come from a direct user gesture.
 * After that, it can auto-restart while the screen stays mounted.
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
  const enabledRef = useRef({ enabled, armed: false });
  const isRunningRef = useRef(false);

  useEffect(() => {
    enabledRef.current.enabled = enabled;
  }, [enabled]);

  const stopListening = useCallback(() => {
    isRunningRef.current = false;
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    restartTimerRef.current = null;
    try {
      recognitionRef.current?.abort();
    } catch {}
    recognitionRef.current = null;
  }, []);

  const startListening = useCallback((options?: { fromUserGesture?: boolean }) => {
    if (options?.fromUserGesture) {
      enabledRef.current.armed = true;
    }

    if (!enabledRef.current.enabled || !enabledRef.current.armed) {
      return false;
    }

    if (isRunningRef.current) {
      return true;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("SpeechRecognition not supported");
      return false;
    }

    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    restartTimerRef.current = null;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "fr-FR";
    recognition.maxAlternatives = 5;
    recognitionRef.current = recognition;
    isRunningRef.current = true;

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];

        for (let j = 0; j < result.length; j++) {
          const transcript = String(result[j].transcript || "").trim();
          if (!transcript) continue;

          if (!result.isFinal && onPartial) {
            onPartial(transcript);
          }

          const normalized = normalizeTranscript(transcript);
          const hasWakeWord = NORMALIZED_WAKE_WORDS.some((wakeWord) => normalized.includes(wakeWord));

          if (hasWakeWord && result.isFinal) {
            stopListening();
            onWake(transcript);
            return;
          }
        }
      }
    };

    recognition.onend = () => {
      const shouldRestart = isRunningRef.current;
      isRunningRef.current = false;
      recognitionRef.current = null;

      if (!shouldRestart || !enabledRef.current.enabled || !enabledRef.current.armed) {
        return;
      }

      restartTimerRef.current = setTimeout(() => {
        startListening();
      }, 250);
    };

    recognition.onerror = (event: any) => {
      if (event.error === "aborted") {
        return;
      }

      isRunningRef.current = false;
      recognitionRef.current = null;

      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        enabledRef.current.armed = false;
        return;
      }

      if (!enabledRef.current.enabled || !enabledRef.current.armed) {
        return;
      }

      restartTimerRef.current = setTimeout(() => {
        startListening();
      }, event.error === "no-speech" ? 200 : 1200);
    };

    try {
      recognition.start();
      return true;
    } catch (error: any) {
      isRunningRef.current = false;
      recognitionRef.current = null;

      if (error?.name === "NotAllowedError") {
        enabledRef.current.armed = false;
      }

      return false;
    }
  }, [onPartial, onWake, stopListening]);

  useEffect(() => {
    if (enabled && enabledRef.current.armed) {
      startListening();
    } else if (!enabled) {
      stopListening();
    }

    return () => {
      stopListening();
    };
  }, [enabled, startListening, stopListening]);

  return { stopListening, startListening };
}
