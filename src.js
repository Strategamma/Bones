import './style.css';
import { net, openTable, resumeLast, drawTable } from './network.js';
import { canvasGeometry } from './layout.js';
import { playSfx, soundEnabled, toggleSound } from './audio.js';
import { showRulebook } from './rulebook.js';
import { playerName } from './entry.js';
import { syncGameplayControls } from './gameplay-controls.js';
const canvas=document.querySelector('#game'),c=canvas.getContext('2d');
const qaMode=new URLSearchParams(location.search).has('qa');
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
  const message=document.createElement('p');message.textContent=!isSecureContext?'Install BONES from its public HTTPS page. Local Wi-Fi play still works here.':/iPad|iPhone|iPod/.test(navigator.userAgent)?'In Safari, tap Share, then Add to Home Screen.':'Open your browser menu and choose Install app or Add to Home Screen.';dialog.append(message);
  const close=document.createElement('button');close.textContent='GOT IT';close.onclick=()=>dialog.close();dialog.append(close);
  dialog.addEventListener('close',()=>dialog.remove());document.body.append(dialog);dialog.showModal();
}
const S={phase:'menu',clock:0,hoverX:-100,hoverY:-100,hoverLabel:'',pressX:0,pressY:0,pressAt:-10,phaseKey:'',phaseAt:0,stackCounts:[],stackSeat:-1,stackAt:-10,bidValue:0,bidAt:-10,pointCounts:[],pointSeat:-1,pointAt:-10,soundStage:'',flipCount:0,flipAt:-10,flipDisc:'',flipOwner:-1,discardKey:'',discardAt:-10};
let W=390,H=844,scale=1,spots=[];
const assetNames=['menu-box','text-box','player-mat','button-gold','button-pink','button-ink','card-back','card-flower','card-skull','reveal-safe','reveal-skull','table-lan','table-online','point-badge','winner-crown','card-flower-new','card-skull-new','card-back-new','bid-number-tile','bid-spotlight','search-announcement','skull-loss','card-discard','victory-arcade','arcade-nav','shared-table',...['sound','mute','help','rooms','host','home'].map(name=>`nav-${name}`),...colorNames.map(name=>`card-played-${name}`),...colorNames.map(name=>`card-back-${name}`)];
const assets=Object.fromEntries(assetNames.map(name=>{const image=new Image();image.onload=()=>draw();image.src=`${import.meta.env.BASE_URL}assets/${name}.svg`;return[name,image]}));
const wordmark=new Image();wordmark.onload=()=>draw();wordmark.src=`${import.meta.env.BASE_URL}assets/bones-platform-logo.png`;
function art(name,x,y,w,h){const image=assets[name];if(!image?.naturalWidth)return false;c.drawImage(image,x,y,w,h);return true}
const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
const reducedMotion={get matches(){return motionPreference.matches||qaMode&&new URLSearchParams(location.search).get('motion')==='reduce'}};
function resize(){const rect=canvas.getBoundingClientRect();const size=canvasGeometry(rect.width,rect.height,devicePixelRatio);if(canvas.width!==size.pixelWidth||canvas.height!==size.pixelHeight){canvas.width=size.pixelWidth;canvas.height=size.pixelHeight}scale=size.scale;W=390;H=size.logicalHeight;draw()}addEventListener('resize',resize);new ResizeObserver(resize).observe(canvas);
function panel(x,y,w,h,fill='#403251',stroke='#82718e',r=20,design){if(design&&art(design,x,y,w,h))return;c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();c.lineWidth=2;c.strokeStyle=stroke;c.stroke()}
function tint(x,y,w,h,color){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,3);c.fill()}
function txt(t,x,y,size=18,color='#fff',weight=700,align='center',maxWidth){c.fillStyle=color;c.font=`${weight} ${size}px system-ui, sans-serif`;c.textAlign=align;c.textBaseline='middle';if(maxWidth)c.fillText(t,x,y,maxWidth);else c.fillText(t,x,y)}
function button(label,x,y,w,h,fn,kind='gold'){const enabled=typeof fn==='function';const hover=enabled&&S.hoverX>=x&&S.hoverX<=x+w&&S.hoverY>=y&&S.hoverY<=y+h;const press=enabled&&S.pressX>=x&&S.pressX<=x+w&&S.pressY>=y&&S.pressY<=y+h&&S.clock-S.pressAt<.16;const d=reducedMotion.matches?0:press?-2:hover?2:0;c.save();if(!enabled)c.globalAlpha=.48;panel(x-d,y-d,w+d*2,h+d*2,kind==='gold'?'#f2ece3':kind==='pink'?'#ee8a96':'#514064',kind==='gold'?'#fff9ef':kind==='pink'?'#f7b3b9':'#81708f',15,`button-${kind==='dark'?'ink':kind}`);txt(label,x+w/2,y+h/2+(press?1:0),Math.min(18,w/Math.max(5,label.length)*1.7),kind==='dark'?'#fff':'#2c213e',800);c.restore();if(enabled)spots.push({x,y,w,h,fn,label})}
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
function logo(y=138,w=330){c.save();c.translate(0,reducedMotion.matches?0:Math.sin(S.clock*1.7)*2);if(!drawWordmark(195,y,w))txt('BONES',195,y,60,'#f7f2e9',1000);txt('THE BLUFFING GAME',195,y+w*.285,13,'#a9e5dd',900);c.restore()}
function tableChoice(mode,y,h){const x=30,w=330,hover=S.hoverX>=x&&S.hoverX<=x+w&&S.hoverY>=y&&S.hoverY<=y+h,pressed=S.pressX>=x&&S.pressX<=x+w&&S.pressY>=y&&S.pressY<=y+h&&S.clock-S.pressAt<.16;const lift=reducedMotion.matches?0:pressed?2:hover?-2:0;panel(x,y+lift,w,h,mode==='lan'?'#f7f2e9':'#ed8490','#f7f2e9',20,mode==='lan'?'button-gold':'button-pink');art(mode==='lan'?'table-lan':'table-online',x+17,y+(h-58)/2+lift,58,58);txt(mode==='lan'?'PLAY ON WI-FI':'PLAY ONLINE',x+92,y+h*.37+lift,20,'#2c213e',900,'left');txt(mode==='lan'?'Join your friends automatically':'Create a room · invite your friends',x+92,y+h*.67+lift,11.5,'#46334f',700,'left',219);spots.push({x,y,w,h,fn:()=>openTable(mode,names[0]),label:mode==='lan'?'PLAY ON WI-FI':'PLAY ONLINE'})}
function stackChoice(x,y,w,h,name,count,color,fn,hint){const enabled=typeof fn==='function',hover=enabled&&S.hoverX>=x&&S.hoverX<=x+w&&S.hoverY>=y&&S.hoverY<=y+h,pressed=enabled&&S.pressX>=x&&S.pressX<=x+w&&S.pressY>=y&&S.pressY<=y+h&&S.clock-S.pressAt<.16;const lift=reducedMotion.matches?0:pressed?2:hover?-2:0;c.save();if(!enabled)c.globalAlpha=.48;panel(x,y+lift,w,h,'#403251',enabled?'#91d9c7':'#82718e',16);const r=Math.min(25,h*.31),cy=y+h/2+lift;for(let i=Math.min(count,3)-1;i>=0;i--)cardRect(x+15-i*2,cy-r-i*3,r*1.4,r*2,'back',null,color);txt(name,x+68,y+h*.32+lift,14,'#f7f2e9',900,'left',w-78);txt(hint,x+68,y+h*.67+lift,10,'#c9f5e8',800,'left',w-78);c.restore();if(enabled)spots.push({x,y,w,h,fn,label:`Choose ${name} stack`})}
function header(title,sub){if(!['place','add','bid','reveal'].includes(net.state?.stage))drawWordmark(195,H-25,60);art('arcade-nav',15,5,360,132);txt(title,195,93,title.length>16?20:24,'#fff2d6',900,'center',302);txt(sub,195,117,12,'#c9f5e8',800,'center',304)}
function cardChoice(x,y,r,type,count,fn){const hover=Math.hypot(S.hoverX-x,S.hoverY-y)<r+10;const pressed=Math.hypot(S.pressX-x,S.pressY-y)<r+10&&S.clock-S.pressAt<.16;const age=S.clock-S.phaseAt;const arrive=reducedMotion.matches?1:Math.min(1,.85+Math.max(0,age)*.45);const size=r*arrive*(reducedMotion.matches?1:pressed ? .91 : hover ? 1.09 : 1);disc(x,y,size,type);txt(type==='flower'?'SAFE FLOWER':'SKULL TRAP',x,y+r+13,13,type==='flower'?'#f7f2e9':'#ffb6cb',900);txt(`×${count}`,x+r-2,y-r+8,13,'#fff',900);spots.push({x:x-r-10,y:y-r-10,w:(r+10)*2,h:(r+10)*2,fn,label:type})}
function cardRect(x,y,w,h,type='back',fn=null,color=colors[0],label='',flipProgress=null) {
  const enabled=typeof fn==='function',hover=enabled&&S.hoverX>=x&&S.hoverX<=x+w&&S.hoverY>=y&&S.hoverY<=y+h;
  const pressed=enabled&&S.pressX>=x&&S.pressX<=x+w&&S.pressY>=y&&S.pressY<=y+h&&S.clock-S.pressAt<.18;
  const lift=reducedMotion.matches?0:pressed?3:hover?-4:0;
  c.save();if(flipProgress!==null&&!reducedMotion.matches){c.translate(x+w/2,y+h/2);c.scale(Math.max(.04,Math.abs(Math.cos(Math.PI*flipProgress))),1);c.translate(-x-w/2,-y-h/2);if(flipProgress<.5)type='back';}
  art(type==='back'?`card-played-${colorNames[colors.indexOf(color)]||'coral'}`:`card-${type}-new`,x,y+lift,w,h);
  c.restore();
  if(type==='back'){tint(x+w*.14,y+h*.13+lift,w*.72,3,color)}
  if(enabled){c.strokeStyle=hover?'#f7f2e9':'#91d9c7';c.lineWidth=hover?3:1.5;c.beginPath();c.roundRect(x,y+lift,w,h,10);c.stroke();spots.push({x,y,w,h,fn,label:label||`Play ${type} card`})}
}
function navButton(label,x,w,fn,icon){const y=10,h=62,hover=S.hoverX>=x&&S.hoverX<=x+w&&S.hoverY>=y&&S.hoverY<=y+h,pressed=S.pressX>=x&&S.pressX<=x+w&&S.pressY>=y&&S.pressY<=y+h&&S.clock-S.pressAt<.16;const d=reducedMotion.matches?0:pressed?3:hover?-2:0,size=48;art(`nav-${icon}`,x+(w-size)/2,y+d,size,size);txt(label,x+w/2,y+55,14,'#f7f2e9',900);if(hover){c.strokeStyle='#fff2d6';c.lineWidth=1.5;c.beginPath();c.arc(x+w/2,y+22+d,23,0,Math.PI*2);c.stroke()}spots.push({x,y,w,h,fn,label})}
function turnGlow(x,y,w,h,color,active){if(!active)return;c.save();c.globalAlpha=reducedMotion.matches ? .42 : .38+Math.sin(S.clock*3)*.16;c.strokeStyle=color;c.lineWidth=2.5;c.shadowColor=color;c.shadowBlur=10;c.beginPath();c.roundRect(x+2,y+2,w-4,h-7,17);c.stroke();c.restore()}
function updateMotion(){const state=net.state;if(!state?.seats){S.stackCounts=[];S.pointCounts=[];S.bidValue=0;S.soundStage='';S.flipCount=0;S.flipAt=-10;S.flipDisc='';return}const stacks=state.seats.map(p=>p.stack),points=state.seats.map(p=>p.wins);if(S.stackCounts.length===stacks.length)stacks.forEach((n,i)=>{if(n>S.stackCounts[i]){S.stackSeat=i;S.stackAt=S.clock}});if(S.pointCounts.length===points.length)points.forEach((n,i)=>{if(n>S.pointCounts[i]){S.pointSeat=i;S.pointAt=S.clock}});const discardKey=state.discarded?`${state.round}:${state.discarded.owner}:${state.discarded.index}:${state.discarded.disc}`:'';if(discardKey&&discardKey!==S.discardKey)S.discardAt=Math.max(S.clock,S.flipAt+1.25);S.discardKey=discardKey;if(state.bid>S.bidValue)S.bidAt=S.clock;if(state.flips.length>S.flipCount){const last=state.flips.at(-1);S.flipAt=S.clock;S.flipDisc=last.disc;S.flipOwner=last.owner}if(S.soundStage){const cue=state.stage==='win'&&S.soundStage!=='win'?'win':state.stage==='loss'&&S.soundStage!=='loss'?'skull':state.stage==='result'&&S.soundStage!=='result'&&state.resultKind==='flower'?'point':state.flips.length>S.flipCount?'flip':state.bid>S.bidValue?'bid':stacks.some((n,i)=>n>(S.stackCounts[i]||0))?'card':'';if(cue)playSfx(cue)}S.stackCounts=stacks;S.pointCounts=points;S.bidValue=state.bid;S.soundStage=state.stage;S.flipCount=state.flips.length}
function revealFeedback(){const age=S.clock-S.flipAt;if(!S.flipDisc||age<0||age>1.25)return false;const safe=S.flipDisc==='flower';art(safe?'reveal-safe':'reveal-skull',78,H-121,234,57);txt(age<.55?'OPENING CARD':safe?'SAFE · FLOWER':'FOUND SKULL',195,H-94,19,'#2c213e',900);return true}

