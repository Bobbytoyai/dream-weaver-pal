/**
 * Bobby AI — Adaptive Intelligence Engine v3.0
 * Real confidence scoring with fuzzy matching, synonym expansion,
 * age-weighted filtering, and response simplification by age group.
 */

import type { BobbyInteraction } from './bobby_interactions_10k';
import { similarity, wordOverlap, expandWithSynonyms, normalizeInput } from './offline-intents';
import { getAgeRules } from './bobby-content/contenu';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
export type AgeGroup = 'toddler' | 'young' | 'middle' | 'preteen';
export type EmotionState = 'joy' | 'sadness' | 'fear' | 'anger' | 'neutral' | 'excited' | 'curious';
export type AdaptationMode = 'simplified' | 'standard' | 'enriched';

export interface AdaptiveContext {
  childAge: number;
  detectedEmotion: string;
  sessionInteractionCount: number;
  lastCategory?: string;
  confidenceScore: number;
  isOffline: boolean;
}

export interface ScoredMatch {
  interaction: BobbyInteraction;
  confidence: number; // 0-1 real score
  matchType: 'exact' | 'fuzzy' | 'keyword' | 'category';
}

export interface AdaptedResponse {
  text: string;
  emotion: EmotionState;
  animationHint: 'bounce' | 'wave' | 'hug' | 'think' | 'celebrate' | 'comfort' | 'default';
  speakingSpeed: 'slow' | 'normal' | 'fast';
  followUpSuggestion?: string;
}

// ─────────────────────────────────────────────
// AGE GROUP MAPPING
// ─────────────────────────────────────────────
export function getAgeGroup(age: number): AgeGroup {
  if (age <= 6) return 'toddler';
  if (age <= 8) return 'young';
  if (age <= 10) return 'middle';
  return 'preteen';
}

export function getMaxDifficultyForAge(age: number): number {
  if (age <= 5) return 1;
  if (age <= 7) return 2;
  if (age <= 9) return 3;
  if (age <= 11) return 4;
  return 5;
}

// ─────────────────────────────────────────────
// RESPONSE SIMPLIFICATION BY AGE
// ─────────────────────────────────────────────
const COMPLEX_WORDS: Record<string, Record<AgeGroup, string>> = {
  'extraordinaire': { toddler: 'super', young: 'super', middle: 'génial', preteen: 'extraordinaire' },
  'magnifique': { toddler: 'beau', young: 'beau', middle: 'magnifique', preteen: 'magnifique' },
  'comprendre': { toddler: 'savoir', young: 'comprendre', middle: 'comprendre', preteen: 'comprendre' },
  'formidable': { toddler: 'super', young: 'super', middle: 'formidable', preteen: 'formidable' },
  'fantastique': { toddler: 'super', young: 'trop bien', middle: 'fantastique', preteen: 'fantastique' },
  'difficile': { toddler: 'dur', young: 'difficile', middle: 'difficile', preteen: 'difficile' },
  'probablement': { toddler: 'peut-être', young: 'peut-être', middle: 'probablement', preteen: 'probablement' },
  'éventuellement': { toddler: 'un jour', young: 'un jour', middle: 'peut-être', preteen: 'éventuellement' },
};

export function simplifyForAge(text: string, age: number): string {
  const group = getAgeGroup(age);
  const rules = getAgeRules(age);
  let result = text;

  // Replace complex vocabulary
  for (const [complex, replacements] of Object.entries(COMPLEX_WORDS)) {
    result = result.replace(new RegExp(complex, 'gi'), replacements[group]);
  }

  // Enforce max response length by age
  if (result.length > rules.maxResponseLength) {
    // Keep only complete sentences within the limit
    const sentences = result.match(/[^.!?]+[.!?]+/g) || [result];
    let trimmed = '';
    for (const sentence of sentences) {
      if ((trimmed + sentence).length <= rules.maxResponseLength + 20) {
        trimmed += sentence;
      } else break;
    }
    result = trimmed || sentences[0];
  }

  // For very young children, shorten further
  if (age <= 5) {
    const sentences = result.match(/[^.!?]+[.!?]+/g) || [result];
    result = sentences.slice(0, 2).join(' ');
  }

  return result.trim();
}

// ─────────────────────────────────────────────
// EMOTION → ANIMATION MAPPING
// ─────────────────────────────────────────────
const EMOTION_ANIMATIONS: Record<EmotionState, AdaptedResponse['animationHint']> = {
  joy: 'celebrate',
  sadness: 'hug',
  fear: 'comfort',
  anger: 'wave',
  neutral: 'default',
  excited: 'bounce',
  curious: 'think',
};

export function getAnimationForEmotion(emotion: EmotionState): AdaptedResponse['animationHint'] {
  return EMOTION_ANIMATIONS[emotion] ?? 'default';
}

