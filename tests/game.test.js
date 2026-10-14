import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRoom, newRoomCode, joinRoom, connection, act, view, removePlayer, automaticAction } from '../server/game.js';

test('new table codes avoid lookalike characters', () => {
  for (let i = 0; i < 100; i++) assert.match(newRoomCode(), /^[A-HJ-NP-Z2-9]{6}$/);
});

function table() {
  const { room } = makeRoom('lan', 'Ada');
  joinRoom(room, 'Bo'); joinRoom(room, 'Cy');
  room.seats.forEach((_, i) => {connection(room, i, true);act(room,i,{type:"ready",ready:true});});
  act(room, 0, { type: 'start' });
  return room;
}
function flowers(room) { for (let i = 0; i < 3; i++) act(room, i, { type: 'place', disc: 'flower' }); }
function oneBid(room) {
  while (room.turn !== 0) act(room, room.turn, { type: 'place', disc: 'flower' });
  act(room, room.turn, { type: 'bid', amount: 1 });
  act(room, room.turn, { type: 'pass' });
  act(room, room.turn, { type: 'pass' });
}
test('two successful challenges win; own stack flips first', () => {
  const room = table();
  flowers(room); oneBid(room);
  assert.equal(room.stage, 'reveal');
  assert.throws(() => act(room, 0, { type: 'flip', target: 1 }), /own discs first/);
  act(room, 0, { type: 'flip', target: 0 });
  assert.equal(room.seats[0].wins, 1);
  assert.equal(room.stage, 'result');
  assert.equal(view(room, 0).resultKind, 'flower');
  act(room, 0, { type: 'next' });
  assert.equal(room.last, '');
  flowers(room); oneBid(room);
  act(room, 0, { type: 'flip', target: 0 });
  assert.equal(room.stage, 'win');
  assert.equal(room.winner, 0);
  act(room, 0, { type: 'rematch' });
  assert.equal(room.last, '');
  assert.equal(room.stage, 'place');
});
test('opponent skull costs a hidden disc and does not leak hands', () => {
  const room = table();
  act(room, 0, { type: 'place', disc: 'flower' });
  act(room, 1, { type: 'place', disc: 'skull' });
  act(room, 2, { type: 'place', disc: 'flower' });
  act(room, 0, { type: 'place', disc: 'flower' });
  act(room, 1, { type: 'place', disc: 'flower' });
  act(room, 2, { type: 'place', disc: 'flower' });
  act(room, 0, { type: 'bid', amount: 4 });
  act(room, 1, { type: 'pass' });
  act(room, 2, { type: 'pass' });
  act(room, 0, { type: 'flip', target: 0 });
  act(room, 0, { type: 'flip', target: 0, position:'bottom' });
  act(room, 0, { type: 'flip', target: 1 });
  act(room, 0, { type: 'flip', target: 1, position:'bottom' });
  assert.equal(room.stage, 'loss');
  assert.equal(view(room, 0).resultKind, 'skull');
  assert.equal(view(room, 0).seats[1].stack, 2);
  assert.equal(view(room, 0).hand.includes('skull'), true);
  assert.equal(JSON.stringify(view(room, 0)).includes(room.seats[1].token), false);
  assert.throws(() => act(room, 0, { type: 'discard', index: 0 }), /skull owner/);
  act(room, 1, { type: 'discard', index: 0 });
  assert.equal(room.seats[0].hand.length, 3);
  assert.equal(room.stage, 'result');
});
test('host departure pauses and connected players vote for deterministic migration', () => {
  const room = table();
  act(room, 0, { type: 'place', disc: 'flower' });
  connection(room, 0, false);
  assert.equal(room.stage, 'paused');
  act(room, 1, { type: 'continue' });
  assert.equal(room.stage, 'paused');
  act(room, 2, { type: 'continue' });
  assert.equal(room.host, 1);
  assert.equal(room.stage, 'place');
  act(room, 1, { type: 'place', disc: 'flower' });
  act(room, 2, { type: 'place', disc: 'flower' });
  assert.equal(room.stage, 'add');
  connection(room, 0, true);
  assert.equal(room.host, 1);
});
test('rejoining player resumes without a false host-change notice', () => {
  const room = table();
  act(room, 0, { type: 'place', disc: 'flower' });
  connection(room, 1, false);
  connection(room, 1, true);
  for (const seat of [0, 1, 2]) act(room, seat, { type: 'continue' });
  assert.equal(room.stage, 'place');
  assert.equal(room.host, 0);
  assert.equal(room.last, '');
});
test('first placements are independent; duplicate cards, later out-of-turn moves and zero bids are rejected', () => {
  const room=table();
  act(room,2,{type:'place',index:0}); act(room,1,{type:'place',index:3});
  assert.throws(()=>act(room,2,{type:'place',index:0}),/already placed/);
  assert.throws(()=>act(room,0,{type:'place',index:4}),/not in your hand/);
  act(room,0,{type:'place',index:0});
  assert.equal(room.turn,0);
  assert.throws(()=>act(room,1,{type:'place',index:0}),/Wait/);
  assert.throws(()=>act(room,0,{type:'bid',amount:0}),/Bid above/);
});
test('maximum bid goes directly to reveal and skull loss can eliminate', () => {
  const room = table();
  room.seats[0].hand = ['skull'];
  act(room, 0, { type: 'place', disc: 'skull' });
  act(room, 1, { type: 'place', disc: 'flower' });
  act(room, 2, { type: 'place', disc: 'flower' });
  act(room, 0, { type: 'bid', amount: 3 });
  assert.equal(room.stage, 'reveal');
  act(room, 0, { type: 'flip', target: 0 });
  assert.equal(room.stage, 'loss');
  act(room, 0, { type: 'discard', index: 0 });
  assert.equal(room.stage, 'choose-lead');
  act(room, 0, { type: 'lead', target: 2 });
  assert.equal(room.starter, 2);
  assert.equal(room.stage, 'result');
});
test('starter adds first, play continues clockwise, bid cap grows and bidding locks cards', () => {
  const room=table();flowers(room);
  assert.equal(room.stage,'add');assert.equal(room.turn,0);
  assert.equal(view(room,0).total,3);
  assert.throws(()=>act(room,0,{type:'bid',amount:4}),/up to the discs/);
  act(room,0,{type:'place',index:0});assert.equal(room.turn,1);assert.equal(view(room,1).total,4);
  act(room,1,{type:'bid',amount:2});assert.equal(room.stage,'bid');assert.equal(room.turn,2);
  assert.throws(()=>act(room,2,{type:'place',index:0}),/Raise or pass/);
  assert.throws(()=>act(room,2,{type:'bid',amount:5}),/up to the discs/);
});
test('host changes in lobby and after victory without taking control back', () => {
  const room = table();
  room.stage = 'lobby';
  connection(room, 0, false);
  assert.equal(room.host, 1);
  connection(room, 0, true);
  assert.equal(room.host, 1);
  room.stage = 'win'; room.winner = 1;
  connection(room, 1, false);
  assert.equal(room.host, 0);
  connection(room, 1, true);
  assert.equal(room.host, 0);
});
test('only the host can transfer control to a connected player', () => {
  const room = table();
  assert.throws(() => act(room, 1, { type: 'transfer-host', target: 2 }), /Only the host/);
  act(room, 0, { type: 'transfer-host', target: 1 });
  assert.equal(room.host, 1);
  assert.throws(() => act(room, 0, { type: 'transfer-host', target: 2 }), /Only the host/);
  connection(room, 2, false);
  assert.throws(() => act(room, 1, { type: 'transfer-host', target: 2 }), /connected player/);
});

