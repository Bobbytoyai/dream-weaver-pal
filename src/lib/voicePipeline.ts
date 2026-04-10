/**
 * Voice Pipeline v2 — Optimized for ultra-low latency
 * 
 * TTS: ElevenLabs streaming (premium) with Piper fallback (offline)
 * LLM: bobby-brain unified agent
 * 
 * Pipeline: STT → bobby-brain → sentence split → ElevenLabs TTS → audio queue
 */

import { useCallback, useRef } from "react";
import { piperSpeak, piperPreview } from "./piperTTS";

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
export type VoiceProfile = "child" | "female" | "male";

// ─── ElevenLabs TTS (primary) ───────────────────────────────
async function fetchElevenLabsTTS(text: string, voiceProfile: VoiceProfile, signal?: AbortSignal): Promise<string> {
  const spokenText = sanitizeSpokenText(text);
  if (!spokenText) return "__silent__";

  const response = await fetch(ELEVENLABS_TTS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ text: spokenText, voiceProfile }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs TTS error: ${response.status}`);
  }

  const audioBlob = await response.blob();
  return URL.createObjectURL(audioBlob);
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
 * Fetch TTS audio. Tries: ElevenLabs → Piper → Browser TTS
 */
export async function fetchTTSAudio(text: string, signal?: AbortSignal, voiceId?: string): Promise<string> {
  const spokenText = sanitizeSpokenText(text);
  if (!spokenText) return "__silent__";
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  const profile = (voiceId as VoiceProfile) || "female";

  // Try ElevenLabs first (premium, natural)
  try {
    return await fetchElevenLabsTTS(spokenText, profile, signal);
  } catch (e: any) {
    if (e.name === "AbortError") throw e;
    console.warn("[TTS] ElevenLabs failed, trying Piper:", e.message);
  }

  // Try Piper (local, free)
  try {
    return await piperSpeak(spokenText, profile, signal);
  } catch (e: any) {
    if (e.name === "AbortError") throw e;
    console.warn("[TTS] Piper failed, falling back to browser TTS:", e.message);
  }

  // Last resort: browser TTS
  return speakWithBrowserTTS(spokenText);
}

/**
 * Preview a voice profile (for settings screen)
 */
export async function previewVoiceProfile(profile: VoiceProfile): Promise<void> {
  const previewText = "Salut ! Je suis Bobby, ton compagnon préféré ! On va bien s'amuser ensemble !";
  try {
    const url = await fetchElevenLabsTTS(previewText, profile);
    if (url === "__silent__") return;
    return new Promise((resolve, reject) => {
      const audio = new Audio(url);
      audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
      audio.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Playback error")); };
      audio.play().catch(reject);
    });
  } catch {
    // Fallback to Piper preview
    try {
      await piperPreview(profile);
    } catch {
      await speakWithBrowserTTS(previewText);
    }
  }
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

    const flushSentence = () => {
      const trimmed = sentenceBuffer.trim();
      if (trimmed.length > 0) {
        const safe = filterSentence(trimmed);
        if (safe) {
          onSentence(safe);
          fullText += (fullText ? " " : "") + safe;
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
            if (/[.!?…]\s*$/.test(sentenceBuffer)) flushSentence();
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
    currentAudioRef.current = audio;

    audio.onended = () => {
      URL.revokeObjectURL(url);
      currentAudioRef.current = null;
      playNext();
    };

    audio.onerror = () => {
      URL.revokeObjectURL(url);
      currentAudioRef.current = null;
      playNext();
    };

    audio.play().catch(() => {
      URL.revokeObjectURL(url);
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
      if (url !== "__browser_tts__" && url !== "__silent__" && url !== "__piper_silent__") URL.revokeObjectURL(url);
    });
    queueRef.current = [];
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      if (currentAudioRef.current.src) URL.revokeObjectURL(currentAudioRef.current.src);
      currentAudioRef.current = null;
    }
    isPlayingRef.current = false;
  }, []);

  const setOnAllDone = useCallback((cb: () => void) => {
    onAllDoneRef.current = cb;
  }, []);

  return { enqueue, stopAll, setOnAllDone, isPlaying: isPlayingRef };
}
