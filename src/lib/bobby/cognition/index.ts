/**
 * Bobby Brain V6 — Cognition Layer
 * 
 * Central decision module: receives full context, decides HOW to respond.
 * Runs synchronously in <5ms, fully offline.
 * 
 * Pipeline position: NLU → **COGNITION** → Response Assembly
 */

import type { CognitionInput, CognitionOutput, ResponseGoal } from "./types";
import { determineGoal } from "./goals";
import { selectStrategy } from "./strategies";

export type { CognitionInput, CognitionOutput, ResponseGoal } from "./types";
export type { ResponseType, ResponseStrategy, EmotionalTone, FollowUpType } from "./types";

// Track last goal for context-aware decisions
let lastGoal: ResponseGoal | null = null;

/**
 * Core cognition function — decides HOW Bobby should respond.
 * 
 * @param input - Full context (intent, emotion, session, memory)
 * @returns CognitionOutput with goal, strategy, tone, follow-up
 * 
 * Performance: <5ms, 0 async, 0 network
 */
export function cogitate(input: CognitionInput): CognitionOutput {
  // Inject last goal into session context
  const enrichedInput: CognitionInput = {
    ...input,
    session: {
      ...input.session,
      lastBobbyGoal: input.session.lastBobbyGoal ?? lastGoal,
    },
  };

  // Step 1: Determine the primary goal
  const goal = determineGoal(enrichedInput);

  // Step 2: Select strategy, type, tone based on goal + context
  const strategyOutput = selectStrategy(goal, enrichedInput);

  // Track for next turn
  lastGoal = goal;

  const output: CognitionOutput = {
    goal,
    ...strategyOutput,
  };

  console.log(
    `[Cognition] 🧠 goal=${goal} type=${output.responseType} strategy=${output.strategy} tone=${output.emotionalTone} followUp=${output.suggestedFollowUp} memory=${output.shouldInjectMemory}`
  );

  return output;
}

/**
 * Get the last cognition goal (for session context).
 */
export function getLastGoal(): ResponseGoal | null {
  return lastGoal;
}

/**
 * Reset cognition state (on session reset).
 */
export function resetCognition(): void {
  lastGoal = null;
}
