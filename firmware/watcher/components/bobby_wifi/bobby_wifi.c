// bobby_wifi — STA + AP provisioning + NVS persistence.
//
// Sequence:
//   bobby_wifi_init() loads creds from NVS namespace "bobby_wifi".
//   - If present: bobby_wifi_start_sta(). On 3 consecutive failures → provisioning AP.
//   - If absent: bobby_wifi_start_provisioning() directly.
//
// AP "Bobby-XXXX" (open). HTTP server on 192.168.4.1 with /, /scan, /save endpoints.
// Captive portal: a tiny HTML form posts {ssid, password} → NVS write → STA reconnect.

#include "bobby_wifi.h"

#include <string.h>
#include <stdlib.h>
#include <stdio.h>

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/event_groups.h"

#include "esp_log.h"
#include "esp_event.h"
#include "esp_wifi.h"
#include "esp_netif.h"
#include "esp_http_server.h"
#include "esp_mac.h"
#include "nvs.h"
#include "nvs_flash.h"

#define TAG "bobby_wifi"

#define NVS_NS               "bobby_wifi"
#define NVS_KEY_SSID         "ssid"
#define NVS_KEY_PASSWORD     "pass"

#define WIFI_CONNECTED_BIT   BIT0
#define WIFI_FAIL_BIT        BIT1
#define MAX_STA_RETRIES      3

static EventGroupHandle_t s_wifi_event_group = NULL;
static bobby_wifi_state_t s_state = BOBBY_WIFI_STATE_BOOT;
static bobby_wifi_state_cb_t s_cb = NULL;
static void *s_cb_ctx = NULL;
static int s_retry_count = 0;
static esp_netif_t *s_netif_sta = NULL;
static esp_netif_t *s_netif_ap  = NULL;
static httpd_handle_t s_http = NULL;

static const char PORTAL_HTML[] =
    "<!doctype html><html><head><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'>"
    "<title>Bobby setup</title>"
    "<style>body{font-family:system-ui;background:#0A0A0F;color:#F4F4F8;margin:0;padding:24px;}"
    "h1{color:#9333EA;}label{display:block;margin:12px 0 4px;}input{width:100%;padding:10px;border-radius:8px;border:1px solid #333;background:#15151F;color:#F4F4F8;font-size:16px;}"
    "button{margin-top:20px;width:100%;padding:14px;background:#9333EA;color:#fff;border:0;border-radius:10px;font-size:16px;}"
    ".ok{color:#10B981;}.err{color:#EF4444;}</style>"
    "</head><body><h1>Bonjour ! 👋</h1>"
    "<p>Connectons Bobby à ton Wi-Fi.</p>"
    "<form method=POST action='/save'>"
    "<label>Nom du réseau</label><input name=ssid required maxlength=32 autofocus>"
    "<label>Mot de passe</label><input name=password type=password maxlength=64>"
    "<button>Connecter Bobby</button>"
    "</form></body></html>";

// ─── State helpers ────────────────────────────────────────────
static void set_state(bobby_wifi_state_t s) {
    if (s == s_state) return;
    s_state = s;
    ESP_LOGI(TAG, "state → %d", s);
    if (s_cb) s_cb(s, s_cb_ctx);
}

bobby_wifi_state_t bobby_wifi_get_state(void) { return s_state; }
bool bobby_wifi_is_connected(void) { return s_state == BOBBY_WIFI_STATE_CONNECTED; }

esp_err_t bobby_wifi_register_state_cb(bobby_wifi_state_cb_t cb, void *user_ctx) {
    s_cb = cb;
    s_cb_ctx = user_ctx;
    return ESP_OK;
}

