// Bobby SafeGuard — POST /v1/safety
//
// 5-level child-content classifier using Claude Haiku 4.5.
// Standalone endpoint; also called by bobby-brain when SAFETY_DOUBLE_PASS=true.
//
// Request : { text: string, lang?: 'fr'|'en'|'es'|'de'|'it', direction?: 'input'|'output' }
// Response: { level: 0|1|2|3|4, reason: string, suggested_response?: string, latency_ms: number }
//
// Levels:
//   0 OK         — nothing of concern
//   1 LOW        — sensitive but safe (death, separation, fear)
//   2 MEDIUM     — needs monitoring (mild profanity, jealousy)
//   3 HIGH       — block & redirect (violence, mild adult content, drugs)
//   4 CRITICAL   — immediate parent alert (suicidal ideation, abuse, predator)

import { serve } from 'https://deno.land/std@0.220.0/http/server.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const MODEL = 'claude-haiku-4-5-20251001'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

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

const PROMPT = (text: string, lang: string, direction: string) => `Tu es un classifier de sécurité pour Bobby, IA pour enfants 3-12 ans.

Classe ce texte (${direction === 'input' ? 'dit/écrit par un enfant' : 'généré par une IA destinée à un enfant'}, langue ${lang}) sur 5 niveaux :

  Level 0 OK         : sujet neutre, jouer, apprendre, raconter
  Level 1 FAIBLE     : sujet sensible mais sain (mort, séparation parents, peur du noir, deuil, maladie)
  Level 2 MOYEN      : à surveiller (mots grossiers légers, jalousie, colère, frustration intense)
  Level 3 ELEVE      : doit être bloqué/redirigé (violence, contenu adulte voilé, drogue mentionnée, harcèlement)
  Level 4 CRITIQUE   : alerte parent immédiate (idéation suicidaire, automutilation, abus suspecté, prédateur, fugue)

Pour les niveaux 3 et 4, propose une "suggested_response" courte et bienveillante en ${lang} pour rediriger l'enfant.

Texte : "${text.replace(/"/g, '\\"').slice(0, 4000)}"

Réponds en JSON strict (sans markdown) :
{"level":<0-4>,"reason":"<phrase courte>","suggested_response":"<si level>=3, sinon null>"}`

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.floor(n)))
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  const t0 = Date.now()

  let body: SafetyRequest
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400, headers: corsHeaders })
  }

  const { text, lang = 'fr', direction = 'input' } = body
  if (!text || typeof text !== 'string') {
    return Response.json({ error: 'missing_text' }, { status: 400, headers: corsHeaders })
  }
  if (text.length > 5000) {
    return Response.json({ error: 'text_too_long' }, { status: 413, headers: corsHeaders })
  }

  // Quick path: empty / very short → OK
  if (text.trim().length < 2) {
    return Response.json(
      { level: 0, reason: 'empty_or_short', latency_ms: Date.now() - t0 },
      { headers: corsHeaders },
    )
  }

  // Claude Haiku classifier
  if (!ANTHROPIC_API_KEY) {
    console.warn('[safety] ANTHROPIC_API_KEY missing → fail-open at level 0')
    return Response.json(
      { level: 0, reason: 'classifier_unconfigured', latency_ms: Date.now() - t0 },
      { headers: corsHeaders },
    )
  }

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
      messages: [{ role: 'user', content: PROMPT(text, lang, direction) }],
    }),
  })

  if (!r.ok) {
    console.error('[safety] claude error', r.status, await r.text())
    // Fail-open at level 0 for input, fail-CLOSED for output (block by default)
    const failLevel = direction === 'output' ? 3 : 0
    return Response.json(
      {
        level: failLevel,
        reason: 'classifier_unavailable',
        suggested_response: failLevel >= 3 ? 'Hmm, on parle d autre chose ?' : undefined,
        latency_ms: Date.now() - t0,
      } as SafetyResponse,
      { headers: corsHeaders },
    )
  }

  const j = await r.json()
  const content = j.content?.[0]?.text || '{}'
  let parsed: Partial<SafetyResponse> = {}
  try {
    const m = content.match(/\{[\s\S]*\}/)
    if (m) parsed = JSON.parse(m[0])
  } catch (e) {
    console.error('[safety] parse error', e, content)
  }

  return Response.json(
    {
      level: clamp(parsed.level ?? 0, 0, 4) as 0 | 1 | 2 | 3 | 4,
      reason: parsed.reason ?? 'unknown',
      suggested_response: parsed.suggested_response,
      latency_ms: Date.now() - t0,
    } as SafetyResponse,
    { headers: corsHeaders },
  )
})
