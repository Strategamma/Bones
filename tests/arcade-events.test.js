import test from 'node:test';
import assert from 'node:assert/strict';
import {arcadeEvents} from '../arcade-events.js';
const state={code:'ABC',stage:'add',seat:0,turn:1,round:1,bid:0,stack:[0],flips:[],seats:[{wins:0},{wins:0}]};
test('arcade cues occur once per move and never on redraw or initial reconnect',()=>{
 assert.deepEqual(arcadeEvents(null,state),{});
 assert.equal(arcadeEvents(state,state).turn,false);
 const mine={...state,turn:0};assert.equal(arcadeEvents(state,mine).turn,true);assert.equal(arcadeEvents(mine,mine).turn,false);
 const bid={...mine,stage:'bid',bid:2};assert.equal(arcadeEvents(mine,bid).bid,true);assert.equal(arcadeEvents(bid,bid).bid,false);
});
test('reveal and point cues distinguish safe from skull and handle new rooms quietly',()=>{
 const safe={...state,flips:[{disc:'flower'}],seats:[{wins:1},{wins:0}]};
 assert.equal(arcadeEvents(state,safe).safe,true);assert.equal(arcadeEvents(state,safe).point,true);
 assert.equal(arcadeEvents(safe,safe).safe,false);
 assert.equal(arcadeEvents(safe,{...safe,flips:[...safe.flips,{disc:'skull'}]}).skull,true);
 assert.deepEqual(arcadeEvents(state,{...safe,code:'NEW'}),{});
});