// ─────────────────────────────────────────────
// SPEAKING SPEED BY AGE
// ─────────────────────────────────────────────
export function getSpeakingSpeed(age: number, emotion: EmotionState): AdaptedResponse['speakingSpeed'] {
  if (age <= 6) return 'slow';
  if (emotion === 'excited') return 'fast';
  if (emotion === 'fear' || emotion === 'sadness') return 'slow';
  return 'normal';
}

// ─────────────────────────────────────────────
// FOLLOW-UP SUGGESTIONS BY CATEGORY
// ─────────────────────────────────────────────
const FOLLOW_UPS: Record<string, string[]> = {
  jeu: ['Tu veux qu\'on invente un jeu ensemble ? 🎮', 'C\'est quoi ton jeu préféré ?', 'On peut jouer à autre chose si tu veux !'],
  emotion: ['Tu veux me parler de comment tu te sens ?', 'Je suis là pour toi ! 💙', 'Qu\'est-ce qui te ferait du bien là ?'],
  ecole: ['Tu veux qu\'on révise ensemble ?', 'C\'est quoi ta matière préférée ?', 'Tu veux qu\'on fasse un quiz ?'],
  imagination: ['Continuons l\'histoire ! Qu\'est-ce qui se passe ensuite ?', 'Si tu avais un super-pouvoir, ce serait lequel ?', 'Invente un personnage pour notre histoire !'],
  peur: ['Tu veux qu\'on allume une petite lumière ensemble ?', 'Je suis là avec toi, pas de panique ! 🤗', 'Tu veux qu\'on chante une chanson pour se rassurer ?'],
  humour: ['Tu en connais une autre, blague ? 😄', 'J\'ai une charade pour toi !', 'Tu veux qu\'on invente une blague ensemble ?'],
  animaux: ['C\'est quoi ton animal préféré ?', 'Tu veux qu\'on parle des dinosaures ? 🦕', 'Si tu étais un animal, tu serais lequel ?'],
  apprentissage: ['Tu veux qu\'on fasse un exercice ?', 'J\'ai une devinette sur ce sujet !', 'Tu veux en apprendre encore plus ?'],
};

export function getFollowUpSuggestion(category: string, age: number): string | undefined {
  const options = FOLLOW_UPS[category];
  if (!options) return undefined;
  const filtered = age <= 7 ? options.slice(0, 2) : options;
  return filtered[Math.floor(Math.random() * filtered.length)];
}

// ─────────────────────────────────────────────
// CONFIDENCE SCORING CONSTANTS
// ─────────────────────────────────────────────
const CONFIDENCE_THRESHOLDS = {
  EXACT: 0.95,    // Near-perfect string match
  HIGH: 0.78,     // Strong fuzzy + keyword match
  MEDIUM: 0.55,   // Decent keyword overlap
  LOW: 0.35,      // Weak match, fallback territory
  MIN: 0.25,      // Below this = no match
};

// ─────────────────────────────────────────────
// MAIN ADAPTIVE ENGINE
// ─────────────────────────────────────────────
export class AdaptiveIntelligenceEngine {
  private interactionHistory: Array<{ category: string; emotion: EmotionState; timestamp: number }> = [];
  private currentDifficultyLevel = 2;
  private successStreak = 0;

  adaptResponse(rawText: string, ctx: AdaptiveContext, category: string = 'general'): AdaptedResponse {
    const simplifiedText = simplifyForAge(rawText, ctx.childAge);
    this.updateDifficultyLevel(ctx);
    const dominantEmotion = (ctx.detectedEmotion || 'neutral') as EmotionState;
    const animationHint = getAnimationForEmotion(dominantEmotion);
    const speakingSpeed = getSpeakingSpeed(ctx.childAge, dominantEmotion);
    const followUpSuggestion = ctx.sessionInteractionCount >= 2
      ? getFollowUpSuggestion(category, ctx.childAge)
      : undefined;

    this.interactionHistory.push({ category, emotion: dominantEmotion, timestamp: Date.now() });
    if (this.interactionHistory.length > 50) this.interactionHistory.shift();

    return { text: simplifiedText, emotion: dominantEmotion, animationHint, speakingSpeed, followUpSuggestion };
  }

  private updateDifficultyLevel(ctx: AdaptiveContext): void {
    const maxDifficulty = getMaxDifficultyForAge(ctx.childAge);
    if (ctx.confidenceScore > 0.8) {
      this.successStreak++;
      if (this.successStreak >= 3 && this.currentDifficultyLevel < maxDifficulty) {
        this.currentDifficultyLevel = Math.min(this.currentDifficultyLevel + 1, maxDifficulty);
        this.successStreak = 0;
      }
    } else if (ctx.confidenceScore < 0.5) {
      this.successStreak = 0;
      this.currentDifficultyLevel = Math.max(1, this.currentDifficultyLevel - 1);
    }
  }

