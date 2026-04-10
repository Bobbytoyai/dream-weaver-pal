import { useCallback, useRef } from "react";

const VOICE_CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-chat`;

type AiMsg = { role: "user" | "assistant"; content: string };

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

// ─── Voice profiles ──────────────────────────────────────────────
// Each profile uses a DIFFERENT underlying system voice + pitch/rate tweaks
// to create 3 distinct French voices using the Web Speech API.

export type VoiceProfile = "child" | "female" | "male";

interface VoiceConfig {
  pitch: number;
  rate: number;
  /** Keywords to PREFER when picking a system voice */
  preferKeywords: RegExp;
  /** Keywords to AVOID */
  avoidKeywords: RegExp;
  /** Fallback index in the French voice list (0 = first, -1 = last) */
  fallbackIndex: "first" | "last" | "middle";
}

const VOICE_PROFILES: Record<VoiceProfile, VoiceConfig> = {
  child: {
    pitch: 1.3,
    rate: 1.02,
    preferKeywords: /amelie|sophie|audrey|lea|marie|virginie|female|femme/i,
    avoidKeywords: /thomas|daniel|nicolas|male|homme/i,
    fallbackIndex: "first",
  },
  female: {
    pitch: 1.0,
    rate: 0.92,
    preferKeywords: /amelie|sophie|audrey|lea|marie|virginie|female|femme/i,
    avoidKeywords: /thomas|daniel|nicolas|male|homme/i,
    fallbackIndex: "first",
  },
  male: {
    pitch: 0.75,
    rate: 0.88,
    preferKeywords: /thomas|daniel|nicolas|male|homme/i,
    avoidKeywords: /amelie|sophie|audrey|lea|marie|virginie|female|femme/i,
    fallbackIndex: "last",
  },
};

/** Cache resolved voices so we don't search every time */
let cachedVoices: SpeechSynthesisVoice[] = [];

function getFrenchVoices(): SpeechSynthesisVoice[] {
  if (cachedVoices.length > 0) return cachedVoices;
  const all = speechSynthesis.getVoices();
  cachedVoices = all.filter(v => v.lang.startsWith("fr"));
  return cachedVoices;
}

function pickVoiceForProfile(profile: VoiceProfile): SpeechSynthesisVoice | null {
  const fr = getFrenchVoices();
  if (fr.length === 0) return null;

  const config = VOICE_PROFILES[profile];

  // 1. Try to find a voice matching preferred keywords
  const preferred = fr.find(v => config.preferKeywords.test(v.name) && !config.avoidKeywords.test(v.name));
  if (preferred) return preferred;

  // 2. Try to find any voice NOT matching avoid keywords
  const acceptable = fr.find(v => !config.avoidKeywords.test(v.name));
  if (acceptable) return acceptable;

  // 3. Fallback by index
  if (config.fallbackIndex === "last") return fr[fr.length - 1];
  if (config.fallbackIndex === "middle") return fr[Math.floor(fr.length / 2)];
  return fr[0];
}

// Ensure voices are loaded (some browsers load them async)
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  speechSynthesis.getVoices(); // trigger load
  speechSynthesis.onvoiceschanged = () => {
    cachedVoices = [];
    getFrenchVoices();
  };
}

function speakWithBrowserTTS(text: string, profile: VoiceProfile = "female"): Promise<string> {
  const spokenText = sanitizeSpokenText(text);
  if (!spokenText) return Promise.resolve("__browser_tts__");

  return new Promise((resolve, reject) => {
    if (!("speechSynthesis" in window)) {
      reject(new Error("Browser TTS not supported"));
      return;
    }

    const config = VOICE_PROFILES[profile];
    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.lang = "fr-FR";
    utterance.rate = config.rate;
    utterance.pitch = config.pitch;

    const voice = pickVoiceForProfile(profile);
    if (voice) utterance.voice = voice;

    utterance.onend = () => resolve("__browser_tts__");
    utterance.onerror = () => reject(new Error("Browser TTS error"));
    speechSynthesis.speak(utterance);
  });
}

// ─── Public API ──────────────────────────────────────────────────

export async function streamVoiceChat({
  messages,
  childName,
  childAge,
  mode,
  parentSettings,
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
  onSentence: (sentence: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: string) => void;
  signal?: AbortSignal;
}) {
  try {
    const resp = await fetch(VOICE_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages, childName, childAge, mode, parentSettings }),
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

/**
 * Fetch (speak) TTS audio using the browser's Web Speech API.
 * voiceId maps to a VoiceProfile: "child" | "female" | "male"
 */
export async function fetchTTSAudio(text: string, signal?: AbortSignal, voiceId?: string): Promise<string> {
  const spokenText = sanitizeSpokenText(text);
  if (!spokenText) return "__browser_tts__";

  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  const profile = (voiceId as VoiceProfile) || "female";
  return speakWithBrowserTTS(spokenText, profile);
}

/**
 * Preview a voice profile (for settings screen)
 */
export function previewVoiceProfile(profile: VoiceProfile): Promise<void> {
  return speakWithBrowserTTS(
    "Salut ! Je suis Bobby, ton compagnon préféré ! On va bien s'amuser ensemble !",
    profile
  ).then(() => {});
}

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

    if (url === "__browser_tts__") {
      // Browser TTS already played inline, just move on
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
      if (url !== "__browser_tts__") URL.revokeObjectURL(url);
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
