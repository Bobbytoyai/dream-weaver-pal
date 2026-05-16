// GET /functions/v1/_health
//
// Returns a snapshot of cloud health:
//   - timestamp + uptime
//   - which env vars are configured (booleans, no values)
//   - DB connectivity (round-trip to a tiny query)
//   - SafeGuard reachability
//   - bobby-brain reachability (ping with a noop payload)
//
// Used by the /debug page in the app, and by curl from ops.

import { serve } from 'https://deno.land/std@0.220.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

interface ProbeResult {
  ok: boolean
  latency_ms: number
  detail?: string
}

async function timed<T>(fn: () => Promise<T>): Promise<{ result: T | null; ms: number; err?: string }> {
  const t0 = Date.now()
  try {
    const result = await fn()
    return { result, ms: Date.now() - t0 }
  } catch (e) {
    return { result: null, ms: Date.now() - t0, err: String(e) }
  }
}

async function probeDB(): Promise<ProbeResult> {
  if (!SUPABASE_URL || !SERVICE_ROLE) return { ok: false, latency_ms: 0, detail: 'env_missing' }
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE)
  const { ms, err } = await timed(async () => {
    const { error } = await sb.from('knowledge_base').select('id', { head: true, count: 'exact' }).limit(1)
    if (error) throw error
  })
  return { ok: !err, latency_ms: ms, detail: err }
}

async function probeFunction(name: string, payload: unknown, method: 'POST' | 'GET' = 'POST'): Promise<ProbeResult> {
  if (!SUPABASE_URL) return { ok: false, latency_ms: 0, detail: 'no_supabase_url' }
  const url = `${SUPABASE_URL}/functions/v1/${name}`
  const { result, ms, err } = await timed(async () => {
    const r = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SERVICE_ROLE ?? ''}`,
      },
      body: method === 'POST' ? JSON.stringify(payload) : undefined,
      signal: AbortSignal.timeout(3000),
    })
    return r.status
  })
  // Both 200 (success) and 4xx (handled error) count as "function reachable"
  // 5xx and network errors are failures.
  const ok = !err && result !== null && result < 500
  return { ok, latency_ms: ms, detail: err ?? `http_${result}` }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const t0 = Date.now()

  const env_present = {
    SUPABASE_URL: Boolean(SUPABASE_URL),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(SERVICE_ROLE),
    SUPABASE_ANON_KEY: Boolean(Deno.env.get('SUPABASE_ANON_KEY')),
    ANTHROPIC_API_KEY: Boolean(Deno.env.get('ANTHROPIC_API_KEY')),
    OPENAI_API_KEY: Boolean(Deno.env.get('OPENAI_API_KEY')),
    ELEVENLABS_API_KEY: Boolean(Deno.env.get('ELEVENLABS_API_KEY')),
    LOVABLE_API_KEY: Boolean(Deno.env.get('LOVABLE_API_KEY')),
    V8_ROLLOUT_PERCENT: Deno.env.get('V8_ROLLOUT_PERCENT') ?? '0',
    SAFETY_DOUBLE_PASS: Deno.env.get('SAFETY_DOUBLE_PASS') ?? 'false',
  }

  const [db, safety, bobbyBrain] = await Promise.all([
    probeDB(),
    probeFunction('safety', { text: '', lang: 'fr' }),
    probeFunction('bobby-brain', { messages: [{ role: 'user', content: 'ping' }], childAge: 7 }),
  ])

  const checks = {
    db,
    safety,
    bobby_brain: bobbyBrain,
  }

  const all_ok = Object.values(checks).every((c) => c.ok)

  return Response.json(
    {
      status: all_ok ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      total_ms: Date.now() - t0,
      env_present,
      checks,
      brain_v8: { spec_url: 'docs/brain/V8.md', version: '8.0.0' },
    },
    {
      status: all_ok ? 200 : 503,
      headers: corsHeaders,
    },
  )
})
