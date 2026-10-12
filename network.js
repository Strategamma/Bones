import { soundEnabled, toggleSound } from './audio.js';
import { showRulebook } from './rulebook.js';
import { defaultTableAddress, localTableUrl } from './entry.js';

export const net = { mode: null, state: null, socket: null, url: '', token: '', code: '', error: '', connected: false, pendingAction: false, draft: 1, onChange: () => {}, retry: 0, manualClose: false };
const shell = document.createElement('div');
shell.id = 'table-setup';
shell.hidden = true;
shell.innerHTML = `<form id="table-form" aria-labelledby="table-title">
  <img class="table-brand" src="${import.meta.env.BASE_URL}assets/bones-platform-logo.png" alt="BONES">
  <div class="setup-mode"><img id="table-mode-art" alt=""><div><div class="table-kicker">PICK YOUR PEOPLE</div><h2 id="table-title">Join a table</h2></div></div>
  <p id="table-detail"></p>
  <div class="table-meta"><span>3–6 players</span><span>One phone each</span></div>
  <label>Your name<input id="table-name" maxlength="32" autocomplete="nickname" placeholder="What should we call you?" required></label>
  <label id="address-label"><span id="address-title">Server address</span><input id="table-address" type="text" inputmode="url" required><span id="lan-address-tip" hidden>If bones.local won't open, use the fallback IP shown in the host window. This address is saved for next time.</span></label>
  <label>Table code <span class="field-optional">optional</span><input id="table-code" maxlength="6" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Enter code to join" aria-describedby="table-code-hint"></label>
  <p id="table-code-hint">Leave blank to start a new table.</p><p id="table-error" role="alert"></p>
  <button type="submit" id="table-submit">CREATE TABLE</button><button type="button" id="table-resume" hidden>RESUME PREVIOUS TABLE</button><button type="button" id="table-back">BACK TO TABLES</button>
  <div class="table-help-links"><button type="button" id="table-rules">HOW TO PLAY</button><button type="button" id="lan-help" hidden>HOST ON WI-FI</button><button type="button" id="table-change-server" hidden>SERVER ADDRESS</button></div>
</form>`;
document.body.append(shell);
const hostDialog = document.createElement('dialog');
hostDialog.id = 'host-dialog';
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
    if (state.stage === 'lobby') {
      const remove = document.createElement('button'); remove.textContent = 'REMOVE';
      remove.onclick = () => { remove.textContent = 'CONFIRM REMOVE'; remove.onclick = () => { sendAction({ type: 'kick', target: seat }); hostDialog.close(); }; }; row.append(remove);
    }
    hostDialog.append(row);
  }
  const close = document.createElement('button'); close.textContent = 'DONE'; close.onclick = () => hostDialog.close(); hostDialog.append(close);
  hostDialog.showModal();
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
export function openTable(mode, name, code = '') {
  net.mode = mode; net.state = null; net.error = ''; net.localStage = ''; net.manualClose = false;
  $('#table-title').textContent = mode === 'lan' ? 'LAN TABLE' : 'INTERNET TABLE';
  $('#table-mode-art').src = `${import.meta.env.BASE_URL}assets/table-${mode === 'lan' ? 'lan' : 'online'}.svg`;
  $('#lan-help').hidden = mode !== 'lan';
  $('#table-detail').textContent = mode === 'lan' ? 'Same Wi-Fi, one computer hosting. Gather around and keep your hand secret.' : 'Different places, one table. Bring your friends and your best bluff.';
  $('#table-name').value = name || stored('skull-name');
  $('#table-address').value = new URLSearchParams(location.search).get('server') || stored(`skull-${mode}-url`) || defaultTableAddress(mode, location.hostname, location.origin, localServer());
  $('#table-code').value = code;
  $('#address-title').textContent = mode === 'lan' ? 'LAN server address' : 'Internet server address';
  $('#table-address').placeholder = mode === 'lan' ? 'http://bones.local:10000' : 'https://your-game.onrender.com';
  const publicLan = mode === 'lan' && !localServer();
  $('#address-label').hidden = !publicLan && !!$('#table-address').value;
  $('#lan-address-tip').hidden = !publicLan;
  $('#table-change-server').hidden = !$('#address-label').hidden;
  $('#table-submit').textContent = code ? 'JOIN TABLE' : 'CREATE TABLE';
  $('#table-resume').hidden = lastSeat()?.mode !== mode;
  $('#table-error').textContent = '';
  shell.hidden = false;
  $('#table-form').scrollTop = 0;
  net.onChange();
}
$('#table-code').addEventListener('input', () => { $('#table-submit').textContent = $('#table-code').value.trim() ? 'JOIN TABLE' : 'CREATE TABLE'; });
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
$('#table-form').addEventListener('submit', event => {
  event.preventDefault();
  try {
    const mode = net.mode, name = $('#table-name').value.trim(), code = $('#table-code').value.trim().toUpperCase();
    if (!name) throw Error('Enter your name.');
    const url = normalizeUrl($('#table-address').value, mode);
    save('skull-name', name); save(`skull-${mode}-url`, url);
    if (mode === 'lan' && location.protocol === 'https:' && url !== location.origin) {
      location.assign(localTableUrl(url, name, code));
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
    } else if (message.type === 'state') { net.state = message.state; net.draft = Math.max(1, message.state.bid + 1); net.pendingAction = false; net.error = ''; }
    else if (message.type === 'kicked') {
      const mode = net.mode;
      leaveTable(); openTable(mode, stored('skull-name'));
      $('#table-error').textContent = 'The host removed you from this table.';
      return;
    }
    else if (message.type === 'error') {
      net.pendingAction = false;
      net.error = message.message;
      if (!net.state) {
        const address = net.url;
        const expiredSeat = !first && ['Saved table not found.', 'Invalid seat token.'].includes(message.message);
        if (expiredSeat) { clear('skull-last'); clear('skull-auto-resume'); net.token = ''; net.code = ''; }
        openTable(net.mode, stored('skull-name'), expiredSeat ? '' : net.code);
        $('#table-address').value = address;
      }
      $('#table-error').textContent = message.message;
    }
    net.onChange();
  };
  socket.onclose = event => {
    clearInterval(heartbeat);
    if (net.socket !== socket) return;
    net.connected = false;
    net.pendingAction = false;
    if (net.manualClose) return;
    if (event.code === 4003) {
      const mode = net.mode;
      leaveTable(); openTable(mode, stored('skull-name'));
      $('#table-error').textContent = 'The host removed you from this table.';
      return;
    }
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
export function sendAction(action) {
  if (!net.connected || net.pendingAction || net.socket?.readyState !== WebSocket.OPEN) return false;
  net.pendingAction = true;
  net.socket.send(JSON.stringify({ type: 'action', action }));
  return true;
}
export function leaveTable() {
  if (hostDialog.open) hostDialog.close();
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
export function drawTable(ui) {
  const { header, panel, txt, button, disc, cardChoice, art, H, colors } = ui;
  const controls=()=>{button(soundEnabled()?'♪ ON':'♪ OFF',18,12,74,54,()=>{toggleSound();net.onChange()},'dark');button('?',96,12,54,54,showRulebook,'dark');if(net.state && net.state.host===net.state.seat && net.state.seats.length>1)button('⚙',267,12,54,54,showHostControls,'dark')};
  const s = net.state;
  if (!s) {
    header(net.mode === 'lan' ? 'LAN TABLE' : 'INTERNET TABLE', net.connected ? 'Connecting to the table…' : 'Choose a name to create or join.');
    controls();
    txt('✦', 195, H * .40, 90, '#f7f2e9', 900);
    if (net.error) txt(net.error.slice(0, 40), 195, H * .65, 13, '#ffafb8', 700);
    button('BACK', 30, H - 110, 330, 56, leaveTable, 'dark');
    return;
  }
  const me = s.seat, mine = s.seats[me], turn = s.turn === me, host = s.host === me;
  const titles={lobby:`${s.mode.toUpperCase()} TABLE`,place:'PLACE A DISC',add:'ADD OR BID',bid:'THE BIDDING',reveal:'THE REVEAL',loss:'SKULL REVEALED','choose-lead':'CHOOSE THE LEAD',result:'ROUND COMPLETE',win:'GAME OVER',paused:'TABLE PAUSED'};
  const turnName=turn?'Your turn':`${s.seats[s.turn]?.name || 'Player'}'s turn`;
  const subtitles={lobby:'Invite friends · 3–6 players',reveal:s.challenger===me?'Your bid. Your choice.':`${s.seats[s.challenger]?.name} is revealing`,loss:s.challenger===me?'You lose one disc':`${s.seats[s.challenger]?.name} loses one disc`,result:s.resultKind==='flower'?'Flower challenge won':'One disc discarded',win:s.winner===me?'You took the crown':`${s.seats[s.winner]?.name} took the crown`,paused:'Reconnect or vote to continue'};
  header(titles[s.stage]||'BONES TABLE',s.stage==='lobby'?subtitles.lobby:`Round ${s.round} · ${subtitles[s.stage]||turnName}`);
  controls();
  if(s.stage==='win'){
    const lift=ui.reducedMotion?0:Math.sin(ui.clock*2.5)*5;
    const zoom=ui.reducedMotion?1:Math.min(1,.75+ui.phaseAge*.7);
    art('winner-crown',195-109*zoom,H*.32+lift,218*zoom,150*zoom);
    txt(s.winner===me?'YOU WIN!':`${s.seats[s.winner].name.toUpperCase()} WINS!`,195,H*.59,30,'#f7f2e9',900,'center',340);
    txt(s.resultKind==='flower'?'TWO FLOWER CHALLENGES WON':'LAST PLAYER STANDING',195,H*.65,15,'#c9f5e8',900);
    button(host?'REMATCH':'WAITING FOR HOST',30,H-139,330,61,host?()=>sendAction({type:'rematch'}):null,host?'gold':'dark');
    button('×',326,12,54,54,leaveTable,'dark');
    return;
  }
  if (!net.connected) { panel(20, 115, 350, 58, '#69415a', '#f6a3aa'); txt('Reconnecting to your table…', 195, 144, 15, '#fff', 800); }
  const crowded = s.stage !== 'lobby' && s.seats.length >= 5 && H < 760;
  const tight=s.seats.length>=5&&H<640;
  const top = tight ? 140 : s.stage === 'lobby' && H < 700 ? 145 : crowded ? 145 : 160, gap = tight ? 50 : s.stage === 'lobby' ? (H < 700 ? 68 : H < 760 ? 74 : 84) : crowded ? 62 : H < 760 ? 76 : 99, seatHeight = tight ? 46 : s.stage === 'lobby' ? (H < 700 ? 62 : 70) : crowded ? 58 : H < 760 ? 70 : 82;
  const slide=ui.reducedMotion||H<760?0:Math.max(0,1-ui.phaseAge/.35)*8;
  const stageY = top + Math.floor((s.seats.length - 1) / 2) * gap + seatHeight + (crowded ? 12 : 19) + slide;
  s.seats.forEach((p, i) => {
    const x = s.stage === 'lobby' && s.seats.length === 1 ? 111 : 20 + i % 2 * 183, y = top + Math.floor(i / 2) * gap;
    panel(x, y, 168, seatHeight, i === s.turn ? '#463463' : '#302747', i === s.turn ? '#ffd981' : '#685783', 16, 'player-mat');
    ui.turnGlow(x,y,168,seatHeight,colors[i],i===s.turn&&['place','add','bid','reveal'].includes(s.stage));
    ui.tint(x+5,y+13,5,seatHeight-28,colors[i]);
    txt(p.name, x + 12, y + (tight ? 13 : crowded || s.stage==='lobby' ? 18 : 23), crowded ? 13 : 14, p.connected ? '#fff4d8' : '#9c92aa', 800, 'left', 104);
    if(p.wins){const pop=!ui.reducedMotion&&i===ui.pointSeat?Math.max(0,1-ui.pointAge/.7)*.28:0,size=(tight?22:crowded?26:30)*(1+pop);art('point-badge',x+151-size/2,y+3,size,size);}
    else txt('◇ ◇',x+151,y+(tight?13:crowded?18:22),tight?12:15,'#91d9c7',800,'right');
    txt(`${p.stack} placed · ${p.discs} discs`, x + 12, y + (tight ? 32 : crowded ? 42 : seatHeight - (s.stage==='lobby'?19:27)), crowded ? 11 : 12, '#d1c8d9', 600, 'left', 112);
    if (p.stack){const pop=!ui.reducedMotion&&i===ui.stackSeat?Math.max(0,1-ui.stackAge/.45)*.38:0;disc(x+145,y+seatHeight-(tight?11:crowded?15:19),(tight?9:crowded?12:14)*(1+pop),'back',colors[i]);}
  });
  if (s.stage === 'lobby') {
    const connected = s.seats.filter(p => p.connected).length;
    const ready = connected >= 3 && connected === s.seats.length;
    const lobbyY = Math.max(top + Math.ceil(s.seats.length / 2 - 1) * gap + seatHeight + (H < 700 ? 18 : 30), H * .44);
    if (s.seats.length === 1) txt('Your table is ready for friends', 195, lobbyY - 21, 15, '#91d9c7', 800);
    panel(28, lobbyY, 334, 86, '#4b335c', '#f3bc81', 20, 'menu-box');
    txt(`CODE  ${s.code}`, 195, lobbyY + 29, 25, '#f7f2e9', 900);
    txt(ready ? `${connected} players ready · ${s.mode === 'lan' ? 'same Wi‑Fi' : 'online'}` : `Need ${Math.max(0,3-connected)} more connected player${3-connected===1?'':'s'}`, 195, lobbyY + 63, 13, ready ? '#91d9c7' : '#e4dbea', 800);
    button('SHARE INVITE', 30, lobbyY + 101, 330, 52, shareInvite, 'pink');
    if (host && ready) button('START GAME', 30, lobbyY + 167, 330, 56, () => sendAction({ type: 'start' }), 'gold');
    else { panel(30, lobbyY + 167, 330, 56, '#3a304e', '#6d6081', 16); txt(host ? 'WAITING FOR PLAYERS' : 'WAITING FOR HOST', 195, lobbyY + 195, 16, '#d1c8d9', 800); }
    if (net.error || net.notice) txt((net.error || net.notice).slice(0, 45), 195, lobbyY + 245, 12, net.error ? '#ffadb8' : '#c8f5d9', 700);
  } else if (s.stage === 'paused') {
    txt('TABLE PAUSED', 195, H - 259, 22, '#f7f2e9', 900);
    txt('Everyone still here can vote to continue.', 195, H - 220, 13, '#e4dbea', 700);
    button(s.votes?.[me] ? 'VOTE RECORDED' : 'CONTINUE TOGETHER', 30, H - 165, 330, 64, s.votes?.[me] ? null : () => sendAction({ type: 'continue' }), s.votes?.[me] ? 'dark' : 'gold');
  } else if ((s.stage === 'place' || s.stage === 'add') && net.localStage !== 'bid-picker') {
    const compact=H<760,cardRadius=tight?27:compact?33:43,cardY=stageY+(tight?65:compact?78:92);
    panel(27, stageY, 336, tight?128:compact?150:181, '#342a53', '#8271a0', 20, 'menu-box');
    txt(turn ? s.stage === 'place' ? 'YOUR FIRST DISC' : 'PLAY A DISC OR BID' : `WAITING FOR ${s.seats[s.turn]?.name.toUpperCase()}`, 195, stageY + 26, 16, '#91d9c7', 900, 'center', 292);
    if (turn) {
      const flowerCount=s.hand.filter(type=>type==='flower').length,skullCount=s.hand.filter(type=>type==='skull').length;
      if(flowerCount)cardChoice(124,cardY,cardRadius,'flower',flowerCount,()=>sendAction({type:'place',disc:'flower'}));
      if(skullCount)cardChoice(264,cardY,cardRadius,'skull',skullCount,()=>sendAction({type:'place',disc:'skull'}));
      if (!s.hand.length) txt('No cards left in your hand.',195,stageY+82,14,'#fff',700);
      if (s.stage === 'add') {
        txt(`BID 1–${s.total}  ·  ${s.total} ON TABLE`,195,H-148,13,'#f7f2e9',900);
        button('START A BID', 30, H - 128, 330, 60, () => { net.draft = 1; net.localStage = 'bid-picker'; net.onChange(); });
      } else txt('Everyone places one card before bidding',195,H-78,13,'#e4d7ed',700);
    } else {
      txt('Your hand stays private on this phone.',195,stageY+79,13,'#e4d7ed',700);
      if(s.stage==='add')txt(`MAX BID ${s.total} · ${s.total} DISCS IN PLAY`,195,stageY+111,13,'#f7f2e9',900);
    }
  } else if (s.stage === 'bid' || net.localStage === 'bid-picker') {
    if (net.localStage === 'bid-picker' && turn) {
      panel(27,stageY,336,212,'#403251','#82718e',20);
      txt(`BID ${s.bid + 1}–${s.total} FLOWERS`,195,stageY+25,16,'#c9f5e8',900);
      const pickerY=stageY+54;
      button('−',45,pickerY,65,68,()=>{net.draft=Math.max(s.bid+1,net.draft-1);net.onChange()},'dark');
      panel(126,pickerY,138,68,'#291f3c','#91d9c7');txt(String(net.draft),195,pickerY+34,34,'#f7f2e9',900);
      button('+',280,pickerY,65,68,()=>{net.draft=Math.min(s.total,net.draft+1);net.onChange()},'dark');
      button('BID '+net.draft,36,stageY+144,204,54,()=>{sendAction({type:'bid',amount:net.draft});net.localStage=''},'gold');
      button('BACK',250,stageY+144,104,54,()=>{net.localStage='';net.onChange()},'dark');
    } else {
      panel(38, stageY, 314, 108, '#342a53', '#8271a0', 20, 'menu-box');
      const bidPop=ui.reducedMotion?0:Math.max(0,1-ui.bidAge/.5)*5;
      txt(`${s.bid} FLOWERS`, 195, stageY + 32, 27+bidPop, '#f7f2e9', 900);
      txt(`${s.seats[s.leader]?.name} holds the high bid`, 195, stageY + 61, 13, '#f3e7ed', 700);
      txt(`MAX ${s.total}  ·  NO MORE CARDS`,195,stageY+84,12,'#91d9c7',900);
      if (turn) { button('RAISE', 29, H - 136, 160, 60, () => { net.draft = s.bid + 1; net.localStage = 'bid-picker'; net.onChange(); }); button('PASS', 202, H - 136, 160, 60, () => sendAction({ type: 'pass' }), 'dark'); }
    }
  } else if (s.stage === 'reveal') {
    const summaryHeight=tight?64:76;
    const ownLeft = s.seats[s.challenger].stack - s.flips.filter(f => f.owner === s.challenger).length;
    panel(27, stageY, 336, summaryHeight, '#342a53', '#8271a0', 20, 'menu-box');
    txt(`${s.remaining} FLOWER${s.remaining===1?'':'S'} TO FIND`,195,stageY+24,19,'#f7f2e9',900);
    if(s.flips.length){const recent=s.flips.slice(-6);recent.forEach((flip,i)=>disc(195-(recent.length-1)*18+i*36,stageY+49,16,flip.disc));}
    else txt(turn?ownLeft?'Start with your own stack':'Tap a stack to flip its top disc':`Watch ${s.seats[s.challenger].name}'s reveal`,195,stageY+47,12,'#c9f5e8',700,'center',300);
    const targetsY=stageY+summaryHeight+12,rows=Math.ceil(s.seats.length/2),targetHeight=Math.min(82,(H-32-targetsY-(rows-1)*8)/rows);
    s.seats.forEach((p, i) => {
      const left = p.stack - s.flips.filter(f => f.owner === i).length;
      if (!left) return;
      const legal = i === s.challenger || !ownLeft;
      const available = turn && legal;
      ui.stackChoice(25+i%2*175,targetsY+Math.floor(i/2)*(targetHeight+8),165,targetHeight,i===me?'Your stack':p.name,left,colors[i],available?()=>sendAction({type:'flip',target:i}):null,turn&&!legal?'OWN STACK FIRST':`${left} FACE DOWN`);
    });
  } else if (s.stage === 'loss') {
    disc(195,stageY+(tight?40:52),tight?33:54,'skull');
    txt(me === s.skullOwner ? 'Choose one hidden disc to discard' : `${s.seats[s.skullOwner].name} chooses a hidden disc`, 195, H - 185, 14, '#fff', 700);
    if (me === s.skullOwner) for (let i = 0; i < s.lossCount; i++) {const x=195-(s.lossCount-1)*37+i*74;disc(x,H-112,31,'back',colors[s.challenger]);ui.spots.push({x:x-34,y:H-146,w:68,h:69,fn:()=>sendAction({type:'discard',index:i}),label:'discard hidden disc'});}
  } else if (s.stage === 'choose-lead') {
    txt(`${s.seats[s.challenger].name} chooses the next lead`, 195, H - 283, 15, '#91d9c7', 800);
    s.seats.forEach((p, i) => { if (p.discs) button(p.name, 25 + i % 2 * 174, H - 248 + Math.floor(i / 2) * 57, 165, 49, me === s.challenger ? () => sendAction({ type: 'lead', target: i }) : null, me === s.challenger ? 'gold' : 'dark'); });
  } else if (s.stage === 'result') {
    if(s.resultKind==='flower'){
      const badgeSize=H<760?74:106;
      const pop=ui.reducedMotion?1:Math.min(1,.72+ui.phaseAge*.65);
      art('point-badge',195-badgeSize*pop/2,stageY-1,badgeSize*pop,badgeSize*pop);
      txt(s.challenger===me?'YOU EARNED A POINT':`${s.seats[s.challenger].name} EARNED A POINT`,195,stageY+badgeSize+14,21,'#f7f2e9',900,'center',340);
      txt('One more flower challenge wins!',195,stageY+badgeSize+39,14,'#c9f5e8',800);
    }else txt(s.challenger===me?'You lost one disc. Keep bluffing.':`${s.seats[s.challenger].name} lost one disc.`,195,stageY+60,17,'#f7f2e9',800,'center',340);
    button(host ? 'NEXT ROUND' : 'WAITING FOR HOST', 30, H - 139, 330, 61, host ? () => sendAction({ type: 'next' }) : null, host ? 'gold' : 'dark');
  } else if (s.stage === 'win') {
    txt(`${s.seats[s.winner].name.toUpperCase()} WINS!`, 195, H - 246, 27, '#f7f2e9', 900);
    button(host ? 'REMATCH' : 'WAITING FOR HOST', 30, H - 139, 330, 61, () => host && sendAction({ type: 'rematch' }), host ? 'gold' : 'dark');
  }
  if (s.stage !== 'lobby' && (net.error || net.notice)) txt((net.error || net.notice).slice(0, 45), 195, H - 55, 12, net.error ? '#ffadb8' : '#c8f5d9', 700);
  button('×',326,12,54,54,leaveTable,'dark');
}
