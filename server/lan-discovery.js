import { networkInterfaces } from 'node:os';
import multicastDns from 'multicast-dns';

export const LAN_NAME = 'bones.local';

export function lanAddress(interfaces = networkInterfaces()) {
  const entries = Object.entries(interfaces).sort(([a], [b]) => Number(!/^(en0|wlan|wi-fi)/i.test(a)) - Number(!/^(en0|wlan|wi-fi)/i.test(b)));
  for (const [, addresses] of entries) for (const address of addresses || []) {
    if (address.family === 'IPv4' && !address.internal && /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(address.address)) return address.address;
  }
  return '';
}

export function startLanDiscovery(address = lanAddress(), createResponder = multicastDns) {
  if (!address) return null;
  const responder = createResponder({ reuseAddr: true });
  responder.on('query', packet => {
    if (packet.questions?.some(question => question.name.toLowerCase().replace(/\.$/, '') === LAN_NAME && ['A', 'ANY'].includes(question.type))) {
      responder.respond({ answers: [{ name: LAN_NAME, type: 'A', ttl: 120, data: address }] });
    }
  });
  responder.on('error', error => console.warn(`LAN name discovery unavailable: ${error.message}`));
  return responder;
}
