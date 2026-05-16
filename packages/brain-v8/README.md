# @bobby/brain-v8

Bobby Brain V8 — moteur cognitif du compagnon Bobby. TypeScript pur, testable offline, sans dépendance browser/Deno/Node (ne fait pas d'I/O — c'est de la logique).

## Spec

Source de vérité : [`../../docs/brain/V8.md`](../../docs/brain/V8.md).

## Architecture

```
src/
├── orchestrator.ts          # Pipeline 6 stages
├── theory-of-mind.ts        # Modèle mental de l'enfant
├── child-world-model.ts     # Logique cognitive par âge
├── deep-goal-engine.ts      # Goal + motivation + trajectoire
├── cognition.ts             # WHY/WHAT/HOW/WHEN/WHO
├── proactive-engine.ts      # Initiatives Bobby
├── variation-engine.ts      # Anti-répétition
├── silence-engine.ts        # Intelligence du silence
├── relationship-engine.ts   # 4 phases relationnelles
├── uncertainty-engine.ts    # Gestion du doute
├── llm-augmentor.ts         # LLM comme augmenteur
├── safe-learning.ts         # Apprentissage sécurisé V3
├── performance-monitor.ts   # Budget latence
├── types.ts                 # Types partagés
└── index.ts                 # Public API
```

## Usage

```ts
import { createBrain } from '@bobby/brain-v8'

const brain = createBrain({
  childProfile: { id, name, age, language: 'fr' },
  relationshipState: previousState ?? null,
  llmCall: async (prompt) => callClaudeSonnet(prompt), // injecté par le caller
})

const result = await brain.respond({
  text: 'Tu sais quoi, le père Noël va m'apporter un dragon !',
  sessionContext: { turnCount: 5, sessionMood: 'positive' },
})

// result = { text, plan, telemetry, updatedRelationship, updatedToM }
```

## Tests

```bash
bun test
```

Coverage cible : **80%**. Le V8 est le cœur produit — il doit être bétonné.

## Contraintes

- Pas d'I/O dans ce package. Les appels LLM/HTTP sont injectés via le constructeur.
- Tous les modules sont des fonctions pures ou des `class` sans état global.
- Budget latence par module respecté (voir `performance-monitor.ts`).
- Pas de dépendance browser (`window`, `document`) ni Node spécifique (`fs`, `http`).
