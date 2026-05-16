# Intégration bobby_wifi + bobby_api dans `main/bobby_main.c`

Patch à appliquer dans `bobby_main.c` (ordre crucial) :

```c
#include "bobby_wifi.h"
#include "bobby_api.h"

static void on_wifi_state(bobby_wifi_state_t state, void *ctx) {
    (void)ctx;
    switch (state) {
        case BOBBY_WIFI_STATE_PROVISIONING:
            // affiche QR "Bobby-XXXX, http://192.168.4.1" sur l'écran
            bobby_face_set_expression(BOBBY_FACE_CURIOUS);
            break;
        case BOBBY_WIFI_STATE_CONNECTING:
            bobby_face_set_expression(BOBBY_FACE_NEUTRAL);
            break;
        case BOBBY_WIFI_STATE_CONNECTED:
            bobby_face_set_expression(BOBBY_FACE_JOIE);
            break;
        case BOBBY_WIFI_STATE_FAILED:
            bobby_face_set_expression(BOBBY_FACE_TRISTESSE);
            break;
        default: break;
    }
}

void app_main(void) {
    // ── 1. NVS (required by wifi + api) ───────────────────
    esp_err_t err = nvs_flash_init();
    if (err == ESP_ERR_NVS_NO_FREE_PAGES || err == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        nvs_flash_erase();
        nvs_flash_init();
    }

    // ── 2. Display + face + boot screen (existant) ────────
    bobby_state_load();
    bobby_display_init();
    bobby_boot_screen_blocking(2500);

    bobby_face_init();
    bobby_face_set_expression(BOBBY_FACE_NEUTRAL);

    // ── 3. Touch + wheel (existant) ───────────────────────
    bobby_touch_init();
    bobby_knob_init();

    // ── 4. NEW : Wi-Fi + cloud API ────────────────────────
    bobby_wifi_register_state_cb(on_wifi_state, NULL);
    bobby_wifi_init();    // STA or AP provisioning depending on NVS
    bobby_api_init();     // load anon_key / device_id / child_id from NVS

    // ── 5. UI tour (existant) ─────────────────────────────
    if (!bobby_state_get()->onboarding_done) {
        bobby_child_menu_one_shot_tour();
        bobby_state_set_onboarding_done(true);
        bobby_state_save();
    }

    // ── 6. Main loop ──────────────────────────────────────
    while (true) {
        // Check si bobby_api est configuré (sinon afficher QR pairing à l'écran)
        if (!bobby_api_is_configured() && bobby_wifi_is_connected()) {
            // afficher écran "Scan QR depuis l'app parent"
        }

        // Pressed wheel → trigger audio capture + cloud call (à implémenter en bobby_audio + bobby_dialog)
        // bobby_audio_capture_push_to_talk(...);
        // bobby_api_post_voice(audio, audio_len, &reply);

        vTaskDelay(pdMS_TO_TICKS(100));
    }
}
```

## Checklist d'activation

1. [ ] `sdkconfig` : `CONFIG_HTTPD_MAX_REQ_HDR_LEN` ≥ 1024, `CONFIG_LWIP_MAX_SOCKETS` ≥ 10.
2. [ ] `partitions.csv` : avoir une partition `nvs` ≥ 24 KB (pour stocker les creds + audio cache).
3. [ ] Vérifier que `mbedtls`, `esp_http_client`, `esp_http_server`, `esp_crt_bundle` sont activés (par défaut sur ESP-IDF 5.x).
4. [ ] Tester le mode AP : flash → reboot → vérifier qu'un téléphone voit le SSID `Bobby-XXXX` et que `http://192.168.4.1` sert le formulaire.
5. [ ] Tester le mode STA : entrer les creds → vérifier `bobby_wifi_get_ip_str()` retourne une IPv4.
6. [ ] Tester /safety : `bobby_api_post_safety("bonjour", "fr", false, &reply)` → niveau 0.
7. [ ] Tester /voice : avec un PCM 16k mono de 3 s → vérifier `r.bobby_text` non vide.

## Prochaine itération (bobby_audio)

Composant manquant pour brancher tout le pipeline :

- I²S capture mic 16 kHz mono 16-bit → buffer circulaire 32 kB
- VAD simple (énergie + zero-crossing) pour détection début/fin parole
- Push-to-talk via wheel-press hold (déjà câblé dans `bobby_knob`)
- Buffer audio → `bobby_api_post_voice()`
- Lecture de `r.audio_url` via stream HTTP → I²S DAC (haut-parleur)

Estimé à 4-5 jours senior firmware.
