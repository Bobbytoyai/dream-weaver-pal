// @bobby/brain-v8 — Variation Engine (anti-repetition)

export type ResponseStructure =
  | 'statement'
  | 'question_then_fact'
  | 'fact_then_question'
  | 'exclamation_then_content'
  | 'empathy_then_redirect'
  | 'story_fragment'
  | 'challenge'
  | 'comparison'

export interface VariationContext {
  recentPhrases: string[]
  recentOpenings: string[]
  recentClosings: string[]
  recentEmojis: string[]
  recentStructures: ResponseStructure[]
}

export function emptyVariationContext(): VariationContext {
  return {
    recentPhrases: [],
    recentOpenings: [],
    recentClosings: [],
    recentEmojis: [],
    recentStructures: [],
  }
}

const PARAPHRASE_MAP: Array<{ original: RegExp; alternatives: readonly string[] }> = [
  { original: /\bC'est super\b/i, alternatives: ['C est génial', 'Trop bien', "J'adore", 'Excellent'] },
  { original: /\bTu veux\b/i, alternatives: ['Ça te dit de', 'On pourrait', 'Et si on'] },
  {
    original: /\bTu sais quoi\b/i,
    alternatives: ['Figure-toi que', 'Devine un peu', "J'ai un truc à te dire"],
  },
  {
    original: /\bBonne question\b/i,
    alternatives: ['Quelle question !', 'Ah, intéressant', "J'adore quand tu demandes ça"],
  },
  {
    original: /\bJe comprends\b/i,
    alternatives: ['Je vois ce que tu veux dire', "Oui, c'est normal", 'Ça se comprend'],
  },
  { original: /\bBravo\b/i, alternatives: ['Chapeau !', 'Bien joué', 'Tu assures', 'Impressionnant'] },
  { original: /\bTu savais que\b/i, alternatives: ['Le sais-tu ?', 'Petit secret :', 'Écoute bien :'] },
  {
    original: /\bAh oui\b/i,
    alternatives: ['Effectivement', 'Tout à fait', 'Exact', 'En effet'],
  },
]

function extractOpening(text: string): string {
  const m = text.match(/^[^,!?.]{1,30}/)
  return m?.[0]?.trim() ?? ''
}

export function applyVariation(response: string, ctx: VariationContext): string {
  let varied = response

  // ── Replace overused expressions ──
  for (const { original, alternatives } of PARAPHRASE_MAP) {
    if (!original.test(varied)) continue
    const available = alternatives.filter(
      (alt) => !ctx.recentPhrases.some((p) => p.includes(alt)),
    )
    if (available.length === 0) continue
    const replacement = available[Math.floor(Math.random() * available.length)] ?? alternatives[0]
    if (replacement !== undefined) varied = varied.replace(original, replacement)
  }

  // ── Replace overused emojis ──
  const emojis = varied.match(/[\u{1F300}-\u{1FAFF}]/gu) ?? []
  for (const emoji of emojis) {
    if (ctx.recentEmojis.includes(emoji)) {
      // Simply drop the emoji rather than blindly substitute
      varied = varied.replace(emoji, '')
    }
  }

  return varied.trim()
}

export function trackInVariationContext(
  ctx: VariationContext,
  response: string,
): VariationContext {
  const next = structuredClone(ctx)
  next.recentPhrases.push(response)
  if (next.recentPhrases.length > 20) next.recentPhrases.shift()

  const opening = extractOpening(response)
  if (opening) {
    next.recentOpenings.push(opening)
    if (next.recentOpenings.length > 10) next.recentOpenings.shift()
  }

  const emojis = response.match(/[\u{1F300}-\u{1FAFF}]/gu) ?? []
  for (const e of emojis) {
    next.recentEmojis.push(e)
    if (next.recentEmojis.length > 10) next.recentEmojis.shift()
  }

  return next
}
