# Migration depuis dream-weaver-pal (Lovable) vers le monorepo

Doc opérationnelle pour faire le basculement du repo `Bobbytoyai/dream-weaver-pal` existant vers ce monorepo studio-grade.

## Inventaire de l'existant (à confirmer)

Le repo `dream-weaver-pal` contient (selon retours conversation user) :

- **60 migrations Supabase** (déjà déployées en prod EU)
- **6 Edge Functions** : `bobby-brain`, `elevenlabs-tts`, `session-analysis`, `learn-from-conversations`, `generate-content`, `admin-store`
- **18 pages React** : `Bobby Live`, `BobbyParent`, `BobbyQR`, `StorePage`, `Admin`, etc.
- Stack : Vite + React 18 + TS + Tailwind + shadcn/ui + R3F + Drei + onnxruntime-web + Bun + Supabase JS + TanStack Query

## Stratégie

**On ne refait rien. On rentre tout dans le monorepo et on standardise au-dessus.**

### Étape 1 — clone + reorganize (1 PR)

```bash
# Dans le repo Lovable
git mv src apps/web/src
git mv public apps/web/public
git mv vite.config.ts apps/web/vite.config.ts
git mv tailwind.config.ts apps/web/tailwind.config.ts
git mv index.html apps/web/index.html
git mv package.json apps/web/package.json
# Tous les autres fichiers spécifiques à l'app web

# Cloud
git mv supabase services/cloud/supabase

# Firmware (copie depuis le travail local)
cp -R ~/Bobby/bobby-watcher-firmware/firmware firmware/watcher

# Monorepo files (ce repo)
# Copier README, ARCHITECTURE, CONTRIBUTING, SECURITY, biome, lefthook, etc.
```

PR : `chore(repo): reorganize into monorepo structure`.

⚠️ **Test obligatoire** : `cd apps/web && bun install && bun run dev` doit fonctionner identiquement à avant.

### Étape 2 — packages partagés (1 PR)

- Ajouter `packages/brand/`, `packages/shared-types/`, `packages/sdk-js/`, `packages/brain-v8/`.
- Migrer les types DB déjà générés dans `apps/web/src/types/database.ts` vers `packages/shared-types/src/database.ts`.
- Faire pointer `apps/web` vers `@bobby/shared-types`.

PR : `feat(repo): add shared packages + reference them from apps/web`.

### Étape 3 — Brain V8 intégration (3-5 PRs)

Avant de toucher au `bobby-brain` Edge Function existant, on aligne :

1. **Audit** : lire `services/cloud/supabase/functions/bobby-brain/index.ts` (déjà copié depuis Lovable) et le comparer au spec V8 (`docs/brain/V8.md`).
2. **Mapping** : identifier les modules V8 déjà implémentés (probablement Theory of Mind + Goal Engine partiellement) et ceux manquants.
3. **Pull du commun** : ce qui peut tourner offline (anti-repetition, silence engine, relationship state) doit migrer vers `packages/brain-v8/` et être importé côté Edge Function.
4. **Tests** : eval set Bobby (100 conversations annotées) qui tourne avant chaque PR brain.

### Étape 4 — CI/CD (1 PR)

- Activer les workflows `.github/workflows/*.yml`.
- Configurer les secrets GitHub Actions (SUPABASE_*, VERCEL_TOKEN, ANTHROPIC_*).
- Vérifier que les premiers builds passent (ils vont probablement échouer sur lint/typecheck — c'est ok, on fixe au fil de l'eau).

### Étape 5 — Garde-fous (1 PR)

- Branch protection sur `main` (au moins 2 reviewers).
- Required status checks : ci/lint, ci/typecheck, ci/test, ci/build.
- Secret scanning + Dependabot activé.

## Outils

- `tools/scripts/setup.sh` — install initial du repo.
- `tools/scripts/sync-from-lovable.sh` — réimporte les changements quand Lovable est utilisé pour éditer l'app (jusqu'à ce qu'on se passe de Lovable).

## Validation finale

Au moment où le monorepo remplace l'ancien repo :

- [ ] App web fonctionne en local (`bun run dev`)
- [ ] Tous les workflows CI passent vert sur `main`
- [ ] Une PR de smoke "modif insignifiante" review → merge → deploy → vérifié en prod
- [ ] Tag `monorepo-v1.0.0` posé
- [ ] L'ancien repo passe en archive avec un README qui pointe vers le nouveau

## Ce qu'on ne fait PAS

- ❌ Réécriture from scratch (perte de 3-4 mois)
- ❌ Migration big bang (risque trop élevé) — on découpe en 5-7 PRs
- ❌ Rupture de service prod (le repo Lovable reste source de vérité jusqu'à la dernière PR)
