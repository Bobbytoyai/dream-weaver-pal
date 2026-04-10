import { useRef, useCallback, useEffect } from "react";
import { eventBus } from "@/lib/eventBus";

const WAKE_WORDS = ["bobby", "boby", "bobbie", "bob y", "bo bi", "bobi"];

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

/**
 * Computes a simple phonetic similarity score for wake word matching.
 * Returns a confidence 0-1 for the best matching wake word.
 */
function computeWakeConfidence(transcript: string): number {
  const normalized = normalizeText(transcript).replace(/\s+/g, "");
  let best = 0;
  for (const wake of WAKE_WORDS) {
    const wakeNorm = wake.replace(/\s+/g, "");
    if (normalized.includes(wakeNorm)) {
      // Exact substring match → high confidence
      best = Math.max(best, 0.95);
    } else {
      // Check for close matches (1 char difference)
      for (let i = 0; i <= normalized.length - wakeNorm.length; i++) {
        const slice = normalized.slice(i, i + wakeNorm.length);
        let diff = 0;
        for (let j = 0; j < wakeNorm.length; j++) {
          if (slice[j] !== wakeNorm[j]) diff++;
        }
        if (diff <= 1 && wakeNorm.length >= 4) {
          best = Math.max(best, 0.7);
        }
      }
    }
  }
  return best;
}

const CONFIDENCE_THRESHOLD = 0.65;

/**
 * Wake word detection engine.
 * - Anti-false-positive: phonetic confidence threshold
 * - First activation requires user gesture (browser policy)
 * - Auto-restarts continuously while enabled
 * - Emits WAKE_DETECTED with confidence score
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
    try { recognitionRef.current?.abort(); } catch {}
    recognitionRef.current = null;
  }, []);

  const startListening = useCallback((options?: { fromUserGesture?: boolean }) => {
    if (options?.fromUserGesture) {
      enabledRef.current.armed = true;
    }

    if (!enabledRef.current.enabled || !enabledRef.current.armed) return false;
    if (isRunningRef.current) return true;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("[WakeWord] SpeechRecognition not supported");
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

        // Check ALL alternatives for wake word
        let bestConfidence = 0;
        let bestTranscript = "";

        for (let j = 0; j < result.length; j++) {
          const transcript = String(result[j].transcript || "").trim();
          if (!transcript) continue;

          // Show partial text from first alternative
          if (j === 0 && !result.isFinal && onPartial) {
            onPartial(transcript);
          }

          const confidence = computeWakeConfidence(transcript);
          if (confidence > bestConfidence) {
            bestConfidence = confidence;
            bestTranscript = transcript;
          }
        }

        // React on final result with sufficient confidence
        if (bestConfidence >= CONFIDENCE_THRESHOLD && result.isFinal) {
          // Emit event immediately for < 300ms reaction
          eventBus.emit({ type: "WAKE_DETECTED", confidence: bestConfidence });
          stopListening();
          onWake(bestTranscript);
          return;
        }

        // Also react on interim results with very high confidence for speed
        if (bestConfidence >= 0.9 && !result.isFinal) {
          eventBus.emit({ type: "WAKE_DETECTED", confidence: bestConfidence });
          stopListening();
          onWake(bestTranscript);
          return;
        }
      }
    };

    recognition.onend = () => {
      const shouldRestart = isRunningRef.current;
      isRunningRef.current = false;
      recognitionRef.current = null;

      if (!shouldRestart || !enabledRef.current.enabled || !enabledRef.current.armed) return;

      // Fast restart for < 300ms gap
      restartTimerRef.current = setTimeout(() => {
        startListening();
      }, 150);
    };

    recognition.onerror = (event: any) => {
      if (event.error === "aborted") return;

      isRunningRef.current = false;
      recognitionRef.current = null;

      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        enabledRef.current.armed = false;
        return;
      }

      if (!enabledRef.current.enabled || !enabledRef.current.armed) return;

      restartTimerRef.current = setTimeout(() => {
        startListening();
      }, event.error === "no-speech" ? 150 : 1000);
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
    return () => { stopListening(); };
  }, [enabled, startListening, stopListening]);

  return { stopListening, startListening };
}
