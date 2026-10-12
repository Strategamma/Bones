import { soundEnabled, toggleSound } from './audio.js';
import { showRulebook } from './rulebook.js';
import { defaultTableAddress, localTableUrl } from './entry.js';
import { configureGameplayControls, showBids, showTableCards, showRevealConfirm } from './gameplay-controls.js';

export const net = { mode: null, state: null, socket: null, url: '', token: '', code: '', error: '', connected: false, pendingAction: false, draft: 1, onChange: () => {}, retry: 0, manualClose: false, rooms: [] };
configureGameplayControls(net, sendAction);
const shell = document.createElement('div');
shell.id = 'table-setup';
shell.hidden = true;
shell.innerHTML = `<form id="table-form" aria-labelledby="table-title">
  <img class="table-brand" src="${import.meta.env.BASE_URL}assets/bones-platform-logo.png" alt="BONES">
  <div class="setup-mode"><img id="table-mode-art" alt=""><div><div class="table-kicker">PLAY WITH FRIENDS</div><h2 id="table-title">Join a table</h2></div></div>
  <p id="table-detail"></p>
  <div class="table-meta"><span>3–6 players</span><span>One phone each</span></div>
  <label>Your name <span class="field-optional">saved for next time</span><input id="table-name" maxlength="32" autocomplete="nickname" placeholder="What should we call you?"></label>
  <details id="connection-options"><summary>Connection help</summary><label id="address-label"><span id="address-title">Server address</span><input id="table-address" type="text" inputmode="url" required><span id="lan-address-tip" hidden>If bones.local won't open, use the fallback IP shown in the host window. This address is saved for next time.</span></label></details>
  <details id="code-options"><summary>Have a room code?</summary><label>Table code <span class="field-optional">optional</span><input id="table-code" maxlength="6" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Enter code to join" aria-describedby="table-code-hint"></label>
  <p id="table-code-hint">Enter your friend’s code to join their room.</p></details><p id="table-error" role="alert"></p>
  <button type="submit" id="table-submit">CREATE TABLE</button><button type="button" id="table-resume" hidden>RESUME PREVIOUS TABLE</button><button type="button" id="table-back">HOME</button>
  <div class="table-help-links"><button type="button" id="table-rules">HOW TO PLAY</button><button type="button" id="lan-help" hidden>HOST ON WI-FI</button><button type="button" id="table-change-server" hidden>SERVER ADDRESS</button></div>
</form>`;
document.body.append(shell);
const hostDialog = document.createElement('dialog');
hostDialog.id = 'host-dialog'; hostDialog.setAttribute('aria-label','Host controls');
document.body.append(hostDialog);
const $ = s => shell.querySelector(s);
function showHostControls() {
  const state = net.state;
  if (!state || state.host !== state.seat) return;
  hostDialog.replaceChildren();
  const title = document.createElement('h2'); title.textContent = 'HOST CONTROLS'; hostDialog.append(title);
  for (const [seat, player] of state.seats.entries()) {
    if (seat === state.seat) continue;
    const row = document.createElement('div'); row.className = 'host-player';
    const name = document.createElement('strong'); name.textContent = `${player.name}${player.connected ? '' : ' · offline'}`; row.append(name);
    const transfer = document.createElement('button'); transfer.textContent = 'MAKE HOST'; transfer.disabled = !player.connected;
    transfer.onclick = () => { sendAction({ type: 'transfer-host', target: seat }); hostDialog.close(); }; row.append(transfer);
    const remove = document.createElement('button'); remove.textContent = 'REMOVE';
    remove.onclick = () => { remove.textContent = ['lobby','win'].includes(state.stage) ? 'CONFIRM REMOVE' : 'REMOVE · END ROUND'; remove.onclick = () => { sendAction({ type: 'kick', target: seat }); hostDialog.close(); }; }; row.append(remove);
    hostDialog.append(row);
  }
  if (state.stage !== 'lobby') { const note = document.createElement('p'); note.textContent = 'Removing someone ends this round. Everyone keeps their points.'; hostDialog.append(note); }
  const close = document.createElement('button'); close.textContent = 'DONE'; close.onclick = () => hostDialog.close(); hostDialog.append(close);
  hostDialog.showModal();
}
const roomDialog = document.createElement('dialog');
roomDialog.id = 'room-browser'; roomDialog.setAttribute('aria-label','Wi-Fi rooms'); roomDialog.onclose = () => {net.confirmRoom = null}; document.body.append(roomDialog);
function roomButton(label, handler, disabled = false) {
  const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
  button.disabled = disabled; button.onclick = handler; return button;
}
function changeRoom(command, confirmed = false) {
  if (net.state && !['lobby', 'win'].includes(net.state.stage) && !confirmed) { net.confirmRoom = command; renderRooms(); return; }
  net.confirmRoom = null;
  if (net.socket?.readyState !== WebSocket.OPEN) return;
  if (net.state) { net.nextRoom = command; net.socket.send(JSON.stringify({ type: 'leave' })); }
  else net.socket.send(JSON.stringify(command));
}
function renderRooms() {
  roomDialog.replaceChildren();
  const nav = document.createElement('nav'); nav.className = 'room-nav';
  nav.append(roomButton('HOME', leaveTable), roomButton('HOW TO PLAY', showRulebook)); roomDialog.append(nav);
  if (net.confirmRoom) {
    const command = net.confirmRoom; const title = document.createElement('h2'); title.textContent = 'LEAVE THIS GAME?'; roomDialog.append(title);
    const detail = document.createElement('p'); detail.textContent = 'This ends the current round. Your friends keep their points, and you’ll enter a different room.'; roomDialog.append(detail);
    const leave = roomButton(command.type === 'create' ? 'LEAVE & CREATE ROOM' : 'LEAVE & JOIN ROOM', () => changeRoom(command, true)); leave.className = 'room-primary'; roomDialog.append(leave, roomButton('STAY AT MY TABLE', () => {net.confirmRoom = null; roomDialog.close()})); return;
  }
  const art = document.createElement('img'); art.src = `${import.meta.env.BASE_URL}assets/table-lan.svg`; art.className = 'room-art'; art.alt = ''; roomDialog.append(art);
  const title = document.createElement('h2'); title.textContent = 'YOUR WI-FI PARTY'; roomDialog.append(title);
  if (net.error) { const error = document.createElement('p'); error.setAttribute('role','alert'); error.textContent = net.error; roomDialog.append(error); }
  const intro = document.createElement('p'); intro.textContent = 'Your party’s rooms. Pick one or start another.'; roomDialog.append(intro);
  if (!net.rooms.length) { const empty = document.createElement('p'); empty.textContent = 'No rooms yet. Yours can be the first!'; roomDialog.append(empty); }
  const list = document.createElement('div'); list.className = 'room-list';
  for (const room of [...net.rooms].sort((a,b) => Number(b.code === net.code) - Number(a.code === net.code))) {
    const current = room.code === net.code && !!net.state;
    const card = document.createElement('section'); card.className = `room-card${current ? ' current-room' : ''}`;
    const heading = document.createElement('h3'); heading.textContent = current ? 'YOUR CURRENT ROOM' : `${room.host}’s room`; card.append(heading);
    const code = document.createElement('strong'); code.textContent = room.code; card.append(code);
    const status = document.createElement('p'); status.textContent = `${room.players}/6 players · ${6-room.players} seats free${room.connected < room.players ? ` · ${room.connected} online` : ''} · ${({waiting:'Waiting for players',playing:'In game',paused:'Game paused',finished:'Match finished'})[room.status]}`; card.append(status);
    const seats = document.createElement('div'); seats.className = 'room-seats'; seats.setAttribute('aria-hidden', 'true');
    for (let i=0;i<6;i++) { const seat = document.createElement('span'); seat.className = i < room.players ? 'occupied' : ''; seat.textContent = i < room.players ? '●' : '○'; seats.append(seat); } card.append(seats);
    card.append(roomButton(current ? 'BACK TO MY TABLE' : room.joinable ? 'JOIN ROOM' : room.status === 'waiting' ? 'ROOM FULL' : room.status === 'finished' ? 'MATCH FINISHED' : room.status === 'paused' ? 'GAME PAUSED' : 'IN GAME', current ? () => roomDialog.close() : () => changeRoom({type:'join',code:room.code,name:stored('skull-name') || 'Friend'}), !current && !room.joinable));
    list.append(card);
  }
  const create = roomButton('＋ CREATE ANOTHER ROOM', () => changeRoom({type:'create',name:stored('skull-name') || 'Friend'})); create.className = 'room-primary'; roomDialog.append(create, list);
  roomDialog.append(roomButton('BACK TO TABLE', () => roomDialog.close()));
}
function showRooms() {
  renderRooms(); roomDialog.showModal();
  if (net.socket?.readyState === WebSocket.OPEN) net.socket.send(JSON.stringify({type:'list-rooms'}));
}
const nameDialog = document.createElement('dialog'); nameDialog.id = 'name-dialog'; nameDialog.setAttribute('aria-label','Change your name');
nameDialog.innerHTML = '<form><h2>YOUR NAME</h2><label>What should we call you?<input maxlength="32" required autocomplete="nickname"></label><button type="submit">SAVE NAME</button><button type="button">BACK TO TABLE</button></form>';
document.body.append(nameDialog);
nameDialog.querySelector('form').onsubmit = event => { event.preventDefault(); const name = nameDialog.querySelector('input').value.trim(); if (name && sendAction({type:'rename',name})) { save('skull-name',name); nameDialog.close(); } };
nameDialog.querySelector('button[type=button]').onclick = () => nameDialog.close();
function editName(name) { nameDialog.querySelector('input').value = name; nameDialog.showModal(); }
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
function localServer() { return ['localhost', '127.0.0.1'].includes(location.hostname) || location.hostname.endsWith('.local') || /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(location.hostname); }
export function openTable(mode, name, code = '', automatic = true) {
  net.mode = mode; net.state = null; net.rooms = []; net.error = ''; net.localStage = ''; net.manualClose = false;
  $('#table-title').textContent = mode === 'lan' ? 'YOUR WI-FI PARTY' : 'PLAY ONLINE';
  $('#table-mode-art').src = `${import.meta.env.BASE_URL}assets/table-${mode === 'lan' ? 'lan' : 'online'}.svg`;
  $('#lan-help').hidden = mode !== 'lan';
  $('#table-detail').textContent = mode === 'lan' ? 'We’ll seat you with friends automatically. No room code needed.' : 'Start a room and share the invite. Friends join with one tap.';
  $('#table-name').value = stored('skull-name') || (name?.toLowerCase() === 'you' ? '' : name) || '';
  $('#table-address').value = new URLSearchParams(location.search).get('server') || stored(`skull-${mode}-url`) || defaultTableAddress(mode, location.hostname, location.origin, localServer());
  $('#table-code').value = code;
  $('#address-title').textContent = mode === 'lan' ? 'LAN server address' : 'Internet server address';
  $('#table-address').placeholder = mode === 'lan' ? 'http://bones.local:10000' : 'https://your-game.onrender.com';
  const publicLan = mode === 'lan';
  $('#address-label').hidden = false;
  $('#connection-options').open = false; $('#code-options').open = !!code;
  $('#lan-address-tip').hidden = !publicLan;
  $('#table-change-server').hidden = true;
  $('#table-submit').textContent = code ? 'JOIN ROOM' : mode === 'lan' ? 'JOIN WI-FI PARTY' : 'CREATE ROOM';
  $('#table-resume').hidden = lastSeat()?.mode !== mode;
  $('#table-error').textContent = '';
  shell.hidden = false;
  $('#table-form').scrollTop = 0;
  net.onChange();
  if (automatic && (mode === 'lan' && localServer() || mode === 'internet' && code)) enterTable();
}
$('#table-code').addEventListener('input', () => { $('#table-submit').textContent = $('#table-code').value.trim() ? 'JOIN ROOM' : net.mode === 'lan' ? 'JOIN WI-FI PARTY' : 'CREATE ROOM'; });
$('#table-rules').addEventListener('click', showRulebook);
$('#lan-help').addEventListener('click', () => {
  const dialog = document.createElement('dialog'); dialog.id = 'install-help';
  const title = document.createElement('h2'); title.textContent = 'HOST A LAN TABLE'; dialog.append(title);
  const detail = document.createElement('p'); detail.textContent = 'On one computer connected to the same Wi-Fi, download BONES and open Start BONES LAN (Mac or Windows). Keep that window open. On each phone, open bones.local:10000/Bones/. If that name does not open, use the fallback IP address printed in the host window instead.'; dialog.append(detail);
  const link = document.createElement('a'); link.href = 'https://github.com/Strategamma/Bones#lan-tables-on-the-same-wi-fi'; link.textContent = 'HOST SETUP GUIDE'; link.target = '_blank'; link.rel = 'noopener'; dialog.append(link);
  const close = document.createElement('button'); close.textContent = 'GOT IT'; close.onclick = () => dialog.close(); dialog.append(close);
  dialog.addEventListener('close', () => dialog.remove()); document.body.append(dialog); dialog.showModal();
});
$('#table-change-server').addEventListener('click', () => { $('#address-label').hidden = false; $('#table-change-server').hidden = true; $('#table-address').focus(); });
$('#table-back').addEventListener('click', leaveTable);
$('#table-resume').addEventListener('click', () => {
  const saved = lastSeat();
  if (!saved || saved.mode !== net.mode) return;
  net.url = saved.url; net.code = saved.code; net.token = saved.token; net.error = '';
  connect();
});
$('#table-form').addEventListener('submit', event => { event.preventDefault(); enterTable(); });
function enterTable() {
  try {
    const mode = net.mode, name = $('#table-name').value.trim(), code = $('#table-code').value.trim().toUpperCase();
    const url = normalizeUrl($('#table-address').value, mode);
    save('skull-name', name); save(`skull-${mode}-url`, url);
    if (mode === 'lan' && location.protocol === 'https:' && url !== location.origin) {
      location.assign(localTableUrl(url, name, code));
      return;
    }
    net.url = url; net.code = code; net.error = '';
    const saved = lastSeat();
    const savedHere = saved?.mode === mode && saved.url === url;
    let command;
    if (code) command = savedHere && saved.code === code ? {type:'resume',code,token:saved.token} : {type:'join',code,name:name || 'Friend'};
    else if (mode === 'lan') command = {type:'auto-join',name,...(savedHere ? {code:saved.code,token:saved.token} : {})};
    else command = {type:'create',name:name || 'Friend'};
    connect(command);
  } catch (error) { $('#table-error').textContent = error.message; }
}
function socketUrl(url) { const u = new URL(url); u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:'; u.pathname = '/ws'; u.search = ''; u.hash = ''; return u.href; }
function connect(first) {
  if (net.socket) { net.manualClose = true; net.socket.close(); }
  net.manualClose = false;
  const socket = new WebSocket(socketUrl(net.url));
  let heartbeat;
  net.socket = socket; net.connected = false; net.onChange();
  socket.onopen = () => {
    if (net.socket !== socket) return;
    net.connected = true; net.retry = 0; net.error = '';
    socket.send(JSON.stringify({ type: 'hello' }));
    heartbeat = setInterval(() => { if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'ping' })); }, 120000);
    net.onChange();
  };
  socket.onmessage = event => {
    if (net.socket !== socket) return;
    let message;
    try { message = JSON.parse(event.data); } catch { return; }
    if (message.type === 'hello') {
      if (message.mode !== net.mode) {
        net.error = `This server hosts ${message.mode} tables. Choose the matching server.`;
        shell.hidden = false; $('#table-error').textContent = net.error;
        net.manualClose = true; socket.close(); net.onChange(); return;
      }
      if (net.mode === 'lan') socket.send(JSON.stringify({ type: 'list-rooms' }));
      socket.send(JSON.stringify(first || { type: 'resume', code: net.code, token: net.token }));
    } else if (message.type === 'rooms') { net.rooms = message.rooms; if (roomDialog.open) renderRooms();
    } else if (message.type === 'left') {
      net.state = null; net.localStage = ''; net.pendingAction = false; net.token = ''; net.code = ''; clear('skull-last'); clear('skull-auto-resume');
      const command = net.nextRoom; net.nextRoom = null; if (command) socket.send(JSON.stringify(command));
    } else if (message.type === 'joined') {
      if (roomDialog.open) roomDialog.close();
      net.code = message.code; net.token = message.token;
      const query = new URLSearchParams(location.search);
      if (query.has('code')) { query.set('code', net.code); query.delete('auto'); history.replaceState(history.state,'',location.pathname+'?'+query+location.hash); }
      save('skull-last', JSON.stringify({ mode: net.mode, url: net.url, code: net.code, token: net.token }));
      save('skull-auto-resume', 'yes');
      shell.hidden = true;
    } else if (message.type === 'state') { net.state = message.state; net.draft = Math.max(1, message.state.bid + 1); net.pendingAction = false; net.error = ''; }
    else if (message.type === 'kicked') {
      const mode = net.mode;
      clear('skull-last'); leaveTable(); openTable(mode, stored('skull-name'), '', false);
      $('#table-error').textContent = 'The host removed you from this table.';
      return;
    }
    else if (message.type === 'error') {
      net.pendingAction = false;
      net.error = message.message;
      if (!net.state) {
        const address = net.url;
        const expiredSeat = (!first || first.type === 'resume') && ['Saved table not found.', 'Invalid seat token.'].includes(message.message);
        const joinCode = expiredSeat && message.message === 'Invalid seat token.' ? net.code : '';
        if (expiredSeat) { clear('skull-last'); clear('skull-auto-resume'); net.token = ''; net.code = ''; }
        openTable(net.mode, stored('skull-name'), expiredSeat ? joinCode : net.code, false);
        $('#table-address').value = address;
      }
      $('#table-error').textContent = message.message;
      if (roomDialog.open) renderRooms();
    }
    net.onChange();
  };
  socket.onclose = event => {
    clearInterval(heartbeat);
    if (net.socket !== socket) return;
    net.connected = false;
    net.pendingAction = false;
    if (net.manualClose) return;
    if (event.code === 4001) {
      const mode = net.mode; leaveTable(); openTable(mode, stored('skull-name'), '', false);
      $('#table-error').textContent = 'Your seat is open in another tab. Close that tab before resuming here.'; return;
    }
    if (event.code === 4003) {
      const mode = net.mode;
      clear('skull-last'); leaveTable(); openTable(mode, stored('skull-name'), '', false);
      $('#table-error').textContent = 'The host removed you from this table.';
      return;
    }
    net.error = 'Connection lost. Reconnecting…';
    net.onChange();
    if (net.token) setTimeout(() => { if (!net.connected && !net.manualClose) connect(); }, Math.min(12000, 800 * 2 ** Math.min(net.retry++, 4)));
    else { shell.hidden = false; $('#connection-options').open = true; $('#table-error').textContent = 'We couldn’t reach the host. Use the Wi-Fi address shown on the hosting computer, then try again.'; }
  };
};
export function resumeLast() {
  if (stored('skull-auto-resume') !== 'yes') return;
  const saved = lastSeat();
  if (!saved?.url || !saved?.token || !saved?.code) return;
  net.mode = saved.mode; net.url = saved.url; net.code = saved.code; net.token = saved.token;
  connect();
}
export function sendAction(action) {
  if (!net.connected || net.pendingAction || net.socket?.readyState !== WebSocket.OPEN) return false;
  net.pendingAction = true;
  net.socket.send(JSON.stringify({ type: 'action', action }));
  net.onChange();
  return true;
}
export function leaveTable() {
  if (hostDialog.open) hostDialog.close();
  if (roomDialog.open) roomDialog.close();
  if (nameDialog.open) nameDialog.close();
  net.manualClose = true;
  net.socket?.close(); net.socket = null; net.state = null; net.mode = null; net.token = ''; net.code = ''; net.connected = false; net.pendingAction = false; net.error = ''; net.notice = ''; net.localStage = '';
  clear('skull-auto-resume'); shell.hidden = true; net.onChange();
}
async function shareInvite() {
  const invite = new URL(location.pathname, location.origin);
  invite.searchParams.set('table', net.mode);
  invite.searchParams.set('code', net.code);
  if (net.url !== location.origin) invite.searchParams.set('server', net.url);
  try {
    if (navigator.share) await navigator.share({ title: 'Join my Bones table', url: invite.href });
    else if (navigator.clipboard) { await navigator.clipboard.writeText(invite.href); net.notice = 'Invite copied!'; }
    else { prompt('Copy this invite link', invite.href); }
  } catch (error) { if (error.name !== 'AbortError') net.notice = 'Share failed. Try again.'; }
  net.onChange();
}
let selectedReveal = null, selectionKey = '';
export function drawTable(ui) {
  const { header, panel, txt, button, disc, cardChoice, art, H, colors } = ui;
  const controls=()=>{const entries=[[soundEnabled()?'SOUND':'MUTED',()=>{toggleSound();net.onChange()},soundEnabled()?'sound':'mute'],['RULES',showRulebook,'help'],...(net.mode==='lan'?[['ROOMS',showRooms,'rooms']]:[]),...(net.state?.host===net.state?.seat?[['HOST',showHostControls,'host']]:[]),['HOME',leaveTable,'home']];const width=340/entries.length;entries.forEach(([label,fn,icon],i)=>ui.navButton(label,25+i*width,width-6,fn,icon));};
  const s = net.state;
  if (!s) {
    header(net.mode === 'lan' ? 'LAN TABLE' : 'INTERNET TABLE', net.connected ? 'Connecting to the table…' : 'Choose a name to create or join.');
    controls();
    txt('✦', 195, H * .40, 90, '#f7f2e9', 900);
    if (net.error) txt(net.error.slice(0, 40), 195, H * .65, 13, '#ffafb8', 700);
    button('BACK', 30, H - 110, 330, 56, leaveTable, 'dark');
    return;
  }
  const me = s.seat, mine = s.seats[me], turn = s.stage === 'place' ? !s.stack.length && mine.discs > 0 : s.turn === me, host = s.host === me;
  const titles={lobby:`${s.mode.toUpperCase()} TABLE`,place:'PLACE A CARD',add:'PLAY OR BID',bid:'THE BIDDING',reveal:'THE REVEAL',loss:'SKULL REVEALED','choose-lead':'CHOOSE THE LEAD',result:'ROUND COMPLETE',win:'THE CHAMPION',paused:'TABLE PAUSED'};
  const turnName=s.stage==='place' ? `${s.seats.filter(p=>p.stack>0).length}/${s.seats.filter(p=>p.discs>0).length} cards placed` : turn?'Your turn':`${s.seats[s.turn]?.name || 'Player'}'s turn`;
  const subtitles={lobby:`${s.seats.length}/6 players · ${6-s.seats.length} seats free`,reveal:s.challenger===me?'Find flowers. Avoid the skull.':`${s.seats[s.challenger]?.name} is revealing`,loss:s.challenger===me?'You lose one card':`${s.seats[s.challenger]?.name} loses one card`,result:s.resultKind==='flower'?'Flower challenge won':'One card discarded',win:s.winner===me?'You took the crown':`${s.seats[s.winner]?.name} took the crown`,paused:'Reconnect or vote to continue'};
  header(titles[s.stage]||'BONES TABLE',s.stage==='lobby'?subtitles.lobby:`Round ${s.round} · ${subtitles[s.stage]||turnName}`);
  controls();
  if(s.stage==='win'){
    const heroH=Math.min(210,H*.28),heroY=145;
    const zoom=ui.reducedMotion?1:Math.min(1,.8+ui.phaseAge*.5);
    art('victory-arcade',195-170*zoom,heroY,340*zoom,heroH*zoom);
    const nameY=heroY+heroH+22;
    txt(s.winner===me?'YOU ARE THE CHAMPION':`${s.seats[s.winner].name.toUpperCase()} WINS`,195,nameY,25,'#f7f2e9',900,'center',340);
    txt(s.resultKind==='flower'?'2 POINTS · CROWN CLAIMED':'LAST PLAYER STANDING',195,nameY+28,14,'#91d9c7',900);
    const ranks=s.seats.map((p,i)=>({...p,seat:i})).sort((a,b)=>Number(b.seat===s.winner)-Number(a.seat===s.winner)||b.wins-a.wins);
    ranks.forEach((p,i)=>{const x=22+i%3*118,y=nameY+52+Math.floor(i/3)*40;panel(x,y,110,34,'#403251',p.seat===s.winner?'#ffd981':'#796989',10);txt(p.name,x+8,y+11,11,'#f7f2e9',800,'left',92);txt(`${p.wins}/2 POINTS`,x+8,y+25,9,'#91d9c7',800,'left');});
    button(host?'PLAY AGAIN':'HOST STARTS THE REMATCH',30,H-96,330,52,host?()=>sendAction({type:'rematch'}):null,host?'pink':'dark');
    return;
  }
  if (!net.connected) { panel(20, 115, 350, 58, '#69415a', '#f6a3aa'); txt('Reconnecting to your table…', 195, 144, 15, '#fff', 800); }
  const crowded = s.stage !== 'lobby' && H < 760;
  const tight=s.seats.length>=5&&H<640;
  const top = tight ? 136 : s.stage === 'lobby' && H < 700 ? 145 : crowded ? 145 : 160, gap = tight ? 44 : s.stage === 'lobby' ? (H < 700 ? 68 : H < 760 ? 74 : 84) : crowded ? 56 : H < 760 ? 76 : 99, seatHeight = tight ? 42 : s.stage === 'lobby' ? (H < 700 ? 62 : 70) : crowded ? 52 : H < 760 ? 70 : 82;
  const slide=ui.reducedMotion||H<760?0:Math.max(0,1-ui.phaseAge/.35)*8;
  const stageY = top + Math.floor((s.seats.length - 1) / 2) * gap + seatHeight + (crowded ? 12 : 19) + slide;
  if(s.stage!=='reveal')art('shared-table',15,top-5,360,stageY-top+3);
  if(s.stage!=='reveal')s.seats.forEach((p, i) => {
    const x = s.stage === 'lobby' && s.seats.length === 1 ? 111 : 20 + i % 2 * 183, y = top + Math.floor(i / 2) * gap;
    if(i===me)panel(x+7,y+5,114,24,'#1b3038','#648f88',12);
    else if(i===s.turn&&['add','bid'].includes(s.stage))panel(x+7,y+5,114,24,'#435244','#ffd981',12);
    ui.turnGlow(x+6,y+3,116,28,colors[i],(s.stage==='place'?p.stack===0:i===s.turn)&&['place','add','bid','reveal'].includes(s.stage));
    ui.tint(x+5,y+13,5,seatHeight-28,colors[i]);
    if (i === me && s.stage === 'lobby') ui.spots.push({x,y,w:168,h:seatHeight,label:'Change your name',fn:()=>editName(p.name)});
    txt(`${i+1} ${p.name}`, x + 12, y + (tight ? 13 : crowded || s.stage==='lobby' ? 18 : 23), crowded ? 13 : 14, p.connected ? '#fff4d8' : '#9c92aa', 800, 'left', 104);
    if(p.wins){const pop=!ui.reducedMotion&&i===ui.pointSeat?Math.max(0,1-ui.pointAge/.7)*.28:0,size=(tight?22:crowded?26:30)*(1+pop);art('point-badge',x+151-size/2,y+3,size,size);}
    else txt('◇ ◇',x+151,y+(tight?13:crowded?18:22),tight?12:15,'#91d9c7',800,'right');
    txt(s.stage === 'lobby' ? i === me ? 'You · tap to change name' : i === s.host ? 'Host · ready' : p.connected ? 'Ready to play' : 'Offline · seat reserved' : `${p.stack} down · ${p.discs} cards`, x + 12, y + (tight ? 32 : crowded ? 42 : seatHeight - (s.stage==='lobby'?19:27)), crowded ? 11 : 12, '#d1c8d9', 600, 'left', 112);
    if (p.stack){const pop=!ui.reducedMotion&&i===ui.stackSeat?Math.max(0,1-ui.stackAge/.45)*.38:0;for(let n=0;n<p.stack;n++)ui.cardRect(x+126+n*6,y+seatHeight-(tight?24:crowded?30:36),18*(1+pop),24*(1+pop),'back',null,colors[i]);}
  });
  if (s.stage === 'lobby') {
    const connected = s.seats.filter(p => p.connected).length;
    const ready = connected >= 3 && connected === s.seats.length;
    const lobbyY = Math.max(top + Math.ceil(s.seats.length / 2 - 1) * gap + seatHeight + (H < 700 ? 18 : 30), H * .44);
    if (s.seats.length === 1) txt(s.mode === 'lan' ? 'Friends on Wi-Fi join automatically' : 'Your table is ready for friends', 195, lobbyY - 21, 15, '#91d9c7', 800);
    panel(28, lobbyY, 334, 86, '#4b335c', '#f3bc81', 20, 'menu-box');
    txt(`ROOM  ${s.code}`, 195, lobbyY + 29, 25, '#f7f2e9', 900);
    txt(ready ? `${connected} players ready · ${s.mode === 'lan' ? 'same Wi‑Fi' : 'online'}` : s.seats.length > connected ? `${s.seats.length-connected} offline · host can remove them` : `Need ${Math.max(0,3-connected)} more player${3-connected===1?'':'s'}`, 195, lobbyY + 63, 13, ready ? '#91d9c7' : '#e4dbea', 800);
    button(s.mode === 'lan' ? 'INVITE MORE FRIENDS' : 'SHARE INVITE', 30, lobbyY + 101, 330, 52, shareInvite, ready?'dark':'pink');
    if (host && ready) button('START GAME', 30, lobbyY + 167, 330, 56, () => sendAction({ type: 'start' }), 'gold');
    else { panel(30, lobbyY + 167, 330, 56, '#3a304e', '#6d6081', 16); txt(host ? 'WAITING FOR PLAYERS' : 'WAITING FOR HOST', 195, lobbyY + 195, 16, '#d1c8d9', 800); }
    if (net.error || net.notice) txt((net.error || net.notice).slice(0, 45), 195, lobbyY + 245, 12, net.error ? '#ffadb8' : '#c8f5d9', 700);
  } else if (s.stage === 'paused') {
    txt('TABLE PAUSED', 195, H - 259, 22, '#f7f2e9', 900);
    txt('Everyone still here can vote to continue.', 195, H - 220, 13, '#e4dbea', 700);
    button(s.votes?.[me] ? 'VOTE RECORDED' : 'CONTINUE TOGETHER', 30, H - 165, 330, 64, s.votes?.[me] ? null : () => sendAction({ type: 'continue' }), s.votes?.[me] ? 'dark' : 'gold');
  } else if (s.stage === 'place' || s.stage === 'add') {
    const cardH=H<760?104:116,cardW=cardH*.72,handY=stageY+28;
    panel(27,stageY,336,cardH+48,'#2c233e','#6b587d',20);
    ui.tint(49,stageY+12,3,17,turn?'#ffd981':'#91d9c7');
    txt(!s.hand.length?'ALL YOUR CARDS ARE DOWN':turn?'YOUR MOVE · PLAY A CARD':s.stage==='place'?'YOUR FIRST CARD IS DOWN':`WAITING FOR ${s.seats[s.turn]?.name.toUpperCase()}`,195,stageY+15,14,'#91d9c7',900,'center',304);
    s.hand.forEach((type,index)=>{const x=195-(s.hand.length*cardW+(s.hand.length-1)*8)/2+index*(cardW+8);ui.cardRect(x,handY,cardW,cardH,type,turn?()=>sendAction({type:'place',index}):null,colors[me],`Place ${type} card ${index+1}`);});
    if (!s.hand.length) txt('Your hand is empty. Choose a bid.',195,handY+35,13,'#f7f2e9',800);
    if (s.stage==='add' && turn) showBids({x:27,y:stageY+cardH+50,w:336,min:1,max:s.total,height:tight?84:96});
    else txt(s.stage==='place'?'Everyone chooses one card. Then the starter plays.':'Cards you add go on top of your stack.',195,Math.min(H-63,stageY+cardH+76),12,'#d1c8d9',700,'center',336);
  } else if (s.stage === 'bid') {
    const spotH=H<700?64:108;
    art('bid-spotlight',27,stageY,336,spotH);
    const pulse=ui.reducedMotion?0:Math.max(0,1-ui.bidAge/.7)*7;
    txt(`${s.bid} FLOWER${s.bid===1?'':'S'}`,195,stageY+spotH*.47,30+pulse,'#241b38',900);
    txt(`${s.seats[s.leader]?.name} called the bid`,195,stageY+spotH*.78,12,'#46334f',800,'center',300);
    if(turn){
      const bids=showBids({x:27,y:stageY+spotH+12,w:336,min:s.bid+1,max:s.total,height:tight?84:96});
      const passH=Math.max(44,44/bids.scale),passY=Math.min(H-38-passH,bids.bottom+10);
      button('PASS · I’M OUT OF THIS BID',30,passY,330,passH,()=>sendAction({type:'pass'}),'dark');
    }else txt(s.passed[me]?'You passed. Watch the bidding.':`Clockwise · ${s.seats[s.turn]?.name} raises or passes`,195,stageY+spotH+35,13,'#d1c8d9',800,'center',336);
  } else if (s.stage === 'reveal') {
    const key=`${s.code}:${s.round}:${s.flips.length}:${s.turn}`;
    if(key!==selectionKey){selectedReveal=null;selectionKey=key;}
    const ownLeft=s.seats[s.challenger].stack-s.flips.filter(f=>f.owner===s.challenger).length;
    const startY=145,rows=Math.ceil(s.seats.length/2),rowH=Math.min(156,(H-startY-116)/rows);
    art('shared-table',15,startY-4,360,rows*rowH+4);
    s.seats.forEach((p,i)=>{
      const x=20+i%2*183,y=startY+Math.floor(i/2)*rowH;
      ui.tint(x+9,y+9,4,14,colors[i]);
      if(i===me)panel(x+18,y+2,108,24,'#1b3038',colors[i],12);
      txt(i===me?'YOUR TABLE':p.name.toUpperCase(),x+26,y+15,13,colors[i],900,'left',p.stack>=3?90:128);
      if(p.stack>=3)txt('SWIPE →',x+155,y+15,8,'#d1c8d9',700,'right');
      if(!p.stack)txt('NO CARDS PLAYED',x+84,y+rowH*.6,10,'#b5a5c9',700);
    });
    showTableCards({state:s,selected:selectedReveal,onSelect:choice=>{selectedReveal=choice;net.onChange()},startY,rowH,flipAge:ui.flipAge,reducedMotion:ui.reducedMotion,busy:ui.flipAge<1.25||!s.flips.length&&ui.phaseAge<1.5,announcing:!s.flips.length&&ui.phaseAge<1.5});
    const footer=startY+rows*rowH;
    txt(`${s.seats[s.challenger].name} · ${s.remaining} FLOWER${s.remaining===1?'':'S'} LEFT`,195,footer+12,16,'#f7f2e9',900,'center',340);
    txt(turn?selectedReveal?`READY · ${s.seats[selectedReveal.target].name} · CARD ${selectedReveal.index+1}`:ownLeft?'YOUR MOVE · Choose one of your cards':'YOUR MOVE · Choose any hidden card': 'Watch the highlighted cards open',195,footer+37,14,turn?'#ffd981':'#91d9c7',800,'center',340);
    if(turn)showRevealConfirm({x:30,y:footer+55,w:330,h:48,choice:selectedReveal,announcing:!s.flips.length&&ui.phaseAge<1.5,disabled:net.pendingAction||!net.connected||ui.flipAge<1.25||!s.flips.length&&ui.phaseAge<1.5,onConfirm:()=>{if(!selectedReveal)return;const choice=selectedReveal;selectedReveal=null;sendAction({type:'flip',...choice})}});
  } else if (s.stage === 'loss') {
    const artH=tight?72:H<760?100:138;
    art('skull-loss',95,stageY,200,artH);
    txt(`${s.seats[s.challenger].name} found a skull`,195,stageY+artH+10,17,'#ffb6cb',900,'center',330);
    txt(me===s.skullOwner?'YOUR SKULL · THROW ONE CARD AWAY':`${s.seats[s.skullOwner].name} chooses a card to throw away`,195,H-160,13,'#f7f2e9',800,'center',340);
    const w=54,h=74,y=H-137;
    for(let index=0;index<s.lossCount;index++){const x=195-(s.lossCount*w+(s.lossCount-1)*12)/2+index*(w+12);ui.cardRect(x,y,w,h,'back',me===s.skullOwner?()=>sendAction({type:'discard',index}):null,colors[s.challenger],`Discard hidden card ${index+1}`);}
  } else if (s.stage === 'choose-lead') {
    txt(`${s.seats[s.challenger].name} chooses the next lead`, 195, H - 283, 15, '#91d9c7', 800);
    s.seats.forEach((p, i) => { if (p.discs) button(p.name, 25 + i % 2 * 174, H - 248 + Math.floor(i / 2) * 57, 165, 49, me === s.challenger ? () => sendAction({ type: 'lead', target: i }) : null, me === s.challenger ? 'gold' : 'dark'); });
  } else if (s.stage === 'result') {
    if(s.resultKind==='flower'){
      const badgeSize=H<760?74:106;
      const pop=ui.reducedMotion?1:Math.min(1,.72+ui.phaseAge*.65);
      art('point-badge',195-badgeSize*pop/2,stageY-1,badgeSize*pop,badgeSize*pop);
      txt(s.challenger===me?'YOU EARNED A POINT':`${s.seats[s.challenger].name} EARNED A POINT`,195,stageY+badgeSize+14,21,'#f7f2e9',900,'center',340);
      txt('1 / 2 POINTS · ONE MORE TO WIN',195,stageY+badgeSize+39,14,'#c9f5e8',800);
    }else {art('card-discard',145,stageY-4,100,80);txt(s.challenger===me?'You lost one card. Keep bluffing.':`${s.seats[s.challenger].name} lost one card.`,195,stageY+95,17,'#f7f2e9',800,'center',340);}
    button(host ? 'NEXT ROUND' : 'WAITING FOR HOST', 30, H - 139, 330, 61, host ? () => sendAction({ type: 'next' }) : null, host ? 'gold' : 'dark');
  }
  if (s.stage !== 'lobby' && (net.error || net.notice)) txt((net.error || net.notice).slice(0, 45), 195, H - 55, 12, net.error ? '#ffadb8' : '#c8f5d9', 700);

}
