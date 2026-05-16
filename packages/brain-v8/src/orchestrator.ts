// @bobby/brain-v8 — Orchestrator
// 6-stage pipeline. Coordonne tous les modules V8.

import { adaptToChildWorld, buildChildWorldModel } from './child-world-model.js'
import { buildCognitionPlan } from './cognition.js'
import { buildDeepGoalFrame } from './deep-goal-engine.js'
import { augmentWithLLM, decideAugmentation } from './llm-augmentor.js'
import { PerfTracker } from './performance-monitor.js'
import { emptyRelationship } from './relationship-engine.js'
import { analyzeSilence, pickSilenceMessage } from './silence-engine.js'
import {
  applyToMToResponse,
  detectEmotionFromText,
  emptyMentalModel,
  updateMentalModel,
} from './theory-of-mind.js'
import type {
  BrainInput,
  BrainResponse,
  ChildProfile,
  LlmCall,
  MentalModel,
  RelationshipState,
} from './types.js'
import { assessUncertainty } from './uncertainty-engine.js'
import {
  applyVariation,
  emptyVariationContext,
  trackInVariationContext,
  type VariationContext,
} from './variation-engine.js'

export interface BrainConfig {
  childProfile: ChildProfile
  relationshipState?: RelationshipState | null
  mentalModel?: MentalModel | null
  variationContext?: VariationContext | null
  /** Optional LLM call for Layer 3 augmentation. If absent, brain runs fully offline. */
  llmCall?: LlmCall
}

export class Brain {
  private profile: ChildProfile
  private relationship: RelationshipState
  private mentalModel: MentalModel
  private variation: VariationContext
  private llmCall: LlmCall | undefined
  private sessionHistory: string[] = []

  constructor(config: BrainConfig) {
    this.profile = config.childProfile
    this.relationship = config.relationshipState ?? emptyRelationship()
    this.mentalModel = config.mentalModel ?? emptyMentalModel()
    this.variation = config.variationContext ?? emptyVariationContext()
    this.llmCall = config.llmCall
  }

  /** Generate a Bobby response for one user turn. */
  async respond(input: BrainInput): Promise<BrainResponse> {
    const perf = new PerfTracker()
    const worldModel = buildChildWorldModel(this.profile.age)

    // ── STAGE 0 — Preprocessing ────────────────────────
    const cleanText = await perf.measure('preprocessing', () => input.text.trim())

    // ── STAGE 1 — Deep Understanding ───────────────────
    const { frame, tomUpdated } = await perf.measure('understanding', () => {
      const emotion = detectEmotionFromText(cleanText)
      const f = buildDeepGoalFrame(cleanText, emotion, input.sessionContext, this.sessionHistory)
      const t = updateMentalModel(this.mentalModel, cleanText, f, this.profile.age, '')
      return { frame: f, tomUpdated: t }
    })

    // ── STAGE 2 — Decision ─────────────────────────────
    const { plan, uncertainty } = await perf.measure('decision', () => {
      const p = buildCognitionPlan(frame, tomUpdated, this.relationship, input.sessionContext)
      const u = assessUncertainty(frame, tomUpdated)
      return { plan: p, uncertainty: u }
    })

    // ── STAGE 3 — Content generation ───────────────────
    let baseReply = await perf.measure('contentGeneration', async () => {
      // Local template-based reply
      let local = this.generateLocalReply(frame, plan, uncertainty.clarificationQuestion)

      // Optional LLM augmentation
      if (this.llmCall) {
        const decision = decideAugmentation(local, plan, frame)
        if (decision.shouldAugment) {
          local = await augmentWithLLM(decision, this.llmCall, local)
          perf.usedLLM = true
        }
      }
      return local
    })

    // ── STAGE 4 — Response shaping ─────────────────────
    baseReply = await perf.measure('shaping', () => {
      let r = applyToMToResponse(baseReply, tomUpdated)
      r = adaptToChildWorld(r, worldModel)
      r = applyVariation(r, this.variation)
      return r
    })

    // ── STAGE 5 — Post-processing ──────────────────────
    const { updatedVariation, silenceHint } = await perf.measure('postProcessing', () => {
      const v = trackInVariationContext(this.variation, baseReply)
      let s: string | null = null
      if (input.silenceMs != null) {
        const sa = analyzeSilence(input.silenceMs, baseReply, input.sessionContext, tomUpdated)
        if (sa.action !== 'wait') s = pickSilenceMessage(sa.action)
      }
      return { updatedVariation: v, silenceHint: s }
    })

    // Commit state
    this.mentalModel = tomUpdated
    this.variation = updatedVariation
    this.sessionHistory.push(cleanText)
    if (this.sessionHistory.length > 20) this.sessionHistory.shift()

    return {
      text: silenceHint ? `${silenceHint} ${baseReply}` : baseReply,
      emotion: tomUpdated.emotionalState.inferredEmotion,
      audioHint: plan.when.shouldDelay ? { pauseMs: plan.when.delayMs } : undefined,
      plan,
      telemetry: perf.build(),
      updatedRelationship: this.relationship,
      updatedToM: tomUpdated,
      safetyLevel: 0, // SafeGuard is external, see services/cloud/functions/safety
    }
  }

  // ─── Naive local reply generator (Layer 1) ──────────
  private generateLocalReply(
    frame: ReturnType<typeof buildDeepGoalFrame>,
    plan: ReturnType<typeof buildCognitionPlan>,
    clarification: string | null,
  ): string {
    if (clarification) return clarification

    if (plan.who.role === 'comfort') {
      return 'Je suis là. Tu veux m en parler ?'
    }
    if (plan.who.role === 'playmate' && frame.userGoal === 'have_fun') {
      return 'Oh oui, on joue ! Tu préfères une devinette ou une mini-histoire ?'
    }
    if (plan.who.role === 'teacher') {
      return 'Bonne question ! Tu veux la version courte ou la version super-détaillée ?'
    }
    if (plan.who.role === 'cheerleader') {
      return 'Trop fort ! Raconte-moi tout !'
    }
    return 'Je t écoute, dis-moi tout.'
  }

  /** Get serializable snapshot for persistence between sessions. */
  snapshot(): { mentalModel: MentalModel; variation: VariationContext } {
    return { mentalModel: this.mentalModel, variation: this.variation }
  }
}

export function createBrain(config: BrainConfig): Brain {
  return new Brain(config)
}
