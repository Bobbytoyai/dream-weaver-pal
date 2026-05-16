// @bobby/brain-v8 — Proactive Initiative Engine

import type {
  InitiativeTrigger,
  InitiativeType,
  ProactiveInitiative,
  RelationshipState,
  SessionContext,
} from './types.js'

const COOLDOWNS: Record<InitiativeType, number> = {
  suggest_activity: 10,
  share_fact: 8,
  emotional_checkin: 15,
  memory_callback: 12,
  challenge: 10,
  story_hook: 15,
  celebrate: 50,
  gentle_redirect: 3,
}

const TRIGGER_TO_TYPE: Record<InitiativeTrigger, InitiativeType> = {
  silence_timeout: 'gentle_redirect',
  session_start: 'emotional_checkin',
  mood_opportunity: 'suggest_activity',
  interest_match: 'share_fact',
  milestone: 'celebrate',
  time_based: 'suggest_activity',
  pattern_detected: 'memory_callback',
  context_shift: 'gentle_redirect',
}

export interface InitiativeContext {
  childIsSpeaking: boolean
  emotionalSceneActive: boolean
  safetySceneActive: boolean
  turnCount: number
  turnsSinceLastInitiative: Record<InitiativeType, number>
}

function isBlocked(ctx: InitiativeContext): string | null {
  if (ctx.childIsSpeaking) return 'child_is_speaking'
  if (ctx.emotionalSceneActive) return 'emotional_scene_active'
  if (ctx.safetySceneActive) return 'safety_scene_active'
  if (ctx.turnCount < 3) return 'less_than_3_turns'
  return null
}

function buildSilenceRedirect(session: SessionContext): string {
  if (session.sessionMood === 'negative') return 'Coucou, ça va toi ?'
  return 'Tu es toujours là ? Je peux te raconter un truc !'
}

function buildMemoryGreeting(relationship: RelationshipState): string {
  const last = relationship.sharedMemories.at(-1)
  if (last) return `Hé ! Tu te souviens, ${last.event} ? C'était trop bien !`
  return 'Salut mon pote ! Content de te revoir !'
}

function buildMilestone(relationship: RelationshipState): string {
  const milestones = relationship.totalInteractions
  if (milestones === 100) return 'Eh, c est notre 100ème discussion ! Trop fort !'
  if (milestones === 50) return 'Eh, ça fait déjà 50 fois qu on parle ! Cool !'
  return 'Hé, c est notre journée à nous aujourd hui !'
}

export function shouldInitiate(
  trigger: InitiativeTrigger,
  ctx: InitiativeContext,
  session: SessionContext,
  relationship: RelationshipState,
): { should: boolean; initiative: ProactiveInitiative | null; reason: string } {
  const blocker = isBlocked(ctx)
  if (blocker) return { should: false, initiative: null, reason: blocker }

  const type = TRIGGER_TO_TYPE[trigger]
  const turnsSince = ctx.turnsSinceLastInitiative[type] ?? Number.POSITIVE_INFINITY
  if (turnsSince < COOLDOWNS[type]) {
    return { should: false, initiative: null, reason: `cooldown_${type}` }
  }

  let content: string
  switch (trigger) {
    case 'silence_timeout':
      content = buildSilenceRedirect(session)
      break
    case 'session_start':
      content =
        relationship.phase === 'discovery'
          ? 'Salut ! Comment ça va aujourd hui ?'
          : buildMemoryGreeting(relationship)
      break
    case 'milestone':
      content = buildMilestone(relationship)
      break
    case 'interest_match':
      content = 'Tu sais quoi, j ai pensé à un truc qui pourrait te plaire !'
      break
    default:
      content = 'Tu veux qu on fasse quelque chose de fun ?'
  }

  return {
    should: true,
    initiative: {
      type,
      trigger,
      content,
      urgency: trigger === 'milestone' ? 0.6 : 0.3,
      nonIntrusiveLevel: trigger === 'silence_timeout' ? 0.9 : 0.7,
    },
    reason: 'ok',
  }
}
