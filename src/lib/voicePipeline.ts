/**
 * Voice Pipeline v3 — Emotional TTS with preloading & caching
 * 
 * Features:
 * - Emotion-aware TTS (adjusts voice dynamically)
 * - Audio cache for frequent phrases (instant playback)
 * - Voice preloading on profile switch (no gap)
 * - Fallback cascade: ElevenLabs → Piper → Browser TTS
 */

import { useCallback, useRef } from "react";
import { piperSpeak, piperPreview } from "./piperTTS";
import { isOffline } from "./offlineEngine";
import { getCachedTTSAudio, makeCacheKey } from "./ttsCache";

const BOBBY_BRAIN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bobby-brain`;
const ELEVENLABS_TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts-stream`;

type AiMsg = { role: "user" | "assistant"; content: string };

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

// ─── TTS Audio Cache ────────────────────────────────────────
// Cache frequently used phrases to avoid API calls
const audioCache = new Map<string, string>(); // key → blob URL
const MAX_CACHE_SIZE = 30;

function getCacheKey(text: string, profile: VoiceProfile, emotion?: Emotion): string {
  return `${profile}:${emotion || "neutral"}:${text.toLowerCase().trim()}`;
}

function cacheAudio(key: string, blobUrl: string) {
  if (audioCache.size >= MAX_CACHE_SIZE) {
    // Evict oldest entry
    const first = audioCache.keys().next().value;
    if (first) {
      URL.revokeObjectURL(audioCache.get(first)!);
      audioCache.delete(first);
    }
  }
  audioCache.set(key, blobUrl);
}

// ─── ElevenLabs TTS (primary) ───────────────────────────────
async function fetchElevenLabsTTS(
  text: string,
  voiceProfile: VoiceProfile,
  signal?: AbortSignal,
  emotion?: Emotion,
  speedOverride?: "slow" | "normal" | "fast",
  calmMode?: boolean
): Promise<string> {
  const spokenText = sanitizeSpokenText(text);
  if (!spokenText) return "__silent__";

  // Check cache first
  const cacheKey = getCacheKey(spokenText, voiceProfile, emotion);
  const cached = audioCache.get(cacheKey);
  if (cached) return cached;

  // Create a timeout signal (8s max) merged with caller signal
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), 8000);
  const mergedSignal = signal
    ? AbortSignal.any?.([signal, timeoutController.signal]) ?? signal
    : timeoutController.signal;

  const response = await fetch(ELEVENLABS_TTS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({
      text: spokenText,
      voiceProfile,
      ...(emotion ? { emotion } : {}),
      ...(speedOverride && speedOverride !== "normal" ? { speedOverride } : {}),
      ...(calmMode ? { calmMode: true } : {}),
    }),
    signal: mergedSignal,
  });
  clearTimeout(timeoutId);

  if (!response.ok) {
    throw new Error(`ElevenLabs TTS error: ${response.status}`);
  }

  // Check if the edge function returned a fallback JSON instead of audio
  const contentType = response.headers.get("Content-Type") || "";
  if (contentType.includes("application/json")) {
    const data = await response.json();
    if (data.fallback) {
      throw new Error("TTS_SERVICE_UNAVAILABLE");
    }
    throw new Error(data.error || "TTS error");
  }

  const audioBlob = await response.blob();
  const blobUrl = URL.createObjectURL(audioBlob);

  // Cache short phrases (likely to be reused)
  if (spokenText.length < 80) {
    cacheAudio(cacheKey, blobUrl);
  }

  return blobUrl;
}

// ─── Browser TTS (last resort fallback) ─────────────────────
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
 * Fetch TTS audio with emotion support.
 * Tries: ElevenLabs → Piper → Browser TTS
 */
export async function fetchTTSAudio(
  text: string,
  signal?: AbortSignal,
  voiceId?: string,
  emotion?: Emotion,
  speedOverride?: "slow" | "normal" | "fast",
  calmMode?: boolean
): Promise<string> {
  const spokenText = sanitizeSpokenText(text);
  if (!spokenText) return "__silent__";
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  const profile = (voiceId as VoiceProfile) || "female";
  const offline = isOffline();

  // ─── CHECK PERSISTENT CACHE (IndexedDB) — instant playback ───
  try {
    const persistentCached = await getCachedTTSAudio(spokenText, profile);
    if (persistentCached) {
      console.log("[TTS] ⚡ Persistent cache hit!");
      return persistentCached;
    }
  } catch { /* non-critical */ }

  // ─── OFFLINE: Skip ElevenLabs entirely → Piper → Browser TTS ───
  if (!offline) {
    try {
      return await fetchElevenLabsTTS(spokenText, profile, signal, emotion, speedOverride, calmMode);
    } catch (e: any) {
      if (e.name === "AbortError") throw e;
      console.warn("[TTS] ElevenLabs failed, trying Piper:", e.message);
    }
  } else {
    console.log("[TTS] ⚡ Offline mode — using Piper TTS directly");
  }

  try {
    return await piperSpeak(spokenText, profile, signal);
  } catch (e: any) {
    if (e.name === "AbortError") throw e;
    console.warn("[TTS] Piper failed, falling back to browser TTS:", e.message);
  }

  return speakWithBrowserTTS(spokenText);
}

