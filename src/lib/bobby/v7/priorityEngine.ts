/**
 * Bobby Brain V7 — Priority & Attention Engine
 *
 * Transforms an UnderstandingFrame into a PriorityDecision using 5 weighted
 * dimensions: safety (30%), emotion (25%), urgency (20%), context (15%),
 * history (10%).
 *
 * Also resolves multi-intent conflicts with override / merge / sequential
 * strategies.
 *
 * Execution: <5ms (100% local, pure scoring)
 */

import type {
  UnderstandingFrame,
  ImplicitIntent,
  EmotionalNeed,
  UserGoal,
  SessionContext,
} from "./deepUnderstanding";
import type { EmotionType } from "../localBrain/types";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface PriorityScores {
  safety: number;   // 0-10
  emotion: number;  // 0-10
  urgency: number;  // 0-10
  context: number;  // 0-10
  history: number;  // 0-10
}

export type PriorityLevel = "critical" | "high" | "normal" | "low";

export interface PriorityDecision {
  totalScore: number;            // 0-100
  scores: PriorityScores;
  priorityLevel: PriorityLevel;
  interruptCurrent: boolean;     // Should we interrupt an active flow?
  bypassCache: boolean;          // Skip cache for sensitive cases?
  requiresEmpathyFirst: boolean; // Answer emotion before content?
}

export interface MemoryContext {
  recurrentEmotions: EmotionType[];
  unresolvedTopics: string[];
  recentIntents: string[];
}

export type ConflictStrategy = "sequential" | "merged" | "override";

