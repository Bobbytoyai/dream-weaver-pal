// Smoke tests for the V8 brain
// Run: bun test

import { describe, expect, it } from 'bun:test'
import { ageToGroup, buildChildWorldModel } from './child-world-model.js'
import { decideTiming } from './cognition.js'
import { buildDeepGoalFrame, detectDeepMotivation } from './deep-goal-engine.js'
import { createBrain } from './orchestrator.js'
import { emptyRelationship, updateRelationship } from './relationship-engine.js'
import { analyzeSilence } from './silence-engine.js'
import {
  detectEmotionFromText,
  emptyMentalModel,
  inferCognitiveLevel,
} from './theory-of-mind.js'
import { applyVariation, emptyVariationContext } from './variation-engine.js'
import type { ChildProfile } from './types.js'

const sampleChild: ChildProfile = {
  id: 'test-1',
  name: 'Lou',
  age: 7,
  language: 'fr',
}

describe('child-world-model', () => {
  it('maps ages to correct groups', () => {
    expect(ageToGroup(3)).toBe('toddler_3_4')
    expect(ageToGroup(5)).toBe('preschool_5_6')
    expect(ageToGroup(7)).toBe('early_school_7_8')
    expect(ageToGroup(10)).toBe('mid_school_9_10')
    expect(ageToGroup(12)).toBe('preteen_11_12')
  })

  it('builds a model for age 7 with attention span > 0', () => {
    const m = buildChildWorldModel(7)
    expect(m.cognitiveTraits.attentionSpan).toBeGreaterThan(0)
    expect(m.cognitiveTraits.workingMemorySlots).toBeGreaterThanOrEqual(2)
  })
})

describe('theory-of-mind', () => {
  it('detects emotion from text', () => {
    expect(detectEmotionFromText("j'ai peur du noir").type).toBe('fear')
    expect(detectEmotionFromText('je suis trop content').type).toBe('joy')
    expect(detectEmotionFromText('pourquoi le ciel est bleu').type).toBe('curiosity')
  })

  it('infers cognitive level', () => {
    expect(
      inferCognitiveLevel(4, {
        usesCausalReasoning: false,
        confusesCausality: false,
        formulatesHypotheses: false,
        understandsIrony: false,
        canAbstract: false,
        canReversible: false,
      }),
    ).toBe('preoperational')
  })

  it('starts with a sane empty model', () => {
    const m = emptyMentalModel()
    expect(m.beliefs.confidence).toBeGreaterThan(0)
    expect(m.understanding.cognitiveLevel).toBe('concrete')
  })
})

describe('deep-goal-engine', () => {
  it('detects master_fear from "j ai peur du noir"', () => {
    expect(detectDeepMotivation("j'ai peur du noir", [])).toBe('master_fear')
  })

  it('builds a frame with sensible goal', () => {
    const frame = buildDeepGoalFrame(
      'pourquoi le ciel est bleu ?',
      detectEmotionFromText('pourquoi'),
      { turnCount: 1, topicDepth: 1, sessionMood: 'neutral', startedAt: 0, recentTopics: [] },
      [],
    )
    expect(frame.userGoal).toBe('learn_something')
  })
})

describe('cognition', () => {
  it('returns empathy_pause for high-intensity emotion', () => {
    const tom = emptyMentalModel()
    const timing = decideTiming(
      {
        explicitIntent: 'fear',
        implicitIntent: null,
        emotionalNeed: 'security',
        userGoal: 'seek_comfort',
        emotion: { type: 'fear', intensity: 5, confidence: 0.9 },
        intentConfidence: 0.9,
        ambiguityScore: 0.1,
        alternativeIntents: [],
        deepMotivation: 'master_fear',
        goalTrajectory: 'stable',
        socialContext: { mentionsOthers: false, socialRole: 'none', relationshipFocus: null },
      },
      tom,
    )
    expect(timing.timingReason).toBe('empathy_pause')
    expect(timing.delayMs).toBe(400)
  })
})

describe('silence-engine', () => {
  it('returns wait for micro-silence', () => {
    const sa = analyzeSilence(
      1000,
      'salut',
      { turnCount: 3, topicDepth: 1, sessionMood: 'positive', startedAt: 0, recentTopics: [] },
      emptyMentalModel(),
    )
    expect(sa.type).toBe('micro')
    expect(sa.action).toBe('wait')
  })

  it('returns wind_down for extended silence', () => {
    const sa = analyzeSilence(
      60000,
      'salut',
      { turnCount: 3, topicDepth: 1, sessionMood: 'positive', startedAt: 0, recentTopics: [] },
      emptyMentalModel(),
    )
    expect(sa.type).toBe('extended')
    expect(sa.action).toBe('wind_down')
  })
})

describe('relationship-engine', () => {
  it('starts in discovery phase', () => {
    expect(emptyRelationship().phase).toBe('discovery')
  })

  it('transitions to trust after enough positive interactions', () => {
    let r = emptyRelationship()
    for (let i = 0; i < 35; i++) {
      r = updateRelationship(r, {
        turnCount: 1,
        overallMood: 'positive',
        laughCount: 1,
        emotionalMoments: 0,
      })
    }
    expect(r.phase).toBe('trust')
  })
})

describe('variation-engine', () => {
  it('does not change unique text', () => {
    const ctx = emptyVariationContext()
    expect(applyVariation('Bonjour Lou !', ctx)).toBe('Bonjour Lou !')
  })

  it('substitutes overused expression when in recent phrases', () => {
    const ctx = emptyVariationContext()
    ctx.recentPhrases = ["C'est super, c'est super, c'est super"]
    const out = applyVariation("C'est super !", ctx)
    // Should pick an alternative not in recentPhrases
    expect(out).not.toMatch(/super/i)
  })
})

describe('orchestrator', () => {
  it('produces a response within latency budget', async () => {
    const brain = createBrain({ childProfile: sampleChild })
    const result = await brain.respond({
      text: "j'ai peur du noir",
      sessionContext: {
        turnCount: 1,
        topicDepth: 1,
        sessionMood: 'neutral',
        startedAt: Date.now(),
        recentTopics: [],
      },
    })
    expect(result.text.length).toBeGreaterThan(0)
    expect(result.telemetry.totalMs).toBeLessThan(200) // generous for CI
    expect(result.plan.who.role).toMatch(/comfort|listener|guardian/)
  })

  it('responds to a fun request with playmate role', async () => {
    const brain = createBrain({ childProfile: sampleChild })
    const result = await brain.respond({
      text: 'on joue à un jeu ?',
      sessionContext: {
        turnCount: 2,
        topicDepth: 1,
        sessionMood: 'positive',
        startedAt: Date.now(),
        recentTopics: [],
      },
    })
    expect(result.plan.who.role).toBe('playmate')
  })
})