test('removal cancels an unfinished reveal, keeps earned points and preserves private cards', () => {
  const room = table(); flowers(room); oneBid(room); act(room,0,{type:'flip',target:0});
  act(room,0,{type:'next'}); flowers(room); oneBid(room);
  const oldToken = room.seats[1].token;
  removePlayer(room,1);
  assert.equal(room.stage,'place'); assert.equal(room.seats[0].wins,1);
  assert.equal(room.seats.length,2); assert.equal(room.seats.some(s=>s.token===oldToken),false);
  assert.equal(room.challenger,-1); assert.deepEqual(room.flips,[]);
  assert.equal(view(room,0).total,0); assert.equal(view(room,0).hand.length,4);
  assert.equal(Object.hasOwn(view(room,0).seats[1],'hand'),false);
  act(room,0,{type:'place',disc:'flower'}); act(room,1,{type:'place',disc:'flower'});
  assert.equal(room.stage,'add');
});

test('mixed top and bottom reveals never repeat an index and only expose opened cards', () => {
  const room=table();flowers(room);
  for(let cycle=0;cycle<2;cycle++) for(const seat of [0,1,2]) act(room,seat,{type:'place',disc:'flower'});
  act(room,0,{type:'place',disc:'skull'});act(room,1,{type:'place',disc:'skull'});act(room,2,{type:'place',disc:'skull'});
  act(room,0,{type:'bid',amount:4});act(room,1,{type:'pass'});act(room,2,{type:'pass'});
  assert.throws(()=>act(room,0,{type:'flip',target:0,position:'middle'}),/top or bottom/);
  for(let i=0;i<3;i++) act(room,0,{type:'flip',target:0,position:'bottom'});
  assert.deepEqual(room.flips.map(f=>f.index),[0,1,2]);
  assert.equal(room.stage,'reveal');assert.equal(view(room,1).flips.every(f=>f.disc==='flower'),true);
  act(room,0,{type:'flip',target:0,position:'top'});
  assert.deepEqual(room.flips.map(f=>f.index),[0,1,2,3]);assert.equal(room.stage,'loss');
  assert.throws(()=>act(room,1,{type:'discard',index:0}),/skull owner/);
  act(room,0,{type:'discard',index:1});
  assert.equal(room.seats[0].hand.length,3);assert.equal(view(room,1).discarded.owner,0);
  assert.equal(view(room,1).discarded.by,0);assert.equal(Object.hasOwn(view(room,1).seats[0],'hand'),false);
});

