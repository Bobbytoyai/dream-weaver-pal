# services/cloud — Supabase Backend

Backend Bobby. Supabase EU Frankfurt (`zvvyuxgqbuooifowjcqc`). Postgres + RLS + Realtime + Edge Functions Deno + Storage.

## Structure

```
services/cloud/
├── supabase/
│   ├── config.toml            # config locale Supabase
│   ├── functions/             # Edge Functions Deno
│   │   ├── voice/             # pipeline conversation (Whisper → Brain → TTS)
│   │   ├── safety/            # SafeGuard standalone /v1/safety
│   │   ├── bobby-brain/       # endpoint texte → réponse V8
│   │   ├── elevenlabs-tts/    # TTS proxy avec cache
│   │   ├── session-analysis/  # insights post-conversation
│   │   ├── learn-from-conversations/  # extraction → ChildWorldModel
│   │   ├── generate-content/  # contenus personnalisés
│   │   └── admin-store/       # admin du store de packs
│   └── migrations/            # SQL migrations versionnées
├── seed/                      # données seed (packs, demo)
└── tests/                     # tests integration Deno test
```

## Schema résumé

| Table | Rôle |
|-------|------|
| `profiles` | Compte parent (lié à auth.users) |
| `children` | Enfants gérés par un parent |
| `devices` | Watchers appairés à un enfant |
| `sessions` | Une session de conversation |
| `events` | Événements ponctuels (alertes SafeGuard, milestones) |
| `limits` | Limites parentales par enfant |
| `content_packs` | Catalogue du Bobby Store |
| `pack_unlocks` | Packs débloqués par enfant |
| `child_world_models` | État ToM persistant par enfant (V8) |
| `learning_facts` | Faits appris (Safe Learning V3) |
| `relationship_states` | État relationnel par enfant (V8) |
| `telemetry_events` | Latence + safety level + emotion (anonymisé) |

## RLS

Toutes les tables ont RLS activé. Pattern : `parent_id = auth.uid()` cascade vers les enfants.
Les Edge Functions utilisent `service_role` pour bypass.

## Quick start

```bash
cd services/cloud

# Démarrer local
supabase start
supabase db reset    # rejoue migrations + seed

# Servir une function localement
supabase functions serve voice --env-file ../.env.local

# Déployer prod (via CI normalement)
supabase functions deploy voice --project-ref zvvyuxgqbuooifowjcqc
supabase db push
```

## Tests

```bash
# Tests Deno
deno test --allow-env --allow-net --allow-read functions/
```

## Sécurité

Voir [`../../SECURITY.md`](../../SECURITY.md).
- Toutes les fonctions qui touchent au contenu enfant passent par `safety` (input + output).
- Aucune fonction n'exfiltre de PII vers un service hors EU.
- Les clés API LLM sont stockées dans Supabase Vault, lues via `Deno.env.get(...)`.
