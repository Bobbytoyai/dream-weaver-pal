// @bobby/brain-v8 — Child World Model
// Encode la logique cognitive typique par âge.
// Pure functions, <2ms exec, lookup-table based.

import type { AgeGroup, ChildWorldModel, CognitiveTraits, ConfusionZone } from './types.ts'

export function ageToGroup(age: number): AgeGroup {
  if (age <= 4) return 'toddler_3_4'
  if (age <= 6) return 'preschool_5_6'
  if (age <= 8) return 'early_school_7_8'
  if (age <= 10) return 'mid_school_9_10'
  return 'preteen_11_12'
}

const AGE_PROFILES: Record<AgeGroup, CognitiveTraits> = {
  toddler_3_4: {
    causalReasoning: 0.2,
    timePerception: 0.1,
    abstractThinking: 0.05,
    empathyCapacity: 0.2,
    humorComprehension: 0.3,
    realFictionBoundary: 0.1,
    attentionSpan: 3,
    workingMemorySlots: 2,
  },
  preschool_5_6: {
    causalReasoning: 0.4,
    timePerception: 0.3,
    abstractThinking: 0.15,
    empathyCapacity: 0.4,
    humorComprehension: 0.5,
    realFictionBoundary: 0.3,
    attentionSpan: 7,
    workingMemorySlots: 3,
  },
  early_school_7_8: {
    causalReasoning: 0.65,
    timePerception: 0.6,
    abstractThinking: 0.35,
    empathyCapacity: 0.6,
    humorComprehension: 0.7,
    realFictionBoundary: 0.7,
    attentionSpan: 12,
    workingMemorySlots: 4,
  },
  mid_school_9_10: {
    causalReasoning: 0.8,
    timePerception: 0.8,
    abstractThinking: 0.55,
    empathyCapacity: 0.75,
    humorComprehension: 0.85,
    realFictionBoundary: 0.9,
    attentionSpan: 18,
    workingMemorySlots: 5,
  },
  preteen_11_12: {
    causalReasoning: 0.9,
    timePerception: 0.9,
    abstractThinking: 0.7,
    empathyCapacity: 0.85,
    humorComprehension: 0.95,
    realFictionBoundary: 0.95,
    attentionSpan: 25,
    workingMemorySlots: 6,
  },
}

const CONFUSION_ZONES: ConfusionZone[] = [
  {
    topic: 'temps',
    typicalAge: [3, 6],
    typicalError: "Confond hier/demain, ne comprend pas 'dans 2 jours'",
    bobbyStrategy: "Utiliser des repères concrets: 'après 2 dodos'",
  },
  {
    topic: 'mort',
    typicalAge: [4, 7],
    typicalError: "Pense que la mort est réversible ou temporaire",
    bobbyStrategy: 'Ne pas contredire, rassurer, rediriger vers un adulte si besoin',
  },
  {
    topic: 'quantite',
    typicalAge: [3, 5],
    typicalError: 'Conservation non acquise',
    bobbyStrategy: 'Utiliser des comparaisons visuelles simples',
  },
  {
    topic: 'causalite',
    typicalAge: [3, 6],
    typicalError: "Pensée magique: 'il pleut parce que je suis triste'",
    bobbyStrategy: "Accepter puis glisser vers l'explication réelle avec douceur",
  },
  {
    topic: 'perspective',
    typicalAge: [3, 7],
    typicalError: 'Égocentrisme: pense que tout le monde voit ce qu il voit',
    bobbyStrategy: "Poser des questions pour décentrer: 'et ta maman, elle pense quoi?'",
  },
  {
    topic: 'reel_fiction',
    typicalAge: [3, 7],
    typicalError: 'Mélange personnages fictifs et réalité',
    bobbyStrategy: "Entrer dans l'imaginaire avec l'enfant, ne pas corriger brutalement",
  },
  {
    topic: 'ironie',
    typicalAge: [6, 9],
    typicalError: 'Prend l ironie au premier degré',
    bobbyStrategy: 'Éviter l ironie avant 8 ans, utiliser humour littéral',
  },
]

/**
 * Build the world model for a given age. Pure, deterministic, <1ms.
 */
export function buildChildWorldModel(age: number): ChildWorldModel {
  const group = ageToGroup(age)
  return {
    ageGroup: group,
    cognitiveTraits: AGE_PROFILES[group],
    confusionZones: CONFUSION_ZONES.filter(
      (z) => age >= z.typicalAge[0] && age <= z.typicalAge[1],
    ),
  }
}

/**
 * Check if a topic enters a confusion zone for this age.
 * Returns the zone (with strategy) if it does, null otherwise.
 */
export function findConfusionZone(
  topic: string,
  age: number,
  model: ChildWorldModel,
): ConfusionZone | null {
  const t = topic.toLowerCase()
  return (
    model.confusionZones.find(
      (z) => t.includes(z.topic) && age >= z.typicalAge[0] && age <= z.typicalAge[1],
    ) ?? null
  )
}

/**
 * Adapt response content to the child's world model.
 * Limits complexity to working memory slots, replaces abstract concepts.
 */
export function adaptToChildWorld(response: string, model: ChildWorldModel): string {
  const traits = model.cognitiveTraits
  let adapted = response

  // ── Limit complexity to working memory ──
  const sentences = adapted.match(/[^.!?]+[.!?]+/g) ?? []
  if (sentences.length > traits.workingMemorySlots) {
    adapted = sentences.slice(0, traits.workingMemorySlots).join(' ')
  }

  // ── Replace abstract concepts if low abstract thinking ──
  if (traits.abstractThinking < 0.3) {
    adapted = adapted.replace(/la justice/gi, "quand c'est juste pour tout le monde")
    adapted = adapted.replace(/la liberté/gi, 'quand on peut choisir')
    adapted = adapted.replace(/l'amitié/gi, 'quand on a un super copain')
  }

  // ── Adapt temporal references if low time perception ──
  if (traits.timePerception < 0.3) {
    adapted = adapted.replace(/il y a (\d+) ans/gi, 'il y a très longtemps')
    adapted = adapted.replace(/dans (\d+) jours/gi, (_, n: string) => `après ${n} dodos`)
  }

  return adapted
}
