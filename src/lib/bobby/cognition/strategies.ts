/**
 * Bobby Brain V6 — Strategy Selection
 * 
 * Given a goal + context, selects the best responseType, strategy, tone, and follow-up.
 * Runs in <1ms, fully offline.
 */

import type {
  CognitionInput,
  ResponseGoal,
  ResponseType,
  ResponseStrategy,
  EmotionalTone,
  FollowUpType,
  CognitionOutput,
} from "./types";
import type { EmotionType } from "../localBrain/types";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STRATEGY PROFILES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface StrategyProfile {
  responseTypes: ResponseType[];
  strategies: ResponseStrategy[];
  tone: EmotionalTone;
  followUps: FollowUpType[];
  injectMemory: boolean | "sometimes"; // "sometimes" = 30% chance
}

const GOAL_STRATEGIES: Record<ResponseGoal, StrategyProfile> = {
  enseigner: {
    responseTypes: ["fact", "challenge", "reflection"],
    strategies: ["educatif", "court_fun"],
    tone: "curious",
    followUps: ["related_question", "deeper_question"],
    injectMemory: "sometimes",
  },
  jouer: {
    responseTypes: ["game", "challenge", "humor"],
    strategies: ["court_fun", "energique"],
    tone: "playful",
    followUps: ["game_turn", "open_question"],
    injectMemory: false,
  },
  rassurer: {
    responseTypes: ["empathy"],
    strategies: ["calme"],
    tone: "warm_supportive",
    followUps: ["open_question", "none"],
    injectMemory: false,
  },
  engager: {
    responseTypes: ["question", "humor", "challenge"],
    strategies: ["court_fun", "complice", "energique"],
    tone: "enthusiastic",
    followUps: ["open_question", "topic_bridge", "memory_callback"],
    injectMemory: "sometimes",
  },
  approfondir: {
    responseTypes: ["fact", "challenge", "reflection"],
    strategies: ["educatif", "mystere"],
    tone: "curious",
    followUps: ["deeper_question", "related_question"],
    injectMemory: true,
  },
  valider: {
    responseTypes: ["empathy", "humor"],
    strategies: ["energique", "complice"],
    tone: "proud",
    followUps: ["open_question", "topic_bridge"],
    injectMemory: "sometimes",
  },
  rediriger: {
    responseTypes: ["question", "game", "story"],
    strategies: ["energique", "mystere"],
    tone: "enthusiastic",
    followUps: ["topic_bridge", "memory_callback"],
    injectMemory: true,
  },
  ecouter: {
    responseTypes: ["empathy", "reflection"],
    strategies: ["calme", "complice"],
    tone: "warm_supportive",
    followUps: ["open_question", "none"],
    injectMemory: false,
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STRATEGY SELECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function selectStrategy(
  goal: ResponseGoal,
  input: CognitionInput,
): Omit<CognitionOutput, "goal"> {
  const profile = GOAL_STRATEGIES[goal];

  // Select response type
  let responseType = pick(profile.responseTypes);

  // Age-based adjustments
  if (input.childAge <= 5) {
    // Young children → prefer simpler, fun types
    if (responseType === "reflection") responseType = "question";
    if (responseType === "challenge" && goal !== "jouer") responseType = "fact";
  }

  // Select strategy
  let strategy = pick(profile.strategies);

  // Evening calm override
  const hour = new Date().getHours();
  if ((hour >= 20 || hour <= 6) && strategy === "energique") {
    strategy = "calme";
  }

  // Young children → keep it short and fun
  if (input.childAge <= 4 && strategy === "educatif") {
    strategy = "court_fun";
  }

  // Emotional tone
  let tone = profile.tone;
  if (input.emotion.intensity >= 4) {
    const neg: EmotionType[] = ["sadness", "fear", "anger", "shame"];
    if (neg.includes(input.emotion.type)) {
      tone = "warm_supportive";
    }
  }

  // Follow-up selection
  let followUp = pick(profile.followUps);

  // If child is tired/bored → avoid heavy follow-ups
  if (input.intent === "FATIGUE" || input.intent === "DODO") {
    followUp = "none";
  }

  // Memory injection from profile interests
  if (followUp === "memory_callback" && input.memory.facts.length === 0) {
    followUp = "open_question";
  }

  // Memory injection decision
  let shouldInjectMemory: boolean;
  if (profile.injectMemory === "sometimes") {
    shouldInjectMemory = Math.random() < 0.3 && input.memory.facts.length > 0;
  } else {
    shouldInjectMemory = profile.injectMemory && input.memory.facts.length > 0;
  }

  // If redirecting, prefer bridging to a known interest
  if (goal === "rediriger" && Object.keys(input.memory.interests).length > 0) {
    shouldInjectMemory = true;
    followUp = "topic_bridge";
  }

  return {
    responseType,
    strategy,
    emotionalTone: tone,
    shouldInjectMemory,
    suggestedFollowUp: followUp,
  };
}
