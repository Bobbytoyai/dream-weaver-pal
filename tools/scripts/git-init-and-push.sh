#!/usr/bin/env bash
# Bobby — init du repo + premier push GitHub
#
# Comportement par défaut : crée une branche `monorepo` séparée de `main`,
# sans toucher à la prod. Idéal pour ouvrir une PR de migration en review.
#
# Usage :
#   ./tools/scripts/git-init-and-push.sh [REMOTE_URL] [BRANCH]
#
# Exemples :
#   ./tools/scripts/git-init-and-push.sh git@github.com:Bobbytoyai/dream-weaver-pal.git
#   ./tools/scripts/git-init-and-push.sh git@github.com:Bobbytoyai/bobby.git main

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

REMOTE="${1:-}"
BRANCH="${2:-monorepo-v1}"

if ! command -v git >/dev/null 2>&1; then
  echo "❌ git is not installed."
  exit 1
fi

# ── Init repo if needed ──────────────────────────────────
if [ ! -d .git ]; then
  echo "→ git init"
  git init --initial-branch=main
fi

# ── Identity check (warn only) ───────────────────────────
if ! git config user.email >/dev/null; then
  echo "⚠️  git config user.email not set globally. Set it before commit:"
  echo "    git config --global user.email 'you@example.com'"
  echo "    git config --global user.name  'Your Name'"
fi

# ── Stage everything ─────────────────────────────────────
echo "→ Adding files"
git add -A

# ── First commit if no commit yet ────────────────────────
if ! git rev-parse --verify HEAD >/dev/null 2>&1; then
  echo "→ First commit"
  git commit -m "chore(repo): initial monorepo scaffold

- Studio-grade structure: apps/, services/, firmware/, packages/, docs/, tools/
- packages/brain-v8/ — Bobby Brain V8 skeleton (13 modules + tests)
- 5 ADRs (Supabase, brain isolé, SafeGuard double-pass, Lovable, Watcher MVP)
- CI/CD workflows (ci, deploy-cloud, deploy-web, build-firmware, codeql)
- Biome + Lefthook + commitlint
- Documentation: ARCHITECTURE, CONTRIBUTING, SECURITY, V8 spec, gap analysis
- Firmware components: bobby_wifi + bobby_api (Track A.2)"
else
  echo "→ Repo already has commits, will create a new commit if there are changes"
  if ! git diff --cached --quiet; then
    git commit -m "chore(repo): monorepo scaffold update"
  fi
fi

# ── Branch ───────────────────────────────────────────────
current_branch="$(git symbolic-ref --short HEAD)"
if [ "$current_branch" != "$BRANCH" ]; then
  echo "→ Switching to branch '$BRANCH'"
  git checkout -B "$BRANCH"
fi

# ── Remote ───────────────────────────────────────────────
if [ -n "$REMOTE" ]; then
  if git remote | grep -q '^origin$'; then
    echo "→ Updating origin → $REMOTE"
    git remote set-url origin "$REMOTE"
  else
    echo "→ Adding origin = $REMOTE"
    git remote add origin "$REMOTE"
  fi
fi

# ── Pre-flight summary ───────────────────────────────────
echo ""
echo "─── PRE-FLIGHT ─────────────────────────────────────"
echo "Branch : $(git symbolic-ref --short HEAD)"
echo "Remote : $(git remote get-url origin 2>/dev/null || echo '(not set)')"
echo "Commit : $(git rev-parse --short HEAD)"
echo "Files  : $(git ls-files | wc -l | tr -d ' ')"
echo "─────────────────────────────────────────────────────"
echo ""
echo "✅ Ready to push. Next step (manuel, auth GitHub) :"
echo ""
echo "    git push -u origin $BRANCH"
echo ""
echo "Puis ouvre une PR : monorepo → main (ou vers une branche review)."
echo "Voir la procédure complète : docs/ops/github-push-procedure.md"
