import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { WebSocket } from 'ws';

function freePort() { return new Promise(resolve => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const port = s.address().port; s.close(() => resolve(port)); }); }); }
async function client(url) {
  const ws = new WebSocket(url);
  const queue = [], waiting = [];
  ws.on('message', raw => { const message = JSON.parse(String(raw)); if (waiting.length) waiting.shift()(message); else queue.push(message); });
  await new Promise((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject); });
  return {
    send: value => ws.send(JSON.stringify(value)),
    next: async type => {
      for (;;) {
        const message = queue.length ? queue.shift() : await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(Error(`Timed out waiting for ${type}`)), 2500); waiting.push(value => { clearTimeout(timer); resolve(value); }); });
        if (message.type === type) return message;
      }
    },
    close: () => ws.close(),
  };
}
test('LAN transport creates, joins, resumes, and keeps hands private', async t => {
  const port = await freePort();
  const server = spawn(process.execPath, ['server/index.js'], { cwd: process.cwd(), env: { ...process.env, PORT: String(port), TABLE_MODE: 'lan', DATA_FILE: '' }, stdio: 'ignore' });
  t.after(() => server.kill());
  for (let i = 0; i < 30; i++) { try { const r = await fetch(`http://127.0.0.1:${port}/health`); if (r.ok) break; } catch {} await new Promise(r => setTimeout(r, 50)); }
  const health = await (await fetch(`http://127.0.0.1:${port}/health`)).json();
  assert.equal(health.mode, 'lan');
  const page = await (await fetch(`http://127.0.0.1:${port}/Bones/`)).text();
  assert.match(page, /\/Bones\/assets\/index-[^" ]+\.js/);
  const a = await client(`ws://127.0.0.1:${port}/ws`);
  const b = await client(`ws://127.0.0.1:${port}/ws`);
  const c = await client(`ws://127.0.0.1:${port}/ws`);
  t.after(() => { a.close(); b.close(); c.close(); });
  a.send({ type: 'create', name: 'Ada' });
  const joinedA = await a.next('joined');
  await a.next('state');
  b.send({ type: 'join', code: joinedA.code, name: 'Bo' });
  const joinedB = await b.next('joined');
  await a.next('state'); await b.next('state');
  c.send({ type: 'join', code: joinedA.code, name: 'Cy' });
  await c.next('joined');
  await a.next('state'); await b.next('state'); await c.next('state');
  a.send({ type: 'action', action: { type: 'start' } });
  await a.next('state'); await b.next('state'); await c.next('state');
  a.send({ type: 'action', action: { type: 'place', disc: 'skull' } });
  const stateA = (await a.next('state')).state;
  const stateB = (await b.next('state')).state;
  assert.deepEqual(stateA.stack, ['skull']);
  assert.equal(stateB.seats[0].stack, 1);
  assert.equal(Object.hasOwn(stateB.seats[0], 'hand'), false);
  assert.equal(Object.hasOwn(stateB.seats[0], 'cards'), false);
  assert.equal(JSON.stringify(stateB).includes(joinedA.token), false);
  await c.next('state');
  b.close();
  await a.next('state'); await c.next('state');
  const replacement = await client(`ws://127.0.0.1:${port}/ws`);
  t.after(() => replacement.close());
  replacement.send({ type: 'resume', code: joinedB.code, token: joinedB.token });
  await replacement.next('joined');
  const resumed = (await replacement.next('state')).state;
  assert.equal(resumed.seat, 1);
  assert.equal(resumed.stage, 'paused');
});