  /**
   * Find the best matching interaction from the 10K database with REAL confidence scoring.
   *
   * Scoring formula:
   *   confidence = (stringSimilarity * 0.35) + (wordOverlap * 0.35) + (ageBonus * 0.15) + (emotionBonus * 0.10) + (categoryBonus * 0.05)
   *
   * Returns null if best score < MIN threshold.
   */
  findBestMatch(
    userInput: string,
    ctx: AdaptiveContext,
    interactions: BobbyInteraction[]
  ): (BobbyInteraction & { _confidence: number }) | null {
    const normalized = normalizeInput(userInput);
    if (!normalized || normalized.length < 2) return null;

    const maxDiff = getMaxDifficultyForAge(ctx.childAge);
    const userWords = normalized.split(/\s+/).filter(w => w.length > 1);

    // Expand user words with synonyms for broader matching
    const expandedUserWords = new Set<string>();
    for (const w of userWords) {
      for (const syn of expandWithSynonyms(w)) {
        expandedUserWords.add(syn);
      }
    }

    // Pre-filter: age ±3, difficulty within range
    const candidates = interactions.filter(
      (i) => Math.abs(i.age - ctx.childAge) <= 3 && i.difficulty_level <= maxDiff + 1
    );

    if (candidates.length === 0) return null;

    let bestScore = 0;
    let bestMatch: BobbyInteraction | null = null;
    let bestType: ScoredMatch['matchType'] = 'keyword';

    // Sample large databases for performance (score top candidates from random sample)
    const sampleSize = Math.min(candidates.length, 3000);
    const sampled = candidates.length <= sampleSize
      ? candidates
      : shuffleSample(candidates, sampleSize);

    for (const candidate of sampled) {
      const candidateNorm = normalizeInput(candidate.child_input);

      // 1. String similarity (Levenshtein-based, 0-1)
      const strSim = similarity(normalized, candidateNorm);

      // 2. Word overlap with synonym expansion (0-1)
      const candidateWords = candidateNorm.split(/\s+/).filter(w => w.length > 1);
      let overlapCount = 0;
      for (const cw of candidateWords) {
        const cwExpanded = expandWithSynonyms(cw);
        if (cwExpanded.some(e => expandedUserWords.has(e))) {
          overlapCount++;
        }
      }
      const wOverlap = candidateWords.length > 0 ? overlapCount / candidateWords.length : 0;

      // 3. Age proximity bonus (0-1, perfect age match = 1)
      const ageDiff = Math.abs(candidate.age - ctx.childAge);
      const ageBonus = ageDiff === 0 ? 1.0 : ageDiff === 1 ? 0.8 : ageDiff === 2 ? 0.5 : 0.2;

      // 4. Emotion match bonus
      const emotionBonus = candidate.emotion === ctx.detectedEmotion ? 1.0
        : (candidate.emotion === 'neutral' || ctx.detectedEmotion === 'neutral') ? 0.5
        : 0.0;

      // 5. Category continuity bonus (if same category as last interaction)
      const categoryBonus = ctx.lastCategory && candidate.category === ctx.lastCategory ? 1.0 : 0.0;

      // Weighted score
      const score = (strSim * 0.35) + (wOverlap * 0.35) + (ageBonus * 0.15) + (emotionBonus * 0.10) + (categoryBonus * 0.05);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = candidate;
        bestType = strSim > 0.85 ? 'exact' : strSim > 0.6 ? 'fuzzy' : wOverlap > 0.5 ? 'keyword' : 'category';
      }
    }

    if (!bestMatch || bestScore < CONFIDENCE_THRESHOLDS.MIN) return null;

    // Clamp confidence to 0-1 range
    const confidence = Math.min(1, Math.max(0, bestScore));

    console.log(`[AdaptiveEngine] Match: "${bestMatch.child_input}" (conf=${confidence.toFixed(2)}, type=${bestType}, age=${bestMatch.age})`);

    return { ...bestMatch, _confidence: confidence };
  }

  getCurrentDifficulty(): number {
    return this.currentDifficultyLevel;
  }

  getRecentCategories(): string[] {
    return [...new Set(this.interactionHistory.slice(-10).map((h) => h.category))];
  }

  reset(): void {
    this.interactionHistory = [];
    this.currentDifficultyLevel = 2;
    this.successStreak = 0;
  }
}

/** Fisher-Yates sample without mutating the original */
function shuffleSample<T>(arr: T[], size: number): T[] {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, size);
}

// Singleton export
export const adaptiveEngine = new AdaptiveIntelligenceEngine();
