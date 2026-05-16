# firmware/watcher — SenseCAP Watcher W1-A

Firmware ESP-IDF 5.2.1 + LVGL 9.2.2 pour le Watcher W1-A.

## Hardware

| Composant | Référence | Adresse / GPIO |
|-----------|-----------|----------------|
| MCU | ESP32-S3 | — |
| LCD | SPD2010 QSPI 412×412 rond | dédié |
| Touch | CHSC6540 (TBD) | I²C @ 0x14 |
| IO expander | PCA9535 | I²C @ 0x21 |
| Wheel button | sur PCA9535 P03 | bit 0x0008 |
| LCD reset | PCA9535 P06 | **partagé avec touch reset** — ne pas pulser |

## Composants Bobby

```
components/
├── bobby_display/    # init LCD, PCA9535 power, helpers I/O
├── bobby_face/       # dot-matrix face renderer (violet #9333EA)
├── bobby_touch/      # touch driver (register dump diagnostic mode)
├── bobby_knob/       # wheel button driver (PCA9535 polling 30 Hz)
├── bobby_boot_screen/# boot animation (pulse → BOBBY → bonjour)
├── bobby_parent/     # dashboard parent 8 pages (one-shot demo)
├── bobby_child_menu/ # 4 tuiles menu enfant
├── bobby_wifi/       # (à venir) STA + provisionning
├── bobby_audio/      # (à venir) mic 16k + speaker via I²S
└── bobby_api/        # (à venir) client HTTPS vers /v1/voice
```

## Quick start

```bash
# Build + flash + monitor
./tools/scripts/bobby.sh quick

# Sub-commandes
./tools/scripts/bobby.sh doctor    # vérif env IDF + ports USB
./tools/scripts/bobby.sh sync      # régénère sdkconfig si .defaults plus récent
./tools/scripts/bobby.sh build
./tools/scripts/bobby.sh flash
./tools/scripts/bobby.sh monitor
./tools/scripts/bobby.sh erase
./tools/scripts/bobby.sh all       # erase + build + flash + monitor
```

Le script auto-détecte les ports USB du Watcher (CDC `cu.usbmodem...013`, JTAG `cu.usbmodem...011`) et retry sur 4 configurations de reset/baud.

## Mémoire

| Setting | Valeur | Pourquoi |
|---------|--------|----------|
| `CONFIG_LV_MEM_SIZE_KILOBYTES` | 192 | Évite `lv_malloc` NULL sous 50+ widgets |
| `CONFIG_FREERTOS_HZ` | 1000 | Reactivité touch + audio |
| PSRAM | activée | LCD framebuffer + LVGL |

## QA

Voir [`QA.md`](./QA.md) — checklist manuelle avant chaque release firmware.

## Roadmap

- Stabilisation Watcher (LCD + touch + wheel) — **DONE**
- Wi-Fi onboarding + HTTP /v1/voice — en cours
- Audio I²S capture + streaming — à venir
- OTA update signé — à venir
- Mute physique hardware (V2) — à venir
