/**
 * Bobby Brain V6 — Advanced Memory System
 *
 * Extends PersistentMemory with:
 * 1. Smart Decay — facts lose relevance over time (configurable by category)
 * 2. Category Importance — health/safety facts persist longer than casual preferences
 * 3. Contextual Relevance Scoring — rank facts by relevance to current conversation
 * 4. Emotional Memory — track emotional patterns across sessions
 *
 * Synchrone sauf load/save. <1ms pour scoring/decay.
 */

import type { PersistentFact } from "../persistentMemory";
import type { FactCategory } from "../factExtractor";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CATEGORY IMPORTANCE WEIGHTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Higher = retained longer, harder to forget */
export const CATEGORY_IMPORTANCE: Record<FactCategory, number> = {
  santé:      1.0,   // Allergies, conditions — never forget
  famille:    0.9,   // Core identity
  identité:   0.9,   // Age, name, birthday
  peur:       0.85,  // Important for emotional support
  animaux:    0.8,   // Pets are family
  amis:       0.75,  // Social bonds
  école:      0.7,   // School context
  activité:   0.65,  // Hobbies, sports
  rêve:       0.6,   // Future aspirations
  préférence: 0.5,   // Preferences change often
  aversion:   0.5,   // Dislikes change
  lieu:       0.55,  // Locations
  objet:      0.6,   // Toys, comfort objects
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DECAY CONFIG
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const DECAY_HALF_LIFE_DAYS: Record<string, number> = {
  high:   180,  // importance >= 0.85 → 6 months half-life
  medium: 60,   // importance 0.6-0.84 → 2 months
  low:    21,   // importance < 0.6 → 3 weeks
};

function getHalfLife(category: string): number {
  const importance = CATEGORY_IMPORTANCE[category as FactCategory] ?? 0.5;
  if (importance >= 0.85) return DECAY_HALF_LIFE_DAYS.high;
  if (importance >= 0.6) return DECAY_HALF_LIFE_DAYS.medium;
  return DECAY_HALF_LIFE_DAYS.low;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ENHANCED FACT (extends PersistentFact)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface EnhancedFact extends PersistentFact {
  lastMentioned: string;       // ISO date — refreshed on re-mention
  decayScore: number;          // 0-1, current "freshness"
  importanceScore: number;     // computed: category weight × mention boost
  relevanceScore?: number;     // transient: contextual relevance (set by query)
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EMOTIONAL MEMORY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface EmotionalMemoryEntry {
  emotion: string;
  intensity: number;
  context: string;        // topic or trigger
  timestamp: string;      // ISO date
}

export interface EmotionalProfile {
  /** Rolling average mood per session (last 10 sessions) */
  sessionMoods: Array<{ date: string; mood: "positive" | "neutral" | "negative" }>;
  /** Emotion frequency counter */
  emotionFrequency: Record<string, number>;
  /** Notable emotional moments (high intensity) */
  significantMoments: EmotionalMemoryEntry[];
}

export const EMPTY_EMOTIONAL_PROFILE: EmotionalProfile = {
  sessionMoods: [],
  emotionFrequency: {},
  significantMoments: [],
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DECAY COMPUTATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Compute decay score for a fact based on time since last mention.
 * Uses exponential decay: score = 2^(-daysSinceLastMention / halfLife)
 * Boosted by mention count (more mentions = slower decay).
 */
export function computeDecay(fact: EnhancedFact, now: Date = new Date()): number {
  const lastDate = new Date(fact.lastMentioned || fact.firstMentioned);
  const daysSince = Math.max(0, (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

  const halfLife = getHalfLife(fact.category);

  // Mention boost: each additional mention adds 10% to half-life (capped at 2x)
  const mentionBoost = Math.min(2, 1 + (fact.mentionCount - 1) * 0.1);
  const effectiveHalfLife = halfLife * mentionBoost;

  // Exponential decay
  const decay = Math.pow(2, -daysSince / effectiveHalfLife);

  return Math.round(decay * 1000) / 1000; // 3 decimal precision
}

/**
 * Compute importance score: combines category weight with mention frequency.
 */
export function computeImportance(fact: EnhancedFact): number {
  const catWeight = CATEGORY_IMPORTANCE[fact.category as FactCategory] ?? 0.5;
  const mentionBonus = Math.min(0.2, (fact.mentionCount - 1) * 0.05);
  return Math.min(1, Math.round((catWeight + mentionBonus) * 100) / 100);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONTEXTUAL RELEVANCE SCORING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Score facts by relevance to the current conversation context.
 * Returns facts sorted by combined score (decay × importance × relevance).
 */
export function scoreFactsForContext(
  facts: EnhancedFact[],
  context: {
    currentTopic?: string | null;
    currentEmotion?: string;
    userText?: string;
    childAge?: number;
  },
): EnhancedFact[] {
  const now = new Date();
  const userWords = new Set(
    (context.userText || "").toLowerCase().split(/\s+/).filter(w => w.length > 2)
  );

  return facts
    .map(fact => {
      const decay = computeDecay(fact, now);
      const importance = computeImportance(fact);

      // Contextual relevance: keyword overlap with current message
      let relevance = 0.5; // base
      const factWords = fact.text.toLowerCase().split(/\s+/).filter(w => w.length > 2);

      if (userWords.size > 0 && factWords.length > 0) {
        let overlap = 0;
        for (const w of factWords) {
          if (userWords.has(w)) overlap++;
        }
        relevance = 0.5 + (overlap / Math.max(factWords.length, 1)) * 0.5;
      }

      // Topic match bonus
      if (context.currentTopic) {
        const topicLower = context.currentTopic.toLowerCase();
        if (fact.category === topicLower || fact.text.toLowerCase().includes(topicLower)) {
          relevance = Math.min(1, relevance + 0.3);
        }
      }

      // Emotional context bonus: if child is sad and fact is about peur/famille → more relevant
      if (context.currentEmotion) {
        const emotionalCategories: Record<string, FactCategory[]> = {
          sadness: ["famille", "amis", "animaux"],
          fear: ["peur", "famille"],
          joy: ["préférence", "activité", "amis"],
          anger: ["famille", "amis", "école"],
        };
        const boostedCats = emotionalCategories[context.currentEmotion] || [];
        if (boostedCats.includes(fact.category as FactCategory)) {
          relevance = Math.min(1, relevance + 0.15);
        }
      }

      // Combined score: weighted product
      const combinedScore = decay * 0.3 + importance * 0.3 + relevance * 0.4;

      return {
        ...fact,
        decayScore: decay,
        importanceScore: importance,
        relevanceScore: Math.round(relevance * 100) / 100,
        _combinedScore: combinedScore,
      };
    })
    .sort((a, b) => (b as any)._combinedScore - (a as any)._combinedScore)
    .map(({ _combinedScore, ...rest }) => rest as EnhancedFact);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SMART FORGETTING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const FORGET_THRESHOLD = 0.05; // Below this decay score → eligible for forgetting
const MAX_ENHANCED_FACTS = 50; // Hard cap

/**
 * Apply smart forgetting: remove facts that have decayed below threshold.
 * Never forgets health/safety facts (importance >= 0.9).
 * Returns the pruned list.
 */
export function applySmartForgetting(facts: EnhancedFact[]): {
  kept: EnhancedFact[];
  forgotten: EnhancedFact[];
} {
  const now = new Date();
  const kept: EnhancedFact[] = [];
  const forgotten: EnhancedFact[] = [];

  for (const fact of facts) {
    const decay = computeDecay(fact, now);
    const importance = computeImportance(fact);

    // Never forget critical facts (santé, identité, famille)
    if (importance >= 0.9) {
      kept.push({ ...fact, decayScore: decay, importanceScore: importance });
      continue;
    }

    // Forget if decay is below threshold
    if (decay < FORGET_THRESHOLD) {
      forgotten.push(fact);
      continue;
    }

    kept.push({ ...fact, decayScore: decay, importanceScore: importance });
  }

  // Hard cap: if still too many, drop lowest-scored
  if (kept.length > MAX_ENHANCED_FACTS) {
    kept.sort((a, b) => {
      const scoreA = a.decayScore * 0.4 + a.importanceScore * 0.6;
      const scoreB = b.decayScore * 0.4 + b.importanceScore * 0.6;
      return scoreB - scoreA;
    });
    const overflow = kept.splice(MAX_ENHANCED_FACTS);
    forgotten.push(...overflow);
  }

  return { kept, forgotten };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INTEREST DECAY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const INTEREST_DECAY_RATE = 0.9; // per session: retain 90% of score

/**
 * Apply gentle decay to interest scores.
 * Called at session end to prevent old interests from dominating.
 */
export function decayInterestScores(
  scores: Record<string, number>,
  activeSessionTopics: string[] = [],
): Record<string, number> {
  const result: Record<string, number> = {};

  for (const [topic, score] of Object.entries(scores)) {
    // Active session topics don't decay this session
    if (activeSessionTopics.includes(topic)) {
      result[topic] = score;
      continue;
    }

    const decayed = Math.round(score * INTEREST_DECAY_RATE * 10) / 10;
    // Remove if negligible
    if (decayed >= 0.5) {
      result[topic] = decayed;
    }
  }

  return result;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EMOTIONAL MEMORY MANAGEMENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const MAX_SESSION_MOODS = 10;
const MAX_SIGNIFICANT_MOMENTS = 15;

/**
 * Record a session's emotional summary into the emotional profile.
 */
export function recordSessionEmotion(
  profile: EmotionalProfile,
  sessionMood: "positive" | "neutral" | "negative",
  dominantEmotions: Array<{ emotion: string; intensity: number; context: string }>,
): EmotionalProfile {
  const now = new Date().toISOString();
  const updated = { ...profile };

  // Add session mood
  updated.sessionMoods = [
    { date: now, mood: sessionMood },
    ...profile.sessionMoods,
  ].slice(0, MAX_SESSION_MOODS);

  // Update emotion frequency
  updated.emotionFrequency = { ...profile.emotionFrequency };
  for (const { emotion } of dominantEmotions) {
    updated.emotionFrequency[emotion] = (updated.emotionFrequency[emotion] || 0) + 1;
  }

  // Record significant moments (high intensity)
  const significant = dominantEmotions
    .filter(e => e.intensity >= 4)
    .map(e => ({
      emotion: e.emotion,
      intensity: e.intensity,
      context: e.context,
      timestamp: now,
    }));

  updated.significantMoments = [
    ...significant,
    ...profile.significantMoments,
  ].slice(0, MAX_SIGNIFICANT_MOMENTS);

  return updated;
}

/**
 * Get the child's dominant emotional tendency (last N sessions).
 */
export function getDominantMoodTrend(profile: EmotionalProfile): "positive" | "neutral" | "negative" {
  if (profile.sessionMoods.length === 0) return "neutral";

  const counts = { positive: 0, neutral: 0, negative: 0 };
  for (const { mood } of profile.sessionMoods) {
    counts[mood]++;
  }

  if (counts.negative > counts.positive && counts.negative > counts.neutral) return "negative";
  if (counts.positive > counts.negative) return "positive";
  return "neutral";
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FACT UPGRADE: PersistentFact → EnhancedFact
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Upgrade legacy PersistentFact[] to EnhancedFact[] (backward compatible).
 */
export function upgradeFacts(facts: PersistentFact[]): EnhancedFact[] {
  return facts.map(f => ({
    ...f,
    lastMentioned: (f as any).lastMentioned || f.firstMentioned,
    decayScore: 1,
    importanceScore: CATEGORY_IMPORTANCE[f.category as FactCategory] ?? 0.5,
  }));
}

/**
 * Refresh a fact's lastMentioned when re-mentioned.
 */
export function refreshFact(fact: EnhancedFact): EnhancedFact {
  return {
    ...fact,
    lastMentioned: new Date().toISOString(),
    mentionCount: fact.mentionCount + 1,
  };
}
