# Architecture Decision Records (ADRs)

Décisions architecturales structurantes de Bobby. Format Nygard léger.

## Index

| ID | Titre | Statut |
|----|-------|--------|
| [ADR-001](./0001-supabase-as-backend.md) | Supabase comme backend principal | Accepté |
| [ADR-002](./0002-brain-v8-as-isolated-ts-package.md) | Brain V8 en package TS isolé | Accepté |
| [ADR-003](./0003-safeguard-double-pass.md) | SafeGuard double-pass (input + output) | Accepté |
| [ADR-004](./0004-lovable-as-primary-web-app.md) | Lovable comme app web principale | Accepté |
| [ADR-005](./0005-watcher-w1-as-mvp-hardware.md) | Watcher W1-A comme hardware MVP | Accepté |

## Comment ajouter une ADR

1. Numéro suivant.
2. Copier un ADR existant comme template.
3. Statut initial : **Proposé**. Passe à **Accepté** après merge PR.
4. Lier l'ADR dans la PR qui implémente la décision.

## Format

```md
# ADR-XXX — Titre

- Statut : Proposé / Accepté / Déprécié / Remplacé par ADR-YYY
- Date :
- Tags :

## Contexte
## Décision
## Conséquences
## Suivi
```
