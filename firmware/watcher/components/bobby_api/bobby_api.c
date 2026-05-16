// bobby_api — HTTPS client implementation.

#include "bobby_api.h"
#include "bobby_wifi.h"

#include <string.h>
#include <stdlib.h>
#include <stdio.h>

#include "esp_log.h"
#include "esp_http_client.h"
#include "esp_crt_bundle.h"
#include "esp_tls.h"
#include "nvs.h"
#include "cJSON.h"
#include "mbedtls/base64.h"

#define TAG "bobby_api"
#define NVS_NS "bobby_api"

#define DEFAULT_BASE_URL "https://zvvyuxgqbuooifowjcqc.supabase.co"

static char s_base_url[128]  = DEFAULT_BASE_URL;
static char s_anon_key[256]  = {0};
static char s_device_id[40]  = {0};
static char s_child_id[40]   = {0};

// ─── NVS persistence ──────────────────────────────────────────
static esp_err_t nvs_get_or(const char *key, char *out, size_t out_len, const char *def) {
    nvs_handle_t h;
    esp_err_t err = nvs_open(NVS_NS, NVS_READONLY, &h);
    if (err == ESP_OK) {
        size_t l = out_len;
        err = nvs_get_str(h, key, out, &l);
        nvs_close(h);
    }
    if (err != ESP_OK && def) {
        strncpy(out, def, out_len - 1);
        out[out_len - 1] = 0;
    }
    return ESP_OK;
}

static esp_err_t nvs_put(const char *key, const char *val) {
    nvs_handle_t h;
    esp_err_t err = nvs_open(NVS_NS, NVS_READWRITE, &h);
    if (err != ESP_OK) return err;
    err = nvs_set_str(h, key, val ? val : "");
    if (err == ESP_OK) err = nvs_commit(h);
    nvs_close(h);
    return err;
}

esp_err_t bobby_api_init(void) {
    nvs_get_or("base_url",  s_base_url,  sizeof(s_base_url),  DEFAULT_BASE_URL);
    nvs_get_or("anon_key",  s_anon_key,  sizeof(s_anon_key),  "");
    nvs_get_or("device_id", s_device_id, sizeof(s_device_id), "");
    nvs_get_or("child_id",  s_child_id,  sizeof(s_child_id),  "");
    ESP_LOGI(TAG, "init: base=%s anon=%s dev=%s child=%s",
             s_base_url,
             s_anon_key[0] ? "set" : "unset",
             s_device_id[0] ? s_device_id : "unset",
             s_child_id[0] ? s_child_id : "unset");
    return ESP_OK;
}

esp_err_t bobby_api_set_anon_key(const char *k) {
    if (!k) return ESP_ERR_INVALID_ARG;
    strncpy(s_anon_key, k, sizeof(s_anon_key) - 1);
    return nvs_put("anon_key", k);
}

esp_err_t bobby_api_set_identities(const char *device_id, const char *child_id) {
    if (device_id) {
        strncpy(s_device_id, device_id, sizeof(s_device_id) - 1);
        nvs_put("device_id", device_id);
    }
    if (child_id) {
        strncpy(s_child_id, child_id, sizeof(s_child_id) - 1);
        nvs_put("child_id", child_id);
    }
    return ESP_OK;
}

bool bobby_api_is_configured(void) {
    return s_base_url[0] && s_anon_key[0] && s_device_id[0] && s_child_id[0];
}

// ─── HTTP helpers ─────────────────────────────────────────────
typedef struct {
    char *buf;
    size_t len;
    size_t cap;
} resp_buf_t;

static esp_err_t http_event_handler(esp_http_client_event_t *evt) {
    resp_buf_t *rb = (resp_buf_t *)evt->user_data;
    if (evt->event_id == HTTP_EVENT_ON_DATA && evt->data_len > 0 && rb) {
        size_t need = rb->len + evt->data_len + 1;
        if (need > rb->cap) {
            size_t newcap = rb->cap ? rb->cap * 2 : 1024;
            while (newcap < need) newcap *= 2;
            char *nb = realloc(rb->buf, newcap);
            if (!nb) return ESP_ERR_NO_MEM;
            rb->buf = nb; rb->cap = newcap;
        }
        memcpy(rb->buf + rb->len, evt->data, evt->data_len);
        rb->len += evt->data_len;
        rb->buf[rb->len] = 0;
    }
    return ESP_OK;
}

static esp_err_t do_post_json(const char *path, const char *json_body, resp_buf_t *out) {
    if (!bobby_wifi_is_connected()) {
        ESP_LOGW(TAG, "skip POST %s: wifi offline", path);
        return ESP_ERR_INVALID_STATE;
    }
    char url[256];
    snprintf(url, sizeof(url), "%s/functions/v1%s", s_base_url, path);

    esp_http_client_config_t cfg = {
        .url = url,
        .method = HTTP_METHOD_POST,
        .timeout_ms = 10000,
        .crt_bundle_attach = esp_crt_bundle_attach,
        .event_handler = http_event_handler,
        .user_data = out,
    };
    esp_http_client_handle_t client = esp_http_client_init(&cfg);
    if (!client) return ESP_ERR_NO_MEM;

    char auth_header[300];
    snprintf(auth_header, sizeof(auth_header), "Bearer %s", s_anon_key);
    esp_http_client_set_header(client, "Authorization", auth_header);
    esp_http_client_set_header(client, "Content-Type", "application/json");
    esp_http_client_set_post_field(client, json_body, strlen(json_body));

    esp_err_t err = esp_http_client_perform(client);
    int status = esp_http_client_get_status_code(client);
    esp_http_client_cleanup(client);

    if (err != ESP_OK) {
        ESP_LOGE(TAG, "POST %s failed: %s", path, esp_err_to_name(err));
        return err;
    }
    if (status < 200 || status >= 300) {
        ESP_LOGE(TAG, "POST %s status=%d body=%.200s", path, status, out->buf ? out->buf : "");
        return ESP_FAIL;
    }
    return ESP_OK;
}

