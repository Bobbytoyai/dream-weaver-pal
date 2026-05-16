// @bobby/brain-v8 — Public types
// Aligned with docs/brain/V8.md

// ─── Profil enfant ──────────────────────────────────────────
export type Language = 'fr' | 'en' | 'es' | 'de' | 'it'

export interface ChildProfile {
  id: string
  name: string
  age: number // 3..12
  language: Language
  interests?: string[]
  parentalLimits?: ParentalLimits
}

export interface ParentalLimits {
  dailyMinutes: number
  forbiddenTopics: string[]
  bedtimeHour: number // 0..23
}

// ─── Émotions ───────────────────────────────────────────────
export type EmotionType =
  | 'neutral'
  | 'joy'
  | 'sadness'
  | 'anger'
  | 'fear'
  | 'surprise'
  | 'disgust'
  | 'curiosity'
  | 'pride'
  | 'shame'

export interface EmotionSignal {
  type: EmotionType
  intensity: number // 0..5
  confidence: number // 0..1
}

// ─── Theory of Mind ─────────────────────────────────────────
export type CognitiveLevel = 'preoperational' | 'concrete' | 'transitional' | 'formal'

export interface Belief {
  content: string
  type: 'factual' | 'emotional' | 'social' | 'fantasy'
  confidence: number // 0..1
  source: 'stated' | 'inferred' | 'pattern'
  timestamp: number
}

export interface MentalModel {
  beliefs: {
    aboutSelf: Belief[]
    aboutWorld: Belief[]
    aboutBobby: Belief[]
    confidence: number
  }
  understanding: {
    cognitiveLevel: CognitiveLevel
    vocabularyLevel: 'basic' | 'moderate' | 'advanced'
    canDistinguishRealFiction: boolean
    canHandleNuance: boolean
    conceptsGrasped: string[]
    conceptsStruggled: string[]
  }
  emotionalState: {
    surfaceEmotion: EmotionType
    inferredEmotion: EmotionType
    emotionDelta: number
    emotionalTrajectory: 'improving' | 'stable' | 'declining'
  }
  expectations: {
    wantsFun: number
    wantsComfort: number
    wantsKnowledge: number
    wantsControl: number
    expectationShift: string | null
  }
}

// ─── Child World Model ──────────────────────────────────────
export type AgeGroup =
  | 'toddler_3_4'
  | 'preschool_5_6'
  | 'early_school_7_8'
  | 'mid_school_9_10'
  | 'preteen_11_12'

export interface CognitiveTraits {
  causalReasoning: number
  timePerception: number
  abstractThinking: number
  empathyCapacity: number
  humorComprehension: number
  realFictionBoundary: number
  attentionSpan: number // minutes
  workingMemorySlots: number
}

export interface ConfusionZone {
  topic: string
  typicalAge: [number, number]
  typicalError: string
  bobbyStrategy: string
}

export interface ChildWorldModel {
  ageGroup: AgeGroup
  cognitiveTraits: CognitiveTraits
  confusionZones: ConfusionZone[]
}

// ─── Deep Goal Engine ───────────────────────────────────────
export type UserGoal =
  | 'learn_something'
  | 'have_fun'
  | 'be_heard'
  | 'share_joy'
  | 'seek_comfort'
  | 'explore'
  | 'unclear'

export type DeepMotivation =
  | 'cope_with_change'
  | 'build_identity'
  | 'master_fear'
  | 'process_conflict'
  | 'seek_belonging'
  | 'explore_boundaries'
  | 'pure_curiosity'
  | 'boredom_escape'
  | 'emotional_regulation'
  | 'none_detected'

export type GoalTrajectory =
  | 'deepening'
  | 'widening'
  | 'looping'
  | 'jumping'
  | 'winding_down'
  | 'stable'

export interface SocialContext {
  mentionsOthers: boolean
  socialRole: 'protagonist' | 'observer' | 'victim' | 'helper' | 'none'
  relationshipFocus: string | null
}

export interface UnderstandingFrame {
  explicitIntent: string
  implicitIntent: string | null
  emotionalNeed: 'security' | 'attention' | 'validation' | 'autonomy' | 'connection' | null
  userGoal: UserGoal
  emotion: EmotionSignal
  intentConfidence: number
  ambiguityScore: number
  alternativeIntents: string[]
}

export interface DeepGoalFrame extends UnderstandingFrame {
  deepMotivation: DeepMotivation
  goalTrajectory: GoalTrajectory
  socialContext: SocialContext
}

// ─── Cognition V8 ───────────────────────────────────────────
export type BobbyRole =
  | 'playmate'
  | 'teacher'
  | 'comfort'
  | 'cheerleader'
  | 'storyteller'
  | 'explorer'
  | 'listener'
  | 'guardian'

export type RelationshipMode = 'discovering' | 'building' | 'established' | 'intimate'

