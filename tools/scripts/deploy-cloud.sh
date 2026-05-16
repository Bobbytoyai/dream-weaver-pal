#!/usr/bin/env bash
# Bobby — one-shot Supabase deploy
# Deploys all Edge Functions, applies pending migrations, and (optionally)
# sets the V8/Safety feature-flag secrets.
#
# Usage:
#   SUPABASE_ACCESS_TOKEN=... ./tools/scripts/deploy-cloud.sh [--with-secrets]
#
# Pre-req: supabase CLI installed (brew install supabase/tap/supabase)

set -euo pipefail

PROJECT_REF="${SUPABASE_PROJECT_REF:-zvvyuxgqbuooifowjcqc}"
WITH_SECRETS="false"
[ "${1:-}" = "--with-secrets" ] && WITH_SECRETS="true"

# ── Pre-flight ────────────────────────────────────────────────
if ! command -v supabase >/dev/null 2>&1; then
  echo "❌ supabase CLI not found. Install with:"
  echo "   brew install supabase/tap/supabase"
  exit 1
fi

if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  echo "❌ SUPABASE_ACCESS_TOKEN env var required."
  echo "   Get one at https://supabase.com/dashboard/account/tokens"
  echo "   Then: export SUPABASE_ACCESS_TOKEN=sbp_..."
  exit 1
fi

echo "→ Linking project $PROJECT_REF"
supabase link --project-ref "$PROJECT_REF" 2>&1 | tail -3

# ── Apply DB migrations ──────────────────────────────────────
if [ -d supabase/migrations ]; then
  echo ""
  echo "→ Applying pending migrations"
  supabase db push --linked || {
    echo "⚠️  db push had errors. Continuing anyway."
  }
fi

# ── Deploy all functions ─────────────────────────────────────
echo ""
echo "→ Deploying Edge Functions"
for fn in supabase/functions/*/; do
  name=$(basename "$fn")
  [ "$name" = "_shared" ] && continue
  echo "  • $name"
  supabase functions deploy "$name" --project-ref "$PROJECT_REF" 2>&1 | tail -2 || {
    echo "    ⚠️  $name deploy failed"
  }
done

# ── Optional: set feature-flag secrets ───────────────────────
if [ "$WITH_SECRETS" = "true" ]; then
  echo ""
  echo "→ Setting feature-flag secrets (V8 off, Safety off — adjust later)"
  supabase secrets set \
    V8_ROLLOUT_PERCENT=0 \
    SAFETY_DOUBLE_PASS=false \
    --project-ref "$PROJECT_REF" 2>&1 | tail -3 || true

  echo ""
  echo "  ⚠️  Not setting ANTHROPIC_API_KEY automatically. Run manually:"
  echo "      supabase secrets set ANTHROPIC_API_KEY=sk-ant-... --project-ref $PROJECT_REF"
fi

# ── Health check ─────────────────────────────────────────────
echo ""
echo "→ Probing /_health"
HEALTH_URL="https://${PROJECT_REF}.supabase.co/functions/v1/_health"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-${VITE_SUPABASE_PUBLISHABLE_KEY:-}}"
if [ -n "$SUPABASE_ANON_KEY" ]; then
  curl -sS -m 10 -H "Authorization: Bearer $SUPABASE_ANON_KEY" "$HEALTH_URL" \
    | python3 -m json.tool 2>/dev/null || echo "(health endpoint not yet deployed?)"
else
  echo "  (set SUPABASE_ANON_KEY to enable health probe)"
fi

echo ""
echo "✅ Deploy complete. Next:"
echo "   - Visit https://bobby-toy.shop/debug"
echo "   - Run smoke tests : ./tools/scripts/smoke-test.sh"
echo "   - Enable V8 progressive : supabase secrets set V8_ROLLOUT_PERCENT=10 --project-ref $PROJECT_REF"
