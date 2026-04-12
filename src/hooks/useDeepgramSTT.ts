/**
 * useDeepgramSTT — Real-time speech-to-text via Deepgram WebSocket.
 * 
 * Optimized for conversational fluidity:
 * - Streaming partial transcripts (~200ms latency)
 * - French language optimized (nova-3)
 * - Auto-reconnect with exponential backoff
 * - Token caching to avoid repeated API calls
 * - Smart endpointing for faster final results
 * - Mobile-safe AudioContext (adapts sample rate)
 */
import { useRef, useCallback, useEffect } from "react";

const DEEPGRAM_WS_URL = "wss://api.deepgram.com/v1/listen";
const TOKEN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deepgram-token`;

// Cache the token — Deepgram tokens last ~1h, cache for 30min
let cachedToken: string | null = null;
let tokenFetchPromise: Promise<string> | null = null;
export function invalidateDeepgramTokenCache() { cachedToken = null; tokenFetchPromise = null; }
const TOKEN_CACHE_MS = 30 * 60 * 1000;
const TOKEN_MAX_RETRIES = 3;

async function getToken(): Promise<string> {
  if (cachedToken) return cachedToken;
  if (tokenFetchPromise) return tokenFetchPromise;

  tokenFetchPromise = (async () => {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < TOKEN_MAX_RETRIES; attempt++) {
      try {
        const resp = await fetch(TOKEN_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        });
        if (!resp.ok) throw new Error(`Token fetch failed: ${resp.status}`);
        const { key } = await resp.json();
        cachedToken = key;
        setTimeout(() => { cachedToken = null; }, TOKEN_CACHE_MS);
        return key;
      } catch (err: any) {
        lastError = err;
        if (attempt < TOKEN_MAX_RETRIES - 1) {
          const delay = (attempt + 1) * 500;
          console.warn(`[DeepgramSTT] Token retry ${attempt + 1}/${TOKEN_MAX_RETRIES} in ${delay}ms`);
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }
    throw lastError || new Error("Failed to get Deepgram token");
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
  onUtteranceEnd?: () => void;
  onSpeechStarted?: () => void;
  language?: string;
}

// ─── Reconnection constants ────────────────────────────────
const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY = 500; // ms
const MAX_RECONNECT_DELAY = 8000; // ms

export function useDeepgramSTT({ onPartial, onFinal, onError, onUtteranceEnd, onSpeechStarted, language = "fr" }: UseDeepgramSTTOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | AudioWorkletNode | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const isRunningRef = useRef(false);
  const shouldBeRunningRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const onPartialRef = useRef(onPartial);
  const onFinalRef = useRef(onFinal);
  const onErrorRef = useRef(onError);
  const onUtteranceEndRef = useRef(onUtteranceEnd);
  const onSpeechStartedRef = useRef(onSpeechStarted);

  useEffect(() => { onPartialRef.current = onPartial; }, [onPartial]);
  useEffect(() => { onFinalRef.current = onFinal; }, [onFinal]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);
  useEffect(() => { onUtteranceEndRef.current = onUtteranceEnd; }, [onUtteranceEnd]);
  useEffect(() => { onSpeechStartedRef.current = onSpeechStarted; }, [onSpeechStarted]);

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
    reconnectAttemptsRef.current = 0;

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

      // ─── Detect actual sample rate the device supports ───
      // Mobile Safari often only supports 44100 or device-native rate
      // Create a temporary AudioContext to check the actual sample rate
      let sampleRate = 48000;
      try {
        const testCtx = new AudioContext({ sampleRate: 48000 });
        sampleRate = testCtx.sampleRate; // May differ from requested on mobile
        testCtx.close();
      } catch {
        // Fallback: use default device sample rate
        try {
          const defaultCtx = new AudioContext();
          sampleRate = defaultCtx.sampleRate;
          defaultCtx.close();
        } catch {
          sampleRate = 44100; // Safe fallback
        }
      }

      console.log(`[DeepgramSTT] Using sample rate: ${sampleRate}Hz`);

      const wsUrl = `${DEEPGRAM_WS_URL}?language=${language}&model=nova-3&smart_format=true&interim_results=true&endpointing=200&utterance_end_ms=400&vad_events=true&encoding=linear16&sample_rate=${sampleRate}&channels=1`;

      const ws = new WebSocket(wsUrl, ["token", key]);
      wsRef.current = ws;

      // Timeout: if WS doesn't open within 5s, abort
      const openTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          console.warn("[DeepgramSTT] WebSocket open timeout (5s)");
          ws.close();
        }
      }, 5000);

      ws.onopen = async () => {
        clearTimeout(openTimeout);
        reconnectAttemptsRef.current = 0; // Reset on successful connection
        console.log(`[DeepgramSTT] Connected (nova-3, ${sampleRate}Hz)`);
        
        const audioContext = new AudioContext({ sampleRate });
        contextRef.current = audioContext;

        // FIX BUG-AUDIO-1: AudioContext starts suspended in browsers that require
        // a user gesture before audio processing can begin.
        if (audioContext.state === "suspended") {
          await audioContext.resume().catch(e =>
            console.warn("[DeepgramSTT] AudioContext resume failed:", e)
          );
        }

        // Double-check stream is still active
        if (!stream.active) {
          console.warn("[DeepgramSTT] Stream became inactive before audio setup");
          ws.close();
          return;
        }

        const source = audioContext.createMediaStreamSource(stream);

        try {
          // Prefer AudioWorkletNode (off-main-thread, no jank)
          await audioContext.audioWorklet.addModule("/pcm-worker.js");
          const workletNode = new AudioWorkletNode(audioContext, "pcm-processor");
          processorRef.current = workletNode;

          workletNode.port.onmessage = (e: MessageEvent) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(e.data);
            }
          };

          source.connect(workletNode);
          workletNode.connect(audioContext.destination);
          console.log("[DeepgramSTT] Using AudioWorkletNode ✅");
        } catch (workletErr) {
          // Fallback to ScriptProcessorNode for older browsers / mobile
          console.warn("[DeepgramSTT] AudioWorklet unavailable, falling back to ScriptProcessor:", workletErr);
          const processor = audioContext.createScriptProcessor(4096, 1, 1);
          processorRef.current = processor;

          processor.onaudioprocess = (e) => {
            if (ws.readyState !== WebSocket.OPEN) return;
            const inputData = e.inputBuffer.getChannelData(0);
            const pcm16 = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              const s = Math.max(-1, Math.min(1, inputData[i]));
              pcm16[i] = Math.round(s * (s < 0 ? 0x8000 : 0x7FFF));
            }
            ws.send(pcm16.buffer);
          };

          source.connect(processor);
          processor.connect(audioContext.destination);
          console.log("[DeepgramSTT] Using ScriptProcessorNode (fallback)");
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "Results") {
            const transcript = data.channel?.alternatives?.[0]?.transcript || "";
            if (!transcript) return;

            if (data.is_final) {
              onFinalRef.current(transcript);
            } else {
              onPartialRef.current(transcript);
            }
          }

          if (data.type === "UtteranceEnd") {
            console.log("[DeepgramSTT] UtteranceEnd — speech truly ended");
            onUtteranceEndRef.current?.();
          }

          if (data.type === "SpeechStarted") {
            console.log("[DeepgramSTT] SpeechStarted — voice detected");
            onSpeechStartedRef.current?.();
          }
        } catch {}
      };

      ws.onerror = (evt) => {
        console.warn("[DeepgramSTT] WebSocket error:", (evt as any)?.message || "unknown");
      };

      ws.onclose = (event) => {
        clearTimeout(openTimeout);
        wsRef.current = null;
        
        console.log(`[DeepgramSTT] WebSocket closed: code=${event.code} reason="${event.reason}"`);

        // Clean up audio processing
        if (processorRef.current) {
          try { (processorRef.current as any).disconnect(); } catch {}
          processorRef.current = null;
        }
        if (contextRef.current) {
          try { contextRef.current.close(); } catch {}
          contextRef.current = null;
        }

        // Invalidate token on auth errors
        if (event.code === 1008 || event.code === 4001 || event.code === 4003) {
          console.warn("[DeepgramSTT] Auth error — invalidating token cache");
          invalidateDeepgramTokenCache();
        }

        // Auto-reconnect with exponential backoff
        if (shouldBeRunningRef.current && stream.active) {
          reconnectAttemptsRef.current++;
          
          if (reconnectAttemptsRef.current > MAX_RECONNECT_ATTEMPTS) {
            console.error(`[DeepgramSTT] Max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached — giving up`);
            isRunningRef.current = false;
            onErrorRef.current?.("STT_MAX_RETRIES");
            return;
          }

          const delay = Math.min(
            BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current - 1),
            MAX_RECONNECT_DELAY
          );
          console.log(`[DeepgramSTT] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})...`);
          
          reconnectTimerRef.current = setTimeout(() => {
            if (shouldBeRunningRef.current && stream.active) {
              connectWebSocket(stream);
            }
          }, delay);
        } else {
          isRunningRef.current = false;
        }
      };
    } catch (err: any) {
      console.error("[DeepgramSTT] Connection error:", err.message || err);
      
      // Retry with backoff
      if (shouldBeRunningRef.current) {
        reconnectAttemptsRef.current++;
        if (reconnectAttemptsRef.current > MAX_RECONNECT_ATTEMPTS) {
          isRunningRef.current = false;
          onErrorRef.current?.("STT_MAX_RETRIES");
          return;
        }
        const delay = Math.min(
          BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current - 1),
          MAX_RECONNECT_DELAY
        );
        reconnectTimerRef.current = setTimeout(() => {
          if (shouldBeRunningRef.current && streamRef.current?.active) {
            connectWebSocket(streamRef.current);
          }
        }, delay);
      }
    }
  }, [language, cleanupAudio]);

  const start = useCallback(async () => {
    if (isRunningRef.current) return;
    shouldBeRunningRef.current = true;
    isRunningRef.current = true;
    reconnectAttemptsRef.current = 0;

    try {
      // Pre-fetch token while getting mic access
      const tokenPromise = getToken();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          // Don't force sampleRate — let device choose native rate
          // Mobile Safari ignores this constraint anyway
        },
      });
      streamRef.current = stream;

      // Wait for token to be ready
      await tokenPromise;

      // Connect WebSocket
      await connectWebSocket(stream);
    } catch (err: any) {
      console.error("[DeepgramSTT] Start error:", err.message || err);
      isRunningRef.current = false;
      shouldBeRunningRef.current = false;
      onErrorRef.current?.(err.message || "STT error");
      cleanupAudio();
    }
  }, [connectWebSocket, cleanupAudio]);

  useEffect(() => {
    return () => { stop(); };
  }, [stop]);

  return { start, stop, isRunning: isRunningRef, streamRef };
}
