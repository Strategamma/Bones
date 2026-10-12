import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultTableAddress, playerName } from '../entry.js';

test('saved player name wins over an arcade hint', () => {
  assert.equal(playerName('  Returning player  ', 'Arcade hint'), 'Returning player');
  assert.equal(playerName('', '  Arcade hint  '), 'Arcade hint');
  assert.equal(playerName('', 'x'.repeat(33)), 'You');
  assert.equal(playerName('', ''), 'You');
});

test('internet address defaults to Render while LAN stays local', () => {
  assert.equal(defaultTableAddress('internet', 'strategamma.github.io', 'https://strategamma.github.io', false), 'https://bones-lfxr.onrender.com');
  assert.equal(defaultTableAddress('internet', 'bones-lfxr.onrender.com', 'https://bones-lfxr.onrender.com', false), 'https://bones-lfxr.onrender.com');
  assert.equal(defaultTableAddress('lan', 'strategamma.github.io', 'https://strategamma.github.io', false), '');
  assert.equal(defaultTableAddress('lan', '192.168.1.10', 'http://192.168.1.10:3000', true), 'http://192.168.1.10:3000');
});