/**
 * Preload a voice profile (warm up the ElevenLabs connection)
 * Call on profile switch for instant first response
 */
export async function preloadVoiceProfile(profile: VoiceProfile): Promise<void> {
  const warmupText = "Hmm.";
  const cacheKey = getCacheKey(warmupText, profile);
  if (audioCache.has(cacheKey)) return; // Already warm

  try {
    await fetchElevenLabsTTS(warmupText, profile);
  } catch {
    // Silent failure — preloading is best-effort
  }
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
    const url = await fetchElevenLabsTTS(text, profile);
    if (url === "__silent__") return;
    return new Promise((resolve, reject) => {
      const audio = new Audio(url);
      audio.onended = () => resolve();
      audio.onerror = () => reject(new Error("Playback error"));
      audio.play().catch(reject);
    });
  } catch {
    try {
      await piperPreview(profile);
    } catch {
      await speakWithBrowserTTS(text);
    }
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

// ─── Stream voice chat (bobby-brain) ────────────────────────
export async function streamVoiceChat({
  messages,
  childName,
  childAge,
  mode,
  parentSettings,
  memoryContext,
  onSentence,
  onDone,
  onError,
  signal,
}: {
  messages: AiMsg[];
  childName: string;
  childAge: number;
  mode: string;
  parentSettings?: any;
  memoryContext?: string;
  onSentence: (sentence: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: string) => void;
  signal?: AbortSignal;
}) {
  try {
    const resp = await fetch(BOBBY_BRAIN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages, childName, childAge, mode, parentSettings, memoryContext }),
      signal,
    });

    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      onError(data.error || "ai_error");
      return;
    }

    if (!resp.body) {
      onError("no_response");
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let fullText = "";
    let sentenceBuffer = "";

    const SENTENCE_RE = /[.!?…]\s*/;
    const COMMA_MIN_LENGTH = 8;  // Flush on comma very early for ultra-fast first audio (was 12)
    let isFirstSentence = true;
    const FIRST_FLUSH_LEN = 20; // Very aggressive first flush for <700ms perception

    const flushSentence = () => {
      const trimmed = sentenceBuffer.trim();
      if (trimmed.length > 0) {
        const safe = filterSentence(trimmed);
        if (safe) {
          onSentence(safe);
          fullText += (fullText ? " " : "") + safe;
          isFirstSentence = false;
        }
      }
      sentenceBuffer = "";
    };

    while (true) {
      if (signal?.aborted) break;
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            sentenceBuffer += content;
            // Flush on sentence-ending punctuation
            if (SENTENCE_RE.test(sentenceBuffer)) flushSentence();
            // Flush on comma/semicolon early (faster first audio)
            else if (sentenceBuffer.length > COMMA_MIN_LENGTH && /[,;:]\s*$/.test(sentenceBuffer)) flushSentence();
            // Ultra-aggressive first flush — send anything >20 chars for <700ms perception
            else if (isFirstSentence && sentenceBuffer.length > FIRST_FLUSH_LEN) flushSentence();
            // Also flush if buffer is very long without any punctuation
            else if (sentenceBuffer.length > 35) flushSentence();
          }
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    flushSentence();
    onDone(fullText.trim());
  } catch (e: any) {
    if (e.name !== "AbortError") onError(e.message || "stream_error");
  }
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

  /** Set playback volume (0-1). Use 0.4-0.5 for whisper/calm mode */
  const setVolume = useCallback((v: number) => {
    volumeRef.current = Math.max(0, Math.min(1, v));
    if (currentAudioRef.current) currentAudioRef.current.volume = volumeRef.current;
  }, []);

  return { enqueue, stopAll, setOnAllDone, setVolume, isPlaying: isPlayingRef };
}
