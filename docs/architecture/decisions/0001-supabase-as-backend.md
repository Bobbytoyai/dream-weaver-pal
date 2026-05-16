# ADR-001 — Supabase comme backend principal

- **Statut** : Accepté
- **Date** : 2026-05-16
- **Décideurs** : Mickaël Sellem
- **Tags** : backend, infra

## Contexte

Bobby a besoin de : auth parent, DB structurée enfant/sessions, RLS forte (données mineurs), Realtime (parent monitor), Edge Functions (pipeline voix), Storage (audio), tout ça hébergé en EU (RGPD-K).

Alternatives évaluées :
- **Firebase** — pas de RLS native, US-only par défaut
- **Hasura + custom Auth** — surface ops trop large pour un MVP
- **Backend custom Node** — coût d'ingénierie disproportionné
- **Supabase EU Frankfurt** — coche toutes les cases sur étagère

## Décision

On utilise **Supabase EU Frankfurt** (`zvvyuxgqbuooifowjcqc`) comme backend unique. Toute la stack data passe par là : Auth, Postgres + RLS, Edge Functions Deno, Realtime, Storage.

## Conséquences

**Positives**
- RLS Postgres native → modèle de sécurité strict facile à raisonner.
- Realtime gratuit pour le monitor parent.
- Edge Functions Deno → un seul runtime, types partagés possible avec le front.
- EU Frankfurt → RGPD-K aligned out-of-the-box.

**Négatives / risques**
- Verrou fournisseur. Mitigation : migrations SQL pures, fonctions Edge écrites en TS/Deno standard (portables).
- Edge Functions ont des limites de cold-start. Mitigation : pour la pipeline `/voice`, on tolère 200 ms de cold-start au démarrage de session uniquement.
- Pas de queue managée. Pour les jobs async (analyse post-session), on utilise `pg_cron` + tables `jobs`.

## Suivi

À reconsidérer si :
- Limite Realtime atteinte (>500 connexions concurrentes).
- Coût mensuel > 2k€ / mois.
- Latence p95 Edge Functions > 800 ms persistante.
