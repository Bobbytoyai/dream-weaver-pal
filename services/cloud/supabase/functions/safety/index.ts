// bobby-cloud-api/supabase/functions/safety — POST /v1/safety
//
// Bobby SafeGuard — classifier 5 niveaux pour contenu enfant.
// Utilisable independent de /voice : extensions navigateur, apps tierces SDK, etc.
//
// Request : { text: string, lang?: 'fr'|'en'|'es', direction?: 'input'|'output' }
// Response : { level: 0|1|2|3|4, reason: string, suggested_response?: string, latency_ms: number }
//
// Levels :
//   0 OK         — aucun problème
//   1 FAIBLE     — sujet sensible mais OK (mort, séparation, peur du noir...)
//   2 MOYEN      — surveillance (mots grossiers légers, jalousie, frustration)
//   3 ELEVE      — bloquer/rediriger (violence légère, contenu adulte voilé)
//   4 CRITIQUE   — alerte parent immédiate (idéation suicidaire, abus, danger)

import { serve } from 'https://deno.land/std@0.220.0/http/server.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const MODEL = 'claude-haiku-4-5-20251001'

interface SafetyRequest {
  text: string
  lang?: 'fr' | 'en' | 'es' | 'de' | 'it'
  direction?: 'input' | 'output'
}

interface SafetyResponse {
  level: 0 | 1 | 2 | 3 | 4
  reason: string
  suggested_response?: string
  latency_ms: number
}

const SAFETY_PROMPT = (text: string, lang: string, direction: string) => `Tu es un classifier de sécurité pour Bobby, IA pour enfants 5-12 ans.

Classe ce texte (${direction === 'input' ? 'écrit/dit par un enfant' : 'généré par une IA destinée à un enfant'}, langue ${lang}) sur 5 niveaux :

  Level 0 OK         : sujet neutre, jouer, apprendre, raconter
  Level 1 FAIBLE     : sujet sensible mais sain (mort, séparation parents, peur du noir, deuil, maladie)
  Level 2 MOYEN      : à surveiller (mots grossiers légers, jalousie, colère, frustration intense)
  Level 3 ELEVE     : doit être bloqué/redirigé (violence légère, contenu adulte voilé, drogue mentionnée, harcèlement)
  Level 4 CRITIQUE  : alerte parent immédiate (idéation suicidaire, automutilation, abus suspecté, prédateur, fugue)

Pour les niveaux 3 et 4, propose une "suggested_response" courte et bienveillante en ${lang} pour rediriger l'enfant.

Texte : "${text}"

Réponds en JSON strict (sans markdown) :
{"level":<0-4>,"reason":"<une phrase>","suggested_response":"<si level>=3, sinon null>"}`

serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  const t0 = Date.now()

  let body: SafetyRequest
  try { body = await req.json() }
  catch { return Response.json({ error: 'invalid_json' }, { status: 400 }) }

  const { text, lang = 'fr', direction = 'input' } = body
  if (!text || typeof text !== 'string') {
    return Response.json({ error: 'missing_text' }, { status: 400 })
  }
  if (text.length > 5000) {
    return Response.json({ error: 'text_too_long' }, { status: 413 })
  }

  // ─── Quick path : empty / very short → OK ────────────────
  if (text.trim().length < 2) {
    return Response.json({ level: 0, reason: 'empty_or_short', latency_ms: Date.now() - t0 })
  }

  // ─── Claude Haiku classifier ─────────────────────────────
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 200,
      messages: [{ role: 'user', content: SAFETY_PROMPT(text, lang, direction) }],
    }),
  })

  if (!r.ok) {
    console.error('claude error', r.status, await r.text())
    // Fail-open at level 0 to not block on infra issue — but log for review
    return Response.json({
      level: 0,
      reason: 'classifier_unavailable',
      latency_ms: Date.now() - t0,
    } as SafetyResponse)
  }

  const j = await r.json()
  const content = j.content?.[0]?.text || '{}'
  let parsed: Partial<SafetyResponse> = {}
  try {
    const m = content.match(/\{[\s\S]*\}/)
    if (m) parsed = JSON.parse(m[0])
  } catch (e) {
    console.error('parse error', e, content)
  }

  return Response.json({
    level: clamp(parsed.level ?? 0, 0, 4) as 0|1|2|3|4,
    reason: parsed.reason ?? 'unknown',
    suggested_response: parsed.suggested_response,
    latency_ms: Date.now() - t0,
  } as SafetyResponse)
})

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.floor(n)))
}
