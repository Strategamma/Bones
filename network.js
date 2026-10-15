import {decorateDialog,messageDialog} from './dialogs.js';
import { soundEnabled, toggleSound } from './audio.js';
import { showRulebook } from './rulebook.js';
import { defaultTableAddress, localTableUrl, automaticEntry, connectionTimeout, connectionMessage, tableCapabilities, tableInvite, ARCADE_URL } from './entry.js';
import { configureGameplayControls, showBids, showTableCards, showRevealConfirm } from './gameplay-controls.js';

export const net = { mode: null, state: null, socket: null, url: '', token: '', code: '', error: '', connected: false, connecting: false, pendingAction: false, draft: 1, onChange: () => {}, retry: 0, manualClose: false, rooms: [] };
let retryTimer;
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
  <button type="submit" id="table-submit">CREATE TABLE</button><button type="button" id="table-create" hidden>CREATE MY OWN ROOM</button><button type="button" id="table-resume" hidden>RESUME PREVIOUS TABLE</button><button type="button" id="table-back">BONES HOME</button>
  <div class="table-help-links"><button type="button" id="table-rules">HOW TO PLAY</button><button type="button" id="lan-help" hidden>HOST ON WI-FI</button><button type="button" id="table-change-server" hidden>SERVER ADDRESS</button><button type="button" id="table-arcade">DECADENCE ARCADE</button></div>