test('a rematch rejected for a disconnected player keeps the victory screen recoverable', () => {
  const room=table();flowers(room);oneBid(room);act(room,0,{type:'flip',target:0});
  act(room,0,{type:'next'});flowers(room);oneBid(room);act(room,0,{type:'flip',target:0});
  connection(room,2,false);
  assert.throws(()=>act(room,0,{type:'rematch'}),/connected players/);
  assert.equal(room.stage,'win');assert.equal(room.winner,0);assert.equal(room.seats[0].wins,2);
  connection(room,2,true);act(room,0,{type:'rematch'});
  assert.equal(room.stage,'place');assert.equal(room.round,1);assert.equal(room.leader,-1);
  assert.equal(room.challenger,-1);assert.deepEqual(room.seats.map(s=>s.wins),[0,0,0]);
});

test('direct card selection accepts unopened indices and rejects repeats and invalid indices',()=>{
 const room=table();flowers(room);
 act(room,0,{type:'place',disc:'flower'});act(room,1,{type:'place',disc:'flower'});act(room,2,{type:'place',disc:'flower'});
 act(room,0,{type:'bid',amount:3});act(room,1,{type:'pass'});act(room,2,{type:'pass'});
 assert.throws(()=>act(room,0,{type:'flip',target:1,index:0}),/own/);
 assert.throws(()=>act(room,0,{type:'flip',target:0,index:8}),/unopened/);
 act(room,0,{type:'flip',target:0,index:0});
 assert.equal(room.flips[0].index,0);
 assert.throws(()=>act(room,0,{type:'flip',target:0,index:0}),/unopened/);
 act(room,0,{type:'flip',target:0,index:1});act(room,0,{type:'flip',target:1,index:0});
 assert.equal(room.stage,'result');assert.equal(room.seats[0].wins,1);
});

