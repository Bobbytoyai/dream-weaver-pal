# Pousser le monorepo sur GitHub — procédure

> **Important** : nous **ne touchons pas** à la branche `main` du repo `dream-weaver-pal` pendant cette étape. La prod reste inchangée. On pousse sur une branche dédiée → review → PR → merge progressif.

## Option A — Branche `monorepo-v1` sur le repo existant (recommandé)

Conserve l'historique. Permet une PR géante en review, puis on rebase progressivement.

```bash
# 1. Dans le folder du monorepo scaffold
cd ~/Bobby/bobby-monorepo  # ou là où tu l'as ouvert depuis Claude
chmod +x tools/scripts/git-init-and-push.sh

# 2. Init repo + premier commit (mais avant remote)
./tools/scripts/git-init-and-push.sh

# 3. Cloner l'historique du repo existant dans un sous-dossier temporaire
git clone git@github.com:Bobbytoyai/dream-weaver-pal.git /tmp/dwp
cd /tmp/dwp
git remote add monorepo file:///path/to/bobby-monorepo
git fetch monorepo
git checkout -b monorepo-v1 monorepo/monorepo-v1

# 4. Push sur le repo original
git push -u origin monorepo-v1

# 5. Ouvrir une PR sur GitHub :
#    base: main  ←  compare: monorepo-v1
#    Titre : "chore(repo): reorganize into studio-grade monorepo"
#    Description : copier README.md + ARCHITECTURE.md résumés
```

## Option B — Nouveau repo `bobby` (alternative)

Si tu veux un repo neuf sans hériter de `dream-weaver-pal` :

1. Crée `Bobbytoyai/bobby` sur GitHub (privé), aucun fichier initial.
2. Depuis le monorepo local :
   ```bash
   ./tools/scripts/git-init-and-push.sh git@github.com:Bobbytoyai/bobby.git main
   git push -u origin main
   ```
3. Garde `dream-weaver-pal` en lecture seule jusqu'à ce que `bobby` soit le système actif.

Inconvénient : tu perds l'historique des 3000+ commits Lovable.

## Recommandation

**Option A**. L'historique compte. Le `merge --allow-unrelated-histories` est ton ami pour la PR finale qui mélangera la branche `monorepo-v1` et la branche `main` actuelle.

## Authentification

Tu auras besoin d'au moins un de :

- **SSH key** : `cat ~/.ssh/id_ed25519.pub | pbcopy` → coller dans GitHub Settings → SSH keys.
- **Personal Access Token (classic)** : Settings → Developer settings → PAT → scopes `repo`, `workflow`. Stocker via `git credential-osxkeychain`.
- **`gh` CLI** : `brew install gh && gh auth login` (plus simple).

Vérification :

```bash
ssh -T git@github.com    # doit dire "Hi <username>!"
# ou
gh auth status
```

## Secrets GitHub Actions à configurer (avant le premier deploy)

Settings → Secrets and variables → Actions → New repository secret :

| Secret | Source |
|--------|--------|
| `SUPABASE_PROJECT_REF` | `zvvyuxgqbuooifowjcqc` |
| `SUPABASE_ACCESS_TOKEN` | dashboard.supabase.com → Account → Access tokens |
| `SUPABASE_DB_PASSWORD` | dashboard.supabase.com → Project → Settings → Database |
| `SUPABASE_ANON_KEY` | Project → Settings → API |
| `VITE_SUPABASE_URL` | `https://zvvyuxgqbuooifowjcqc.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | idem que `SUPABASE_ANON_KEY` |
| `VERCEL_TOKEN` (optionnel) | vercel.com → Settings → Tokens |
| `ANTHROPIC_API_KEY` | console.anthropic.com |

⚠️ **Aucune de ces clés n'est dans le repo** — elles vivent uniquement dans GitHub Actions secrets et Supabase Vault.

## Après le push

1. Vérifie que les workflows CI tournent (Actions tab) — premier passage va probablement échouer sur lint car `bun install` n'a jamais tourné. C'est ok.
2. Pull-request, review, merge.
3. Tag de release : `git tag monorepo-v1.0.0 && git push --tags`.
4. Lance le rollout V8 en suivant le plan dans `docs/architecture/v8-gap-analysis.md` (Phase 1 → 4).

## Rollback strategy

Si quelque chose tourne mal après merge :

```bash
git revert -m 1 <merge-commit-sha>
git push origin main
```

La PR de migration doit être un **squash merge** OU un merge commit propre, pour pouvoir rollback en 1 commande.

## Checklist finale

- [ ] `./tools/scripts/setup.sh` tourne sans erreur sur une machine clean
- [ ] `bun run lint && bun run typecheck && bun test` passe (sera vérifié par CI)
- [ ] Workflows GitHub Actions tous activés (Settings → Actions → "Allow all actions")
- [ ] Secrets configurés (voir tableau ci-dessus)
- [ ] Branch protection sur `main` (au moins 1 reviewer + CI green required)
- [ ] PR de migration créée, description complète, reviewers assignés
- [ ] Communication équipe : "PR monorepo en review, à merger quand validé"
