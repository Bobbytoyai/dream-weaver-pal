// @bobby/brain-v8 — Deep Goal & Need Engine V2
// Identifie le VRAI pourquoi sous-jacent + la trajectoire conversationnelle.

import type {
  DeepGoalFrame,
  DeepMotivation,
  EmotionSignal,
  GoalTrajectory,
  SessionContext,
  SocialContext,
  UnderstandingFrame,
  UserGoal,
} from './types.js'

const MOTIVATION_SIGNALS: Array<{ motivation: DeepMotivation; patterns: RegExp[] }> = [
  {
    motivation: 'cope_with_change',
    patterns: [
      /(?:on va |je vais )déménager/i,
      /(?:papa|maman) (?:est parti|va partir)/i,
      /(?:nouveau|nouvelle) (?:école|maison|bébé)/i,
    ],
  },
  {
    motivation: 'build_identity',
    patterns: [
      /\bje suis (?:fort|intelligent|courageux|nul|bête)\b/i,
      /(?:quand je serai grand|plus tard)/i,
      /\bje (?:veux|voudrais) être\b/i,
    ],
  },
  {
    motivation: 'master_fear',
    patterns: [
      /j'ai peur (?:de|du|des|que)/i,
      /\b(monstre|noir|seul|perdu|mourir)\b/i,
      /ça (?:fait|me fait) peur/i,
    ],
  },
  {
    motivation: 'process_conflict',
    patterns: [
      /(?:il|elle) (?:m'a|est) (?:tapé|poussé|insulté|embêté|méchant)/i,
      /on (?:s'est disputé|est fâché)/i,
      /c'est (?:pas juste|injuste)/i,
    ],
  },
  {
    motivation: 'seek_belonging',
    patterns: [
      /personne (?:m'aime|veut jouer|me parle)/i,
      /je (?:n'ai pas|suis tout seul|suis le seul)/i,
    ],
  },
  {
    motivation: 'emotional_regulation',
    patterns: [/j'arrive pas à (?:me calmer|arrêter)/i, /(?:c'est trop|j'en peux plus)/i],
  },
]

export function detectDeepMotivation(text: string, sessionHistory: string[]): DeepMotivation {
  // 1. Direct pattern match
  for (const signal of MOTIVATION_SIGNALS) {
    if (signal.patterns.some((p) => p.test(text))) return signal.motivation
  }

  // 2. Trajectory analysis — recurring theme
  const counts = new Map<DeepMotivation, number>()
  for (const msg of sessionHistory) {
    for (const signal of MOTIVATION_SIGNALS) {
      if (signal.patterns.some((p) => p.test(msg))) {
        counts.set(signal.motivation, (counts.get(signal.motivation) ?? 0) + 1)
      }
    }
  }
  for (const [motivation, count] of counts) {
    if (count >= 3) return motivation
  }

  return 'none_detected'
}

const RELATED_GROUPS: ReadonlyArray<ReadonlyArray<string>> = [
  ['question', 'apprendre', 'pourquoi'],
  ['jeu', 'blague', 'amusant'],
  ['peur', 'tristesse', 'colère'],
  ['joie', 'fierté'],
  ['histoire', 'conte'],
]

function areRelatedTopics(a: string, b: string): boolean {
  return RELATED_GROUPS.some((group) => group.includes(a) && group.includes(b))
}

export function detectGoalTrajectory(
  currentFrame: UnderstandingFrame,
  sessionContext: SessionContext,
  lastTopics: string[],
): GoalTrajectory {
  if (lastTopics.length < 2) return 'stable'
  const lastTopic = lastTopics[lastTopics.length - 1] ?? ''
  const currentTopic = currentFrame.explicitIntent

  if (lastTopic === currentTopic && sessionContext.topicDepth > 2) return 'deepening'
  if (lastTopic !== currentTopic && areRelatedTopics(lastTopic, currentTopic)) return 'widening'

  const previous = lastTopics.slice(0, -1)
  if (previous.includes(currentTopic)) return 'looping'

  if (lastTopic !== currentTopic && !areRelatedTopics(lastTopic, currentTopic)) {
    if (currentFrame.emotion.intensity < 2 && currentFrame.ambiguityScore > 0.5) {
      return 'winding_down'
    }
    return 'jumping'
  }
  return 'stable'
}

export function detectSocialContext(text: string): SocialContext {
  const t = text.toLowerCase()
  const mentionsOthers = /\b(maman|papa|frère|sœur|ami|copain|copine|maître|maîtresse|prof)\b/.test(
    t,
  )
  let socialRole: SocialContext['socialRole'] = 'none'
  if (/\b(j'ai|j'étais)\b.*\b(content|fier|amusé)\b/i.test(t)) socialRole = 'protagonist'
  if (/(?:il|elle) m'a (?:tapé|poussé|insulté)/i.test(t)) socialRole = 'victim'
  if (/(?:j'ai aidé|j'ai consolé)/i.test(t)) socialRole = 'helper'

  const focusMatch = t.match(/\b(maman|papa|frère|sœur|ami|copain|copine|maître|maîtresse)\b/)
  return {
    mentionsOthers,
    socialRole,
    relationshipFocus: focusMatch?.[1] ?? null,
  }
}

export function classifyUserGoal(
  text: string,
  emotion: EmotionSignal,
): { goal: UserGoal; confidence: number } {
  const t = text.toLowerCase()
  if (/\b(pourquoi|comment|c'est quoi|qu'est-ce que)\b/.test(t))
    return { goal: 'learn_something', confidence: 0.85 }
  if (/\b(jouer|jeu|blague|raconte|amusant|drôle)\b/.test(t))
    return { goal: 'have_fun', confidence: 0.8 }
  if (emotion.type === 'sadness' || emotion.type === 'fear')
    return { goal: 'seek_comfort', confidence: 0.75 }
  if (emotion.type === 'joy' && emotion.intensity >= 3)
    return { goal: 'share_joy', confidence: 0.7 }
  if (/\b(j'ai|tu sais|écoute)\b/.test(t)) return { goal: 'be_heard', confidence: 0.55 }
  return { goal: 'unclear', confidence: 0.3 }
}

/**
 * Build the deep goal frame from input text + context.
 * <5ms exec.
 */
export function buildDeepGoalFrame(
  text: string,
  emotion: EmotionSignal,
  session: SessionContext,
  sessionHistory: string[],
): DeepGoalFrame {
  const { goal, confidence } = classifyUserGoal(text, emotion)
  const motivation = detectDeepMotivation(text, sessionHistory)
  const social = detectSocialContext(text)
  const trajectory = detectGoalTrajectory(
    { explicitIntent: goal, ambiguityScore: 1 - confidence, emotion } as UnderstandingFrame,
    session,
    session.recentTopics,
  )

  return {
    explicitIntent: goal,
    implicitIntent: motivation === 'master_fear' ? 'seek_comfort' : null,
    emotionalNeed:
      motivation === 'master_fear' || motivation === 'cope_with_change'
        ? 'security'
        : motivation === 'seek_belonging'
          ? 'connection'
          : motivation === 'build_identity'
            ? 'validation'
            : null,
    userGoal: goal,
    emotion,
    intentConfidence: confidence,
    ambiguityScore: 1 - confidence,
    alternativeIntents: [],
    deepMotivation: motivation,
    goalTrajectory: trajectory,
    socialContext: social,
  }
}
