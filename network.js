export const net = { mode: null, state: null, socket: null, url: '', token: '', code: '', error: '', connected: false, draft: 1, onChange: () => {}, retry: 0, manualClose: false };
const shell = document.createElement('div');
shell.id = 'table-setup';
shell.hidden = true;
shell.innerHTML = `<form id="table-form"><div class="table-kicker">✦ DECADENCE ARCADE ✦</div><h2 id="table-title">Join a table</h2><p id="table-detail"></p><button type="button" id="table-change-server" hidden>CHANGE SERVER ADDRESS</button><label>Your name<input id="table-name" maxlength="32" autocomplete="nickname" required></label><label id="address-label"><span id="address-title">Server address</span><input id="table-address" type="text" inputmode="url" required></label><label>Have a table code?<input id="table-code" maxlength="6" autocomplete="off" autocapitalize="characters" placeholder="Enter code to join · or leave blank"></label><p id="table-error" role="alert"></p><button type="submit" id="table-submit">CREATE TABLE</button><button type="button" id="table-resume" hidden>RESUME PREVIOUS TABLE</button><button type="button" id="table-back">BACK TO TABLES</button></form>`;
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
  $('#table-detail').textContent = mode === 'lan' ? 'Play together on the same Wi-Fi. Each player uses their own phone.' : 'Play together from anywhere. Each player uses their own phone.';
  $('#table-name').value = name || stored('skull-name');
  $('#table-address').value = new URLSearchParams(location.search).get('server') || stored(`skull-${mode}-url`) || (mode === 'lan' && localServer() ? location.origin : mode === 'internet' && location.hostname.endsWith('onrender.com') ? location.origin : '');
  $('#table-code').value = code;
  $('#address-title').textContent = mode === 'lan' ? 'LAN server address' : 'Internet server address';
  $('#table-address').placeholder = mode === 'lan' ? 'http://192.168.1.10:3000' : 'https://your-game.onrender.com';
  $('#address-label').hidden = !!$('#table-address').value;
  $('#table-change-server').hidden = !$('#address-label').hidden;
  $('#table-submit').textContent = code ? 'JOIN TABLE' : 'CREATE TABLE';
  $('#table-resume').hidden = lastSeat()?.mode !== mode;
  $('#table-error').textContent = '';
  shell.hidden = false;
  net.onChange();
}
$('#table-code').addEventListener('input', () => { $('#table-submit').textContent = $('#table-code').value.trim() ? 'JOIN TABLE' : 'CREATE TABLE'; });
$('#table-change-server').addEventListener('click', () => { $('#address-label').hidden = false; $('#table-change-server').hidden = true; $('#table-address').focus(); });
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
    } else if (message.type === 'state') { net.state = message.state; net.draft = Math.max(1, message.state.bid + 1); }
    else if (message.type === 'error') {
      net.error = message.message;
      if (!net.state) { const address = net.url; openTable(net.mode, stored('skull-name'), net.code); $('#table-address').value = address; }
      $('#table-error').textContent = message.message;
    }
    net.onChange();
  };
  socket.onclose = () => {
    clearInterval(heartbeat);
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
  const { header, panel, txt, button, disc, cardChoice, art, H, colors } = ui;
  const s = net.state;
  if (!s) {
    header(net.mode === 'lan' ? 'LAN TABLE' : 'INTERNET TABLE', net.connected ? 'Connecting to the table…' : 'Enter your server address and name.');
    txt('✦', 195, H * .40, 90, '#ffda87', 900);
    if (net.error) txt(net.error.slice(0, 40), 195, H * .65, 13, '#ffafb8', 700);
    button('BACK', 30, H - 110, 330, 56, leaveTable, 'dark');
    return;
  }
  const me = s.seat, mine = s.seats[me], turn = s.turn === me, host = s.host === me;
  const titles={lobby:`${s.mode.toUpperCase()} TABLE`,place:'PLACE A DISC',add:'ADD OR BID',bid:'THE BIDDING',reveal:'THE REVEAL',loss:'SKULL REVEALED','choose-lead':'CHOOSE THE LEAD',result:'ROUND COMPLETE',win:'GAME OVER',paused:'TABLE PAUSED'};
  header(titles[s.stage]||'SKULL TABLE',s.stage==='lobby'?`Code ${s.code} · invite your friends`:`Round ${s.round} · ${s.last||`${s.seats[s.turn]?.name||'Player'} to act`}`);
  if(s.stage==='win'){
    const lift=ui.reducedMotion?0:Math.sin(ui.clock*2.5)*5;
    const zoom=ui.reducedMotion?1:Math.min(1,.75+ui.phaseAge*.7);
    art('winner-crown',195-109*zoom,H*.32+lift,218*zoom,150*zoom);
    txt(`${s.seats[s.winner].name.toUpperCase()} WINS!`,195,H*.59,30,'#ffe192',900,'center',340);
    txt(s.resultKind==='flower'?'TWO FLOWER CHALLENGES WON':'LAST PLAYER STANDING',195,H*.65,15,'#c9f5e8',900);
    button(host?'REMATCH':'WAITING FOR HOST',30,H-139,330,61,()=>host&&sendAction({type:'rematch'}),host?'gold':'dark');
    button('×',346,20,34,34,leaveTable,'dark');
    return;
  }
  if (!net.connected) { panel(20, 115, 350, 58, '#69415a', '#f6a3aa'); txt('Reconnecting to your table…', 195, 144, 15, '#fff', 800); }
  const top = 160, gap = H < 760 ? 76 : 99, seatHeight = H < 760 ? 70 : 82;
  const slide=ui.reducedMotion||H<760?0:Math.max(0,1-ui.phaseAge/.35)*8;
  const stageY = top + Math.floor((s.seats.length - 1) / 2) * gap + seatHeight + 19 + slide;
  s.seats.forEach((p, i) => {
    const x = 20 + i % 2 * 183, y = top + Math.floor(i / 2) * gap;
    panel(x, y, 168, seatHeight, i === s.turn ? '#463463' : '#302747', i === s.turn ? '#ffd981' : '#685783', 16, 'player-mat');
    ui.turnGlow(x,y,168,seatHeight,colors[i],i===s.turn&&['place','add','bid','reveal'].includes(s.stage));
    ui.tint(x+5,y+13,5,seatHeight-28,colors[i]);
    txt(p.name, x + 12, y + 23, 14, p.connected ? '#fff4d8' : '#9c92aa', 800, 'left', 104);
    if(p.wins){const pop=!ui.reducedMotion&&i===ui.pointSeat?Math.max(0,1-ui.pointAge/.7)*.28:0;art('point-badge',x+126-19*pop,y+3-19*pop,38*(1+pop),38*(1+pop));}
    else txt('◇ ◇', x + 151, y + 22, 15, '#ffdc81', 800, 'right');
    txt(`${p.stack} placed · ${p.discs} discs`, x + 12, y + seatHeight - 27, 12, '#bdb3d2', 600, 'left', 112);
    if (p.stack){const pop=!ui.reducedMotion&&i===ui.stackSeat?Math.max(0,1-ui.stackAge/.45)*.38:0;disc(x+143,y+seatHeight-26,16*(1+pop),'back',colors[i]);}
  });
  if (s.stage === 'lobby') {
    panel(28, H - 248, 334, 91, '#4b335c', '#f3bc81', 20, 'menu-box');
    txt(`CODE  ${s.code}`, 195, H - 207, 25, '#ffe192', 900);
    txt(`${s.seats.length}/6 players · ${s.mode === 'lan' ? 'same Wi‑Fi' : 'online'}`, 195, H - 170, 13, '#e4dbea', 700);
    button(host ? 'START GAME' : 'WAITING FOR HOST', 30, H - 139, 330, 58, () => host && sendAction({ type: 'start' }), host ? 'gold' : 'dark');
    button('SHARE INVITE', 83, H - 74, 224, 45, shareInvite, 'dark');
  } else if (s.stage === 'paused') {
    txt('TABLE PAUSED', 195, H - 259, 22, '#ffe192', 900);
    txt('Everyone still here can vote to continue.', 195, H - 220, 13, '#e4dbea', 700);
    button(s.votes?.[me] ? 'VOTE RECORDED' : 'CONTINUE TOGETHER', 30, H - 165, 330, 64, () => sendAction({ type: 'continue' }), s.votes?.[me] ? 'dark' : 'gold');
  } else if ((s.stage === 'place' || s.stage === 'add') && net.localStage !== 'bid-picker') {
    const compact=H<760,cardRadius=compact?33:43,cardY=stageY+(compact?78:92);
    panel(27, stageY, 336, compact?150:181, '#342a53', '#8271a0', 20, 'menu-box');
    txt(turn ? s.stage === 'place' ? 'YOUR FIRST DISC' : 'PLAY A DISC OR BID' : `WAITING FOR ${s.seats[s.turn]?.name.toUpperCase()}`, 195, stageY + 26, 16, '#ffe18e', 900, 'center', 292);
    if (turn) {
      const flowerCount=s.hand.filter(type=>type==='flower').length,skullCount=s.hand.filter(type=>type==='skull').length;
      if(flowerCount)cardChoice(124,cardY,cardRadius,'flower',flowerCount,()=>sendAction({type:'place',disc:'flower'}));
      if(skullCount)cardChoice(264,cardY,cardRadius,'skull',skullCount,()=>sendAction({type:'place',disc:'skull'}));
      if (!s.hand.length) txt('No cards left in your hand.',195,stageY+82,14,'#fff',700);
      if (s.stage === 'add') {
        txt(`BID 1–${s.total}  ·  ${s.total} ON TABLE`,195,H-148,13,'#ffe192',900);
        button('START A BID', 30, H - 128, 330, 60, () => { net.draft = 1; net.localStage = 'bid-picker'; net.onChange(); });
      } else txt('Everyone places one card before bidding',195,H-78,13,'#e4d7ed',700);
    } else {
      txt('Your hand stays private on this phone.',195,stageY+79,13,'#e4d7ed',700);
      if(s.stage==='add')txt(`MAX BID ${s.total} · ${s.total} DISCS IN PLAY`,195,stageY+111,13,'#ffe192',900);
    }
  } else if (s.stage === 'bid' || net.localStage === 'bid-picker') {
    if (net.localStage === 'bid-picker' && turn) {
      txt(`BID ${s.bid + 1}–${s.total}  ·  ${s.total} CARDS ON TABLE`, 195, stageY + 22, 15, '#ffe192', 900);
      button('−', 45, H - 216, 65, 68, () => { net.draft = Math.max(s.bid + 1, net.draft - 1); net.onChange(); }, 'dark');
      panel(126, H - 216, 138, 68, '#493360', '#f7bf60'); txt(String(net.draft), 195, H - 182, 34, '#ffe197', 900);
      button('+', 280, H - 216, 65, 68, () => { net.draft = Math.min(s.total, net.draft + 1); net.onChange(); }, 'dark');
      button('BID ' + net.draft, 30, H - 126, 210, 59, () => { sendAction({ type: 'bid', amount: net.draft }); net.localStage = ''; }, 'gold');
      button('BACK', 250, H - 126, 110, 59, () => { net.localStage = ''; net.onChange(); }, 'dark');
    } else {
      panel(38, stageY, 314, 108, '#342a53', '#8271a0', 20, 'menu-box');
      const bidPop=ui.reducedMotion?0:Math.max(0,1-ui.bidAge/.5)*5;
      txt(`${s.bid} FLOWERS`, 195, stageY + 32, 27+bidPop, '#ffe197', 900);
      txt(`${s.seats[s.leader]?.name} holds the high bid`, 195, stageY + 61, 13, '#f3e7ed', 700);
      txt(`MAX ${s.total}  ·  NO MORE CARDS`,195,stageY+84,12,'#ffdc91',900);
      if (turn) { button('RAISE', 29, H - 136, 160, 60, () => { net.draft = s.bid + 1; net.localStage = 'bid-picker'; net.onChange(); }); button('PASS', 202, H - 136, 160, 60, () => sendAction({ type: 'pass' }), 'dark'); }
    }
  } else if (s.stage === 'reveal') {
    panel(32, stageY, 326, 91, '#342a53', '#8271a0', 20, 'menu-box');
    txt(`${s.seats[s.challenger].name} must flip ${s.remaining} more`, 195, stageY + 31, 16, '#ffe197', 900);
    if(s.flips.length){const recent=s.flips.slice(-6);recent.forEach((f,j)=>disc(195-(recent.length-1)*25+j*50,stageY+67,j===recent.length-1&&!ui.reducedMotion?21*Math.min(1,.2+ui.phaseAge*4):21,f.disc));}
    else txt('Own stack first, top disc first.', 195, stageY + 65, 18, '#fff', 800);
    s.seats.forEach((p, i) => {
      const left = p.stack - s.flips.filter(f => f.owner === i).length;
      if (!left) return;
      const ownLeft = s.seats[s.challenger].stack - s.flips.filter(f => f.owner === s.challenger).length;
      const legal = i === s.challenger || !ownLeft;
      button(`${p.name} · ${left}`, 25 + i % 2 * 175, H - 207 + Math.floor(i / 2) * 57, 165, 49, () => { if (turn && legal) sendAction({ type: 'flip', target: i }); }, turn && legal ? 'gold' : 'dark');
    });
  } else if (s.stage === 'loss') {
    disc(195,stageY+52,54,'skull');
    txt(`${s.seats[s.skullOwner].name} chooses a hidden disc`, 195, H - 185, 14, '#fff', 700);
    if (me === s.skullOwner) for (let i = 0; i < s.lossCount; i++) {const x=195-(s.lossCount-1)*37+i*74;disc(x,H-112,31,'back',colors[s.challenger]);ui.spots.push({x:x-34,y:H-146,w:68,h:69,fn:()=>sendAction({type:'discard',index:i}),label:'discard hidden disc'});}
  } else if (s.stage === 'choose-lead') {
    txt(`${s.seats[s.challenger].name} chooses the next lead`, 195, H - 283, 15, '#ffdc83', 800);
    s.seats.forEach((p, i) => { if (p.discs) button(p.name, 25 + i % 2 * 174, H - 248 + Math.floor(i / 2) * 57, 165, 49, () => { if (me === s.challenger) sendAction({ type: 'lead', target: i }); }, 'dark'); });
  } else if (s.stage === 'result') {
    if(s.resultKind==='flower'){
      const badgeSize=H<760?74:106;
      const pop=ui.reducedMotion?1:Math.min(1,.72+ui.phaseAge*.65);
      art('point-badge',195-badgeSize*pop/2,stageY-1,badgeSize*pop,badgeSize*pop);
      txt(`${s.seats[s.challenger].name} HAS 1 POINT`,195,stageY+badgeSize+14,21,'#ffe192',900,'center',340);
      txt('One more flower challenge wins!',195,stageY+badgeSize+39,14,'#c9f5e8',800);
    }else txt(s.last, 195, stageY+60, 17, '#ffe192', 800,'center',340);
    button(host ? 'NEXT ROUND' : 'WAITING FOR HOST', 30, H - 139, 330, 61, () => host && sendAction({ type: 'next' }), host ? 'gold' : 'dark');
  } else if (s.stage === 'win') {
    txt(`${s.seats[s.winner].name.toUpperCase()} WINS!`, 195, H - 246, 27, '#ffe192', 900);
    button(host ? 'REMATCH' : 'WAITING FOR HOST', 30, H - 139, 330, 61, () => host && sendAction({ type: 'rematch' }), host ? 'gold' : 'dark');
  }
  if (net.error || net.notice) txt((net.error || net.notice).slice(0, 45), 195, H - 55, 12, net.error ? '#ffadb8' : '#c8f5d9', 700);
  button('×', 346, 20, 34, 34, leaveTable, 'dark');
}
