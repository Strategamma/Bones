import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, resolve, dirname } from 'node:path';
import { WebSocketServer, WebSocket } from 'ws';
import { makeRoom, joinRoom, seatForToken, connection, act, view } from './game.js';

const port = Number(process.env.PORT || 10000);
const mode = process.env.TABLE_MODE === 'internet' ? 'internet' : 'lan';
const dataFile = process.env.DATA_FILE || (mode === 'lan' ? './data/rooms.json' : '');
const base = '/Bones/';
const dist = resolve('dist');
const rooms = new Map();
const peers = new Map();
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
if (dataFile && existsSync(dataFile)) {
  try {
    const saved = JSON.parse(await readFile(dataFile, 'utf8'));
    for (const room of saved) {
      room.seats.forEach(s => { s.connected = false; });
      if (!['lobby', 'win', 'paused'].includes(room.stage)) { room.pausedStage = room.stage; room.stage = 'paused'; room.votes = []; }
      rooms.set(room.code, room);
    }
  } catch (error) { console.error('Unable to load saved rooms:', error); }
}
async function save() {
  if (!dataFile) return;
  await mkdir(dirname(resolve(dataFile)), { recursive: true });
  const temp = `${dataFile}.tmp`;
  await writeFile(temp, JSON.stringify([...rooms.values()]));
  const { rename } = await import('node:fs/promises');
  await rename(temp, dataFile);
}
let saveQueue = Promise.resolve();
function persist() {
  saveQueue = saveQueue.catch(() => {}).then(save);
  saveQueue.catch(error => console.error('Unable to save rooms:', error));
}
function send(socket, data) { if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(data)); }
function broadcast(room) {
  for (let i = 0; i < room.seats.length; i++) {
    const socket = peers.get(`${room.code}:${i}`);
    if (socket) send(socket, { type: 'state', state: view(room, i) });
  }
  persist();
}
const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (url.pathname === '/health') { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: true, mode })); return; }
  if (url.pathname === '/') { res.writeHead(302, { Location: base }); res.end(); return; }
  if (!url.pathname.startsWith(base)) { res.writeHead(404); res.end(); return; }
  const rel = decodeURIComponent(url.pathname.slice(base.length)) || 'index.html';
  const path = resolve(dist, rel);
  if (path !== dist && !path.startsWith(dist + '/')) { res.writeHead(403); res.end(); return; }
  try {
    const body = await readFile(path);
    res.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream', 'Cache-Control': extname(path) === '.html' ? 'no-cache' : 'public, max-age=3600' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 4096 });
wss.on('connection', socket => {
  let membership = null;
  socket.on('message', raw => {
    try {
      const msg = JSON.parse(String(raw));
      if (!msg || typeof msg !== 'object') throw Error('Invalid request.');
      if (msg.type === 'hello') { send(socket, { type: 'hello', mode }); return; }
      if (msg.type === 'create') {
        if (membership) throw Error('Already at a table.');
        const { room, seat } = makeRoom(mode, msg.name);
        while (rooms.has(room.code)) room.code = room.code.slice(0, 5) + Math.floor(Math.random() * 10);
        rooms.set(room.code, room);
        membership = { room, seat };
        connection(room, seat, true);
        peers.set(`${room.code}:${seat}`, socket);
        send(socket, { type: 'joined', code: room.code, token: room.seats[seat].token, mode });
        broadcast(room);
        return;
      }
      if (msg.type === 'join') {
        if (membership) throw Error('Already at a table.');
        const room = rooms.get(String(msg.code || '').toUpperCase());
        if (!room || room.mode !== mode) throw Error('Table not found on this server.');
        const seat = joinRoom(room, msg.name);
        membership = { room, seat };
        connection(room, seat, true);
        peers.set(`${room.code}:${seat}`, socket);
        send(socket, { type: 'joined', code: room.code, token: room.seats[seat].token, mode });
        broadcast(room);
        return;
      }
      if (msg.type === 'resume') {
        if (membership) throw Error('Already at a table.');
        const room = rooms.get(String(msg.code || '').toUpperCase());
        if (!room) throw Error('Saved table not found.');
        const seat = seatForToken(room, msg.token);
        if (seat < 0) throw Error('Invalid seat token.');
        const key = `${room.code}:${seat}`;
        const prior = peers.get(key);
        if (prior && prior !== socket) prior.close(4001, 'Seat opened elsewhere');
        membership = { room, seat };
        peers.set(key, socket);
        connection(room, seat, true);
        send(socket, { type: 'joined', code: room.code, token: room.seats[seat].token, mode });
        broadcast(room);
        return;
      }
      if (msg.type === 'action') {
        if (!membership) throw Error('Join a table first.');
        act(membership.room, membership.seat, msg.action);
        broadcast(membership.room);
        return;
      }
      throw Error('Unknown request.');
    } catch (error) { send(socket, { type: 'error', message: error.message }); }
  });
  socket.on('close', () => {
    if (!membership) return;
    const { room, seat } = membership;
    const key = `${room.code}:${seat}`;
    if (peers.get(key) !== socket) return;
    peers.delete(key);
    connection(room, seat, false);
    broadcast(room);
  });
});
server.listen(port, '0.0.0.0', () => console.log(`Skull ${mode} table on 0.0.0.0:${port}`));
