import './style.css';
import {syncNavigation} from './navigation.js';
import {arcadeEvents} from './arcade-events.js';
import {pulse} from './haptics.js';
let previousArcadeState=null;
import {syncFeedback} from './feedback.js';
import {decorateDialog} from './dialogs.js';
import {releasedTap,feedbackBlocksInput} from './input.js';
import {syncCanvasControls} from './accessible-controls.js';
import { net, openTable, resumeLast, drawTable, returnToArcade, editName } from './network.js';
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
addEventListener('bones-name-changed',event=>{names[0]=event.detail;draw();});
let installPrompt=null;
const standaloneMode=matchMedia('(display-mode: standalone)');
let installed=standaloneMode.matches || navigator.standalone === true;
standaloneMode.addEventListener('change',event=>{installed=event.matches||navigator.standalone===true;draw();});
addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;draw()});
addEventListener('appinstalled',()=>{installed=true;installPrompt=null;draw()});
async function installApp(){
  if(installPrompt){const prompt=installPrompt;installPrompt=null;await prompt.prompt();draw();return}
  const dialog=document.createElement('dialog');dialog.id='install-help';
  const title=document.createElement('h2');title.textContent='INSTALL BONES';dialog.append(title);
  const message=document.createElement('p');message.textContent=!isSecureContext?'Install BONES from its public HTTPS page. Local Wi-Fi play still works here.':/iPad|iPhone|iPod/.test(navigator.userAgent)?'In Safari, tap Share, then Add to Home Screen.':'Open your browser menu and choose Install app or Add to Home Screen.';dialog.append(message);
  const close=document.createElement('button');close.textContent='GOT IT';close.onclick=()=>dialog.close();dialog.append(close);
  dialog.addEventListener('close',()=>dialog.remove());document.body.append(dialog);decorateDialog(dialog,'nav-home');dialog.showModal();
}
const S={phase:'menu',clock:0,hoverX:-100,hoverY:-100,hoverLabel:'',pressX:0,pressY:0,pressAt:-10,phaseKey:'',phaseAt:0,stackCounts:[],stackSeat:-1,stackAt:-10,bidValue:0,bidAt:-10,pointCounts:[],pointSeat:-1,pointAt:-10,soundStage:'',flipCount:0,flipAt:-10,flipDisc:'',flipOwner:-1,discardKey:'',discardAt:-10};
let W=390,H=844,scale=1,verticalScale=1,displayScale=1,spots=[];
const assetNames=['menu-box','text-box','player-mat','button-gold','button-pink','button-ink','card-back','card-flower','card-skull','reveal-safe','reveal-skull','table-lan','table-online','point-badge','winner-crown','card-flower-new','card-skull-new','card-back-new','bid-number-tile','bid-spotlight','search-announcement','skull-loss','card-discard','victory-arcade','arcade-nav','shared-table','hand-tray','discard-slot',...colorNames.map(name=>`seat-${name}`),'mascot-flower','mascot-skull',...['sound','mute','help','rooms','host','home'].map(name=>`nav-${name}`),...colorNames.map(name=>`card-played-${name}`),...colorNames.map(name=>`card-back-${name}`)];
const assets=Object.fromEntries(assetNames.map(name=>{const image=new Image();image.onload=()=>draw();image.src=`${import.meta.env.BASE_URL}assets/${name}.svg`;return[name,image]}));
const wordmark=new Image();wordmark.onload=()=>draw();wordmark.src=`${import.meta.env.BASE_URL}assets/bones-platform-logo.png`;
function seatAvatar(seat,x,y,size){const image=assets[`seat-${colorNames[seat]}`];if(!image?.naturalWidth)return;c.save();c.translate(x,y);c.scale(size/28*verticalScale/scale,size/28);c.beginPath();c.rect(0,0,28,28);c.clip();c.drawImage(image,-5,-4,168,68);c.restore();}
function art(name,x,y,w,h){
 const image=assets[name];if(!image?.naturalWidth)return false;
 if(/^(button-|hand-tray|player-mat|menu-box|text-box)/.test(name)){c.drawImage(image,x,y,w,h);return true}
 c.save();c.translate(x+w/2,y+h/2);const m=c.getTransform();
 c.setTransform(m.a*verticalScale/scale,m.b,m.c*verticalScale/scale,m.d,m.e,m.f);
 c.drawImage(image,-w/2,-h/2,w,h);c.restore();return true;
}
const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
const reducedMotion={get matches(){return motionPreference.matches||qaMode&&new URLSearchParams(location.search).get('motion')==='reduce'}};
function resize(){const rect=canvas.getBoundingClientRect();const size=canvasGeometry(rect.width,rect.height,devicePixelRatio);if(canvas.width!==size.pixelWidth||canvas.height!==size.pixelHeight){canvas.width=size.pixelWidth;canvas.height=size.pixelHeight}scale=size.scale;verticalScale=size.verticalScale;W=390;H=size.logicalHeight;canvas.dataset.logicalHeight=H;draw()}addEventListener('resize',resize);addEventListener('scroll',()=>draw(),{capture:true,passive:true});new ResizeObserver(resize).observe(canvas);
function panel(x,y,w,h,fill='#403251',stroke='#82718e',r=20,design){if(design&&art(design,x,y,w,h))return;c.beginPath();c.roundRect(x,y,w,h,{x:r*verticalScale/scale,y:r});c.fillStyle=fill;c.fill();c.lineWidth=2;c.strokeStyle=stroke;c.stroke()}
function tint(x,y,w,h,color){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,3);c.fill()}
const textArrivals=new Map();
function txt(t,x,y,size=18,color='#fff',weight=700,align='center',maxWidth){
 c.fillStyle=color;const physicalScale=displayScale;if(maxWidth)maxWidth*=scale/verticalScale;
 c.font=`${weight} ${Math.max(size,12/physicalScale)}px system-ui, sans-serif`;c.textAlign=align;c.textBaseline='middle';
 let label=String(t);if(maxWidth&&c.measureText(label).width>maxWidth){while(label.length&&c.measureText(label+'…').width>maxWidth)label=label.slice(0,-1);label+='…';}
 const key=`${x}:${y}:${align}:${size}`,previous=textArrivals.get(key);
 if(!previous||previous.label!==label)textArrivals.set(key,{label,at:S.clock});
 const age=S.clock-textArrivals.get(key).at,progress=reducedMotion.matches?1:Math.min(1,Math.max(0,age/.28)),ease=1-(1-progress)**3;
 c.save();c.translate(x,y+(1-ease)*4);c.scale(verticalScale/scale,1);c.globalAlpha*=.65+.35*ease;c.fillText(label,0,0);c.restore();
}
function button(label,x,y,w,h,fn,kind='gold'){h=Math.max(h,44/displayScale);const enabled=typeof fn==='function';const hover=enabled&&S.hoverX>=x&&S.hoverX<=x+w&&S.hoverY>=y&&S.hoverY<=y+h;const press=enabled&&S.pressX>=x&&S.pressX<=x+w&&S.pressY>=y&&S.pressY<=y+h&&S.clock-S.pressAt<.16;const d=reducedMotion.matches?0:press?-Math.sin(Math.max(0,S.clock-S.pressAt)/.16*Math.PI)*2:hover?2:0;c.save();if(!enabled||net.mode&&(net.pendingAction||net.connecting||!net.connected))c.globalAlpha=.48;panel(x-d,y-d,w+d*2,h+d*2,kind==='gold'?'#f2ece3':kind==='pink'?'#ee8a96':'#514064',kind==='gold'?'#fff9ef':kind==='pink'?'#f7b3b9':'#81708f',15,`button-${kind==='dark'?'ink':kind}`);txt(label,x+w/2,y+h/2+(press?1:0),Math.min(18,w/Math.max(5,label.length)*1.7),kind==='dark'?'#fff':'#2c213e',800);c.restore();if(enabled)spots.push({x,y,w,h,fn,label})}
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
function drawWordmark(cx,cy,w){if(!wordmark.naturalWidth)return false;const sy=wordmark.naturalHeight*.28,sh=wordmark.naturalHeight*.45,h=w*sh/wordmark.naturalWidth;c.drawImage(wordmark,0,sy,wordmark.naturalWidth,sh,cx-w*verticalScale/scale/2,cy-h/2,w*verticalScale/scale,h);return true}
function logo(y=138,w=330){c.save();c.translate(0,reducedMotion.matches?0:Math.sin(S.clock*1.7)*2);if(!drawWordmark(195,y,w))txt('BONES',195,y,60,'#f7f2e9',1000);txt('THE BLUFFING GAME',195,y+w*.285,13,'#a9e5dd',900);c.restore()}
function homeCardFan(cy){
 const age=Math.max(0,S.clock-S.phaseAt),arrive=reducedMotion.matches?1:1-(1-Math.min(1,age/.65))**3;
 const bob=reducedMotion.matches?0:Math.sin(S.clock*1.2)*3;
 c.save();c.globalAlpha=arrive;c.translate(195,cy+18*(1-arrive)+bob);
 c.fillStyle='#100d2366';c.beginPath();c.ellipse(0,61,126,14,0,0,Math.PI*2);c.fill();
 for(const [x,y,angle,type,col] of [[-66,7,-.23,'back',colors[1]],[65,7,.23,'skull',colors[0]],[0,-7,-.04,'flower',colors[0]]]){
  c.save();c.translate(x,y);c.rotate(angle*arrive);cardRect(-37,-51,74,102,type,null,col);c.restore();
 }
 c.restore();
 for(const [x,y,col] of [[65,cy-39,'#91d9c7'],[320,cy-10,'#ee8a96'],[299,cy+49,'#f7f2e9']]){
  const size=reducedMotion.matches?5:5+Math.sin(S.clock*1.6+x)*1.2;c.save();c.translate(x,y);c.strokeStyle=col;c.lineWidth=2;c.beginPath();c.moveTo(-size,0);c.lineTo(size,0);c.moveTo(0,-size);c.lineTo(0,size);c.stroke();c.restore();
 }
}
function tableChoice(mode,y,h){const x=30,w=330,hover=S.hoverX>=x&&S.hoverX<=x+w&&S.hoverY>=y&&S.hoverY<=y+h,pressed=S.pressX>=x&&S.pressX<=x+w&&S.pressY>=y&&S.pressY<=y+h&&S.clock-S.pressAt<.16;const lift=reducedMotion.matches?0:pressed?2:hover?-2:0;panel(x,y+lift,w,h,mode==='lan'?'#f7f2e9':'#ed8490','#f7f2e9',20,mode==='lan'?'button-gold':'button-pink');art(mode==='lan'?'table-lan':'table-online',x+17,y+(h-58)/2+lift,58,58);txt(mode==='lan'?'PLAY ON WI-FI':'PLAY ONLINE',x+92,y+h*.37+lift,20,'#2c213e',900,'left');txt(mode==='lan'?'Local host · offline play':'Create room · internet',x+92,y+h*.67+lift,11.5,'#46334f',700,'left',219);spots.push({x,y,w,h,fn:()=>openTable(mode,names[0]),label:mode==='lan'?'PLAY ON WI-FI':'PLAY ONLINE'})}
function stackChoice(x,y,w,h,name,count,color,fn,hint){const enabled=typeof fn==='function',hover=enabled&&S.hoverX>=x&&S.hoverX<=x+w&&S.hoverY>=y&&S.hoverY<=y+h,pressed=enabled&&S.pressX>=x&&S.pressX<=x+w&&S.pressY>=y&&S.pressY<=y+h&&S.clock-S.pressAt<.16;const lift=reducedMotion.matches?0:pressed?2:hover?-2:0;c.save();if(!enabled||net.mode&&(net.pendingAction||net.connecting||!net.connected))c.globalAlpha=.48;panel(x,y+lift,w,h,'#403251',enabled?'#91d9c7':'#82718e',16);const r=Math.min(25,h*.31),cy=y+h/2+lift;for(let i=Math.min(count,3)-1;i>=0;i--)cardRect(x+15-i*2,cy-r-i*3,r*1.4,r*2,'back',null,color);txt(name,x+68,y+h*.32+lift,14,'#f7f2e9',900,'left',w-78);txt(hint,x+68,y+h*.67+lift,10,'#c9f5e8',800,'left',w-78);c.restore();if(enabled)spots.push({x,y,w,h,fn,label:`Choose ${name} stack`})}
function emptySeat(x,y,w,h,fn,label){
 c.save();c.fillStyle='#241b3855';c.strokeStyle='#89759b';c.lineWidth=1.5;c.setLineDash([5,5]);c.beginPath();c.roundRect(x,y,w,h,16);c.fill();c.stroke();c.setLineDash([]);
 const pressed=S.clock-S.pressAt<.2&&Math.abs(S.pressX-x-w/2)<w/2&&Math.abs(S.pressY-y-h/2)<h/2;
 c.translate(x+w/2,y+35);c.scale(verticalScale/scale,1);if(pressed&&!reducedMotion.matches)c.scale(.9,.9);
 c.strokeStyle=fn?'#91d9c7':'#b6a8c5';c.lineWidth=2;c.beginPath();c.arc(0,0,14,0,Math.PI*2);c.stroke();c.beginPath();c.moveTo(-6,0);c.lineTo(6,0);c.moveTo(0,-6);c.lineTo(0,6);c.stroke();c.restore();
 txt(fn?'Add bot':'Empty seat',x+w/2,y+70,13,fn?'#c9f5e8':'#bfb1ce',700);if(fn)spots.push({x,y,w,h,fn,label});
}
function flowerBadge(x,y,count){
 c.save();c.translate(x,y);c.scale(verticalScale/scale,1);c.fillStyle='#ee8a96';for(let i=0;i<5;i++){const a=i*Math.PI*2/5;c.beginPath();c.arc(Math.cos(a)*5,Math.sin(a)*5,4,0,Math.PI*2);c.fill();}c.fillStyle='#ffd981';c.beginPath();c.arc(0,0,3,0,Math.PI*2);c.fill();c.restore();if(count>1)txt(count,x+15,y,12,'#ffd981',900,'left');
}
function seatControl(x,y,glyph,fn,label){
 c.save();if(!fn)c.globalAlpha=.35;
 const age=S.clock-S.pressAt,pressed=Math.abs(S.pressX-x)<24&&Math.abs(S.pressY-y)<24&&age>=0&&age<.22;
 const pop=reducedMotion.matches?0:pressed?Math.sin(age/.22*Math.PI)*2:0;
 panel(x-14+pop,y-14+pop,28-pop*2,28-pop*2,'#352a4c','#8d7b9d',9);txt(glyph,x,y,20,'#f7f2e9',700);
 c.restore();const size=44/displayScale;if(fn)spots.push({x:x-size/2,y:y-size/2,w:size,h:size,fn,label});
}
function cardCount(x,y,count,color){c.save();c.translate(x,y);c.scale(verticalScale/scale,1);c.strokeStyle=color;c.lineWidth=1.5;c.beginPath();c.roundRect(0,-8,11,15,2);c.stroke();c.beginPath();c.roundRect(4,-5,11,15,2);c.stroke();c.restore();txt(count,x+23*verticalScale/scale,y+1,14,color,900,'left');}
function header(title,sub){txt(title,195,84,title.length>16?22:25,'#f7f2e9',900,'center',340);txt(sub,195,113,12,'#c9f5e8',700,'center',340)}
function cardChoice(x,y,r,type,count,fn){const hover=Math.hypot(S.hoverX-x,S.hoverY-y)<r+10;const pressed=Math.hypot(S.pressX-x,S.pressY-y)<r+10&&S.clock-S.pressAt<.16;const age=S.clock-S.phaseAt;const arrive=reducedMotion.matches?1:Math.min(1,.85+Math.max(0,age)*.45);const size=r*arrive*(reducedMotion.matches?1:pressed ? .91 : hover ? 1.09 : 1);disc(x,y,size,type);txt(type==='flower'?'SAFE FLOWER':'SKULL TRAP',x,y+r+13,13,type==='flower'?'#f7f2e9':'#ffb6cb',900);txt(`×${count}`,x+r-2,y-r+8,13,'#fff',900);spots.push({x:x-r-10,y:y-r-10,w:(r+10)*2,h:(r+10)*2,fn,label:type})}
function cardRect(x,y,w,h,type='back',fn=null,color=colors[0],label='',flipProgress=null) {
  const enabled=typeof fn==='function',hover=enabled&&S.hoverX>=x&&S.hoverX<=x+w&&S.hoverY>=y&&S.hoverY<=y+h;
  const pressed=enabled&&S.pressX>=x&&S.pressX<=x+w&&S.pressY>=y&&S.pressY<=y+h&&S.clock-S.pressAt<.18;
  const lift=reducedMotion.matches?0:pressed?3:hover?-4:0;
  c.save();if(flipProgress!==null&&!reducedMotion.matches){c.translate(x+w/2,y+h/2);c.scale(Math.max(.04,Math.abs(Math.cos(Math.PI*flipProgress))),1);c.translate(-x-w/2,-y-h/2);if(flipProgress<.5)type='back';}
  art(type==='back'?`card-played-${colorNames[colors.indexOf(color)]||'coral'}`:`card-${type}-new`,x,y+lift,w,h);
  c.restore();
  const visualW=w*verticalScale/scale,visualX=x+(w-visualW)/2;
  if(type==='back'){tint(visualX+visualW*.14,y+h*.13+lift,visualW*.72,3,color)}
  if(enabled){c.strokeStyle=hover?'#f7f2e9':'#91d9c7';c.lineWidth=hover?3:1.5;c.beginPath();c.roundRect(visualX,y+lift,visualW,h,{x:10*verticalScale/scale,y:10});c.stroke();spots.push({x:visualX,y,w:visualW,h,fn,label:label||`Play ${type} card`})}
}

