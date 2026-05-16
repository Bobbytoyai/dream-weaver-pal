// @bobby/brain-v8 — Micro-LLM Augmentation V2

import type { CognitionPlanV8, DeepGoalFrame, LlmCall } from './types.ts'

export type AugmentationType =
  | 'enrich_fact'
  | 'humanize'
  | 'creative_content'
  | 'contextual_bridge'
  | 'emotional_depth'
  | 'none'

export interface AugmentationDecision {
  shouldAugment: boolean
  reason: string
  augmentationType: AugmentationType
  promptContext: string
  maxTokens: number
  priority: 'low' | 'normal' | 'high'
}

function detectMechanicalResponse(text: string): boolean {
  // Heuristic: short, no contractions, generic
  if (text.length < 25) return true
  if (!/[,!?]/.test(text)) return true
  return /^(Oui|Non|D'accord|OK)\.?$/i.test(text.trim())
}

export function decideAugmentation(
  localReply: string,
  plan: CognitionPlanV8,
  frame: DeepGoalFrame,
): AugmentationDecision {
  if (plan.confidence >= 0.85 && plan.what.contentStrategy !== 'llm_generate') {
    return {
      shouldAugment: false,
      reason: 'high_local_confidence',
      augmentationType: 'none',
      promptContext: '',
      maxTokens: 0,
      priority: 'low',
    }
  }

  if (plan.why.primaryGoal === 'enseigner' && frame.deepMotivation === 'pure_curiosity') {
    return {
      shouldAugment: true,
      reason: 'enrich_educational_content',
      augmentationType: 'enrich_fact',
      promptContext: `Enrichis cette réponse avec UN détail fascinant et adapté à un enfant de cet âge. Pas plus de 2 phrases. Réponse de base: "${localReply}". Sujet: ${frame.explicitIntent}.`,
      maxTokens: 80,
      priority: 'normal',
    }
  }

  if (detectMechanicalResponse(localReply)) {
    return {
      shouldAugment: true,
      reason: 'response_too_mechanical',
      augmentationType: 'humanize',
      promptContext: `Rends cette réponse plus chaleureuse, plus naturelle pour un enfant. Garde le sens. Base: "${localReply}".`,
      maxTokens: 60,
      priority: 'low',
    }
  }

  if (plan.what.contentStrategy === 'game_action' || frame.userGoal === 'have_fun') {
    return {
      shouldAugment: true,
      reason: 'creative_content_needed',
      augmentationType: 'creative_content',
      promptContext: `Propose une activité fun pour un enfant maintenant. Ton: ${plan.how.tone}. 2 phrases max.`,
      maxTokens: 100,
      priority: 'normal',
    }
  }

  if (plan.who.role === 'comfort' && frame.emotion.intensity >= 4) {
    return {
      shouldAugment: true,
      reason: 'emotional_depth_needed',
      augmentationType: 'emotional_depth',
      promptContext: `L enfant ressent ${frame.emotion.type} très fort. Empathie + une phrase concrète. Base: "${localReply}".`,
      maxTokens: 60,
      priority: 'high',
    }
  }

  return {
    shouldAugment: false,
    reason: 'no_augmentation_needed',
    augmentationType: 'none',
    promptContext: '',
    maxTokens: 0,
    priority: 'low',
  }
}

export async function augmentWithLLM(
  decision: AugmentationDecision,
  llm: LlmCall,
  fallback: string,
): Promise<string> {
  if (!decision.shouldAugment) return fallback
  try {
    const out = await llm({
      prompt: decision.promptContext,
      maxTokens: decision.maxTokens,
      priority: decision.priority,
    })
    return out.trim() || fallback
  } catch {
    return fallback
  }
}
