// bobby_wifi — Wi-Fi STA + provisioning via captive AP
// Persisted credentials in NVS namespace "bobby_wifi".

#pragma once

#include <stdbool.h>
#include "esp_err.h"

#ifdef __cplusplus
extern "C" {
#endif

typedef enum {
    BOBBY_WIFI_STATE_BOOT = 0,
    BOBBY_WIFI_STATE_PROVISIONING,   // AP open, captive portal serving config page
    BOBBY_WIFI_STATE_CONNECTING,     // STA attempting
    BOBBY_WIFI_STATE_CONNECTED,
    BOBBY_WIFI_STATE_DISCONNECTED,
    BOBBY_WIFI_STATE_FAILED,
} bobby_wifi_state_t;

typedef struct {
    char ssid[33];
    char password[65];
} bobby_wifi_creds_t;

typedef void (*bobby_wifi_state_cb_t)(bobby_wifi_state_t state, void *user_ctx);

/**
 * Initialize Wi-Fi subsystem. Must be called once after NVS init.
 *  - Loads creds from NVS; if present, attempts STA connection immediately.
 *  - If absent or 3 STA attempts fail, falls back to provisioning AP "Bobby-XXXX".
 */
esp_err_t bobby_wifi_init(void);

/** Register a state-change callback (called from the wifi task, keep it fast). */
esp_err_t bobby_wifi_register_state_cb(bobby_wifi_state_cb_t cb, void *user_ctx);

/** Current state (cheap, RAM read). */
bobby_wifi_state_t bobby_wifi_get_state(void);

/** True if WIFI_STATE_CONNECTED. */
bool bobby_wifi_is_connected(void);

/** Persist credentials and trigger STA reconnect. */
esp_err_t bobby_wifi_set_credentials(const char *ssid, const char *password);

/** Erase credentials, force back to provisioning state. */
esp_err_t bobby_wifi_clear_credentials(void);

/** Manually start STA. Returns ESP_ERR_NOT_FOUND if no creds in NVS. */
esp_err_t bobby_wifi_start_sta(void);

/** Manually start AP provisioning (captive portal at 192.168.4.1). */
esp_err_t bobby_wifi_start_provisioning(void);

/** Get IPv4 in "x.x.x.x" form (writes into buf 16 bytes). Empty if not connected. */
esp_err_t bobby_wifi_get_ip_str(char *buf, size_t buflen);

#ifdef __cplusplus
}
#endif