// ─── NVS helpers ──────────────────────────────────────────────
static esp_err_t nvs_load_creds(bobby_wifi_creds_t *out) {
    nvs_handle_t h;
    esp_err_t err = nvs_open(NVS_NS, NVS_READONLY, &h);
    if (err != ESP_OK) return err;
    size_t l = sizeof(out->ssid);
    err = nvs_get_str(h, NVS_KEY_SSID, out->ssid, &l);
    if (err != ESP_OK) { nvs_close(h); return err; }
    l = sizeof(out->password);
    err = nvs_get_str(h, NVS_KEY_PASSWORD, out->password, &l);
    nvs_close(h);
    return err;
}

static esp_err_t nvs_save_creds(const char *ssid, const char *pw) {
    nvs_handle_t h;
    esp_err_t err = nvs_open(NVS_NS, NVS_READWRITE, &h);
    if (err != ESP_OK) return err;
    err = nvs_set_str(h, NVS_KEY_SSID, ssid ? ssid : "");
    if (err == ESP_OK) err = nvs_set_str(h, NVS_KEY_PASSWORD, pw ? pw : "");
    if (err == ESP_OK) err = nvs_commit(h);
    nvs_close(h);
    return err;
}

esp_err_t bobby_wifi_clear_credentials(void) {
    nvs_handle_t h;
    esp_err_t err = nvs_open(NVS_NS, NVS_READWRITE, &h);
    if (err != ESP_OK) return err;
    nvs_erase_key(h, NVS_KEY_SSID);
    nvs_erase_key(h, NVS_KEY_PASSWORD);
    nvs_commit(h);
    nvs_close(h);
    return ESP_OK;
}

// ─── Event handlers ───────────────────────────────────────────
static void event_handler(void *arg, esp_event_base_t base, int32_t id, void *data) {
    (void)arg; (void)data;
    if (base == WIFI_EVENT) {
        switch (id) {
        case WIFI_EVENT_STA_START:
            esp_wifi_connect();
            set_state(BOBBY_WIFI_STATE_CONNECTING);
            break;
        case WIFI_EVENT_STA_DISCONNECTED:
            if (s_retry_count < MAX_STA_RETRIES) {
                s_retry_count++;
                ESP_LOGW(TAG, "STA retry %d/%d", s_retry_count, MAX_STA_RETRIES);
                vTaskDelay(pdMS_TO_TICKS(1500));
                esp_wifi_connect();
            } else {
                ESP_LOGE(TAG, "STA failed after %d retries → fallback to provisioning", MAX_STA_RETRIES);
                set_state(BOBBY_WIFI_STATE_FAILED);
                xEventGroupSetBits(s_wifi_event_group, WIFI_FAIL_BIT);
                bobby_wifi_start_provisioning();
            }
            break;
        case WIFI_EVENT_AP_STACONNECTED:
            ESP_LOGI(TAG, "client connected to AP");
            break;
        case WIFI_EVENT_AP_STADISCONNECTED:
            ESP_LOGI(TAG, "client disconnected from AP");
            break;
        }
    } else if (base == IP_EVENT && id == IP_EVENT_STA_GOT_IP) {
        ip_event_got_ip_t *e = (ip_event_got_ip_t *)data;
        ESP_LOGI(TAG, "got IP " IPSTR, IP2STR(&e->ip_info.ip));
        s_retry_count = 0;
        set_state(BOBBY_WIFI_STATE_CONNECTED);
        xEventGroupSetBits(s_wifi_event_group, WIFI_CONNECTED_BIT);

        // Optionally stop AP if it was up
        if (s_netif_ap) {
            esp_wifi_set_mode(WIFI_MODE_STA);
        }
    }
}

// ─── HTTP captive portal ──────────────────────────────────────
static esp_err_t portal_root_get(httpd_req_t *req) {
    httpd_resp_set_type(req, "text/html; charset=utf-8");
    return httpd_resp_send(req, PORTAL_HTML, sizeof(PORTAL_HTML) - 1);
}