export interface ConflictResolution {
  primary: UnderstandingFrame;
  secondary: UnderstandingFrame | null;
  strategy: ConflictStrategy;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WEIGHTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const WEIGHTS = {
  safety:  0.30,
  emotion: 0.25,
  urgency: 0.20,
  context: 0.15,
  history: 0.10,
} as const;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SAFETY SCORING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const CRITICAL_SAFETY_INTENTS = new Set([
  "CRISE_SECURITE", "CONTENU_BLOQUE",
]);

const HIGH_SAFETY_INTENTS = new Set([
  "HARCELEMENT", "ABANDON", "PEUR_ABANDON", "FATIGUE_EMOTIONNELLE",
]);

function scoreSafety(frame: UnderstandingFrame): number {
  if (CRITICAL_SAFETY_INTENTS.has(frame.explicitIntent)) return 10;
  if (HIGH_SAFETY_INTENTS.has(frame.explicitIntent)) return 8;
  if (frame.emotionalNeed === "security" && frame.emotion.intensity >= 4) return 7;
  if (frame.implicitIntent === "process_emotion") return 4;
  if (frame.emotionalNeed === "security") return 3;
  return 0;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EMOTION SCORING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const NEGATIVE_EMOTIONS: Set<EmotionType> = new Set([
  "sadness", "fear", "anger", "shame", "jealousy",
]);

function scoreEmotion(frame: UnderstandingFrame): number {
  const base = Math.min(10, frame.emotion.intensity * 2);
  const negativBonus = NEGATIVE_EMOTIONS.has(frame.emotion.type) ? 2 : 0;
  return Math.min(10, base + negativBonus);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// URGENCY SCORING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const HIGH_URGENCY_GOALS: Set<UserGoal> = new Set([
  "be_reassured", "get_help",
]);

function scoreUrgency(
  frame: UnderstandingFrame,
  session: SessionContext,
): number {
  let score = 5; // baseline

  if (HIGH_URGENCY_GOALS.has(frame.userGoal)) score = 8;
  if (frame.requiresConfirmation) score += 1;

  // Child repeating the same intent → wasn't understood → urgent
  if (
    session.lastExplicitIntent === frame.explicitIntent &&
    session.turnCount > 1
  ) {
    score = 9;
  }

  // Very high need intensity → urgent
  if (frame.needIntensity >= 4) score = Math.max(score, 8);

  return Math.min(10, score);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONTEXT SCORING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function scoreContext(
  frame: UnderstandingFrame,
  session: SessionContext,
): number {
  let score = 5;

  // Ongoing deep topic → boost (child is engaged)
  if (session.topicDepth >= 3) score += 2;

  // Same topic continuation → contextually relevant
  if (session.currentTopic && session.topicDepth >= 1) score += 1;

  // Low ambiguity → clear context
  if (frame.ambiguityScore < 0.3) score += 1;

  // High ambiguity → context is murky
  if (frame.ambiguityScore > 0.6) score -= 1;

  return Math.min(10, Math.max(0, score));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HISTORY SCORING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function scoreHistory(
  frame: UnderstandingFrame,
  memory: MemoryContext,
): number {
  let score = 3; // baseline

  // Recurrent emotional pattern → pay attention
  if (memory.recurrentEmotions.includes(frame.emotion.type)) score = 7;

  // Unresolved topic from past sessions → deserves attention
  if (memory.unresolvedTopics.includes(frame.explicitIntent)) score = 8;

  // Same intent appears repeatedly in recent history
  const recentCount = memory.recentIntents.filter(
    i => i === frame.explicitIntent,
  ).length;
  if (recentCount >= 3) score = Math.max(score, 7);

  return Math.min(10, score);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN — computePriority
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function computePriority(
  frame: UnderstandingFrame,
  session: SessionContext,
  memory: MemoryContext,
): PriorityDecision {
  const safety  = scoreSafety(frame);
  const emotion = scoreEmotion(frame);
  const urgency = scoreUrgency(frame, session);
  const context = scoreContext(frame, session);
  const history = scoreHistory(frame, memory);

  const totalScore = Math.round(
    safety  * WEIGHTS.safety  * 10 +
    emotion * WEIGHTS.emotion * 10 +
    urgency * WEIGHTS.urgency * 10 +
    context * WEIGHTS.context * 10 +
    history * WEIGHTS.history * 10,
  );

  const priorityLevel: PriorityLevel =
    totalScore >= 80 ? "critical" :
    totalScore >= 55 ? "high" :
    totalScore >= 30 ? "normal" : "low";

  return {
    totalScore,
    scores: { safety, emotion, urgency, context, history },
    priorityLevel,
    interruptCurrent: totalScore >= 70,
    bypassCache: safety >= 7 || totalScore >= 75,
    requiresEmpathyFirst: emotion >= 7,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MULTI-INTENT CONFLICT RESOLUTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Pairs of intents that can be merged into a single response
const MERGEABLE_PAIRS: Set<string> = new Set([
  // "fear + story" → reassuring story
  "PEUR|HISTOIRE",     "HISTOIRE|PEUR",
  "ANXIETE|HISTOIRE",  "HISTOIRE|ANXIETE",
  // "sadness + game" → comforting game
  "TRISTESSE|JEU",     "JEU|TRISTESSE",
  // "boredom + adventure"
  "ENNUI|AVENTURE",    "AVENTURE|ENNUI",
  // "curiosity + learning"
  "CURIOSITE|APPRENDRE", "APPRENDRE|CURIOSITE",
  // "fatigue + story" → bedtime story
  "FATIGUE|HISTOIRE",  "HISTOIRE|FATIGUE",
  "DODO|HISTOIRE",     "HISTOIRE|DODO",
  // "joy + sharing"
  "JOIE|PARTAGE_QUOTIDIEN", "PARTAGE_QUOTIDIEN|JOIE",
  // "fear + game" → courage game
  "PEUR|JEU",          "JEU|PEUR",
]);

function canMerge(a: UnderstandingFrame, b: UnderstandingFrame): boolean {
  const key = `${a.explicitIntent}|${b.explicitIntent}`;
  return MERGEABLE_PAIRS.has(key);
}

export function resolveConflicts(
  primary: UnderstandingFrame,
  secondary: UnderstandingFrame | null,
  primaryPriority: PriorityDecision,
  secondaryPriority: PriorityDecision | null,
): ConflictResolution {
  if (!secondary || !secondaryPriority) {
    return { primary, secondary: null, strategy: "override" };
  }

  const gap = primaryPriority.totalScore - secondaryPriority.totalScore;

  // Large gap → override (ignore secondary)
  if (gap > 30) {
    return { primary, secondary: null, strategy: "override" };
  }

  // Compatible intents → merge (e.g. reassuring story)
  if (canMerge(primary, secondary)) {
    return { primary, secondary, strategy: "merged" };
  }

  // Otherwise → sequential (empathy first, then content)
  return { primary, secondary, strategy: "sequential" };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DEFAULT MEMORY CONTEXT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function createDefaultMemoryContext(): MemoryContext {
  return {
    recurrentEmotions: [],
    unresolvedTopics: [],
    recentIntents: [],
  };
}
