/**
 * Voice Pipeline v6 — ElevenLabs only
 *
 * Pipeline: ElevenLabs (live) → cached ElevenLabs audio → silent fallback.
 * No Piper TTS. No browser robot voice.
 */

import { useCallback, useRef } from "react";
import { getCachedTTSAudio } from "./ttsCache";

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

// ─── Age-adaptive speed context ─────────────────────────────
let _currentChildAge: number | null = null;

/** Set current child age for TTS speed adaptation */
export function setTTSChildAge(age: number) {
  _currentChildAge = age;
}

// ─── ElevenLabs TTS (cloud, low latency) ────────────────────
async function speakWithElevenLabs(
  text: string,
  profile: VoiceProfile,
  signal?: AbortSignal
): Promise<string> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("[TTS] ❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY");
    throw new Error("Missing Supabase config");
  }

  console.log(`[TTS] 🔄 Calling ElevenLabs for profile="${profile}", age=${_currentChildAge}, text="${text.slice(0, 40)}..."`);

  const response = await fetch(
    `${supabaseUrl}/functions/v1/elevenlabs-tts`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ text, voiceProfile: profile, childAge: _currentChildAge }),
      signal,
    }
  );

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    console.error(`[TTS] ❌ ElevenLabs HTTP ${response.status}:`, errBody);
    throw new Error(`ElevenLabs TTS failed: ${response.status}`);
  }

  const blob = await response.blob();
  if (blob.size < 100) {
    console.error("[TTS] ❌ ElevenLabs returned tiny blob:", blob.size);
    throw new Error("ElevenLabs returned empty audio");
  }

  console.log(`[TTS] ✅ ElevenLabs audio received: ${blob.size} bytes`);
  return URL.createObjectURL(blob);
}

// ─── Public TTS API ─────────────────────────────────────────
/**
 * Fetch TTS audio — ElevenLabs live first, cached audio second, silence last.
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

  const isOnline = typeof navigator !== "undefined" && navigator.onLine;

  // 2. ElevenLabs (cloud — low latency streaming)
  console.log(`[TTS] 🌐 Online: ${isOnline}, SUPABASE_URL: ${!!import.meta.env.VITE_SUPABASE_URL}, profile: ${profile}, text: "${spokenText.slice(0, 30)}..."`);
  if (isOnline) {
    try {
      // Add a 10s timeout to avoid hanging forever
      const timeoutSignal = AbortSignal.timeout(5_000);
      const combinedSignal = signal 
        ? AbortSignal.any([signal, timeoutSignal])
        : timeoutSignal;
      const url = await speakWithElevenLabs(spokenText, profile, combinedSignal);
      if (spokenText.length < 120) cacheAudio(cacheKey, url);
      console.log("[TTS] ✅ Using ElevenLabs audio");
      return url;
    } catch (e: any) {
      if (e.name === "AbortError" && signal?.aborted) throw e;
       console.warn("[TTS] ⚠️ ElevenLabs live generation failed:", e.message);
    }
  }

  // 3. Cached ElevenLabs audio (works offline if previously generated)
  try {
    const persistentCached = await getCachedTTSAudio(spokenText, profile);
    if (persistentCached) {
      console.log(`[TTS] ⚡ Using cached ElevenLabs audio (${isOnline ? "after live failure" : "offline"})`);
      return persistentCached;
    }
  } catch {
    // Non-critical: fall through to silent mode.
  }

  console.warn("[TTS] 🔇 No ElevenLabs audio available, staying silent");
  return "__silent__";
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

  if (!navigator.onLine) {
    console.warn("[Preview] Skipping voice preview while offline");
    return;
  }

  try {
    const url = await speakWithElevenLabs(text, profile);
    const audio = new Audio(url);
    await audio.play();
    await new Promise<void>((resolve) => {
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
    });
  } catch (e) {
    console.warn("[Preview] ElevenLabs preview failed:", e);
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

    if (url === "__silent__") {
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
    queueRef.current.forEach(url => {
      if (url !== "__silent__" && !audioCache.has(url)) {
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
