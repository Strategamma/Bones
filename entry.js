export const INTERNET_SERVER = 'https://bones-lfxr.onrender.com';

export function playerName(saved, hint) {
  const preferred = typeof saved === 'string' ? saved.trim() : '';
  const suggested = typeof hint === 'string' ? hint.trim() : '';
  return preferred || (suggested.length <= 32 ? suggested : '') || 'You';
}

export function defaultTableAddress(mode, hostname, origin, isLocal) {
  if (mode === 'lan') return isLocal ? origin : '';
  return hostname.endsWith('.onrender.com') ? origin : INTERNET_SERVER;
}
