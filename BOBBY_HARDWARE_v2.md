# BOBBY HARDWARE ARCHITECTURE & COMPONENTS SPECIFICATION v2.0
## Bobby Hardware Engineering & Production System

**Version:** 2.0  
**Date:** 2026-04-12  
**Status:** Production-Ready MVP Specification  
**Target Cost:** 15€–30€ (production volume 10k units)  
**Camera Integration:** Facial Recognition Module (OV2640 / HM01B0)

---

## TABLE OF CONTENTS

1. [Vue d'Ensemble Système](#1-vue-densemble-système)
2. [Architecture Électronique Globale — Schéma ASCII](#2-architecture-électronique-globale--schéma-ascii)
3. [SoC Principal — ESP32-S3](#3-soc-principal--esp32-s3)
4. [Microphones MEMS Duaux — INMP441](#4-microphones-mems-duaux--inmp441)
5. [Amplificateur & Haut-Parleur](#5-amplificateur--haut-parleur)
6. [Écran LCD IPS Round 240×240](#6-écran-lcd-ips-round-240240)
7. [Caméra Facial Recognition — OV2640 / HM01B0](#7-caméra-facial-recognition--ov2640--hm01b0)
8. [Gestion d'Alimentation](#8-gestion-dalimentation)
9. [Connectivité & Stockage](#9-connectivité--stockage)
10. [Interface Physique — LED RGB & Bouton](#10-interface-physique--led-rgb--bouton)
11. [PCB Design & Layout Guidance](#11-pcb-design--layout-guidance)
12. [Pipeline Audio — Optimisation](#12-pipeline-audio--optimisation)
13. [Gestion Thermique & Sécurité](#13-gestion-thermique--sécurité)
14. [Protocole de Test & Validation](#14-protocole-de-test--validation)
15. [Recommandations Manufacturing & Production](#15-recommandations-manufacturing--production)

---

## 1. VUE D'ENSEMBLE SYSTÈME

### 1.1 Philosophie de Design

Bobby est un compagnon éducatif IA offline-first pour enfants de 3 à 10 ans. Le hardware doit:
- **Opérer en autonomie complète** sans cloud (mode offline total)
- **Répondre en < 100ms** pour les intents simples, < 1.5s pour IA complète
- **Résister aux enfants** — chutes 1m, liquides, morsures
- **Durer 8h+** sur batterie en usage actif
- **Reconnaître l'enfant** via caméra faciale pour personnalisation

### 1.2 Blocs Fonctionnels

```
┌─────────────────────────────────────────────────────────────────┐
│                        BOBBY SYSTEM v2.0                        │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ CAPTURE  │  │  BRAIN   │  │  OUTPUT  │  │    POWER     │  │
│  │          │  │          │  │          │  │              │  │
│  │ 2× MEMS  │  │ ESP32-S3 │  │ Speaker  │  │ Li-ion 3Ah  │  │
│  │   Mic    │──│  (MCU +  │──│  3W +    │  │ + USB-C PD  │  │
│  │ Camera   │  │  AI NPU) │  │ LCD 240  │  │ + PMIC      │  │
│  │ OV2640   │  │ 16MB RAM │  │ LED RGB  │  │ IP40        │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Spécifications Cibles

| Paramètre             | Cible MVP              | Cible v2.0           |
|-----------------------|------------------------|----------------------|
| SoC                   | ESP32-S3-WROOM-2-N16R8 | ESP32-S3 + coprocessor |
| RAM                   | 8MB PSRAM interne      | 16MB PSRAM externe   |
| Flash                 | 16MB interne           | 16MB + 128MB QSPI    |
| CPU                   | Xtensa LX7 dual @ 240MHz | idem               |
| Wi-Fi                 | 802.11 b/g/n 2.4GHz    | idem                 |
| BT                    | BLE 5.0                | idem                 |
| Autonomie             | 6h actif / 72h veille  | 8h actif / 96h veille|
| Latence offline       | < 100ms                | < 80ms               |
| Latence online        | < 1.5s                 | < 1.0s               |
| Coût BOM (10k)        | 18€–22€                | 22€–28€              |
| IP Rating             | IP40                   | IP54                 |

---

## 2. ARCHITECTURE ÉLECTRONIQUE GLOBALE — SCHÉMA ASCII

```
══════════════════════════════════════════════════════════════════════════════
                    BOBBY v2.0 — SCHÉMA ÉLECTRONIQUE COMPLET
══════════════════════════════════════════════════════════════════════════════

 USB-C PORT (J1)                    BATTERIE Li-ion 3.7V / 3000mAh
     │                                         │
     │ VBUS 5V                                 │ VBAT
     ▼                                         ▼
 ┌──────────────────────────────────────────────────────┐
 │              TP4056 + DW01A (U4)                    │
 │        Charge Management + Protection                │
 │  CHRG LED ─── R47 ─── LED_R (D3)                   │
 │  STDBY LED ─── R48 ─── LED_G (D4)                   │
 │  VOUT ─────────────────────────────────────────────┐ │
 └────────────────────────────────────────────────────│─┘
                                                      │ VBAT_PROT (3.0V–4.2V)
                                                      │
 ┌────────────────────────────────────────────────────▼──────────────┐
 │                      TPS63020 (U5)                                │
 │              Buck-Boost Converter 3.3V / 1A                       │
 │   EN ──── GPIO46 (ESP32-S3)     VIN: 2.5V–5.5V → VOUT: 3.3V    │
 │   PG ──── GPIO47 (Power Good)   η = 96%                          │
 └──────────────────────────────┬────────────────────────────────────┘
                                │ VCC_3V3 (rail principal)
                    ┌───────────┼──────────────────────────────┐
                    │           │                              │
                    ▼           ▼                              ▼
         ┌──────────────┐  ┌───────────────┐       ┌──────────────────┐
         │  LDO AMS1117 │  │  LDO AP2112K  │       │  LDO MIC 1.8V   │
         │   2.8V/300mA │  │  1.8V/600mA   │       │  XC6206 1.8V    │
         │  (Camera VDD)│  │  (ESP32 core) │       │  (MEMS bias)    │
         └──────┬───────┘  └──────┬────────┘       └────────┬─────────┘
                │ V2V8            │ V1V8                     │ VMIC
                │                 │                          │
══════════════════════════════════════════════════════════════════════════════
                              ESP32-S3 (U1)
                    ESP32-S3-WROOM-2-N16R8 (16MB Flash, 8MB PSRAM)
══════════════════════════════════════════════════════════════════════════════

                    ┌─────────────────────────────────────┐
                    │            ESP32-S3 DIE              │
     V1V8 ─────────│ VDD_SDIO (3.3V via LDO)             │
     VCC_3V3 ───── │ VDD3P3_CPU                           │
     GND ──────────│ GND (multiple pins)                  │
                   │                                      │
                   │  ┌──────────────────────────────┐   │
                   │  │         I2S BUS 0             │   │── GPIO0 (BCLK)
                   │  │      Microphones MEMS         │   │── GPIO1 (WS/LRCLK)
                   │  │   INMP441 L + INMP441 R       │   │── GPIO2 (DATA_IN)
                   │  └──────────────────────────────┘   │
                   │                                      │
                   │  ┌──────────────────────────────┐   │── GPIO4 (I2S BCLK OUT)
                   │  │         I2S BUS 1             │   │── GPIO5 (I2S WS OUT)
                   │  │   MAX98357A Amplifier          │   │── GPIO6 (I2S DATA OUT)
                   │  └──────────────────────────────┘   │── GPIO7 (AMP SD/MUTE)
                   │                                      │
                   │  ┌──────────────────────────────┐   │── GPIO10 (SPI MOSI)
                   │  │         SPI BUS (VSPI)        │   │── GPIO11 (SPI MISO)
                   │  │   GC9A01A LCD 240×240         │   │── GPIO12 (SPI CLK)
                   │  └──────────────────────────────┘   │── GPIO13 (LCD CS)
                   │                                      │── GPIO14 (LCD DC)
                   │                                      │── GPIO15 (LCD RST)
                   │                                      │── GPIO16 (LCD BL/PWM)
                   │  ┌──────────────────────────────┐   │
                   │  │    CAMERA DVP/SPI Interface   │   │── GPIO17 (CAM XCLK)
                   │  │    OV2640 / HM01B0            │   │── GPIO18 (CAM PCLK)
                   │  └──────────────────────────────┘   │── GPIO19 (CAM VSYNC)
                   │                                      │── GPIO20 (CAM HREF)
                   │                                      │── GPIO21 (CAM D0)
                   │                                      │── GPIO26 (CAM D1)
                   │                                      │── GPIO27 (CAM D2)
                   │                                      │── GPIO28 (CAM D3)
                   │  ┌──────────────────────────────┐   │
                   │  │         I2C BUS               │   │── GPIO8 (I2C SDA)
                   │  │   SCCB Camera + Temp sensor   │   │── GPIO9 (I2C SCL)
                   │  └──────────────────────────────┘   │
                   │                                      │
                   │  ┌──────────────────────────────┐   │── GPIO35 (LED_R PWM)
                   │  │      LED RGB WS2812B          │   │── GPIO36 (LED_G PWM)
                   │  └──────────────────────────────┘   │── GPIO37 (LED_B PWM)
                   │                                      │
                   │  ┌──────────────────────────────┐   │── GPIO38 (BTN_MAIN)
                   │  │    Bouton Principal            │   │
                   │  └──────────────────────────────┘   │
                   │                                      │── GPIO45 (UART_TX)
                   │  ┌──────────────────────────────┐   │── GPIO46 (UART_RX)
                   │  │   Debug UART / OTA            │   │── GPIO47 (POWER_GOOD)
                   │  └──────────────────────────────┘   │── GPIO48 (BATT_ADC)
                   └─────────────────────────────────────┘

══════════════════════════════════════════════════════════════════════════════
                         COMPOSANTS PÉRIPHÉRIQUES
══════════════════════════════════════════════════════════════════════════════

 MICROPHONE GAUCHE (U2)                MICROPHONE DROIT (U3)
 ┌─────────────────────┐              ┌─────────────────────┐
 │     INMP441         │              │     INMP441         │
 │  I2S MEMS Mic       │              │  I2S MEMS Mic       │
 │  VDD ── VMIC 1.8V   │              │  VDD ── VMIC 1.8V   │
 │  GND ── GND         │              │  GND ── GND         │
 │  SD  ── GPIO2       │              │  SD  ── GPIO2       │
 │  SCK ── GPIO0       │              │  SCK ── GPIO0       │
 │  WS  ── GPIO1       │              │  WS  ── GPIO1       │
 │  L/R ── GND (L)     │              │  L/R ── VDD (R)     │
 └─────────────────────┘              └─────────────────────┘
  Position: avant-gauche                Position: avant-droite
  Angle: 45° vers l'enfant              Angle: 45° vers l'enfant

 AMPLIFICATEUR (U6)                    CAMÉRA (U7)
 ┌─────────────────────┐              ┌─────────────────────┐
 │    MAX98357A        │              │     OV2640          │
 │  I2S Class-D Amp    │              │  2MP CMOS Camera    │
 │  VDD ── VCC_3V3     │              │  VCC ── V2V8        │
 │  GND ── GND         │              │  DVDD ── V1V8       │
 │  BCLK ── GPIO4      │              │  XCLK ── GPIO17     │
 │  LRCLK── GPIO5      │              │  PCLK ── GPIO18     │
 │  DIN ── GPIO6       │              │  VSYNC── GPIO19     │
 │  SD  ── GPIO7       │              │  HREF ── GPIO20     │
 │  GAIN── GND (9dB)   │              │  D[0:3]── GPIO21-28 │
 │  OUT+── Speaker+    │              │  SDA ── GPIO8       │
 │  OUT-── Speaker-    │              │  SCL ── GPIO9       │
 └─────────────────────┘              │  RESET── GPIO3      │
  Haut-parleur: 3W / 4Ω / 87dB SPL   │  PWDN ── GPIO33     │
  Filtre LC: L=2.2µH + C=220nF       └─────────────────────┘
                                        FOV: 66°, f/2.0
                                        Position: avant-centre

 ÉCRAN LCD (U8)                        LED RGB (D1)
 ┌─────────────────────┐              ┌─────────────────────┐
 │     GC9A01A         │              │     WS2812B         │
 │  Round IPS 240×240  │              │  Addressable RGB    │
 │  VCC ── VCC_3V3     │              │  VDD ── VCC_3V3     │
 │  GND ── GND         │              │  GND ── GND         │
 │  MOSI── GPIO10      │              │  DIN ── GPIO35      │
 │  CLK ── GPIO12      │              └─────────────────────┘
 │  CS  ── GPIO13      │               Dissipateur: 20mm²
 │  DC  ── GPIO14      │               Intensité max: 20mA/ch
 │  RST ── GPIO15      │
 │  BL  ── GPIO16(PWM) │  BOUTON PRINCIPAL (SW1)
 └─────────────────────┘  ┌─────────────────────┐
  Diagonal: 1.28"         │   SKRPACE010        │
  Refresh: 60Hz           │  Tactile SMD 4×4mm  │
  Backlight: 40mA max     │  GPIO38 ── GND      │
  Viewing: 160°           │  R pull-up: 10kΩ    │
                          └─────────────────────┘
══════════════════════════════════════════════════════════════════════════════
```

---

## 3. SoC PRINCIPAL — ESP32-S3

### 3.1 Référence Exacte

**ESP32-S3-WROOM-2-N16R8**
- CPU: Xtensa® LX7 dual-core 32-bit @ 240 MHz
- SRAM: 512 KB interne
- PSRAM: 8 MB OSPI interne (montée sur module)
- Flash: 16 MB interne (Quad SPI)
- Wi-Fi: 802.11 b/g/n @ 2.4 GHz, WPA3
- Bluetooth: BLE 5.0 + BT Classic
- GPIO: 45 pins
- ADC: 2× SAR 12-bit, 20 canaux
- Interface caméra: DVP 8-bit + SCCB (I2C-compatible)
- I2S: 2× full-duplex
- SPI: 4× SPI masters
- NPU: Absent — traitement IA via optimisation SIMD LX7

### 3.2 Justification du Choix

| Critère          | ESP32-S3       | RPi Zero 2W    | Qualcomm RB3   |
|------------------|----------------|----------------|----------------|
| Prix unité       | 3.50€          | 15€            | 45€+           |
| Démarrage        | 0.3s           | 8s (Linux)     | 12s (Linux)    |
| Conso active     | 240mA          | 350mA          | 850mA          |
| Conso veille     | 2mA            | 80mA           | 200mA          |
| Offline ML       | TFLite Micro   | TFLite full    | Snapdragon NPU |
| Camera support   | DVP 8-bit      | USB/CSI        | CSI-2          |
| BLE natif        | ✅             | Option externe | Option externe |
| Complexité SW    | Faible         | Haute (Linux)  | Très haute     |
| **Verdict MVP**  | **✅ Optimal** | ❌ Trop lourd  | ❌ Trop cher   |

### 3.3 Firmware Structure

```
firmware/
├── main/
│   ├── main.c               ← Entry point, FreeRTOS task init
│   ├── audio_pipeline.c     ← I2S capture + DSP + TTS playback
│   ├── ai_inference.c       ← TFLite Micro model runner
│   ├── camera_face.c        ← OV2640 capture + face detect
│   ├── intent_detect.c      ← Offline intent matching (C port)
│   ├── wifi_manager.c       ← Wi-Fi + OTA
│   ├── ble_hid.c            ← BLE pairing/control
│   ├── power_manager.c      ← Sleep modes, battery ADC
│   └── led_controller.c     ← WS2812B animations
├── components/
│   ├── esp_tflite_micro/    ← TensorFlow Lite Micro
│   ├── esp_wake_word/       ← "Hey Bobby" wake word
│   ├── esp_camera/          ← Camera driver
│   ├── esp_lcd/             ← GC9A01A driver
│   └── esp_codec_dev/       ← I2S audio codec
└── models/
    ├── wake_word.tflite     ← 50KB wake word model
    ├── face_detect.tflite   ← 80KB MobileNet-SSD
    └── intent_tiny.tflite   ← 120KB intent classifier
```

### 3.4 Pinout Complet ESP32-S3

| GPIO | Fonction          | Composant      | Remarque                    |
|------|-------------------|----------------|-----------------------------|
| 0    | I2S0_BCLK         | INMP441        | Horloge bit microphones     |
| 1    | I2S0_WS           | INMP441        | Horloge mot L/R             |
| 2    | I2S0_DIN          | INMP441        | Données microphones         |
| 3    | CAM_RESET         | OV2640         | Reset caméra actif bas      |
| 4    | I2S1_BCLK         | MAX98357A      | Horloge bit speaker         |
| 5    | I2S1_WS           | MAX98357A      | Horloge mot speaker         |
| 6    | I2S1_DOUT         | MAX98357A      | Données audio sortie        |
| 7    | AMP_SD            | MAX98357A      | Mute/activer ampli          |
| 8    | I2C_SDA           | OV2640 SCCB    | Registres caméra            |
| 9    | I2C_SCL           | OV2640 SCCB    | Horloge I2C                 |
| 10   | SPI_MOSI          | GC9A01A        | Données LCD                 |
| 11   | SPI_MISO          | —              | Non connecté (LCD write-only)|
| 12   | SPI_CLK           | GC9A01A        | Horloge LCD 40MHz           |
| 13   | LCD_CS            | GC9A01A        | Chip select LCD             |
| 14   | LCD_DC            | GC9A01A        | Data/Command                |
| 15   | LCD_RST           | GC9A01A        | Reset LCD                   |
| 16   | LCD_BL            | Backlight MOSFET| PWM dimming                |
| 17   | CAM_XCLK          | OV2640         | Horloge source 20MHz        |
| 18   | CAM_PCLK          | OV2640         | Pixel clock sortie caméra   |
| 19   | CAM_VSYNC         | OV2640         | Synchro verticale           |
| 20   | CAM_HREF          | OV2640         | Référence horizontale       |
| 21   | CAM_D0            | OV2640         | Bit donnée 0                |
| 26   | CAM_D1            | OV2640         | Bit donnée 1                |
| 27   | CAM_D2            | OV2640         | Bit donnée 2                |
| 28   | CAM_D3            | OV2640         | Bit donnée 3                |
| 33   | CAM_PWDN          | OV2640         | Power down caméra           |
| 35   | LED_DATA          | WS2812B        | Signal NZR LED              |
| 38   | BTN_MAIN          | SW1            | Pull-up 10kΩ, actif bas     |
| 45   | UART_TX           | Debug header   | 115200 baud                 |
| 46   | UART_RX           | Debug header   | 115200 baud                 |
| 47   | POWER_GOOD        | TPS63020 PG    | Input power OK              |
| 48   | BATT_ADC          | Voltage div.   | 100kΩ/100kΩ → VBAT/2        |

---

## 4. MICROPHONES MEMS DUAUX — INMP441

### 4.1 Référence & Specs

**InvenSense INMP441** — I2S MEMS Omnidirectional Microphone

| Paramètre          | Valeur                    |
|--------------------|---------------------------|
| Interface          | I2S (24-bit)              |
| Alimentation       | 1.8V – 3.3V (typ. 1.8V)  |
| SNR                | 61 dB(A)                  |
| Sensibilité        | −26 dBFS (1 kHz, 94 dBSPL)|
| THD                | 1% à 120 dBSPL            |
| Fréquence −3dB     | 60 Hz – 15 kHz            |
| Consommation       | 1.4 mA active, 5µA PDM   |
| Package            | SMD 3.76×4.72×1.3mm       |
| Prix (1k)          | 0.85€                     |

### 4.2 Configuration Dual-Microphone

```
Microphone GAUCHE (U2):
  L/R pin → GND     (canal gauche, WS=LOW → capture)

Microphone DROIT (U3):
  L/R pin → VDD     (canal droit, WS=HIGH → capture)

Les deux partagent: SCK (GPIO0), WS (GPIO1), SD (GPIO2)
→ TDM I2S: Left puis Right dans le même flux 24-bit

Placement physique:
  ┌──────────────────────────────────┐
  │          FACE BOBBY              │
  │  MIC_L ●              ● MIC_R   │
  │  (45° gauche)    (45° droite)   │
  │                                  │
  │          ● Caméra ●              │
  │              ●                   │
  │           Bouton                 │
  └──────────────────────────────────┘
  Distance inter-mic: 50mm (beamforming optimal 300Hz–3kHz)
```

### 4.3 Pipeline DSP Microphone

```
Capture I2S 48kHz/24-bit
        │
        ▼
DC Offset Removal (IIR HP 20Hz)
        │
        ▼
Beamforming MVDR (Minimum Variance Distortionless Response)
  → Focus faisceau sur direction parole (±30°)
        │
        ▼
AEC (Acoustic Echo Cancellation)
  → Soustraction signal speaker (référence I2S1_OUT)
        │
        ▼
Noise Gate (−40dBFS seuil)
        │
        ▼
AGC (Automatic Gain Control, target −18dBFS)
        │
        ▼
Downsample 48kHz → 16kHz (Google STT format)
        │
        ▼
Whisper.cpp / Vosk (STT offline)
```

### 4.4 Filtres Anti-Bruit Hardware

- **Condensateurs découplage VDD**: 100nF + 10µF MLCC sur chaque INMP441
- **Plan de masse dédié** sous les mics (isolation du SoC)
- **Grille acoustique**: maillage 0.3mm, surface > 1mm²
- **Cavité acoustique**: volume 50mm³ minimum derrière chaque mic

---

## 5. AMPLIFICATEUR & HAUT-PARLEUR

### 5.1 MAX98357A — Amplificateur I2S Class-D 3W

| Paramètre          | Valeur                    |
|--------------------|---------------------------|
| Interface          | I2S (16/24/32-bit)        |
| Alimentation       | 2.5V – 5.5V               |
| Puissance sortie   | 3.2W @ 4Ω, 5V (10% THD)  |
| Efficacité         | 89% @ pleine puissance    |
| THD+N              | 0.015% @ 1W               |
| SNR                | 99 dB                     |
| Gain pin           | 3dB/6dB/9dB/12dB/15dB    |
| Package            | TQFN-16 (3×3mm)           |
| Prix (1k)          | 1.20€                     |

### 5.2 Configuration Gain

```
SD/MODE pin:
  GND         → Gain 9 dB (recommandé enfants)
  1MΩ to GND  → Gain 12 dB
  100kΩ to GND→ Gain 15 dB
  VDD         → Gain 3 dB
  1MΩ to VDD  → Gain 6 dB
```

**Recommandation Bobby**: Gain 9 dB (SD=GND), niveau max limité software à 75 dB(A) @ 30cm pour protection auditive enfants (norme EN 71-1).

### 5.3 Haut-Parleur

**Référence**: KEPO SP0826F-1 (ou équivalent)

| Paramètre          | Valeur                    |
|--------------------|---------------------------|
| Diamètre           | 28mm ou 36mm              |
| Impédance          | 4Ω ± 15%                 |
| Puissance nominale | 2W                        |
| Puissance max      | 3W (instantané)           |
| Sensibilité        | 87 dB SPL @ 1W/1m        |
| Réponse fréq.      | 300 Hz – 18 kHz (−10dB)  |
| Résonance          | f0 ≈ 650 Hz               |
| Prix (1k)          | 0.60€                     |

### 5.4 Filtre LC Output (Obligatoire Classe-D)

```
MAX98357A OUT+ ──── L1 (2.2µH, Isat≥1A) ──── Speaker+
MAX98357A OUT- ──── L2 (2.2µH, Isat≥1A) ──── Speaker-
                         │           │
                        C1          C2
                       220nF       220nF
                         │           │
                        GND         GND

Fréquence de coupure: fc = 1/(2π√LC) ≈ 72 kHz
→ Élimine switching 2.4 MHz du Class-D
→ Améliore compatibilité EMI (norme EN 55032)
```

### 5.5 Protection Thermique Ampli

- Résistance thermique MAX98357A: θja = 43°C/W
- Puissance dissipée @ 2W: ~220mW (η=89%)
- Élévation température: ΔT = 220mW × 43 = 9.5°C
- Température max boîtier ambient 40°C: Tj = 49.5°C ✅ (max 125°C)

---

## 6. ÉCRAN LCD IPS ROUND 240×240

### 6.1 Référence: GC9A01A — 1.28" Round IPS

| Paramètre          | Valeur                    |
|--------------------|---------------------------|
| Diagonale          | 1.28" (32.5mm)            |
| Résolution         | 240 × 240 pixels          |
| Interface          | SPI 4-wire                |
| Fréquence SPI      | 40 MHz max                |
| Tension VCC        | 3.3V                      |
| Backlight          | 3 LEDs blanches, 40mA     |
| Viewing angle      | 160°                      |
| Refresh rate       | 60 Hz                     |
| Prix (1k)          | 1.80€                     |

### 6.2 Contrôle Backlight PWM

```c
// GPIO16 → MOSFET Si2302 → LED anode
// Fréquence PWM: 1kHz (évite flicker visible < 100Hz)
// Duty cycle → luminosité (0–255)

// Niveaux automatiques:
#define BRIGHT_ACTIVE    200  // 78% — usage normal
#define BRIGHT_IDLE      80   // 31% — après 30s inactivité  
#define BRIGHT_DIM       20   // 8%  — après 2min
#define BRIGHT_OFF       0    // 0%  — veille profonde

// Courbe gamma corrigée pour perception linéaire
uint8_t gamma_table[256] = { /* LUT CIE 1931 */ };
```

### 6.3 Animations Bobby

| État              | Animation LCD                    | LED RGB        |
|-------------------|----------------------------------|----------------|
| Veille            | Yeux fermés, respiration douce   | Bleu pulsé 4s  |
| Écoute            | Yeux ouverts, anneau ondes mic   | Vert pulsé     |
| Réflexion         | Yeux mobiles, points animés      | Blanc tournant |
| Réponse           | Bouche animée (lip sync TTS)     | Jaune stable   |
| Émotion positive  | Yeux en étoile, joues roses      | Rose pulsé     |
| Émotion triste    | Yeux tombants, larme             | Bleu lent      |
| Erreur/Bloqué     | Croix, secouement tête           | Rouge court    |
| Chargement        | Barre progression circulaire     | Blanc tournant |

---

## 7. CAMÉRA FACIAL RECOGNITION — OV2640 / HM01B0

### 7.1 Choix du Module Caméra

**Option A — OV2640** (Recommandé MVP, rapport qualité/prix)

| Paramètre          | Valeur                    |
|--------------------|---------------------------|
| Capteur            | OmniVision OV2640         |
| Résolution max     | 1600×1200 (UXGA) 2MP      |
| Résolution face    | 320×240 (QVGA) @ 30fps    |
| Interface          | DVP 8-bit + SCCB          |
| Alimentation       | 2.8V (analog), 1.8V (I/O) |
| Consommation       | 125mA active, 10µA sleep  |
| Format             | YUV422, RGB565, JPEG       |
| FOV                | 66° diagonal               |
| Ouverture          | f/2.0                     |
| Mise au point      | Fixe (40cm–∞)             |
| Prix (1k)          | 2.50€                     |

**Option B — HM01B0** (Ultra-basse conso, reconnaissance rapide)

| Paramètre          | Valeur                    |
|--------------------|---------------------------|
| Capteur            | Himax HM01B0              |
| Résolution         | 320×240 (QVGA) fixe       |
| Interface          | DVP 4-bit + I2C           |
| Alimentation       | 1.8V–3.3V                 |
| Consommation       | **2mA active, 1µA sleep** |
| FOV                | 66° diagonal               |
| Prix (1k)          | 3.80€                     |
| Avantage           | Idéal si caméra toujours active |

**Recommandation**: OV2640 pour MVP (plus répandu, drivers ESP32 matures).

### 7.2 Pipeline Reconnaissance Faciale

```
┌────────────────────────────────────────────────────────────┐
│                  FACIAL RECOGNITION PIPELINE               │
└────────────────────────────────────────────────────────────┘

1. CAPTURE
   OV2640 → QVGA 320×240 RGB565 @ 10fps (mode face detect)
   Activation: sur détection parole OU bouton pressé
   Durée capture: 500ms max (3–5 frames)

2. PRÉ-TRAITEMENT (ESP32-S3 PSRAM)
   RGB565 → Grayscale 160×120 (zoom central ROI)
   Normalisation: [0, 255] → [0.0, 1.0]
   Mémoire: 160×120×1 = 19.2 KB

3. DÉTECTION VISAGE
   Modèle: face_detection_front_128.tflite (80KB)
   Input: 128×128 grayscale
   Output: bounding box + confiance
   Latence: ~80ms sur LX7 @ 240MHz
   Seuil: confiance > 0.85

4. ALIGNEMENT & CROP
   Extraction ROI visage + resize → 48×48
   Normalisation landmarks (yeux, nez, bouche)

5. EMBEDDINGS
   Modèle: face_recognition_48.tflite (120KB)
   Input: 48×48 grayscale
   Output: vecteur 64 dimensions (float32)
   Latence: ~40ms

6. MATCHING (PSRAM)
   Comparaison cosine similarity vs profils enregistrés
   Seuil reconnaissance: similarité > 0.85
   Base max: 8 enfants (8 × 64 float = 2KB)
   Résultat: childId ou "unknown"

7. ACTIONS POST-RECONNAISSANCE
   → Chargement profil enfant reconnu
   → Personnalisation réponses Bobby
   → Log timestamp + confidence
   → Si "unknown": demander prénom (onboarding)

TOTAL LATENCE: ~200–300ms (détection → identification)
```

### 7.3 Schéma Connexion OV2640 ↔ ESP32-S3

```
OV2640 Module     ESP32-S3 GPIO        Description
─────────────────────────────────────────────────────
VCC (2.8V)   ──── LDO AMS1117-2.8V    Power analog
DVDD (1.8V)  ──── LDO XC6206-1.8V    Power digital
GND          ──── GND                 Masse
XCLK         ──── GPIO17 (LEDC PWM)  Horloge 20MHz entrée
PCLK         ──── GPIO18 (INPUT)     Pixel clock sortie
VSYNC        ──── GPIO19 (INPUT)     Synchro verticale
HREF         ──── GPIO20 (INPUT)     Référence horizontale
Y2 (D0)      ──── GPIO21 (INPUT)     Bit donnée 0 (MSB)
Y3 (D1)      ──── GPIO26 (INPUT)     Bit donnée 1
Y4 (D2)      ──── GPIO27 (INPUT)     Bit donnée 2
Y5 (D3)      ──── GPIO28 (INPUT)     Bit donnée 3 (LSB)
SIOC (SCL)   ──── GPIO9  (I2C SCL)  Config registres
SIOD (SDA)   ──── GPIO8  (I2C SDA)  Config registres
RESET        ──── GPIO3  (OUTPUT)   Reset actif bas
PWDN         ──── GPIO33 (OUTPUT)   Power down actif haut

Découp. VCC: 10µF + 100nF MLCC proche du module
Terminaison PCLK: 33Ω série (signal intégrité)
```

### 7.4 Enrôlement Facial (Onboarding)

```
PROCÉDURE D'ENRÔLEMENT:

1. Parent appuie bouton 3s → mode enrôlement
2. LED: Animation invitation (vert tournant)
3. LCD: "Regarde-moi !" + cercle guide
4. Capture 5 frames à 2fps
5. Sélection meilleure qualité (score net + frontalité)
6. Extraction embedding + stockage en PSRAM/Flash
7. App mobile: confirmation prénom de l'enfant
8. Liaison profil → childId (sync with cloud si dispo)

STOCKAGE FLASH:
  /profiles/<childId>/
    face_embedding.bin    (256 bytes, 64 float32)
    profile.json          (préférences, historique)
    thumbnail.rgb565      (48×48 preview)
```

### 7.5 Sécurité & Vie Privée

- **Jamais de stockage image brute** — uniquement embedding 64-dim
- **Embedding chiffré AES-256** dans Flash externe
- **Pas d'envoi cloud** des données biométriques
- **Suppression possible** via bouton 5s + confirmation parent
- **Conformité RGPD**: traitement local uniquement, mineur
- **LED caméra active**: LED rouge physique liée HW à XCLK (caméra visible)
- **Angle limité**: FOV 66°, portée 20–80cm (pas de surveillance longue distance)

---

## 8. GESTION D'ALIMENTATION

### 8.1 Convertisseur Principal — TPS63020

**Texas Instruments TPS63020** — Buck-Boost 3.3V / 1A

| Paramètre          | Valeur                    |
|--------------------|---------------------------|
| VIN range          | 2.5V – 5.5V               |
| VOUT               | 3.3V fixe (externe)       |
| Iout max           | 1.2A (boost), 2A (buck)   |
| Efficacité max     | 96% @ 3.3Vin→3.3Vout     |
| Ripple             | < 10mV @ 500mA            |
| Package            | VSON-10 (3×3mm)           |
| Prix (1k)          | 1.80€                     |

**Justification Buck-Boost**: La batterie Li-ion passe de 4.2V (chargée) à 3.0V (déchargée), tandis que VCC 3.3V est requise. Un simple LDO ne fonctionne pas quand VBAT < 3.3V. Le TPS63020 couvre toute la plage.

### 8.2 Gestionnaire Charge — TP4056

**TOPPOWER TP4056** — Charge LiPo/Li-ion 1A via USB-C

| Paramètre          | Valeur                    |
|--------------------|---------------------------|
| VIN                | 4.5V – 5.5V (USB-C VBUS)  |
| Courant charge     | Programmable 100mA–1000mA |
| Courant Bobby      | 500mA (R_PROG = 2kΩ)     |
| Précision VBAT     | 4.20V ± 1%                |
| Protection         | DW01A intégré (OVP,OCP,UVP)|
| LED état           | CHRG (rouge), STDBY (vert)|
| Package            | SOP-8                     |
| Prix (1k)          | 0.15€                     |

### 8.3 Budget Consommation par Mode

```
MODE ACTIF (pleine puissance):
  ESP32-S3 @ 240MHz Wi-Fi Tx:    250 mA
  MAX98357A @ 2W audio:          500 mA
  GC9A01A LCD:                    40 mA
  OV2640 caméra active:          125 mA
  INMP441 ×2:                      3 mA
  WS2812B LED RGB (blanc 50%):    30 mA
  PMIC + LDOs overhead:           20 mA
  ─────────────────────────────────────
  TOTAL ACTIF MAX:               968 mA ≈ 1.0 A
  Autonomie 3000mAh:          ≈ 3.0h (tous modules)

MODE CONVERSATION (typique):
  ESP32-S3 @ 240MHz Wi-Fi idle:  120 mA
  MAX98357A @ 0.5W audio:        130 mA
  GC9A01A LCD (dim 50%):          20 mA
  OV2640 standby:                 10 mA
  INMP441 ×2:                      3 mA
  WS2812B (couleur douce):        15 mA
  PMIC overhead:                  15 mA
  ─────────────────────────────────────
  TOTAL CONVERSATION:            313 mA
  Autonomie 3000mAh:          ≈ 8.2h ✅

MODE OFFLINE OPTIMISÉ:
  ESP32-S3 @ 160MHz BLE:          60 mA
  MAX98357A TTS local:             80 mA
  GC9A01A LCD (dim 30%):          12 mA
  OV2640 off:                       0 mA
  INMP441 ×2 (wakeword only):      3 mA
  WS2812B minimum:                  5 mA
  PMIC overhead:                   10 mA
  ─────────────────────────────────────
  TOTAL OFFLINE:                 170 mA
  Autonomie 3000mAh:          ≈ 15h ✅✅

MODE VEILLE LÉGÈRE:
  ESP32-S3 Light Sleep + BLE:     15 mA
  LCD off (backlight off):         2 mA
  INMP441 wake-word PDM:           1 mA
  Reste:                           2 mA
  ─────────────────────────────────────
  TOTAL VEILLE LÉGÈRE:            20 mA
  Autonomie 3000mAh:          ≈ 150h

MODE VEILLE PROFONDE:
  ESP32-S3 Deep Sleep + RTC:       0.5 mA
  OV2640 PWDN:                    10 µA
  ─────────────────────────────────────
  TOTAL VEILLE PROFONDE:          0.6 mA
  Autonomie 3000mAh:          ≈ 200 jours
```

### 8.4 Stratégie Power Management

```c
// États de puissance Bobby — Machine à états
typedef enum {
  POWER_ACTIVE,      // Toute conversation/jeu en cours
  POWER_CONV,        // Écoute + réponse (mode normal)
  POWER_OFFLINE,     // Sans Wi-Fi (économie)
  POWER_IDLE,        // Inactif > 30s (dim LCD)
  POWER_LIGHT_SLEEP, // Inactif > 3min (CPU réduit)
  POWER_DEEP_SLEEP,  // Inactif > 10min ou bouton long
} BobbyPowerState;

// Transitions automatiques:
// ACTIVE → CONV (fin TTS)
// CONV → IDLE (30s silence)
// IDLE → LIGHT_SLEEP (3min)
// LIGHT_SLEEP → DEEP_SLEEP (10min)
// ANY → ACTIVE (wakeword ou bouton)

// Wakeup depuis Deep Sleep:
// - GPIO38 (bouton) via RTC GPIO
// - Timer RTC toutes les 30min (sync état)
// - Seuil batterie critique → notification parent
```

### 8.5 Monitoring Batterie

```c
// ADC GPIO48 — Diviseur 100kΩ/100kΩ → VBAT/2
// VBAT_ADC = adc_read() * 3.3V / 4095 * 2
// Correction courant: VBAT_true = VBAT_ADC + I_load × 0.15Ω

float batteryPercent(float vbat) {
  // Courbe décharge Li-ion typique
  if (vbat >= 4.10) return 95.0f + (vbat-4.10)/0.10*5;
  if (vbat >= 3.90) return 75.0f + (vbat-3.90)/0.20*20;
  if (vbat >= 3.70) return 40.0f + (vbat-3.70)/0.20*35;
  if (vbat >= 3.50) return 15.0f + (vbat-3.50)/0.20*25;
  if (vbat >= 3.20) return  5.0f + (vbat-3.20)/0.30*10;
  if (vbat >= 3.00) return  1.0f;
  return 0.0f; // Coupure UVP
}

// Alertes:
// 20% → LED orange clignotante
// 10% → message vocal "Je suis fatigué, charge-moi !"
//  5% → Deep Sleep forcé
```

---

## 9. CONNECTIVITÉ & STOCKAGE

### 9.1 Wi-Fi

- **Standard**: 802.11 b/g/n @ 2.4 GHz intégré ESP32-S3
- **Antenne**: PCB trace antenna (incluse dans module WROOM)
- **Puissance Tx**: 20 dBm max (réglable 2–20 dBm)
- **Réception min**: −97 dBm @ 1 Mbps
- **WPA3**: Supporté (recommandé pour sécurité réseau domestique)
- **mDNS**: Découverte réseau automatique (bobby.local)
- **OTA**: Mise à jour firmware over-the-air via Wi-Fi

### 9.2 Bluetooth Low Energy

- **Standard**: BLE 5.0 intégré ESP32-S3
- **Profil**: BLE GATT custom + HID consumer
- **Rôle**: Couplage initial / app mobile / contrôle parent
- **Portée**: 10m indoor typique
- **Sécurité**: LE Secure Connections, bonding

### 9.3 USB-C

- **Connecteur**: USB-C 2.0 (USB 2.0 data + power)
- **Charge**: 5V/1A minimum, compatible 5V/2A USB-PD
- **Programmation**: UART via CH340C (composant US1, 0.30€)
- **OTG**: Non requis MVP
- **Position**: Dessous de la base (access facile, protection eau)
- **Gasket**: Joint silicone autour du port (IP40)

### 9.4 Stockage Flash Externe (Option)

Si 16MB Flash interne insuffisant pour modèles IA:

**W25Q128JV** — 128MB SPI Flash (Winbond)

| Paramètre          | Valeur                    |
|--------------------|---------------------------|
| Capacité           | 128 MB (16 MB × 8)        |
| Interface          | Quad SPI (QSPI) 133MHz    |
| Débit lecture      | 133 MB/s                  |
| Endurance          | 100,000 cycles erase      |
| Rétention          | > 20 ans @ 85°C           |
| Prix (1k)          | 0.55€                     |

---

## 10. INTERFACE PHYSIQUE — LED RGB & BOUTON

### 10.1 LED RGB — WS2812B

| Paramètre          | Valeur                    |
|--------------------|---------------------------|
| Type               | Addressable RGB            |
| Interface          | Single-wire NZR 800 Kbps  |
| Alimentation       | 3.5V – 5.3V (3.3V limité!)|
| Conso max          | 60mA (blanc 100%)         |
| Conso typique      | 5–20mA (couleurs douces)  |
| Angle lumineux     | 120°                      |
| Package            | SMD 5050 ou 3535          |
| Prix (1k)          | 0.08€                     |

**Note**: WS2812B spec 3.5V min. À 3.3V, utiliser un buffer level-shifter 74AHCT1G125 (GPIO35 → 3.3V→5V) ou utiliser WS2812C-2020 (compatible 3.3V).

**Alternative**: SK6805-SIDE (3.3V natif, packaging plus petit)

### 10.2 Bouton Principal

**ALPS SKRPACE010** — Tactile SMD 4×4mm

| Paramètre          | Valeur                    |
|--------------------|---------------------------|
| Force actuation    | 2.55 N                    |
| Course             | 0.25 mm                   |
| Durée de vie       | 300,000 cycles            |
| Package            | SMD 4×4×1.5mm             |
| Prix (1k)          | 0.12€                     |

**Fonctions multi-press Bobby:**

| Action            | Durée      | Fonction                         |
|-------------------|------------|----------------------------------|
| Press court       | < 0.5s     | Activation / Réponse             |
| Press double      | < 0.5s ×2  | Annuler / Recommencer            |
| Press long        | 2–4s       | Menu parent (volume, profil)     |
| Press très long   | > 5s       | Enrôlement facial / Reset profil |
| Press 3× rapide   | < 1s       | Mode urgence / Appel parent      |

---

## 11. PCB DESIGN & LAYOUT GUIDANCE

### 11.1 Spécifications PCB

```
Dimensions: 80mm × 60mm (2 couches, FR4 1.6mm)
Forme: Rectangle arrondi (r=5mm) ou circulaire Ø90mm
Épaisseur cuivre: 35µm (1oz) toutes couches
Surface finish: ENIG (Electroless Nickel Immersion Gold)
Mask: Vert (ou personnalisé marque Bobby)
Silkscreen: Blanc, 2 côtés
Min trace/espace: 0.1mm/0.1mm (JLCPCB/LCSC standard)
Via min: 0.2mm drill, 0.4mm pad
```

### 11.2 Layout Stratégique

```
╔══════════════════════════════════════════════════════╗
║                  PCB BOBBY v2.0 TOP                  ║
║                                                      ║
║  ┌──────┐  ┌──────────────────────┐  ┌──────────┐  ║
║  │TP4056│  │      ESP32-S3        │  │ GC9A01A  │  ║
║  │ U4   │  │       WROOM-2        │  │ LCD Conn │  ║
║  │CHARGE│  │      (U1 — center)   │  │  (J3)    │  ║
║  └──────┘  └──────────────────────┘  └──────────┘  ║
║  ┌──────┐                             ┌──────────┐  ║
║  │TPS630│  ┌────┐  ┌────┐  ┌──────┐  │ OV2640   │  ║
║  │ U5   │  │U2  │  │U3  │  │ U6   │  │ CAM Conn │  ║
║  │BUCK-B│  │MIC │  │MIC │  │MAX98 │  │  (J4)    │  ║
║  └──────┘  │ L  │  │ R  │  │357A  │  └──────────┘  ║
║            └────┘  └────┘  └──────┘                 ║
║  ┌──────┐  ┌──────────────────────┐  ┌──────────┐  ║
║  │USB-C │  │   BATTERY CONNECTOR  │  │   SW1    │  ║
║  │ J1   │  │       (J2)           │  │  BUTTON  │  ║
║  └──────┘  └──────────────────────┘  └──────────┘  ║
╚══════════════════════════════════════════════════════╝

ZONES CRITIQUES:
  🔴 ANALOG: Microphones + plan masse isolé
  🔵 RF: Antenne ESP32 dégagée (pas de Cu sous antenne!)
  🟡 POWER: PMIC + découplages groupés
  🟢 SIGNAL: Caméra + LCD côté opposé aux mics
```

### 11.3 Règles de Routage Audio

```
RÈGLES OBLIGATOIRES pour microphones MEMS:

1. Plan de masse solide sous U2/U3 (couche bottom)
   → Pas d'autre signal dans cette zone (50mm² par mic)

2. Traces I2S (GPIO0, GPIO1, GPIO2) routées ensemble
   → Maximum 50mm de longueur
   → Espacement ≥ 3× largeur trace (diaphonie)
   → Terminaison 33Ω série sur BCLK si > 30mm

3. VDD mics découplé localement:
   → 10µF MLCC + 100nF MLCC, < 1mm de chaque pin VDD

4. Aucun signal à haute fréquence (SPI LCD 40MHz, 
   caméra PCLK) dans rayon 20mm des mics

5. Trous d'aération acoustique PCB alignés avec 
   cavités boîtier mics (Ø1mm, cercle Ø5mm)

RÈGLES OBLIGATOIRES pour amplificateur Classe-D:

1. MAX98357A placé au plus proche du speaker connector
   → Traces OUT+ / OUT- < 20mm

2. Filtre LC (L1/L2, C1/C2) immédiatement après sortie
   → Inductances Murata LQM21FN (AEC-Q200)

3. GND étoile depuis GND MAX98357A (pas de loop)

4. Traces I2S speaker séparées des traces mics 
   (côtés opposés du board)
```

### 11.4 Intégrité Signal Caméra

```
OV2640 DVP 8-bit @ PCLK max 48MHz:

→ Longueur égale (length matching) D0–D3 : Δ < 1mm
→ Impédance contrôlée 50Ω (microstrip W=0.3mm sur FR4)
→ Via count minimum (idéalement 0 via sur ces traces)
→ Ground guard vias tous les 5mm le long des lignes DVP
→ Résistance de terminaison 33Ω série sur PCLK
→ Condensateurs découplage VCC caméra: 10µF + 100nF (MLCC X5R)
```

### 11.5 Considérations EMI/EMC

- **Antenne ESP32**: Zone libre de cuivre 5mm autour de l'antenne PCB trace (toutes couches)
- **Crystal keep-out**: Pas de trace haute-Z à moins de 3mm du quartz (si externe)
- **Ferrite bead**: L10 100Ω@100MHz sur VCC LED RGB (filtrage commutation)
- **Shields**: Cage RF optionnelle sur ESP32 si test FCC/CE requis
- **Classe EMI cible**: EN 55032 Class B (produit domestique)

---

## 12. PIPELINE AUDIO — OPTIMISATION

### 12.1 Architecture Logicielle Audio

```
FreeRTOS Tasks (priorités):

TaskAudioCapture  [Priority 22, Core 1]
  I2S DMA read ← INMP441 dual
  Buffer: 4096 samples @ 48kHz (85ms)
  → Queue xQueueSendFromISR

TaskWakeWord      [Priority 20, Core 1]
  Consomme buffer 16kHz/16-bit
  Modèle TFLite Micro: wake_word.tflite
  Latence: < 20ms
  → Trigger STT pipeline

TaskSTT           [Priority 18, Core 0]
  Vosk/Whisper.cpp 16kHz/16-bit
  Buffer accumulation 800ms
  VAD (Voice Activity Detection) silence < 600ms
  → String intent

TaskIntentDetect  [Priority 16, Core 0]
  Port C du detectOfflineIntent() TypeScript
  Lookup table INTENT_RULES[] en Flash
  Latence: < 5ms (offline)
  → Intent + confidence

TaskTTSPlayback   [Priority 21, Core 1]
  piper-tts ou espeak-ng (offline)
  Buffer double: 2 × 2048 samples
  I2S DMA write → MAX98357A
  Latence premier sample: < 100ms
```

### 12.2 Optimisations Latence

| Technique                   | Gain latence       |
|-----------------------------|--------------------|
| STT modèle tiny (40MB→8MB)  | −250ms             |
| DMA double-buffer I2S       | −20ms jitter       |
| Réponses TTS pré-cachées    | −80ms (cache hit)  |
| Intent detect C natif       | −15ms vs JS        |
| CPU clock 240MHz (vs 160)   | −30ms inference    |
| PSRAM cache TFLite          | −40ms (arenas)     |
| **Total économies**         | **≈ −435ms**       |

### 12.3 Cache Réponses TTS (Offline)

```c
// Pré-génération au boot (5s) des réponses fréquentes
// Stockage en SPI Flash 16MB
// Format: raw PCM 16kHz/16-bit/mono

#define TTS_CACHE_COUNT 120  // 120 phrases pré-compilées
#define TTS_AVG_BYTES   32000  // ~1s audio moyen par phrase
// Total cache: 120 × 32KB = 3.84MB (dans les 16MB Flash)

const TtsCacheEntry tts_cache[] = {
  {"GREETING_MATIN",  "Bonjour ! Je suis content de te voir !"},
  {"GREETING_APREM",  "Coucou ! On joue ensemble ?"},
  {"GREETING_SOIR",   "Bonsoir ! Tu as passé une bonne journée ?"},
  {"COMPLIMENT_ACK",  "Oh merci, tu es adorable !"},
  {"HUMOR_BLAGUE1",   "Pourquoi les plongeurs plongent-ils..."},
  // ... 115 autres
};
```

---

## 13. GESTION THERMIQUE & SÉCURITÉ

### 13.1 Sources de Chaleur

| Composant     | Puissance dissipée  | Température max |
|---------------|---------------------|-----------------|
| ESP32-S3      | 400mW (240MHz WiFi) | 85°C (Tjmax)    |
| MAX98357A     | 220mW (@ 2W audio)  | 125°C (Tjmax)   |
| TPS63020      | 50mW (@ 96% eff.)   | 125°C (Tjmax)   |
| TP4056        | 250mW (charge 500mA)| 85°C (Tjmax)    |
| OV2640        | 375mW (actif)       | 70°C (Tmax)     |
| **TOTAL**     | **≈ 1300mW**        | —               |

### 13.2 Design Thermique Boîtier

```
Matériau boîtier: ABS PC-Blend (UL94 V0, ignifugé)
Épaisseur paroi: 2.5mm
Conductivité thermique ABS: 0.17 W/(m·K)

Résistance thermique paroi:
  Rθ = épaisseur / (λ × Surface)
     = 0.0025 / (0.17 × 0.006)  [6cm² surface active]
     = 2.45 °C/W

Pour 1.3W dissipé:
  ΔT paroi = 1.3W × 2.45 = 3.2°C

Avec convection naturelle externe:
  T_surface_max = 25°C ambient + 3.2°C = 28.2°C ✅
  → Température surface tactile enfant < 30°C (norme CEI 62368-1)

POINTS CRITIQUES:
  - ESP32 + PMIC → face bottom (éloigné mains enfant)
  - Ventilation passive: 4 fentes Ø2mm bottom
  - Batterie: isolation thermique kapton du PCB
```

### 13.3 Sécurité Enfant — Conformités

| Norme              | Exigence                              | Status     |
|--------------------|---------------------------------------|------------|
| EN 71-1            | Jouet sécurité mécaniq. (chute 1m)   | Design ✅  |
| EN 71-3            | Migration substances chimiques (ABS)  | Matériaux ✅|
| CEI 62368-1        | Sécurité A/V (temp surface < 43°C)   | Thermique ✅|
| EN 62479           | Champs EM (SAR BLE < 2 W/kg)         | ESP32 certif ✅|
| EN 55032 Class B   | Émissions électromagnétiques          | PCB layout ✅|
| RGPD               | Biométrie mineur (locale uniquement)  | Firmware ✅ |
| EN 71-8 (option)   | Jouets d'activité (résistance statiq.)| Future v2   |

### 13.4 Protections Hardware

```
OVP (Over-Voltage Protection):   DW01A interne TP4056
UVP (Under-Voltage Protection):  DW01A — seuil 2.75V
OCP (Over-Current Protection):   DW01A — seuil 4A
OTP (Over-Temp Protection):      MAX98357A — seuil 150°C
Short-circuit:                   DW01A + résistance 0.1Ω
ESD protection:                  TVS diodes USB-C (PRTR5V0U2X)
Reverse polarity:                P-FET sur VBAT+ (Si2301)
```

---

## 14. PROTOCOLE DE TEST & VALIDATION

### 14.1 Tests Manufacturing (ICT — In-Circuit Test)

```
TEST 1: Power Rails
  □ VCC_3V3: 3.25–3.35V (tolérance ±1.5%)
  □ V2V8: 2.75–2.85V (caméra analog)
  □ V1V8: 1.75–1.85V (ESP32 core)
  □ VMIC: 1.75–1.85V (mics)
  □ VBAT simulé: 3.7V → VOUT: 3.30V ± 0.05V

TEST 2: ESP32-S3 Communication
  □ UART ping-pong @ 115200 baud (100 bytes, 0 error)
  □ Flash ID read: 0xEF4019 (W25Q128) ou interne
  □ PSRAM size: 8MB détecté

TEST 3: Audio
  □ I2S mic LEFT: signal présent @ 1kHz stimulus externe
  □ I2S mic RIGHT: signal présent @ 1kHz stimulus externe
  □ Beamforming: SNDR > 50dB
  □ Speaker: tone 1kHz @ 80dB SPL @ 30cm (SPL meter)
  □ THD speaker: < 5% @ 1W

TEST 4: Caméra
  □ I2C SCCB: OV2640 ID = 0x9452
  □ Capture QVGA: frame valide (non null, non saturé)
  □ Résolution: 320×240 confirmée
  □ Exposition auto: < 200ms convergence

TEST 5: LCD
  □ SPI communication: write/read register OK
  □ Affichage: mire couleur (rouge, vert, bleu, blanc)
  □ Backlight: PWM 50% = 120–160cd/m²

TEST 6: LED RGB
  □ WS2812B: rouge, vert, bleu séquence
  □ Intensité: 100% = > 500mcd (photomètre)
  □ Adressage: unique (pas de conflit)

TEST 7: Bouton
  □ Résistance fermée: < 1Ω
  □ Résistance ouverte: > 1MΩ
  □ GPIO38 pull-up: 3.28–3.32V au repos

TEST 8: Battery & Charge
  □ VBAT ADC: lecture 3.70V ± 0.05V (avec alimentation 3.7V simulée)
  □ TP4056: CHRG LED active @ 500mA
  □ TP4056: STDBY LED active à 4.20V

TEST 9: Connectivité
  □ Wi-Fi scan: SSID détectés > 0
  □ BLE advertising: détecté par smartphone test
  □ RSSI Wi-Fi: > −70 dBm @ 2m distance

TEST 10: Intégration Système
  □ Boot complet: < 400ms jusqu'à ready prompt
  □ Wake word "Hey Bobby": détection < 500ms
  □ Intent "Bonjour": GREETING en < 100ms
  □ TTS cache: premier son < 120ms
  □ Autonomie: 300mA × 10h = 3Ah confirmée par test 1h
```

### 14.2 Tests Produit (QA — End-of-Line)

```
TEST EOL 1: Chute 1m
  □ 3 chutes sur surface béton, angles différents
  □ Post-chute: tous tests ICT verts
  □ Boîtier: pas de fissure visible

TEST EOL 2: Résistance eau (IP40)
  □ Projection d'eau 30cm, 10s sur toutes faces sauf bottom
  □ Post-exposition: fonctionnel 100%
  □ Port USB-C: joint silicone intact

TEST EOL 3: Thermique
  □ Fonctionnement 2h @ 40°C ambiant
  □ Surface boîtier < 43°C (CEI 62368-1)
  □ ESP32 Tj < 80°C (lecture interne)

TEST EOL 4: Acoustique
  □ SPL max: < 85 dB(A) @ 30cm (protection auditive enfant)
  □ Distorsion voix: MOS score > 3.5/5

TEST EOL 5: Endurance Bouton
  □ 1000 presses à 2Hz → fonctionnel 100%

TEST EOL 6: Facial Recognition
  □ Enrôlement 1 visage → reconnaissance > 90% sur 10 tests
  □ Faux positif: < 1% sur 100 visages différents
```

---

## 15. RECOMMANDATIONS MANUFACTURING & PRODUCTION

### 15.1 Partenaires Recommandés

| Service              | Fournisseur        | Volume    | Délai    |
|----------------------|--------------------|-----------|----------|
| PCB Fab              | JLCPCB             | 100–10k   | 5–7j     |
| PCB Assembly         | JLCPCB SMT         | 100–5k    | 7–10j    |
| PCB Assembly (>5k)   | MacroFab / PCBWay  | 5k–50k    | 14–21j   |
| Composants           | LCSC               | 100–100k  | 3–5j     |
| Composants alt.      | Mouser / Digi-Key  | 1–1000    | 2–3j     |
| Boîtier injection    | OMH (Shenzhen)     | 1k–50k    | 30–45j   |
| Boîtier prototype    | Impression 3D PETG | 1–50      | 2–3j     |
| Assemblage final     | Flex / Jabil       | 10k+      | Variable |

### 15.2 Stratégie d'Approvisionnement

```
PHASE PROTOTYPE (0–50 unités):
  → PCB: JLCPCB 5 pcs (20€ pour 5)
  → Composants: Mouser/Digi-Key (disponibilité rapide)
  → Boîtier: Impression 3D FDM PETG (résistance enfant)
  → Assemblage: Manuel (atelier)
  → Coût estimé: ~80€/unité

PHASE PILOTE (50–500 unités):
  → PCB + Assembly: JLCPCB PCBA
  → Composants: LCSC (prix volume)
  → Boîtier: Prototype injection alu (T1 mold 800€)
  → Coût estimé: ~35€/unité

PHASE PRODUCTION (1k–10k unités):
  → PCB: 2-3 fournisseurs (risque supply)
  → Composants: Contrats cadre LCSC + backup Mouser
  → Boîtier: Moule acier série (5k€, amortissable > 50k pcs)
  → Test EOL: Station automatisée PCBA
  → Coût estimé: 18€–22€/unité
```

### 15.3 Optimisations Coût Production

```
1. ESP32-S3-WROOM-2-N16R8 → ESP32-S3 bare die (si volume > 100k)
   Économie: 2.50€/unité

2. OV2640 → HM01B0 si résolution 320×240 suffisante
   Économie: 0.70€/unité (mais +1.30€ si HM01B0 rare)

3. GC9A01A 240×240 → affichage LED ring (WS2812B ×24)
   Économie: 1.30€/unité (perte: interface enfant moins riche)

4. MAX98357A + 3W speaker → piezo buzzer
   Économie: 1.50€/unité (perte: qualité audio)
   → NON recommandé (audio est différenciant)

5. 16MB Flash → 8MB Flash (si TTS cloud-only)
   Économie: 0.40€/unité (risque offline)

6. JLCPCB PCBA "basic parts" (catalogue JLCPCB)
   → Filtrer composants sur catalogue → montage gratuit/réduit
   Économie: ~1.50€/unité sur assembly fees

COÛT BOM OPTIMISÉ (10k unités):
  ESP32-S3-WROOM-2-N16R8:    3.50€
  INMP441 ×2:                 1.70€
  MAX98357A:                  1.20€
  Speaker 3W:                 0.60€
  GC9A01A LCD:                1.80€
  OV2640 camera:              2.50€
  TP4056 + DW01A:             0.30€
  TPS63020:                   1.80€
  WS2812B LED:                0.08€
  SKRPACE010 button:          0.12€
  W25Q128 Flash (option):     0.55€
  Passives (R,C,L,ferrite):  0.80€
  Connectors (USB-C, JST):   0.60€
  PCB 2-layer ENIG:           1.20€
  Boîtier ABS injection:      2.00€
  Batterie Li-ion 3000mAh:   3.50€
  ─────────────────────────────────
  TOTAL BOM:                 22.25€
  + Assembly (10k volume):    3.50€
  + Test EOL:                 1.00€
  ─────────────────────────────────
  COÛT PRODUCTION TOTAL:     26.75€ ✅ (cible ≤ 30€)
```

### 15.4 Roadmap Hardware

```
v1.0 MVP (Q3 2026):
  ✅ ESP32-S3 + mics + speaker + LCD + BLE
  ✅ Offline intent detection
  ✅ TTS cache 120 phrases
  ✅ Batterie 8h
  ✅ Boîtier ABS simple

v1.5 (Q4 2026):
  ✅ Caméra OV2640 + facial recognition
  ✅ Dashboard parent (mobile app)
  ✅ Wi-Fi OTA
  ✅ Auto-learning engine

v2.0 (Q2 2027):
  🔲 NPU dédié (Kendryte K210 ou ESP32-P4 avec NPU)
  🔲 Microphone array 4× (meilleur beamforming)
  🔲 Speaker 5W (meilleure qualité audio)
  🔲 Écran 2" couleur (animations plus riches)
  🔲 IP54 (résistance eau améliorée)
  🔲 Charge sans fil Qi 5W
```

---

## ANNEXE A — DATASHEET REFERENCES

| Composant       | Référence          | Datasheet URL                                          |
|-----------------|--------------------|---------------------------------------------------------|
| ESP32-S3-WROOM-2| ESPRESSIF          | espressif.com/documentation/esp32-s3-wroom-2_datasheet |
| INMP441         | TDK InvenSense     | invensense.tdk.com/download-pdf/inmp441-datasheet       |
| MAX98357A       | Maxim/ADI          | datasheets.maximintegrated.com/en/ds/MAX98357A          |
| GC9A01A         | Galaxycore         | LCSC: C3045309                                         |
| OV2640          | OmniVision         | LCSC: C16332                                           |
| TPS63020        | Texas Instruments  | ti.com/product/TPS63020                                |
| TP4056          | TOPPOWER           | LCSC: C16581                                           |
| WS2812B         | Worldsemi          | LCSC: C114586                                          |

---

## ANNEXE B — SCHÉMA CONNEXION BATTERIE

```
Li-ion 3000mAh 3.7V
  │ VBAT+  │ VBAT-
  │         │
  ▼         ▼
┌─────────────────────────────────────────────────┐
│                DW01A (U4b)                      │
│  Over-Voltage: 4.28V → cut                     │
│  Under-Voltage: 2.75V → cut                    │
│  Over-Current: 4A → cut                        │
│  Short-circuit: < 100µs → cut                  │
│                                                 │
│  Control: 2× N-MOSFET FS8205A                  │
└──────────────────────┬──────────────────────────┘
                       │ VBAT_PROT
                       │
               ┌───────▼───────┐
               │    TP4056     │
               │   Charge IC   │
               │  IN: USB-C 5V │
               │ OUT: 4.20V/1A │
               │ R_PROG: 2kΩ  │
               │ I_CHG: 500mA  │
               └───────┬───────┘
                       │
               ┌───────▼───────────────────────────┐
               │         TPS63020                  │
               │  Buck-Boost 3.3V / 1.2A           │
               │  VIN: 3.0V–4.2V → VOUT: 3.3V     │
               └───────────────────────────────────┘
                             │ VCC_3V3
                    (distribution tous composants)
```

---

*Document généré le 2026-04-12*  
*Bobby Hardware Architecture v2.0 — Anthropic Cowork*  
*Confidentiel — Usage interne Bobbytoyai*
