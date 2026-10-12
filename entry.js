export const INTERNET_SERVER = 'https://bones-lfxr.onrender.com';
export const LAN_SERVER = 'http://bones.local:10000';

export function playerName(saved, hint) {
  const preferred = typeof saved === 'string' ? saved.trim() : '';
  const suggested = typeof hint === 'string' ? hint.trim() : '';
  return preferred || (suggested.length <= 32 ? suggested : '') || 'You';
}

export function defaultTableAddress(mode, hostname, origin, isLocal) {
  if (mode === 'lan') return isLocal ? origin : LAN_SERVER;
  return hostname.endsWith('.onrender.com') ? origin : INTERNET_SERVER;
}

export function localTableUrl(server, name, code = '') {
  const target = new URL('/Bones/', server);
  target.searchParams.set('table', 'lan');
  target.searchParams.set('auto', '1');
  if (code) target.searchParams.set('code', code);
  target.hash = `arcadeName=${encodeURIComponent(name)}`;
  return target.href;
}