</form>`;
document.body.append(shell);
const hostDialog = document.createElement('dialog');
hostDialog.id = 'host-dialog'; hostDialog.setAttribute('aria-label','Host controls');
document.body.append(hostDialog);
const $ = s => shell.querySelector(s);
function setupBusy(busy) {
  for(const control of shell.querySelectorAll('#table-submit,#table-resume,#table-create,input'))control.disabled=busy;
  if(busy)$('#table-form').setAttribute('aria-busy','true');else $('#table-form').removeAttribute('aria-busy');
}
function showHostControls() {
  const state = net.state;
  if (!state || state.host !== state.seat) return;
  hostDialog.replaceChildren();
  const exit=document.createElement('button');exit.className='dialog-close';exit.textContent='×';exit.setAttribute('aria-label','Close host controls');exit.onclick=()=>hostDialog.close();hostDialog.append(exit);
  const title = document.createElement('h2'); title.textContent = 'HOST CONTROLS'; hostDialog.append(title);
  if (net.features?.bots && state.stage === 'lobby' && state.seats.length < 6) {
    const add = document.createElement('button'); add.textContent = 'ADD BOT';
    add.onclick = () => { sendAction({type:'add-bot'}); hostDialog.close(); }; hostDialog.append(add);
  }
  for (const [seat, player] of state.seats.entries()) {
    if (seat === state.seat) continue;
    const row = document.createElement('div'); row.className = 'host-player';
    const name = document.createElement('strong'); name.textContent = `${player.name}${player.bot ? ' · BOT' : ''}${player.connected ? '' : ' · offline'}`; row.append(name);
    const transfer = document.createElement('button'); transfer.textContent = 'MAKE HOST'; transfer.disabled = !player.connected || player.bot;
    transfer.onclick = () => { sendAction({ type: 'transfer-host', target: seat }); hostDialog.close(); }; row.append(transfer);
    const remove = document.createElement('button'); remove.textContent = 'REMOVE';
    remove.onclick = () => { remove.textContent = ['lobby','win'].includes(state.stage) ? 'CONFIRM REMOVE' : 'REMOVE · END ROUND'; remove.onclick = () => { sendAction({ type: 'kick', target: seat }); hostDialog.close(); }; }; row.append(remove);
    hostDialog.append(row);
  }
  if (state.stage !== 'lobby') { const note = document.createElement('p'); note.textContent = 'Removing someone ends this round. Everyone keeps their points.'; hostDialog.append(note); }
  const close = document.createElement('button'); close.textContent = 'DONE'; close.onclick = () => hostDialog.close(); hostDialog.append(close);

  decorateDialog(hostDialog,'nav-host');hostDialog.showModal();
}
const roomDialog = document.createElement('dialog');
roomDialog.id = 'room-browser'; roomDialog.setAttribute('aria-label','Wi-Fi rooms'); roomDialog.onclose = () => {net.confirmRoom = null}; document.body.append(roomDialog);
function roomButton(label, handler, disabled = false) {
  const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
  button.disabled = disabled; button.onclick = handler; return button;
}
function changeRoom(command, confirmed = false) {
  if (net.nextRoom) return;
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
  const intro = document.createElement('p'); intro.textContent = 'Rooms on this host computer. Pick one or start another.'; roomDialog.append(intro);
  if (!net.rooms.length) { const empty = document.createElement('p'); empty.textContent = 'No rooms yet. Yours can be the first!'; roomDialog.append(empty); }
  const list = document.createElement('div'); list.className = 'room-list';
  for (const room of [...net.rooms].sort((a,b) => Number(b.code === net.code) - Number(a.code === net.code))) {
    const current = room.code === net.code && !!net.state;
    const card = document.createElement('section'); card.className = `room-card party-ticket${current ? ' current-room' : ''}`;
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
  renderRooms(); decorateDialog(roomDialog,'table-lan');roomDialog.showModal();
  if (net.socket?.readyState === WebSocket.OPEN) net.socket.send(JSON.stringify({type:'list-rooms'}));
}
const nameDialog = document.createElement('dialog'); nameDialog.id = 'name-dialog'; nameDialog.setAttribute('aria-label','Change your name');
nameDialog.innerHTML = '<form novalidate><h2>YOUR NAME</h2><label>What should we call you?<input maxlength="32" required autocomplete="nickname"></label><p id="name-error" role="alert"></p><button type="submit">SAVE NAME</button><button type="button">BACK TO TABLE</button></form>';
document.body.append(nameDialog);
let localNameEdit=false;
nameDialog.querySelector('form').onsubmit = event => {event.preventDefault();const input=nameDialog.querySelector('input'),name=input.value.trim();if(!name){nameDialog.querySelector('#name-error').textContent='Enter a name so your friends can find you.';input.setAttribute('aria-invalid','true');input.focus();return;}if(localNameEdit||sendAction({type:'rename',name})){save('skull-name',name);dispatchEvent(new CustomEvent('bones-name-changed',{detail:name}));nameDialog.close();}};
nameDialog.querySelector('button[type=button]').onclick = () => nameDialog.close();
export function editName(name,{local=false}={}) { localNameEdit=local;nameDialog.querySelector('button[type=button]').textContent=local?'BACK TO HOME':'BACK TO TABLE'; nameDialog.querySelector('#name-error').textContent='';nameDialog.querySelector('input').removeAttribute('aria-invalid');nameDialog.querySelector('input').value = name; decorateDialog(nameDialog,'card-flower-new');nameDialog.showModal();return new Promise(resolve=>nameDialog.addEventListener('close',resolve,{once:true})); }
let peekDialog=null,peekKey='';
function peekOwnCards(){
 const state=net.state;if(!state?.stack?.length)return;
 peekKey=JSON.stringify([state.code,state.round,state.stack]);
 const dialog=document.createElement('dialog');dialog.id='own-cards';dialog.className='arcade-dialog';dialog.setAttribute('aria-label','Your played cards');peekDialog=dialog;
 const title=document.createElement('h2');title.textContent='YOUR PLAYED CARDS';const note=document.createElement('p');note.textContent='Only you can see this peek. Bottom card first, newest card last.';dialog.append(title,note);
 const cards=document.createElement('div');cards.className='private-peek-cards';
 state.stack.forEach((type,index)=>{const figure=document.createElement('figure'),image=document.createElement('img'),caption=document.createElement('figcaption');image.src=`${import.meta.env.BASE_URL}assets/card-${type}-new.svg`;image.alt=type==='flower'?'Flower':'Skull';caption.textContent=state.stack.length===1?'YOUR CARD':index===0?'BOTTOM':index===state.stack.length-1?'TOP':`CARD ${index+1}`;figure.append(image,caption);cards.append(figure);});
 const close=document.createElement('button');close.textContent='BACK TO TABLE';close.className='dialog-primary';close.onclick=()=>dialog.close();dialog.append(cards,close);dialog.addEventListener('close',()=>{dialog.remove();if(peekDialog===dialog)peekDialog=null;});document.body.append(dialog);dialog.showModal();
}
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
export function openTable(mode, name, code = '', automatic = true, codeEntry = false) {
  net.mode = mode; net.state = null; net.rooms = []; net.error = ''; net.localStage = ''; net.manualClose = false;
  $('#table-title').textContent = mode === 'lan' ? 'YOUR WI-FI PARTY' : code || codeEntry ? 'JOIN ONLINE ROOM' : 'PLAY ONLINE';
  $('#table-mode-art').src = `${import.meta.env.BASE_URL}assets/table-${mode === 'lan' ? 'lan' : 'online'}.svg`;
  $('#lan-help').hidden = mode !== 'lan';
  $('#table-detail').textContent = mode === 'lan' ? 'One computer hosts the party. Join its Wi-Fi address; we’ll find a room on that host.' : code ? 'Joining your friend’s room. Keep this page open while we connect.' : codeEntry ? 'Enter your friend’s room code. An invite link joins directly.' : automatic ? 'Creating your room. Share the invite when it’s ready; you can change your name in the lobby.' : 'Start a room and share the invite. You can change your name in the lobby.';
  $('#table-name').value = stored('skull-name') || (name?.toLowerCase() === 'you' ? '' : name) || '';
  const inviteQuery=new URLSearchParams(location.search),inviteAddress=inviteQuery.get('table')===mode ? inviteQuery.get('server') : '';
  $('#table-address').value = inviteAddress || stored(`skull-${mode}-url`) || defaultTableAddress(mode, location.hostname, location.origin, localServer());
  $('#table-code').value = code;
  $('#table-code').required = codeEntry;
  $('#code-options label .field-optional').textContent = codeEntry ? 'required' : 'optional';
  $('#table-create').hidden = mode !== 'internet' || !code && !codeEntry;
  $('#address-title').textContent = mode === 'lan' ? 'LAN server address' : 'Internet server address';
  $('#table-address').placeholder = mode === 'lan' ? 'http://bones.local:10000' : 'https://your-game.onrender.com';
  const publicLan = mode === 'lan';
  $('#address-label').hidden = false;
  $('#connection-options').open = false; $('#code-options').open = !!code || codeEntry;
  $('#lan-address-tip').hidden = !publicLan;
  $('#table-change-server').hidden = true;
  $('#table-submit').textContent = code || codeEntry ? 'JOIN ROOM' : mode === 'lan' ? 'JOIN WI-FI PARTY' : 'CREATE ROOM';
  $('#table-resume').hidden = lastSeat()?.mode !== mode;
  $('#table-error').textContent = '';
  net.automaticEntry=automatic && automaticEntry(mode, localServer(), code, inviteAddress);
  shell.hidden=net.automaticEntry;
  $('#table-form').scrollTop = 0;
  if(net.automaticEntry)enterTable();
  net.onChange();
  if(!net.automaticEntry&&codeEntry) $('#table-code').focus();
}
$('#table-code').addEventListener('input', () => { $('#table-create').hidden = net.mode!=='internet'||!$('#table-code').value.trim()&&!$('#table-code').required; $('#table-submit').textContent = $('#table-code').value.trim() || $('#table-code').required ? 'JOIN ROOM' : net.mode === 'lan' ? 'JOIN WI-FI PARTY' : 'CREATE ROOM'; });
$('#table-create').addEventListener('click',()=>{if(net.connecting)return;$('#table-code').value='';$('#table-code').required=false;enterTable()});
$('#table-rules').addEventListener('click', showRulebook);
$('#lan-help').addEventListener('click', () => {
  const dialog = document.createElement('dialog'); dialog.id = 'install-help';
  const title = document.createElement('h2'); title.textContent = 'HOST A LAN TABLE'; dialog.append(title);
  const detail = document.createElement('p'); detail.textContent = 'On one computer connected to the same Wi-Fi, download BONES and open Start BONES LAN (Mac or Windows). Keep that window open. Internet is not needed once the local host is running. Guest Wi-Fi isolation or a firewall can block connections; browsers cannot discover every nearby computer. On each phone, open bones.local:10000/Bones/. If that name does not open, use the fallback IP address printed in the host window instead.'; dialog.append(detail);
  const link = document.createElement('a'); link.href = 'https://github.com/Strategamma/Bones#lan-tables-on-the-same-wi-fi'; link.textContent = 'HOST SETUP GUIDE'; link.target = '_blank'; link.rel = 'noopener'; dialog.append(link);
  const close = document.createElement('button'); close.textContent = 'GOT IT'; close.onclick = () => dialog.close(); dialog.append(close);
  dialog.addEventListener('close', () => dialog.remove()); document.body.append(dialog); decorateDialog(dialog,'table-lan');dialog.showModal();
});
$('#table-change-server').addEventListener('click', () => { $('#address-label').hidden = false; $('#table-change-server').hidden = true; $('#table-address').focus(); });
$('#table-back').addEventListener('click', leaveTable);
$('#table-arcade').addEventListener('click',returnToArcade);
$('#table-resume').addEventListener('click', () => {
  const saved = lastSeat();
  if (!saved || saved.mode !== net.mode) return;
  net.url = saved.url; net.code = saved.code; net.token = saved.token; net.error = '';
  connect();
});
$('#table-form').addEventListener('submit', event => { event.preventDefault(); enterTable(); });
function enterTable() {
  if (net.connecting) return;
  try {
    const mode = net.mode, name = $('#table-name').value.trim(), code = $('#table-code').value.trim().toUpperCase();
    if($('#table-code').required&&!code){$('#table-error').textContent='Enter your friend’s room code, or create your own room.';$('#table-code').focus();return;}
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
    if (command.type !== 'resume' && !command.token) net.token = '';
    connect(command);
  } catch (error) { shell.hidden=false;net.automaticEntry=false;$('#table-error').textContent = error.message;net.onChange(); }
}
function socketUrl(url) { const u = new URL(url); u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:'; u.pathname = '/ws'; u.search = ''; u.hash = ''; return u.href; }
function connect(first) {
  clearTimeout(retryTimer);
  if (net.socket) { net.manualClose = true; net.socket.close(); }
  net.manualClose = false;
  const socket = new WebSocket(socketUrl(net.url));
  let heartbeat, acceptedError='';
  net.socket = socket; net.connected = false; net.connecting = true;
  setupBusy(true);
  $('#table-error').textContent = net.mode === 'internet' ? 'Opening your online table… The host may need a moment to wake up.' : 'Connecting to your Wi-Fi table…';
  const timeout = setTimeout(() => { if (net.socket === socket && net.connecting) socket.close(); }, connectionTimeout(net.mode));
  net.onChange();
  socket.onopen = () => {
    if (net.socket !== socket) return;
    net.connected = true; net.error = '';
    socket.send(JSON.stringify({ type: 'hello' }));
    heartbeat = setInterval(() => { if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'ping' })); }, 120000);
    net.onChange();
  };
  socket.onmessage = event => {
    if (net.socket !== socket) return;
    let message;
    try { message = JSON.parse(event.data); } catch { return; }
    if (message.type === 'hello') {
      net.advertisedFeatures = message.features;
      net.lanUrl = message.mode === 'lan' ? message.lanUrl : '';
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
      finishConnection(); net.retry = 0;
      if (roomDialog.open) roomDialog.close();
      net.code = message.code; net.token = message.token; net.syncSavedName=true;
      const query = new URLSearchParams(location.search);
      if (query.has('code')) { query.set('code', net.code); query.delete('auto'); history.replaceState(history.state,'',location.pathname+'?'+query+location.hash); }
      save('skull-last', JSON.stringify({ mode: net.mode, url: net.url, code: net.code, token: net.token }));
      save('skull-auto-resume', 'yes');
      shell.hidden = true;
    } else if (message.type === 'state') { net.state = message.state;if(peekDialog?.open&&(!['place','add','bid','paused'].includes(message.state.stage)||peekKey!==JSON.stringify([message.state.code,message.state.round,message.state.stack])))peekDialog.close(); net.features = tableCapabilities(message.state,net.advertisedFeatures); net.draft = Math.max(1, message.state.bid + 1); net.pendingAction = false; net.error = ''; if(net.syncSavedName){net.syncSavedName=false;const saved=stored('skull-name').trim().slice(0,32);if(saved&&saved!==message.state.seats[message.state.seat]?.name)sendAction({type:'rename',name:saved});} }
    else if (message.type === 'kicked') {
      const mode = net.mode;
      clear('skull-last'); leaveTable(true); openTable(mode, stored('skull-name'), '', false);
      $('#table-error').textContent = 'The host removed you from this table.';
      return;
    }
    else if (message.type === 'error') {
      acceptedError=connectionMessage(message.message);
      finishConnection();
      net.pendingAction = false;
      net.error = message.message;
      const expiredResume = (!first || first.type === 'resume') && ['Saved table not found.', 'Invalid seat token.'].includes(message.message);
      if (!net.state || expiredResume) {
        net.state = null;
        const address = net.url;
        const expiredSeat = (!first || first.type === 'resume') && ['Saved table not found.', 'Invalid seat token.'].includes(message.message);
        const joinCode = expiredSeat && message.message === 'Invalid seat token.' ? net.code : '';
        if (expiredSeat) { clear('skull-last'); clear('skull-auto-resume'); net.token = ''; net.code = ''; }
        openTable(net.mode, stored('skull-name'), expiredSeat ? joinCode : net.code, false);
        $('#table-address').value = address;
      }
      $('#table-error').textContent = connectionMessage(message.message);
      if (roomDialog.open) renderRooms();
    }
    net.onChange();
  };
  socket.onclose = event => {
    clearInterval(heartbeat);
    clearTimeout(timeout);
    if (net.socket !== socket) return;
    finishConnection();
    net.connected = false;
    net.pendingAction = false;
    if (net.manualClose) return;
    if (event.code === 4001) {
      const mode = net.mode; leaveTable(true); openTable(mode, stored('skull-name'), '', false);
      $('#table-error').textContent = 'Your seat is open in another tab. Close that tab before resuming here.'; return;
    }
    if (event.code === 4003) {
      const mode = net.mode;
      clear('skull-last'); leaveTable(true); openTable(mode, stored('skull-name'), '', false);
      $('#table-error').textContent = 'The host removed you from this table.';
      return;
    }
    if (net.token) {
      net.error='Connection lost. Reconnecting…';
      retryTimer = setTimeout(() => { if (net.socket === socket && !net.connected && !net.manualClose) connect(); }, Math.min(12000, 800 * 2 ** Math.min(net.retry++, 4)));
    } else {
      net.error='';shell.hidden=false;$('#connection-options').open=true;
      $('#table-error').textContent=acceptedError||(net.mode==='lan'?'Host unreachable. Check the host is running, use its printed Wi-Fi address, and avoid isolated guest Wi-Fi.':'Server unreachable. Check your internet connection and server address, then try again.');
    }
    net.onChange();
  };
  function finishConnection() {
    clearTimeout(timeout); net.connecting = false;
    setupBusy(false);
  }
};
export function resumeLast() {
  if (stored('skull-auto-resume') !== 'yes') return;
  const saved = lastSeat();
  if (!saved?.url || !saved?.token || !saved?.code) return;
  net.mode = saved.mode; net.url = saved.url; net.code = saved.code; net.token = saved.token;
  connect();
}
export function sendAction(action) {
  if (!net.connected || net.connecting || net.pendingAction || net.socket?.readyState !== WebSocket.OPEN) return false;
  net.pendingAction = true;
  net.socket.send(JSON.stringify({ type: 'action', action }));
  net.onChange();
  return true;
}
export function leaveTable(confirmed=false) {
  if(confirmed!==true&&net.state&&!['lobby','win'].includes(net.state.stage)){
    messageDialog({title:'LEAVE THE TABLE?',detail:'Your seat stays reserved. The game may pause until you return or the host removes your seat.',asset:'nav-home',actions:[{label:'STAY & PLAY',primary:true},{label:'GO HOME',run:()=>leaveTable(true)}]});return;
  }
  if (hostDialog.open) hostDialog.close();
  if (roomDialog.open) roomDialog.close();
  if (nameDialog.open) nameDialog.close();
  net.manualClose = true;
  clearTimeout(retryTimer); net.connecting = false;
  setupBusy(false);
  net.socket?.close(); net.socket = null; net.state = null; net.mode = null; net.token = ''; net.code = ''; net.connected = false; net.pendingAction = false; net.error = ''; net.notice = ''; net.localStage = '';
  clear('skull-auto-resume'); net.nextRoom = null; shell.hidden = true; net.onChange();
  const route=new URLSearchParams(location.search);
  for(const key of ['table','code','server','auto'])route.delete(key);
  history.replaceState(history.state,'',location.pathname+(route.size?'?'+route:'')+location.hash);
}
export function returnToArcade() {
  const go=()=>{leaveTable(true);location.assign(ARCADE_URL)};
  if(net.state&&!['lobby','win'].includes(net.state.stage)){
    messageDialog({title:'BACK TO THE ARCADE?',detail:'Your seat stays saved. The table may pause until you return or your friends continue.',asset:'nav-home',actions:[{label:'STAY & PLAY',primary:true},{label:'DECADENCE ARCADE',run:go}]});
  } else go();
}
async function shareInvite() {
  const invite=tableInvite({origin:location.origin,path:location.pathname,mode:net.mode,server:net.url,code:net.code,lanUrl:net.lanUrl,isLocal:localServer()});
  const dialog=document.createElement('dialog');dialog.className='arcade-dialog';dialog.setAttribute('aria-label','Invite friends');
  const title=document.createElement('h2');title.textContent='YOUR PARTY TICKET';const text=document.createElement('p');text.textContent=`Room ${net.code} · ${net.state.seats.length}/6 players`;
  const input=document.createElement('input');input.readOnly=true;input.value=invite.href;input.setAttribute('aria-label','Invite link');input.onclick=()=>input.select();
  const status=document.createElement('p');status.setAttribute('role','status');
  status.textContent=net.mode==='internet'?'Internet invite · friends can join from any network.':'Same local network · keep the host computer running.';
  if(net.mode==='lan'&&['localhost','127.0.0.1'].includes(invite.hostname))status.textContent='For phones, open the Wi-Fi address printed by the host first. Localhost links only open on this computer.';
  const copy=document.createElement('button');copy.className='dialog-primary';copy.textContent='COPY INVITE';copy.onclick=async()=>{try{await navigator.clipboard.writeText(input.value);status.textContent='INVITE COPIED · Send it to your friends';}catch{input.focus();input.select();status.textContent='Select and copy the link above.'}};
  dialog.append(title,text,input,copy,status);
  if(navigator.share){const share=document.createElement('button');share.textContent='SHARE INVITE';share.onclick=async()=>{try{await navigator.share({title:'Join my Bones table',url:invite.href})}catch(error){if(error.name!=='AbortError')status.textContent='Sharing unavailable. Copy the invite instead.'}};dialog.append(share)}
  const close=document.createElement('button');close.textContent='BACK TO TABLE';close.onclick=()=>dialog.close();dialog.append(close);
  decorateDialog(dialog,net.mode==='lan'?'table-lan':'table-online');dialog.addEventListener('close',()=>dialog.remove());document.body.append(dialog);dialog.showModal();

}
let selectedReveal = null, selectionKey = '';
export function drawTable(ui) {
  const { header, panel, txt, button, disc, cardChoice, art, H, colors } = ui;
  const controls=()=>{const entries=[[soundEnabled()?'SOUND':'MUTED',()=>{toggleSound();net.onChange()},soundEnabled()?'sound':'mute'],['RULES',()=>showRulebook(net.features),'help'],...(net.features?.pause && net.state && !['lobby','win','paused'].includes(net.state.stage) && net.state.seats[net.state.seat]?.discs>0 ? [['PAUSE TABLE',()=>sendAction({type:'pause'}),'help']] : []),...(net.mode==='lan'?[['ROOMS',showRooms,'rooms']]:[]),...(net.state?.host===net.state?.seat?[['HOST',showHostControls,'host']]:[]),['BONES HOME',leaveTable,'home'],['DECADENCE ARCADE',returnToArcade,'home']];ui.navigation(entries);};
  const s = ui.displayState || net.state;
  if (!s) {
    header(net.mode === 'lan' ? 'LAN TABLE' : 'INTERNET TABLE', net.connected ? 'Connecting to the table…' : 'Choose a name to create or join.');
    controls();
    txt('✦', 195, H * .40, 90, '#f7f2e9', 900);
    if (net.error) txt(net.error.slice(0, 40), 195, H * .65, 13, '#ffafb8', 700);
    button('BACK', 30, H - 110, 330, 56, leaveTable, 'dark');
    return;
  }
  const me = s.seat, mine = s.seats[me], turn = s.stage === 'place' && net.features?.simultaneousPlacement ? !s.stack.length && mine.discs > 0 : s.turn === me, host = s.host === me;
  const titles={lobby:`${s.mode.toUpperCase()} TABLE`,place:'PLACE A CARD',add:'PLAY OR BID',bid:'THE BIDDING',reveal:'THE REVEAL',loss:'SKULL REVEALED','choose-lead':'CHOOSE THE LEAD',result:'ROUND COMPLETE',win:'THE CHAMPION',paused:'TABLE PAUSED'};
  const turnName=s.stage==='place' ? `${s.seats.filter(p=>p.stack>0).length}/${s.seats.filter(p=>p.discs>0).length} cards placed` : turn?'YOUR MOVE':`${s.seats[s.turn]?.name || 'Player'}'s turn`;
  const subtitles={lobby:`${s.seats.length}/6 players · ${6-s.seats.length} seats free`,reveal:s.challenger===me?'Find flowers. Avoid the skull.':`${s.seats[s.challenger]?.name} is revealing`,loss:s.challenger===me?'You lose one card':`${s.seats[s.challenger]?.name} loses one card`,result:s.resultKind==='flower'?'Flower challenge won':'One card discarded',win:s.winner===me?'You took the crown':`${s.seats[s.winner]?.name} took the crown`,paused:'Reconnect or vote to continue'};
  if(s.stage!=='win'&&s.stage!=='lobby')header(titles[s.stage]||'BONES TABLE',net.pendingAction?'SENDING YOUR MOVE…':s.stage==='lobby'?subtitles.lobby:`Round ${s.round} · ${subtitles[s.stage]||turnName}`);
  controls();
  if(s.stage==='win'){
    ui.navigation([],leaveTable);
    txt('VICTORY',195,84,28,'#f7f2e9',900,'center',330);
    const heroH=190,heroY=122;
    const t=Math.min(1,ui.phaseAge/.7),zoom=ui.reducedMotion?1:1+2.70158*(t-1)**3+1.70158*(t-1)**2;
    art('victory-arcade',195-155*zoom,heroY,310*zoom,heroH*zoom);
    const nameY=heroY+heroH+30;
    txt(s.winner===me?'YOU WON!':'THE WINNER',195,nameY,30,'#f7f2e9',900,'center',330);
    txt(s.seats[s.winner].name,195,nameY+40,24,'#ffd981',900,'center',330);
    txt(s.resultKind==='flower'?'Two points. A beautiful bluff.':'Last player standing!',195,nameY+76,14,'#91d9c7',800,'center',330);
    const voted=s.seats.filter(p=>p.bot||p.rematchReady).length;
    const votes=net.features?.rematchVotes;
    const already=!!mine.rematchReady;
    const actionY=H-164;
    panel(26,actionY-5,338,64,'#443251','#91d9c7',18);ui.turnGlow(26,actionY-5,338,68,'#91d9c7',true);
    button('REMATCH',30,actionY,330,54,votes?already?null:()=>sendAction({type:host?'prepare-rematch':'rematch-ready'}):host?()=>sendAction({type:'rematch'}):null,already?'dark':'pink');
    txt(votes?`${voted}/${s.seats.length} players ready${already?' · You’re in!':''}`:host?'Play another match together':'Waiting for the host',195,actionY+80,14,'#91d9c7',800,'center',330);
    if(host&&net.features?.returnLobby)button('MANAGE SEATS',90,H-56,210,44,()=>sendAction({type:'lobby'}),'dark');
    return;
  }
  const crowded = s.stage !== 'lobby' && H < 760;
  const tight=s.seats.length>=5&&H<640;
  const top=142,seatHeight=['result','paused'].includes(s.stage)?112:104,gap=seatHeight+16;
  const seatSlots=s.stage==='lobby'?6:s.seats.length;
  const stageY=top+Math.ceil(seatSlots/2)*gap+16;
  if(s.stage!=='reveal')s.seats.forEach((p,i)=>{
    const x=s.stage==='lobby'&&seatSlots===1?111:20+i%2*183,y=top+Math.floor(i/2)*gap;
    const active=(s.stage==='place'?i===me&&p.stack===0&&p.discs>0:i===s.turn)&&['place','add','bid'].includes(s.stage);
    panel(x,y,168,seatHeight,p.wins?'#655035':i===me?'#263740':'#302a40',active||p.wins?'#ffd981':i===me?colors[i]:'#665771',16);
    ui.seatAvatar(i,x+12,y+12,24);
    txt(p.name,x+42,y+24,14,'#f7f2e9',900,'left',s.stage==='lobby'&&host&&i!==me?86:116);
    if(p.wins){panel(x+57,y+41,99,20,'#ffd981','#ffd981',8);txt(`★ ${p.wins} POINT${p.wins===1?'':'S'}`,x+106.5,y+51,10,'#241b38',900,'center',91);}
    txt(i===me?'YOU':i===s.host?'HOST':p.bot?'BOT':'',x+12,y+50,10,colors[i],900,'left');
    if(s.stage==='lobby'){
      const status=!p.connected?'OFFLINE · RESERVED':i===s.host?'HOSTING':p.bot||p.ready?'READY':!net.features?.readiness?'CONNECTED':'NOT READY';
      txt(status,x+12,y+86,12,!p.connected?'#ffb6cb':p.bot||p.ready?'#91d9c7':'#d1c8d9',800,'left',140);
      if(p.sessionWins)ui.flowerBadge(x+128,y+85,p.sessionWins);
      if(i===me)ui.spots.push({x,y,w:124,h:seatHeight,label:'Change your name',fn:()=>editName(p.name)});
    }else{
      if(p.stack){for(let n=0;n<p.stack;n++)ui.cardRect(x+12+n*8,y+70,23,26,'back',null,colors[i]);const peek=i===me&&['place','add','bid','paused'].includes(s.stage);txt(peek?'PEEK':p.stack,x+65,y+85,peek?9:13,peek?'#91d9c7':'#f7f2e9',900,'left');if(peek)ui.spots.push({x:x+6,y:y+64,w:100,h:44,label:'Peek your played cards',fn:peekOwnCards});}
      else txt('—',x+22,y+85,18,'#897c9b',700);
      ui.cardCount(x+114,y+85,p.discs,'#d1c8d9');
      const status=!p.connected?'OFFLINE':p.discs===0?'OUT':['add','bid','reveal'].includes(s.stage)&&s.passed[i]?'PASSED':['add','bid','reveal'].includes(s.stage)&&p.bid?`BID ${p.bid}`:active?'TURN':'';
      if(status&&p.wins&&status!=='TURN'){txt(status,x+156,y+66,9,active?'#ffd981':'#f7f2e9',800,'right',88);}else if(status&&!p.wins){panel(x+57,y+41,66,20,active?'#ffd981':'#44364f',active?'#ffd981':'#665771',8);txt(status,x+90,y+51,10,active?'#241b38':'#f7f2e9',900,'center',60);}
    }
    if(s.stage==='lobby'&&host&&i!==me){ui.seatControl(x+145,y+24,'×',()=>messageDialog({title:'REMOVE PLAYER?',detail:`Remove ${p.name} from this table? They will need to join again.`,asset:'nav-host',actions:[{label:'KEEP PLAYER',primary:true},{label:'REMOVE PLAYER',run:()=>{const current=net.state;const target=p.id?current?.seats.findIndex(seat=>seat.id===p.id):i;if(target<0||!current||current.code!==s.code||(!p.id&&current.seats[target]?.name!==p.name)){net.notice='That player has left. Select a seat again.';net.onChange();return;}sendAction({type:'kick',target,playerId:p.id});}}]}),`Remove ${p.name}`);}
    if(i===ui.stackSeat&&ui.stackAge>=0&&ui.stackAge<.5&&!ui.reducedMotion){const t=ui.stackAge/.5,e=1-(1-t)**3;ui.cardRect(195+(x+12-195)*e,stageY+(y+58-stageY)*e,23,30,'back',null,colors[i]);}
    if(i===ui.pointSeat&&ui.pointAge<.85&&!ui.reducedMotion){const t=Math.min(1,ui.pointAge/.85);art('point-badge',195+(x+137-195)*t-10,H*.6+(y+43-H*.6)*t-Math.sin(t*Math.PI)*40-10,20,20);}
  });
  if(s.stage==='lobby')for(let i=s.seats.length;i<6;i++){
    const x=20+i%2*183,y=top+Math.floor(i/2)*gap;
    const fill=host&&net.features?.bots?()=>sendAction({type:'add-bot'}):null;
    ui.emptySeat(x,y,168,seatHeight,fill,`Add bot to seat ${i+1}`);

  }
  if(!['lobby','reveal'].includes(s.stage)){ui.cardCount(232,27,'','#bfb1ce');txt('CARDS LEFT',259,28,10,'#bfb1ce',700,'left',112);}
  if (s.stage === 'lobby') {
    const connected = s.seats.filter(p => p.connected).length;
    const waiting = net.features?.readiness ? s.seats.filter((p,i)=>i!==s.host && !p.bot && !p.ready).length : 0;
    const ready = connected >= 3 && connected === s.seats.length && !waiting;
    txt(titles.lobby,26,86,s.mode==='lan'?20:16,'#f7f2e9',900,'left',170);
    txt(s.code,364,86,20,'#91d9c7',900,'right',150);
    txt(net.pendingAction?'UPDATING TABLE…':subtitles.lobby,195,116,12,'#c9f5e8',700,'center',340);
    const actionY=Math.max(top+Math.ceil(seatSlots/2)*gap+140,H-88),inviteY=actionY-66;
    txt(ready?'Everyone ready · host can start':s.seats.length>connected?`${s.seats.length-connected} offline · reconnect or remove`:connected<3?`Need ${3-connected} more players`:`${waiting} guests still getting ready`,195,inviteY-23,13,ready?'#91d9c7':'#e4dbea',800,'center',336);
    button('SHARE INVITE',30,inviteY,330,52,s.seats.length<6?shareInvite:null,'dark');
    if (host) button(ready?'START GAME':'WAITING FOR PLAYERS', 30, actionY, 330, 56, ready?() => sendAction({ type: 'start' }):null, ready?'gold':'dark');
    else if(net.features?.readiness)button(mine.ready?'READY ✓ · TAP TO UNREADY':'I’M READY',30,actionY,330,56,()=>sendAction({type:'ready',ready:!mine.ready}),mine.ready?'dark':'gold');
    else {panel(30,actionY,330,56,'#3a304e','#6d6081',16);txt('HOST STARTS WHEN EVERYONE IS HERE',195,actionY+28,14,'#d1c8d9',800,'center',304);}
    if (net.error || net.notice) txt((net.error || net.notice).slice(0, 45), 195, actionY + 75, 12, net.error ? '#ffadb8' : '#c8f5d9', 700);
  } else if (s.stage === 'paused') {
    txt('TABLE PAUSED', 195, H - 259, 22, '#f7f2e9', 900);
    txt('Everyone still here can vote to continue.', 195, H - 220, 13, '#e4dbea', 700);
    const out=mine.discs===0;
    txt(`${s.seats.filter(p=>!p.connected).length} offline · ${s.votes.filter(Boolean).length} votes recorded`,195,H-192,13,'#91d9c7',800);
    button(out?'YOU ARE OUT · WATCH THE TABLE':s.votes?.[me]?'VOTE RECORDED':'CONTINUE TOGETHER',30,H-165,330,64,out||s.votes?.[me]?null:()=>sendAction({type:'continue'}),out||s.votes?.[me]?'dark':'gold');
  } else if (s.stage === 'place' || s.stage === 'add') {
    const handTop=stageY-14;
    const cardH=H<900?104:116,cardW=cardH*.72,handY=handTop+40;
    art('hand-tray',27,handTop+22,336,cardH+38);
    txt(!s.hand.length?'ALL YOUR CARDS ARE DOWN':turn?'YOUR MOVE · CHOOSE A CARD':s.stage==='place'?(s.stack.length?'CARD LOCKED · WAITING FOR FRIENDS':`WAITING FOR ${s.seats[s.turn]?.name.toUpperCase()}`):`WAITING FOR ${s.seats[s.turn]?.name.toUpperCase()}`,195,handTop+5,14,turn?'#ffb6cb':'#d1c8d9',900,'center',336);
    s.hand.forEach((type,index)=>{const x=195-(s.hand.length*cardW+(s.hand.length-1)*8)/2+index*(cardW+8);ui.cardRect(x,handY,cardW,cardH,type,turn?()=>sendAction({type:'place',index}):null,colors[me],`Place ${type} card ${index+1}`);});
    if (!s.hand.length) txt('Your hand is empty. Choose a bid.',195,handY+35,13,'#f7f2e9',800);
    if (s.stage==='add' && turn) showBids({x:27,y:handTop+cardH+62,w:336,min:1,max:s.total,height:tight?84:96,bottomAlign:true});
    else txt(s.stage==='place'?(net.features?.simultaneousPlacement?'Everyone plays one card. Starter goes next.':'Play one card when your turn cue appears.'):'Cards you add go on top of your stack.',195,Math.min(H-63,handTop+cardH+76),12,'#d1c8d9',700,'center',336);
  } else if (s.stage === 'bid') {
    const spotH=H<700?64:108;
    art('bid-spotlight',27,stageY,336,spotH);
    const pulse=ui.reducedMotion?0:Math.max(0,1-ui.bidAge/.7)*7;
    txt(`${s.bid} FLOWER${s.bid===1?'':'S'}`,195,stageY+spotH*.47,30+pulse,'#241b38',900);
    txt(`${s.seats[s.leader]?.name.toUpperCase()} BIDS ${s.bid} · LOCKED`,195,stageY+spotH*.78,13,'#46334f',800,'center',300);
    if(turn){
      const bids=showBids({x:27,y:stageY+spotH+12,w:336,min:s.bid+1,max:s.total,height:tight?84:96});
      const passH=Math.max(44,44/bids.scale),passY=Math.min(H-38-passH,bids.bottom+10);
      button('PASS · I’M OUT OF THIS BID',30,passY,330,passH,()=>sendAction({type:'pass'}),'dark');
    }else txt(s.passed[me]?'You passed. Watch the bidding.':`Clockwise · ${s.seats[s.turn]?.name} raises or passes`,195,stageY+spotH+35,13,'#d1c8d9',800,'center',336);
  } else if (s.stage === 'reveal') {
    const key=`${s.code}:${s.round}:${s.flips.length}:${s.turn}`;
    if(key!==selectionKey){selectedReveal=null;selectionKey=key;}
    const ownLeft=s.seats[s.challenger].stack-s.flips.filter(f=>f.owner===s.challenger).length;
    const startY=150,rows=Math.ceil(s.seats.length/2),rowH=Math.min(184,(H-startY-116)/rows);

    s.seats.forEach((p,i)=>{
      const x=20+i%2*183,y=startY+Math.floor(i/2)*rowH;
      panel(x,y,168,rowH-12,p.wins?'#655035':i===me?'#263740':'#302a40',p.wins||i===s.challenger?'#ffd981':i===me?colors[i]:'#665771',16);
      ui.seatAvatar(i,x+10,y+10,22);

      txt(i===me?`${p.name} · YOU`:p.name,x+40,y+23,14,'#f7f2e9',900,'left',116);
      if(p.wins)txt(`★ ${p.wins} POINT${p.wins===1?'':'S'}`,x+12,y+47,10,'#ffd981',900,'left',100);
      if(i===s.challenger&&!p.wins)txt('BID WON',x+156,y+47,9,'#ffd981',800,'right',72);
      if(!p.stack)txt('NO CARDS PLAYED',x+84,y+rowH*.6,10,'#b5a5c9',700);
    });
    showTableCards({automaticOwn:!!net.features?.automaticReveal,state:s,selected:selectedReveal,onSelect:choice=>{selectedReveal=choice;net.onChange()},startY,rowH,flipAge:ui.flipAge,reducedMotion:ui.reducedMotion,busy:ui.flipAge<1.25||!s.flips.length&&ui.phaseAge<1.5,announcing:!s.flips.length&&ui.phaseAge<1.5});
    const footer=startY+rows*rowH;
    txt(`✿ ${s.remaining} TO FIND`,195,footer+12,16,'#f7f2e9',900,'center',340);
    txt(ui.displayState?'OPENING THE LAST CARD…':turn?selectedReveal?`${s.seats[selectedReveal.target].name} · Card ${selectedReveal.index+1}`:ownLeft?net.features?.automaticReveal?'YOUR CARDS ARE OPENING…':'YOUR MOVE · Choose one of your cards':'Choose a hidden card': 'Watch the highlighted cards open',195,footer+37,14,turn?'#ffd981':'#91d9c7',800,'center',340);
    if(turn&&!(net.features?.automaticReveal&&ownLeft))showRevealConfirm({x:30,y:footer+55,w:330,h:48,choice:selectedReveal,announcing:!s.flips.length&&ui.phaseAge<1.5,disabled:net.pendingAction||!net.connected||ui.flipAge<1.25||!s.flips.length&&ui.phaseAge<1.5,onConfirm:()=>{if(!selectedReveal)return;const choice=selectedReveal;selectedReveal=null;sendAction({type:'flip',...choice})}});
  } else if (s.stage === 'loss') {
    const artH=Math.min(tight?72:H<760?100:138,H-stageY-220);
    art('skull-loss',95,stageY,200,artH);art('mascot-skull',35,stageY+12,48,48);
    txt(`${s.seats[s.challenger].name} found a skull`,195,stageY+artH+10,17,'#ffb6cb',900,'center',330);
    txt(net.features?.automaticReveal?'ONE RANDOM CARD WILL BE LOST':me===s.skullOwner?'YOUR SKULL · THROW ONE CARD AWAY':`${s.seats[s.skullOwner].name} chooses a card to throw away`,195,H-160,13,'#f7f2e9',800,'center',340);
    const w=54,h=74,y=H-137;
    if(net.features?.automaticReveal){txt('A RANDOM CARD WILL BE DISCARDED',195,y+40,15,'#ffb6cb',800,'center',340);return;}
    for(let index=0;index<s.lossCount;index++){const x=195-(s.lossCount*w+(s.lossCount-1)*12)/2+index*(w+12);ui.cardRect(x,y,w,h,'back',me===s.skullOwner?()=>sendAction({type:'discard',index}):null,colors[s.challenger],`Discard hidden card ${index+1}`);}
  } else if (s.stage === 'choose-lead') {
    txt(`${s.seats[s.challenger].name} chooses the next lead`, 195, H - 283, 15, '#91d9c7', 800);
    s.seats.map((p,target)=>({...p,target})).filter(p=>p.discs).forEach((p,i)=>button(p.name,25+i%2*174,H-248+Math.floor(i/2)*57,165,49,me===s.challenger?()=>sendAction({type:'lead',target:p.target}):null,me===s.challenger?'gold':'dark'));
  } else if (s.stage === 'result') {
    const resultY=Math.max(stageY+12,(stageY+H-110)/2-40);
    art(s.resultKind==='flower'?'point-badge':'card-discard',40,resultY,70,70);
    txt(s.resultKind==='flower'?'POINT WON':'ONE CARD LOST',130,resultY+22,19,s.resultKind==='flower'?'#ffd981':'#ffb6cb',900,'left',220);
    txt(s.challenger===me?'You':s.seats[s.challenger].name,130,resultY+48,16,'#f7f2e9',800,'left',220);
    button(host ? 'NEXT ROUND' : 'WAITING FOR HOST',30,H-92,330,60,host?()=>sendAction({type:'next'}):null,host?'gold':'dark');

  }


}