test('continuing an auction skips players who already passed', () => {
  const room = table();
  room.stage = 'lobby'; joinRoom(room, 'Dee'); connection(room, 3, true);act(room,3,{type:'ready',ready:true}); act(room, 0, {type:'start'});
  for (let i = 0; i < 4; i++) act(room, i, {type:'place', index:0});
  act(room, 0, {type:'bid', amount:1});
  act(room, 1, {type:'pass'});
  act(room, 2, {type:'bid', amount:2});
  act(room, 3, {type:'pass'});
  connection(room, 0, false);
  for (const i of [1, 2, 3]) act(room, i, {type:'continue'});
  assert.equal(room.stage, 'reveal');
  assert.equal(room.challenger, 2);
  assert.equal(room.turn, 2);
});

test('continuing an auction retains clockwise order among eligible bidders', () => {
  const room = table(); room.stage = 'lobby';
  joinRoom(room, 'Dee'); joinRoom(room, 'Eve');
  connection(room, 3, true); connection(room, 4, true);act(room,3,{type:'ready',ready:true});act(room,4,{type:'ready',ready:true}); act(room, 0, {type:'start'});
  for (let i = 0; i < 5; i++) act(room, i, {type:'place', index:0});
  act(room, 0, {type:'bid', amount:1}); act(room, 1, {type:'pass'});
  act(room, 2, {type:'bid', amount:2}); act(room, 3, {type:'pass'}); act(room, 4, {type:'bid', amount:3});
  connection(room, 0, false);
  for (const i of [1, 2, 3, 4]) act(room, i, {type:'continue'});
  assert.equal(room.stage, 'bid'); assert.equal(room.turn, 2);
  act(room, 2, {type:'pass'}); assert.equal(room.stage, 'reveal'); assert.equal(room.challenger, 4);
});

test('an eliminated host disconnecting between rounds permits host migration', () => {
  const room = table(); room.seats[0].hand = []; room.stage = 'result';
  connection(room, 0, false);
  assert.equal(room.stage, 'paused'); assert.equal(room.pausedStage, 'result');
  act(room, 1, {type:'continue'}); act(room, 2, {type:'continue'});
  assert.equal(room.host, 1); assert.equal(room.stage, 'result');
  act(room, 1, {type:'next'}); assert.equal(room.stage, 'place');
});

test('rematch opt-ins are counted once and all humans must consent',()=>{const room=table();room.stage='win';room.winner=0;room.seats[0].wins=2;act(room,1,{type:'rematch-ready'});act(room,1,{type:'rematch-ready'});assert.equal(view(room,0).seats.filter(p=>p.rematchReady).length,1);act(room,0,{type:'rematch-ready'});assert.equal(room.stage,'win');act(room,2,{type:'rematch-ready'});assert.equal(room.stage,'place');assert.ok(room.seats.every(p=>!p.rematchReady&&p.wins===0));});
test('partial rematch votes survive seat management',()=>{const room=table();room.stage='win';act(room,1,{type:'rematch-ready'});act(room,0,{type:'lobby'});assert.equal(room.stage,'lobby');assert.equal(room.seats[1].ready,true);assert.equal(room.seats[2].ready,false);assert.throws(()=>act(room,1,{type:'start'}),/host/);});
test('offline seats prevent automatic rematch',()=>{const room=table();room.stage='win';connection(room,2,false);act(room,0,{type:'rematch-ready'});act(room,1,{type:'rematch-ready'});assert.equal(room.stage,'win');assert.throws(()=>act(room,2,{type:'rematch-ready'}),/Reconnect/);});
test('guests must explicitly ready before host starts',()=>{const {room}=makeRoom('lan','A');joinRoom(room,'B');joinRoom(room,'C');room.seats.forEach((_,i)=>connection(room,i,true));assert.throws(()=>act(room,0,{type:'start'}),/READY/);act(room,1,{type:'ready',ready:true});act(room,2,{type:'ready',ready:true});act(room,0,{type:'start'});assert.equal(room.stage,'place');});
test('disconnect resets lobby readiness',()=>{const room=table();room.stage='lobby';connection(room,1,false);assert.equal(room.seats[1].ready,false);connection(room,1,true);assert.equal(room.seats[1].ready,false);});
test('shared pause requires connected player consensus',()=>{const room=table();act(room,0,{type:'pause'});assert.equal(room.stage,'paused');act(room,0,{type:'continue'});act(room,1,{type:'continue'});assert.equal(room.stage,'paused');act(room,2,{type:'continue'});assert.equal(room.stage,'place');});
test('victory lobby keeps identities and scores but resets cards/readiness',()=>{const room=table();room.stage='win';room.seats[0].wins=2;const tokens=room.seats.map(p=>p.token);act(room,0,{type:'lobby'});assert.equal(room.stage,'lobby');assert.deepEqual(room.seats.map(p=>p.token),tokens);assert.equal(room.seats[0].wins,2);assert.ok(room.seats.every(p=>!p.ready&&p.stack.length===0));});

