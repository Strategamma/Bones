import './style.css';
import { net, openTable, resumeLast, drawTable } from './network.js';
import { canvasGeometry } from './layout.js';
const canvas=document.querySelector('#game'),c=canvas.getContext('2d');
const colors=['#ff738b','#67d5cb','#ffbd62','#aa8dff','#7db8ff','#f29bd5'];
const colorNames=['coral','mint','amber','violet','blue','orchid'];
const names=['You'];
const hash=new URLSearchParams(location.hash.slice(1)),hint=hash.get('arcadeName')?.trim();if(hash.has('arcadeName')){hash.delete('arcadeName');history.replaceState(null,'',location.pathname+location.search+(hash.size?'#'+hash:''))}if(hint&&hint.length<=32)names[0]=hint;
const S={phase:'menu',clock:0,hoverX:-100,hoverY:-100,pressX:0,pressY:0,pressAt:-10,phaseKey:'',phaseAt:0,stackCounts:[],stackSeat:-1,stackAt:-10,bidValue:0,bidAt:-10,pointCounts:[],pointSeat:-1,pointAt:-10};
let W=390,H=844,scale=1,spots=[];
const assetNames=['menu-box','text-box','player-mat','button-gold','button-pink','button-ink','card-back','card-flower','card-skull','logo-skull','point-badge','winner-crown',...colorNames.map(name=>`card-back-${name}`)];
const assets=Object.fromEntries(assetNames.map(name=>{const image=new Image();image.onload=()=>draw();image.src=`${import.meta.env.BASE_URL}assets/${name}.svg`;return[name,image]}));
function art(name,x,y,w,h){const image=assets[name];if(!image?.naturalWidth)return false;c.drawImage(image,x,y,w,h);return true}
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
function resize(){const rect=canvas.getBoundingClientRect();const size=canvasGeometry(rect.width,rect.height,devicePixelRatio);if(canvas.width!==size.pixelWidth||canvas.height!==size.pixelHeight){canvas.width=size.pixelWidth;canvas.height=size.pixelHeight}scale=size.scale;W=390;H=size.logicalHeight;draw()}addEventListener('resize',resize);new ResizeObserver(resize).observe(canvas);
function panel(x,y,w,h,fill='#30284f',stroke='#6b5c93',r=20,design){if(design&&art(design,x,y,w,h))return;c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();c.lineWidth=2;c.strokeStyle=stroke;c.stroke()}
function tint(x,y,w,h,color){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,3);c.fill()}
function txt(t,x,y,size=18,color='#fff',weight=700,align='center',maxWidth){c.fillStyle=color;c.font=`${weight} ${size}px system-ui, sans-serif`;c.textAlign=align;c.textBaseline='middle';if(maxWidth)c.fillText(t,x,y,maxWidth);else c.fillText(t,x,y)}
function button(label,x,y,w,h,fn,kind='gold'){const hover=S.hoverX>=x&&S.hoverX<=x+w&&S.hoverY>=y&&S.hoverY<=y+h;const press=S.pressX>=x&&S.pressX<=x+w&&S.pressY>=y&&S.pressY<=y+h&&S.clock-S.pressAt<.16;const d=reducedMotion.matches?0:press?-2:hover?2:0;panel(x-d,y-d,w+d*2,h+d*2,kind==='gold'?'#f7bf60':kind==='pink'?'#f879a0':'#473c6b',kind==='gold'?'#ffe7a9':kind==='pink'?'#ffb7cb':'#8375ae',15,`button-${kind==='dark'?'ink':kind}`);txt(label,x+w/2,y+h/2+(press?1:0),Math.min(18,w/Math.max(5,label.length)*1.7),kind==='gold'?'#39264b':'#fff',800);spots.push({x,y,w,h,fn,label})}
function disc(x,y,r,type='back',col='#ff819d',tilt=0){c.save();c.translate(x,y);c.rotate(tilt);const cardName=type==='back'&&colors.includes(col)?`card-back-${colorNames[colors.indexOf(col)]}`:`card-${type}`;if(art(cardName,-r,-r,r*2,r*2)){c.restore();return}c.shadowColor='#0c0b20';c.shadowBlur=14;c.shadowOffsetY=8;c.fillStyle='#6d3e66';c.beginPath();c.ellipse(0,7,r,r*.82,0,0,Math.PI*2);c.fill();let g=c.createRadialGradient(-r*.3,-r*.4,2,0,0,r*1.2);g.addColorStop(0,'#fff7db');g.addColorStop(type==='back'?.48:.4,col);g.addColorStop(1,type==='back'?'#802f70':'#ab506a');c.shadowBlur=0;c.shadowOffsetY=0;c.fillStyle=g;c.beginPath();c.ellipse(0,0,r,r*.82,0,0,Math.PI*2);c.fill();c.lineWidth=3;c.strokeStyle='#ffe7a5';c.stroke();txt(type==='back'?'✦':type==='skull'?'☠':'✿',0,-2,r*.96,type==='back'?'#fff0bb':type==='skull'?'#442b55':'#fff9cc',900);c.restore()}
function bg(){
  const time=reducedMotion.matches?0:S.clock;
  const base=c.createLinearGradient(0,0,0,H);
  base.addColorStop(0,'#21183a');base.addColorStop(.48,'#42305f');base.addColorStop(1,'#1b1633');
  c.fillStyle=base;c.fillRect(0,0,W,H);
  const washes=[[195,H*.14,320,'#df8ca94b'],[25,H*.54,300,'#9b6bd338'],[365,H*.65,290,'#f6a16430']];
  for(const [x,y,r,color] of washes){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'#00000000');c.fillStyle=g;c.fillRect(0,0,W,H)}
  const breath=reducedMotion.matches?0:Math.sin(time*.55)*9;
  const felt=c.createRadialGradient(195+breath,H*.52,12,195,H*.52,Math.max(260,H*.42));
  felt.addColorStop(0,'#9566b471');felt.addColorStop(.52,'#65448d4d');felt.addColorStop(1,'#140f2a00');
  c.fillStyle=felt;c.beginPath();c.ellipse(195,H*.52,265,H*.43,0,0,Math.PI*2);c.fill();
  c.strokeStyle='#edb8db1b';c.lineWidth=1.4;c.beginPath();c.ellipse(195,H*.52,236,H*.39,0,0,Math.PI*2);c.stroke();
  c.strokeStyle='#c7a8f318';c.beginPath();c.ellipse(195,H*.52,220,H*.36,0,0,Math.PI*2);c.stroke();
  c.strokeStyle='#f7d99618';c.lineWidth=1.2;
  for(const inset of [11,18]){c.beginPath();c.roundRect(inset,12,390-inset*2,H-24,28);c.stroke()}
  c.strokeStyle='#f6d69315';c.lineWidth=2;
  c.beginPath();c.arc(195,-125,275,.13*Math.PI,.87*Math.PI);c.stroke();
  c.beginPath();c.arc(195,H+145,280,1.13*Math.PI,1.87*Math.PI);c.stroke();
  for(let i=-3;i<=3;i++){c.strokeStyle=i===0?'#ffe7ae14':'#ffde9b0d';c.beginPath();c.moveTo(195,H+85);c.lineTo(195+i*83,H-105);c.stroke()}
  for(let i=0;i<3;i++){const y=H*(.37+i*.12)+Math.sin(time*.45+i)*6;c.strokeStyle=i===1?'#e7a1cc17':'#ffe0ac12';c.lineWidth=1.3;c.beginPath();c.moveTo(-30,y+24);c.bezierCurveTo(75,y-36,270,y+50,420,y-20);c.stroke()}
  for(const x of [17,373]){for(let j=0;j<5;j++){const y=H*(.16+j*.17);c.save();c.translate(x,y);c.rotate(Math.PI/4);c.fillStyle='#f9d99425';c.fillRect(-3,-3,6,6);c.restore()}}
  for(let i=0;i<30;i++){const x=(i*137+38)%390,drift=reducedMotion.matches?0:time*(6+i%4*3),y=(i*223+drift)%(H+50)-25;const twinkle=reducedMotion.matches ? .6 : .55+.45*Math.sin(time*(.7+i%3*.23)+i);c.globalAlpha=(.13+i%5*.045)*twinkle;c.fillStyle=i%4?'#ffdb9c':'#a8fff0';c.beginPath();c.arc(x,y,i%7===0?2.2:1.1,0,Math.PI*2);c.fill()}c.globalAlpha=1;
  const stage=net.state?.stage,age=S.clock-S.phaseAt;
  if(!reducedMotion.matches&&age<1.2&&['reveal','loss','result','win'].includes(stage)){
    const flash=stage==='loss'?'#f67e9b':stage==='reveal'?'#8cebd8':'#ffe195';
    const g=c.createRadialGradient(195,H*.45,15,195,H*.45,350);g.addColorStop(0,flash+Math.round((1-age/1.2)*42).toString(16).padStart(2,'0'));g.addColorStop(1,flash+'00');c.fillStyle=g;c.fillRect(0,0,W,H)
  }
}
function logo(y=138,small=false){const z=small?.55:1;c.save();c.translate(195,y+(reducedMotion.matches?0:Math.sin(S.clock*1.7)*2));c.scale(z,z);if(!art('logo-skull',-72,-108,144,144))disc(0,-35,67,'skull','#ffce78',-.08);txt('SKULL',0,52,62,'#ffda87',1000);txt('THE BLUFFING GAME',0,94,13,'#a9e5dd',900);c.restore()}
function header(title,sub){panel(15,8,360,106,'#30284f','#6b5c93',20,'text-box');txt('✦  DECADENCE ARCADE  ✦',195,29,11,'#fbc977',900);txt(title,195,67,27,'#fff3db',900,'center',326);txt(sub,195,137,14,'#e2d8ef',700,'center',340)}
function cardChoice(x,y,r,type,count,fn){const hover=Math.hypot(S.hoverX-x,S.hoverY-y)<r+10;const pressed=Math.hypot(S.pressX-x,S.pressY-y)<r+10&&S.clock-S.pressAt<.16;const age=S.clock-S.phaseAt;const arrive=reducedMotion.matches?1:Math.min(1,.85+Math.max(0,age)*.45);const size=r*arrive*(reducedMotion.matches?1:pressed ? .91 : hover ? 1.09 : 1);disc(x,y,size,type);txt(type==='flower'?'FLOWER':'SKULL',x,y+r+13,13,type==='flower'?'#ffe7ac':'#ffb6cb',900);txt(`×${count}`,x+r-2,y-r+8,13,'#fff',900);spots.push({x:x-r-10,y:y-r-10,w:(r+10)*2,h:(r+10)*2,fn,label:type})}
function turnGlow(x,y,w,h,color,active){if(!active)return;c.save();c.globalAlpha=reducedMotion.matches ? .42 : .38+Math.sin(S.clock*3)*.16;c.strokeStyle=color;c.lineWidth=2.5;c.shadowColor=color;c.shadowBlur=10;c.beginPath();c.roundRect(x+2,y+2,w-4,h-7,17);c.stroke();c.restore()}
function updateMotion(){const state=net.state;if(!state?.seats){S.stackCounts=[];S.pointCounts=[];S.bidValue=0;return}const stacks=state.seats.map(p=>p.stack),points=state.seats.map(p=>p.wins);if(S.stackCounts.length===stacks.length)stacks.forEach((n,i)=>{if(n>S.stackCounts[i]){S.stackSeat=i;S.stackAt=S.clock}});if(S.pointCounts.length===points.length)points.forEach((n,i)=>{if(n>S.pointCounts[i]){S.pointSeat=i;S.pointAt=S.clock}});if(state.bid>S.bidValue)S.bidAt=S.clock;S.stackCounts=stacks;S.pointCounts=points;S.bidValue=state.bid}
function effects(){if(reducedMotion.matches)return;const age=S.clock-S.phaseAt;const reward=net.state?.stage==='win'||net.state?.stage==='result'&&net.state?.resultKind==='flower';if(reward&&age<3){for(let i=0;i<34;i++){const x=(i*97+33)%390,y=((i*71+age*(85+i%5*13))%(H+50))-25;c.save();c.translate(x,y);c.rotate(age*2+i);c.globalAlpha=Math.min(1,age*5)*Math.max(0,1-age/3);c.fillStyle=[...colors,'#ffe199'][i%7];c.fillRect(-3,-5,6,10);c.restore()}}const click=S.clock-S.pressAt;if(click>=0&&click<.4){c.globalAlpha=(1-click/.4)*.7;c.strokeStyle='#fff7d2';c.lineWidth=3;c.beginPath();c.arc(S.pressX,S.pressY,8+click*65,0,Math.PI*2);c.stroke();c.globalAlpha=1}}
function draw(){
  if(!canvas.width)return;
  const key=net.mode?`${net.mode}:${net.state?.stage||'setup'}:${net.state?.round||0}:${net.state?.resultKind||''}:${net.state?.flips?.length||0}`:S.phase;
  if(key!==S.phaseKey){S.phaseKey=key;S.phaseAt=S.clock}
  updateMotion();
  c.setTransform(scale,0,0,scale,0,0);
  spots=[];
  bg();
  if(net.mode){drawTable({header,panel,txt,button,disc,cardChoice,art,tint,turnGlow,H,colors,spots,clock:S.clock,phaseAge:S.clock-S.phaseAt,stackSeat:S.stackSeat,stackAge:S.clock-S.stackAt,bidAge:S.clock-S.bidAt,pointSeat:S.pointSeat,pointAge:S.clock-S.pointAt,reducedMotion:reducedMotion.matches});effects();return}
  if(S.phase==='help'){
    header('HOW TO PLAY','Three beats. One delicious bluff.');
    const lines=[['01  PLACE','Everyone puts one secret disc down.'],['02  CHOOSE','Next player places another disc or bids.'],['03  BID','Bid up to the discs in play. Placing then stops.'],['04  REVEAL','Flip your stack first. Win twice for the crown.']];
    lines.forEach((a,i)=>{const y=155+i*112;panel(25,y,340,94,'#30284f','#6b5c93',20,'text-box');txt(a[0],44,y+26,18,'#ffdc83',900,'left');txt(a[1],44,y+62,13,'#eee8f3',600,'left',305)});
    button('BACK TO TABLES',34,H-83,322,56,()=>S.phase='menu');
    return;
  }
  logo(Math.min(160,H*.20));
  txt('A tiny bluff. A huge reveal.',195,H*.39,18,'#fff5e5',800);
  txt('CHOOSE YOUR TABLE',195,H*.47,15,'#ffdf91',900);
  button('LAN TABLE',33,H*.52,324,66,()=>openTable('lan',names[0]),'gold');
  txt('Together on the same Wi-Fi',195,H*.52+83,13,'#e4d7ed',700);
  button('INTERNET TABLE',33,H*.52+126,324,66,()=>openTable('internet',names[0]),'pink');
  txt('Play with friends anywhere',195,H*.52+209,13,'#e4d7ed',700);
  txt('3–6 players  ·  one private hand per phone',195,H-42,12,'#bdb1d2',700);
  button('?',333,26,40,40,()=>S.phase='help','dark');
}
canvas.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();S.hoverX=(e.clientX-r.left)*390/r.width;S.hoverY=(e.clientY-r.top)*H/r.height;canvas.style.cursor=spots.some(a=>S.hoverX>=a.x&&S.hoverX<=a.x+a.w&&S.hoverY>=a.y&&S.hoverY<=a.y+a.h)?'pointer':'default';draw()});canvas.addEventListener('pointerleave',()=>{S.hoverX=-100;S.hoverY=-100;canvas.style.cursor='default';draw()});
canvas.addEventListener('pointerup',e=>{if(e.pointerType==='touch'){S.hoverX=-100;S.hoverY=-100;draw()}});canvas.addEventListener('pointercancel',()=>{S.hoverX=-100;S.hoverY=-100;draw()});
canvas.addEventListener('pointerdown',e=>{const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*390/r.width,y=(e.clientY-r.top)*H/r.height;for(let i=spots.length-1;i>=0;i--){let a=spots[i];if(x>=a.x&&x<=a.x+a.w&&y>=a.y&&y<=a.y+a.h){S.pressX=x;S.pressY=y;S.pressAt=S.clock;a.fn();draw();return}}});addEventListener('keydown',e=>{if(e.key.toLowerCase()==='f'){if(document.fullscreenElement)document.exitFullscreen();else canvas.requestFullscreen?.()}});
window.advanceTime=ms=>{S.clock+=ms/1000;draw()};window.render_game_to_text=()=>JSON.stringify(net.mode?{coordinates:'canvas 390 units wide; origin top-left, y down',mode:net.mode,connected:net.connected,error:net.error,state:net.state,actions:spots.map(a=>a.label)}:{coordinates:'canvas 390 units wide; origin top-left, y down',phase:S.phase,actions:spots.map(a=>a.label)});net.onChange=draw;resize();let previous=0,lastFrame=0;function frame(now){if(!reducedMotion.matches){S.clock+=Math.min((now-previous)/1000,.05);if(now-lastFrame>=33){draw();lastFrame=now}}previous=now;requestAnimationFrame(frame)}requestAnimationFrame(frame);const tableFromUrl=new URLSearchParams(location.search).get('table');if(tableFromUrl==='lan'||tableFromUrl==='internet')openTable(tableFromUrl,names[0],new URLSearchParams(location.search).get('code')||'');else resumeLast();if('serviceWorker'in navigator)navigator.serviceWorker.register(import.meta.env.BASE_URL+'sw.js').catch(()=>{});
