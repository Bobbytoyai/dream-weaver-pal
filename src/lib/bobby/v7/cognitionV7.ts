/**
 * Bobby Brain V7 — Advanced Cognition Engine
 * 
 * Triple-decision reasoning: WHY → WHAT → HOW
 * 
 * WHY:  Why should Bobby respond? (primary + secondary goal)
 * WHAT: What content to produce? (strategy, memory, question, validation)
 * HOW:  How to say it? (tone, length, opening style, personality overrides)
 * 
 * Replaces V6 single-goal cogitate() with a full CognitionPlan.
 * Execution: <5ms, 100% offline.
 */

import type { UnderstandingFrame, UserGoal, SessionContext } from "./deepUnderstanding";
import type { PriorityDecision } from "./priorityEngine";
import type { ResponseGoal, ResponseType, ResponseStrategy, EmotionalTone } from "../cognition/types";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type ContentStrategy =
  | "kb_lookup"          // Search knowledge base
  | "template_fill"      // Fill a local template
  | "memory_recall"      // Recall a persistent memory
  | "flow_advance"       // Continue an active flow
  | "llm_generate"       // Cloud LLM fallback
  | "game_action"        // Game engine
  | "empathy_pure"       // Pure empathy (no factual content)
  | "redirect"           // Topic change
  | "clarify";           // Ask for clarification

export type OpeningType =
  | "empathy"            // "Je comprends..."
  | "fact"               // "Tu sais que..."
  | "question"           // "Tu veux...?"
  | "exclamation"        // "Oh super !"
  | "continuation";      // "Et du coup..."

export interface PersonalityOverrides {
  funBoost: number;       // -1 to +1
  calmBoost: number;      // -1 to +1
  curiosityBoost: number; // -1 to +1
}

export interface CognitionPlan {
  // WHY — Why Bobby responds
  why: {
    primaryGoal: ResponseGoal;
    secondaryGoal: ResponseGoal | null;
    goalReason: string;
  };

  // WHAT — What to say
  what: {
    responseType: ResponseType;
    contentStrategy: ContentStrategy;
    includeMemory: boolean;
    includeQuestion: boolean;
    includeValidation: boolean;
  };

  // HOW — How to say it
  how: {
    strategy: ResponseStrategy;
    tone: EmotionalTone;
    targetLength: "short" | "medium" | "long";
    personality: PersonalityOverrides;
    openingType: OpeningType;
  };

  // META
  confidence: number;
  alternativePlan: CognitionPlan | null;
  estimatedLatency: number;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// USER GOAL → RESPONSE GOAL MAPPING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const USER_GOAL_TO_RESPONSE_GOAL: Record<UserGoal, ResponseGoal> = {
  be_reassured: "rassurer",
  learn_something: "enseigner",
  have_fun: "jouer",
  be_heard: "ecouter",
  solve_problem: "enseigner",
  pass_time: "engager",
  get_help: "enseigner",
  share_joy: "valider",
  explore_topic: "approfondir",
  wind_down: "rassurer",
};

