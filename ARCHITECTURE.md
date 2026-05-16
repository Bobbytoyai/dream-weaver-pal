# Bobby — Architecture système

> Document maître. Met à jour quand on change un contrat d'interface, un service ou un module V8.

## 1. Principes directeurs

1. **L'enfant d'abord.** Pas une fonctionnalité ne ship sans SafeGuard input + output.
2. **Brain V8 est le cœur.** Tout converge vers le moteur cognitif unique (pas de logique dupliquée dans les apps).
3. **Offline-first quand possible.** Watcher doit dégrader gracieusement quand le Wi-Fi tombe.
4. **Latence < 650 ms p50** sur le pipeline complet (cf. V8 perf budget).
5. **Données enfant = données sensibles.** RLS strict, RGPD-K (moins de 16 ans), chiffrement au repos.

## 2. Diagramme de flux

```
[Enfant parle au Watcher]
       │
       ▼
┌─────────────────────────────────┐
│ Watcher (firmware/watcher)      │
│  • Mic 16 kHz mono              │
│  • VAD + push-to-talk (wheel)   │
│  • Affichage visage dot-matrix  │
│  • POST /v1/voice (audio b64)   │
└──────────────┬──────────────────┘
               │ HTTPS Wi-Fi
               ▼
┌─────────────────────────────────┐
│ Edge Function /v1/voice         │  (services/cloud/functions/voice)
│  1. Whisper STT                 │
│  2. SafeGuard input  (Haiku)    │
│  3. Brain V8 (pkg brain-v8)     │
│  4. SafeGuard output (Haiku)    │
│  5. ElevenLabs TTS              │
│  6. RPC append_exchange         │
└──────────────┬──────────────────┘
               │ Realtime (sessions, events)
               ▼
┌─────────────────────────────────┐
│ Parent PWA / Web App            │
│  • Live monitor                 │
│  • Highlights & souvenirs       │
│  • Limites & contrôle parental  │
└─────────────────────────────────┘
```

## 3. Composants

### 3.1 Firmware (firmware/watcher)

- **ESP-IDF 5.2.1 + LVGL 9.2.2 + FreeRTOS**
- Composants : `bobby_display`, `bobby_face`, `bobby_touch`, `bobby_knob`, `bobby_boot_screen`, `bobby_parent`, `bobby_child_menu`, `bobby_wifi` (à venir), `bobby_audio` (à venir), `bobby_api` (à venir)
- Build via `tools/scripts/bobby.sh quick` (auto-detect port + retry sur 4 configs)
- DA validée : fond noir, violet `#9333EA`, dot-matrix 16×16, écriture ronde.

### 3.2 Cloud (services/cloud)

- **Supabase EU Frankfurt** — `zvvyuxgqbuooifowjcqc`
- **Tables principales** : `profiles`, `children`, `devices`, `sessions`, `events`, `limits`, `content_packs`, `pack_unlocks` (+ tables V8 : `child_world_models`, `learning_facts`, `relationship_states`)
- **RLS** : parent owns children, children own sessions/events, service_role bypass pour Edge Functions
- **Edge Functions** (Deno) :
  - `voice` — pipeline conversation complet
  - `safety` — SafeGuard standalone (extensions, SDK tiers)
  - `bobby-brain` — endpoint V8 testable (input texte → réponse)
  - `elevenlabs-tts` — proxy TTS avec cache
  - `session-analysis` — post-conversation insights pour parent
  - `learn-from-conversations` — extraction de faits → ChildWorldModel
  - `generate-content` — contenu personnalisé (histoires, défis)
  - `admin-store` — gestion du store de packs

### 3.3 Apps

- `apps/web/` — App Lovable existante, hub principal Bobby (live, store, profil, etc.)
- `apps/parent-pwa/` — PWA dédiée parent (installable, push, offline shell)

### 3.4 Brain V8 (packages/brain-v8)

Voir [`docs/brain/V8.md`](./docs/brain/V8.md). Modules :

