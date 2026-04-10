import { useRef, useEffect, useCallback } from "react";

/**
 * Simplified viseme types derived from frequency analysis.
 * Instead of full phoneme recognition, we use FFT bands to approximate
 * mouth shapes for natural-looking lip sync.
 *
 * Viseme mapping:
 *  - REST:    mouth closed (silence)
 *  - AA:      wide open vowel (a, o) — low frequency dominance
 *  - EE:      narrow/wide vowel (i, e) — mid frequency dominance  
 *  - OO:      rounded vowel (ou, u) — low-mid with narrow width
 *  - FF:      fricative (f, v, s, ch) — high frequency dominance
 *  - MM:      nasal/bilabial (m, n, b, p) — low amplitude, closed mouth
 */
export type Viseme = "REST" | "AA" | "EE" | "OO" | "FF" | "MM";

export interface VisemeState {
  viseme: Viseme;
  amplitude: number;      // overall 0-1
  mouthOpenness: number;  // vertical 0-1
  mouthWidth: number;     // horizontal 0-1 (0.5 = neutral)
  mouthRound: number;     // roundness 0-1 (for OO shapes)
  jawDrop: number;        // extra jaw movement 0-1
}

const VISEME_REST: VisemeState = {
  viseme: "REST", amplitude: 0,
  mouthOpenness: 0, mouthWidth: 0.5, mouthRound: 0, jawDrop: 0,
};

/** Intonation data for expression changes mid-sentence */
export interface IntonationState {
  /** Current pitch trend: rising (question), falling (statement), flat */
  pitchTrend: "rising" | "falling" | "flat";
  /** Emphasis level 0-1 (loud syllable = high emphasis) */
  emphasis: number;
  /** Speaking energy 0-1 (overall energy level) */
  energy: number;
}

