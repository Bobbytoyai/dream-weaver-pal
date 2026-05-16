# apps/web — Bobby Web App (Lovable)

> Cette app est éditée principalement via [Lovable](https://lovable.dev) et synchronisée dans le monorepo. Voir [`../../docs/ops/migration-from-dream-weaver-pal.md`](../../docs/ops/migration-from-dream-weaver-pal.md).

## Stack

- React 18 + Vite + TypeScript
- Tailwind CSS + shadcn/ui
- React Three Fiber + Drei (visualisations 3D Bobby)
- onnxruntime-web (modèles offline locaux)
- Supabase JS + TanStack Query
- qrcode.react, Recharts
- Bun

## Pages (à confirmer après import)

- `/` — Bobby Live (conversation principale)
- `/parent` — Dashboard parent
- `/parent/onboarding`
- `/qr` — Appairage Watcher via QR
- `/store` — Bobby Store
- `/store/pack/:slug`
- `/admin/*` — Admin (debug, content, telemetry)
- ... (18 routes au total)

## Dev

```bash
bun install
bun run dev      # http://localhost:5173
bun run build
bun run preview
```

## Variables d'env

Voir `.env.example` à la racine. Notamment :
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Sync depuis Lovable

```bash
./tools/scripts/sync-from-lovable.sh
```

Tant qu'on édite via Lovable, faire la PR APRES sync, pas avant.

## Brain V8 dans l'app

Pour le mode démo / Bobby Live :

```ts
import { createBrain } from '@bobby/brain-v8'

const brain = createBrain({
  childProfile: { id, name, age, language: 'fr' },
  llmCall: async ({ prompt, maxTokens }) => {
    const r = await fetch('/api/llm', { method: 'POST', body: JSON.stringify({ prompt, maxTokens }) })
    return (await r.json()).text
  },
})

const reply = await brain.respond({
  text: childInput,
  sessionContext: { turnCount, sessionMood, /* … */ },
})
```