// Simple x-www-form-urlencoded parser. Accepts only `ssid=...&password=...`.
static esp_err_t parse_form_post(httpd_req_t *req, char *ssid, size_t ssid_l, char *pw, size_t pw_l) {
    char buf[256];
    int total = req->content_len > (int)sizeof(buf) - 1 ? (int)sizeof(buf) - 1 : req->content_len;
    int got = httpd_req_recv(req, buf, total);
    if (got <= 0) return ESP_FAIL;
    buf[got] = 0;

    ssid[0] = 0; pw[0] = 0;

    char *tok = strtok(buf, "&");
    while (tok) {
        char *eq = strchr(tok, '=');
        if (eq) {
            *eq = 0;
            const char *key = tok;
            const char *val = eq + 1;
            // url-decode '+' → space, %xx → byte (lightweight; ssid/password rarely contain %)
            char dec[128]; int di = 0;
            for (int i = 0; val[i] && di < (int)sizeof(dec) - 1; i++) {
                if (val[i] == '+') dec[di++] = ' ';
                else if (val[i] == '%' && val[i+1] && val[i+2]) {
                    char h[3] = { val[i+1], val[i+2], 0 };
                    dec[di++] = (char)strtol(h, NULL, 16);
                    i += 2;
                } else dec[di++] = val[i];
            }
            dec[di] = 0;
            if (strcmp(key, "ssid") == 0) strncpy(ssid, dec, ssid_l - 1);
            else if (strcmp(key, "password") == 0) strncpy(pw, dec, pw_l - 1);
        }
        tok = strtok(NULL, "&");
    }
    return (ssid[0] != 0) ? ESP_OK : ESP_FAIL;
}

static esp_err_t portal_save_post(httpd_req_t *req) {
    char ssid[33] = {0}, pw[65] = {0};
    if (parse_form_post(req, ssid, sizeof(ssid), pw, sizeof(pw)) != ESP_OK) {
        httpd_resp_set_status(req, "400 Bad Request");
        return httpd_resp_sendstr(req, "Missing ssid");
    }
    ESP_LOGI(TAG, "received creds for SSID '%s'", ssid);
    nvs_save_creds(ssid, pw);

    const char *ok =
        "<!doctype html><html><body style='font-family:system-ui;background:#0A0A0F;color:#F4F4F8;padding:24px'>"
        "<h2 style='color:#10B981'>Merci !</h2>"
        "<p>Bobby va se connecter à <b>";
    const char *ok2 = "</b>. Tu peux fermer cette page.</p></body></html>";
    httpd_resp_set_type(req, "text/html; charset=utf-8");
    httpd_resp_send_chunk(req, ok, strlen(ok));
    httpd_resp_send_chunk(req, ssid, strlen(ssid));
    httpd_resp_send_chunk(req, ok2, strlen(ok2));
    httpd_resp_send_chunk(req, NULL, 0);

    // Schedule reboot to STA shortly after response is flushed
    vTaskDelay(pdMS_TO_TICKS(800));
    esp_wifi_stop();
    bobby_wifi_start_sta();
    return ESP_OK;
}

static esp_err_t start_portal_server(void) {
    httpd_config_t cfg = HTTPD_DEFAULT_CONFIG();
    cfg.lru_purge_enable = true;
    cfg.max_uri_handlers = 4;

    if (httpd_start(&s_http, &cfg) != ESP_OK) return ESP_FAIL;
    httpd_uri_t root = {.uri = "/", .method = HTTP_GET, .handler = portal_root_get};
    httpd_uri_t save = {.uri = "/save", .method = HTTP_POST, .handler = portal_save_post};
    httpd_register_uri_handler(s_http, &root);
    httpd_register_uri_handler(s_http, &save);
    return ESP_OK;
}

