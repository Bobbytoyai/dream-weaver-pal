// bobby_api — HTTPS client to Bobby Cloud (/v1/voice + /v1/safety).
//
// Persistent config in NVS namespace "bobby_api":
//   base_url   - default https://zvvyuxgqbuooifowjcqc.supabase.co
//   anon_key   - Supabase anon key (required)
//   device_id  - UUID assigned at provisioning
//   child_id   - UUID set by parent app via QR
//
// Audio in: 16 kHz PCM mono, ≤ 30 s chunk → base64-encode + POST /v1/voice.

#pragma once

#include <stdbool.h>
#include <stdint.h>
#include <stddef.h>
#include "esp_err.h"

#ifdef __cplusplus
extern "C" {
#endif

typedef struct {
    int level_input;
    int level_output;
    int latency_ms_total;
    char child_text[256];
    char bobby_text[512];
    char audio_url[256];
    char emotion[16];
    bool ok;
} bobby_api_voice_reply_t;

typedef struct {
    int level;
    char reason[64];
    char suggested_response[256];
    int latency_ms;
    bool ok;
} bobby_api_safety_reply_t;

/** Init (loads NVS config). Must be called after bobby_wifi_init. */
esp_err_t bobby_api_init(void);

/** Set Supabase anon key (persisted in NVS). */
esp_err_t bobby_api_set_anon_key(const char *anon_key);

/** Set device & child IDs (persisted). */
esp_err_t bobby_api_set_identities(const char *device_id, const char *child_id);

/** True if all of base_url + anon_key + device_id + child_id are set. */
bool bobby_api_is_configured(void);

/**
 * POST /v1/voice
 * Pass raw PCM 16k mono audio. Function handles base64 encoding + JSON wrap.
 * Blocks up to ~10s. Returns ESP_OK on 2xx with parsed reply.
 */
esp_err_t bobby_api_post_voice(const uint8_t *pcm16k_mono, size_t pcm_len,
                               bobby_api_voice_reply_t *out);

/**
 * POST /v1/safety
 * For client-side text checks (extensions / local tests).
 */
esp_err_t bobby_api_post_safety(const char *text, const char *lang,
                                bool is_output_direction,
                                bobby_api_safety_reply_t *out);

#ifdef __cplusplus
}
#endif