export function useAudioAmplitude() {
  const analyserRef = useRef<AnalyserNode | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const freqDataRef = useRef<Uint8Array | null>(null);
  const timeDataRef = useRef<Uint8Array | null>(null);
  const amplitudeRef = useRef(0);
  const visemeRef = useRef<VisemeState>({ ...VISEME_REST });
  const connectedElements = useRef<Set<HTMLAudioElement>>(new Set());
  const smoothedBands = useRef({ low: 0, mid: 0, high: 0, veryHigh: 0 });
  // v3.0: Intonation tracking
  const intonationRef = useRef<IntonationState>({ pitchTrend: "flat", emphasis: 0, energy: 0 });
  const prevAmplitudes = useRef<number[]>([]);
  const prevLowEnergy = useRef(0);

  const getContext = useCallback(() => {
    if (!contextRef.current) {
      contextRef.current = new AudioContext();
      analyserRef.current = contextRef.current.createAnalyser();
      analyserRef.current.fftSize = 512; // more frequency resolution
      analyserRef.current.smoothingTimeConstant = 0.35;
      const binCount = analyserRef.current.frequencyBinCount;
      freqDataRef.current = new Uint8Array(binCount);
      timeDataRef.current = new Uint8Array(binCount);
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
    } catch {
      // Element may already be connected
    }
  }, [getContext]);

  /**
   * Analyzes frequency bands and maps them to viseme mouth shapes.
   * 
   * Frequency bands (assuming 44100Hz sample rate, 512 FFT → ~86Hz per bin):
   *  - Low (0-500Hz):     Vowel formants (A, O), voicing fundamental
   *  - Mid (500-2000Hz):  Vowel formants (E, I), voice resonance
   *  - High (2000-4000Hz): Consonant energy, sibilance
   *  - VeryHigh (4000+Hz): Fricatives (S, F, CH), noise
   */
  const analyzeViseme = useCallback((): VisemeState => {
    if (!analyserRef.current || !freqDataRef.current) return { ...VISEME_REST };

    const analyser = analyserRef.current;
    const freqData = freqDataRef.current;
    analyser.getByteFrequencyData(freqData as any);

    const sampleRate = contextRef.current?.sampleRate || 44100;
    const binWidth = sampleRate / (analyser.fftSize);
    const binCount = freqData.length;

    // Calculate band energies
    const lowEnd = Math.min(Math.floor(500 / binWidth), binCount);
    const midEnd = Math.min(Math.floor(2000 / binWidth), binCount);
    const highEnd = Math.min(Math.floor(4000 / binWidth), binCount);

    let lowSum = 0, midSum = 0, highSum = 0, veryHighSum = 0, totalSum = 0;
    let lowCount = 0, midCount = 0, highCount = 0, veryHighCount = 0;

    for (let i = 0; i < binCount; i++) {
      const val = freqData[i] / 255;
      totalSum += val;
      if (i < lowEnd) { lowSum += val; lowCount++; }
      else if (i < midEnd) { midSum += val; midCount++; }
      else if (i < highEnd) { highSum += val; highCount++; }
      else { veryHighSum += val; veryHighCount++; }
    }

    const rawLow = lowCount > 0 ? lowSum / lowCount : 0;
    const rawMid = midCount > 0 ? midSum / midCount : 0;
    const rawHigh = highCount > 0 ? highSum / highCount : 0;
    const rawVeryHigh = veryHighCount > 0 ? veryHighSum / veryHighCount : 0;
    const amplitude = totalSum / binCount;

    // Smooth bands to avoid jitter (exponential moving average)
    const sm = smoothedBands.current;
    const smoothing = 0.3;
    sm.low = sm.low + (rawLow - sm.low) * smoothing;
    sm.mid = sm.mid + (rawMid - sm.mid) * smoothing;
    sm.high = sm.high + (rawHigh - sm.high) * smoothing;
    sm.veryHigh = sm.veryHigh + (rawVeryHigh - sm.veryHigh) * smoothing;

    amplitudeRef.current = amplitude;

    // Silence threshold
    if (amplitude < 0.02) {
      visemeRef.current = { ...VISEME_REST };
      return visemeRef.current;
    }

    // Determine dominant band
    const total = sm.low + sm.mid + sm.high + sm.veryHigh + 0.001;
    const lowRatio = sm.low / total;
    const midRatio = sm.mid / total;
    const highRatio = (sm.high + sm.veryHigh) / total;

    // Classify viseme based on frequency distribution
    let viseme: Viseme;
    let mouthOpenness: number;
    let mouthWidth: number;
    let mouthRound: number;
    let jawDrop: number;

    if (amplitude < 0.06) {
      // Very quiet — nasal/bilabial (M, N, B, P)
      viseme = "MM";
      mouthOpenness = 0.05 + amplitude * 2;
      mouthWidth = 0.5;
      mouthRound = 0;
      jawDrop = 0.02;
    } else if (highRatio > 0.45) {
      // High frequency dominant — fricatives (F, S, CH, V)
      viseme = "FF";
      mouthOpenness = 0.15 + sm.high * 0.4;
      mouthWidth = 0.35; // narrower
      mouthRound = 0.1;
      jawDrop = 0.08;
    } else if (lowRatio > 0.45 && midRatio < 0.25) {
      // Low dominant, low mid — open vowel (A, O)
      // Distinguish A (wider) vs O (rounder) by width of low band
      const isRound = sm.low > 0.4 && sm.mid < 0.15;
      if (isRound) {
        viseme = "OO";
        mouthOpenness = 0.35 + sm.low * 0.5;
        mouthWidth = 0.3; // pursed
        mouthRound = 0.7 + sm.low * 0.3;
        jawDrop = 0.2 + sm.low * 0.3;
      } else {
        viseme = "AA";
        mouthOpenness = 0.4 + sm.low * 0.6;
        mouthWidth = 0.65 + sm.low * 0.2; // wide open
        mouthRound = 0.1;
        jawDrop = 0.3 + sm.low * 0.4;
      }
    } else if (midRatio > 0.35) {
      // Mid dominant — closed/spread vowel (E, I)
      viseme = "EE";
      mouthOpenness = 0.2 + sm.mid * 0.35;
      mouthWidth = 0.7 + sm.mid * 0.25; // wide spread (smile-like)
      mouthRound = 0;
      jawDrop = 0.1 + sm.mid * 0.15;
    } else {
      // Mixed — interpolate between shapes
      viseme = "AA";
      mouthOpenness = 0.25 + amplitude * 1.5;
      mouthWidth = 0.5 + (midRatio - lowRatio) * 0.3;
      mouthRound = lowRatio * 0.4;
      jawDrop = 0.15 + amplitude * 0.5;
    }

    // Clamp all values
    mouthOpenness = Math.min(1, Math.max(0, mouthOpenness));
    mouthWidth = Math.min(1, Math.max(0.2, mouthWidth));
    mouthRound = Math.min(1, Math.max(0, mouthRound));
    jawDrop = Math.min(1, Math.max(0, jawDrop));

    visemeRef.current = {
      viseme, amplitude, mouthOpenness, mouthWidth, mouthRound, jawDrop,
    };
    return visemeRef.current;
  }, []);

  // Legacy compatibility
  const getAmplitude = useCallback((): number => {
    analyzeViseme();
    return amplitudeRef.current;
  }, [analyzeViseme]);

  const getViseme = useCallback((): VisemeState => {
    return analyzeViseme();
  }, [analyzeViseme]);

  useEffect(() => {
    return () => {
      contextRef.current?.close();
    };
  }, []);

  return { connectAudio, getAmplitude, getViseme, amplitudeRef, visemeRef };
}
