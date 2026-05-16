// @bobby/brain-v8 — Cognition V8 (WHY/WHAT/HOW/WHEN/WHO)

import type {
  BobbyRole,
  CognitionPlanV8,
  DeepGoalFrame,
  MentalModel,
  RelationshipMode,
  RelationshipState,
  SessionContext,
} from './types.ts'

const MOTIVATION_STRATEGIES: Record<string, string> = {
  cope_with_change: 'Reconnaître le changement, normaliser les émotions, ne pas minimiser',
  build_identity: "Valoriser sans flatter à outrance, miroiter l'identité positive",
  master_fear: 'Accueillir la peur, ne pas dire "tu es grand", normaliser puis rassurer',
  process_conflict: "Écouter, refléter le sentiment d'injustice, suggérer une issue",
  seek_belonging: 'Valider la solitude, créer du lien immédiat avec Bobby',
  explore_boundaries: 'Cadrer en douceur, expliquer le pourquoi sans moraliser',
  pure_curiosity: 'Nourrir la curiosité, donner 1 fait fascinant + 1 question ouverte',
  boredom_escape: 'Proposer 2-3 activités à choisir',
  emotional_regulation: 'Co-réguler (respiration, mots, validation)',
}

export function decideTiming(
  frame: DeepGoalFrame,
  _tom: MentalModel,
): CognitionPlanV8['when'] {
  if (frame.emotionalNeed === 'security' || frame.emotion.intensity >= 4) {
    return { shouldDelay: true, delayMs: 400, shouldPause: false, timingReason: 'empathy_pause' }
  }
  if (frame.userGoal === 'learn_something' && frame.deepMotivation === 'pure_curiosity') {
    return { shouldDelay: true, delayMs: 200, shouldPause: false, timingReason: 'thinking_pause' }
  }
  if (frame.userGoal === 'have_fun') {
    return { shouldDelay: false, delayMs: 0, shouldPause: false, timingReason: 'fast_fun' }
  }
  return { shouldDelay: false, delayMs: 100, shouldPause: false, timingReason: 'default' }
}

function pickRole(frame: DeepGoalFrame, tom: MentalModel): BobbyRole {
  if (frame.emotion.intensity >= 4 || frame.emotionalNeed === 'security') {
    return tom.emotionalState.inferredEmotion === 'sadness' ? 'comfort' : 'listener'
  }
  if (frame.userGoal === 'have_fun') return 'playmate'
  if (frame.userGoal === 'learn_something') return 'teacher'
  if (frame.userGoal === 'be_heard') return 'listener'
  if (frame.userGoal === 'share_joy') return 'cheerleader'
  return 'explorer'
}

function pickRelationshipMode(relationship: RelationshipState): RelationshipMode {
  if (relationship.totalInteractions < 10) return 'discovering'
  if (relationship.totalInteractions < 50) return 'building'
  if (relationship.totalInteractions < 200) return 'established'
  return 'intimate'
}

export function decideWho(
  frame: DeepGoalFrame,
  tom: MentalModel,
  relationship: RelationshipState,
): CognitionPlanV8['who'] {
  const role = pickRole(frame, tom)
  const relationshipMode = pickRelationshipMode(relationship)

  const boundaryAwareness: string[] = []
  if (role === 'comfort' && frame.deepMotivation === 'cope_with_change') {
    boundaryAwareness.push('Ne pas minimiser le changement')
    boundaryAwareness.push('Rediriger vers un adulte si sujet trop lourd')
  }
  if (role === 'teacher' && tom.understanding.cognitiveLevel === 'preoperational') {
    boundaryAwareness.push('Pas de concepts abstraits')
    boundaryAwareness.push('Max 1 information nouvelle')
  }
  return { role, relationshipMode, boundaryAwareness }
}

/**
 * Build the full V8 cognition plan. <5ms exec.
 */
export function buildCognitionPlan(
  frame: DeepGoalFrame,
  tom: MentalModel,
  relationship: RelationshipState,
  _session: SessionContext,
): CognitionPlanV8 {
  const when = decideTiming(frame, tom)
  const who = decideWho(frame, tom, relationship)

  let tomInfluence = ''
  let tone: CognitionPlanV8['how']['tone'] = 'neutral'
  if (tom.emotionalState.emotionDelta > 0.3) {
    tomInfluence = `Émotion masquée (surface=${tom.emotionalState.surfaceEmotion}, inféré=${tom.emotionalState.inferredEmotion})`
    if (tom.emotionalState.inferredEmotion === 'sadness') tone = 'warm_supportive'
  } else if (who.role === 'comfort') tone = 'warm_supportive'
  else if (who.role === 'playmate') tone = 'playful'
  else if (who.role === 'teacher') tone = 'curious'
  else if (who.role === 'guardian') tone = 'firm_calm'

  const motivationResponse =
    frame.deepMotivation !== 'none_detected' && frame.deepMotivation !== 'pure_curiosity'
      ? (MOTIVATION_STRATEGIES[frame.deepMotivation] ?? null)
      : null

  return {
    why: {
      primaryGoal:
        who.role === 'teacher'
          ? 'enseigner'
          : who.role === 'comfort'
            ? 'réconforter'
            : who.role === 'playmate'
              ? 'jouer'
              : 'accompagner',
      secondaryGoals: [],
    },
    what: {
      contentStrategy:
        frame.userGoal === 'have_fun'
          ? 'game_action'
          : frame.userGoal === 'learn_something'
            ? 'kb_lookup'
            : 'template',
    },
    how: { tone, openingType: who.role === 'comfort' ? 'empathy' : 'engaged' },
    confidence: frame.intentConfidence,
    when,
    who,
    tomInfluence,
    worldModelCheck: null,
    motivationResponse,
  }
}
