# Testing Bobby — TL;DR

> Cheat sheet pour passer en mode "prêt à tester" en 15 min.
> Procédure complète : [`docs/ops/test-runbook.md`](docs/ops/test-runbook.md).

## 1. Merger les 4 PRs ouvertes (ordre)

1. #1 — monorepo structure
2. #4 — /_health + /debug page
3. #3 — /safety SafeGuard
4. #2 — V8 wired (feature flag)

## 2. Pull main + déployer

```bash
git pull origin main

export SUPABASE_ACCESS_TOKEN=sbp_...   # https://supabase.com/dashboard/account/tokens
export SUPABASE_ANON_KEY=eyJhbG...      # from your .env

./tools/scripts/deploy-cloud.sh --with-secrets
```

## 3. Set the Anthropic key

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-... --project-ref zvvyuxgqbuooifowjcqc
```

## 4. Smoke test

```bash
./tools/scripts/smoke-test.sh
```

Doit afficher **6/6 ✓**.

## 5. Vérifier dans le navigateur

- https://bobby-toy.shop/debug → tout vert
- https://bobby-toy.shop/app → conversation Bobby qui répond

## 6. Bobby est prêt à tester !

Ouvre la page `/debug` à un testeur, il pourra te dire ce qui marche / pas marche.

## En cas de problème

| Symptôme | Cause probable | Fix |
|----------|----------------|-----|
| `/debug` rouge sur `db` | Migration pas appliquée | Re-run `./tools/scripts/deploy-cloud.sh` |
| `/debug` rouge sur `safety` | `ANTHROPIC_API_KEY` manquante | `supabase secrets set ANTHROPIC_API_KEY=...` |
| Bobby ne répond pas dans `/app` | `LOVABLE_API_KEY` manquante | Set it via `supabase secrets set LOVABLE_API_KEY=...` |
| 401 sur les Edge Functions | `SUPABASE_ANON_KEY` mauvais | Récupère depuis Project Settings → API |