// ─── Public lifecycle ─────────────────────────────────────────
esp_err_t bobby_wifi_init(void) {
    if (s_wifi_event_group) return ESP_OK;  // idempotent

    // NVS must be inited by caller (nvs_flash_init in main)
    ESP_ERROR_CHECK(esp_netif_init());
    ESP_ERROR_CHECK(esp_event_loop_create_default());

    s_netif_sta = esp_netif_create_default_wifi_sta();

    wifi_init_config_t wcfg = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&wcfg));

    ESP_ERROR_CHECK(esp_event_handler_instance_register(
        WIFI_EVENT, ESP_EVENT_ANY_ID, &event_handler, NULL, NULL));
    ESP_ERROR_CHECK(esp_event_handler_instance_register(
        IP_EVENT, IP_EVENT_STA_GOT_IP, &event_handler, NULL, NULL));

    s_wifi_event_group = xEventGroupCreate();

    bobby_wifi_creds_t creds = {0};
    if (nvs_load_creds(&creds) == ESP_OK && creds.ssid[0] != 0) {
        ESP_LOGI(TAG, "creds found in NVS → starting STA");
        return bobby_wifi_start_sta();
    }
    ESP_LOGI(TAG, "no creds → starting provisioning");
    return bobby_wifi_start_provisioning();
}

esp_err_t bobby_wifi_start_sta(void) {
    bobby_wifi_creds_t creds = {0};
    if (nvs_load_creds(&creds) != ESP_OK || creds.ssid[0] == 0) return ESP_ERR_NOT_FOUND;

    wifi_config_t cfg = {0};
    strncpy((char *)cfg.sta.ssid, creds.ssid, sizeof(cfg.sta.ssid) - 1);
    strncpy((char *)cfg.sta.password, creds.password, sizeof(cfg.sta.password) - 1);
    cfg.sta.threshold.authmode = WIFI_AUTH_OPEN; // accept any auth ≥ open

    s_retry_count = 0;
    set_state(BOBBY_WIFI_STATE_CONNECTING);
    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_STA));
    ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_STA, &cfg));
    ESP_ERROR_CHECK(esp_wifi_start());
    return ESP_OK;
}

esp_err_t bobby_wifi_start_provisioning(void) {
    set_state(BOBBY_WIFI_STATE_PROVISIONING);
    if (!s_netif_ap) s_netif_ap = esp_netif_create_default_wifi_ap();

    uint8_t mac[6] = {0};
    esp_efuse_mac_get_default(mac);
    char ssid[33];
    snprintf(ssid, sizeof(ssid), "Bobby-%02X%02X", mac[4], mac[5]);

    wifi_config_t cfg = {0};
    strncpy((char *)cfg.ap.ssid, ssid, sizeof(cfg.ap.ssid));
    cfg.ap.ssid_len = strlen(ssid);
    cfg.ap.channel = 1;
    cfg.ap.max_connection = 2;
    cfg.ap.authmode = WIFI_AUTH_OPEN;

    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_AP));
    ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_AP, &cfg));
    ESP_ERROR_CHECK(esp_wifi_start());

    if (!s_http) start_portal_server();
    ESP_LOGI(TAG, "captive portal up on http://192.168.4.1  (SSID: %s)", ssid);
    return ESP_OK;
}

esp_err_t bobby_wifi_set_credentials(const char *ssid, const char *password) {
    esp_err_t err = nvs_save_creds(ssid, password);
    if (err != ESP_OK) return err;
    esp_wifi_stop();
    return bobby_wifi_start_sta();
}

esp_err_t bobby_wifi_get_ip_str(char *buf, size_t buflen) {
    if (!buf || buflen < 16 || s_state != BOBBY_WIFI_STATE_CONNECTED) {
        if (buf && buflen) buf[0] = 0;
        return ESP_ERR_INVALID_STATE;
    }
    esp_netif_ip_info_t info = {0};
    if (esp_netif_get_ip_info(s_netif_sta, &info) != ESP_OK) {
        buf[0] = 0;
        return ESP_FAIL;
    }
    snprintf(buf, buflen, IPSTR, IP2STR(&info.ip));
    return ESP_OK;
}
