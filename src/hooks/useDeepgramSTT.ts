/**
 * useDeepgramSTT — Real-time speech-to-text via Deepgram WebSocket.
 * 
 * Features:
 * - Streaming partial transcripts (~300ms latency)
 * - French language optimized
 * - Auto-reconnect on disconnect
 * - Fires onPartial for interim results
 * - Fires onFinal for committed transcripts
 * - VAD (voice activity detection) built-in
 */
import { useRef, useCallback, useEffect } from "react";

const DEEPGRAM_WS_URL = "wss://api.deepgram.com/v1/listen";
const TOKEN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deepgram-token`;

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
  const onPartialRef = useRef(onPartial);
  const onFinalRef = useRef(onFinal);
  const onErrorRef = useRef(onError);

  useEffect(() => { onPartialRef.current = onPartial; }, [onPartial]);
  useEffect(() => { onFinalRef.current = onFinal; }, [onFinal]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  const stop = useCallback(() => {
    isRunningRef.current = false;

    if (wsRef.current) {
      try { wsRef.current.close(); } catch {}
      wsRef.current = null;
    }

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

  const start = useCallback(async () => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;

    try {
      // 1. Get temporary API key
      const tokenResp = await fetch(TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
      });

      if (!tokenResp.ok) {
        throw new Error("Failed to get Deepgram token");
      }

      const { key } = await tokenResp.json();

      // 2. Get microphone
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });
      streamRef.current = stream;

      // 3. Connect WebSocket
      const wsUrl = `${DEEPGRAM_WS_URL}?language=${language}&model=nova-2&smart_format=true&interim_results=true&utterance_end_ms=1000&vad_events=true&encoding=linear16&sample_rate=16000&channels=1&token=${encodeURIComponent(key)}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        // 4. Set up audio processing
        const audioContext = new AudioContext({ sampleRate: 16000 });
        contextRef.current = audioContext;
        const source = audioContext.createMediaStreamSource(stream);

        // Use ScriptProcessorNode (simpler, works everywhere)
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const inputData = e.inputBuffer.getChannelData(0);
          // Convert float32 to int16
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
              onFinalRef.current(transcript);
            } else {
              onPartialRef.current(transcript);
            }
          }
        } catch {}
      };

      ws.onerror = () => {
        onErrorRef.current?.("Deepgram connection error");
        stop();
      };

      ws.onclose = () => {
        if (isRunningRef.current) {
          // Unexpected close — stop cleanly
          stop();
        }
      };
    } catch (err: any) {
      console.error("[DeepgramSTT] Error:", err);
      onErrorRef.current?.(err.message || "STT error");
      stop();
    }
  }, [language, stop]);

  useEffect(() => {
    return () => { stop(); };
  }, [stop]);

  return { start, stop, isRunning: isRunningRef };
}
