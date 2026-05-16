# `/v1/safety` — Bobby SafeGuard

5-level child-content classifier. Used:
- Standalone for SDKs, browser extensions, third-party tools.
- Internally by `bobby-brain` (input + output double-pass) when `SAFETY_DOUBLE_PASS=true`.

## Request

```
POST /functions/v1/safety
Authorization: Bearer <SUPABASE_ANON_KEY>
Content-Type: application/json

{
  "text": "j'ai peur du noir",
  "lang": "fr",
  "direction": "input"
}
```

## Response

```json
{
  "level": 1,
  "reason": "Peur classique de l'enfance — sain à exprimer",
  "suggested_response": null,
  "latency_ms": 180
}
```

| Level | Action |
|-------|--------|
| 0     | OK     |
| 1     | Pass + log |
| 2     | Pass + monitor (parent digest) |
| 3     | Block + `suggested_response` + parent notif |
| 4     | Block + immediate parent push + internal ticket |

## Env vars

| Var | Required | Default | Notes |
|-----|----------|---------|-------|
| `ANTHROPIC_API_KEY` | yes | — | Claude Haiku 4.5 |
| `SAFETY_DOUBLE_PASS` | no | `false` | Set on **bobby-brain** to enable double-pass |

## Fail modes

- Missing ANTHROPIC_API_KEY → level 0 (fail-open).
- Claude HTTP error on **input** → level 0 (fail-open).
- Claude HTTP error on **output** → level 3 (fail-closed, block).
- Timeout 2s from `safety-client.ts` → same fail policy.

## Activation

```bash
# Deploy
supabase functions deploy safety --project-ref zvvyuxgqbuooifowjcqc

# Set secret
supabase secrets set ANTHROPIC_API_KEY=sk-ant-... --project-ref zvvyuxgqbuooifowjcqc

# Smoke test
curl -X POST https://zvvyuxgqbuooifowjcqc.supabase.co/functions/v1/safety \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text":"bonjour","lang":"fr"}'

# Enable double-pass in bobby-brain
supabase secrets set SAFETY_DOUBLE_PASS=true --project-ref zvvyuxgqbuooifowjcqc
```

## Tests

```bash
SUPABASE_URL=https://zvvyuxgqbuooifowjcqc.supabase.co \
SUPABASE_ANON_KEY=eyJ... \
deno test --allow-env --allow-net supabase/functions/safety/tests/
```
