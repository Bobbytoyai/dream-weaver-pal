// @bobby/brain-v8 — Relationship Evolution Engine (4 phases)

import type { RelationshipPhase, RelationshipState } from './types.ts'

export function emptyRelationship(): RelationshipState {
  return {
    phase: 'discovery',
    totalInteractions: 0,
    totalSessions: 0,
    trustScore: 0,
    complicityScore: 0,
    emotionalBondScore: 0,
    milestones: [],
    sharedMemories: [],
    insideJokes: [],
  }
}

export interface SessionMetrics {
  turnCount: number
  overallMood: 'positive' | 'neutral' | 'negative'
  laughCount: number
  emotionalMoments: number
}

export function updateRelationship(
  state: RelationshipState,
  metrics: SessionMetrics,
  now: number = Date.now(),
): RelationshipState {
  const updated = structuredClone(state)

  // ── Update scores ──
  if (metrics.overallMood === 'positive') {
    updated.trustScore = Math.min(100, updated.trustScore + 1)
  }
  if (metrics.laughCount > 0) {
    updated.complicityScore = Math.min(100, updated.complicityScore + 2)
  }
  if (metrics.emotionalMoments > 0) {
    updated.emotionalBondScore = Math.min(100, updated.emotionalBondScore + 3)
  }
  updated.totalInteractions += metrics.turnCount
  updated.totalSessions += 1

  // ── Phase transitions ──
  const before = updated.phase
  if (
    before === 'discovery' &&
    updated.totalInteractions >= 10 &&
    updated.trustScore >= 30
  ) {
    updated.phase = 'trust'
    updated.milestones.push({
      type: 'phase_trust',
      timestamp: now,
      description: 'Bobby et l enfant commencent à se faire confiance',
    })
  }
  if (
    updated.phase === 'trust' &&
    updated.totalInteractions >= 50 &&
    updated.emotionalBondScore >= 40
  ) {
    updated.phase = 'attachment'
    updated.milestones.push({
      type: 'phase_attachment',
      timestamp: now,
      description: 'Un vrai lien s est créé',
    })
  }
  if (
    updated.phase === 'attachment' &&
    updated.totalInteractions >= 200 &&
    updated.complicityScore >= 60
  ) {
    updated.phase = 'complicity'
    updated.milestones.push({
      type: 'phase_complicity',
      timestamp: now,
      description: 'Bobby et l enfant sont complices',
    })
  }

  return updated
}

export interface PhaseBehavior {
  greetingStyle: string
  humorLevel: number
  personalReferenceRate: number
  vulnerabilityLevel: number
  teasingLevel: number
}

export const PHASE_BEHAVIORS: Record<RelationshipPhase, PhaseBehavior> = {
  discovery: {
    greetingStyle: 'formal_warm',
    humorLevel: 0.3,
    personalReferenceRate: 0.1,
    vulnerabilityLevel: 0,
    teasingLevel: 0,
  },
  trust: {
    greetingStyle: 'warm_personal',
    humorLevel: 0.5,
    personalReferenceRate: 0.3,
    vulnerabilityLevel: 0.2,
    teasingLevel: 0.1,
  },
  attachment: {
    greetingStyle: 'intimate_callback',
    humorLevel: 0.7,
    personalReferenceRate: 0.5,
    vulnerabilityLevel: 0.4,
    teasingLevel: 0.3,
  },
  complicity: {
    greetingStyle: 'complicit_insider',
    humorLevel: 0.9,
    personalReferenceRate: 0.7,
    vulnerabilityLevel: 0.6,
    teasingLevel: 0.5,
  },
}
