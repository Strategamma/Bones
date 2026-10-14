export const INTERNET_SERVER = 'https://bones-lfxr.onrender.com';
export const LAN_SERVER = 'http://bones.local:10000';
export const ARCADE_URL = 'https://decadenceinc.com/';

export function automaticEntry(mode, isLocal, code, inviteAddress) {
  return mode === 'internet' || mode === 'lan' && (isLocal || !!code && !!inviteAddress);
}

export function connectionTimeout(mode) { return mode === 'internet' ? 45000 : 10000; }

export function tableCapabilities(state, advertised) {
  const modern=state.seats.every(p=>typeof p.ready==='boolean');
  return {
    automaticReveal:advertised?.automaticReveal??false,
    rematchVotes:advertised?.rematchVotes??state.seats.every(p=>typeof p.rematchReady==='boolean'),
    readiness:advertised?.readiness??modern,
    bots:advertised?.bots??state.seats.every(p=>typeof p.bot==='boolean'),
    pause:advertised?.pause??modern,
    returnLobby:advertised?.returnLobby??modern,
    simultaneousPlacement:advertised?.simultaneousPlacement??modern,
  };
}

export function connectionMessage(message) {
  return ({
    'Table not found on this server.':'Room not found. Check the code and host address, ask for a fresh invite, or create your own room.',
    'This table has already started or is full.':'This room is full or already playing. Ask the host to return to the lobby, or create your own room.',
    'Saved table not found.':'Your saved room has expired. Start a new room or open a fresh invite.',
    'Invalid seat token.':'Your saved seat is no longer available. Join with a fresh invite or start a room.',
  })[message] || message;
}

export function tableInvite({origin,path,mode,server,code,lanUrl,isLocal}) {
  const loopback=['localhost','127.0.0.1'].includes(new URL(origin).hostname);
  const localInternet=mode==='internet'&&isLocal;
  const lanRedirect=mode==='lan'&&loopback&&lanUrl;
  const invite=new URL(localInternet?'/Bones/':path,lanRedirect||localInternet&&server||origin);
  invite.searchParams.set('table',mode);invite.searchParams.set('code',code);
  if(server!==invite.origin&&!lanRedirect)invite.searchParams.set('server',server);
  return invite;
}

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