// ─── Base64 encoding (mbedtls) ────────────────────────────────
static char *b64_encode(const uint8_t *in, size_t in_len) {
    size_t out_size = 4 * ((in_len + 2) / 3) + 1;
    char *out = malloc(out_size);
    if (!out) return NULL;
    size_t produced = 0;
    if (mbedtls_base64_encode((unsigned char *)out, out_size, &produced, in, in_len) != 0) {
        free(out);
        return NULL;
    }
    out[produced] = 0;
    return out;
}

// ─── /v1/voice ────────────────────────────────────────────────
esp_err_t bobby_api_post_voice(const uint8_t *pcm, size_t pcm_len,
                               bobby_api_voice_reply_t *out) {
    if (!out) return ESP_ERR_INVALID_ARG;
    memset(out, 0, sizeof(*out));
    if (!bobby_api_is_configured()) return ESP_ERR_INVALID_STATE;
    if (!pcm || pcm_len == 0) return ESP_ERR_INVALID_ARG;

    char *audio_b64 = b64_encode(pcm, pcm_len);
    if (!audio_b64) return ESP_ERR_NO_MEM;

    // Build JSON
    cJSON *root = cJSON_CreateObject();
    cJSON_AddStringToObject(root, "device_id", s_device_id);
    cJSON_AddStringToObject(root, "child_id", s_child_id);
    cJSON_AddStringToObject(root, "audio", audio_b64);
    char *body = cJSON_PrintUnformatted(root);
    cJSON_Delete(root);
    free(audio_b64);
    if (!body) return ESP_ERR_NO_MEM;

    resp_buf_t rb = {0};
    esp_err_t err = do_post_json("/voice", body, &rb);
    free(body);

    if (err == ESP_OK && rb.buf) {
        cJSON *r = cJSON_Parse(rb.buf);
        if (r) {
            cJSON *ct = cJSON_GetObjectItem(r, "child_text");
            cJSON *bt = cJSON_GetObjectItem(r, "bobby_text");
            cJSON *au = cJSON_GetObjectItem(r, "audio_url");
            cJSON *em = cJSON_GetObjectItem(r, "emotion");
            cJSON *saf = cJSON_GetObjectItem(r, "safety");
            cJSON *lat = cJSON_GetObjectItem(r, "latency_ms");
            if (cJSON_IsString(ct)) strncpy(out->child_text, ct->valuestring, sizeof(out->child_text) - 1);
            if (cJSON_IsString(bt)) strncpy(out->bobby_text, bt->valuestring, sizeof(out->bobby_text) - 1);
            if (cJSON_IsString(au)) strncpy(out->audio_url,  au->valuestring, sizeof(out->audio_url) - 1);
            if (cJSON_IsString(em)) strncpy(out->emotion,    em->valuestring, sizeof(out->emotion) - 1);
            if (cJSON_IsObject(saf)) {
                cJSON *si = cJSON_GetObjectItem(saf, "input");
                cJSON *so = cJSON_GetObjectItem(saf, "output");
                if (cJSON_IsNumber(si)) out->level_input  = si->valueint;
                if (cJSON_IsNumber(so)) out->level_output = so->valueint;
            }
            if (cJSON_IsObject(lat)) {
                cJSON *t = cJSON_GetObjectItem(lat, "total");
                if (cJSON_IsNumber(t)) out->latency_ms_total = t->valueint;
            }
            out->ok = true;
            cJSON_Delete(r);
        }
    }
    free(rb.buf);
    return err;
}

// ─── /v1/safety ───────────────────────────────────────────────
esp_err_t bobby_api_post_safety(const char *text, const char *lang,
                                bool is_output_direction,
                                bobby_api_safety_reply_t *out) {
    if (!out || !text) return ESP_ERR_INVALID_ARG;
    memset(out, 0, sizeof(*out));
    if (s_anon_key[0] == 0) return ESP_ERR_INVALID_STATE;

    cJSON *root = cJSON_CreateObject();
    cJSON_AddStringToObject(root, "text", text);
    cJSON_AddStringToObject(root, "lang", lang ? lang : "fr");
    cJSON_AddStringToObject(root, "direction", is_output_direction ? "output" : "input");
    char *body = cJSON_PrintUnformatted(root);
    cJSON_Delete(root);
    if (!body) return ESP_ERR_NO_MEM;

    resp_buf_t rb = {0};
    esp_err_t err = do_post_json("/safety", body, &rb);
    free(body);

    if (err == ESP_OK && rb.buf) {
        cJSON *r = cJSON_Parse(rb.buf);
        if (r) {
            cJSON *lv = cJSON_GetObjectItem(r, "level");
            cJSON *re = cJSON_GetObjectItem(r, "reason");
            cJSON *sr = cJSON_GetObjectItem(r, "suggested_response");
            cJSON *la = cJSON_GetObjectItem(r, "latency_ms");
            if (cJSON_IsNumber(lv)) out->level = lv->valueint;
            if (cJSON_IsString(re)) strncpy(out->reason, re->valuestring, sizeof(out->reason) - 1);
            if (cJSON_IsString(sr)) strncpy(out->suggested_response, sr->valuestring, sizeof(out->suggested_response) - 1);
            if (cJSON_IsNumber(la)) out->latency_ms = la->valueint;
            out->ok = true;
            cJSON_Delete(r);
        }
    }
    free(rb.buf);
    return err;
}
