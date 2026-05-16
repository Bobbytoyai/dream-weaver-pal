idf_component_register(
    SRCS "bobby_api.c"
    INCLUDE_DIRS "include"
    REQUIRES
        esp_http_client
        esp-tls
        mbedtls
        json
        nvs_flash
        bobby_wifi
)
# Using esp_crt_bundle_attach (built-in CA bundle from ESP-IDF).
# To pin a specific CA: add EMBED_TXTFILES certs/<your.pem> and switch to .cert_pem in bobby_api.c.
