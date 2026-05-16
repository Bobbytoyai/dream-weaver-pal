# Security Policy

## Public — comment signaler une vulnérabilité

Pour toute vulnérabilité de sécurité, **n'ouvrez pas d'issue publique**.
Envoyez un email à `security@bobby.toys` avec :
- Description du problème
- Étapes de reproduction
- Impact estimé (notamment sur les enfants)

Nous nous engageons à :
- Accuser réception sous **48 h**
- Donner un statut sous **5 jours ouvrés**
- Publier un fix CVE-style sous **30 jours** pour les vulnérabilités critiques

Programme bug bounty : pas encore officiel, mais les contributions sérieuses sont créditées + récompensées.

---

## Privé — modèle de menace

Bobby est utilisé par des **enfants de 3 à 12 ans**. Le modèle de sécurité est plus strict qu'un produit adulte standard.

### 1. SafeGuard — défense en profondeur

Toute conversation passe par :
1. **SafeGuard Input** (avant LLM) — classifier ce que dit l'enfant.
2. **Brain V8 + LLM** — génération.
3. **SafeGuard Output** (après LLM) — classifier la réponse Bobby.

5 niveaux :

| Level | Nom | Action |
|-------|-----|--------|
| 0 | OK | Pass |
| 1 | Faible (sensible mais sain) | Pass, log |
| 2 | Moyen (à surveiller) | Pass, log, notif parent (digest hebdo) |
| 3 | Élevé (bloquer/rediriger) | Bloque, remplace par `suggested_response`, log, notif parent |
| 4 | Critique (alerte immédiate) | Bloque, notif parent push + email, ouvre un ticket interne |

Le classifier est **Claude Haiku 4.5** avec un prompt verrouillé (voir `services/cloud/functions/safety/index.ts`). Pas modifiable par l'utilisateur.

### 2. Authentification

- **Parent** : magic link Supabase Auth (email).
- **Enfant** : pas d'auth directe. Le Watcher est appairé via QR au compte parent, et chaque session est attribuée à un `child_id` choisi par le parent.
- **API tiers (SDK)** : clés API scoped par projet, revocable, rate-limitées.

### 3. Données enfant

| Donnée | Stockage | Chiffrement | Rétention |
|--------|----------|-------------|-----------|
| Prénom, année naissance | `children` (Supabase EU) | At-rest AES-256 | Tant que le compte existe |
| Audio brut | **Jamais stocké** | N/A | Supprimé après STT (5 min max) |
| Transcripts | `sessions.transcript` (jsonb) | At-rest | 30 jours par défaut (parent peut prolonger ou purger) |
| Faits appris (ChildWorldModel) | `learning_facts` | At-rest | Vie du compte, exportable, supprimable |
| Telemetry | `telemetry_events` | At-rest, anonymisé | 90 jours |

### 4. RGPD-K (mineurs < 16 ans)

- Consentement parental explicite à l'onboarding.
- Droit d'accès, rectification, effacement — implémenté dans `apps/parent-pwa` → "Mon compte → Mes données".
- Export JSON complet sur demande (`bun run export:user --user-id=…`).
- DPO : `dpo@bobby.toys`.

### 5. Réseau

- TLS 1.3 partout. HSTS sur les domaines `*.bobby.toys`.
- CSP stricte sur les apps web (script-src self + nonces).
- API rate-limited : 60 req/min par device, 600 req/min par compte parent.
- Watcher → Cloud : POST sur HTTPS, body chiffré au transport (pas de E2E pour l'instant — sur la roadmap).

### 6. Secrets

- Aucun secret dans le repo. `.env.example` montre les noms, pas les valeurs.
- Secrets prod dans **GitHub Actions secrets** + **Supabase Vault**.
- Rotation API keys ElevenLabs / Anthropic / OpenAI : tous les 90 jours.

### 7. Hardware (Watcher)

- Firmware signé (à venir au stade industrialisation).
- OTA update via cloud signé.
- Pas de stockage local d'audio enfant. Pas de SD card par défaut.
- Bouton physique mute coupant matériellement le micro (à venir hardware v2).

### 8. RLS (Row-Level Security)

Implémentée sur toutes les tables (voir `services/cloud/migrations/*_rls_policies.sql`).

Règles clés :
- Un parent ne voit QUE ses propres enfants.
- Edge Functions (`service_role`) bypass RLS — donc audit strict de ce code.
- Pas de "admin user" dans la base — seuls les workflows internes y accèdent.

### 9. Audits

- **Audit interne** : tous les 6 mois.
- **Audit externe** : prévu Q4 2026 par un cabinet certifié ANSSI.
- **Test de pénétration** : prévu avant lancement public grand consumer.

---

Pour toute question : `security@bobby.toys`.