test('host rematch immediately opens seat management and preserves existing votes',()=>{const room=table();room.stage='win';room.seats[0].wins=2;act(room,1,{type:'rematch-ready'});assert.throws(()=>act(room,2,{type:'prepare-rematch'}),/host/);act(room,0,{type:'prepare-rematch'});assert.equal(room.stage,'lobby');assert.deepEqual(room.seats.map(p=>p.ready),[true,true,false]);assert.equal(room.seats[0].wins,2);assert.throws(()=>act(room,0,{type:'start'}),/READY/);act(room,2,{type:'ready',ready:true});act(room,0,{type:'start'});assert.equal(room.stage,'place');assert.ok(room.seats.every(p=>p.wins===0));});

test('session flowers count match wins and survive lobby and rematch',()=>{
 const room=table();
 for(let match=0;match<2;match++){
  for(let round=0;round<2;round++){flowers(room);oneBid(room);act(room,0,{type:'flip',target:0});if(!round)act(room,0,{type:'next'});}
  assert.equal(view(room,1).seats[0].sessionWins,match+1);
  act(room,0,{type:'prepare-rematch'});assert.equal(room.seats[0].sessionWins,match+1);
  for(const seat of [1,2])act(room,seat,{type:'ready',ready:true});act(room,0,{type:'start'});
  assert.equal(room.seats[0].wins,0);assert.equal(room.seats[0].sessionWins,match+1);
 }
});
test('last-player-standing earns one session flower without awarding round points',()=>{
 const room=table();room.seats[1].hand=[];room.seats[2].hand=[];room.stage='add';removePlayer(room,2);
 assert.equal(room.stage,'win');assert.equal(room.winner,0);assert.equal(room.seats[0].sessionWins,1);assert.equal(room.seats[0].wins,0);
 act(room,0,{type:'rematch-ready'});assert.equal(room.seats[0].sessionWins,1);
});

test('public player identities survive seat reindexing without exposing resume tokens',()=>{const room=table(),before=view(room,0),id=before.seats[2].id;assert.ok(id);assert.notEqual(id,room.seats[2].token);assert.equal(new Set(before.seats.map(p=>p.id)).size,3);removePlayer(room,1);assert.equal(view(room,0).seats[1].id,id);});

test('automatic opening reveals only own top cards and stops before opponent choices',()=>{
 const room=table();flowers(room);act(room,0,{type:'place',disc:'flower'});act(room,1,{type:'place',disc:'flower'});act(room,2,{type:'place',disc:'flower'});act(room,0,{type:'bid',amount:3});act(room,1,{type:'pass'});act(room,2,{type:'pass'});
 for(const index of [1,0]){const pending=automaticAction(room);assert.equal(pending.seat,0);assert.equal(pending.action.index,index);act(room,pending.seat,pending.action);}
 assert.equal(room.stage,'reveal');assert.equal(room.remaining,1);assert.equal(automaticAction(room),null);
});
test('automatic skull discard removes one random hidden card and stops in results',()=>{
 const room=table();act(room,0,{type:'place',disc:'skull'});act(room,1,{type:'place',disc:'flower'});act(room,2,{type:'place',disc:'flower'});oneBid(room);
 let pending=automaticAction(room);act(room,pending.seat,pending.action);assert.equal(room.stage,'loss');pending=automaticAction(room);act(room,pending.seat,pending.action);assert.equal(room.stage,'result');assert.equal(room.seats[0].hand.length,3);assert.equal(room.discarded.owner,0);assert.equal(automaticAction(room),null);
});
