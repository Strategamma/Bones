# Skull

A phone-first Skull game with separate **LAN (same Wi-Fi)** and **Internet** tables. Every player uses their own phone. The table server keeps hands private and validates moves.

The transparent, matte 3D **BONES** wordmark at [`public/assets/bones-platform-logo.png`](public/assets/bones-platform-logo.png) is the shared arcade listing and in-game entry logo. Skull and flower symbols remain card faces within the game.

Tap **?** on the menu or at a table for the illustrated rulebook. The **♪** control mutes or restores the short bone-like action sounds; the choice is saved in that browser.

## Internet tables on Render

The repository includes a one-service [`render.yaml`](render.yaml) Blueprint. In Render, choose **New → Blueprint**, connect this GitHub repository, and deploy it. The service runs in `internet` mode.

If you create a Web Service manually, use:

| Setting | Value |
| --- | --- |
| Language | Node |
| Build command | `npm ci --include=dev && npm run build` |
| Start command | `npm start` |
| Health check path | `/health` |
| Environment variables | `TABLE_MODE=internet`, `NODE_VERSION=22` |
| Instances | 1 |

After deployment, open `https://YOUR-SERVICE.onrender.com/Bones/` or the GitHub Pages game and choose **Internet Table**. The configured Render address fills in automatically. Create a table, then share its invite; each friend enters their own name. The invite includes the server address when needed.

Render's Free service has [ephemeral storage](https://render.com/docs/free). Rooms can disappear after a restart, redeploy, or idle spin-down. The game sends a low-rate WebSocket keepalive during an open table, but a service can still restart. For room recovery across restarts, use a compatible paid plan with a [persistent disk](https://render.com/docs/disks) and set `DATA_FILE=/var/data/rooms.json`. Keep the service at one instance: rooms are held in that instance's memory.

## LAN tables on the same Wi-Fi

Render cannot host a LAN-only table because it runs on the public internet. One computer on the Wi-Fi runs the local BONES host. After installing Node.js and downloading this repository, use **Start BONES LAN.command** on Mac or **Start BONES LAN.cmd** on Windows. The command-line equivalent is:

```sh
npm_config_cache=/tmp/bones-npm-cache npm ci
npm run lan
```

Keep the host computer running, and allow incoming connections on port 10000 if its firewall asks. On phones connected to the same Wi-Fi, open the arcade game and choose **LAN Table**. BONES uses the local name `bones.local` to reach the host automatically; no IP entry or QR code is needed. The host can also open `http://bones.local:10000/Bones/` directly. Create a table and share its code or invite. Separate codes support multiple simultaneous games, with 3–6 players per game. LAN rooms save to `data/rooms.json` by default and can reload after a restart.

The public HTTPS game navigates to the local host before connecting to its WebSocket, so gameplay stays on Wi-Fi and works without internet after the local page loads. If a router blocks multicast DNS or another host already claims `bones.local`, use **Change Server Address** as an advanced fallback and enter the fallback IP shown in the host window. The host and phones must be on the same local network; guest Wi-Fi isolation can block them. Browsers generally cannot install a PWA from a plain HTTP `.local` page, so install BONES from its public HTTPS page first.

## Play and recovery

Three to six players join before the host starts. Everyone places a secret disc. The next player can place another disc or bid up to the number of discs on the table. After the first bid, no one can place more discs. The high bidder reveals their own stack first, then chooses others. Two successful challenges win; revealing a skull costs one hidden disc.

Each table has its own code and seats, so multiple groups can play concurrently on one server. The host can use the gear button to transfer hosting to a connected player at any time or remove a player before the match starts. The app is installable from its menu on supported HTTPS browsers; on iPhone, use Safari's Share → Add to Home Screen option.

If a player disconnects, the table pauses. Players can reconnect using their browser's saved seat token. Connected players may vote to continue, with host control transferred if needed.

`npm test` builds the frontend and runs the rule and WebSocket tests.