const GOAL_TO_RESPONSE_TYPE: Record<ResponseGoal, ResponseType> = {
  enseigner: "fact",
  jouer: "game",
  rassurer: "empathy",
  engager: "question",
  approfondir: "fact",
  valider: "empathy",
  rediriger: "question",
  ecouter: "empathy",
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN — buildCognitionPlan
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let lastPlan: CognitionPlan | null = null;

/**
 * Builds a full WHY/WHAT/HOW cognition plan.
 */
export function buildCognitionPlan(
  frame: UnderstandingFrame,
  priority: PriorityDecision,
  session: SessionContext,
): CognitionPlan {
  // ══════════════════════════════════════════════
  // WHY — Determine the goal
  // ══════════════════════════════════════════════

  let primaryGoal: ResponseGoal;
  let secondaryGoal: ResponseGoal | null = null;
  let goalReason: string;

  if (priority.requiresEmpathyFirst) {
    primaryGoal = frame.userGoal === "be_reassured" ? "rassurer" : "ecouter";
    goalReason = `Émotion forte (${frame.emotion.type} @${frame.emotion.intensity}) → empathie d'abord`;
    if (frame.userGoal === "learn_something") secondaryGoal = "enseigner";
    else if (frame.userGoal === "have_fun") secondaryGoal = "jouer";
    else if (frame.userGoal === "explore_topic") secondaryGoal = "approfondir";
  } else if (priority.scores.safety >= 7) {
    primaryGoal = "rassurer";
    goalReason = `Sécurité critique (score=${priority.scores.safety}) → rassurer`;
  } else {
    primaryGoal = USER_GOAL_TO_RESPONSE_GOAL[frame.userGoal] ?? "engager";
    goalReason = `Goal utilisateur: ${frame.userGoal} → ${primaryGoal}`;
  }

  // Context-aware goal adjustments
  if (session.topicDepth >= 3 && primaryGoal === "enseigner") {
    primaryGoal = "approfondir";
    goalReason += " + sujet profond → approfondir";
  }
  if (session.turnCount <= 1 && primaryGoal !== "rassurer") {
    secondaryGoal = secondaryGoal ?? "engager";
  }

  // ══════════════════════════════════════════════
  // WHAT — Decide content strategy
  // ══════════════════════════════════════════════

  const what = decideContent(primaryGoal, frame, session);

  // ══════════════════════════════════════════════
  // HOW — Decide style
  // ══════════════════════════════════════════════

  const how = decideStyle(primaryGoal, frame, priority, session);

  // ══════════════════════════════════════════════
  // META
  // ══════════════════════════════════════════════

  const confidence = computePlanConfidence(frame, priority);

  // Build alternative plan if confidence is low
  let alternativePlan: CognitionPlan | null = null;
  if (confidence < 0.5 && !priority.requiresEmpathyFirst) {
    alternativePlan = buildFallbackPlan(frame, session);
  }

  const plan: CognitionPlan = {
    why: { primaryGoal, secondaryGoal, goalReason },
    what,
    how,
    confidence,
    alternativePlan,
    estimatedLatency: estimateLatency(what.contentStrategy),
  };

  lastPlan = plan;

  console.log(
    `[Cognition V7] 🧠 WHY=${primaryGoal}${secondaryGoal ? `+${secondaryGoal}` : ""} | ` +
    `WHAT=${what.contentStrategy}(mem=${what.includeMemory} q=${what.includeQuestion} val=${what.includeValidation}) | ` +
    `HOW=${how.strategy}/${how.tone} len=${how.targetLength} open=${how.openingType} | ` +
    `confidence=${confidence.toFixed(2)}`
  );

  return plan;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WHAT — Content Decision
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function decideContent(
  goal: ResponseGoal,
  frame: UnderstandingFrame,
  session: SessionContext,
): CognitionPlan["what"] {
  let contentStrategy: ContentStrategy;
  let includeMemory = false;
  let includeQuestion = false;
  let includeValidation = false;

  // Empathy-first goals
  if (goal === "ecouter" || goal === "rassurer") {
    contentStrategy = "empathy_pure";
    // But if the child ALSO asked a question, combine
    if (frame.explicitIntent.startsWith("QUESTION")) {
      contentStrategy = "kb_lookup";
      includeValidation = true;
    }
  }
  // Active flow → continue
  else if (session.lastExplicitIntent === ("FLOW" as any)) {
    contentStrategy = "flow_advance";
  }
  // Learning goals → KB first
  else if (goal === "enseigner" || goal === "approfondir") {
    contentStrategy = "kb_lookup";
    includeQuestion = true;
  }
  // Play → game engine
  else if (goal === "jouer") {
    contentStrategy = "game_action";
  }
  // Engagement → recall + question
  else if (goal === "engager") {
    contentStrategy = "memory_recall";
    includeQuestion = true;
    includeMemory = true;
  }
  // Validation → empathy + memory
  else if (goal === "valider") {
    contentStrategy = "empathy_pure";
    includeMemory = true;
    includeValidation = true;
  }
  // Redirect → bridge with interests
  else if (goal === "rediriger") {
    contentStrategy = "redirect";
    includeMemory = true;
  }
  // Default
  else {
    contentStrategy = "template_fill";
  }

  // Override: high ambiguity → clarify first
  if (frame.ambiguityScore > 0.6) {
    contentStrategy = "clarify";
    includeQuestion = true;
  }

  return {
    responseType: GOAL_TO_RESPONSE_TYPE[goal] ?? "question",
    contentStrategy,
    includeMemory,
    includeQuestion,
    includeValidation,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HOW — Style Decision
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function decideStyle(
  goal: ResponseGoal,
  frame: UnderstandingFrame,
  priority: PriorityDecision,
  session: SessionContext,
): CognitionPlan["how"] {
  // Strategy
  let strategy: ResponseStrategy;
  switch (goal) {
    case "rassurer": case "ecouter": strategy = "calme"; break;
    case "jouer":    strategy = "energique"; break;
    case "enseigner": strategy = "educatif"; break;
    case "approfondir": strategy = "mystere"; break;
    case "valider":  strategy = "complice"; break;
    case "engager":  strategy = "court_fun"; break;
    case "rediriger": strategy = "court_fun"; break;
    default:         strategy = "court_fun";
  }

  // Tone
  let tone: EmotionalTone;
  if (priority.requiresEmpathyFirst) {
    tone = frame.emotion.type === "fear" ? "calm_gentle" : "warm_supportive";
  } else {
    switch (goal) {
      case "enseigner": tone = "curious"; break;
      case "jouer":     tone = "playful"; break;
      case "valider":   tone = "proud"; break;
      case "approfondir": tone = "mysterious"; break;
      case "engager":   tone = "enthusiastic"; break;
      default:          tone = "neutral_friendly";
    }
  }

  // Target length — vary naturally between short/medium/long
  let targetLength: "short" | "medium" | "long";
  const lengthRoll = Math.random();
  if (goal === "enseigner" || goal === "approfondir") {
    // Educational: mostly medium, sometimes long, rarely short
    targetLength = lengthRoll < 0.15 ? "short" : lengthRoll < 0.7 ? "medium" : "long";
  } else if (goal === "ecouter" || goal === "rassurer") {
    // Emotional: mostly medium, sometimes short (gentle brevity)
    targetLength = lengthRoll < 0.3 ? "short" : lengthRoll < 0.85 ? "medium" : "long";
  } else if (goal === "jouer") {
    // Play: mostly short & punchy, sometimes medium
    targetLength = lengthRoll < 0.6 ? "short" : lengthRoll < 0.9 ? "medium" : "long";
  } else {
    // Default: balanced mix favoring short
    targetLength = lengthRoll < 0.45 ? "short" : lengthRoll < 0.85 ? "medium" : "long";
  }

  // Opening type
  let openingType: OpeningType;
  if (priority.requiresEmpathyFirst) openingType = "empathy";
  else if (session.turnCount > 1 && session.currentTopic) openingType = "continuation";
  else if (goal === "enseigner") openingType = "fact";
  else if (goal === "jouer" || goal === "valider") openingType = "exclamation";
  else openingType = "question";

  // Personality overrides based on context
  const personality: PersonalityOverrides = {
    funBoost: goal === "jouer" ? 0.3 : goal === "rassurer" ? -0.2 : 0,
    calmBoost: priority.requiresEmpathyFirst ? 0.4 : goal === "jouer" ? -0.3 : 0,
    curiosityBoost: goal === "enseigner" || goal === "approfondir" ? 0.3 : 0,
  };

  // Time-of-day adjustments
  const hour = new Date().getHours();
  if (hour >= 20 || hour < 7) {
    personality.calmBoost += 0.2;
    personality.funBoost -= 0.1;
    if (targetLength === "short") targetLength = "medium"; // gentler pace at night
  }

  return { strategy, tone, targetLength, personality, openingType };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function computePlanConfidence(frame: UnderstandingFrame, priority: PriorityDecision): number {
  // High intent confidence + low ambiguity = high plan confidence
  let confidence = frame.intentConfidence * 0.4
    + (1 - frame.ambiguityScore) * 0.3
    + frame.implicitConfidence * 0.2
    + (priority.totalScore >= 30 ? 0.1 : 0);
  return Math.max(0, Math.min(1, confidence));
}

function estimateLatency(strategy: ContentStrategy): number {
  switch (strategy) {
    case "template_fill":
    case "empathy_pure":
    case "redirect":
    case "clarify":
    case "game_action":
      return 5;  // instant
    case "memory_recall":
    case "flow_advance":
      return 10;
    case "kb_lookup":
      return 50;
    case "llm_generate":
      return 800;
    default:
      return 20;
  }
}

function buildFallbackPlan(frame: UnderstandingFrame, session: SessionContext): CognitionPlan {
  return {
    why: {
      primaryGoal: "engager",
      secondaryGoal: null,
      goalReason: "Plan B: faible confiance → engager la conversation",
    },
    what: {
      responseType: "question",
      contentStrategy: "template_fill",
      includeMemory: true,
      includeQuestion: true,
      includeValidation: false,
    },
    how: {
      strategy: "court_fun",
      tone: "neutral_friendly",
      targetLength: "short",
      personality: { funBoost: 0.1, calmBoost: 0, curiosityBoost: 0.1 },
      openingType: "question",
    },
    confidence: 0.3,
    alternativePlan: null,
    estimatedLatency: 5,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PUBLIC API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function getLastCognitionPlan(): CognitionPlan | null {
  return lastPlan;
}

export function resetCognitionV7(): void {
  lastPlan = null;
}
