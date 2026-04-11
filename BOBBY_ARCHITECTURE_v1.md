# Bobby — Full System Architecture v1.0
# Autonomous Agents Supervisor + Complete Product Blueprint

> **Statut** : Prêt à implémenter
> **Version** : 1.0 — Avril 2026
> **Auteur** : Système généré automatiquement par Bobby AI Architect

---

## TABLE DES MATIÈRES

1. [Architecture Globale Produit](#1-architecture-globale-produit)
2. [Système QR Code Unique Sécurisé](#2-système-qr-code-unique-sécurisé)
3. [Connexion Jouet ↔ Dashboard Parent](#3-connexion-jouet--dashboard-parent)
4. [Pipeline Conversationnel](#4-pipeline-conversationnel)
5. [Memory Engine](#5-memory-engine)
6. [Dashboard Parent](#6-dashboard-parent)
7. [Système de Sous-Agents Autonomes](#7-système-de-sous-agents-autonomes)
8. [Auto-Correction System](#8-auto-correction-system)
9. [Tests Automatiques Continus](#9-tests-automatiques-continus)
10. [Sécurité & Privacy](#10-sécurité--privacy)
11. [Scalabilité & Déploiement](#11-scalabilité--déploiement)
12. [APIs Détaillées](#12-apis-détaillées)

---

## 1. ARCHITECTURE GLOBALE PRODUIT

### 1.1 Vue d'ensemble — Les 4 couches

```
┌─────────────────────────────────────────────────────────────────────┐
│                         LAYER 4 — CLOUD                             │
│   Supabase (DB + Auth + Realtime)  │  CDN (assets TTS/media)        │
│   OpenAI / Mistral (LLM)           │  ElevenLabs API (TTS)          │
│   Deepgram API (STT)               │  Analytics Platform            │
└────────────────────────┬────────────────────────────────────────────┘
                         │ HTTPS/WSS
┌────────────────────────▼────────────────────────────────────────────┐
│                       LAYER 3 — BACKEND API                          │
│   Node.js + Express / Supabase Edge Functions                        │
│   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐               │
│   │  Auth Service│ │ Conversation │ │  QR Pairing  │               │
│   │  (JWT/OAuth) │ │  API (REST)  │ │  Service     │               │
│   └──────────────┘ └──────────────┘ └──────────────┘               │
│   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐               │
│   │  Memory API  │ │  Analytics   │ │  Agent       │               │
│   │  (CRUD)      │ │  Pipeline    │ │  Supervisor  │               │
│   └──────────────┘ └──────────────┘ └──────────────┘               │
└────────────────────────┬────────────────────────────────────────────┘
                         │
           ┌─────────────┴─────────────┐
           │                           │
┌──────────▼──────────┐   ┌───────────▼──────────────┐
│  LAYER 1 — JOUET    │   │  LAYER 2 — APP PARENT    │
│  (Device Enfant)    │   │  (React Native / iOS)    │
│                     │   │                          │
│  • Microphone       │   │  • Dashboard             │
│  • Haut-parleur     │   │  • Historique            │
│  • Écran LED/OLED   │   │  • Analytics             │
│  • WiFi/BLE         │   │  • Contrôles parentaux   │
│  • STT local        │   │  • Scanner QR            │
│  • Cache offline    │   │  • Notifications push    │
│  • Animations       │   │                          │
└─────────────────────┘   └──────────────────────────┘
```

### 1.2 Rôle de chaque composant

| Composant | Rôle | Technologies |
|---|---|---|
| **Jouet Bobby** | Interface enfant, capture voix, joue réponses, animations | ESP32/RPi, Deepgram local, TTS cache |
| **STT Engine** | Voix → texte, offline-first | Deepgram SDK, wake word engine |
| **Orchestrator** | Routage intent → AI/offline, gestion état | TypeScript, INTENT_RULES |
| **LLM AI** | Génération réponses contextuelles | OpenAI GPT-4o / Mistral |
| **TTS Engine** | Texte → voix de Bobby | ElevenLabs, cache local |
| **Memory Engine** | Mémoire court/long terme, apprentissage | IndexedDB, Supabase |
| **Backend API** | Gateway, auth, analytics, QR | Node.js, Supabase Edge |
| **App Parent** | Dashboard, contrôles, analytics | React Native |
| **Agent Supervisor** | Monitoring, QA, auto-correction | TypeScript async agents |

### 1.3 Flow Global Principal

```
ENFANT PARLE
     │
     ▼
┌─────────────┐     timeout 400ms      ┌──────────────────┐
│ Wake Word   │──── pas de wake ──────▶│   IDLE / écoute  │
│ Detection   │                        └──────────────────┘
└──────┬──────┘
       │ "Hey Bobby" détecté
       ▼
┌─────────────┐
│    STT      │ Deepgram (stream) ou native STT offline
│  (écoute)  │
└──────┬──────┘
       │ transcript
       ▼
┌─────────────┐     BLOCKED           ┌──────────────────┐
│  Safety     │──────────────────────▶│  Réponse sécurité│
│  Filter     │                       └──────────────────┘
└──────┬──────┘
       │ safe
       ▼
┌─────────────┐
│  Intent     │ detectOfflineIntent() / detectIntent()
│  Detection  │
└──────┬──────┘
       │
  ┌────┴────────────────────┐
  │ SIMPLE_OFFLINE_INTENT   │ NON
  │ (GREETING, FAREWELL...) ├──────────────────────────────┐
  └────┬────────────────────┘                              │
       │ OUI                                               │
       ▼                                                   ▼
┌─────────────┐                                   ┌───────────────┐
│  Offline    │                                   │  AI Engine    │
│  Response   │                                   │  (LLM call   │
│  (< 100ms)  │                                   │  or cache)   │
└──────┬──────┘                                   └───────┬───────┘
       │                                                  │
       └─────────────────┬────────────────────────────────┘
                         │ response text
                         ▼
                ┌─────────────────┐
                │   TTS Engine    │ ElevenLabs → cache PCM
                │   (voix Bobby)  │
                └────────┬────────┘
                         │ audio stream
                         ▼
                ┌─────────────────┐
                │   Animation     │ LED/hologram sync avec audio
                │   Engine        │
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │   Memory &      │ Store → sync cloud async
                │   Analytics     │
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │  Dashboard      │ Parent reçoit update realtime
                │  Parent (sync)  │
                └─────────────────┘
```

---

## 2. SYSTÈME QR CODE UNIQUE SÉCURISÉ

### 2.1 Principe

Chaque jouet Bobby est associé à un QR code unique généré à la fabrication. Ce QR code contient les informations nécessaires pour lier le jouet à un compte parent de manière sécurisée et irréversible.

**Règle : 1 jouet = 1 device_id = 1 QR = 1 famille**

### 2.2 Contenu du QR Code

```json
{
  "device_id": "BOB-2026-XXXXXXXXXXX",
  "activation_token": "eyJhbGc...(JWT signé avec clé privée fabricant)",
  "version": 1,
  "manufactured_at": "2026-04-12T00:00:00Z",
  "region": "EU",
  "model": "bobby-v2"
}
```

Le QR encode ce payload en **Base64URL** signé avec **HMAC-SHA256** (clé secrète Anthropic/Bobby).

### 2.3 Flow d'activation complet

```
FABRICATION
    │
    ▼
┌────────────────────────────────────────────────────────────┐
│  1. Génération (usine)                                      │
│     device_id = "BOB-" + year + "-" + crypto.randomUUID()  │
│     token = JWT.sign({device_id, exp: +90jours}, SECRET)   │
│     QR = encode(Base64URL(device_id + "." + token))        │
│     → imprimé sur boîte + collé sous le jouet              │
└────────────────────────────────┬───────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────┐
│  2. Backend — pré-enregistrement                            │
│     POST /api/devices/register (internal)                   │
│     { device_id, token_hash, status: "manufactured" }       │
│     → Supabase: table devices                               │
└────────────────────────────────┬───────────────────────────┘
                                 │
              ACHAT + DÉBALLAGE PARENT
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────┐
│  3. Parent scanne le QR via app Bobby                       │
│     → App décode QR → extrait device_id + token            │
│     → POST /api/devices/activate                            │
│       { device_id, token, parent_user_id }                  │
└────────────────────────────────┬───────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────┐
│  4. Backend — validation                                    │
│     1. Vérifier signature JWT (HMAC-SHA256)                 │
│     2. Vérifier expiration (90 jours depuis fabrication)    │
│     3. Vérifier status === "manufactured" (pas déjà activé) │
│     4. Vérifier parent_user_id authentifié                  │
│     → Si OK: status = "activated", linked_parent = user_id  │
│     → Générer device_secret (AES-256 key pour sync)         │
│     → Retourner { device_secret, child_id, profile_url }    │
└────────────────────────────────┬───────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────┐
│  5. Jouet reçoit device_secret via BLE/WiFi provisioning    │
│     → Stocke en mémoire sécurisée (TPM / secure enclave)   │
│     → Status jouet: ACTIVE                                  │
│     → Première sync child profile → jouet                   │
└────────────────────────────────────────────────────────────┘
```

### 2.4 API Endpoints QR System

```
POST   /api/devices/activate
GET    /api/devices/{device_id}/status
DELETE /api/devices/{device_id}/deactivate
POST   /api/devices/{device_id}/transfer  (transfert à autre parent)
GET    /api/devices/{device_id}/pairing-status
```

### 2.5 Sécurité du QR

| Menace | Protection |
|---|---|
| QR copié/intercepté | Token expiré après 90 jours si non activé |
| Double activation | Statut `activated` → 2e tentative rejetée |
| Token falsifié | HMAC-SHA256 avec clé secrète backend |
| Scan malveillant | Auth parent obligatoire avant activation |
| Device volé | Deactivate endpoint + remote wipe |

---

## 3. CONNEXION JOUET ↔ DASHBOARD PARENT

### 3.1 Architecture de sync

```
JOUET (offline-first)                    BACKEND                    DASHBOARD PARENT
        │                                    │                              │
        │──── conversation.end() ───────────▶│                              │
        │                                    │── INSERT conversations ─────▶│
        │                                    │── REALTIME event ───────────▶│ (WebSocket)
        │                                    │                              │
        │──── heartbeat (30s) ──────────────▶│                              │
        │◀── config_update (si changé) ──────│                              │
        │                                    │                              │
        │                                    │◀────── parent_control ───────│
        │◀── control_command ────────────────│                              │
        │                                    │                              │
```

### 3.2 Modes de sync

**Mode Temps Réel (WiFi connecté)**
- WebSocket persistant jouet ↔ backend
- Latence : < 200ms
- Events : conversation_start, turn_captured, emotion_detected, session_end

**Mode Sync Différée (offline / faible signal)**
- Stockage local IndexedDB sur jouet
- Queue FIFO avec retry exponentiel
- Sync automatique au retour WiFi
- Garantie zero-loss : aucune donnée perdue

### 3.3 Data Flow détaillé

```
JOUET
  ├─ Local Buffer (RAM)     → max 50 interactions en mémoire vive
  ├─ Local Store (Flash)    → max 500 interactions persistées
  └─ Sync Queue             → file FIFO pour upload backend

BACKEND
  ├─ Conversations Table    → transcript, timestamps, intent, emotion
  ├─ Analytics Table        → scores engagement/comprehension/emotion
  ├─ Memory Table           → child profile, preferences, patterns
  └─ Events Table           → sessions, errors, system events

DASHBOARD
  ├─ Realtime Feed          → Supabase Realtime (WebSocket)
  ├─ Historical View        → REST API avec pagination
  └─ Analytics Charts       → agrégation côté backend
```

### 3.4 Protocole de sync (Conflict Resolution)

- **Stratégie** : jouet = source of truth pour les interactions
- **Conflit** : si même conversation_id existe → merge by timestamp
- **Priorité** : données jouet > données dashboard (parent ne peut qu'annoter, pas modifier)
- **Idempotence** : chaque record a un `uuid` — upload multiple = stockage unique

---

## 4. PIPELINE CONVERSATIONNEL

### 4.1 Architecture STT

```
Microphone (raw PCM 16kHz)
    │
    ▼
┌──────────────────────────────────────────────────┐
│  VAD (Voice Activity Detection)                  │
│  Seuil : -40dB / silence 800ms → fin de tour    │
└──────────────────────┬───────────────────────────┘
                       │
          ┌────────────┴────────────┐
          │ WiFi disponible ?       │
          │                         │
         OUI                       NON
          │                         │
          ▼                         ▼
┌─────────────────┐       ┌─────────────────────┐
│  Deepgram       │       │  Native STT (iOS/   │
│  Streaming API  │       │  Android) ou        │
│  Nova-3 FR      │       │  Whisper.cpp local  │
│  < 300ms        │       │  < 800ms            │
└────────┬────────┘       └──────────┬──────────┘
         └──────────┬────────────────┘
                    │ transcript + confidence
                    ▼
           ┌─────────────────┐
           │  normalizeInput │ lowercase, trim, remove ponct.
           └────────┬────────┘
                    │
                    ▼ (vers Orchestrator)
```

### 4.2 Architecture AI/LLM

```
Intent détecté
    │
    ├── SIMPLE_OFFLINE → réponse directe (< 100ms)
    │
    ├── EDUCATION/STORY/GAME → offline engine (réponses pré-générées)
    │                           + cache TTS local
    │
    └── COMPLEX/UNKNOWN → LLM Pipeline
             │
             ▼
    ┌─────────────────────────────────────────────┐
    │  Context Builder                             │
    │  • System prompt (persona Bobby)             │
    │  • Child profile (age, préférences)          │
    │  • Short-term memory (15 derniers tours)     │
    │  • Auto-Learning personalization hints       │
    └───────────────────┬─────────────────────────┘
                        │
                        ▼
    ┌─────────────────────────────────────────────┐
    │  LLM Call (streaming)                        │
    │  Primaire  : GPT-4o-mini (< 800ms)           │
    │  Fallback  : Mistral 8B local ou cache       │
    │  Timeout   : 3s → fallback déclenché         │
    └───────────────────┬─────────────────────────┘
                        │
                        ▼
    ┌─────────────────────────────────────────────┐
    │  Response Validator                          │
    │  • Safety check                              │
    │  • Longueur adaptée à l'âge                  │
    │  • Ton adapté (playful/calm/educational)     │
    └───────────────────┬─────────────────────────┘
                        │ validated response
```

### 4.3 Architecture TTS

```
Response text
    │
    ▼
┌──────────────────────────────────────────────┐
│  TTS Cache Lookup                            │
│  Hash(text + voice_id) → PCM file cached ?   │
└──────────┬──────────────────────┬────────────┘
           │ HIT                  │ MISS
           ▼                      ▼
    ┌─────────────┐      ┌─────────────────────┐
    │ Lire cache  │      │ ElevenLabs API call  │
    │ PCM local   │      │ voice: Bobby FR      │
    │ < 50ms      │      │ stream PCM → jouet   │
    └──────┬──────┘      └──────────┬──────────┘
           │                        │ store to cache
           └──────────┬─────────────┘
                      │ PCM stream
                      ▼
           ┌─────────────────────┐
           │  Audio Player       │
           │  + Animation sync   │ visème / LED
           └─────────────────────┘
```

### 4.4 Latence cible par mode

| Mode | STT | AI | TTS | Total |
|---|---|---|---|---|
| Offline simple | 0ms | < 50ms | < 50ms (cache) | **< 100ms** |
| Online + cache TTS | 300ms | 600ms | 50ms | **< 1s** |
| Online full | 300ms | 800ms | 400ms | **< 1.5s** |
| Dégradé (fallback) | 800ms | 200ms (cache) | 50ms | **< 1.2s** |

---

## 5. MEMORY ENGINE

### 5.1 Architecture 3 couches

```
┌─────────────────────────────────────────────────────────────┐
│  COUCHE 1 — SHORT TERM (RAM)                                 │
│  Durée : session active                                       │
│  Contenu : 20 derniers échanges, état émotionnel courant     │
│  Accès : < 1ms                                               │
└──────────────────────────────┬──────────────────────────────┘
                               │ flush on session end
┌──────────────────────────────▼──────────────────────────────┐
│  COUCHE 2 — LOCAL (IndexedDB + localStorage)                 │
│  Durée : 30 jours                                            │
│  Contenu : historique conversations, profil enfant,          │
│            préférences, patterns auto-learning               │
│  Accès : < 10ms                                              │
└──────────────────────────────┬──────────────────────────────┘
                               │ sync async
┌──────────────────────────────▼──────────────────────────────┐
│  COUCHE 3 — CLOUD (Supabase)                                  │
│  Durée : illimitée (selon abonnement parent)                  │
│  Contenu : tout l'historique, analytics, sauvegardes          │
│  Accès : < 200ms (REST) / < 100ms (cache CDN)                │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Stratégies de mémoire

**Priorité de retention (score 0–10)**

| Type de donnée | Score | Justification |
|---|---|---|
| Prénom de l'enfant, famille | 10 | Jamais effacé |
| Événements émotionnels forts | 9 | Garde 1 an |
| Histoires préférées | 8 | Garde 6 mois |
| Patterns d'engagement élevés | 7 | Garde 3 mois |
| Interactions standards | 5 | Garde 30 jours |
| Données de calibration | 3 | Garde 7 jours |
| Logs debug/erreurs | 1 | Garde 24h |

**Nettoyage automatique (Memory Cleaner Agent)**
- Quotidien : supprime données score < 3 de plus de 7 jours
- Hebdomadaire : compresse données score 3–5 (supprime doublons)
- Mensuel : archive vers cloud, libère local

**Apprentissage**
- Intérêts de l'enfant : vecteur mis à jour par EMA après chaque interaction
- Réponses préférées : Auto-Learning Engine v5.5 (déjà implémenté)
- Adaptation : `preferredTone`, `preferredLength` inférés des patterns

---

## 6. DASHBOARD PARENT

### 6.1 Structure des pages

```
APP PARENT
├── 🏠 HOME
│   ├── Statut jouet (online/offline/batterie)
│   ├── Dernière session (heure, durée, humeur)
│   ├── Alerte si anomalie détectée
│   └── Quick actions (activer/désactiver, volume)
│
├── 💬 CONVERSATIONS
│   ├── Liste sessions (date, durée, nb échanges)
│   ├── Replay complet (transcript + audio)
│   ├── Transcription annotée (intent détecté, émotion)
│   └── Partager / exporter session
│
├── 📊 ANALYTICS
│   ├── Engagement moyen (7j, 30j)
│   ├── Émotions détectées (pie chart)
│   ├── Intérêts enfant (top 5 sujets)
│   ├── Temps de réponse Bobby
│   └── Progression apprentissage
│
├── 🧒 PROFIL ENFANT
│   ├── Préférences (histoires, jeux, musique)
│   ├── Mémoire active (ce que Bobby sait)
│   ├── Modifier prénom / âge
│   └── Réinitialiser mémoire
│
├── ⚙️  CONTRÔLES PARENTAUX
│   ├── Horaires autorisés (time locks)
│   ├── Volume max
│   ├── Sujets à bloquer (mots-clés custom)
│   ├── Mode silencieux
│   └── Mise à jour firmware
│
└── 🔒 SÉCURITÉ & COMPTE
    ├── Gestion compte
    ├── Export données (RGPD)
    ├── Suppression données
    └── QR code jouet (re-scan / transfert)
```

### 6.2 Analytics en temps réel

Données collectées par interaction :
- `emotion_detected` : joy / sadness / fear / anger / neutral / excited / curious
- `engagement_score` : 0.0–1.0 (durée continuation)
- `comprehension_score` : 0.0–1.0 (qualité réponse enfant)
- `intent` : catégorie de la demande
- `latency_ms` : temps de réponse Bobby
- `is_offline` : mode utilisé

---

## 7. SYSTÈME DE SOUS-AGENTS AUTONOMES

### 7.1 Vue d'ensemble — Agent Supervisor

```
┌─────────────────────────────────────────────────────────────────┐
│                    AGENT SUPERVISOR v1.0                         │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  AGENT 1     │  │  AGENT 2     │  │  AGENT 3     │          │
│  │  QA Monitor  │  │  Perf Monitor│  │  Mem Cleaner │          │
│  │  [30s tick]  │  │  [10s tick]  │  │  [1h tick]   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  AGENT 4     │  │  AGENT 5     │  │  AGENT 6     │          │
│  │  AI Improver │  │  Safety Guard│  │  Sync Monitor│          │
│  │  [10m tick]  │  │  [realtime]  │  │  [5m tick]   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                   │
│              ┌─────────────────────────┐                         │
│              │  AUTO-CORRECTION ENGINE │                         │
│              │  centralise + applique  │                         │
│              └─────────────────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Détail de chaque agent

#### AGENT 1 — QA Monitor
- **Fréquence** : toutes les 30 secondes
- **Mission** : teste conversations synthétiques, détecte bugs intent/réponse
- **Actions** :
  - Simule 5 inputs aléatoires par tick
  - Vérifie que l'intent détecté est correct
  - Vérifie que la réponse est non-vide, non-undefined
  - Log les anomalies dans la queue d'erreurs
  - Alerte si taux d'erreur > 5%

#### AGENT 2 — Performance Monitor
- **Fréquence** : toutes les 10 secondes
- **Mission** : surveille latences STT/AI/TTS, optimise réponses
- **Actions** :
  - Collecte p50/p95/p99 des latences
  - Si p95 > 2000ms → alerte + bascule sur mode cache
  - Si TTS > 500ms → pré-chauffe les réponses fréquentes
  - Dashboard temps réel côté backend

#### AGENT 3 — Memory Cleaner
- **Fréquence** : toutes les heures
- **Mission** : supprime données inutiles, optimise stockage
- **Actions** :
  - Purge interactions score < 3 de plus de 7 jours
  - Déduplique patterns similaires (Levenshtein < 0.15)
  - Compresse historical data en snapshots
  - Libère > 20% du stockage local si usage > 80%

#### AGENT 4 — AI Improver
- **Fréquence** : toutes les 10 minutes
- **Mission** : analyse réponses récentes, propose améliorations
- **Actions** :
  - Appelle `autoLearningEngine.runBatchImprovement()`
  - Identifie top 3 patterns à améliorer (score < 0.65)
  - Génère alternatives via LLM si connexion disponible
  - Rollback si score global baisse > 15%
  - Log chaque amélioration appliquée

#### AGENT 5 — Safety Guard
- **Fréquence** : temps réel (chaque interaction)
- **Mission** : filtre contenu, vérifie conformité enfant
- **Actions** :
  - Double-check `isBlockedContent()` sur input ET response
  - Vérifie absence de PII (nom de famille, adresse, téléphone)
  - Vérifie age-appropriateness (pas de violence, sexe, alcool)
  - En cas de violation : block + log + alerte parent push
  - Quarantine du pattern source si récidive

#### AGENT 6 — Sync Monitor
- **Fréquence** : toutes les 5 minutes
- **Mission** : vérifie sync jouet ↔ cloud, corrige erreurs
- **Actions** :
  - Vérifie que la queue de sync est vide (ou en cours)
  - Détecte les records en échec > 3 tentatives
  - Retry avec backoff exponentiel (1s, 2s, 4s, 8s...)
  - Alerte si sync bloquée > 30 minutes
  - Vérifie intégrité des données (checksum SHA256)

---

## 8. AUTO-CORRECTION SYSTEM

### 8.1 Niveaux de sévérité

| Niveau | Sévérité | Action |
|---|---|---|
| INFO | Anomalie mineure | Log seulement |
| WARNING | Dégradation détectée | Log + tentative correction automatique |
| ERROR | Fonctionnement impacté | Correction auto + alerte backend |
| CRITICAL | Système non fonctionnel | Fallback immédiat + alerte parent + alerte ops |

### 8.2 Decision Tree — Auto-correction

```
ERREUR DÉTECTÉE
      │
      ▼
Identifier source
      │
  ┌───┴──────────────────────────┐
  │                              │
  ▼                              ▼
AI/LLM timeout              Intent detection fail
  │                              │
  ▼                              ▼
→ Bascule sur cache         → Utiliser UNKNOWN fallback
→ Log + monitor             → Re-train pattern (Agent 4)
→ Retry après 5s            → Log pour analyse
  │
  │ si récidive > 3 fois
  ▼
→ Mode offline forcé
→ Alerte parent
→ Log CRITICAL
```

### 8.3 Fallback Chain

```
PRIMARY    → LLM Online (GPT-4o / Mistral)
FALLBACK 1 → Cache LLM (réponses similaires mémorisées)
FALLBACK 2 → Offline Engine (INTENT_RULES + réponses pré-générées)
FALLBACK 3 → Réponse générique safe ("Je ne suis pas sûr, parle-moi d'autre chose !")
EMERGENCY  → Mode silencieux + notification parent
```

---

## 9. TESTS AUTOMATIQUES CONTINUS

### 9.1 Test Suite — Agent QA Monitor

**Scénarios simulés à chaque cycle (30s)**

```
[Smoke Tests — 10 essentiels]
  1. "bonjour bobby" → GREETING
  2. "raconte-moi une histoire" → STORY_REQUEST
  3. "je suis triste" → EMOTION_NEGATIVE
  4. "c'est quoi le soleil" → EDUCATION
  5. "jouons ensemble" → PLAY_REQUEST
  6. "stop" → CONTROL
  7. "je veux mourir" → BLOCKED (safety test)
  8. "à demain" → FAREWELL
  9. "je t'aime" → COMPLIMENT
  10. "allons en aventure" → ADVENTURE

[Stress Tests — 5 scénarios extrêmes]
  1. Input vide → UNKNOWN (pas de crash)
  2. Input 500 caractères → tronqué + traité
  3. Input en majuscules → normalisé correctement
  4. Input caractères spéciaux → nettoyé sans erreur
  5. Appels simultanés x10 → pas de race condition

[Regression Tests — 21 non-regressions]
  → Full list des cas critiques connus
```

### 9.2 Test de performance (Agent 2)

Métriques collectées et seuils d'alerte :

| Métrique | Alerte WARNING | Alerte CRITICAL |
|---|---|---|
| STT latency p95 | > 1000ms | > 2000ms |
| AI latency p95 | > 1500ms | > 3000ms |
| TTS latency p95 | > 800ms | > 1500ms |
| Total pipeline p95 | > 2500ms | > 5000ms |
| Error rate (5min) | > 2% | > 10% |
| Sync lag | > 5min | > 30min |

---

## 10. SÉCURITÉ & PRIVACY

### 10.1 Chiffrement

| Donnée | Chiffrement |
|---|---|
| Voix transmise réseau | TLS 1.3 |
| Conversations stockées cloud | AES-256-GCM |
| Profil enfant en local | AES-256 (device_secret) |
| QR Code token | HMAC-SHA256 |
| Sync jouet ↔ backend | JWT + device_secret |
| Backup cloud parent | Clé dérivée password parent (PBKDF2) |

### 10.2 Accès et contrôle

- **Seul le parent activateur** peut accéder aux données de son enfant
- **Partage** : opt-in explicite (pas de partage par défaut)
- **Suppression** : bouton "Supprimer tout" → effacement cascade (jouet + cloud)
- **Export RGPD** : disponible en JSON dans les 72h
- **Mineurs** : aucune publicité, aucun tracking tiers, aucune revente de données
- **Audit logs** : chaque accès aux données enfant est tracé

### 10.3 Conformité

- **RGPD** (Europe) : consentement explicite, droit à l'oubli
- **COPPA** (US) : enfants < 13 ans, consentement parental obligatoire
- **CNIL** (France) : DPO désigné, registre traitements

---

## 11. SCALABILITÉ & DÉPLOIEMENT

### 11.1 Infrastructure

```
PRODUCTION
├── Supabase Pro (DB + Auth + Realtime + Edge Functions)
├── Vercel / Railway (API backend si edge insuffisant)
├── ElevenLabs (TTS API, plan Team)
├── Deepgram (STT API, plan Growth)
├── OpenAI (LLM, plan usage)
└── CDN (Cloudflare, assets TTS cachés)

TARGETS DE SCALABILITÉ
├── 1k jouets actifs simultanément → configuration actuelle suffit
├── 10k jouets → Supabase Pro + edge caching + TTS pre-generation
└── 100k jouets → migration vers infra dédiée (Kubernetes + Redis)
```

### 11.2 Monitoring opérationnel

- **Uptime** : Uptime Robot (check toutes les 60s)
- **Alertes** : Slack webhook si p95 > seuils
- **Logs** : Supabase Logs + structured JSON
- **Dashboards** : Grafana ou Supabase dashboard

---

## 12. APIs DÉTAILLÉES

### 12.1 Authentication

```
POST /api/auth/register
  Body: { email, password, child_name, child_age }
  Response: { user_id, access_token, refresh_token }

POST /api/auth/login
  Body: { email, password }
  Response: { access_token, refresh_token, user }

POST /api/auth/refresh
  Body: { refresh_token }
  Response: { access_token }

POST /api/auth/logout
  Headers: Authorization: Bearer <token>
  Response: { success: true }
```

### 12.2 Device / QR

```
POST /api/devices/activate
  Headers: Authorization: Bearer <parent_token>
  Body: { device_id, activation_token }
  Response: { device_secret, child_id, status: "activated" }

GET /api/devices/{device_id}/status
  Response: { status, last_seen, battery_level, firmware_version }

DELETE /api/devices/{device_id}
  Response: { success, data_deleted: boolean }
```

### 12.3 Conversations

```
POST /api/conversations
  Headers: Authorization: Bearer <device_secret>
  Body: { session_id, turns: [{input, response, intent, emotion, scores, timestamp}] }
  Response: { conversation_id, synced: true }

GET /api/conversations?child_id=&limit=20&offset=0
  Response: { conversations: [...], total }

GET /api/conversations/{id}/replay
  Response: { turns: [...], audio_urls: [...] }
```

### 12.4 Analytics

```
GET /api/analytics/summary?child_id=&period=7d
  Response: {
    avg_engagement: 0.78,
    total_sessions: 12,
    top_intents: ["STORY_REQUEST", "EDUCATION", "PLAY_REQUEST"],
    emotion_distribution: { joy: 0.45, neutral: 0.30, ... },
    avg_latency_ms: 823
  }

GET /api/analytics/emotions?child_id=&from=&to=
  Response: { timeline: [{date, dominant_emotion, score}] }
```

### 12.5 Child Profile

```
GET /api/children/{child_id}
  Response: { name, age, preferences, interests, memory_size_kb }

PUT /api/children/{child_id}
  Body: { name?, age?, blocked_topics?: string[] }
  Response: { updated: true }

DELETE /api/children/{child_id}/memory
  Response: { deleted_records: number }

GET /api/children/{child_id}/export
  Response: { download_url, expires_in: 3600 }
```

### 12.6 Agent Control

```
GET /api/agents/status
  Response: { agents: [{ name, status, last_run, last_result }] }

POST /api/agents/{name}/trigger
  Body: { childId? }
  Response: { triggered: true, run_id }

GET /api/agents/logs?limit=100
  Response: { logs: [{ timestamp, agent, level, message, data }] }
```

---

## RÉSUMÉ EXÉCUTIF

| Aspect | Solution Bobby |
|---|---|
| **Latence** | < 100ms offline, < 1.5s online |
| **Offline** | 100% fonctionnel sans WiFi |
| **Sécurité** | AES-256 + TLS 1.3 + RGPD/COPPA |
| **Personnalisation** | Auto-Learning Engine v5.5 par enfant |
| **Monitoring** | 6 agents autonomes 24/7 |
| **Fiabilité** | Fallback chain 4 niveaux + auto-correction |
| **Scalabilité** | 1k→100k jouets sans re-architecture |
| **QR Pairing** | JWT HMAC-SHA256, expiration 90j, one-shot |

---

*Document généré le 12 Avril 2026 — Bobby Architecture v1.0*
*Fichiers d'implémentation : `autoLearningEngine.ts`, `agentSupervisor.ts`, `qrCodeSystem.ts`*
