Goal: make Render internet tables and local Wi-Fi/LAN tables straightforward to deploy and join.
Scope: Render Blueprint, WebSocket liveness, health checks, LAN persistence toggle, setup documentation; keep existing table separation.
Approach: retain one public internet service on Render, send low-rate client keepalive during idle games, clarify that LAN runs on a local computer and Wi-Fi phones join it.
Risks: Render Free sleep/restart and ephemeral rooms; deployment requires the latest GitHub commit and a Render account connection.
Verification: build, 11 rule/WebSocket tests, local internet health/keepalive checks, Blueprint parse passed. Live Render check awaits the service URL and publication of local changes.
