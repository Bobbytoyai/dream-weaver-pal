import { useCallback, useRef } from "react";

const VOICE_CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-chat`;
const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tts`;

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
    utterance.rate = 1.02;
    utterance.pitch = 1.18;

    const voices = speechSynthesis.getVoices();
    const frVoice =
      voices.find((voice) => voice.lang.startsWith("fr") && voice.name.toLowerCase().includes("female")) ||
      voices.find((voice) => voice.lang.startsWith("fr"));

    if (frVoice) utterance.voice = frVoice;

    utterance.onend = () => resolve("__browser_tts__");
    utterance.onerror = () => reject(new Error("Browser TTS error"));
    speechSynthesis.speak(utterance);
  });
}

async function requestEdgeTTS(text: string, signal?: AbortSignal, voiceId?: string): Promise<string> {
  const response = await fetch(TTS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ text, ...(voiceId ? { voiceId } : {}) }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`TTS endpoint error (${response.status})`);
  }

  const contentType = response.headers.get("Content-Type") || "";
  if (contentType.includes("application/json")) {
    const data = await response.json();
    if (data?.fallback) {
      throw new Error(data.error || "TTS fallback");
    }
    throw new Error(data?.error || "Unexpected JSON response");
  }

  const audioBlob = await response.blob();
  if (audioBlob.size < 100) {
    throw new Error("TTS returned tiny audio");
  }

  return URL.createObjectURL(audioBlob);
}

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

export async function fetchTTSAudio(text: string, signal?: AbortSignal, voiceId?: string): Promise<string> {
  const spokenText = sanitizeSpokenText(text);
  if (!spokenText) return "__browser_tts__";

  try {
    return await requestEdgeTTS(spokenText, signal, voiceId);
  } catch (firstError: any) {
    if (firstError.name === "AbortError") throw firstError;

    try {
      return await requestEdgeTTS(spokenText, signal, voiceId);
    } catch (secondError: any) {
      if (secondError.name === "AbortError") throw secondError;
      console.warn("TTS fetch error, using browser fallback for this sentence only:", secondError.message);
      return speakWithBrowserTTS(spokenText);
    }
  }
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
