import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultTableAddress, localTableUrl, playerName } from '../entry.js';

test('saved player name wins over an arcade hint', () => {
  assert.equal(playerName('  Returning player  ', 'Arcade hint'), 'Returning player');
  assert.equal(playerName('', '  Arcade hint  '), 'Arcade hint');
  assert.equal(playerName('', 'x'.repeat(33)), 'You');
  assert.equal(playerName('', ''), 'You');
});

test('public LAN entry forwards name and code to the local host', () => {
  assert.equal(localTableUrl('http://bones.local:10000', 'Sam Player', 'ABC123'), 'http://bones.local:10000/Bones/?table=lan&auto=1&code=ABC123#arcadeName=Sam%20Player');
});

test('internet address defaults to Render while LAN stays local', () => {
  assert.equal(defaultTableAddress('internet', 'strategamma.github.io', 'https://strategamma.github.io', false), 'https://bones-lfxr.onrender.com');
  assert.equal(defaultTableAddress('internet', 'bones-lfxr.onrender.com', 'https://bones-lfxr.onrender.com', false), 'https://bones-lfxr.onrender.com');
  assert.equal(defaultTableAddress('lan', 'strategamma.github.io', 'https://strategamma.github.io', false), 'http://bones.local:10000');
  assert.equal(defaultTableAddress('lan', '192.168.1.10', 'http://192.168.1.10:3000', true), 'http://192.168.1.10:3000');
});

test('one-touch entry uses known prerequisites without guessing a LAN host', async()=>{
 const {automaticEntry,connectionTimeout}=await import('../entry.js');
 assert.equal(automaticEntry('internet',false,'',''),true);
 assert.equal(automaticEntry('lan',true,'',''),true);
 assert.equal(automaticEntry('lan',false,'',''),false);
 assert.equal(automaticEntry('lan',false,'ABC123','http://192.168.1.5:10000'),true);
 assert.equal(automaticEntry('lan',false,'ABC123',''),false);
 assert.equal(connectionTimeout('internet'),45000);
 assert.equal(connectionTimeout('lan'),10000);
});

test('expired, full and invalid rooms explain a recovery action without hiding other errors',async()=>{
 const {connectionMessage}=await import('../entry.js');
 assert.match(connectionMessage('Saved table not found.'),/expired.*new room/);
 assert.match(connectionMessage('This table has already started or is full.'),/full.*lobby.*own room/);
 assert.match(connectionMessage('Table not found on this server.'),/Check the code.*fresh invite/);
 assert.equal(connectionMessage('Place your first card.'),'Place your first card.');
});

test('legacy online hosts expose basic play instead of broken ready/bot/pause controls',async()=>{
 const {tableCapabilities}=await import('../entry.js');
 const old={seats:[{name:'A',connected:true}]},modern={seats:[{ready:false,bot:false,rematchReady:false}]};
 assert.ok(Object.values(tableCapabilities(old)).every(v=>v===false));
 assert.ok(Object.entries(tableCapabilities(modern)).filter(([key])=>key!=='automaticReveal').every(([,v])=>v===true));
 assert.equal(tableCapabilities(modern,{pause:false}).pause,false);
 assert.equal(tableCapabilities(old,{readiness:true}).readiness,true);
});

test('internet invites from a local preview use the public host; LAN invites never leak loopback',async()=>{
 const {tableInvite}=await import('../entry.js');
 const base={origin:'http://localhost:10025',path:'/Bones/',server:'https://bones-lfxr.onrender.com',code:'ABC123',isLocal:true};
 assert.equal(tableInvite({...base,mode:'internet'}).href,'https://bones-lfxr.onrender.com/Bones/?table=internet&code=ABC123');
 assert.equal(tableInvite({...base,mode:'internet',origin:'https://strategamma.github.io',isLocal:false}).href,'https://strategamma.github.io/Bones/?table=internet&code=ABC123&server=https%3A%2F%2Fbones-lfxr.onrender.com');
 assert.equal(tableInvite({...base,mode:'lan',server:base.origin,lanUrl:'http://192.168.1.5:10025'}).href,'http://192.168.1.5:10025/Bones/?table=lan&code=ABC123');
});
