/**
 * Bobby Emotion Pipeline v1.0 — Real-Time Emotion Detection & Expression
 * 
 * Pipeline: text → NLP analysis → emotion → emoji → expression → animation
 * 
 * Features:
 * - French NLP emotion detection with 20+ emotion categories
 * - Context memory (last 3 messages)
 * - Age-adaptive intensity
 * - <100ms latency (all local, no API calls)
 */

import {
  type BobbyEmotion,
  type EmotionState,
  type ExpressionResult,
  emotionToExpression,
  getFallbackExpression,
  adaptIntensityForAge,
} from "./expressionEngine";
import { resolveExpression, type ExpressionCombo } from "./expressionLibrary";
import type { FaceAnimationState } from "@/components/hologram/useFaceAnimation";

// ─── NLP Emotion Patterns ────────────────────────────────────

interface EmotionPattern {
  emotion: BobbyEmotion;
  patterns: RegExp[];
  baseIntensity: number;
}

const EMOTION_PATTERNS: EmotionPattern[] = [
  // Joy / Happiness
  {
    emotion: "joy",
    patterns: [
      /content|heureux|heureuse|joie|super|génial|genial|cool|chouette|adore|aime bien|trop bien|youpi|yay|hourra|yeah|oui !|😄|😊|🎉|❤️|💛/i,
      /rigol|marrant|drôle|drole|haha|hihi|hoho|lol|mdr/i,
    ],
    baseIntensity: 3,
  },
  // Sadness
  {
    emotion: "sadness",
    patterns: [
      /triste|pleure|pleurer|pas bien|mal au|blessé|seul|seule|manque|cafard|désolé|😔|😢|💧/i,
      /incompris|abandonné|personne m'aime|pas d'amis/i,
    ],
    baseIntensity: 3,
  },
  // Fear
  {
    emotion: "fear",
    patterns: [
      /peur|effrayé|effrayée|terrifié|cauchemar|monstre|noir|nuit|angoiss|stress|anxie|😨|😰/i,
      /j'ai peur|fait peur|me fait peur|j'ose pas/i,
    ],
    baseIntensity: 3,
  },
  // Anger
  {
    emotion: "anger",
    patterns: [
      /en colère|colere|énervé|énerve|fâché|fache|agacé|rage|injuste|😠|😤|🔥/i,
      /c'est pas juste|j'en ai marre|ras le bol|déteste/i,
    ],
    baseIntensity: 3,
  },
  // Love / Affection
  {
    emotion: "love",
    patterns: [
      /je t'aime|t'adore|câlin|calin|bisou|cœur|coeur|amour|💛|🥰|❤️|💕/i,
      /tu es gentil|tu es mon ami|meilleur ami/i,
    ],
    baseIntensity: 3,
  },
  // Curiosity
  {
    emotion: "curiosity",
    patterns: [
      /pourquoi|comment|c'est quoi|qu'est-ce|explique|raconte|dis-moi|🤔|🧐/i,
      /tu sais|tu connais|c'est vrai|sérieux/i,
    ],
    baseIntensity: 3,
  },
  // Pride
  {
    emotion: "pride",
    patterns: [
      /fier|fière|réussi|gagné|champion|meilleur|bravo|bien joué|💪|🏆|🌟/i,
      /j'ai réussi|j'ai fait|regarde ce que/i,
    ],
    baseIntensity: 3,
  },
  // Surprise
  {
    emotion: "surprise",
    patterns: [
      /c'est fou|impossible|dingue|incroyable|😲|😮|🤯/i,
      /pas possible|je crois pas|waouh/i,
    ],
    baseIntensity: 3,
  },
  // Calm
  {
    emotion: "calm",
    patterns: [
      /calme|tranquille|dors|bonne nuit|bonsoir|repose|paix|doucement|respire|🌙|😌/i,
      /tout va bien|pas de souci|relaxe|zen/i,
    ],
    baseIntensity: 2,
  },
  // Excitement
  {
    emotion: "excitement",
    patterns: [
      /trop hâte|j'ai hâte|vivement|impatient|🤩|🚀|⚡/i,
      /on y va|allons-y|en avant|parti/i,
    ],
    baseIntensity: 4,
  },
  // Boredom
  {
    emotion: "boredom",
    patterns: [
      /m'ennuie|ennui|rien à faire|chiant|barbant|nul|bof|💤|😐/i,
      /sais pas quoi faire|c'est long/i,
    ],
    baseIntensity: 2,
  },
  // Shyness
  {
    emotion: "shyness",
    patterns: [
      /timide|j'ose pas|gêné|gênée|rouge|🙈|😳/i,
      /devant tout le monde|les autres vont/i,
    ],
    baseIntensity: 3,
  },
  // Embarrassment
  {
    emotion: "embarrassment",
    patterns: [
      /honte|ridicule|la honte|embarrass|😅|😬/i,
      /tout le monde a ri|j'ai fait une bêtise/i,
    ],
    baseIntensity: 3,
  },
  // Confusion
  {
    emotion: "confusion",
    patterns: [
      /comprends pas|confus|perdu|hein|quoi\s*[?]|😵/i,
      /rien compris|c'est bizarre|chelou/i,
    ],
    baseIntensity: 2,
  },
  // Gratitude
  {
    emotion: "gratitude",
    patterns: [
      /merci|remerci|gentil|sympa|🙏|🤗/i,
      /trop aimable|c'est gentil|je te remercie/i,
    ],
    baseIntensity: 3,
  },
  // Determination
  {
    emotion: "determination",
    patterns: [
      /je vais y arriver|je peux|j'y arriverai|abandon pas|lâche pas|🔥|💪/i,
      /je suis fort|je suis capable|facile/i,
    ],
    baseIntensity: 4,
  },
  // Jealousy
  {
    emotion: "jealousy",
    patterns: [
      /jaloux|jalouse|c'est pas juste|lui il a|elle elle a|😒/i,
      /pourquoi pas moi|moi aussi je veux/i,
    ],
    baseIntensity: 3,
  },
  // Relief
  {
    emotion: "relief",
    patterns: [
      /ouf|soulagement|j'ai eu chaud|ça va mieux|enfin|😮‍💨/i,
      /c'est fini|c'est passé|plus de souci/i,
    ],
    baseIntensity: 3,
  },
];

