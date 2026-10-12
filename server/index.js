import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, resolve, dirname } from 'node:path';
import { WebSocketServer, WebSocket } from 'ws';
import { makeRoom, newRoomCode, joinRoom, seatForToken, connection, act, view, removePlayer } from './game.js';
import { lanAddress, LAN_NAME, startLanDiscovery } from './lan-discovery.js';

const port = Number(process.env.PORT || 10000);
const mode = process.env.TABLE_MODE === 'internet' ? 'internet' : 'lan';
const dataFile = process.env.DATA_FILE ?? (mode === 'lan' ? './data/rooms.json' : '');
const base = '/Bones/';
const dist = resolve('dist');
const rooms = new Map();
const peers = new Map();
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
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
  publishRooms();
  persist();
}
const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (url.pathname === '/health') { const ok = existsSync(join(dist, 'index.html')); res.writeHead(ok ? 200 : 503, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok, mode })); return; }
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
function roomList() {
  return [...rooms.values()].filter(room => room.mode === mode && room.seats.some(s => s.connected)).map(room => ({
    code: room.code, host: room.seats[room.host]?.name || 'Friends',
    players: room.seats.length, connected: room.seats.filter(s => s.connected).length, capacity: 6,
    status: room.stage === 'lobby' ? 'waiting' : room.stage === 'win' ? 'finished' : room.stage === 'paused' ? 'paused' : 'playing',
    joinable: room.stage === 'lobby' && room.seats.length < 6,
  }));
}
function publishRooms() {
  if (mode !== 'lan') return;
  const list = roomList();
  for (const peer of wss.clients) if (peer.roomDirectory) send(peer, { type: 'rooms', rooms: list });
}
function removeSeat(room, target) {
  removePlayer(room, target);
  for (const key of peers.keys()) if (key.startsWith(`${room.code}:`)) peers.delete(key);
  for (const peer of wss.clients) if (peer.membership?.room === room && !peer.membership.kicked) {
    if (peer.membership.seat > target) peer.membership.seat--;
    peers.set(`${room.code}:${peer.membership.seat}`, peer);
  }
  if (!room.seats.length) rooms.delete(room.code);
  broadcast(room);
}
wss.on('connection', socket => {
  let membership = null;
  socket.on('message', raw => {
    try {
      const msg = JSON.parse(String(raw));
      if (!msg || typeof msg !== 'object') throw Error('Invalid request.');
      if (msg.type === 'ping') { send(socket, { type: 'pong' }); return; }
      if (msg.type === 'hello') { send(socket, { type: 'hello', mode }); return; }
      if (msg.type === 'list-rooms') {
        if (mode !== 'lan') throw Error('Room discovery is available on LAN only.');
        socket.roomDirectory = true;
        send(socket, { type: 'rooms', rooms: roomList() }); return;
      }
      if (msg.type === 'leave') {
        if (!membership) return;
        const { room, seat } = membership;
        if (peers.get(`${room.code}:${seat}`) !== socket) throw Error('Seat opened elsewhere.');
        peers.delete(`${room.code}:${seat}`);
        membership = null; socket.membership = null;
        removeSeat(room, seat);
        send(socket, { type: 'left' }); return;
      }
      if (msg.type === 'auto-join') {
        if (mode !== 'lan') throw Error('Automatic seating is available on LAN only.');
        if (membership) throw Error('Already at a table.');
        const saved = rooms.get(String(msg.code || '').toUpperCase());
        const savedSeat = saved?.mode === mode ? seatForToken(saved, msg.token) : -1;
        let room, seat;
        if (savedSeat >= 0) {
          room = saved; seat = savedSeat;
          const prior = peers.get(`${room.code}:${seat}`);
          if (prior && prior !== socket) prior.close(4001, 'Seat opened elsewhere');
        } else {
          room = [...rooms.values()].find(r => r.mode === mode && r.stage === 'lobby' && r.seats.length < 6 && r.seats.some(s => s.connected));
          if (room) seat = joinRoom(room, msg.name || `Player ${room.seats.length + 1}`);
          else {
            ({ room, seat } = makeRoom(mode, msg.name || 'Player 1'));
            while (rooms.has(room.code)) room.code = newRoomCode();
            rooms.set(room.code, room);
          }
        }
        membership = { room, seat }; socket.membership = membership;
        peers.set(`${room.code}:${seat}`, socket); connection(room, seat, true);
        send(socket, { type: 'joined', code: room.code, token: room.seats[seat].token, mode });
        broadcast(room); return;
      }
      if (msg.type === 'create') {
        if (membership) throw Error('Already at a table.');
        const { room, seat } = makeRoom(mode, msg.name);
        while (rooms.has(room.code)) room.code = newRoomCode();
        rooms.set(room.code, room);
        membership = { room, seat };
        socket.membership = membership;
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
        socket.membership = membership;
        connection(room, seat, true);
        peers.set(`${room.code}:${seat}`, socket);
        send(socket, { type: 'joined', code: room.code, token: room.seats[seat].token, mode });
        broadcast(room);
        return;
      }
      if (msg.type === 'resume') {
        if (membership) throw Error('Already at a table.');
        const room = rooms.get(String(msg.code || '').toUpperCase());
        if (!room || room.mode !== mode) throw Error('Saved table not found.');
        const seat = seatForToken(room, msg.token);
        if (seat < 0) throw Error('Invalid seat token.');
        const key = `${room.code}:${seat}`;
        const prior = peers.get(key);
        if (prior && prior !== socket) prior.close(4001, 'Seat opened elsewhere');
        membership = { room, seat };
        socket.membership = membership;
        peers.set(key, socket);
        connection(room, seat, true);
        send(socket, { type: 'joined', code: room.code, token: room.seats[seat].token, mode });
        broadcast(room);
        return;
      }
      if (msg.type === 'action') {
        if (!membership || peers.get(`${membership.room.code}:${membership.seat}`) !== socket) throw Error('Join a table first.');
        if (msg.action?.type === 'kick') {
          const { room, seat } = membership, target = msg.action.target;
          if (seat !== room.host) throw Error('Only the host can remove a player.');
          if (!Number.isInteger(target) || target < 0 || target >= room.seats.length || target === seat) throw Error('Choose another player.');
          const removed = peers.get(`${room.code}:${target}`);
          if (removed) { send(removed, { type: 'kicked' }); removed.membership.kicked = true; removed.close(4003, 'Removed by host'); }
          removeSeat(room, target);
          return;
        }
        act(membership.room, membership.seat, msg.action);
        broadcast(membership.room);
        return;
      }
      throw Error('Unknown request.');
    } catch (error) { send(socket, { type: 'error', message: error.message }); }
  });
  socket.on('close', () => {
    if (!membership || membership.kicked) return;
    const { room, seat } = membership;
    const key = `${room.code}:${seat}`;
    if (peers.get(key) !== socket) return;
    peers.delete(key);
    connection(room, seat, false);
    broadcast(room);
  });
});
server.listen(port, '0.0.0.0', () => {
  console.log(`Skull ${mode} table on 0.0.0.0:${server.address().port}`);
  if (mode === 'lan') {
    const address = lanAddress();
    if (process.env.DISABLE_LAN_DISCOVERY !== '1') startLanDiscovery(address);
    console.log(address ? `LAN join: http://${LAN_NAME}:${server.address().port}${base} (fallback http://${address}:${server.address().port}${base})` : 'LAN join: connect this computer to the same Wi-Fi as the players.');
  }
});
