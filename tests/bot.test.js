import test from 'node:test';
import assert from 'node:assert/strict';
import {makeRoom, connection, addBot, act, view, removePlayer} from '../server/game.js';
import {botAction} from '../server/bot.js';
const setup = () => {const {room}=makeRoom('lan','Human'); connection(room,0,true); addBot(room,0); addBot(room,0); return room;};
test('hosts add bots within lobby capacity, with private hands and human hosting', () => {
  const room=setup();
  assert.equal(view(room,0).seats[1].bot,true);
  assert.equal(view(room,0).seats[1].hand,undefined);
  assert.throws(()=>addBot(room,1),/Only the host/);
  assert.throws(()=>act(room,0,{type:'transfer-host',target:1}),/connected player/);
  while(room.seats.length<6) addBot(room,0);
  assert.throws(()=>addBot(room,0),/full/);
  act(room,0,{type:'start'});
  assert.throws(()=>addBot(room,0),/started/);
  removePlayer(room,1); assert.equal(room.host,0); assert.equal(room.stage,'place');
});
test('bots play legal complete games, rounds, losses, reveals and rematches', () => {
  const stages=new Set();
  for(let seed=1;seed<=30;seed++) {
    let state=seed; const random=()=>{state=(state*1664525+1013904223)>>>0;return state/4294967296;};
    const room=setup(); act(room,0,{type:'start'});
    for(let step=0;step<3000 && room.stage!=='win';step++) {
      stages.add(room.stage);
      if(room.stage==='result') act(room,0,{type:'next'});
      else {
        let moved=false;
        for(let seat=0;seat<room.seats.length;seat++) {
          const action=botAction(view(room,seat),random);
          if(action) { act(room,seat,action); moved=true; break; }
        }
        assert.ok(moved,`stalled at ${room.stage}`);
      }
    }
    assert.equal(room.stage,'win');
    act(room,0,{type:'rematch'}); assert.equal(room.stage,'place');
    assert.ok(room.seats.slice(1).every(s=>s.bot && s.connected));
  }
  for(const stage of ['place','add','bid','reveal','loss','result']) assert.ok(stages.has(stage),stage);
});
test('bot bidding depends on its own cards and public counts, and votes only once',()=>{
  const room=setup(); act(room,0,{type:'start'});
  for(let i=0;i<3;i++) act(room,i,{type:'place',disc:'flower'});
  act(room,0,{type:'bid',amount:1});
  const before=botAction(view(room,1),()=>.5);
  room.seats[2].stack[0]='skull';
  assert.deepEqual(botAction(view(room,1),()=>.5),before);
  connection(room,0,false);
  act(room,1,botAction(view(room,1))); assert.equal(botAction(view(room,1)),null);
  act(room,2,botAction(view(room,2))); assert.equal(room.stage,'paused');
});
test('an eliminated bot chooses a new leader and leftover bots yield hosting to humans',()=>{
  const room=setup();
  room.seats[1].hand=[]; room.challenger=1; room.stage='choose-lead';
  act(room,1,botAction(view(room,1))); assert.equal(room.stage,'result');
  room.stage='lobby'; removePlayer(room,0);
  const human=room.seats.length;
  // Mimic a new human joining a bot-only lobby by code.
  room.seats.push({name:'New host',token:'new',hand:['flower'],stack:[],wins:0,connected:false});
  connection(room,human,true); assert.equal(room.host,human);
});
