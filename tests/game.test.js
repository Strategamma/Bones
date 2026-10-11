import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRoom, joinRoom, connection, act, view } from '../server/game.js';

function table() {
  const { room } = makeRoom('lan', 'Ada');
  joinRoom(room, 'Bo'); joinRoom(room, 'Cy');
  room.seats.forEach((_, i) => connection(room, i, true));
  act(room, 0, { type: 'start' });
  return room;
}
function flowers(room) { for (let i = 0; i < 3; i++) act(room, i, { type: 'place', disc: 'flower' }); }
function oneBid(room) {
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
  act(room, 0, { type: 'next' });
  flowers(room); oneBid(room);
  act(room, 0, { type: 'flip', target: 0 });
  assert.equal(room.stage, 'win');
  assert.equal(room.winner, 0);
});
test('opponent skull costs a hidden disc and does not leak hands', () => {
  const room = table();
  act(room, 0, { type: 'place', disc: 'flower' });
  act(room, 1, { type: 'place', disc: 'skull' });
  act(room, 2, { type: 'place', disc: 'flower' });
  act(room, 0, { type: 'bid', amount: 2 });
  act(room, 1, { type: 'pass' });
  act(room, 2, { type: 'pass' });
  act(room, 0, { type: 'flip', target: 0 });
  act(room, 0, { type: 'flip', target: 1 });
  assert.equal(room.stage, 'loss');
  assert.equal(view(room, 0).seats[1].stack, 1);
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
test('out-of-turn placement and zero bids are rejected', () => {
  const room = table();
  assert.throws(() => act(room, 1, { type: 'place', disc: 'flower' }), /Wait/);
  flowers(room);
  assert.throws(() => act(room, 0, { type: 'bid', amount: 0 }), /Bid above/);
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
