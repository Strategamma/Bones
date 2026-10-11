Goal: distinct joinable LAN and internet Skull tables with correct private multiplayer play.
Scope: server-authoritative rooms, 3–6 players, reconnect, host migration, Render/LAN launch paths, existing pass-and-play preserved.
Approach: extract pure round logic into a server room module; WebSocket transport with room codes and per-seat tokens; canvas lobby and game views using existing art; one Node web service serves production build.
Risks: hidden-disc leakage, disconnected active player, host departure, Render instance restart, HTTPS-to-LAN mixed content.
Verification: deterministic Node room tests for full phases/privacy/reconnect/host vote; build; live browser checks when permitted.