function turnGlow(x,y,w,h,color,active){if(!active)return;c.save();c.globalAlpha=reducedMotion.matches ? .42 : .38+Math.sin(S.clock*3)*.16;c.strokeStyle=color;c.lineWidth=3.5;c.shadowColor=color;c.shadowBlur=10;c.beginPath();c.roundRect(x+2,y+2,w-4,h-7,17);c.stroke();c.restore()}
function updateMotion(){const state=net.state;const events=arcadeEvents(previousArcadeState,state);previousArcadeState=state;if(events.turn)playSfx('turn');if(events.safe)playSfx('safe');for(const kind of ['turn','bid','safe','skull','point'])if(events[kind])pulse(kind);if(state?.stage==='win'&&S.soundStage!=='win')pulse('win');if(!state?.seats){S.stackCounts=[];S.pointCounts=[];S.bidValue=0;S.soundStage='';S.flipCount=0;S.flipAt=-10;S.flipDisc='';return}const stacks=state.seats.map(p=>p.stack),points=state.seats.map(p=>p.wins);if(!S.soundStage){S.flipCount=state.flips.length;S.bidValue=state.bid;S.stackCounts=stacks;S.pointCounts=points;S.discardKey=state.discarded?`${state.round}:${state.discarded.owner}:${state.discarded.index}:${state.discarded.disc}`:'';}if(S.stackCounts.length===stacks.length)stacks.forEach((n,i)=>{if(n>S.stackCounts[i]){S.stackSeat=i;S.stackAt=S.clock}});if(S.pointCounts.length===points.length)points.forEach((n,i)=>{if(n>S.pointCounts[i]){S.pointSeat=i;S.pointAt=S.clock}});const discardKey=state.discarded?`${state.round}:${state.discarded.owner}:${state.discarded.index}:${state.discarded.disc}`:'';if(discardKey&&discardKey!==S.discardKey)S.discardAt=Math.max(S.clock,S.flipAt+1.25);S.discardKey=discardKey;if(state.bid>S.bidValue)S.bidAt=S.clock;if(state.flips.length>S.flipCount){const last=state.flips.at(-1);S.flipAt=S.clock;S.flipDisc=last.disc;S.flipOwner=last.owner;S.flipDisplayState={...state,stage:'reveal'}}if(S.soundStage){const cue=state.stage==='win'&&S.soundStage!=='win'?'win':state.stage==='loss'&&S.soundStage!=='loss'?'skull':state.stage==='result'&&S.soundStage!=='result'&&state.resultKind==='flower'?'point':state.flips.length>S.flipCount?'flip':state.bid>S.bidValue?'bid':stacks.some((n,i)=>n>(S.stackCounts[i]||0))?'card':'';if(cue)playSfx(cue)}S.stackCounts=stacks;S.pointCounts=points;S.bidValue=state.bid;S.soundStage=state.stage;S.flipCount=state.flips.length}
function eventFeedback(){
  const state=net.state,age=S.clock-S.phaseAt;
  const reactionAge=S.clock-S.flipAt;
  if(state&&S.flipDisc&&reactionAge>=.55&&reactionAge<1.25){
    art(S.flipDisc==='flower'?'mascot-flower':'mascot-skull',20,H-113,48,48);
  }

  if(state?.stage==='reveal'&&!state.flips.length&&age<1.5){
    c.fillStyle='#1b1428da';c.fillRect(0,65,W,H-65);art('search-announcement',65,H*.30,260,144);
    txt(state.challenger===state.seat?'YOU ARE SEARCHING':`${state.seats[state.challenger].name.toUpperCase()} IS SEARCHING`,195,H*.55,23,'#f7f2e9',900,'center',340);
    txt(`FIND ${state.bid} FLOWER${state.bid===1?'':'S'} · AVOID THE SKULL`,195,H*.61,15,'#91d9c7',900);
  }
  const discardAge=S.clock-S.discardAt;
  if(state?.discarded&&S.clock-S.flipAt>=1.45&&discardAge>=0&&discardAge<1.2&&['result','win','choose-lead'].includes(state.stage)){
    c.fillStyle='#1b1428da';c.fillRect(0,65,W,H-65);const drop=reducedMotion.matches?1:Math.min(1,discardAge/.65);
    c.save();c.globalAlpha=1-drop*.85;cardRect(167,H*.32+drop*95,56*(1-drop*.6),76*(1-drop*.6),state.discarded.disc);c.restore();
    art('discard-slot',135,H*.45,120,100);txt('ONE CARD THROWN AWAY',195,H*.69,20,'#ffb6cb',900);
  }
}
function flowerConfetti(age){
 if(age<0||age>3.6)return;
 const fade=Math.min(1,age*5)*Math.min(1,(3.6-age)/.8);
 for(let i=0;i<42;i++){
  const delay=(i%7)*.07,t=Math.max(0,age-delay),x=(i*97+19)%390+Math.sin(t*2+i)*20,y=-35+(i*53)%(H*.48)+t*(110+i%6*18);
  if(y>H-165)continue;
  c.save();c.translate(x,y);c.rotate(i+t*(i%2?1:-1));c.globalAlpha=fade;c.fillStyle=[...colors,'#f7f2e9'][i%7];
  const r=4+i%3;
  for(let petal=0;petal<5;petal++){const angle=petal*Math.PI*2/5;c.beginPath();c.ellipse(Math.cos(angle)*r,Math.sin(angle)*r,r*.7,r*.95,angle,0,Math.PI*2);c.fill();}
  c.fillStyle='#ffd981';c.beginPath();c.arc(0,0,r*.55,0,Math.PI*2);c.fill();c.restore();
 }
}
function effects(){
 if(reducedMotion.matches)return;
 const age=S.clock-S.phaseAt;
 if(net.state?.stage==='win'){if(S.clock-S.flipAt>=1.45)flowerConfetti(age);}
 else if(net.state?.stage==='result'&&net.state?.resultKind==='flower'&&age<1.8&&S.clock-S.flipAt>=1.45){for(let i=0;i<24;i++){c.save();c.translate((i*97+33)%390,((i*71+age*100)%(H+50))-25);c.rotate(age*2+i);c.globalAlpha=Math.min(1,age*5)*Math.max(0,1-age/1.8);c.fillStyle=colors[i%6];c.fillRect(-3,-5,6,10);c.restore();}}
 const click=S.clock-S.pressAt;if(click>=0&&click<.4){c.globalAlpha=(1-click/.4)*.7;c.strokeStyle='#f7f2e9';c.lineWidth=3;c.beginPath();c.arc(S.pressX,S.pressY,8+click*65,0,Math.PI*2);c.stroke();c.globalAlpha=1}
}
const drawSamples=[];
let layoutReads=0;
if(qaMode){const readRect=canvas.getBoundingClientRect.bind(canvas);canvas.getBoundingClientRect=()=>{layoutReads++;return readRect()};}
function draw(){
 if(!qaMode){drawFrame();return;}
 layoutReads=0;const start=performance.now();drawFrame();
 drawSamples.push({ms:performance.now()-start,reads:layoutReads});if(drawSamples.length>240)drawSamples.shift();
 if(drawSamples.length%10===0){const times=drawSamples.map(s=>s.ms).sort((a,b)=>a-b);canvas.dataset.renderProfile=JSON.stringify({samples:times.length,medianMs:+times[Math.floor(times.length*.5)].toFixed(3),p95Ms:+times[Math.floor(times.length*.95)].toFixed(3),meanLayoutReads:+(drawSamples.reduce((n,s)=>n+s.reads,0)/times.length).toFixed(1),stage:net.state?.stage||'home'});}
}
function drawFrame(){
  if(!canvas.width)return;
  canvas.dataset.table=String(!!net.state);
  displayScale=canvas.getBoundingClientRect().height/H;
  const key=net.mode?`${net.mode}:${net.state?.stage||'setup'}:${net.state?.round||0}:${net.state?.resultKind||''}:${net.state?.flips?.length||0}`:S.phase;
  if(key!==S.phaseKey){textArrivals.clear();S.phaseKey=key;S.phaseAt=S.clock}
  updateMotion();
  c.setTransform(scale,0,0,verticalScale,0,0);
  spots=[];
  syncGameplayControls();
  syncFeedback(net,canvas);
  bg();
  if(net.mode){drawTable({displayState:S.flipDisc&&S.clock-S.flipAt<1.45&&!reducedMotion.matches&&['loss','result','win'].includes(net.state?.stage)?S.flipDisplayState:null,header,panel,txt,button,disc,cardChoice,cardRect,stackChoice,navigation:syncNavigation,art,seatAvatar,cardCount,flowerBadge,seatControl,emptySeat,tint,turnGlow,H,colors,spots,clock:S.clock,phaseAge:S.clock-S.phaseAt,stackSeat:S.stackSeat,stackAge:S.clock-S.stackAt,bidAge:S.clock-S.bidAt,flipAge:S.clock-S.flipAt,pointSeat:S.pointSeat,pointAge:S.clock-S.pointAt,reducedMotion:reducedMotion.matches});effects();eventFeedback();syncCanvasControls(canvas,spots,activateSpot,pressSpot,!!inputBlocked());if(qaMode&&window.render_game_to_text)canvas.dataset.gameState=window.render_game_to_text();return}
  const pencilWiggle=reducedMotion.matches?0:Math.sin(S.clock*2)*.08;
  txt(names[0],332,28,14,'#c9f5e8',800,'right',195);
  c.save();c.translate(350,28);c.scale(verticalScale/scale,1);c.rotate(-.4+pencilWiggle);c.strokeStyle='#91d9c7';c.lineWidth=2;c.beginPath();c.roundRect(-3,-9,6,16,1);c.moveTo(-3,7);c.lineTo(0,11);c.lineTo(3,7);c.stroke();c.restore();
  spots.push({x:128,y:6,w:238,h:44/displayScale,label:`Change name: ${names[0]}`,fn:()=>editName(names[0],{local:true})});
  const short=H<740,heroY=100,modeY=Math.max(365,H*.55),tileHeight=short?80:96;
  logo(heroY,260);
  txt('Sweet flowers. Sneaky skulls.',195,198,16,'#f7f2e9',800,'center',340);
  homeCardFan(Math.min(modeY-104,276));
  txt('FRIENDS. FLOWERS. A LITTLE DECEPTION.',195,modeY-19,10,'#c9f5e8',900,'center',340);
  tableChoice('lan',modeY,tileHeight);
  tableChoice('internet',modeY+tileHeight+14,tileHeight);
  c.save();c.translate(51,H-39);c.scale(verticalScale/scale,1);c.translate(-51,-H+39);c.strokeStyle='#bdb1d2';c.lineWidth=2;for(const x of [45,57]){c.beginPath();c.arc(x,H-46,4,0,Math.PI*2);c.stroke();c.beginPath();c.arc(x,H-32,8,Math.PI,0);c.stroke();}c.restore();
  txt('3–6',78,H-39,14,'#bdb1d2',800,'left');
  canvas.setAttribute('aria-label',`BONES bluffing game. Playing as ${names[0]}. For 3 to 6 players.`);
  syncNavigation([[soundEnabled()?'SOUND':'MUTED',()=>{toggleSound();draw()},soundEnabled()?'sound':'mute'],['RULES',showRulebook,'help'],...(!installed?[['INSTALL BONES',installApp,'home']]:[]),['JOIN ONLINE ROOM',()=>openTable('internet',names[0],'',false,true),'rooms'],['DECADENCE ARCADE',returnToArcade,'home']]);
  syncCanvasControls(canvas,spots,activateSpot,pressSpot,!!inputBlocked());
}
canvas.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();S.hoverX=(e.clientX-r.left)*390/r.width;S.hoverY=(e.clientY-r.top)*H/r.height;const hovered=spots.find(a=>S.hoverX>=a.x&&S.hoverX<=a.x+a.w&&S.hoverY>=a.y&&S.hoverY<=a.y+a.h);if(hovered?.label!==S.hoverLabel){if(hovered)playSfx('hover');S.hoverLabel=hovered?.label||''}canvas.style.cursor=hovered?'pointer':'default';draw()});canvas.addEventListener('pointerleave',()=>{S.hoverX=-100;S.hoverY=-100;S.hoverLabel='';canvas.style.cursor='default';draw()});
let tapStart=null;
function inputBlocked(){return net.mode&&(net.pendingAction||net.connecting||!net.connected||feedbackBlocksInput(net.state,{flipAge:S.clock-S.flipAt,phaseAge:S.clock-S.phaseAt,discardAge:S.clock-S.discardAt}));}
function pressSpot(spot){if(document.querySelector('dialog[open]')||inputBlocked())return;S.pressX=spot.x+spot.w/2;S.pressY=spot.y+spot.h/2;S.pressAt=S.clock;draw();}
function activateSpot(spot){if(document.querySelector('dialog[open]')||!document.querySelector('#table-setup').hidden)return;pulse('tap');const navigation=['SOUND','MUTED','RULES','ROOMS','HOST','HOME','BONES HOME','BACK'];if(inputBlocked()&&!navigation.includes(spot.label))return;S.pressX=spot.x+spot.w/2;S.pressY=spot.y+spot.h/2;S.pressAt=S.clock;spot.fn();draw();}
canvas.addEventListener('pointerdown',e=>{const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*390/r.width,y=(e.clientY-r.top)*H/r.height;const spot=[...spots].reverse().find(a=>x>=a.x&&x<=a.x+a.w&&y>=a.y&&y<=a.y+a.h);tapStart={pointerId:e.pointerId,x:e.clientX,y:e.clientY,label:spot?.label};});
canvas.addEventListener('pointerup',e=>{const start=tapStart;tapStart=null;if(releasedTap(start,{pointerId:e.pointerId,x:e.clientX,y:e.clientY})){const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*390/r.width,y=(e.clientY-r.top)*H/r.height;const spot=[...spots].reverse().find(a=>x>=a.x&&x<=a.x+a.w&&y>=a.y&&y<=a.y+a.h);if(spot&&spot.label===start.label){playSfx('tap');activateSpot(spot);}}if(e.pointerType==='touch'){S.hoverX=-100;S.hoverY=-100;draw();}});
canvas.addEventListener('pointercancel',()=>{tapStart=null;S.hoverX=-100;S.hoverY=-100;draw()});
addEventListener('keydown',e=>{if(e.repeat||e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement||document.querySelector('dialog[open]'))return;if(e.key.toLowerCase()==='f'){e.preventDefault();const request=document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen?.();request?.catch(()=>{net.notice='Full screen is unavailable here. Keep playing in this window.';draw()});}});
window.advanceTime=ms=>{S.clock+=ms/1000;draw()};window.render_game_to_text=()=>JSON.stringify(net.mode?{coordinates:'canvas 390 units wide; origin top-left, y down',mode:net.mode,connected:net.connected,error:net.error,modal:document.querySelector('dialog[open]')?.getAttribute('aria-label')||document.querySelector('dialog[open]')?.id||null,selection:document.querySelector('#table-cards [aria-pressed=true]')?.getAttribute('aria-label')||null,state:net.state,rooms:net.rooms,revealFeedback:S.clock-S.flipAt<1.25?S.flipDisc==='skull'?'Found Skull':'Safe':null,actions:[...Array.from(document.querySelectorAll('#bottom-nav button, #navigation-menu[open] button'),b=>b.getAttribute('aria-label')||b.textContent),...spots.map(a=>a.label),...Array.from(document.querySelectorAll('#quick-bids:not([hidden]) button, #table-cards:not([hidden]) button:not(:disabled), #reveal-confirm:not([hidden]):not(:disabled)'),b=>b.getAttribute('aria-label')||b.textContent)]}:{coordinates:'canvas 390 units wide; origin top-left, y down',phase:S.phase,actions:[...spots.map(a=>a.label),...Array.from(document.querySelectorAll('#bottom-nav button, #navigation-menu[open] button'),b=>b.getAttribute('aria-label')||b.textContent)]});net.onChange=draw;resize();let previous=0,lastFrame=0;function frame(now){S.clock+=Math.min((now-previous)/1000,.05);if((!reducedMotion.matches||S.clock-S.flipAt<1.3||net.state?.stage==='reveal'&&!net.state.flips.length&&S.clock-S.phaseAt<1.6||net.state?.discarded&&S.clock-S.discardAt<1.3)&&now-lastFrame>=33){draw();lastFrame=now}previous=now;requestAnimationFrame(frame)}requestAnimationFrame(frame);const query=new URLSearchParams(location.search),tableFromUrl=query.get('table');const begin=()=>{if(tableFromUrl==='lan'||tableFromUrl==='internet'){openTable(tableFromUrl,names[0],query.get('code')||'');}else resumeLast();};if(!savedName&&!hint)editName('',{local:true}).then(begin);else begin();if('serviceWorker'in navigator)navigator.serviceWorker.register(import.meta.env.BASE_URL+'sw.js').catch(()=>{});
