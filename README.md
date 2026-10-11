# Skull

A phone-first Skull game with three ways to play: pass one phone, join a LAN table, or join an internet table. The table server keeps disc faces private and validates every move.

## Internet table on Render

Create a Render **Web Service** from this repository using `render.yaml` (Blueprint), or set these commands manually:

- Build: `npm ci && npm run build`
- Start: `npm start`
- Environment: `TABLE_MODE=internet`, Node 22

The Blueprint uses Render's free web-service plan. When Render gives you an `https://…onrender.com` URL, open the game on GitHub Pages, choose **Internet Table**, and enter that address. Create a table and share its invite link. Each friend opens the invite and enters their own name. Opening the Render URL itself also works; it serves the game at `/Bones/`.

Rooms run on one server instance. The free plan has ephemeral storage, so a Render restart or redeploy can end an in-progress room. A persistent disk with `DATA_FILE=/var/data/rooms.json` can preserve rooms across restarts on a compatible paid plan. Keep the service at one instance unless shared storage and coordinated room routing are added.

## LAN table

On a computer connected to the same Wi‑Fi as the phones:

```sh
npm ci
npm run build
TABLE_MODE=lan PORT=10000 npm start
```

Find that computer's local IP address and open `http://YOUR-LAN-IP:10000/Bones/` on every phone. Choose **LAN Table**, create a table, and share its invite link. Allow incoming connections to port 10000 if the computer's firewall asks. The local server saves rooms in `data/rooms.json` and can reload them after a restart. A LAN table stays on the local computer; the Render service hosts only internet tables.

A phone opening the GitHub Pages version can also choose **LAN Table** and enter the computer's address. It will navigate to the local server because an HTTPS page cannot use an insecure local WebSocket connection.

## Play and recovery

Three to six players join before the host starts. Players place a private disc, add discs or bid, then the high bidder flips their own stack before choosing others. Two successful challenges win. A skull costs the challenger one hidden disc. Each player retains a private seat token in their browser for reconnecting.

If a player disconnects during play, the table pauses. Connected players vote to continue; the lowest-numbered connected seat becomes host. If the active challenger or another player needed to finish the current resolution is offline, the table waits for their return. The previous host can rejoin without reclaiming control.

`npm test` runs the server rules and WebSocket checks. `npm run build` verifies the frontend bundle.
