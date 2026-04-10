/**
 * useDeepgramSTT — Real-time speech-to-text via Deepgram WebSocket.
 * 
 * Optimized for conversational fluidity:
 * - Streaming partial transcripts (~200ms latency)
 * - French language optimized (nova-2)
 * - Auto-reconnect on disconnect
 * - Token caching to avoid repeated API calls
 * - Smart endpointing for faster final results
 * - Can keep running during TTS for interruption detection
 */
import { useRef, useCallback, useEffect } from "react";

const DEEPGRAM_WS_URL = "wss://api.deepgram.com/v1/listen";
const TOKEN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deepgram-token`;

// Cache the token to avoid re-fetching on every start
let cachedToken: string | null = null;
let tokenFetchPromise: Promise<string> | null = null;

async function getToken(): Promise<string> {
  if (cachedToken) return cachedToken;
  if (tokenFetchPromise) return tokenFetchPromise;

  tokenFetchPromise = (async () => {
    const resp = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
    });
    if (!resp.ok) throw new Error("Failed to get Deepgram token");
    const { key } = await resp.json();
    cachedToken = key;
    // Clear cache after 50 seconds (keys may expire)
    setTimeout(() => { cachedToken = null; }, 50000);
    return key;
  })();

  try {
    const result = await tokenFetchPromise;
    return result;
  } finally {
    tokenFetchPromise = null;
  }
}

interface UseDeepgramSTTOptions {
  onPartial: (text: string) => void;
  onFinal: (text: string) => void;
  onError?: (error: string) => void;
  language?: string;
}

export function useDeepgramSTT({ onPartial, onFinal, onError, language = "fr" }: UseDeepgramSTTOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | AudioWorkletNode | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const isRunningRef = useRef(false);
  const shouldBeRunningRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onPartialRef = useRef(onPartial);
  const onFinalRef = useRef(onFinal);
  const onErrorRef = useRef(onError);

  useEffect(() => { onPartialRef.current = onPartial; }, [onPartial]);
  useEffect(() => { onFinalRef.current = onFinal; }, [onFinal]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  const cleanupAudio = useCallback(() => {
    if (processorRef.current) {
      try { (processorRef.current as any).disconnect(); } catch {}
      processorRef.current = null;
    }
    if (contextRef.current) {
      try { contextRef.current.close(); } catch {}
      contextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    shouldBeRunningRef.current = false;
    isRunningRef.current = false;

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    if (wsRef.current) {
      try { wsRef.current.close(); } catch {}
      wsRef.current = null;
    }

    cleanupAudio();
  }, [cleanupAudio]);

  const connectWebSocket = useCallback(async (stream: MediaStream) => {
    try {
      const key = await getToken();

      // Deepgram params — nova-3 for best accuracy + low latency:
      // - endpointing=250: ultra-fast end-of-speech (250ms silence)
      // - utterance_end_ms=600: shorter utterance timeout for snappy turns
      // - interim_results=true: streaming partials
      // - smart_format=true: punctuation
      // - vad_events=true: voice activity detection
      const wsUrl = `${DEEPGRAM_WS_URL}?language=${language}&model=nova-3&smart_format=true&interim_results=true&endpointing=250&utterance_end_ms=600&vad_events=true&encoding=linear16&sample_rate=48000&channels=1`;

      const ws = new WebSocket(wsUrl, ["token", key]);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[DeepgramSTT] Connected (nova-3, 48kHz)");
        
        const audioContext = new AudioContext({ sampleRate: 48000 });
        contextRef.current = audioContext;
        const source = audioContext.createMediaStreamSource(stream);

        const processor = audioContext.createScriptProcessor(2048, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const inputData = e.inputBuffer.getChannelData(0);
          const pcm16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }
          ws.send(pcm16.buffer);
        };

        source.connect(processor);
        processor.connect(audioContext.destination);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "Results") {
            const transcript = data.channel?.alternatives?.[0]?.transcript || "";
            if (!transcript) return;

            if (data.is_final) {
              if (data.speech_final) {
                // Speech endpoint detected — this is the final result for this utterance
                onFinalRef.current(transcript);
              } else {
                // Interim final (more speech may follow in this utterance)
                onFinalRef.current(transcript);
              }
            } else {
              onPartialRef.current(transcript);
            }
          }

          // UtteranceEnd event — speech has truly ended
          if (data.type === "UtteranceEnd") {
            // Deepgram detected end of speech — good signal for conversation flow
          }
        } catch {}
      };

      ws.onerror = () => {
        console.warn("[DeepgramSTT] WebSocket error");
        // Don't call onError for reconnectable errors
      };

      ws.onclose = (event) => {
        wsRef.current = null;
        
        // Clean up audio processing
        if (processorRef.current) {
          try { (processorRef.current as any).disconnect(); } catch {}
          processorRef.current = null;
        }
        if (contextRef.current) {
          try { contextRef.current.close(); } catch {}
          contextRef.current = null;
        }

        // Auto-reconnect if should still be running
        if (shouldBeRunningRef.current && stream.active) {
          console.log("[DeepgramSTT] Reconnecting in 500ms...");
          reconnectTimerRef.current = setTimeout(() => {
            if (shouldBeRunningRef.current && stream.active) {
              connectWebSocket(stream);
            }
          }, 500);
        }
      };
    } catch (err: any) {
      console.error("[DeepgramSTT] Connection error:", err);
      onErrorRef.current?.(err.message || "STT connection error");
      
      // Retry after delay
      if (shouldBeRunningRef.current) {
        reconnectTimerRef.current = setTimeout(() => {
          if (shouldBeRunningRef.current && streamRef.current?.active) {
            connectWebSocket(streamRef.current);
          }
        }, 2000);
      }
    }
  }, [language, cleanupAudio]);

  const start = useCallback(async () => {
    if (isRunningRef.current) return;
    shouldBeRunningRef.current = true;
    isRunningRef.current = true;

    try {
      // Pre-fetch token while getting mic access
      const tokenPromise = getToken();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
        },
      });
      streamRef.current = stream;

      // Wait for token to be ready
      await tokenPromise;

      // Connect WebSocket
      await connectWebSocket(stream);
    } catch (err: any) {
      console.error("[DeepgramSTT] Start error:", err);
      isRunningRef.current = false;
      shouldBeRunningRef.current = false;
      onErrorRef.current?.(err.message || "STT error");
      cleanupAudio();
    }
  }, [connectWebSocket, cleanupAudio]);

  useEffect(() => {
    return () => { stop(); };
  }, [stop]);

  return { start, stop, isRunning: isRunningRef };
}
