idf_component_register(
    SRCS "bobby_wifi.c"
    INCLUDE_DIRS "include"
    REQUIRES
        esp_wifi
        esp_event
        esp_netif
        nvs_flash
        esp_http_server
        json
        bobby_display
)
