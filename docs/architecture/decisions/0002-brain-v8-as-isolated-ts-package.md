# ADR-002 — Bobby Brain V8 en package TS isolé

- **Statut** : Accepté
- **Date** : 2026-05-16
- **Tags** : brain, architecture

## Contexte

Le V8 est le cœur produit. Il doit pouvoir être :
- Exécuté offline sur le device (Watcher après portage WASM ou rewrite C ultérieur).
- Exécuté server-side dans `services/cloud/functions/voice`.
- Exécuté browser-side dans `apps/web` (Bobby Live, mode démo).
- Testé en isolation avec >80 % de coverage.

Si on l'écrit dans la function `voice` ou dans `apps/web`, il devient prisonnier de son environnement.

## Décision

`packages/brain-v8/` est un package TypeScript **pur** :
- Pas d'I/O. Pas de fetch, pas de fs, pas de DB.
- Toute dépendance externe (LLM call, persistence) est **injectée** via la config du `Brain`.
- Aucune dépendance browser (`window`, `document`) ni Node-only (`fs`, `http`).
- Tests via `bun test` sans aucun mock complexe.

## Conséquences

**Positives**
- Le brain peut tourner partout (Deno Edge, browser, Bun, Node, future cible WASM).
- Tests rapides, déterministes, sans environnement de prep.
- Le contrat est explicite : si tu instancies `createBrain({ llmCall })`, c'est toi qui fournis le LLM.

**Négatives**
- Un peu plus de boilerplate au call-site (le caller doit injecter l'LLM).
- Pas de cache global possible dans le package — il faut le câbler côté caller.

## Suivi

À revoir si :
- Plus de 3 callers réimplémentent le même wrapper LLM.
- On envisage un transport WASM (le wrapper devra rester JS-only).
