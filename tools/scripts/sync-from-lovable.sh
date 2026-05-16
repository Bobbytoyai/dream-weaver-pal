#!/usr/bin/env bash
# Bobby — réimporte l'app web depuis le repo Lovable (~/Bobby/dream-weaver-pal)
# Usage : ./tools/scripts/sync-from-lovable.sh [--dry-run]
#
# Comportement :
#   - rsync src/, public/, vite.config.ts, tailwind.config.ts, etc. vers apps/web/
#   - supabase/migrations/* → services/cloud/supabase/migrations/ (sans écraser plus récent)
#   - supabase/functions/*  → services/cloud/supabase/functions/

set -euo pipefail

LOVABLE_DIR="${LOVABLE_DIR:-$HOME/Bobby/dream-weaver-pal}"
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DRY=""
[ "${1:-}" = "--dry-run" ] && DRY="--dry-run"

if [ ! -d "$LOVABLE_DIR" ]; then
  echo "❌ Lovable repo not found: $LOVABLE_DIR"
  echo "   Set LOVABLE_DIR=/path/to/dream-weaver-pal and retry."
  exit 1
fi

echo "→ Sync apps/web depuis $LOVABLE_DIR"

# Web app
rsync -av $DRY --delete-after \
  --exclude='node_modules/' \
  --exclude='dist/' \
  --exclude='.next/' \
  --exclude='.git/' \
  --exclude='supabase/' \
  --exclude='.env*' \
  "$LOVABLE_DIR/" "$REPO_ROOT/apps/web/"

# Cloud migrations (additive only — don't blow away local migrations)
echo "→ Sync migrations Supabase (no delete)"
rsync -av $DRY \
  --include='*.sql' --exclude='*' \
  "$LOVABLE_DIR/supabase/migrations/" \
  "$REPO_ROOT/services/cloud/supabase/migrations/"

# Cloud functions (full sync)
if [ -d "$LOVABLE_DIR/supabase/functions" ]; then
  echo "→ Sync Edge Functions"
  rsync -av $DRY \
    "$LOVABLE_DIR/supabase/functions/" \
    "$REPO_ROOT/services/cloud/supabase/functions/"
fi

echo "✅ Done. Vérifie le diff : git status && git diff --stat"
