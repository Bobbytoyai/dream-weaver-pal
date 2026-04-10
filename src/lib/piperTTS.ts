/**
 * Piper TTS – Neural text-to-speech running 100% in-browser via WASM/ONNX.
 *
 * French voice models (~63-77 MB each) are downloaded once on first use
 * and cached in IndexedDB (Origin Private File System).
 *
 * Voice mapping:
 *   female → fr_FR-siwis-medium   (female, natural)
 *   child  → fr_FR-siwis-medium   (same model, pitch-shifted up via Web Audio)
 *   male   → fr_FR-mls-medium     (male, natural)
 */

import type { VoiceProfile } from "./voicePipeline";

// Lazy-imported so the 480 KB library isn't in the critical path
let ttsModule: typeof import("@mintplex-labs/piper-tts-web") | null = null;

async function getTTS() {
  if (!ttsModule) {
    ttsModule = await import("@mintplex-labs/piper-tts-web");
  }
  return ttsModule;
}

/** Maps our profile names → Piper voice model IDs */
const VOICE_MODEL: Record<VoiceProfile, string> = {
  female: "fr_FR-siwis-medium",
  child: "fr_FR-siwis-medium",   // same model, pitch shifted
  male: "fr_FR-mls-medium",
};

/** Pitch multiplier applied via Web Audio API */
const PITCH_SHIFT: Record<VoiceProfile, number> = {
  child: 1.18,   // slightly higher pitch for a cute child effect
  female: 1.0,   // natural
  male: 1.0,     // natural
};

/** Rate (playback speed) adjustments */
const RATE_SHIFT: Record<VoiceProfile, number> = {
  child: 1.02,
  female: 0.95,
  male: 0.92,
};

let downloadProgress: Record<string, number> = {};

export function getPiperDownloadProgress(profile: VoiceProfile): number {
  return downloadProgress[VOICE_MODEL[profile]] ?? 0;
}

/**
 * Pre-download a voice model so it's ready when needed.
 */
export async function preloadVoice(profile: VoiceProfile, onProgress?: (p: number) => void) {
  const tts = await getTTS();
  const voiceId = VOICE_MODEL[profile];
  await tts.download(voiceId, (progress) => {
    downloadProgress[voiceId] = progress.progress ?? 0;
    onProgress?.(downloadProgress[voiceId]);
  });
}

/**
 * Synthesise text → WAV Blob using Piper, then play it with optional
 * pitch shifting through the Web Audio API.
 *
 * Returns a Blob URL that can be enqueued in the audio queue.
 */
export async function piperSpeak(
  text: string,
  profile: VoiceProfile = "female",
  signal?: AbortSignal,
): Promise<string> {
  if (!text.trim()) return "__piper_silent__";
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  const tts = await getTTS();
  const voiceId = VOICE_MODEL[profile];

  // Generate WAV blob via Piper WASM + ONNX
  const wav: Blob = await tts.predict({
    text,
    voiceId,
  }, (progress) => {
    downloadProgress[voiceId] = progress.progress ?? 0;
  });

  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  const pitch = PITCH_SHIFT[profile];
  const rate = RATE_SHIFT[profile];

  // If no pitch/rate change needed, just return the blob URL directly
  if (pitch === 1.0 && rate === 1.0) {
    return URL.createObjectURL(wav);
  }

  // Apply pitch shift via Web Audio API
  return applyPitchShift(wav, pitch, rate, signal);
}

/**
 * Use Web Audio API to pitch-shift and speed-adjust a WAV blob.
 * Returns a new Blob URL with the processed audio.
 */
async function applyPitchShift(
  wavBlob: Blob,
  pitchMultiplier: number,
  rateMultiplier: number,
  signal?: AbortSignal,
): Promise<string> {
  const audioCtx = new AudioContext();

  try {
    const arrayBuffer = await wavBlob.arrayBuffer();
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    // Create offline context with adjusted duration
    const combinedRate = pitchMultiplier * rateMultiplier;
    const newDuration = audioBuffer.duration / combinedRate;
    const offlineCtx = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      Math.ceil(newDuration * audioBuffer.sampleRate),
      audioBuffer.sampleRate,
    );

    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.playbackRate.value = combinedRate;
    source.connect(offlineCtx.destination);
    source.start();

    const renderedBuffer = await offlineCtx.startRendering();
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    // Encode to WAV
    const wavData = encodeWAV(renderedBuffer);
    const blob = new Blob([wavData], { type: "audio/wav" });
    return URL.createObjectURL(blob);
  } finally {
    await audioCtx.close();
  }
}

/** Encode AudioBuffer → WAV ArrayBuffer */
function encodeWAV(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const numSamples = buffer.length;
  const bytesPerSample = 2; // 16-bit
  const dataSize = numSamples * numChannels * bytesPerSample;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);

  // WAV header
  writeString(view, 0, "RIFF");
  view.setUint32(4, totalSize - 8, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true);  // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
  view.setUint16(32, numChannels * bytesPerSample, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  // Interleave samples
  let offset = 44;
  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(buffer.getChannelData(ch));
  }

  for (let i = 0; i < numSamples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      view.setInt16(offset, sample * 0x7fff, true);
      offset += 2;
    }
  }

  return arrayBuffer;
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * Preview a voice for the settings screen.
 */
export async function piperPreview(profile: VoiceProfile): Promise<void> {
  const url = await piperSpeak(
    "Salut ! Je suis Bobby, ton compagnon préféré ! On va bien s'amuser ensemble !",
    profile,
  );

  if (url === "__piper_silent__") return;

  return new Promise((resolve, reject) => {
    const audio = new Audio(url);
    audio.onended = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Playback error"));
    };
    audio.play().catch(reject);
  });
}
