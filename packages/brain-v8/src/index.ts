// @bobby/brain-v8 — Public API
// Spec: docs/brain/V8.md

export * from './types.js'

// Orchestrator (main entry)
export { Brain, createBrain, type BrainConfig } from './orchestrator.js'

// Engines (advanced usage / tests)
export {
  ageToGroup,
  adaptToChildWorld,
  buildChildWorldModel,
  findConfusionZone,
} from './child-world-model.js'

export {
  applyToMToResponse,
  detectCognitiveSignals,
  detectEmotionFromText,
  emptyMentalModel,
  extractBeliefs,
  inferCognitiveLevel,
  updateMentalModel,
  type CognitiveSignals,
} from './theory-of-mind.js'

export {
  buildDeepGoalFrame,
  classifyUserGoal,
  detectDeepMotivation,
  detectGoalTrajectory,
  detectSocialContext,
} from './deep-goal-engine.js'

export {
  buildCognitionPlan,
  decideTiming,
  decideWho,
} from './cognition.js'

export { assessUncertainty } from './uncertainty-engine.js'

export {
  PHASE_BEHAVIORS,
  emptyRelationship,
  updateRelationship,
  type PhaseBehavior,
  type SessionMetrics,
} from './relationship-engine.js'

export {
  SILENCE_MESSAGES,
  analyzeSilence,
  pickSilenceMessage,
} from './silence-engine.js'

export { shouldInitiate, type InitiativeContext } from './proactive-engine.js'

export {
  applyVariation,
  emptyVariationContext,
  trackInVariationContext,
  type ResponseStructure,
  type VariationContext,
} from './variation-engine.js'

export {
  augmentWithLLM,
  decideAugmentation,
  type AugmentationDecision,
  type AugmentationType,
} from './llm-augmentor.js'

export {
  detectDrift,
  validateLearningEntry,
  type DriftDetection,
  type LearningEntry,
  type QualityScore,
  type ValidationResult,
} from './safe-learning.js'

export { PerfTracker, type StageName } from './performance-monitor.js'

// Version & spec reference
export const BRAIN_VERSION = '8.0.0' as const
export const SPEC_URL = 'docs/brain/V8.md' as const
