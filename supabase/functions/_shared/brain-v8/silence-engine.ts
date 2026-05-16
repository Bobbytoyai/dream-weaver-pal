// @bobby/brain-v8 — Silence & Attention Engine

import type {
  MentalModel,
  SessionContext,
  SilenceAction,
  SilenceAnalysis,
  SilenceReason,
  SilenceType,
} from './types.ts'

export function analyzeSilence(
  silenceMs: number,
  lastBobbyMessage: string,
  session: SessionContext,
  tom: MentalModel,
): SilenceAnalysis {
  const type: SilenceType =
    silenceMs < 3000
      ? 'micro'
      : silenceMs < 8000
        ? 'short'
        : silenceMs < 20000
          ? 'medium'
          : silenceMs < 45000
            ? 'long'
            : 'extended'

  let reason: SilenceReason
  let action: SilenceAction
  let actionDelay = 0

  if (type === 'micro') {
    return { type, duration: silenceMs, likelyReason: 'thinking', action: 'wait', actionDelay: 0 }
  }
  if (type === 'short') {
    if (lastBobbyMessage.includes('?') && tom.understanding.cognitiveLevel !== 'formal') {
      reason = 'thinking'
      action = 'wait'
      actionDelay = 3000
    } else {
      reason = 'hesitating'
      action = 'encourage'
    }
    return { type, duration: silenceMs, likelyReason: reason, action, actionDelay }
  }
  if (type === 'medium') {
    if (session.sessionMood === 'negative') {
      reason = 'emotional'
      action = 'check_in'
    } else {
      reason = 'distracted'
      action = 'redirect'
      actionDelay = 2000
    }
    return { type, duration: silenceMs, likelyReason: reason, action, actionDelay }
  }
  if (type === 'long') {
    reason = session.turnCount > 5 ? 'bored' : 'away'
    action = reason === 'bored' ? 'redirect' : 'check_in'
    return { type, duration: silenceMs, likelyReason: reason, action, actionDelay }
  }
  return {
    type: 'extended',
    duration: silenceMs,
    likelyReason: 'away',
    action: 'wind_down',
    actionDelay: 0,
  }
}

export const SILENCE_MESSAGES: Record<SilenceAction, string[]> = {
  wait: [],
  encourage: [
    'Prends ton temps...',
    'Je suis là, pas de pression !',
    'Tu réfléchis ? C est bien de prendre son temps !',
  ],
  rephrase: ['Je reformule : ', "En d'autres mots : "],
  simplify: ['Plus simplement : '],
  redirect: [
    'Tu veux qu on fasse autre chose ?',
    'Et si on changeait de sujet ?',
    'J ai une idée ! On pourrait jouer à un truc !',
  ],
  check_in: ['Tu es toujours là ?', 'Coucou ! Je suis là si tu veux parler !'],
  wind_down: ['On se dit à bientôt ?', 'Passe une super journée !'],
}

export function pickSilenceMessage(action: SilenceAction): string {
  const pool = SILENCE_MESSAGES[action]
  if (pool.length === 0) return ''
  return pool[Math.floor(Math.random() * pool.length)] ?? ''
}
