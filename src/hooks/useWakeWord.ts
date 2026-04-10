import { useRef, useCallback, useEffect } from "react";
import { eventBus } from "@/lib/eventBus";

// ─── Extended wake word variants for child speech tolerance ───
const WAKE_WORDS = [
  "bobby", "boby", "bobbie", "bob y", "bo bi", "bobi", "babi", "bobe",
  "bob", "booby", "bobee", "bobé", "bo by", "bob bee", "bobee",
  "bobbyyy", "bobbi", "bobiii", "baubee", "baubi", "bauby",
  "bobey", "bobay", "bubi", "buby", "bubbi", "bubby",
  "boobee", "boobi", "boobie", "babby", "babie", "baby bobby",
  "bo bee", "bob e", "bob i", "bobb", "obby", "obbie",
];

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

// ─── Phonetic encoding for fuzzy matching ───
function phoneticEncode(word: string): string {
  return word
    .replace(/ph/g, "f")
    .replace(/ck/g, "k")
    .replace(/ee|ea|ie|ey|ay|ey/g, "i")
    .replace(/oo|ou/g, "u")
    .replace(/bb/g, "b")
    .replace(/tt/g, "t")
    .replace(/dd/g, "d")
    .replace(/y$/g, "i")
    .replace(/au|eau/g, "o")
    .replace(/[aeiou]+/g, (m) => m[0]) // collapse consecutive vowels
    .replace(/(.)\1+/g, "$1"); // collapse repeated chars
}

/**
 * Computes phonetic similarity confidence for wake word matching.
 * Multi-pass: exact substring → phonetic match → Levenshtein distance.
 * Returns confidence 0–1 for the best matching wake word.
 */
function computeWakeConfidence(transcript: string): number {
  const normalized = normalizeText(transcript).replace(/\s+/g, "");
  const phoneticInput = phoneticEncode(normalized);
  let best = 0;

  for (const wake of WAKE_WORDS) {
    const wakeNorm = wake.replace(/\s+/g, "");
    const wakePhonetic = phoneticEncode(wakeNorm);

    // Pass 1: exact substring match
    if (normalized.includes(wakeNorm)) {
      best = Math.max(best, 0.95);
      continue;
    }

    // Pass 2: phonetic substring match
    if (phoneticInput.includes(wakePhonetic) && wakePhonetic.length >= 2) {
      best = Math.max(best, 0.88);
      continue;
    }

    // Pass 3: sliding window with char diff tolerance
    for (let i = 0; i <= normalized.length - wakeNorm.length; i++) {
      const slice = normalized.slice(i, i + wakeNorm.length);
      let diff = 0;
      for (let j = 0; j < wakeNorm.length; j++) {
        if (slice[j] !== wakeNorm[j]) diff++;
      }
      if (diff === 0) {
        best = Math.max(best, 0.95);
      } else if (diff === 1 && wakeNorm.length >= 3) {
        best = Math.max(best, 0.78);
      } else if (diff === 2 && wakeNorm.length >= 5) {
        best = Math.max(best, 0.65);
      }
    }

    // Pass 4: phonetic sliding window
    for (let i = 0; i <= phoneticInput.length - wakePhonetic.length; i++) {
      const slice = phoneticInput.slice(i, i + wakePhonetic.length);
      let diff = 0;
      for (let j = 0; j < wakePhonetic.length; j++) {
        if (slice[j] !== wakePhonetic[j]) diff++;
      }
      if (diff <= 1 && wakePhonetic.length >= 2) {
        best = Math.max(best, 0.82);
      }
    }
  }
  return best;
}

export type WakeSensitivity = "low" | "medium" | "high";

const SENSITIVITY_THRESHOLDS: Record<WakeSensitivity, { final: number; interim: number }> = {
  high:   { final: 0.55, interim: 0.62 },  // child-friendly: very tolerant
  medium: { final: 0.65, interim: 0.72 },  // balanced
  low:    { final: 0.78, interim: 0.85 },  // strict: fewer false positives
};

/**
 * Wake word detection engine.
 * - Multi-pass phonetic confidence matching
 * - Configurable sensitivity (high = child-friendly default)
 * - First activation requires user gesture (browser policy)
 * - Interim detection for <300ms response
 * - Auto-restarts continuously while enabled
 * - Emits WAKE_DETECTED with confidence score
 */
export function useWakeWord({
  enabled,
  onWake,
  onPartial,
  sensitivity = "high",
}: {
  enabled: boolean;
  onWake: (transcript: string) => void;
  onPartial?: (text: string) => void;
  sensitivity?: WakeSensitivity;
}) {
  const recognitionRef = useRef<any>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enabledRef = useRef({ enabled, armed: false });
  const isRunningRef = useRef(false);
  const sensitivityRef = useRef(sensitivity);

  useEffect(() => {
    enabledRef.current.enabled = enabled;
  }, [enabled]);

  useEffect(() => {
    sensitivityRef.current = sensitivity;
  }, [sensitivity]);

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
      const thresholds = SENSITIVITY_THRESHOLDS[sensitivityRef.current];

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
        if (bestConfidence >= thresholds.final && result.isFinal) {
          eventBus.emit({ type: "WAKE_DETECTED", confidence: bestConfidence });
          stopListening();
          onWake(bestTranscript);
          return;
        }

        // React on interim results for speed (<300ms response)
        if (bestConfidence >= thresholds.interim && !result.isFinal) {
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

      // Fast restart for minimal gap
      restartTimerRef.current = setTimeout(() => {
        startListening();
      }, 120);
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
      }, event.error === "no-speech" ? 120 : 800);
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
