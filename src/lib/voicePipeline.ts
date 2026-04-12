/**
 * Voice Pipeline v4 — 100% Offline TTS
 * 
 * Pipeline: Piper TTS → Browser Web Speech API (fallback)
 * No external API calls. Zero network dependency.
 */

import { useCallback, useRef } from "react";
import { piperSpeak, piperPreview } from "./piperTTS";
import { getCachedTTSAudio, makeCacheKey } from "./ttsCache";

// ─── Safety filters ─────────────────────────────────────────
const UNSAFE_PATTERNS = [
  /\b(mourir|mort|tuer|sang|arme|fusil|couteau|drogue|alcool|sexe)\b/i,
];

const LEADING_FILLER_PATTERN = /^(?:(?:h+m+|hmm+|euh+|oh+|ohhh+|ah+)[\s,.!…-]*)+/i;

function sanitizeSpokenText(text: string): string {
  return text
    .replace(LEADING_FILLER_PATTERN, "")
    .replace(/\b(?:h+m+|hmm+|euh+)\b[\s,.!…-]*/gi, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([,.!?…])\s*/g, "$1 ")
    .trim();
}

function filterSentence(text: string): string | null {
  const cleaned = sanitizeSpokenText(text);
  if (cleaned.length < 2) return null;
  for (const pattern of UNSAFE_PATTERNS) {
    if (pattern.test(cleaned)) return null;
  }
  return cleaned;
}

// ─── Voice profiles ─────────────────────────────────────────
export type VoiceProfile = "child" | "female" | "male" | "sister" | "brother";
export type Emotion = "happy" | "sad" | "scared" | "excited" | "calm" | "curious" | "angry" | "bored";

// ─── TTS Audio Cache (in-memory) ────────────────────────────
const audioCache = new Map<string, string>();
const MAX_CACHE_SIZE = 100;

function getCacheKey(text: string, profile: VoiceProfile, emotion?: Emotion): string {
  return `${profile}:${emotion || "neutral"}:${text.toLowerCase().trim()}`;
}

function cacheAudio(key: string, blobUrl: string) {
  if (audioCache.size >= MAX_CACHE_SIZE) {
    const first = audioCache.keys().next().value;
    if (first) {
      URL.revokeObjectURL(audioCache.get(first)!);
      audioCache.delete(first);
    }
  }
  audioCache.set(key, blobUrl);
}

// ─── Browser TTS (fallback) ─────────────────────────────────
function speakWithBrowserTTS(text: string): Promise<string> {
  const spokenText = sanitizeSpokenText(text);
  if (!spokenText) return Promise.resolve("__browser_tts__");

  return new Promise((resolve, reject) => {
    if (!("speechSynthesis" in window)) {
      reject(new Error("Browser TTS not supported"));
      return;
    }
    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.lang = "fr-FR";
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.onend = () => resolve("__browser_tts__");
    utterance.onerror = () => reject(new Error("Browser TTS error"));
    speechSynthesis.speak(utterance);
  });
}

// ─── Public TTS API ─────────────────────────────────────────
/**
 * Fetch TTS audio — 100% offline.
 * Pipeline: Cache → Piper TTS → Browser TTS
 */
export async function fetchTTSAudio(
  text: string,
  signal?: AbortSignal,
  voiceId?: string,
  emotion?: Emotion,
  speedOverride?: "slow" | "normal" | "fast",
  _calmMode?: boolean
): Promise<string> {
  const spokenText = sanitizeSpokenText(text);
  if (!spokenText) return "__silent__";
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  const profile = (voiceId as VoiceProfile) || "female";

  // 1. Check in-memory cache
  const cacheKey = getCacheKey(spokenText, profile, emotion);
  const cached = audioCache.get(cacheKey);
  if (cached) return cached;

  // 2. Check persistent cache (IndexedDB)
  try {
    const persistentCached = await getCachedTTSAudio(spokenText, profile);
    if (persistentCached) {
      console.log("[TTS] ⚡ Persistent cache hit!");
      return persistentCached;
    }
  } catch { /* non-critical */ }

  // 3. Piper TTS (local WASM)
  try {
    const url = await piperSpeak(spokenText, profile, signal);
    if (spokenText.length < 80) cacheAudio(cacheKey, url);
    return url;
  } catch (e: any) {
    if (e.name === "AbortError") throw e;
    console.warn("[TTS] Piper failed, falling back to browser TTS:", e.message);
  }

  // 4. Browser Web Speech API (last resort)
  return speakWithBrowserTTS(spokenText);
}

