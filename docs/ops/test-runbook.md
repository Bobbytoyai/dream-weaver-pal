# Test Runbook — Bobby ready-to-test

> Comment passer de "rien déployé" à "produit testable par un parent réel" en 15 minutes.

## Pré-requis

- Repo cloné, branche `main` à jour avec PRs 1-4 mergées.
- Supabase CLI installée : `brew install supabase/tap/supabase`
- Compte Supabase avec accès au project `zvvyuxgqbuooifowjcqc`
- 1 PAT Supabase : https://supabase.com/dashboard/account/tokens
- Le `.env` racine contient `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`

## 1. Merger les 4 PRs

Dans cet ordre (depuis l'UI GitHub, bouton "Squash and merge") :

1. PR #1 — structure monorepo
2. PR #4 — diag /debug + _health
3. PR #3 — SafeGuard /safety
4. PR #2 — V8 wired

Après chaque merge, GitHub te proposera "Update branch" sur les PRs restantes — accepte.

```bash
git checkout main && git pull origin main
```

## 2. Déploiement cloud

Une seule commande :

```bash
export SUPABASE_ACCESS_TOKEN=sbp_...            # ton PAT Supabase
export SUPABASE_ANON_KEY=eyJhbG...               # depuis .env

./tools/scripts/deploy-cloud.sh --with-secrets
```

Ce script :
- Applique toutes les migrations DB en attente
- Déploie les 9 Edge Functions (`bobby-brain`, `safety`, `_health`, `admin-store`, `elevenlabs-tts`, `generate-content`, `learn-from-conversations`, `session-analysis`)
- Set les feature-flags à `off` par défaut (V8 et Safety, à activer plus tard)
- Pingue `/_health` à la fin

## 3. Configurer le secret Anthropic

Pour que `/safety` fonctionne, il faut une clé API Anthropic :

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-... --project-ref zvvyuxgqbuooifowjcqc
```

(récupère une clé sur https://console.anthropic.com)

## 4. Smoke test cloud

```bash
./tools/scripts/smoke-test.sh
```

Doit afficher 6/6 ✓. Si une fonction échoue :
- Va sur `/debug` dans l'app (ou directement `https://bobby-toy.shop/debug`)
- Regarde quelle case rouge → tu sais ce qui manque

## 5. Démarrage app web local

```bash
bun install
bun run dev
# → http://localhost:8080
```

Tester :
- `/` — Landing (sans login)
- `/app` — Bobby Live (besoin de login)
- `/debug` — Dashboard diag (doit tout afficher vert)
- `/bobby-cloud` — signup parent

## 6. Tester un cycle complet

### 6.1 Créer un compte parent

1. Va sur `/bobby-cloud`
2. Magic link → email
3. Clique le lien → arrive sur `/parent/{code}` ou `/admin`

### 6.2 Onboarder un enfant

Sur `/parent-test` (ou la page d'onboarding active), créer :
- Prénom : "Test"
- Âge : 7
- Avatar : peu importe

### 6.3 Tester une conversation

1. Va sur `/app`
2. Tape ou parle : "salut Bobby !"
3. Réponse attendue en moins de 2 secondes
4. Si silence : check `/debug` pour voir si `LOVABLE_API_KEY` est `✓`

### 6.4 Tester SafeGuard (en mode shadow)

Encore désactivé (`SAFETY_DOUBLE_PASS=false`). Pour tester l'endpoint en standalone :

```bash
curl -X POST "https://zvvyuxgqbuooifowjcqc.supabase.co/functions/v1/safety" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text":"j ai peur du noir","lang":"fr"}'
# → expected: level >= 1
```

### 6.5 Activer V8 progressivement

Quand la prod tourne normalement :

```bash
# Active V8 pour 10% du traffic
supabase secrets set V8_ROLLOUT_PERCENT=10 --project-ref zvvyuxgqbuooifowjcqc

# (24h plus tard, si OK) passe à 50%
supabase secrets set V8_ROLLOUT_PERCENT=50 --project-ref zvvyuxgqbuooifowjcqc

# Plus tard, double-pass SafeGuard
supabase secrets set SAFETY_DOUBLE_PASS=true --project-ref zvvyuxgqbuooifowjcqc
```

Le débit V8 est stable par `userId` (hash FNV) — un utilisateur dans le bucket 10% restera dans le bucket 10% à chaque session.

## 7. Tester depuis le Watcher firmware

(Plus tard, une fois le firmware Wi-Fi/audio prêt — voir `firmware/watcher/INTEGRATION.md`.)

## Rollback

| Problème | Commande |
|----------|----------|
| V8 fait des conneries | `supabase secrets set V8_ROLLOUT_PERCENT=0 --project-ref ...` |
| SafeGuard bloque trop | `supabase secrets set SAFETY_DOUBLE_PASS=false --project-ref ...` |
| Function cassée | Re-deploy l'ancienne via `git checkout <SHA> -- supabase/functions/<name>/ && supabase functions deploy <name>` |
| DB migration foireuse | `supabase db reset --linked` (⚠️ destructive en local seulement) |

## Vérification finale "ready to test"

- [ ] `/debug` montre tout vert
- [ ] `smoke-test.sh` passe 6/6
- [ ] Conversation `/app` répond en < 3s sur "salut"
- [ ] Une session est créée dans la table `child_sessions`
- [ ] Aucune erreur dans Supabase Logs (Functions tab)
- [ ] Dashboard parent affiche au moins l'enfant créé

Si tout est ✓ → **prêt à donner à un parent testeur en bêta fermée.**
