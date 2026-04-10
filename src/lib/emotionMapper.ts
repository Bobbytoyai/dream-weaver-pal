/**
 * Bobby Emotion Mapper v2.4
 * Maps detected emotions (from text/KB) to hologram FaceState expressions.
 * 
 * Emotion sources:
 * 1. knowledge_base `emotion` column (offline KB matches)
 * 2. detectEmotionForTTS (text analysis)
 * 3. AI response tone analysis
 */
import type { FaceState } from "@/components/hologram/useFaceAnimation";
import type { Emotion } from "@/lib/voicePipeline";

// ─── KB emotion → FaceState mapping ─────────────────────────
const KB_EMOTION_MAP: Record<string, FaceState> = {
  happy: "happy",
  sad: "sad",
  curious: "curious",
  excited: "excited",
  calm: "calm",
  thinking: "thinking",
  surprised: "surprised",
  playful: "playful",
  proud: "proud",
};

// ─── TTS Emotion → FaceState mapping ────────────────────────
const TTS_EMOTION_MAP: Record<string, FaceState> = {
  happy: "happy",
  sad: "sad",
  scared: "sad",        // no "scared" face, use sad
  bored: "sleepy",
  curious: "curious",
  excited: "excited",
  angry: "confused",    // no "angry" face, use confused
  calm: "calm",
};

/**
 * Convert a KB emotion string to a FaceState for the hologram.
 */
export function kbEmotionToFace(emotion: string | undefined | null): FaceState | undefined {
  if (!emotion) return undefined;
  return KB_EMOTION_MAP[emotion] || undefined;
}

/**
 * Convert a TTS/voice emotion to a FaceState for the hologram.
 */
export function ttsEmotionToFace(emotion: Emotion | undefined): FaceState | undefined {
  if (!emotion) return undefined;
  return TTS_EMOTION_MAP[emotion] || undefined;
}

/**
 * Auto-detect emotion from Bobby's response text → FaceState.
 * More comprehensive than detectEmotionForTTS, tuned for Bobby's output.
 */
export function detectBobbyEmotion(text: string): FaceState {
  const lower = text.toLowerCase();

  // SAD / empathetic
  if (/triste|pleure|cafard|blessé|seul|incompris|pas bien|mal au|désolé|courage/.test(lower))
    return "sad";

  // EXCITED / high energy
  if (/wow|incroyable|génial|super|trop bien|magique|bravo|fête|champion|victoire|yeay|🎉|🎊/.test(lower))
    return "excited";

  // SURPRISED
  if (/vraiment\s*\?|sérieux|c'est fou|bizarre|impossible|tu savais que|dingue/.test(lower))
    return "surprised";

  // CURIOUS / questioning
  if (/pourquoi|comment|c'est quoi|tu penses|explique|qu'en dis|ton avis|\?$/.test(lower))
    return "curious";

  // THINKING / reflective
  if (/hmm|réfléchi|imagine|et si|suppose|difficile|dilemme/.test(lower))
    return "thinking";

  // CALM / reassuring
  if (/calme|tranquille|dors|nuit|bonsoir|repose|paix|doucement|respire/.test(lower))
    return "calm";

  // HAPPY (default positive)
  if (/😊|😄|💛|❤️|aime|content|heureux|sourire|rire|rigol|adore|chouette|sympa/.test(lower))
    return "happy";

  // PLAYFUL
  if (/blague|taquin|coquin|farce|😜|😝|😏|haha|hihi|marrant|drôle|rigolo/.test(lower))
    return "playful";

  // PROUD
  if (/bravo|fier|champion|réussi|gagné|bien joué|super boulot|tu gères|💪|🏆/.test(lower))
    return "proud";

  // Reassuring (for emotional support responses)
  if (/je suis là|t'écoute|ensemble|confiance|normal/.test(lower))
    return "reassuring";

  return "happy"; // default Bobby is happy
}

/**
 * Compute emotion intensity based on text markers.
 * Returns 0.4-1.0 (low → high intensity)
 */
export function detectEmotionIntensity(text: string): number {
  const lower = text.toLowerCase();
  const exclamations = (text.match(/!/g) || []).length;
  const emojis = (text.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
  const caps = (text.match(/[A-ZÀ-ÜÉ]{3,}/g) || []).length;

  // High intensity markers
  if (/trop|super|incroyable|wow|génial|énorme|maximum|JAMAIS/i.test(lower) || exclamations >= 2)
    return Math.min(1.0, 0.8 + emojis * 0.05 + caps * 0.05);

  // Medium intensity
  if (exclamations >= 1 || emojis >= 1)
    return 0.7;

  // Low-medium for questions
  if (/\?/.test(text))
    return 0.55;

  // Calm/soft
  if (/doucement|calme|tranquille|🌙/.test(lower))
    return 0.4;

  return 0.6; // default
}
