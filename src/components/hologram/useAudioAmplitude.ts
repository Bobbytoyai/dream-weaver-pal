import { useRef, useEffect, useCallback } from "react";

/**
 * Analyzes audio amplitude in real-time from an HTMLAudioElement
 * for lip sync purposes.
 */
export function useAudioAmplitude() {
  const analyserRef = useRef<AnalyserNode | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);
  const amplitudeRef = useRef(0);
  const connectedElements = useRef<Set<HTMLAudioElement>>(new Set());

  const getContext = useCallback(() => {
    if (!contextRef.current) {
      contextRef.current = new AudioContext();
      analyserRef.current = contextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.4;
      dataRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.connect(contextRef.current.destination);
    }
    return { context: contextRef.current, analyser: analyserRef.current! };
  }, []);

  const connectAudio = useCallback((audioElement: HTMLAudioElement) => {
    if (connectedElements.current.has(audioElement)) return;
    try {
      const { context, analyser } = getContext();
      const source = context.createMediaElementSource(audioElement);
      source.connect(analyser);
      connectedElements.current.add(audioElement);
    } catch (e) {
      // Element may already be connected
    }
  }, [getContext]);

  const getAmplitude = useCallback((): number => {
    if (!analyserRef.current || !dataRef.current) return 0;
    analyserRef.current.getByteFrequencyData(dataRef.current);
    let sum = 0;
    const len = dataRef.current.length;
    for (let i = 0; i < len; i++) sum += dataRef.current[i];
    const avg = sum / len / 255;
    amplitudeRef.current = avg;
    return avg;
  }, []);

  useEffect(() => {
    return () => {
      contextRef.current?.close();
    };
  }, []);

  return { connectAudio, getAmplitude, amplitudeRef };
}
