Goal: make LAN tables usable from the arcade without entering an IP address or scanning a code, while preserving separate internet tables.
Scope: local server discovery, LAN entry UI, launcher/documentation, and focused transport checks.
Approach: local Node host advertises a predictable `bones.local` address over mDNS; the public game sends LAN players there, and the local server keeps rules and rooms entirely on Wi-Fi.
Risks: mDNS may be blocked by some routers or devices; one host may claim the fixed name per Wi-Fi network. Preserve an advanced address fallback and explain host setup.
Verification: a clean dependency install and build plus 17 tests pass; local `bones.local` resolved to 10.0.0.4, served `/health`, and accepted a WebSocket. A second phone and installed-PWA LAN entry remain unverified on this host.
