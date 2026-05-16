# Roadmap Bobby — 24 mois

Document vivant. Mis à jour chaque trimestre.

## Trimestre actuel — Q2 2026 (avril–juin)

**Thème : stabiliser le pré-MVP.**

| Track | Objectif | Statut |
|-------|----------|--------|
| Firmware Watcher | Stabilité 24h+ uptime sur dev units | ✅ |
| Cloud pipeline | /v1/voice end-to-end fonctionnel | 🟡 50 % |
| Brain V8 (TS pkg) | 13 modules + tests >70 % coverage | 🟡 squelette posé |
| Parent dashboard | Login + onboarding + live monitor | 🟡 70 % (Lovable) |
| RGPD-K | Politique + export user + delete | 🔴 à faire |

## Q3 2026 (juillet–septembre)

**Thème : MVP fonctionnel pour 20 familles testeurs.**

- Wi-Fi onboarding firmware (BLE-prov ou WPS).
- 5 packs de contenu (gratuit + 4 premium).
- Push notifs parent (alertes SafeGuard niveau 3-4).
- 20 familles testeurs en France (dogfood interne + amis-famille).
- Telemetry minimale (latence, niveau safety, NPS in-app).

## Q4 2026 (octobre–décembre)

**Thème : closed beta 100 familles.**

- Store complet (50 packs, paiement intégré).
- Mode "story arc" (Brain V8 §6 orchestration).
- Proactive engine activé (initiatives Bobby).
- Mode multilingue FR/EN/ES (TTS multivoice).
- Closed beta 100 familles France + Belgique.

## Q1 2027 (jan–mars)

**Thème : préparer le hardware custom.**

- Audit Watcher : limites identifiées, BOM custom étudié.
- Premier prototype PCB ESP32-S3 maison.
- Brain V8 V8.1 : Relationship memory persistant, inside jokes.
- Mise en place de SOC2 / RGPD compliance audit (préparation).

## Q2 2027 (avril–juin)

**Thème : open beta.**

- Hardware custom v1 (~30€ BOM, 100 unités pilote).
- Open beta : 1000 familles France + EU.
- App store iOS + Play Store (PWA TWA en attendant native).
- Bilingue parfaitement maîtrisé.

## Long terme (Q3 2027+)

- Lancement commercial France.
- Levée Série A (préparée Q4 2027).
- Multi-langues 5+.
- SDK tiers (jouets, livres connectés).
- Hardware V2 : mute physique, capteur de mood, batterie 1 semaine.

## Hors scope (pour l'instant)

- Apps gaming connectées.
- Robot mobile.
- AR / VR.
- Marché US (RGPD/COPPA mismatch).

---

Voir [`../architecture/decisions/`](../architecture/decisions/) pour les décisions structurelles, et [`./metrics.md`](./metrics.md) pour les KPIs de suivi (à venir).
