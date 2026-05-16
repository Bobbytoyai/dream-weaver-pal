# ADR-005 — Watcher W1-A comme hardware MVP

- **Statut** : Accepté
- **Date** : 2026-05-16
- **Tags** : hardware, firmware

## Contexte

Le produit final visé est un compagnon physique pour enfant : écran rond, micro, haut-parleur, Wi-Fi, batterie. Pour valider l'expérience avant un hardware custom, on a besoin d'un device "good enough" maintenant.

Options :
- **Custom PCB ESP32-S3 + écran + DAC + mic** — 6-9 mois, 50k€+ NRE.
- **Raspberry Pi + écran SPI + USB mic** — encombrant, batterie absurde.
- **SenseCAP Watcher W1-A** — ESP32-S3 + LCD 412×412 rond + micro + speaker + Wi-Fi + batterie, disponible en commande, ~100€/u.

## Décision

Le **SenseCAP Watcher W1-A** est le hardware du MVP, le temps de valider l'usage et le brain V8 sur device réel.

Le firmware (`firmware/watcher/`) est écrit en ESP-IDF 5.2 + LVGL 9, structuré en composants Bobby (`bobby_face`, `bobby_touch`, `bobby_knob`, etc.) pour pouvoir être porté plus tard sur hardware custom.

## Conséquences

**Positives**
- Time-to-prototype : semaines, pas mois.
- BOM identifié, support communauté Seeed.
- Stack ESP-IDF + LVGL transférable sur un hardware custom ESP32-S3.

**Négatives**
- Form factor non final (montre, pas compagnon dédié).
- TouchScreen propriétaire (CHSC6540) sans datasheet public — risque sur la commercialisation.
- Stock Seeed limité pour scale au-delà de quelques milliers d'unités.

## Suivi

À reconsidérer dès que :
- L'usage produit est validé (> 200 utilisateurs réguliers).
- Le BOM custom est sourçable < 40€.
