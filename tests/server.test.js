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
  const server = spawn(process.execPath, ['server/index.js'], { cwd: process.cwd(), env: { ...process.env, PORT: String(port), TABLE_MODE: 'lan', DATA_FILE: '', DISABLE_LAN_DISCOVERY: '1' }, stdio: 'ignore' });
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
  a.send({ type: 'ping' });
  assert.equal((await a.next('pong')).type, 'pong');
  a.send({ type: 'create', name: 'Ada' });
  const joinedA = await a.next('joined');
  await a.next('state');
  b.send({ type: 'join', code: joinedA.code, name: 'Bo' });
  const joinedB = await b.next('joined');
  await a.next('state'); await b.next('state');
  c.send({ type: 'join', code: joinedA.code, name: 'Cy' });
  await c.next('joined');
  await a.next('state'); await b.next('state'); await c.next('state');
  for (const guest of [b,c]) { guest.send({type:'action',action:{type:'ready',ready:true}}); await a.next('state'); await b.next('state'); await c.next('state'); }
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
test('internet service serves the game and accepts WebSocket heartbeats', async t => {
  const port = await freePort();
  const server = spawn(process.execPath, ['server/index.js'], { cwd: process.cwd(), env: { ...process.env, PORT: String(port), TABLE_MODE: 'internet', DATA_FILE: '' }, stdio: 'ignore' });
  t.after(() => server.kill());
  let health;
  for (let i = 0; i < 30; i++) {
    try { const response = await fetch(`http://127.0.0.1:${port}/health`); if (response.ok) { health = await response.json(); break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  assert.deepEqual(health, { ok: true, mode: 'internet' });
  const root = await fetch(`http://127.0.0.1:${port}/`, { redirect: 'manual' });
  assert.equal(root.headers.get('location'), '/Bones/');
  const manifest = await (await fetch(`http://127.0.0.1:${port}/Bones/manifest.webmanifest`)).json();
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, './');
  const icon = await fetch(`http://127.0.0.1:${port}/Bones/assets/bones-icon-192.png`);
  assert.equal(icon.headers.get('content-type'), 'image/png');
  const player = await client(`ws://127.0.0.1:${port}/ws`);
  t.after(() => player.close());
  player.send({ type: 'hello' });
  assert.equal((await player.next('hello')).mode, 'internet');
  player.send({ type: 'ping' });
  assert.equal((await player.next('pong')).type, 'pong');
  player.send({type:'list-rooms'}); assert.match((await player.next('error')).message,/LAN only/);
  player.send({type:'auto-join',name:'Ada'}); assert.match((await player.next('error')).message,/LAN only/);
  player.send({ type: 'create', name: 'Ada' });
  const first = await player.next('joined');
  await player.next('state');
  const otherRoom = await client(`ws://127.0.0.1:${port}/ws`);
  t.after(() => otherRoom.close());
  otherRoom.send({ type: 'create', name: 'Dee' });
  const second = await otherRoom.next('joined');
  assert.notEqual(first.code, second.code);
  await otherRoom.next('state');
  const guest = await client(`ws://127.0.0.1:${port}/ws`);
  t.after(() => guest.close());
  guest.send({ type: 'join', code: first.code, name: 'Bo' });
  await guest.next('joined');
  await guest.next('state'); await player.next('state');
  guest.send({ type: 'action', action: { type: 'kick', target: 0 } });
  assert.match((await guest.next('error')).message, /Only the host/);
  player.send({ type: 'action', action: { type: 'transfer-host', target: 1 } });
  assert.equal((await guest.next('state')).state.host, 1);
  await player.next('state');
  guest.send({ type: 'action', action: { type: 'kick', target: 0 } });
  assert.equal((await player.next('kicked')).type, 'kicked');
  assert.equal((await guest.next('state')).state.seats.length, 1);
  otherRoom.send({ type: 'ping' });
  assert.equal((await otherRoom.next('pong')).type, 'pong');
});

test('LAN auto seating, live directory, capacity, explicit rooms and active removal', async t => {
  const port = await freePort();
  const server = spawn(process.execPath, ['server/index.js'], { cwd: process.cwd(), env: { ...process.env, PORT: String(port), TABLE_MODE: 'lan', DATA_FILE: '', DISABLE_LAN_DISCOVERY: '1' }, stdio: 'ignore' });
  t.after(() => server.kill());
  for (let i=0;i<30;i++) { try { if ((await fetch(`http://127.0.0.1:${port}/health`)).ok) break; } catch {} await new Promise(r=>setTimeout(r,50)); }
  const clients = []; t.after(() => clients.forEach(c=>c.close()));
  const open = async () => { const c = await client(`ws://127.0.0.1:${port}/ws`); clients.push(c); return c; };
  const watcher = await open(); watcher.send({type:'list-rooms'});
  assert.deepEqual((await watcher.next('rooms')).rooms, []);
  const seated = [], tokens = [];
  for (let i=0;i<7;i++) {
    const c = await open(); seated.push(c); c.send({type:'auto-join',name:`Guest ${i}`});
    tokens.push(await c.next('joined')); await c.next('state');
    const directory = (await watcher.next('rooms')).rooms;
    assert.equal(directory[0].players, Math.min(i+1,6));
    assert.equal(directory[0].capacity,6);
    assert.equal(JSON.stringify(directory).includes(tokens[0].token),false);
    assert.equal(Object.hasOwn(directory[0],'hand'),false);
    assert.equal(tokens[i].code === tokens[0].code, i<6);
  }
  const extra = await open(); extra.send({type:'create',name:'Another host'});
  const extraSeat = await extra.next('joined'); await extra.next('state');
  assert.notEqual(extraSeat.code,tokens[6].code);
  assert.equal((await watcher.next('rooms')).rooms.length,3);
  // Consume queued lobby broadcasts before asserting the game transition.
  for (const guest of seated.slice(1,6)) { guest.send({type:'action',action:{type:'ready',ready:true}}); await watcher.next('rooms'); }
  seated[0].send({type:'action',action:{type:'start'}});
  assert.equal((await watcher.next('rooms')).rooms[0].status,'playing');
  for (;;) { if ((await seated[0].next('state')).state.stage==='place') break; }
  seated[0].send({type:'action',action:{type:'place',disc:'skull'}});
  assert.equal((await seated[0].next('state')).state.turn,1); await watcher.next('rooms');
  seated[0].send({type:'action',action:{type:'kick',target:1}});
  await seated[1].next('kicked');
  const reset = (await seated[0].next('state')).state;
  assert.equal(reset.seats.length,5); assert.equal(reset.stage,'place');
  assert.equal(reset.round,2); assert.equal(reset.total,0); assert.equal(reset.turn,0);
  assert.deepEqual(reset.hand,['flower','flower','flower','skull']);
  assert.equal((await watcher.next('rooms')).rooms[0].players,5);
  const expelled = await open(); expelled.send({type:'resume',code:tokens[1].code,token:tokens[1].token});
  assert.match((await expelled.next('error')).message,/Invalid seat token/);
  // A reindexed peer keeps its private hand and can act at the correct new seat.
  seated[0].send({type:'action',action:{type:'place',disc:'flower'}}); await seated[0].next('state'); await watcher.next('rooms');
  seated[2].send({type:'action',action:{type:'place',disc:'flower'}});
  const advanced = (await seated[0].next('state')).state; assert.equal(advanced.turn,2); await watcher.next('rooms');
  extra.send({type:'leave'}); await extra.next('left');
  assert.equal((await watcher.next('rooms')).rooms.length,2);
  extra.send({type:'auto-join',name:'Moved'}); const moved = await extra.next('joined');
  assert.equal(moved.code,tokens[6].code);
  await watcher.next('rooms');
  const resumed = await open(); resumed.send({type:'auto-join',code:tokens[0].code,token:tokens[0].token});
  assert.equal((await resumed.next('joined')).token,tokens[0].token);
  assert.equal((await resumed.next('state')).state.seat,0);
});

for (const mode of ['lan', 'internet']) test(`${mode} hosts add, start and remove paced server bots`, async t => {
  const port = await freePort();
  const server = spawn(process.execPath, ['server/index.js'], {env:{...process.env, PORT:String(port), TABLE_MODE:mode, DATA_FILE:'', DISABLE_LAN_DISCOVERY:'1'}, stdio:'ignore'});
  t.after(()=>server.kill());
  for(let i=0;i<30;i++) {try {if((await fetch(`http://127.0.0.1:${port}/health`)).ok) break;} catch {} await new Promise(r=>setTimeout(r,50));}
  const host=await client(`ws://127.0.0.1:${port}/ws`); t.after(()=>host.close());
  host.send({type:'create',name:'Human'}); await host.next('joined'); await host.next('state');
  let botId;
  for(let i=0;i<2;i++) {
    host.send({type:'action',action:{type:'add-bot'}});
    const s=(await host.next('state')).state;
    assert.equal(s.seats.length,i+2); assert.equal(s.seats.at(-1).bot,true);
    assert.equal(s.seats.at(-1).hand,undefined);if(i===0)botId=s.seats[1].id;
  }
  host.send({type:'action',action:{type:'kick',target:1,playerId:'stale-player-id'}});assert.match((await host.next('error')).message,/seat changed/);
  host.send({type:'action',action:{type:'start'}}); assert.equal((await host.next('state')).state.stage,'place');
  host.send({type:'action',action:{type:'place',disc:'flower'}}); await host.next('state');
  let s;
  for(let i=0;i<2;i++) s=(await host.next('state')).state;
  assert.equal(s.stage,'add'); assert.equal(s.total,3);
  host.send({type:'action',action:{type:'kick',target:1,playerId:botId}});
  s=(await host.next('state')).state; assert.equal(s.seats.length,2); assert.equal(s.round,2);
  s=(await host.next('state')).state; assert.equal(s.seats[1].stack,1);
  host.send({type:'action',action:{type:'add-bot'}}); assert.match((await host.next('error')).message,/started/);
});

test('independent LAN clients synchronize readiness, complete matches and return together', async t => {
 const port=await freePort();
 const server=spawn(process.execPath,['server/index.js'],{env:{...process.env,PORT:String(port),TABLE_MODE:'lan',DATA_FILE:'',DISABLE_LAN_DISCOVERY:'1'},stdio:'ignore'});
 t.after(()=>server.kill());
 for(let i=0;i<30;i++){try{if((await fetch(`http://127.0.0.1:${port}/health`)).ok)break;}catch{}await new Promise(r=>setTimeout(r,50));}
 const players=await Promise.all([0,1,2].map(()=>client(`ws://127.0.0.1:${port}/ws`)));t.after(()=>players.forEach(p=>p.close()));
 players[0].send({type:'hello'});const hello=await players[0].next('hello');assert.equal(hello.mode,'lan');if(hello.lanUrl)assert.match(hello.lanUrl,/^http:\/\//);
 players[0].send({type:'create',name:'Host'});const joined=await players[0].next('joined');await players[0].next('state');
 for(let i=1;i<3;i++){players[i].send({type:'join',code:joined.code,name:`Guest ${i}`});await players[i].next('joined');for(let j=0;j<=i;j++)await players[j].next('state');}
 const outsider=await client(`ws://127.0.0.1:${port}/ws`);t.after(()=>outsider.close());outsider.send({type:'join',code:'ZZZZZZ',name:'Lost'});assert.match((await outsider.next('error')).message,/found|code/i);
 players[0].send({type:'action',action:{type:'start'}});assert.match((await players[0].next('error')).message,/READY/);
 let snapshots;
 const action=async(seat,move)=>{players[seat].send({type:'action',action:move});snapshots=await Promise.all(players.map(async p=>(await p.next('state')).state));return snapshots[0];};
 for(let i=1;i<3;i++)await action(i,{type:'ready',ready:true});
 await action(0,{type:'start'});
 players[0].send({type:'action',action:{type:'start'}});assert.match((await players[0].next('error')).message,/Place/);
 for(let round=0;round<2;round++){
  for(let i=0;i<3;i++)await action(i,{type:'place',disc:'flower'});
  await action(0,{type:'bid',amount:1});await action(1,{type:'pass'});await action(2,{type:'pass'});
  const s=await action(0,{type:'flip',target:0});assert.equal(s.seats[0].wins,round+1);
  assert.ok(snapshots.every(v=>v.stage===s.stage&&v.seats[0].wins===s.seats[0].wins));
  if(!round)await action(0,{type:'next'});
 }
 assert.equal(snapshots[0].stage,'win');await action(0,{type:'lobby'});assert.equal(snapshots[1].stage,'lobby');assert.equal(snapshots[1].seats[0].wins,2);assert.ok(snapshots[1].seats.every(p=>!p.ready));for(const i of [1,2])await action(i,{type:'ready',ready:true});await action(0,{type:'start'});assert.equal(snapshots[1].stage,'place');
 players[0].close();for(const p of players.slice(1))assert.equal((await p.next('state')).state.stage,'paused');
 for(const i of [1,2]){players[i].send({type:'action',action:{type:'continue'}});for(const p of players.slice(1))await p.next('state');}
 players[1].send({type:'action',action:{type:'kick',target:0}});
 for(const p of players.slice(1)){const s=(await p.next('state')).state;assert.equal(s.host,0);assert.equal(s.seats[0].name,'Guest 1');assert.equal(s.seats.length,2);}
});

test('silent transport loss closes an unresponsive socket and migrates lobby hosting', async t=>{
 const port=await freePort();
 const server=spawn(process.execPath,['server/index.js'],{env:{...process.env,PORT:String(port),TABLE_MODE:'lan',DATA_FILE:'',DISABLE_LAN_DISCOVERY:'1',WS_HEARTBEAT_MS:'200'},stdio:'ignore'});t.after(()=>server.kill());
 for(let i=0;i<30;i++){try{if((await fetch(`http://127.0.0.1:${port}/health`)).ok)break;}catch{}await new Promise(r=>setTimeout(r,50));}
 const stalled=new WebSocket(`ws://127.0.0.1:${port}/ws`,{autoPong:false});t.after(()=>stalled.close());
 await new Promise((resolve,reject)=>{stalled.once('open',resolve);stalled.once('error',reject)});
 const joined=new Promise(resolve=>stalled.on('message',raw=>{const m=JSON.parse(String(raw));if(m.type==='joined')resolve(m)}));
 stalled.send(JSON.stringify({type:'create',name:'Silent host'}));const seat=await joined;
 const guest=await client(`ws://127.0.0.1:${port}/ws`);t.after(()=>guest.close());guest.send({type:'join',code:seat.code,name:'Connected guest'});await guest.next('joined');await guest.next('state');
 const s=(await guest.next('state')).state;assert.equal(s.seats[0].connected,false);assert.equal(s.host,1);
 guest.send({type:'ping'});await guest.next('pong');
});

test('human bid wins auto-open and random-discard in synchronized independent clients',async t=>{
 const port=await freePort(),server=spawn(process.execPath,['server/index.js'],{env:{...process.env,PORT:String(port),DATA_FILE:'',DISABLE_LAN_DISCOVERY:'1'},stdio:'ignore'});t.after(()=>server.kill());
 for(let i=0;i<30;i++){try{if((await fetch(`http://127.0.0.1:${port}/health`)).ok)break;}catch{}await new Promise(r=>setTimeout(r,50));}
 const players=await Promise.all([0,1,2].map(()=>client(`ws://127.0.0.1:${port}/ws`)));t.after(()=>players.forEach(p=>p.close()));
 players[0].send({type:'create',name:'Host'});const joined=await players[0].next('joined');await players[0].next('state');
 for(let i=1;i<3;i++){players[i].send({type:'join',code:joined.code,name:'Guest '+i});await players[i].next('joined');for(let j=0;j<=i;j++)await players[j].next('state');}
 const states=()=>Promise.all(players.map(async p=>(await p.next('state')).state));
 const move=async(seat,action)=>{players[seat].send({type:'action',action});return states()};
 await move(1,{type:'ready',ready:true});await move(2,{type:'ready',ready:true});await move(0,{type:'start'});
 for(const disc of ['flower','skull']){
  for(let i=0;i<3;i++)await move(i,{type:'place',disc:i===0?disc:'flower'});
  await move(0,{type:'bid',amount:1});await move(1,{type:'pass'});await move(2,{type:'pass'});
  let views=await states();assert.ok(views.every(s=>s.flips.at(-1).disc===disc));
  if(disc==='skull'){assert.ok(views.every(s=>s.stage==='loss'));views=await states();assert.ok(views.every(s=>s.discarded.owner===0&&s.seats[0].discs===3));}
  assert.ok(views.every(s=>s.stage==='result'));
  if(disc==='flower')await move(0,{type:'next'});
 }
});
