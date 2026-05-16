// Shared client to call /v1/safety from other Edge Functions (e.g. bobby-brain).
//
// Usage:
//   const r = await callSafety({ text, lang: 'fr', direction: 'input' })
//   if (r.level >= 3) { ... }
//
// Activation: SAFETY_DOUBLE_PASS=true (env var on the caller function).
// When false, callSafety returns level 0 immediately (no network round-trip).

export type SafetyDirection = 'input' | 'output'

export interface SafetyClientReply {
  level: 0 | 1 | 2 | 3 | 4
  reason: string
  suggested_response?: string
  latency_ms: number
  invoked: boolean
}

export interface CallSafetyParams {
  text: string
  lang?: 'fr' | 'en' | 'es' | 'de' | 'it'
  direction?: SafetyDirection
  timeoutMs?: number
}

const DEFAULT_TIMEOUT = 2000

function isEnabled(): boolean {
  return Deno.env.get('SAFETY_DOUBLE_PASS') === 'true'
}

export async function callSafety(params: CallSafetyParams): Promise<SafetyClientReply> {
  if (!isEnabled()) {
    return { level: 0, reason: 'safety_disabled', latency_ms: 0, invoked: false }
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  if (!supabaseUrl) {
    return { level: 0, reason: 'safety_no_supabase_url', latency_ms: 0, invoked: false }
  }

  const url = `${supabaseUrl}/functions/v1/safety`
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), params.timeoutMs ?? DEFAULT_TIMEOUT)

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // service-role key allows internal function-to-function calls
        Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''}`,
      },
      body: JSON.stringify({
        text: params.text,
        lang: params.lang ?? 'fr',
        direction: params.direction ?? 'input',
      }),
      signal: ctrl.signal,
    })
    if (!r.ok) {
      // Fail-open for input, fail-closed (block) for output
      const failClosed = params.direction === 'output'
      return {
        level: failClosed ? 3 : 0,
        reason: `safety_http_${r.status}`,
        suggested_response: failClosed ? 'Hmm, on parle d autre chose ?' : undefined,
        latency_ms: 0,
        invoked: true,
      }
    }
    const j = await r.json()
    return {
      level: (j.level ?? 0) as 0 | 1 | 2 | 3 | 4,
      reason: j.reason ?? 'unknown',
      suggested_response: j.suggested_response,
      latency_ms: j.latency_ms ?? 0,
      invoked: true,
    }
  } catch (e) {
    console.error('[safety-client] error:', e)
    const failClosed = params.direction === 'output'
    return {
      level: failClosed ? 3 : 0,
      reason: 'safety_exception',
      suggested_response: failClosed ? 'Hmm, on parle d autre chose ?' : undefined,
      latency_ms: 0,
      invoked: true,
    }
  } finally {
    clearTimeout(timer)
  }
}
