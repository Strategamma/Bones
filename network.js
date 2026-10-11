export const net = { mode: null, state: null, socket: null, url: '', token: '', code: '', error: '', connected: false, draft: 1, onChange: () => {}, retry: 0, manualClose: false };
const shell = document.createElement('div');
shell.id = 'table-setup';
shell.hidden = true;
shell.innerHTML = `<form id="table-form"><div class="table-kicker">DECADENCE ARCADE</div><h2 id="table-title">Join a table</h2><p id="table-detail"></p><label>Your name<input id="table-name" maxlength="32" autocomplete="nickname" required></label><label id="address-label">Server address<input id="table-address" type="text" inputmode="url" required placeholder="https://your-game.onrender.com"></label><label>Table code · leave empty to create<input id="table-code" maxlength="6" autocomplete="off" autocapitalize="characters" placeholder="ABC123"></label><p id="table-error" role="alert"></p><button type="submit">CONTINUE</button><button type="button" id="table-resume" hidden>RESUME PREVIOUS TABLE</button><button type="button" id="table-back">BACK</button></form>`;
document.body.append(shell);
const $ = s => shell.querySelector(s);
function normalizeUrl(raw, mode) {
  const value = raw.trim();
  const url = new URL(/^https?:\/\//i.test(value) ? value : `${mode === 'lan' ? 'http' : 'https'}://${value}`);
  if (mode === 'internet' && url.protocol !== 'https:') throw Error('Internet tables need an HTTPS Render address.');
  if (!['http:', 'https:'].includes(url.protocol)) throw Error('Enter an HTTP or HTTPS address.');
  return url.origin;
}
function stored(key) { try { return localStorage.getItem(key) || ''; } catch { return ''; } }
function save(key, value) { try { localStorage.setItem(key, value); } catch {} }
function clear(key) { try { localStorage.removeItem(key); } catch {} }
function lastSeat() { try { return JSON.parse(stored('skull-last')); } catch { return null; } }
function localServer() { return ['localhost', '127.0.0.1'].includes(location.hostname) || /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(location.hostname); }
export function openTable(mode, name, code = '') {
  net.mode = mode; net.state = null; net.error = ''; net.localStage = ''; net.manualClose = false;
  $('#table-title').textContent = mode === 'lan' ? 'LAN TABLE' : 'INTERNET TABLE';
  $('#table-detail').textContent = mode === 'lan' ? 'Everyone joins from the same Wi‑Fi. Enter the computer’s local address.' : 'Friends join from anywhere. Enter your Render service address.';
  $('#table-name').value = name || stored('skull-name');
  $('#table-address').value = new URLSearchParams(location.search).get('server') || stored(`skull-${mode}-url`) || (mode === 'lan' && localServer() ? location.origin : mode === 'internet' && location.hostname.endsWith('onrender.com') ? location.origin : '');
  $('#table-code').value = code;
  $('#table-resume').hidden = lastSeat()?.mode !== mode;
  $('#table-error').textContent = '';
  shell.hidden = false;
  net.onChange();
}
$('#table-back').addEventListener('click', () => { shell.hidden = true; net.mode = null; net.onChange(); });
$('#table-resume').addEventListener('click', () => {
  const saved = lastSeat();
  if (!saved || saved.mode !== net.mode) return;
  net.url = saved.url; net.code = saved.code; net.token = saved.token; net.error = '';
  connect();
});
$('#table-form').addEventListener('submit', event => {
  event.preventDefault();
  try {
    const mode = net.mode, name = $('#table-name').value.trim(), code = $('#table-code').value.trim().toUpperCase();
    if (!name) throw Error('Enter your name.');
    const url = normalizeUrl($('#table-address').value, mode);
    save('skull-name', name); save(`skull-${mode}-url`, url);
    if (mode === 'lan' && location.protocol === 'https:' && url !== location.origin) {
      const target = new URL('/Bones/', url);
      target.searchParams.set('table', 'lan');
      if (code) target.searchParams.set('code', code);
      target.hash = `arcadeName=${encodeURIComponent(name)}`;
      location.assign(target.href);
      return;
    }
    net.url = url; net.code = code; net.error = '';
    connect({ type: code ? 'join' : 'create', code, name });
  } catch (error) { $('#table-error').textContent = error.message; }
});
function socketUrl(url) { const u = new URL(url); u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:'; u.pathname = '/ws'; u.search = ''; u.hash = ''; return u.href; }
function connect(first) {
  if (net.socket) { net.manualClose = true; net.socket.close(); }
  net.manualClose = false;
  const socket = new WebSocket(socketUrl(net.url));
  net.socket = socket; net.connected = false; net.onChange();
  socket.onopen = () => {
    net.connected = true; net.retry = 0; net.error = '';
    socket.send(JSON.stringify({ type: 'hello' }));
    net.onChange();
  };
  socket.onmessage = event => {
    let message;
    try { message = JSON.parse(event.data); } catch { return; }
    if (message.type === 'hello') {
      if (message.mode !== net.mode) {
        net.error = `This server hosts ${message.mode} tables. Choose the matching server.`;
        shell.hidden = false; $('#table-error').textContent = net.error;
        net.manualClose = true; socket.close(); net.onChange(); return;
      }
      socket.send(JSON.stringify(first || { type: 'resume', code: net.code, token: net.token }));
    } else if (message.type === 'joined') {
      net.code = message.code; net.token = message.token;
      save('skull-last', JSON.stringify({ mode: net.mode, url: net.url, code: net.code, token: net.token }));
      save('skull-auto-resume', 'yes');
      shell.hidden = true;
    } else if (message.type === 'state') { net.state = message.state; net.draft = Math.max(1, message.state.bid + 1); }
    else if (message.type === 'error') {
      net.error = message.message;
      if (!net.state) { const address = net.url; openTable(net.mode, stored('skull-name'), net.code); $('#table-address').value = address; }
      $('#table-error').textContent = message.message;
    }
    net.onChange();
  };
  socket.onclose = () => {
    if (net.socket !== socket) return;
    net.connected = false;
    if (net.manualClose) return;
    net.error = 'Connection lost. Reconnecting…';
    net.onChange();
    if (net.token) setTimeout(() => { if (!net.connected && !net.manualClose) connect(); }, Math.min(12000, 800 * 2 ** Math.min(net.retry++, 4)));
    else { shell.hidden = false; $('#table-error').textContent = 'Cannot reach this server. Check its address and try again.'; }
  };
};
export function resumeLast() {
  if (stored('skull-auto-resume') !== 'yes') return;
  const saved = lastSeat();
  if (!saved?.url || !saved?.token || !saved?.code) return;
  net.mode = saved.mode; net.url = saved.url; net.code = saved.code; net.token = saved.token;
  connect();
}
export function sendAction(action) { if (net.connected && net.socket?.readyState === WebSocket.OPEN) net.socket.send(JSON.stringify({ type: 'action', action })); }
export function leaveTable() {
  net.manualClose = true;
  net.socket?.close(); net.socket = null; net.state = null; net.mode = null; net.token = ''; net.code = ''; net.connected = false; net.error = ''; net.notice = ''; net.localStage = '';
  clear('skull-auto-resume'); shell.hidden = true; net.onChange();
}
async function shareInvite() {
  const invite = new URL(location.pathname, location.origin);
  invite.searchParams.set('table', net.mode);
  invite.searchParams.set('code', net.code);
  if (net.url !== location.origin) invite.searchParams.set('server', net.url);
  try {
    if (navigator.share) await navigator.share({ title: 'Join my Skull table', url: invite.href });
    else if (navigator.clipboard) { await navigator.clipboard.writeText(invite.href); net.notice = 'Invite copied!'; }
    else { prompt('Copy this invite link', invite.href); }
  } catch (error) { if (error.name !== 'AbortError') net.notice = 'Share failed. Try again.'; }
  net.onChange();
}
export function drawTable(ui) {
  const { header, panel, txt, button, disc, H, colors } = ui;
  const s = net.state;
  if (!s) {
    header(net.mode === 'lan' ? 'LAN TABLE' : 'INTERNET TABLE', net.connected ? 'Connecting to the table…' : 'Enter your server address and name.');
    txt('✦', 195, H * .40, 90, '#ffda87', 900);
    if (net.error) txt(net.error.slice(0, 40), 195, H * .65, 13, '#ffafb8', 700);
    button('BACK', 30, H - 110, 330, 56, leaveTable, 'dark');
    return;
  }
  const me = s.seat, mine = s.seats[me], turn = s.turn === me, host = s.host === me;
  header(s.stage === 'lobby' ? `${s.mode.toUpperCase()} TABLE` : `ROUND ${s.round} · ${s.stage.toUpperCase().replace('-', ' ')}`, s.stage === 'lobby' ? `Share code ${s.code} with friends` : s.last || `${s.seats[s.turn]?.name || 'Player'} to act`);
  if (!net.connected) { panel(20, 115, 350, 58, '#69415a', '#f6a3aa'); txt('Reconnecting to your table…', 195, 144, 15, '#fff', 800); }
  const top = 132, gap = Math.min(99, (H - 410) / Math.ceil(s.seats.length / 2));
  s.seats.forEach((p, i) => {
    const x = 20 + i % 2 * 183, y = top + Math.floor(i / 2) * gap;
    panel(x, y, 168, 82, i === s.turn ? '#463463' : '#302747', i === s.turn ? '#ffd981' : '#685783', 16);
    txt(p.name, x + 12, y + 23, 14, p.connected ? '#fff4d8' : '#9c92aa', 800, 'left');
    txt('✿'.repeat(p.wins) || '○ ○', x + 151, y + 22, 15, '#ffdc81', 800, 'right');
    txt(`${p.stack} placed · ${p.discs} discs`, x + 12, y + 55, 12, '#bdb3d2', 600, 'left');
    if (p.stack) disc(x + 143, y + 56, 16, 'back', colors[i]);
  });
  if (s.stage === 'lobby') {
    panel(28, H - 248, 334, 91, '#4b335c', '#f3bc81');
    txt(`CODE  ${s.code}`, 195, H - 207, 25, '#ffe192', 900);
    txt(`${s.seats.length}/6 players · ${s.mode === 'lan' ? 'same Wi‑Fi' : 'online'}`, 195, H - 170, 13, '#e4dbea', 700);
    button(host ? 'START GAME' : 'WAITING FOR HOST', 30, H - 139, 330, 58, () => host && sendAction({ type: 'start' }), host ? 'gold' : 'dark');
    button('SHARE INVITE', 83, H - 74, 224, 45, shareInvite, 'dark');
  } else if (s.stage === 'paused') {
    txt('TABLE PAUSED', 195, H - 259, 22, '#ffe192', 900);
    txt('Everyone still here can vote to continue.', 195, H - 220, 13, '#e4dbea', 700);
    button(s.votes?.[me] ? 'VOTE RECORDED' : 'CONTINUE TOGETHER', 30, H - 165, 330, 64, () => sendAction({ type: 'continue' }), s.votes?.[me] ? 'dark' : 'gold');
  } else if ((s.stage === 'place' || s.stage === 'add') && net.localStage !== 'bid-picker') {
    txt(turn ? s.stage === 'place' ? 'PLACE ONE SECRET DISC' : 'ADD A DISC OR START A BID' : `Waiting for ${s.seats[s.turn]?.name}`, 195, H - 272, 15, '#ffdc83', 900);
    if (turn) {
      const cards = s.hand;
      cards.forEach((type, j) => {
        const x = 195 - (cards.length - 1) * 37 + j * 74;
        disc(x, H - 209, 30, type, type === 'skull' ? '#f092a4' : '#e7b978');
        ui.spots.push({ x: x - 34, y: H - 245, w: 68, h: 72, fn: () => sendAction({ type: 'place', disc: type }), label: type });
      });
      if (!cards.length) txt('No discs left: bid now.', 195, H - 209, 15, '#fff', 700);
      if (s.stage === 'add') button('START A BID', 30, H - 128, 330, 60, () => { net.draft = 1; net.localStage = 'bid-picker'; net.onChange(); });
    }
  } else if (s.stage === 'bid' || net.localStage === 'bid-picker') {
    if (net.localStage === 'bid-picker' && turn) {
      txt(`Bid ${s.bid + 1} to ${s.total}`, 195, H - 263, 16, '#ffe192', 900);
      button('−', 45, H - 216, 65, 68, () => { net.draft = Math.max(s.bid + 1, net.draft - 1); net.onChange(); }, 'dark');
      panel(126, H - 216, 138, 68, '#493360', '#f7bf60'); txt(String(net.draft), 195, H - 182, 34, '#ffe197', 900);
      button('+', 280, H - 216, 65, 68, () => { net.draft = Math.min(s.total, net.draft + 1); net.onChange(); }, 'dark');
      button('BID ' + net.draft, 30, H - 126, 210, 59, () => { sendAction({ type: 'bid', amount: net.draft }); net.localStage = ''; }, 'gold');
      button('BACK', 250, H - 126, 110, 59, () => { net.localStage = ''; net.onChange(); }, 'dark');
    } else {
      txt(`${s.bid} FLOWERS`, 195, H - 230, 27, '#ffe197', 900);
      txt(`${s.seats[s.leader]?.name} holds the high bid`, 195, H - 193, 13, '#f3e7ed', 700);
      if (turn) { button('RAISE', 29, H - 136, 160, 60, () => { net.draft = s.bid + 1; net.localStage = 'bid-picker'; net.onChange(); }); button('PASS', 202, H - 136, 160, 60, () => sendAction({ type: 'pass' }), 'dark'); }
    }
  } else if (s.stage === 'reveal') {
    txt(`${s.seats[s.challenger].name} must flip ${s.remaining} more`, 195, H - 278, 16, '#ffe197', 900);
    txt(s.flips.length ? s.flips.map(f => f.disc === 'skull' ? '☠' : '✿').join('  ') : 'Own stack first, top disc first.', 195, H - 245, 18, '#fff', 800);
    s.seats.forEach((p, i) => {
      const left = p.stack - s.flips.filter(f => f.owner === i).length;
      if (!left) return;
      const ownLeft = s.seats[s.challenger].stack - s.flips.filter(f => f.owner === s.challenger).length;
      const legal = i === s.challenger || !ownLeft;
      button(`${p.name} · ${left}`, 25 + i % 2 * 175, H - 207 + Math.floor(i / 2) * 57, 165, 49, () => { if (turn && legal) sendAction({ type: 'flip', target: i }); }, turn && legal ? 'gold' : 'dark');
    });
  } else if (s.stage === 'loss') {
    txt('☠', 195, H - 265, 64, '#ff9fa8', 900);
    txt(`${s.seats[s.skullOwner].name} chooses a hidden disc`, 195, H - 196, 14, '#fff', 700);
    if (me === s.skullOwner) for (let i = 0; i < s.lossCount; i++) button('✦', 195 - s.lossCount * 37 + i * 74, H - 143, 66, 65, () => sendAction({ type: 'discard', index: i }), 'dark');
  } else if (s.stage === 'choose-lead') {
    txt(`${s.seats[s.challenger].name} chooses the next lead`, 195, H - 283, 15, '#ffdc83', 800);
    s.seats.forEach((p, i) => { if (p.discs) button(p.name, 30, H - 248 + i * 54, 330, 48, () => { if (me === s.challenger) sendAction({ type: 'lead', target: i }); }, 'dark'); });
  } else if (s.stage === 'result') {
    txt(s.last, 195, H - 268, 17, '#ffe192', 800);
    button(host ? 'NEXT ROUND' : 'WAITING FOR HOST', 30, H - 139, 330, 61, () => host && sendAction({ type: 'next' }), host ? 'gold' : 'dark');
  } else if (s.stage === 'win') {
    txt(`${s.seats[s.winner].name.toUpperCase()} WINS!`, 195, H - 246, 27, '#ffe192', 900);
    button(host ? 'REMATCH' : 'WAITING FOR HOST', 30, H - 139, 330, 61, () => host && sendAction({ type: 'rematch' }), host ? 'gold' : 'dark');
  }
  if (net.error || net.notice) txt((net.error || net.notice).slice(0, 45), 195, H - 55, 12, net.error ? '#ffadb8' : '#c8f5d9', 700);
  button('×', 346, 20, 34, 34, leaveTable, 'dark');
}