/**
 * Preview a voice profile (for settings screen)
 */
export async function previewVoiceProfile(profile: VoiceProfile): Promise<void> {
  const previewTexts: Record<VoiceProfile, string> = {
    child: "Salut ! Je suis Bobby ! On va bien s'amuser ensemble, hein ?",
    female: "Bonjour mon cœur ! Je suis là pour toi, on va passer un super moment !",
    male: "Hey bonhomme ! C'est Bobby. Je suis là, tu peux compter sur moi.",
    sister: "Hey ! C'est moi ta grande sœur Bobby ! Allez, on s'amuse ?",
    brother: "Yo ! C'est ton grand frère Bobby ! Prêt pour l'aventure ?",
  };
  const text = previewTexts[profile];
  try {
    await piperPreview(profile);
  } catch {
    await speakWithBrowserTTS(text);
  }
}

// ─── Emotion detection from text (for TTS modulation) ───────
export function detectEmotionForTTS(text: string): Emotion | undefined {
  const lower = text.toLowerCase();
  if (/triste|pleure|mal|manque|malheureux/.test(lower)) return "sad";
  if (/peur|effrayé|cauchemar|noir|monstre/.test(lower)) return "scared";
  if (/ennui|ennuie|rien à faire/.test(lower)) return "bored";
  if (/content|super|génial|trop bien|cool|adore|aime|heureux|yay/.test(lower)) return "happy";
  if (/pourquoi|comment|c'est quoi|sais pas/.test(lower)) return "curious";
  if (/wow|waouh|incroyable|fou|dingue/.test(lower)) return "excited";
  if (/colère|énervé|fâché|énerve|rage|grrr/.test(lower)) return "angry";
  if (/dodo|dormir|nuit|fatigué|sommeil|calme/.test(lower)) return "calm";
  return undefined;
}

// ─── Audio Queue ────────────────────────────────────────────
export function useAudioQueue() {
  const queueRef = useRef<string[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);
  const onAllDoneRef = useRef<(() => void) | null>(null);
  const volumeRef = useRef(1.0);

  const playNext = useCallback(() => {
    if (queueRef.current.length === 0) {
      isPlayingRef.current = false;
      onAllDoneRef.current?.();
      return;
    }

    const url = queueRef.current.shift()!;

    if (url === "__browser_tts__" || url === "__silent__" || url === "__piper_silent__") {
      playNext();
      return;
    }

    const audio = new Audio(url);
    audio.volume = volumeRef.current;
    currentAudioRef.current = audio;

    audio.onended = () => {
      if (!audioCache.has(url)) URL.revokeObjectURL(url);
      currentAudioRef.current = null;
      playNext();
    };

    audio.onerror = () => {
      if (!audioCache.has(url)) URL.revokeObjectURL(url);
      currentAudioRef.current = null;
      playNext();
    };

    audio.play().catch(() => {
      if (!audioCache.has(url)) URL.revokeObjectURL(url);
      currentAudioRef.current = null;
      playNext();
    });
  }, []);

  const enqueue = useCallback((audioUrl: string) => {
    queueRef.current.push(audioUrl);
    if (!isPlayingRef.current) {
      isPlayingRef.current = true;
      playNext();
    }
  }, [playNext]);

  const stopAll = useCallback(() => {
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    queueRef.current.forEach(url => {
      if (url !== "__browser_tts__" && url !== "__silent__" && url !== "__piper_silent__" && !audioCache.has(url)) {
        URL.revokeObjectURL(url);
      }
    });
    queueRef.current = [];
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    isPlayingRef.current = false;
  }, []);

  const setOnAllDone = useCallback((cb: () => void) => {
    onAllDoneRef.current = cb;
  }, []);

  const setVolume = useCallback((v: number) => {
    volumeRef.current = Math.max(0, Math.min(1, v));
    if (currentAudioRef.current) currentAudioRef.current.volume = volumeRef.current;
  }, []);

  return { enqueue, stopAll, setOnAllDone, setVolume, isPlaying: isPlayingRef };
}
