import test from 'node:test';
import assert from 'node:assert/strict';
import { lanAddress, startLanDiscovery } from '../server/lan-discovery.js';

test('LAN discovery chooses a private Wi-Fi address', () => {
  assert.equal(lanAddress({ utun0: [{ family: 'IPv4', internal: false, address: '10.8.0.2' }], en0: [{ family: 'IPv4', internal: false, address: '192.168.1.23' }] }), '192.168.1.23');
  assert.equal(lanAddress({ lo0: [{ family: 'IPv4', internal: true, address: '127.0.0.1' }] }), '');
});

test('LAN host answers bones.local A-record queries', () => {
  const handlers = {}, sent = [];
  const responder = { on: (event, handler) => { handlers[event] = handler; }, respond: packet => sent.push(packet) };
  assert.equal(startLanDiscovery('', () => responder), null);
  assert.equal(startLanDiscovery('192.168.1.23', () => responder), responder);
  handlers.query({ questions: [{ name: 'other.local', type: 'A' }] });
  assert.equal(sent.length, 0);
  handlers.query({ questions: [{ name: 'bones.local', type: 'A' }] });
  assert.deepEqual(sent[0].answers[0], { name: 'bones.local', type: 'A', ttl: 120, data: '192.168.1.23' });
});
