# Contributing to Bobby

> Bobby est un produit grand public pour enfants. Chaque PR peut affecter un enfant réel. On code en conséquence.

## Setup

### Prérequis

- **Bun** ≥ 1.1 — `curl -fsSL https://bun.sh/install | bash`
- **Node** ≥ 20 (fallback pour certains outils)
- **Supabase CLI** ≥ 1.180 — `brew install supabase/tap/supabase`
- **ESP-IDF** 5.2.1 (pour le firmware) — voir `firmware/watcher/README.md`
- **Git LFS** pour les assets audio/binaires

### Installation

```bash
git clone git@github.com:Bobbytoyai/dream-weaver-pal.git bobby
cd bobby
bun install
cp .env.example .env.local   # remplir les secrets
lefthook install             # hooks git
```

### Variables d'env

Voir `.env.example`. Les secrets prod ne sont JAMAIS dans le repo.

## Workflow

### Branches

- `main` — protégée. Déploiement prod.
- `develop` — intégration. Déploiement staging.
- `feat/*` — nouvelles features. PR vers `develop`.
- `fix/*` — bugfixes. PR vers `develop` (ou `main` si critique).
- `hotfix/*` — urgences prod. PR vers `main` + `develop`.

### Commits

Convention **Conventional Commits**. Validé par commitlint.

```
feat(brain): add theory-of-mind module
fix(firmware): wheel debounce was double-firing
docs(adr): document SafeGuard double-pass
refactor(cloud): extract voice pipeline into orchestrator
chore(deps): bump supabase-js to 2.45
```

Scopes valides : `brain`, `firmware`, `web`, `parent-pwa`, `cloud`, `brand`, `sdk`, `docs`, `ci`, `deps`.

### Pull Requests

1. Tous les checks CI doivent passer (lint, typecheck, tests, build).
2. Au moins 1 reviewer requis (2 pour `main`).
3. Pas de PR > 500 lignes (split-le).
4. Description = quoi + pourquoi + impact enfant (si applicable).
5. Lien vers issue / ADR si pertinent.

Template : `.github/PULL_REQUEST_TEMPLATE.md`.

## Standards de code

### Linter & formatter

**Biome** pour TS/JS/JSON. Une seule source de vérité.

```bash
bun run lint        # check
bun run lint:fix    # auto-fix
bun run format      # format
```

### TypeScript

- `strict: true` partout, pas de `any` sans `// biome-ignore lint/suspicious/noExplicitAny: <reason>`
- Tous les types DB générés depuis Supabase : `bun run gen:types`
- Validation runtime avec **zod** au bord (API, formulaires, env)

### Tests

| Type | Outil | Cible |
|------|-------|-------|
| Unit (TS) | `bun test` | brain-v8, sdk-js, shared-types |
| Integration (Edge) | Deno test | `services/cloud/functions/*` |
| Component (React) | Vitest + Testing Library | `apps/*` |
| E2E (web) | Playwright | smoke tests sur staging |
| Hardware | manuel + checklist | `firmware/watcher/QA.md` |

Coverage cible : 80% sur `packages/brain-v8/` (cœur). 60% ailleurs.

### Brain V8

Toute modif de V8 :
1. Passe par une ADR si c'est structurel.
2. Test unitaire OBLIGATOIRE (snapshots de comportement).
3. Métrique de latence vérifiée (`packages/brain-v8/src/performance-monitor.ts`).
4. Review par 2 personnes minimum.

### Sécurité enfant

Toute modif qui touche au contenu enfant :
1. Vérifier que SafeGuard input + output sont bien appelés.
2. Ajouter un test avec un input toxique (vérifier qu'il est bloqué).
3. Si nouveau type de réponse Bobby, ajouter un eval set dédié.

## Scripts utiles

```bash
bun run dev              # tous les apps en parallèle
bun run build            # build tout
bun run typecheck        # typecheck tout
bun run test             # tests unit
bun run gen:types        # regen types Supabase

# Cloud
cd services/cloud
supabase db reset        # reset local + replay migrations + seed
supabase functions serve voice
supabase functions deploy voice --project-ref zvvyuxgqbuooifowjcqc

# Firmware
cd firmware/watcher
./tools/scripts/bobby.sh quick    # build + flash + monitor
./tools/scripts/bobby.sh menuconfig
```

## Releases

- **Apps web** — déploiement continu sur push `main` (Vercel/Cloudflare Pages)
- **Cloud functions** — workflow `deploy-cloud.yml` sur push `main`
- **Firmware** — release manuelle via tag `firmware-vX.Y.Z`, artifact `.bin` attaché à la GitHub Release

## Code de conduite

Voir [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md). Zéro tolérance pour comportement abusif. On code pour des enfants — on se traite avec le même respect.
