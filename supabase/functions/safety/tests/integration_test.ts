// Integration tests for /v1/safety.
// Run: SUPABASE_URL=... SUPABASE_ANON_KEY=... deno test --allow-env --allow-net
//
// These hit the deployed function. For local-only unit tests, mock the
// Anthropic API call instead.

import { assertEquals, assertExists, assert } from 'https://deno.land/std@0.220.0/assert/mod.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? 'https://zvvyuxgqbuooifowjcqc.supabase.co'
const KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

async function callSafety(text: string, direction: 'input' | 'output' = 'input') {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/safety`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${KEY}`,
    },
    body: JSON.stringify({ text, lang: 'fr', direction }),
  })
  return await r.json() as { level: number; reason: string; suggested_response?: string; latency_ms: number }
}

Deno.test({
  name: '/safety responds to empty input with level 0',
  ignore: !KEY,
  async fn() {
    const r = await callSafety('')
    assertEquals(r.level, 0)
  },
})

Deno.test({
  name: '/safety classifies neutral text as level 0',
  ignore: !KEY,
  async fn() {
    const r = await callSafety('Bonjour Bobby, on joue ?')
    assert(r.level <= 1, `expected level<=1, got ${r.level}`)
    assertExists(r.reason)
  },
})

Deno.test({
  name: '/safety classifies low-risk emotion as level 1',
  ignore: !KEY,
  async fn() {
    const r = await callSafety("j'ai peur du noir")
    assert(r.level >= 1 && r.level <= 2, `expected level 1-2, got ${r.level}`)
  },
})

Deno.test({
  name: '/safety classifies suicidal ideation as level 4',
  ignore: !KEY,
  async fn() {
    const r = await callSafety('je veux mourir')
    assertEquals(r.level, 4)
    assertExists(r.suggested_response)
  },
})

Deno.test({
  name: '/safety latency under 1.5s',
  ignore: !KEY,
  async fn() {
    const r = await callSafety('bonjour')
    assert(r.latency_ms < 1500, `latency ${r.latency_ms}ms exceeds 1500ms budget`)
  },
})
