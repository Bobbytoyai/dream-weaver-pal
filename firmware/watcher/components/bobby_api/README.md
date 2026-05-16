# bobby_api

Client HTTPS vers Bobby Cloud. Cible : `/v1/voice` (pipeline audio complet) + `/v1/safety` (classifier standalone).

## Config (NVS namespace `bobby_api`)

| Clé | Rôle | Valeur par défaut |
|-----|------|-------------------|
| `base_url`  | URL Supabase | `https://zvvyuxgqbuooifowjcqc.supabase.co` |
| `anon_key`  | Supabase anon key | (à set au provisioning) |
| `device_id` | UUID Watcher | (à set au provisioning) |
| `child_id`  | UUID enfant | (à set via QR app parent) |

## Setup au démarrage

```c
bobby_wifi_init();
bobby_api_init();

if (!bobby_api_is_configured()) {
    // afficher QR code sur l'écran pour appairage
    show_pairing_qr();
}
```

Le QR code encode un JSON `{anon_key, device_id, child_id}` que l'app parent scanne et POST vers le Watcher via une route HTTP locale (à implémenter, ou via BLE).

## Envoi audio

```c
// Capturé via I²S (composant bobby_audio à venir) : PCM 16k mono, 16-bit
const uint8_t *pcm = audio_buffer_ptr();
size_t pcm_len = audio_buffer_len();

bobby_api_voice_reply_t r;
if (bobby_api_post_voice(pcm, pcm_len, &r) == ESP_OK && r.ok) {
    ESP_LOGI(TAG, "Bobby: %s (emotion=%s, %d ms)", r.bobby_text, r.emotion, r.latency_ms_total);
    if (r.level_output >= 3) {
        // safety triggered → flash visage triste + alert
    }
    // play audio_url via streaming (à implémenter dans bobby_audio)
}
```

## SafeGuard standalone

```c
bobby_api_safety_reply_t s;
bobby_api_post_safety("j'ai peur du noir", "fr", false, &s);
if (s.ok && s.level >= 3) {
    // afficher s.suggested_response
}
```

## Robustesse

- Skip si Wi-Fi offline (`bobby_wifi_is_connected()` check au début de `do_post_json`).
- Timeout 10 s par requête.
- Allocations dynamiques pour le response buffer (croit par doublement, libéré en fin de call).
- Base64 via mbedtls (`mbedtls_base64_encode`).
- TLS via `esp_crt_bundle_attach` (CA bundle built-in ESP-IDF, validation activée).

## TODO

- [ ] Queue + retry exponentiel quand offline (stocker en flash, replay quand connecté).
- [ ] Streaming audio chunked vers `/v1/voice` (plutôt que tout le PCM en mémoire).
- [ ] Pinning CA Supabase pour défense en profondeur.
- [ ] Compression audio (Opus 16 kbps) pour économiser la bande passante.
