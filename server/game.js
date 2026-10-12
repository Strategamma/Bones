import { randomBytes } from 'node:crypto';

const id = (n = 6) => randomBytes(n).toString('base64url').toUpperCase().slice(0, n);
const codeAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const newRoomCode = () => [...randomBytes(6)].map(byte => codeAlphabet[byte % codeAlphabet.length]).join('');
const freshHand = () => ['flower', 'flower', 'flower', 'skull'];
const alive = room => room.seats.map((s, i) => s.hand.length + s.stack.length ? i : -1).filter(i => i >= 0);
const total = room => room.seats.reduce((n, s) => n + s.stack.length, 0);
const next = (room, from, eligible = () => true) => {
  for (let n = 1; n <= room.seats.length; n++) {
    const i = (from + n) % room.seats.length;
    if (alive(room).includes(i) && room.seats[i].connected && eligible(i)) return i;
  }
  return -1;
};
const shuffle = a => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const cleanName = name => typeof name === 'string' ? name.trim().slice(0, 32) : '';
export function makeRoom(mode, name) {
  if (!['lan', 'internet'].includes(mode)) throw Error('Choose a table type.');
  const player = cleanName(name);
  if (!player) throw Error('Enter a player name.');
  const room = { code: newRoomCode(), mode, stage: 'lobby', seats: [], host: 0, turn: 0, starter: 0, round: 1, placed: 0, bid: 0, leader: -1, passed: [], challenger: -1, remaining: 0, flips: [], skullOwner: -1, last: '', winner: -1, resultKind: '', discarded: null, pausedStage: null, votes: [] };
  const seat = joinRoom(room, player);
  return { room, seat };
}
export function joinRoom(room, name) {
  if (room.stage !== 'lobby' || room.seats.length >= 6) throw Error('This table has already started or is full.');
  const player = cleanName(name);
  if (!player) throw Error('Enter a player name.');
  const seat = room.seats.length;
  room.seats.push({ name: player, token: id(32), hand: freshHand(), stack: [], wins: 0, connected: false });
  return seat;
}
export function seatForToken(room, token) { return room.seats.findIndex(s => s.token === token); }
export function connection(room, seat, connected) {
  room.seats[seat].connected = connected;
  if (connected && room.stage === 'lobby' && !room.seats[room.host]?.connected) room.host = seat;
  if (!connected && (alive(room).includes(seat) || seat === room.host || room.stage === 'choose-lead' && seat === room.challenger) && room.stage !== 'lobby' && room.stage !== 'win' && room.stage !== 'paused') {
    room.pausedStage = room.stage;
    room.stage = 'paused';
    room.votes = [];
    room.last = `${room.seats[seat].name} disconnected. Waiting for the table.`;
  }
  if (!connected && (room.stage === 'lobby' || room.stage === 'win') && seat === room.host) {
    const candidate = room.seats.findIndex(s => s.connected);
    if (candidate >= 0) room.host = candidate;
  }
}
function finishBid(room) {
  room.challenger = room.leader;
  room.turn = room.leader;
  room.remaining = room.bid;
  room.flips = [];
  room.stage = 'reveal';
}
function finishRound(room) {
  room.seats.forEach(s => { s.hand.push(...s.stack); s.stack = []; });
  room.round++;
  room.last = '';
  room.placed = 0;
  room.bid = 0;
  room.resultKind = '';
  room.discarded = null;
  room.leader = -1;
  room.passed = [];
  room.flips = []; room.challenger = -1; room.skullOwner = -1; room.remaining = 0; room.winner = -1;
  room.turn = alive(room).includes(room.starter) && room.seats[room.starter].connected ? room.starter : next(room, room.starter);
  room.stage = 'place';
}
export function act(room, seat, action) {
  if (!action || typeof action !== 'object') throw Error('Invalid action.');
  const me = room.seats[seat];
  if (!me?.connected) throw Error('Reconnect before playing.');
  if (action.type === 'rename') {
    const name = cleanName(action.name);
    if (!name) throw Error('Enter a player name.');
    me.name = name; return;
  }
  if (action.type === 'transfer-host') {
    if (seat !== room.host) throw Error('Only the host can transfer hosting.');
    if (!Number.isInteger(action.target) || action.target === seat || !room.seats[action.target]?.connected) throw Error('Choose a connected player.');
    room.host = action.target;
    room.last = `${room.seats[action.target].name} now hosts the table.`;
    return;
  }
  if (room.stage === 'paused') {
    if (action.type !== 'continue') throw Error('The table is paused.');
    if (!alive(room).includes(seat)) throw Error('You are out.');
    room.votes[seat] = true;
    const connected = alive(room).filter(i => room.seats[i].connected);
    if (connected.length >= 2 && connected.every(i => room.votes[i])) {
      const priorHost = room.host;
      if (!room.seats[room.host]?.connected) room.host = connected[0];
      if ((room.pausedStage === 'reveal' || room.pausedStage === 'choose-lead') && !room.seats[room.challenger].connected || room.pausedStage === 'bid' && !room.seats[room.leader].connected || room.pausedStage === 'loss' && !room.seats[room.skullOwner].connected) {
        room.last = 'Host transferred. Waiting for the needed player to reconnect.';
        return;
      }
      if (!room.seats[room.turn]?.connected) room.turn = next(room, room.turn, i => room.pausedStage !== 'bid' || !room.passed[i]);
      room.stage = room.pausedStage;
      room.pausedStage = null;
      if (room.stage === 'bid' && connected.filter(i => !room.passed[i]).length === 1) finishBid(room);
      if (room.stage === 'place' && room.seats.every((s, i) => !alive(room).includes(i) || !s.connected || s.stack.length)) { room.stage = 'add'; room.turn = room.seats[room.starter]?.connected ? room.starter : next(room, room.starter); }
      room.last = room.host === priorHost ? '' : `${room.seats[room.host].name} now hosts the table.`;
    }
    return;
  }
  if (room.stage === 'lobby') {
    if (action.type !== 'start' || seat !== room.host) throw Error('Only the host can start.');
    if (room.seats.filter(s => s.connected).length < 3) throw Error('Skull needs at least 3 connected players.');
    if (room.seats.some(s => !s.connected)) throw Error('All seated players must reconnect or be removed before starting.');
    room.seats.forEach(s => { s.hand = freshHand(); s.stack = []; s.wins = 0; });
    room.starter = room.host;
    room.turn = room.starter;
    room.round = 1;
    room.placed = 0;
    room.bid = 0;
    room.resultKind = '';
    room.discarded = null;
    room.flips = []; room.challenger = -1; room.skullOwner = -1; room.remaining = 0; room.leader = -1; room.pausedStage = null; room.votes = [];
    room.passed = [];
    room.winner = -1;
    room.last = '';
    room.stage = 'place';
    return;
  }
  if (room.stage === 'win') {
    if (action.type !== 'rematch' || seat !== room.host) throw Error('Only the host can start a rematch.');
    room.stage = 'lobby';
    try { return act(room, seat, { type: 'start' }); }
    catch (error) { room.stage = 'win'; throw error; }
  }
  if (room.stage === 'result') {
    if (action.type !== 'next' || seat !== room.host) throw Error('Waiting for the host.');
    return finishRound(room);
  }
  if (room.stage === 'choose-lead') {
    if (action.type !== 'lead' || seat !== room.challenger || !alive(room).includes(action.target)) throw Error('Choose a remaining player.');
    room.starter = action.target;
    room.stage = 'result';
    return;
  }
  if (room.stage === 'loss') {
    if (action.type !== 'discard' || seat !== room.skullOwner) throw Error('The skull owner chooses a disc.');
    const loser = room.seats[room.challenger];
    const cards = shuffle([...loser.hand, ...loser.stack]);
    if (!Number.isInteger(action.index) || action.index < 0 || action.index >= cards.length) throw Error('Choose a disc.');
    const [discarded] = cards.splice(action.index, 1);
    room.discarded = {owner:room.challenger,by:seat,disc:discarded,index:action.index};
    loser.hand = cards;
    loser.stack = [];
    room.seats.forEach((s, i) => { if (i !== room.challenger) { s.hand.push(...s.stack); s.stack = []; } });
    room.starter = room.challenger;
    if (!cards.length) {
      room.last += ` ${loser.name} is out.`;
      if (alive(room).length === 1) { room.winner = alive(room)[0]; room.resultKind = 'elimination'; room.stage = 'win'; return; }
      if (room.skullOwner === room.challenger) { room.stage = 'choose-lead'; return; }
      room.starter = room.skullOwner;
    }
    room.stage = 'result';
    return;
  }
  if (room.stage === 'place') {
    if (action.type !== 'place') throw Error('Place your first card.');
    if (!alive(room).includes(seat) || me.stack.length) throw Error('You already placed your first card.');
  } else if (seat !== room.turn) throw Error('Wait for your turn.');
  if (room.stage === 'place' || room.stage === 'add') {
    if (action.type === 'place') {
      const index = Number.isInteger(action.index) ? action.index : me.hand.indexOf(action.disc);
      if (index >= me.hand.length) throw Error('That card is not in your hand.');
      if (index < 0) throw Error('That disc is not in your hand.');
      me.stack.push(me.hand.splice(index, 1)[0]);
      if (room.stage === 'place') {
        room.placed++;
        if (room.seats.every((s, i) => !alive(room).includes(i) || !s.connected || s.stack.length)) { room.stage = 'add'; room.turn = room.seats[room.starter]?.connected ? room.starter : next(room, room.starter); }
        else room.turn = next(room, seat);
      } else room.turn = next(room, seat);
      return;
    }
    if (room.stage !== 'add' || action.type !== 'bid') throw Error('Place a disc first.');
  }
  if (room.stage === 'add' || room.stage === 'bid') {
    if (action.type === 'bid') {
      if (!Number.isInteger(action.amount) || action.amount <= room.bid || action.amount > total(room)) throw Error('Bid above the current bid, up to the discs in play.');
      room.bid = action.amount;
      room.leader = seat;
      room.stage = 'bid';
      if (room.bid === total(room)) finishBid(room);
      else room.turn = next(room, seat, i => !room.passed[i]);
      return;
    }
    if (room.stage !== 'bid' || action.type !== 'pass') throw Error('Raise or pass.');
    room.passed[seat] = true;
    if (alive(room).filter(i => room.seats[i].connected && !room.passed[i]).length === 1) finishBid(room);
    else room.turn = next(room, seat, i => !room.passed[i]);
    return;
  }
  if (room.stage === 'reveal') {
    if (action.type !== 'flip' || !alive(room).includes(action.target)) throw Error('Choose a stack.');
    const ownLeft = room.seats[room.challenger].stack.length - room.flips.filter(f => f.owner === room.challenger).length;
    if (ownLeft > 0 && action.target !== room.challenger) throw Error('Reveal your own discs first.');
    const target = room.seats[action.target];
    const position = action.position ?? 'top';
    if (!['top','bottom'].includes(position)) throw Error('Choose the top or bottom card.');
    const opened = new Set(room.flips.filter(f => f.owner === action.target).map(f => f.index));
    const available = target.stack.map((_,i)=>i).filter(i=>!opened.has(i));
    if (!available.length) throw Error('That stack is empty.');
    const index = action.index === undefined ? (position === 'bottom' ? available[0] : available.at(-1)) : action.index;
    if (!Number.isInteger(index) || !available.includes(index)) throw Error('Choose an unopened card.');
    const disc = target.stack[index];
    room.flips.push({ owner: action.target, index, position, disc });
    room.remaining--;
    if (disc === 'skull') {
      room.skullOwner = action.target;
      room.last = `${target.name}'s skull! ${me.name} loses a disc.`;
      room.resultKind = 'skull';
      room.stage = 'loss';
    } else if (room.remaining === 0) {
      me.wins++;
      room.last = `${me.name} found every flower!`;
      room.resultKind = 'flower';
      if (me.wins === 2) { room.winner = seat; room.stage = 'win'; }
      else { room.starter = seat; room.stage = 'result'; }
    }
    return;
  }
  throw Error('That action is not available now.');
}
// Removing a seated player restarts an unfinished round so no bid references a missing seat.
export function removePlayer(room, seat) {
  const playing = !['lobby', 'win'].includes(room.stage);
  room.seats.forEach(s => { s.hand.push(...s.stack); s.stack = []; });
  const name = room.seats[seat].name;
  room.seats.splice(seat, 1);
  room.host = room.host === seat ? room.seats.findIndex(s => s.connected) : room.host - (seat < room.host ? 1 : 0);
  if (room.host < 0) room.host = 0;
  room.starter = room.host; room.turn = room.host;
  room.placed = 0; room.bid = 0; room.leader = -1; room.passed = [];
  room.challenger = -1; room.remaining = 0; room.flips = []; room.skullOwner = -1;
  room.pausedStage = null; room.votes = []; room.resultKind = ''; room.discarded = null; room.winner = -1;
  room.stage = playing ? 'place' : 'lobby';
  if (playing) {
    room.round++;
    const remaining = alive(room);
    if (remaining.length === 1) { room.winner = remaining[0]; room.resultKind = 'elimination'; room.stage = 'win'; }
    else if (room.seats.filter(s => s.connected && s.hand.length).length < 2) { room.pausedStage = 'place'; room.stage = 'paused'; }
    else if (!room.seats[room.turn]?.hand.length) room.turn = room.starter = next(room, room.host);
  }
  room.last = `${name} left the table.${playing ? ' A fresh round starts; points are kept.' : ''}`;
}
export function view(room, seat) {
  const mine = room.seats[seat];
  return {
    code: room.code, mode: room.mode, stage: room.stage, pausedStage: room.pausedStage,
    host: room.host, turn: room.turn, starter: room.starter, round: room.round,
    bid: room.bid, leader: room.leader, passed: room.passed, challenger: room.challenger,
    remaining: room.remaining, flips: room.flips, discarded: room.discarded || null, skullOwner: room.skullOwner, resultKind: room.resultKind,
    lossCount: room.stage === 'loss' ? room.seats[room.challenger].hand.length + room.seats[room.challenger].stack.length : 0,
    last: room.last, winner: room.winner, votes: room.votes, seat,
    hand: mine.hand, stack: mine.stack,
    total: total(room),
    seats: room.seats.map(s => ({ name: s.name, connected: s.connected, discs: s.hand.length + s.stack.length, stack: s.stack.length, wins: s.wins }))
  };
}
