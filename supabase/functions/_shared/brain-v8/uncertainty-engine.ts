// @bobby/brain-v8 — Uncertainty Management Engine

import type {
  DeepGoalFrame,
  MentalModel,
  UncertaintyAssessment,
  UncertaintyLevel,
  UncertaintySource,
  UncertaintyStrategy,
} from './types.ts'

function selectStrategy(
  level: UncertaintyLevel,
  source: UncertaintySource,
  tom: MentalModel,
): UncertaintyStrategy {
  // Young child + uncertain → guess, don't ask
  if (tom.understanding.cognitiveLevel === 'preoperational' && level === 'uncertain') {
    return 'proceed_best_guess'
  }
  // Conflicting signals + sadness → rephrase rather than ask
  if (source === 'conflicting_signals' && tom.emotionalState.inferredEmotion === 'sadness') {
    return 'rephrase_understanding'
  }
  switch (level) {
    case 'certain':
    case 'probable':
      return 'proceed_best_guess'
    case 'uncertain':
      return 'offer_choices'
    case 'confused':
      return 'ask_clarification'
  }
}

function buildClarificationQuestion(frame: DeepGoalFrame, source: UncertaintySource): string {
  switch (source) {
    case 'speech_noise':
      return "Excuse-moi, je n'ai pas bien entendu. Tu peux répéter ?"
    case 'ambiguous_intent':
      return `Hmm, tu veux ${frame.alternativeIntents[0]?.toLowerCase() ?? 'me dire quelque chose'} ou autre chose ?`
    case 'incomplete_input':
      return "Tu n'as pas fini ta phrase ! Tu voulais dire quoi ?"
    case 'multi_intent':
      return 'Tu as plein d idées ! On commence par quoi ?'
    default:
      return "Tu peux m'en dire plus ?"
  }
}

function buildChoiceQuestion(frame: DeepGoalFrame): string {
  if (frame.alternativeIntents.length >= 2) {
    return `Tu veux ${frame.alternativeIntents[0]} ou ${frame.alternativeIntents[1]} ?`
  }
  return 'Tu veux jouer, apprendre un truc, ou juste discuter ?'
}

function buildRephraseQuestion(frame: DeepGoalFrame): string {
  return `Si je comprends bien, tu veux ${frame.userGoal.replace('_', ' ')} ? C'est ça ?`
}

export function assessUncertainty(
  frame: DeepGoalFrame,
  tom: MentalModel,
): UncertaintyAssessment {
  let score = 0
  let source: UncertaintySource = 'ambiguous_intent'

  score += frame.ambiguityScore * 0.4
  if (frame.ambiguityScore > 0.6) source = 'ambiguous_intent'
  score += (1 - frame.intentConfidence) * 0.3
  if (tom.emotionalState.emotionDelta > 0.4) {
    score += 0.2
    source = 'conflicting_signals'
  }
  if (frame.alternativeIntents.length >= 3) {
    score += 0.1
    source = 'multi_intent'
  }
  score = Math.min(1, score)

  const level: UncertaintyLevel =
    score < 0.2 ? 'certain' : score < 0.4 ? 'probable' : score < 0.7 ? 'uncertain' : 'confused'

  const strategy = selectStrategy(level, source, tom)
  const clarificationQuestion =
    strategy === 'ask_clarification'
      ? buildClarificationQuestion(frame, source)
      : strategy === 'offer_choices'
        ? buildChoiceQuestion(frame)
        : strategy === 'rephrase_understanding'
          ? buildRephraseQuestion(frame)
          : null

  return { level, source, score, strategy, clarificationQuestion }
}
