# bobby_wifi

Wi-Fi STA + provisioning AP avec captive portal HTTP.

## Pipeline

```
boot
 │
 ├─ NVS creds présents ─→ STA connect ─→ CONNECTED
 │                              │
 │                              ↓ 3 fails
 │                         FAILED → provisioning fallback
 │
 └─ NVS creds absents ──→ AP "Bobby-XXXX" (open) + portal http://192.168.4.1
                                                                │
                                                                ↓ user POST /save
                                                          NVS save → STA reconnect
```

## API

```c
bobby_wifi_init();
bobby_wifi_register_state_cb(my_cb, NULL);
char ip[16];
bobby_wifi_get_ip_str(ip, sizeof(ip));   // "192.168.x.x"
```

## Captive portal

Le portail sert un formulaire HTML minimal sur `/` (GET) et reçoit la config sur `/save` (POST `application/x-www-form-urlencoded`). Pas de DNS hijack pour l'instant — le téléphone qui se connecte à l'AP doit naviguer manuellement vers `http://192.168.4.1` (la prochaine itération ajoutera un mini DNS server pour rediriger automatiquement).

## Couplage UI

Le firmware peut s'abonner à `bobby_wifi_register_state_cb` et faire passer Bobby en mode "endormi avec antenne" pendant `PROVISIONING`, puis "satellite" pendant `CONNECTING`, puis "souriant" sur `CONNECTED`. À implémenter côté `bobby_face`.

## NVS

Namespace `bobby_wifi`, clés `ssid` et `pass`. Pour reset depuis le firmware :

```c
bobby_wifi_clear_credentials();
esp_restart();
```
