// @bobby/brain-v8 — Theory of Mind Engine
// Modélise ce que l'enfant CROIT, COMPREND, RESSENT.
// Pure functions, <3ms exec.

import type {
  Belief,
  CognitiveLevel,
  EmotionSignal,
  MentalModel,
  UnderstandingFrame,
} from './types.ts'

// ─── Default empty model ────────────────────────────────────
export function emptyMentalModel(): MentalModel {
  return {
    beliefs: { aboutSelf: [], aboutWorld: [], aboutBobby: [], confidence: 0.3 },
    understanding: {
      cognitiveLevel: 'concrete',
      vocabularyLevel: 'moderate',
      canDistinguishRealFiction: true,
      canHandleNuance: false,
      conceptsGrasped: [],
      conceptsStruggled: [],
    },
    emotionalState: {
      surfaceEmotion: 'neutral',
      inferredEmotion: 'neutral',
      emotionDelta: 0,
      emotionalTrajectory: 'stable',
    },
    expectations: {
      wantsFun: 0.5,
      wantsComfort: 0.3,
      wantsKnowledge: 0.4,
      wantsControl: 0.2,
      expectationShift: null,
    },
  }
}

// ─── Belief extraction ──────────────────────────────────────
const BELIEF_PATTERNS: Array<{
  pattern: RegExp
  type: Belief['type']
  extract: (m: RegExpMatchArray) => string
}> = [
  // Croyances sur soi
  {
    pattern: /\bje suis ([a-zà-ÿ\s]{3,30})/i,
    type: 'emotional',
    extract: (m) => `croit être ${m[1]?.trim() ?? ''}`,
  },
  {
    pattern: /\bje (?:n'?arrive|ne sais?) pas/i,
    type: 'emotional',
    extract: () => 'difficulté perçue',
  },
  // Croyances fantasy
  {
    pattern: /\b(père noël|fée|monstre|dragon|licorne|magie|sorcière)\b/i,
    type: 'fantasy',
    extract: (m) => `croit en ${m[1]}`,
  },
  // Croyances sociales
  {
    pattern: /\b(personne|tout le monde|les autres)\s+(?:m'aime|me déteste|est méchant)/i,
    type: 'social',
    extract: (m) => `perception sociale: ${m[0]}`,
  },
]

export function extractBeliefs(
  text: string,
  intentConfidence: number,
  now: number = Date.now(),
): Belief[] {
  const beliefs: Belief[] = []
  for (const { pattern, type, extract } of BELIEF_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      beliefs.push({
        content: extract(match),
        type,
        confidence: Math.max(0.3, intentConfidence * 0.8),
        source: 'stated',
        timestamp: now,
      })
    }
  }
  return beliefs
}

// ─── Cognitive level inference ──────────────────────────────
export interface CognitiveSignals {
  usesCausalReasoning: boolean
  confusesCausality: boolean
  formulatesHypotheses: boolean
  understandsIrony: boolean
  canAbstract: boolean
  canReversible: boolean
}

export function inferCognitiveLevel(age: number, signals: CognitiveSignals): CognitiveLevel {
  let baseline: CognitiveLevel =
    age <= 5 ? 'preoperational' : age <= 8 ? 'concrete' : age <= 10 ? 'transitional' : 'formal'

  if (signals.usesCausalReasoning && baseline === 'preoperational') baseline = 'concrete'
  if (signals.confusesCausality && baseline !== 'preoperational') baseline = 'preoperational'
  if (signals.formulatesHypotheses) {
    if (baseline === 'preoperational') baseline = 'concrete'
    else if (baseline === 'concrete') baseline = 'transitional'
  }
  return baseline
}

export function detectCognitiveSignals(text: string): CognitiveSignals {
  const t = text.toLowerCase()
  return {
    usesCausalReasoning: /\bparce que\b|\balors\b.*\bcar\b/.test(t),
    confusesCausality: /il pleut parce que|il fait nuit parce que je/.test(t),
    formulatesHypotheses: /\bet si\b|\bimagine que\b|\bpeut-être que\b/.test(t),
    understandsIrony: false, // detected via feedback loop
    canAbstract: /\b(amitié|justice|liberté|courage|égalité)\b/.test(t),
    canReversible: false,
  }
}

// ─── Update mental model ────────────────────────────────────
export function updateMentalModel(
  current: MentalModel,
  text: string,
  frame: UnderstandingFrame,
  age: number,
  bobbyResponse: string,
): MentalModel {
  void bobbyResponse // reserved for feedback loop
  const updated = structuredClone(current)

  // ── Extract beliefs ──
  const newBeliefs = extractBeliefs(text, frame.intentConfidence)
  for (const belief of newBeliefs) {
    const bucket =
      belief.type === 'fantasy' || belief.type === 'factual'
        ? updated.beliefs.aboutWorld
        : updated.beliefs.aboutSelf
    const existing = bucket.find((b) => b.content === belief.content)
    if (existing) {
      existing.confidence = (existing.confidence + belief.confidence) / 2
      existing.timestamp = belief.timestamp
    } else {
      bucket.push(belief)
    }
  }

  // ── Cognitive level ──
  const cogSignals = detectCognitiveSignals(text)
  updated.understanding.cognitiveLevel = inferCognitiveLevel(age, cogSignals)
  if (cogSignals.canAbstract && !updated.understanding.canHandleNuance) {
    updated.understanding.canHandleNuance = true
  }

  // ── Emotional state ──
  updated.emotionalState.surfaceEmotion = frame.emotion.type
  if (frame.implicitIntent === 'seek_comfort' && frame.emotion.type === 'neutral') {
    updated.emotionalState.inferredEmotion = 'sadness'
    updated.emotionalState.emotionDelta = 0.5
  } else {
    updated.emotionalState.inferredEmotion = frame.emotion.type
    updated.emotionalState.emotionDelta = 0
  }

  // ── Confidence grows with turns ──
  updated.beliefs.confidence = Math.min(1, updated.beliefs.confidence + 0.02)

  return updated
}

// ─── Apply ToM to response ──────────────────────────────────
export function applyToMToResponse(response: string, model: MentalModel): string {
  let adjusted = response

  // Simplify if preoperational
  if (model.understanding.cognitiveLevel === 'preoperational') {
    adjusted = adjusted.replace(/\bparce que\b/g, 'car')
    adjusted = adjusted.replace(/\bcependant|néanmoins|toutefois\b/g, 'mais')
    const sentences = adjusted.match(/[^.!?]+[.!?]+/g)
    if (sentences && sentences.length > 2) adjusted = sentences.slice(0, 2).join(' ')
  }

  // Never contradict fantasy beliefs
  const fantasyBeliefs = model.beliefs.aboutWorld.filter((b) => b.type === 'fantasy')
  if (fantasyBeliefs.length > 0) {
    adjusted = adjusted.replace(
      /(?:ça |ce )?n'existe pas|(?:ce n'est )?pas vrai|pas réel/gi,
      "c'est magique",
    )
  }

  return adjusted
}

// ─── Helper: emotion from text (cheap heuristic) ────────────
export function detectEmotionFromText(text: string): EmotionSignal {
  const t = text.toLowerCase()
  if (/\b(triste|pleure|pleurer|déprim|malheureu)\b/.test(t))
    return { type: 'sadness', intensity: 3, confidence: 0.7 }
  if (/\b(peur|terrifié|effraye|cauchemar)\b/.test(t))
    return { type: 'fear', intensity: 3, confidence: 0.7 }
  if (/\b(colère|énervé|fâché|rage|furieux)\b/.test(t))
    return { type: 'anger', intensity: 3, confidence: 0.7 }
  if (/\b(super|génial|content|heureux|trop bien|youpi)\b/.test(t))
    return { type: 'joy', intensity: 3, confidence: 0.7 }
  if (/\b(pourquoi|comment|c'est quoi|ça veut dire|je me demande)\b/.test(t))
    return { type: 'curiosity', intensity: 2, confidence: 0.6 }
  return { type: 'neutral', intensity: 1, confidence: 0.5 }
}
