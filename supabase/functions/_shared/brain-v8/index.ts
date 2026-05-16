// Bobby Brain V8 — Deno bundle for Edge Functions
// Mirror of packages/brain-v8/, adapted for the Supabase Edge runtime.
export * from './types.ts'
export { Brain, createBrain, type BrainConfig } from './orchestrator.ts'
export {
  ageToGroup, adaptToChildWorld, buildChildWorldModel, findConfusionZone,
} from './child-world-model.ts'
export {
  applyToMToResponse, detectCognitiveSignals, detectEmotionFromText,
  emptyMentalModel, extractBeliefs, inferCognitiveLevel, updateMentalModel,
} from './theory-of-mind.ts'
export {
  buildDeepGoalFrame, classifyUserGoal, detectDeepMotivation,
  detectGoalTrajectory, detectSocialContext,
} from './deep-goal-engine.ts'
export { buildCognitionPlan, decideTiming, decideWho } from './cognition.ts'
export { assessUncertainty } from './uncertainty-engine.ts'
export {
  PHASE_BEHAVIORS, emptyRelationship, updateRelationship,
} from './relationship-engine.ts'
export { SILENCE_MESSAGES, analyzeSilence, pickSilenceMessage } from './silence-engine.ts'
export { shouldInitiate } from './proactive-engine.ts'
export {
  applyVariation, emptyVariationContext, trackInVariationContext,
} from './variation-engine.ts'
export { augmentWithLLM, decideAugmentation } from './llm-augmentor.ts'
export { detectDrift, validateLearningEntry } from './safe-learning.ts'
export { PerfTracker } from './performance-monitor.ts'
export const BRAIN_VERSION = '8.0.0' as const
