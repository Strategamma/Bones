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

After deployment, open `https://YOUR-SERVICE.onrender.com/Bones/` and choose **Internet Table**. The server address fills in automatically. You can also open the GitHub Pages game, choose **Internet Table**, and enter the Render service URL once. Create a table, then share its invite; each friend enters their own name. The invite includes the server address when needed.

Render's Free service has [ephemeral storage](https://render.com/docs/free). Rooms can disappear after a restart, redeploy, or idle spin-down. The game sends a low-rate WebSocket keepalive during an open table, but a service can still restart. For room recovery across restarts, use a compatible paid plan with a [persistent disk](https://render.com/docs/disks) and set `DATA_FILE=/var/data/rooms.json`. Keep the service at one instance: rooms are held in that instance's memory.

## LAN tables on the same Wi-Fi

Render cannot host a LAN-only table because it runs on the public internet. Run the game on a computer connected to the same local network as the players' phones:

```sh
npm ci --include=dev
npm run build
TABLE_MODE=lan PORT=10000 npm start
```

Find that computer's local IP address, then open `http://YOUR-LAN-IP:10000/Bones/` on every phone. Choose **LAN Table**. The local server address fills in automatically; create a table and share its invite. Keep the computer running, and allow incoming connections on port 10000 if its firewall asks. LAN rooms save to `data/rooms.json` by default and can reload after a restart.

From GitHub Pages, choosing **LAN Table** and entering the computer's local address takes the phone to that local game server. This avoids an insecure local WebSocket inside an HTTPS page. A phone must be on the same Wi-Fi (or otherwise able to reach the LAN computer).

## Play and recovery

Three to six players join before the host starts. Everyone places a secret disc. The next player can place another disc or bid up to the number of discs on the table. After the first bid, no one can place more discs. The high bidder reveals their own stack first, then chooses others. Two successful challenges win; revealing a skull costs one hidden disc.

If a player disconnects, the table pauses. Players can reconnect using their browser's saved seat token. Connected players may vote to continue, with host control transferred if needed.

`npm test` builds the frontend and runs the rule and WebSocket tests.