// ─── Intensity Modifiers ─────────────────────────────────────

function computeIntensityModifier(text: string): number {
  let mod = 0;
  const exclamations = (text.match(/!/g) || []).length;
  const emojis = (text.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
  const caps = (text.match(/[A-ZÀ-ÜÉ]{3,}/g) || []).length;
  const intensifiers = /trop|super|très|vraiment|énormément|mega|hyper|ultra/i;

  if (exclamations >= 2) mod += 1;
  else if (exclamations >= 1) mod += 0.5;
  if (emojis >= 2) mod += 0.5;
  if (caps >= 1) mod += 0.5;
  if (intensifiers.test(text)) mod += 1;

  // Soft modifiers
  if (/doucement|un peu|légèrement|petit peu/i.test(text)) mod -= 1;
  if (/\?$/.test(text.trim())) mod -= 0.5;

  return mod;
}

// ─── Context Memory ──────────────────────────────────────────

interface EmotionContext {
  emotion: BobbyEmotion;
  intensity: number;
  timestamp: number;
}

const emotionHistory: EmotionContext[] = [];
const MAX_HISTORY = 5;

function updateHistory(emotion: BobbyEmotion, intensity: number) {
  emotionHistory.push({ emotion, intensity, timestamp: Date.now() });
  if (emotionHistory.length > MAX_HISTORY) emotionHistory.shift();
}

function getContextBoost(): { emotion?: BobbyEmotion; boost: number } {
  if (emotionHistory.length < 2) return { boost: 0 };
  const recent = emotionHistory.slice(-3);
  const lastEmotion = recent[recent.length - 1]?.emotion;
  
  // If same emotion repeated → reinforce
  const sameCount = recent.filter(e => e.emotion === lastEmotion).length;
  if (sameCount >= 2) {
    return { emotion: lastEmotion, boost: 0.5 * (sameCount - 1) };
  }

  // If improving (negative → positive) → transition boost
  const negatives: BobbyEmotion[] = ["sadness", "fear", "anger", "jealousy", "disgust"];
  const positives: BobbyEmotion[] = ["joy", "excitement", "pride", "love", "gratitude", "relief"];
  const prevNeg = recent.slice(0, -1).some(e => negatives.includes(e.emotion));
  const curPos = lastEmotion && positives.includes(lastEmotion);
  if (prevNeg && curPos) {
    return { emotion: "relief", boost: 0.5 };
  }

  return { boost: 0 };
}

// ─── Main Pipeline ───────────────────────────────────────────

/**
 * Analyze text and return detected emotion state.
 */
export function detectEmotion(text: string): EmotionState {
  const lower = text.toLowerCase();
  
  // Short or trivial text → always neutral (prevents false detections on "oh", "ok", etc.)
  if (text.trim().length < 8) {
    return { emotion: "neutral", intensity: 2 };
  }
  
  let bestMatch: { emotion: BobbyEmotion; score: number; baseIntensity: number } | null = null;
  let secondaryMatch: BobbyEmotion | undefined;

  for (const pattern of EMOTION_PATTERNS) {
    let matchScore = 0;
    for (const regex of pattern.patterns) {
      if (regex.test(lower)) matchScore++;
    }
    if (matchScore > 0) {
      if (!bestMatch || matchScore > bestMatch.score) {
        secondaryMatch = bestMatch?.emotion;
        bestMatch = { emotion: pattern.emotion, score: matchScore, baseIntensity: pattern.baseIntensity };
      } else if (!secondaryMatch) {
        secondaryMatch = pattern.emotion;
      }
    }
  }

  if (!bestMatch) {
    return { emotion: "neutral", intensity: 2 };
  }

  const intensityMod = computeIntensityModifier(text);
  const rawIntensity = bestMatch.baseIntensity + intensityMod;
  const intensity = Math.max(1, Math.min(5, Math.round(rawIntensity)));

  updateHistory(bestMatch.emotion, intensity);

  return {
    emotion: bestMatch.emotion,
    secondary: secondaryMatch,
    intensity,
  };
}

/**
 * Full pipeline: text → emotion → expression result.
 * Returns everything needed for face rendering + UI display.
 */
export function processEmotionPipeline(
  text: string,
  childAge: number = 7,
): ExpressionResult & { emotionState: EmotionState } {
  const emotionState = detectEmotion(text);
  
  // Age adaptation
  const adaptedIntensity = adaptIntensityForAge(emotionState.intensity, childAge);
  
  // Context boost
  const contextBoost = getContextBoost();
  const finalIntensity = Math.max(1, Math.min(5, Math.round(adaptedIntensity + contextBoost.boost)));

  const result = emotionToExpression({
    ...emotionState,
    intensity: finalIntensity,
  });

  return { ...result, intensity: finalIntensity, emotionState };
}

/**
 * Analyze Bobby's response text to determine his expression.
 * (For the face to match what Bobby is saying, not what the child said)
 */
export function processBobbyResponseEmotion(
  responseText: string,
  childAge: number = 7,
): ExpressionResult {
  const emotionState = detectEmotion(responseText);
  const adaptedIntensity = adaptIntensityForAge(emotionState.intensity, childAge);
  return emotionToExpression({ ...emotionState, intensity: adaptedIntensity });
}

/**
 * Get resolved FaceAnimationState targets from a pipeline result.
 */
export function expressionToFaceTargets(
  result: ExpressionResult,
): Partial<FaceAnimationState> {
  return resolveExpression(result.combo, result.intensity);
}

/**
 * Reset emotion context (on session start/end).
 */
export function resetEmotionPipeline() {
  emotionHistory.length = 0;
}
