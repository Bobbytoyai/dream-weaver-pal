/**
 * Bobby AI — Adaptive Intelligence Engine v2.0
 * Adapts responses based on age, emotion, difficulty level
 * Uses the 10001-interaction database for context-aware responses
 */

import type { BobbyInteraction } from './bobby_interactions_10k';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
export type AgeGroup = 'toddler' | 'young' | 'middle' | 'preteen';
export type EmotionState = 'joy' | 'sadness' | 'fear' | 'anger' | 'neutral' | 'excited' | 'curious';
export type AdaptationMode = 'simplified' | 'standard' | 'enriched';

export interface AdaptiveContext {
  childAge: number;
  detectedEmotion: EmotionState;
  sessionInteractionCount: number;
  lastCategory?: string;
  confidenceScore: number; // 0-1 from STT
  isOffline: boolean;
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
  let result = text;
  for (const [complex, replacements] of Object.entries(COMPLEX_WORDS)) {
    result = result.replace(new RegExp(complex, 'gi'), replacements[group]);
  }
  // For very young children, shorten sentences (keep only first 2 sentences)
  if (age <= 6) {
    const sentences = result.match(/[^.!?]+[.!?]+/g) || [result];
    result = sentences.slice(0, 2).join(' ');
  }
  return result;
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
  jeu: [
    'Tu veux qu\'on invente un jeu ensemble ? 🎮',
    'C\'est quoi ton jeu préféré ?',
    'On peut jouer à autre chose si tu veux !',
  ],
  emotion: [
    'Tu veux me parler de comment tu te sens ?',
    'Je suis là pour toi ! 💙',
    'Qu\'est-ce qui te ferait du bien là ?',
  ],
  ecole: [
    'Tu veux qu\'on révise ensemble ?',
    'C\'est quoi ta matière préférée ?',
    'Tu veux qu\'on fasse un quiz ?',
  ],
  imagination: [
    'Continuons l\'histoire ! Qu\'est-ce qui se passe ensuite ?',
    'Si tu avais un super-pouvoir, ce serait lequel ?',
    'Invente un personnage pour notre histoire !',
  ],
  peur: [
    'Tu veux qu\'on allume une petite lumière ensemble ?',
    'Je suis là avec toi, pas de panique ! 🤗',
    'Tu veux qu\'on chante une chanson pour se rassurer ?',
  ],
  humour: [
    'Tu en connais une autre, blague ? 😄',
    'J\'ai une charade pour toi !',
    'Tu veux qu\'on invente une blague ensemble ?',
  ],
  animaux: [
    'C\'est quoi ton animal préféré ?',
    'Tu veux qu\'on parle des dinosaures ? 🦕',
    'Si tu étais un animal, tu serais lequel ?',
  ],
  apprentissage: [
    'Tu veux qu\'on fasse un exercice ?',
    'J\'ai une devinette sur ce sujet !',
    'Tu veux en apprendre encore plus ?',
  ],
};

export function getFollowUpSuggestion(category: string, age: number): string | undefined {
  const options = FOLLOW_UPS[category];
  if (!options) return undefined;
  const filtered = age <= 7 ? options.slice(0, 2) : options;
  return filtered[Math.floor(Math.random() * filtered.length)];
}

// ─────────────────────────────────────────────
// MAIN ADAPTIVE ENGINE
// ─────────────────────────────────────────────
export class AdaptiveIntelligenceEngine {
  private interactionHistory: Array<{ category: string; emotion: EmotionState; timestamp: number }> = [];
  private currentDifficultyLevel = 2;
  private successStreak = 0;

  /**
   * Adapt a raw Bobby response to match the child's age, emotion, and context
   */
  adaptResponse(rawText: string, ctx: AdaptiveContext, category: string = 'general'): AdaptedResponse {
    // 1. Simplify vocabulary for age
    const simplifiedText = simplifyForAge(rawText, ctx.childAge);

    // 2. Adapt difficulty over time (progressive)
    this.updateDifficultyLevel(ctx);

    // 3. Get emotion & animation
    const dominantEmotion = ctx.detectedEmotion;
    const animationHint = getAnimationForEmotion(dominantEmotion);

    // 4. Get speaking speed
    const speakingSpeed = getSpeakingSpeed(ctx.childAge, dominantEmotion);

    // 5. Follow-up suggestion (only after first few interactions)
    const followUpSuggestion = ctx.sessionInteractionCount >= 2
      ? getFollowUpSuggestion(category, ctx.childAge)
      : undefined;

    // 6. Record interaction for history
    this.interactionHistory.push({ category, emotion: dominantEmotion, timestamp: Date.now() });
    if (this.interactionHistory.length > 50) this.interactionHistory.shift(); // Keep last 50

    return {
      text: simplifiedText,
      emotion: dominantEmotion,
      animationHint,
      speakingSpeed,
      followUpSuggestion,
    };
  }

  /**
   * Progressive difficulty: if child keeps engaging, increase complexity
   */
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
   * Find the best matching interaction from the 10K database (offline use)
   */
  findBestMatch(
    userInput: string,
    ctx: AdaptiveContext,
    interactions: BobbyInteraction[]
  ): BobbyInteraction | null {
    const ageGroup = getAgeGroup(ctx.childAge);
    const maxDiff = getMaxDifficultyForAge(ctx.childAge);
    const userWords = userInput.toLowerCase().split(/\s+/);

    // Filter by age and difficulty
    const candidates = interactions.filter(
      (i) => Math.abs(i.age - ctx.childAge) <= 2 && i.difficulty_level <= maxDiff
    );

    if (candidates.length === 0) return null;

    // Score by keyword overlap
    const scored = candidates.map((i) => {
      const inputWords = i.child_input.toLowerCase().split(/\s+/);
      const overlap = userWords.filter((w) => w.length > 3 && inputWords.some((iw) => iw.includes(w))).length;
      const emotionBonus = i.emotion === ctx.detectedEmotion ? 2 : 0;
      return { interaction: i, score: overlap + emotionBonus };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.score > 0 ? scored[0].interaction : null;
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

// Singleton export
export const adaptiveEngine = new AdaptiveIntelligenceEngine();