export interface CognitionPlan {
  why: { primaryGoal: string; secondaryGoals: string[] }
  what: { contentStrategy: 'template' | 'kb_lookup' | 'llm_generate' | 'game_action' }
  how: { tone: 'neutral' | 'warm_supportive' | 'playful' | 'curious' | 'firm_calm'; openingType: string }
  confidence: number
}

export interface CognitionPlanV8 extends CognitionPlan {
  when: {
    shouldDelay: boolean
    delayMs: number
    shouldPause: boolean
    timingReason: string
  }
  who: {
    role: BobbyRole
    relationshipMode: RelationshipMode
    boundaryAwareness: string[]
  }
  tomInfluence: string
  worldModelCheck: string | null
  motivationResponse: string | null
}

// ─── Relationship ───────────────────────────────────────────
export type RelationshipPhase = 'discovery' | 'trust' | 'attachment' | 'complicity'

export interface SharedMemory {
  event: string
  emotionAtTime: EmotionType
  timestamp: number
  recalled: number
}

export interface InsideJoke {
  trigger: string
  reference: string
  createdAt: number
  usageCount: number
}

export interface RelationshipMilestone {
  type: string
  timestamp: number
  description: string
}

export interface RelationshipState {
  phase: RelationshipPhase
  totalInteractions: number
  totalSessions: number
  trustScore: number
  complicityScore: number
  emotionalBondScore: number
  milestones: RelationshipMilestone[]
  sharedMemories: SharedMemory[]
  insideJokes: InsideJoke[]
}

// ─── Uncertainty ────────────────────────────────────────────
export type UncertaintyLevel = 'certain' | 'probable' | 'uncertain' | 'confused'

export type UncertaintySource =
  | 'speech_noise'
  | 'ambiguous_intent'
  | 'unknown_topic'
  | 'conflicting_signals'
  | 'incomplete_input'
  | 'multi_intent'
  | 'context_missing'

export type UncertaintyStrategy =
  | 'proceed_best_guess'
  | 'ask_clarification'
  | 'offer_choices'
  | 'rephrase_understanding'
  | 'acknowledge_ignorance'
  | 'defer_to_parent'

export interface UncertaintyAssessment {
  level: UncertaintyLevel
  source: UncertaintySource
  score: number
  strategy: UncertaintyStrategy
  clarificationQuestion: string | null
}

// ─── Proactive Initiative ───────────────────────────────────
export type InitiativeType =
  | 'suggest_activity'
  | 'share_fact'
  | 'emotional_checkin'
  | 'memory_callback'
  | 'challenge'
  | 'story_hook'
  | 'celebrate'
  | 'gentle_redirect'

export type InitiativeTrigger =
  | 'silence_timeout'
  | 'session_start'
  | 'mood_opportunity'
  | 'interest_match'
  | 'milestone'
  | 'time_based'
  | 'pattern_detected'
  | 'context_shift'

export interface ProactiveInitiative {
  type: InitiativeType
  trigger: InitiativeTrigger
  content: string
  urgency: number
  nonIntrusiveLevel: number
}

// ─── Silence ────────────────────────────────────────────────
export type SilenceType = 'micro' | 'short' | 'medium' | 'long' | 'extended'

export type SilenceReason =
  | 'thinking'
  | 'hesitating'
  | 'distracted'
  | 'bored'
  | 'processing'
  | 'emotional'
  | 'away'
  | 'unknown'

export type SilenceAction =
  | 'wait'
  | 'encourage'
  | 'rephrase'
  | 'simplify'
  | 'redirect'
  | 'check_in'
  | 'wind_down'

export interface SilenceAnalysis {
  type: SilenceType
  duration: number
  likelyReason: SilenceReason
  action: SilenceAction
  actionDelay: number
}

// ─── Session ────────────────────────────────────────────────
export interface SessionContext {
  turnCount: number
  topicDepth: number
  sessionMood: 'positive' | 'neutral' | 'negative'
  startedAt: number
  recentTopics: string[]
}

// ─── Pipeline result ────────────────────────────────────────
export interface BrainTelemetry {
  totalMs: number
  stage: {
    preprocessing: number
    understanding: number
    decision: number
    contentGeneration: number
    shaping: number
    postProcessing: number
  }
  usedLLM: boolean
  cacheHit: boolean
}

export interface BrainResponse {
  text: string
  emotion: EmotionType
  audioHint?: { pauseMs?: number; rate?: number }
  plan: CognitionPlanV8
  telemetry: BrainTelemetry
  updatedRelationship: RelationshipState
  updatedToM: MentalModel
  safetyLevel: 0 | 1 | 2 | 3 | 4
}

export interface BrainInput {
  text: string
  sessionContext: SessionContext
  silenceMs?: number // ms écoulés depuis le dernier message Bobby
}

// ─── LLM injection ──────────────────────────────────────────
export type LlmCall = (params: {
  prompt: string
  maxTokens: number
  priority: 'low' | 'normal' | 'high'
}) => Promise<string>
