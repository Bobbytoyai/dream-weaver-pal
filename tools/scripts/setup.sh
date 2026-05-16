#!/usr/bin/env bash
# Bobby — setup repo après clone
# Usage : ./tools/scripts/setup.sh

set -euo pipefail

cd "$(dirname "$0")/../.."

echo "→ Vérif des outils requis"
for cmd in bun git node; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "  ❌ $cmd manquant. Installe-le avant de continuer."
    exit 1
  fi
done

# Supabase CLI : non bloquant (utile uniquement pour services/cloud)
if ! command -v supabase >/dev/null 2>&1; then
  echo "  ⚠️  supabase CLI absent — installe via brew install supabase/tap/supabase si tu touches au cloud."
fi

echo "→ bun install (root + workspaces)"
bun install

echo "→ Installation des git hooks (lefthook)"
bunx lefthook install

if [ ! -f .env.local ]; then
  echo "→ Copie .env.example → .env.local"
  cp .env.example .env.local
  echo "  ⚠️  Remplis les secrets dans .env.local"
fi

echo ""
echo "✅ Setup terminé. Commandes utiles :"
echo "   bun run dev             # tous les apps"
echo "   bun run lint            # vérifier"
echo "   bun test                # tests"
echo "   bun run typecheck       # types"
echo ""
echo "Cloud (services/cloud) :"
echo "   cd services/cloud && supabase start"
echo ""
echo "Firmware (firmware/watcher) :"
echo "   ./tools/scripts/bobby.sh quick"
