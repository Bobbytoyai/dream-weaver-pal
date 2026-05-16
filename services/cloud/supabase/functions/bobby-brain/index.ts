// bobby-cloud — POST /v1/bobby-brain
//
// Endpoint texte → réponse Bobby V8.
// Sert apps/web pour le mode démo et les tests d'intégration.
//
// Request : { text: string, child_id: string, session_context?: {...} }
// Response: { text, emotion, plan, telemetry, safetyLevel }

import { serve } from 'https://deno.land/std@0.220.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SAFETY_URL = `${SUPABASE_URL}/functions/v1/safety`
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!

interface BrainRequest {
  text: string
  child_id: string
  session_context?: {
    turnCount?: number
    sessionMood?: 'positive' | 'neutral' | 'negative'
  }
}

async function callSafety(text: string, lang: string, direction: 'input' | 'output') {
  const r = await fetch(SAFETY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, lang, direction }),
  })
  if (!r.ok) return { level: 0, reason: 'safety_unreachable', latency_ms: 0 }
  return await r.json()
}

async function callClaude(prompt: string, maxTokens = 200): Promise<string> {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!r.ok) throw new Error(`claude ${r.status}`)
  const j = await r.json()
  return j.content?.[0]?.text ?? ''
}

serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  let body: BrainRequest
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 })
  }

  const { text, child_id } = body
  if (!text || !child_id) {
    return Response.json({ error: 'missing_fields' }, { status: 400 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const { data: child, error: childErr } = await supabase
    .from('children')
    .select('id, name, birth_year, language')
    .eq('id', child_id)
    .single()

  if (childErr || !child) {
    return Response.json({ error: 'child_not_found' }, { status: 404 })
  }

  const age = new Date().getFullYear() - child.birth_year
  const lang = child.language ?? 'fr'

  // ── SafeGuard input ─────────────────────────────────────
  const safetyIn = await callSafety(text, lang, 'input')
  if (safetyIn.level >= 3) {
    return Response.json({
      text: safetyIn.suggested_response ?? 'Hmm, on parle d autre chose ?',
      emotion: 'calm',
      safetyLevel: safetyIn.level,
      plan: null,
      telemetry: { totalMs: safetyIn.latency_ms },
    })
  }

  // ── Brain (call LLM with V8-style prompt) ──────────────
  const t0 = Date.now()
  const prompt = `Tu es Bobby, un compagnon bienveillant pour un enfant de ${age} ans qui s'appelle ${child.name}.
Réponds en ${lang === 'fr' ? 'français' : 'anglais'}.
Adapte ton vocabulaire à son âge. Reste chaleureux, curieux, sans condescendance.
Maximum 2 phrases.
${age < 6 ? "Évite les concepts abstraits. Utilise des images concrètes." : ''}

Enfant: ${text}
Bobby:`
  let bobbyText = ''
  try {
    bobbyText = (await callClaude(prompt, 150)).trim()
  } catch (e) {
    console.error('claude error', e)
    bobbyText = "Hmm, je n'ai pas tout compris. Tu peux répéter ?"
  }
  const brainMs = Date.now() - t0

  // ── SafeGuard output ───────────────────────────────────
  const safetyOut = await callSafety(bobbyText, lang, 'output')
  if (safetyOut.level >= 3) {
    bobbyText = safetyOut.suggested_response ?? 'On parle d autre chose ?'
  }

  return Response.json({
    text: bobbyText,
    emotion: 'curious',
    safetyLevel: Math.max(safetyIn.level, safetyOut.level),
    telemetry: {
      totalMs: brainMs + safetyIn.latency_ms + safetyOut.latency_ms,
      brainMs,
      safetyInMs: safetyIn.latency_ms,
      safetyOutMs: safetyOut.latency_ms,
    },
  })
})
