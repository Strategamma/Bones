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

Keep the host computer running, and allow incoming connections on port 10000 if its firewall asks. On phones connected to the same Wi-Fi, open `http://bones.local:10000/Bones/` in the browser, or choose **Play on Wi-Fi** in the arcade game. If `bones.local` does not open, use the fallback IP address printed in the host window instead, such as `http://192.168.1.5:10000/Bones/`. The LAN setup screen also accepts that address and saves it for future visits. Tap **Play on Wi-Fi** to reclaim your saved seat or automatically join an open room; a room is created when none has space. **Rooms** shows all active rooms on that hosting computer, occupancy out of six, and waiting/in-game status. **Create another room** generates a new code. Friends can choose any waiting room with a free seat. **Host** can remove players or transfer control. Removal during play ends the round, returns cards, and keeps earned points; the last surviving player wins. Multiple games can run on the same host, with 3–6 players to start each game. LAN rooms save to `data/rooms.json` by default and can reload after a restart.

The public HTTPS game navigates to the local host before connecting to its WebSocket, so gameplay stays on Wi-Fi and works without internet after the local page loads. Some routers or phones cannot resolve `bones.local`; the host window's fallback IP works without local name discovery. The host and phones must be on the same local network; guest Wi-Fi isolation can block them. Browsers generally cannot install a PWA from a plain HTTP `.local` page, so install BONES from its public HTTPS page first.

## Play and recovery

Three to six players join before the host starts. Guests tap **I’M READY**; bots are ready automatically. The host’s **Start Game** confirms their readiness. A lobby disconnect resets that guest’s readiness. Everyone places a secret disc. The next player can place another disc or bid up to the number of discs on the table. After the first bid, no one can place more discs. The high bidder reveals their own stack first, then chooses others. Two successful challenges win; revealing a skull costs one hidden disc.

Each table has its own code and seats, so multiple groups can play concurrently on one server. The host can use the gear button to transfer hosting to a connected player at any time or remove a player before the match starts. The app is installable from its menu on supported HTTPS browsers; on iPhone, use Safari's Share → Add to Home Screen option.

**Menu → Pause Table** pauses a shared match without losing the round; connected surviving players vote to continue. **Play Again** starts a rematch with the same seats. **Return to Lobby** keeps the party and displayed scores, clears the previous cards/bids, resets readiness, and lets new friends join; starting resets match scores.

If a player disconnects, the table pauses. Players can reconnect using their browser's saved seat token. Connected players may vote to continue, with host control transferred if needed.

`npm test` builds the frontend and runs the rule and WebSocket tests.

## Interface verification

See [the coverage checklist](docs/INTERFACE_COVERAGE.md) for browser sizes, states, multiplayer scenarios, screenshots and remaining device checks. Tests use independent local clients; physical-device LAN reachability is not yet verified.

Online entry now creates a room with one tap. Use **Menu → Join Online Room** for a code, or open an invitation directly. **BONES Home** returns to this game’s entry; **Decadence Arcade** returns to the parent collection. Slow online-host wake-up is allowed up to 45 seconds.

The current public host was observed running an older protocol. The updated client adapts basic play and hides unsupported controls. New readiness, bots, shared pause and lobby-return behavior requires deploying the updated server. Public room loss and delayed host-disconnect notification were observed during QA; durable storage and the updated server are required before promising uninterrupted public sessions.