function eventFeedback(){
  const state=net.state,age=S.clock-S.phaseAt;
  if(state?.stage==='reveal'&&!state.flips.length&&age<1.5){
    c.fillStyle='#1b1428da';c.fillRect(0,135,W,H-135);art('search-announcement',65,H*.30,260,144);
    txt(state.challenger===state.seat?'YOU ARE SEARCHING':`${state.seats[state.challenger].name.toUpperCase()} IS SEARCHING`,195,H*.55,23,'#f7f2e9',900,'center',340);
    txt(`FIND ${state.bid} FLOWER${state.bid===1?'':'S'} · AVOID THE SKULL`,195,H*.61,15,'#91d9c7',900);
  }
  const discardAge=S.clock-S.discardAt;
  if(state?.discarded&&discardAge>=0&&discardAge<1.2&&['result','win','choose-lead'].includes(state.stage)){
    c.fillStyle='#1b1428da';c.fillRect(0,135,W,H-135);const drop=reducedMotion.matches?1:Math.min(1,discardAge/.65);
    cardRect(167,H*.35+drop*62,56*(1-drop*.35),76*(1-drop*.35),state.discarded.disc);
    art('card-discard',110,H*.45,170,136);txt('ONE CARD THROWN AWAY',195,H*.69,20,'#ffb6cb',900);
  }
}
function effects(){if(reducedMotion.matches)return;const age=S.clock-S.phaseAt;const reward=net.state?.stage==='win'||net.state?.stage==='result'&&net.state?.resultKind==='flower';if(reward&&age<3){for(let i=0;i<34;i++){const x=(i*97+33)%390,y=((i*71+age*(85+i%5*13))%(H+50))-25;c.save();c.translate(x,y);c.rotate(age*2+i);c.globalAlpha=Math.min(1,age*5)*Math.max(0,1-age/3);c.fillStyle=[...colors,'#f7f2e9'][i%7];c.fillRect(-3,-5,6,10);c.restore()}}const click=S.clock-S.pressAt;if(click>=0&&click<.4){c.globalAlpha=(1-click/.4)*.7;c.strokeStyle='#f7f2e9';c.lineWidth=3;c.beginPath();c.arc(S.pressX,S.pressY,8+click*65,0,Math.PI*2);c.stroke();c.globalAlpha=1}}
function draw(){
  if(!canvas.width)return;
  const key=net.mode?`${net.mode}:${net.state?.stage||'setup'}:${net.state?.round||0}:${net.state?.resultKind||''}:${net.state?.flips?.length||0}`:S.phase;
  if(key!==S.phaseKey){S.phaseKey=key;S.phaseAt=S.clock}
  updateMotion();
  c.setTransform(scale,0,0,scale,0,0);
  spots=[];
  syncGameplayControls();
  bg();
  if(net.mode){drawTable({header,panel,txt,button,disc,cardChoice,cardRect,stackChoice,navButton,art,tint,turnGlow,H,colors,spots,clock:S.clock,phaseAge:S.clock-S.phaseAt,stackSeat:S.stackSeat,stackAge:S.clock-S.stackAt,bidAge:S.clock-S.bidAt,flipAge:S.clock-S.flipAt,pointSeat:S.pointSeat,pointAge:S.clock-S.pointAt,reducedMotion:reducedMotion.matches});effects();revealFeedback();eventFeedback();if(qaMode&&window.render_game_to_text)canvas.dataset.gameState=window.render_game_to_text();return}
  const short=H<700,heroY=Math.min(160,H*.19),modeY=Math.max(heroY+(short?160:181),H*.43),tileHeight=short?88:96;
  logo(heroY,short?280:330);
  txt('Find flowers. Avoid skulls. Win 2 points.',195,heroY+(short?116:131),15,'#f7f2e9',800,'center',340);
  txt('HOW ARE YOU PLAYING?',195,modeY-22,12,'#91d9c7',900);
  tableChoice('lan',modeY,tileHeight);
  tableChoice('internet',modeY+tileHeight+16,tileHeight);
  if(H-80-(modeY+tileHeight*2+16)>100){disc(174,H-150,28,'flower',colors[0],-.15);disc(218,H-143,28,'skull',colors[0],.15);}
  if(!installed)button('↓ INSTALL APP',100,H-80,190,44,installApp,'dark');
  txt('3–6 players  ·  one private hand per phone',195,H-18,11,'#bdb1d2',700);
  navButton(soundEnabled()?'SOUND':'MUTED',16,64,()=>{toggleSound();draw()},soundEnabled()?'sound':'mute');
  navButton('RULES',310,64,showRulebook,'help');
}
canvas.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();S.hoverX=(e.clientX-r.left)*390/r.width;S.hoverY=(e.clientY-r.top)*H/r.height;const hovered=spots.find(a=>S.hoverX>=a.x&&S.hoverX<=a.x+a.w&&S.hoverY>=a.y&&S.hoverY<=a.y+a.h);if(hovered?.label!==S.hoverLabel){if(hovered)playSfx('hover');S.hoverLabel=hovered?.label||''}canvas.style.cursor=hovered?'pointer':'default';draw()});canvas.addEventListener('pointerleave',()=>{S.hoverX=-100;S.hoverY=-100;S.hoverLabel='';canvas.style.cursor='default';draw()});
canvas.addEventListener('pointerup',e=>{if(e.pointerType==='touch'){S.hoverX=-100;S.hoverY=-100;draw()}});canvas.addEventListener('pointercancel',()=>{S.hoverX=-100;S.hoverY=-100;draw()});
canvas.addEventListener('pointerdown',e=>{if(net.mode&&(S.clock-S.flipAt<1.25||net.state?.stage==='reveal'&&!net.state.flips.length&&S.clock-S.phaseAt<1.5||net.state?.discarded&&S.clock-S.discardAt<1.2))return;const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*390/r.width,y=(e.clientY-r.top)*H/r.height;for(let i=spots.length-1;i>=0;i--){let a=spots[i];if(x>=a.x&&x<=a.x+a.w&&y>=a.y&&y<=a.y+a.h){S.pressX=x;S.pressY=y;S.pressAt=S.clock;playSfx('tap');a.fn();draw();return}}});addEventListener('keydown',e=>{if(e.key.toLowerCase()==='f'){if(document.fullscreenElement)document.exitFullscreen();else canvas.requestFullscreen?.()}});
window.advanceTime=ms=>{S.clock+=ms/1000;draw()};window.render_game_to_text=()=>JSON.stringify(net.mode?{coordinates:'canvas 390 units wide; origin top-left, y down',mode:net.mode,connected:net.connected,error:net.error,state:net.state,rooms:net.rooms,revealFeedback:S.clock-S.flipAt<1.25?S.flipDisc==='skull'?'Found Skull':'Safe':null,actions:[...spots.map(a=>a.label),...Array.from(document.querySelectorAll('#quick-bids:not([hidden]) button, #table-cards:not([hidden]) button:not(:disabled), #reveal-confirm:not([hidden]):not(:disabled)'),b=>b.getAttribute('aria-label')||b.textContent)]}:{coordinates:'canvas 390 units wide; origin top-left, y down',phase:S.phase,actions:spots.map(a=>a.label)});net.onChange=draw;resize();let previous=0,lastFrame=0;function frame(now){S.clock+=Math.min((now-previous)/1000,.05);if((!reducedMotion.matches||S.clock-S.flipAt<1.3||net.state?.stage==='reveal'&&!net.state.flips.length&&S.clock-S.phaseAt<1.6||net.state?.discarded&&S.clock-S.discardAt<1.3)&&now-lastFrame>=33){draw();lastFrame=now}previous=now;requestAnimationFrame(frame)}requestAnimationFrame(frame);const query=new URLSearchParams(location.search),tableFromUrl=query.get('table');if(tableFromUrl==='lan'||tableFromUrl==='internet'){openTable(tableFromUrl,names[0],query.get('code')||'');}else resumeLast();if('serviceWorker'in navigator)navigator.serviceWorker.register(import.meta.env.BASE_URL+'sw.js').catch(()=>{});
