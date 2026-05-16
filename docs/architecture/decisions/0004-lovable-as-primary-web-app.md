# ADR-004 — Lovable comme app web principale

- **Statut** : Accepté
- **Date** : 2026-05-16
- **Tags** : web, devx

## Contexte

L'utilisateur a déjà construit avec **Lovable** une application complète (`Bobbytoyai/dream-weaver-pal`) :
- 60 migrations Supabase
- 6 Edge Functions (bobby-brain, elevenlabs-tts, session-analysis, learn-from-conversations, generate-content, admin-store)
- 18 pages React (Bobby Live, Parent, QR, Store, Admin, etc.)
- Stack : React 18 + Vite + TS + Tailwind + shadcn/ui + R3F + Drei + Bun

Repartir de zéro ferait perdre 3-4 mois de travail. Maintenir deux apps en parallèle est intenable.

## Décision

`apps/web/` **est** le projet Lovable existant, intégré dans le monorepo (et non un nouvel app scaffold).

Le code écrit pendant ce chantier (ex. mon `bobby-parent-pwa/`) est **supprimé** ou réintégré comme route de l'app principale.

L'option B (PWA parent séparée dans `apps/parent-pwa/`) est conservée **uniquement** si on identifie un besoin clair d'installable iOS/Android avec push natif. Sinon, on garde tout dans `apps/web/`.

## Conséquences

**Positives**
- Le travail existant est préservé.
- Une seule app à maintenir, une seule URL, un seul build.
- Lovable continue à pouvoir éditer l'app — le monorepo doit donc rester compatible Lovable.

**Négatives**
- Couplage à Lovable comme outil d'édition. Mitigation : on garde un setup vite/bun standard pour pouvoir s'en passer.
- Lovable ne gère pas le monorepo : il faut un script `tools/scripts/sync-from-lovable.sh` qui fait l'aller-retour.

## Suivi

À revoir si :
- Lovable ne supporte plus notre stack.
- Le besoin PWA installable apparaît clairement.
