/**
 * Bobby Emotion Mapper v3.0 — Unified Pipeline
 * 
 * Bridges the new modular expression engine with the existing FaceState system.
 * All emotion detection now goes through the centralized pipeline.
 */
import type { FaceState } from "@/components/hologram/useFaceAnimation";
import type { Emotion } from "@/lib/voicePipeline";
import {
  processEmotionPipeline,
  processBobbyResponseEmotion,
} from "@/lib/bobby/emotionPipeline";
import type { BobbyEmotion, ExpressionResult } from "@/lib/bobby/expressionEngine";
import { resolveExpression } from "@/lib/bobby/expressionLibrary";
import type { FaceAnimationState } from "@/components/hologram/useFaceAnimation";

// ─── Legacy FaceState mapping (kept for backward compat) ────

const BOBBY_EMOTION_TO_FACE: Record<BobbyEmotion, FaceState> = {
  joy: "happy",
  sadness: "sad",
  fear: "reassuring",
  anger: "calm",
  love: "happy",
  curiosity: "curious",
  pride: "proud",
  surprise: "surprised",
  calm: "calm",
  excitement: "excited",
  boredom: "calm",
  shyness: "calm",
  embarrassment: "calm",
  relief: "happy",
  confusion: "confused",
  disgust: "calm",
  jealousy: "reassuring",
  gratitude: "happy",
  determination: "attentive",
  neutral: "idle",
};

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
  scared: "reassuring",
  bored: "playful",
  curious: "curious",
  excited: "excited",
  angry: "calm",
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
 * Auto-detect emotion from Bobby's response text → FaceState (legacy).
 * Now powered by the new emotion pipeline.
 */
export function detectBobbyEmotion(text: string): FaceState {
  const result = processBobbyResponseEmotion(text);
  return BOBBY_EMOTION_TO_FACE[result.emotion] ?? "happy";
}

/**
 * Full expression detection from Bobby's response text.
 * Returns both the legacy FaceState AND the new modular expression data.
 */
export function detectBobbyExpression(text: string, childAge: number = 7): {
  faceState: FaceState;
  expression: ExpressionResult;
  targets: Partial<FaceAnimationState>;
} {
  const expression = processBobbyResponseEmotion(text, childAge);
  const faceState = BOBBY_EMOTION_TO_FACE[expression.emotion] ?? "happy";
  const targets = resolveExpression(expression.combo, expression.intensity);
  return { faceState, expression, targets };
}

/**
 * Full expression detection from child's input text.
 * Bobby's face reacts to the child's emotion (empathetically).
 */
export function detectChildExpression(text: string, childAge: number = 7): {
  faceState: FaceState;
  expression: ExpressionResult;
  targets: Partial<FaceAnimationState>;
} {
  const pipelineResult = processEmotionPipeline(text, childAge);
  
  // Bobby reacts empathetically: mirror positive, comfort negative
  const bobbyReaction = mapChildEmotionToBobbyReaction(pipelineResult.emotion);
  const faceState = BOBBY_EMOTION_TO_FACE[bobbyReaction] ?? "attentive";
  
  return {
    faceState,
    expression: pipelineResult,
    targets: resolveExpression(pipelineResult.combo, pipelineResult.intensity),
  };
}

/**
 * Map child's detected emotion to Bobby's empathetic reaction.
 */
function mapChildEmotionToBobbyReaction(childEmotion: BobbyEmotion): BobbyEmotion {
  const reactionMap: Partial<Record<BobbyEmotion, BobbyEmotion>> = {
    sadness: "love",         // Bobby shows love when child is sad
    fear: "calm",            // Bobby stays calm/reassuring
    anger: "calm",           // Bobby de-escalates
    jealousy: "love",        // Bobby shows understanding
    disgust: "curiosity",    // Bobby redirects
    boredom: "excitement",   // Bobby energizes
    embarrassment: "love",   // Bobby comforts
    confusion: "curiosity",  // Bobby helps explore
  };
  return reactionMap[childEmotion] ?? childEmotion;
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

  if (/trop|super|incroyable|wow|génial|énorme|maximum|JAMAIS/i.test(lower) || exclamations >= 2)
    return Math.min(1.0, 0.8 + emojis * 0.05 + caps * 0.05);

  if (exclamations >= 1 || emojis >= 1)
    return 0.7;

  if (/\?/.test(text))
    return 0.55;

  if (/doucement|calme|tranquille|🌙/.test(lower))
    return 0.4;

  return 0.6;
}
