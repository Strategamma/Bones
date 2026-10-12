import './style.css';
import { net, openTable, resumeLast, drawTable } from './network.js';
import { canvasGeometry } from './layout.js';
import { playSfx, soundEnabled, toggleSound } from './audio.js';
import { showRulebook } from './rulebook.js';
import { playerName } from './entry.js';
const canvas=document.querySelector('#game'),c=canvas.getContext('2d');
const colors=['#e98493','#72bdaa','#dbaa70','#8d78be','#78a9cb','#b680bc'];
const colorNames=['coral','mint','amber','violet','blue','orchid'];
const hash=new URLSearchParams(location.hash.slice(1)),hint=hash.get('arcadeName');if(hash.has('arcadeName')){hash.delete('arcadeName');history.replaceState(history.state,'',location.pathname+location.search+(hash.size?'#'+hash:''))}
let savedName='';try{savedName=localStorage.getItem('skull-name')||''}catch{}
const names=[playerName(savedName,hint)];
let installPrompt=null;
let installed=matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;draw()});
addEventListener('appinstalled',()=>{installed=true;installPrompt=null;draw()});
async function installApp(){
  if(installPrompt){const prompt=installPrompt;installPrompt=null;await prompt.prompt();draw();return}
  const dialog=document.createElement('dialog');dialog.id='install-help';
  const title=document.createElement('h2');title.textContent='INSTALL BONES';dialog.append(title);
  const message=document.createElement('p');message.textContent=/iPad|iPhone|iPod/.test(navigator.userAgent)?'In Safari, tap Share, then Add to Home Screen.':'Open your browser menu and choose Install app or Add to Home Screen.';dialog.append(message);
  const close=document.createElement('button');close.textContent='GOT IT';close.onclick=()=>dialog.close();dialog.append(close);
  dialog.addEventListener('close',()=>dialog.remove());document.body.append(dialog);dialog.showModal();
}
const S={phase:'menu',clock:0,hoverX:-100,hoverY:-100,hoverLabel:'',pressX:0,pressY:0,pressAt:-10,phaseKey:'',phaseAt:0,stackCounts:[],stackSeat:-1,stackAt:-10,bidValue:0,bidAt:-10,pointCounts:[],pointSeat:-1,pointAt:-10,soundStage:'',flipCount:0};
let W=390,H=844,scale=1,spots=[];
const assetNames=['menu-box','text-box','player-mat','button-gold','button-pink','button-ink','card-back','card-flower','card-skull','point-badge','winner-crown',...colorNames.map(name=>`card-back-${name}`)];
const assets=Object.fromEntries(assetNames.map(name=>{const image=new Image();image.onload=()=>draw();image.src=`${import.meta.env.BASE_URL}assets/${name}.svg`;return[name,image]}));
const wordmark=new Image();wordmark.onload=()=>draw();wordmark.src=`${import.meta.env.BASE_URL}assets/bones-platform-logo.png`;
function art(name,x,y,w,h){const image=assets[name];if(!image?.naturalWidth)return false;c.drawImage(image,x,y,w,h);return true}
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
function resize(){const rect=canvas.getBoundingClientRect();const size=canvasGeometry(rect.width,rect.height,devicePixelRatio);if(canvas.width!==size.pixelWidth||canvas.height!==size.pixelHeight){canvas.width=size.pixelWidth;canvas.height=size.pixelHeight}scale=size.scale;W=390;H=size.logicalHeight;draw()}addEventListener('resize',resize);new ResizeObserver(resize).observe(canvas);
function panel(x,y,w,h,fill='#403251',stroke='#82718e',r=20,design){if(design&&art(design,x,y,w,h))return;c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();c.lineWidth=2;c.strokeStyle=stroke;c.stroke()}
function tint(x,y,w,h,color){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,3);c.fill()}
function txt(t,x,y,size=18,color='#fff',weight=700,align='center',maxWidth){c.fillStyle=color;c.font=`${weight} ${size}px system-ui, sans-serif`;c.textAlign=align;c.textBaseline='middle';if(maxWidth)c.fillText(t,x,y,maxWidth);else c.fillText(t,x,y)}
function button(label,x,y,w,h,fn,kind='gold'){const hover=S.hoverX>=x&&S.hoverX<=x+w&&S.hoverY>=y&&S.hoverY<=y+h;const press=S.pressX>=x&&S.pressX<=x+w&&S.pressY>=y&&S.pressY<=y+h&&S.clock-S.pressAt<.16;const d=reducedMotion.matches?0:press?-2:hover?2:0;panel(x-d,y-d,w+d*2,h+d*2,kind==='gold'?'#f2ece3':kind==='pink'?'#ee8a96':'#514064',kind==='gold'?'#fff9ef':kind==='pink'?'#f7b3b9':'#81708f',15,`button-${kind==='dark'?'ink':kind}`);txt(label,x+w/2,y+h/2+(press?1:0),Math.min(18,w/Math.max(5,label.length)*1.7),kind==='dark'?'#fff':'#2c213e',800);spots.push({x,y,w,h,fn,label})}
function disc(x,y,r,type='back',col='#e98493',tilt=0){c.save();c.translate(x,y);c.rotate(tilt);const cardName=type==='back'&&colors.includes(col)?`card-back-${colorNames[colors.indexOf(col)]}`:`card-${type}`;if(art(cardName,-r,-r,r*2,r*2)){c.restore();return}c.fillStyle='#241b38';c.beginPath();c.arc(0,5,r,0,Math.PI*2);c.fill();c.fillStyle=type==='back'?col:type==='flower'?'#f5e8e2':'#d7bccd';c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.fill();c.lineWidth=2;c.strokeStyle='#ffffff66';c.stroke();txt(type==='back'?'✦':type==='skull'?'☠':'✿',0,-2,r*.96,type==='back'?'#f7f2e9':type==='skull'?'#3c2d4a':'#ee8492',900);c.restore()}
function bg(){
  const time=reducedMotion.matches?0:S.clock;
  const base=c.createLinearGradient(0,0,0,H);
  base.addColorStop(0,'#241b38');base.addColorStop(.5,'#382a4d');base.addColorStop(1,'#21192f');
  c.fillStyle=base;c.fillRect(0,0,W,H);
  const washes=[[70,H*.18,280,'#ee8a962b'],[330,H*.57,300,'#91d9c71e'],[170,H*.88,270,'#c9b0d41b']];
  for(const [x,y,r,color] of washes){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'#00000000');c.fillStyle=g;c.fillRect(0,0,W,H)}
  c.strokeStyle='#f7f2e914';c.lineWidth=1.5;c.beginPath();c.roundRect(10,10,W-20,H-20,26);c.stroke();
  c.fillStyle='#f7f2e907';c.beginPath();c.ellipse(195,H*.54,250,H*.39,0,0,Math.PI*2);c.fill();
  for(let i=0;i<16;i++){const x=(i*137+38)%390,drift=reducedMotion.matches?0:time*(3+i%3*2),y=(i*223+drift)%(H+40)-20;c.globalAlpha=.12+i%4*.04;c.fillStyle=i%3?'#f7f2e9':'#91d9c7';c.beginPath();c.arc(x,y,i%5===0?2:1.2,0,Math.PI*2);c.fill()}c.globalAlpha=1;
  const stage=net.state?.stage,age=S.clock-S.phaseAt;
  if(!reducedMotion.matches&&age<1.2&&['reveal','loss','result','win'].includes(stage)){
    const flash=stage==='loss'?'#ee8a96':stage==='reveal'?'#91d9c7':'#f7f2e9';
    const g=c.createRadialGradient(195,H*.45,15,195,H*.45,350);g.addColorStop(0,flash+Math.round((1-age/1.2)*42).toString(16).padStart(2,'0'));g.addColorStop(1,flash+'00');c.fillStyle=g;c.fillRect(0,0,W,H)
  }
}
function drawWordmark(cx,cy,w){if(!wordmark.naturalWidth)return false;const sy=wordmark.naturalHeight*.28,sh=wordmark.naturalHeight*.45,h=w*sh/wordmark.naturalWidth;c.drawImage(wordmark,0,sy,wordmark.naturalWidth,sh,cx-w/2,cy-h/2,w,h);return true}
function logo(y=138){c.save();c.translate(0,reducedMotion.matches?0:Math.sin(S.clock*1.7)*2);if(!drawWordmark(195,y,330))txt('BONES',195,y,60,'#f7f2e9',1000);txt('THE BLUFFING GAME',195,y+94,13,'#a9e5dd',900);c.restore()}
function header(title,sub){panel(15,8,360,127,'#30284f','#6b5c93',20,'text-box');if(!drawWordmark(195,29,100))txt('BONES',195,29,18,'#f7f2e9',900);txt(title,195,74,title.length>16?22:26,'#f7f2e9',900,'center',318);txt(sub,195,108,13,'#e2d8ef',700,'center',326)}
function cardChoice(x,y,r,type,count,fn){const hover=Math.hypot(S.hoverX-x,S.hoverY-y)<r+10;const pressed=Math.hypot(S.pressX-x,S.pressY-y)<r+10&&S.clock-S.pressAt<.16;const age=S.clock-S.phaseAt;const arrive=reducedMotion.matches?1:Math.min(1,.85+Math.max(0,age)*.45);const size=r*arrive*(reducedMotion.matches?1:pressed ? .91 : hover ? 1.09 : 1);disc(x,y,size,type);txt(type==='flower'?'FLOWER':'SKULL',x,y+r+13,13,type==='flower'?'#f7f2e9':'#ffb6cb',900);txt(`×${count}`,x+r-2,y-r+8,13,'#fff',900);spots.push({x:x-r-10,y:y-r-10,w:(r+10)*2,h:(r+10)*2,fn,label:type})}
function turnGlow(x,y,w,h,color,active){if(!active)return;c.save();c.globalAlpha=reducedMotion.matches ? .42 : .38+Math.sin(S.clock*3)*.16;c.strokeStyle=color;c.lineWidth=2.5;c.shadowColor=color;c.shadowBlur=10;c.beginPath();c.roundRect(x+2,y+2,w-4,h-7,17);c.stroke();c.restore()}
function updateMotion(){const state=net.state;if(!state?.seats){S.stackCounts=[];S.pointCounts=[];S.bidValue=0;S.soundStage='';S.flipCount=0;return}const stacks=state.seats.map(p=>p.stack),points=state.seats.map(p=>p.wins);if(S.stackCounts.length===stacks.length)stacks.forEach((n,i)=>{if(n>S.stackCounts[i]){S.stackSeat=i;S.stackAt=S.clock}});if(S.pointCounts.length===points.length)points.forEach((n,i)=>{if(n>S.pointCounts[i]){S.pointSeat=i;S.pointAt=S.clock}});if(state.bid>S.bidValue)S.bidAt=S.clock;if(S.soundStage){const cue=state.stage==='win'&&S.soundStage!=='win'?'win':state.stage==='loss'&&S.soundStage!=='loss'?'skull':state.stage==='result'&&S.soundStage!=='result'&&state.resultKind==='flower'?'point':state.flips.length>S.flipCount?'flip':state.bid>S.bidValue?'bid':stacks.some((n,i)=>n>(S.stackCounts[i]||0))?'card':'';if(cue)playSfx(cue)}S.stackCounts=stacks;S.pointCounts=points;S.bidValue=state.bid;S.soundStage=state.stage;S.flipCount=state.flips.length}
function effects(){if(reducedMotion.matches)return;const age=S.clock-S.phaseAt;const reward=net.state?.stage==='win'||net.state?.stage==='result'&&net.state?.resultKind==='flower';if(reward&&age<3){for(let i=0;i<34;i++){const x=(i*97+33)%390,y=((i*71+age*(85+i%5*13))%(H+50))-25;c.save();c.translate(x,y);c.rotate(age*2+i);c.globalAlpha=Math.min(1,age*5)*Math.max(0,1-age/3);c.fillStyle=[...colors,'#f7f2e9'][i%7];c.fillRect(-3,-5,6,10);c.restore()}}const click=S.clock-S.pressAt;if(click>=0&&click<.4){c.globalAlpha=(1-click/.4)*.7;c.strokeStyle='#f7f2e9';c.lineWidth=3;c.beginPath();c.arc(S.pressX,S.pressY,8+click*65,0,Math.PI*2);c.stroke();c.globalAlpha=1}}
function draw(){
  if(!canvas.width)return;
  const key=net.mode?`${net.mode}:${net.state?.stage||'setup'}:${net.state?.round||0}:${net.state?.resultKind||''}:${net.state?.flips?.length||0}`:S.phase;
  if(key!==S.phaseKey){S.phaseKey=key;S.phaseAt=S.clock}
  updateMotion();
  c.setTransform(scale,0,0,scale,0,0);
  spots=[];
  bg();
  if(net.mode){drawTable({header,panel,txt,button,disc,cardChoice,art,tint,turnGlow,H,colors,spots,clock:S.clock,phaseAge:S.clock-S.phaseAt,stackSeat:S.stackSeat,stackAge:S.clock-S.stackAt,bidAge:S.clock-S.bidAt,pointSeat:S.pointSeat,pointAge:S.clock-S.pointAt,reducedMotion:reducedMotion.matches});effects();return}
  logo(Math.min(160,H*.20));
  txt('A tiny bluff. A huge reveal.',195,H*.39,18,'#f7f2e9',800);
  txt('CHOOSE YOUR TABLE',195,H*.47,15,'#91d9c7',900);
  button('LAN TABLE',33,H*.52,324,66,()=>openTable('lan',names[0]),'gold');
  txt('Together on the same Wi-Fi',195,H*.52+83,13,'#e4d7ed',700);
  button('INTERNET TABLE',33,H*.52+126,324,66,()=>openTable('internet',names[0]),'pink');
  txt('Play with friends anywhere',195,H*.52+209,13,'#e4d7ed',700);
  if(!installed)button('↓ INSTALL APP',100,H-(H<720?75:107),190,H<720?36:45,installApp,'dark');
  if(H>=720)txt('3–6 players  ·  one private hand per phone',195,H-42,12,'#bdb1d2',700);
  button(soundEnabled()?'♪ ON':'♪ OFF',16,26,82,42,()=>{toggleSound();draw()},'dark');
  button('?',332,26,42,42,showRulebook,'dark');
}
canvas.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();S.hoverX=(e.clientX-r.left)*390/r.width;S.hoverY=(e.clientY-r.top)*H/r.height;const hovered=spots.find(a=>S.hoverX>=a.x&&S.hoverX<=a.x+a.w&&S.hoverY>=a.y&&S.hoverY<=a.y+a.h);if(hovered?.label!==S.hoverLabel){if(hovered)playSfx('hover');S.hoverLabel=hovered?.label||''}canvas.style.cursor=hovered?'pointer':'default';draw()});canvas.addEventListener('pointerleave',()=>{S.hoverX=-100;S.hoverY=-100;S.hoverLabel='';canvas.style.cursor='default';draw()});
canvas.addEventListener('pointerup',e=>{if(e.pointerType==='touch'){S.hoverX=-100;S.hoverY=-100;draw()}});canvas.addEventListener('pointercancel',()=>{S.hoverX=-100;S.hoverY=-100;draw()});
canvas.addEventListener('pointerdown',e=>{const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*390/r.width,y=(e.clientY-r.top)*H/r.height;for(let i=spots.length-1;i>=0;i--){let a=spots[i];if(x>=a.x&&x<=a.x+a.w&&y>=a.y&&y<=a.y+a.h){S.pressX=x;S.pressY=y;S.pressAt=S.clock;playSfx('tap');a.fn();draw();return}}});addEventListener('keydown',e=>{if(e.key.toLowerCase()==='f'){if(document.fullscreenElement)document.exitFullscreen();else canvas.requestFullscreen?.()}});
window.advanceTime=ms=>{S.clock+=ms/1000;draw()};window.render_game_to_text=()=>JSON.stringify(net.mode?{coordinates:'canvas 390 units wide; origin top-left, y down',mode:net.mode,connected:net.connected,error:net.error,state:net.state,actions:spots.map(a=>a.label)}:{coordinates:'canvas 390 units wide; origin top-left, y down',phase:S.phase,actions:spots.map(a=>a.label)});net.onChange=draw;resize();let previous=0,lastFrame=0;function frame(now){if(!reducedMotion.matches){S.clock+=Math.min((now-previous)/1000,.05);if(now-lastFrame>=33){draw();lastFrame=now}}previous=now;requestAnimationFrame(frame)}requestAnimationFrame(frame);const tableFromUrl=new URLSearchParams(location.search).get('table');if(tableFromUrl==='lan'||tableFromUrl==='internet')openTable(tableFromUrl,names[0],new URLSearchParams(location.search).get('code')||'');else resumeLast();if('serviceWorker'in navigator)navigator.serviceWorker.register(import.meta.env.BASE_URL+'sw.js').catch(()=>{});