```
packages/brain-v8/src/
├── orchestrator.ts          # Pipeline 6 étapes
├── theory-of-mind.ts        # Modèle mental de l'enfant
├── child-world-model.ts     # Mémoire long-terme structurée
├── deep-goal-engine.ts      # WHY/WHAT/HOW/WHEN/WHO
├── cognition.ts             # Raisonnement causal + analogique
├── proactive-engine.ts      # Initiatives Bobby
├── variation-engine.ts      # Anti-répétition
├── silence-engine.ts        # Quand se taire
├── relationship-engine.ts   # 4 phases relationnelles
├── uncertainty-engine.ts    # Doute calibré
├── llm-augmentor.ts         # Hybride règles + LLM
├── safe-learning.ts         # Apprentissage sécurisé V3
├── performance-monitor.ts   # Budget latence
└── index.ts
```

### 3.5 Packages partagés

- `packages/brand/` — tokens couleur (violet `#9333EA`, etc.), typo, dot-matrix bitmap
- `packages/shared-types/` — types TS générés depuis schema Supabase + zod
- `packages/sdk-js/` — SDK client (`createBobbyClient({ apiKey })`)

## 4. Contrats d'API

### 4.1 POST /v1/voice

```ts
// Request
{
  device_id: string;        // UUID Watcher
  child_id: string;         // UUID enfant
  audio: string;            // base64 WebM Opus
  context?: {
    location?: 'home' | 'car' | 'travel';
    time_of_day?: 'morning' | 'day' | 'evening' | 'night';
  };
}

// Response
{
  session_id: string;
  child_text: string;       // transcription
  bobby_text: string;       // réponse
  audio_url: string;        // signed URL Supabase Storage
  emotion: 'joie' | 'tristesse' | 'curieux' | 'calme' | 'fier';
  safety: { input: 0|1|2|3|4; output: 0|1|2|3|4 };
  latency_ms: { stt: number; brain: number; tts: number; total: number };
}
```

### 4.2 POST /v1/safety

```ts
// Request
{ text: string; lang?: 'fr'|'en'|'es'|'de'|'it'; direction?: 'input'|'output' }

// Response
{
  level: 0|1|2|3|4;
  reason: string;
  suggested_response?: string;  // pour level >= 3
  latency_ms: number;
}
```

## 5. Budget de performance

| Étape | Cible p50 | Cible p95 |
|-------|-----------|-----------|
| STT (Whisper) | 120 ms | 220 ms |
| SafeGuard input | 80 ms | 150 ms |
| Brain V8 (offline) | 50 ms | 100 ms |
| Brain V8 + LLM | 450 ms | 700 ms |
| SafeGuard output | 80 ms | 150 ms |
| TTS (ElevenLabs) | 200 ms | 400 ms |
| **Total** | **650 ms** | **1100 ms** |

## 6. Modèle de sécurité

- Tous les inputs et outputs passent par SafeGuard (5 niveaux).
- Niveau ≥ 3 → bloque + remplace par `suggested_response`.
- Niveau 4 → alerte parent immédiate via Realtime + push.
- Données enfant chiffrées au repos (Supabase native).
- Aucun PII ne sort de l'EU (Supabase Frankfurt).
- Voir [`SECURITY.md`](./SECURITY.md).

## 7. Décisions architecturales

Toutes documentées dans `docs/architecture/decisions/`. Format : ADR Nygard.

Actuelles :
- ADR-001 : Supabase comme backend principal
- ADR-002 : Brain V8 en package TS isolé (testable offline)
- ADR-003 : SafeGuard double pass (input + output)
- ADR-004 : Lovable comme app web principale (vs séparé)
- ADR-005 : Watcher W1-A comme hardware MVP

## 8. Observabilité

- Supabase Logs + Edge Function logs
- Sentry pour apps (web + parent-pwa)
- Custom telemetry table `telemetry_events` (latency, safety_level, emotion)
- Dashboard interne `apps/web/admin` (read-only)
