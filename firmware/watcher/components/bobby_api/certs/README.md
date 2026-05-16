# Certificates

`bobby_api` uses `esp_crt_bundle_attach` (built-in CA bundle from ESP-IDF) so this folder is normally empty.

If you ever need to pin a specific root CA (e.g. Supabase's), drop the PEM here, change `bobby_api.c` from `crt_bundle_attach` to `cert_pem`, and update `CMakeLists.txt` `EMBED_TXTFILES`.
