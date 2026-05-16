#!/usr/bin/env bash
# Bobby — smoke test suite for cloud Edge Functions.
#
# Tests:
#   1. /_health responds 200 with status=ok
#   2. /safety returns level 0 for neutral text
#   3. /safety returns level >= 1 for sensitive text
#   4. /safety returns level 4 for critical text
#   5. /bobby-brain returns a reply for a simple message
#   6. p95 latency under budget
#
# Usage:
#   SUPABASE_ANON_KEY=eyJ... ./tools/scripts/smoke-test.sh

set -euo pipefail

PROJECT_REF="${SUPABASE_PROJECT_REF:-zvvyuxgqbuooifowjcqc}"
BASE="https://${PROJECT_REF}.supabase.co/functions/v1"
KEY="${SUPABASE_ANON_KEY:-${VITE_SUPABASE_PUBLISHABLE_KEY:-}}"

if [ -z "$KEY" ]; then
  echo "❌ Set SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY) first."
  echo "   Find it in your .env or at https://supabase.com/dashboard/project/$PROJECT_REF/settings/api"
  exit 1
fi

PASS=0
FAIL=0

# ── Helpers ──────────────────────────────────────────────────
red()   { printf "\033[31m%s\033[0m\n" "$*"; }
green() { printf "\033[32m%s\033[0m\n" "$*"; }
gray()  { printf "\033[90m%s\033[0m\n" "$*"; }

run() {
  local name="$1"; shift
  local expected_match="$1"; shift
  printf "  %-50s " "$name"
  local t0=$(python3 -c "import time; print(int(time.time()*1000))")
  local result
  result=$(eval "$@" 2>&1) || true
  local t1=$(python3 -c "import time; print(int(time.time()*1000))")
  local ms=$((t1 - t0))

  if echo "$result" | grep -qE "$expected_match"; then
    green "✓ ${ms}ms"
    PASS=$((PASS + 1))
  else
    red "✗ ${ms}ms"
    gray "    expected: /${expected_match}/"
    gray "    got: $(echo "$result" | head -3 | tr '\n' '|')"
    FAIL=$((FAIL + 1))
  fi
}

# ── Tests ────────────────────────────────────────────────────
echo "Bobby smoke test"
echo "================"
echo "Base : $BASE"
echo ""

echo "[ 1/6 ] Health"
run "_health responds 200" '"status":"ok"' \
  "curl -sS -m 10 -H 'Authorization: Bearer $KEY' '$BASE/_health'"

echo ""
echo "[ 2/6 ] Safety — neutral text"
run "level 0 for 'bonjour'" '"level":0' \
  "curl -sS -m 10 -X POST -H 'Authorization: Bearer $KEY' -H 'Content-Type: application/json' \
    -d '{\"text\":\"bonjour\",\"lang\":\"fr\"}' '$BASE/safety'"

echo ""
echo "[ 3/6 ] Safety — sensitive text"
run "level >= 1 for 'j ai peur du noir'" '"level":[1-4]' \
  "curl -sS -m 10 -X POST -H 'Authorization: Bearer $KEY' -H 'Content-Type: application/json' \
    -d '{\"text\":\"jai peur du noir\",\"lang\":\"fr\"}' '$BASE/safety'"

echo ""
echo "[ 4/6 ] Safety — critical text"
run "level 4 for suicidal text" '"level":4' \
  "curl -sS -m 10 -X POST -H 'Authorization: Bearer $KEY' -H 'Content-Type: application/json' \
    -d '{\"text\":\"je veux mourir\",\"lang\":\"fr\"}' '$BASE/safety'"

echo ""
echo "[ 5/6 ] Bobby-Brain reply"
run "bobby-brain returns reply" '"reply"' \
  "curl -sS -m 15 -X POST -H 'Authorization: Bearer $KEY' -H 'Content-Type: application/json' \
    -d '{\"messages\":[{\"role\":\"user\",\"content\":\"salut\"}],\"childAge\":7,\"userId\":\"00000000-0000-0000-0000-000000000001\"}' '$BASE/bobby-brain'"

echo ""
echo "[ 6/6 ] Latency p50 budget (< 1000ms for /safety)"
TOTAL_MS=0
N=5
for i in $(seq 1 $N); do
  T0=$(python3 -c "import time; print(int(time.time()*1000))")
  curl -sS -m 5 -o /dev/null -X POST \
    -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
    -d '{"text":"bonjour","lang":"fr"}' "$BASE/safety" || true
  T1=$(python3 -c "import time; print(int(time.time()*1000))")
  TOTAL_MS=$((TOTAL_MS + T1 - T0))
done
AVG_MS=$((TOTAL_MS / N))
printf "  %-50s " "/safety avg latency over $N calls"
if [ $AVG_MS -lt 1000 ]; then
  green "✓ ${AVG_MS}ms"
  PASS=$((PASS + 1))
else
  red "✗ ${AVG_MS}ms (over budget 1000ms)"
  FAIL=$((FAIL + 1))
fi

# ── Summary ──────────────────────────────────────────────────
echo ""
echo "================"
echo "Pass: $PASS"
echo "Fail: $FAIL"
if [ $FAIL -eq 0 ]; then
  green "✅ All smoke tests passed."
  exit 0
else
  red "❌ $FAIL test(s) failed. Check function deploys and secrets."
  exit 1
fi
