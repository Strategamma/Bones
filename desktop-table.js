import {desktopTableLayout} from './layout.js';
import {showBids,showTableCards,showRevealConfirm} from './gameplay-controls.js';
let selection=null,selectionKey='';

// Desktop composes the same game pieces into a wide table; rules/actions stay shared.
export function drawDesktopTable(ui,actions){
 const {state:s,net,sendAction,editName,peekOwnCards,removePlayer,shareInvite,leaveTable}=actions;
 const {W,H,txt,panel,button,art,colors}=ui,cx=W/2;
 if(!s){ui.header('YOUR TABLE',net.connecting?'Connecting…':'Choose a room to join');return;}
 const me=s.seat,mine=s.seats[me],host=s.host===me;
 const turn=s.stage==='place'&&net.features?.simultaneousPlacement?!s.stack.length&&mine.discs>0:s.turn===me;
 const titles={lobby:`${s.mode.toUpperCase()} TABLE`,place:'PLACE A CARD',add:'PLAY OR BID',bid:'THE BIDDING',reveal:'THE REVEAL',loss:'SKULL REVEALED','choose-lead':'CHOOSE THE LEAD',result:'ROUND COMPLETE',paused:'TABLE PAUSED'};
 const layout=desktopTableLayout(W,H,s.stage==='lobby'?6:s.seats.length,s.stage==='reveal');
 const {left,boardWidth,bottom}=layout;
 const center=(text,y,size=14,color='#d1c8d9',weight=700)=>txt(text,cx,y,size,color,weight,'center',boardWidth);
 if(s.stage==='win'){
  ui.navigation([],leaveTable);
  center('VICTORY',89,28,'#f7f2e9',900);
  const heroY=Math.max(135,H*.23),heroX=cx-290;
  art('victory-arcade',heroX,heroY,290,230);
  txt(s.winner===me?'YOU WON!':'THE WINNER',cx+60,heroY+56,28,'#f7f2e9',900,'left',440);
  txt(s.seats[s.winner].name,cx+60,heroY+104,25,'#ffd981',900,'left',440);
  txt(s.resultKind==='flower'?'Two points. A beautiful bluff.':'Last player standing!',cx+60,heroY+150,15,'#91d9c7',800,'left',440);
  const voted=s.seats.filter(p=>p.bot||p.rematchReady).length,already=!!mine.rematchReady,y=Math.max(heroY+285,H-156);
  button('REMATCH',cx-180,y,360,56,net.features?.rematchVotes?already?null:()=>sendAction({type:host?'prepare-rematch':'rematch-ready'}):host?()=>sendAction({type:'rematch'}):null,already?'dark':'pink');
  center(net.features?.rematchVotes?`${voted}/${s.seats.length} players ready${already?' · You’re in!':''}`:host?'Play again together':'Waiting for the host',y+85,14,'#91d9c7');
  if(host&&net.features?.returnLobby)button('MANAGE SEATS',layout.left+layout.boardWidth-200,y+8,200,44,()=>sendAction({type:'lobby'}),'dark');
  return;
 }
 center(titles[s.stage]||'BONES',65,27,'#f7f2e9',900);
 const phase=s.stage==='lobby'?`${s.seats.length}/6 players · ${6-s.seats.length} seats free`:s.stage==='place'?`${s.seats.filter(p=>p.stack>0).length}/${s.seats.filter(p=>p.discs>0).length} cards placed`:s.stage==='reveal'?'Find flowers. Avoid the skull.':s.stage==='paused'?'Reconnect or vote to continue':s.stage==='result'?(s.resultKind==='flower'?'Flower challenge won':'One card discarded'):turn?'Your move':`${s.seats[s.turn]?.name||'Player'}’s turn`;
 center(net.pendingAction?'Sending your move…':s.stage==='lobby'?phase:`Round ${s.round} · ${phase}`,96,13,'#c9f5e8');
 if(s.stage==='lobby')txt(s.code,left+boardWidth,65,21,'#91d9c7',900,'right',180);
 layout.seats.forEach(({x,y,w,h},i)=>{
  const p=s.seats[i];
  if(!p){ui.emptySeat(x,y,w,h,host&&net.features?.bots?()=>sendAction({type:'add-bot'}):null,`Add bot to seat ${i+1}`);return;}
  const active=(s.stage==='place'?i===me&&!p.stack&&p.discs>0:i===s.turn)&&['place','add','bid'].includes(s.stage);
  panel(x,y,w,h,p.wins?'#655035':i===me?'#263740':'#302a40',active||p.wins||s.stage==='reveal'&&i===s.challenger?'#ffd981':i===me?colors[i]:'#665771',16);
  ui.seatAvatar(i,x+16,y+16,28);
  txt(p.name,x+56,y+28,16,'#f7f2e9',900,'left',w-110);
  const role=i===me?'YOU':i===s.host?'HOST':p.bot?'BOT':'';
  txt(role,x+16,y+61,10,colors[i],900,'left');
  if(p.wins)txt(`★ ${p.wins} POINT${p.wins===1?'':'S'}`,x+w-18,y+61,11,'#ffd981',900,'right',120);
  else if(active)txt('YOUR TURN',x+w-18,y+61,11,'#ffd981',900,'right',120);
  else if(s.stage==='reveal'&&i===s.challenger)txt('REVEALING',x+w-18,y+61,11,'#ffd981',900,'right',120);
  else if(['add','bid'].includes(s.stage)&&s.passed[i])txt('PASSED',x+w-18,y+61,11,'#d1c8d9',800,'right');
  else if(['add','bid'].includes(s.stage)&&p.bid)txt(`BID ${p.bid}`,x+w-18,y+61,11,'#ffd981',800,'right');
  if(s.stage==='lobby'){
   txt(!p.connected?'OFFLINE · RESERVED':i===s.host?'HOSTING':p.bot||p.ready?'READY':'NOT READY',x+16,y+h-22,12,p.connected?'#91d9c7':'#ffb6cb',800,'left',w-70);
   if(p.sessionWins)ui.flowerBadge(x+w-32,y+h-22,p.sessionWins);
   if(i===me)ui.spots.push({x,y,w:w-55,h,fn:()=>editName(p.name),label:'Change your name'});
   if(host&&i!==me)ui.seatControl(x+w-27,y+26,'×',()=>removePlayer(p,i,s),`Remove ${p.name}`);
  }else if(s.stage!=='reveal'){
   if(p.stack){for(let n=0;n<p.stack;n++)ui.cardRect(x+16+n*10,y+h-46,26,30,'back',null,colors[i]);const peek=i===me&&['place','add','bid','paused'].includes(s.stage);txt(peek?'PEEK':p.stack,x+78,y+h-28,11,peek?'#91d9c7':'#d1c8d9',800,'left');if(peek)ui.spots.push({x:x+8,y:y+h-52,w:132,h:44,fn:peekOwnCards,label:'Peek your played cards'});}
   else txt('—',x+16,y+h-28,16,'#897c9b',700,'left');
   ui.cardCount(x+w-90,y+h-28,p.discs,'#d1c8d9');
  }
 });
 const y=bottom+20;
 if(s.stage==='lobby'){
  const connected=s.seats.filter(p=>p.connected).length,waiting=s.seats.filter((p,i)=>i!==s.host&&!p.bot&&!p.ready).length;
  const ready=connected>=3&&s.seats.every(p=>p.connected)&&(!net.features?.readiness||!waiting);
  center(ready?'Everyone ready · host can start':connected<3?`Need ${3-connected} more players`:`${waiting} guests still getting ready`,y+24,15,ready?'#91d9c7':'#d1c8d9');
  const ay=Math.min(H-100,y+68);
  button('SHARE INVITE',cx-330,ay,310,56,s.seats.length<6?shareInvite:null,'dark');
  button(host?ready?'START GAME':'WAITING FOR PLAYERS':mine.ready?'READY ✓ · TAP TO UNREADY':'I’M READY',cx+20,ay,310,56,host?ready?()=>sendAction({type:'start'}):null:net.features?.readiness?()=>sendAction({type:'ready',ready:!mine.ready}):null,host&&!ready?'dark':'gold');
 }else if(['place','add'].includes(s.stage)){
  const handW=Math.min(550,boardWidth*.56),handX=left+20,actionX=handX+handW+40,actionW=boardWidth-handW-80;
  const handY=Math.max(y,Math.min(H-214,y+40));
  txt(turn?'YOUR MOVE · CHOOSE A CARD':s.stack.length&&s.stage==='place'?'CARD LOCKED · WAITING FOR FRIENDS':`WAITING FOR ${s.seats[s.turn]?.name.toUpperCase()}`,handX+handW/2,handY,15,turn?'#ffb6cb':'#d1c8d9',900,'center',handW);
  art('hand-tray',handX,handY+23,handW,150);
  const cw=78,ch=112,gap=14,start=handX+(handW-s.hand.length*cw-(s.hand.length-1)*gap)/2;
  s.hand.forEach((type,index)=>ui.cardRect(start+index*(cw+gap),handY+39,cw,ch,type,turn?()=>sendAction({type:'place',index}):null,colors[me],`Place ${type} card ${index+1}`));
  if(!s.hand.length)txt('Your cards are all on the table.',handX+handW/2,handY+100,15,'#d1c8d9',700);
  if(s.stage==='add'&&turn)showBids({x:actionX,y:handY+24,w:actionW,min:1,max:s.total,height:126});
  else {txt(s.stage==='place'?'ONE CARD TO BEGIN':'PLAY MOVES CLOCKWISE',actionX+actionW/2,handY+72,16,'#91d9c7',900);txt(s.stage==='place'?'Everyone places a flower or skull.':'Cards you add go on top of your stack.',actionX+actionW/2,handY+103,12,'#d1c8d9',700,'center',actionW);}
 }else if(s.stage==='bid'){
  const spotX=left+30,spotW=Math.min(400,boardWidth*.42),spotY=y+25;
  art('bid-spotlight',spotX,spotY,spotW,116);
  txt(`${s.bid} FLOWERS`,spotX+spotW/2,spotY+48,28,'#241b38',900);
  txt(`${s.seats[s.leader]?.name} bids ${s.bid} · locked`,spotX+spotW/2,spotY+86,12,'#46334f',800,'center',spotW-40);
  if(turn){const bx=left+boardWidth*.49,bw=boardWidth*.47;showBids({x:bx,y:spotY,w:bw,min:s.bid+1,max:s.total,height:96});button('PASS · I’M OUT OF THIS BID',bx,spotY+130,bw,48,()=>sendAction({type:'pass'}),'dark');}
  else txt(s.passed[me]?'You passed. Watch the bidding.':`${s.seats[s.turn]?.name} raises or passes`,left+boardWidth*.73,spotY+65,15,'#d1c8d9',800,'center',boardWidth*.46);
 }else if(s.stage==='reveal'){
  const key=`${s.code}:${s.round}:${s.flips.length}:${s.turn}`;if(key!==selectionKey){selection=null;selectionKey=key;}
  const ownLeft=s.seats[s.challenger].stack-s.flips.filter(f=>f.owner===s.challenger).length,busy=ui.flipAge<1.25||!s.flips.length&&ui.phaseAge<1.5;
  showTableCards({automaticOwn:!!net.features?.automaticReveal,state:s,selected:selection,onSelect:choice=>{selection=choice;net.onChange()},seatRects:layout.seats,flipAge:ui.flipAge,reducedMotion:ui.reducedMotion,busy,announcing:!s.flips.length&&ui.phaseAge<1.5});
  txt(`✿ ${s.remaining} TO FIND`,left+20,y+14,20,'#f7f2e9',900,'left');
  txt(ui.displayState?'Opening the last card…':turn?ownLeft?'Your cards open first.':'Choose a hidden card.':'Watch the highlighted cards open.',left+20,y+47,14,turn?'#ffd981':'#91d9c7',800,'left',boardWidth-420);
  if(turn&&!(net.features?.automaticReveal&&ownLeft))showRevealConfirm({x:left+boardWidth-350,y:y+10,w:330,h:52,choice:selection,announcing:!s.flips.length&&ui.phaseAge<1.5,disabled:busy,onConfirm:()=>{if(selection){const choice=selection;selection=null;sendAction({type:'flip',...choice})}}});
 }else if(s.stage==='loss'){
  art('skull-loss',cx-310,y+15,190,125);
  txt(`${s.seats[s.challenger].name} found a skull`,cx+15,y+48,21,'#ffb6cb',900,'left',440);
  if(net.features?.automaticReveal)txt('One random card will be lost.',cx+15,y+90,15,'#d1c8d9',700,'left');
  else {txt(me===s.skullOwner?'Choose one card to discard.':`${s.seats[s.skullOwner].name} chooses a card to discard.`,cx+15,y+80,13,'#d1c8d9',700,'left',440);const cw=52,gap=14,start=cx+15;s.lossCount&&Array.from({length:s.lossCount},(_,index)=>ui.cardRect(start+index*(cw+gap),y+103,cw,72,'back',me===s.skullOwner?()=>sendAction({type:'discard',index}):null,colors[s.challenger],`Discard hidden card ${index+1}`));}
 }else if(s.stage==='choose-lead'){
  center(`${s.seats[s.challenger].name} chooses the next lead`,y+18,17,'#91d9c7');
  const players=s.seats.map((p,target)=>({...p,target})).filter(p=>p.discs),bw=Math.min(180,(boardWidth-20*(players.length-1))/players.length),start=cx-(players.length*bw+(players.length-1)*20)/2;
  players.forEach((p,i)=>button(p.name,start+i*(bw+20),y+59,bw,52,me===s.challenger?()=>sendAction({type:'lead',target:p.target}):null,me===s.challenger?'gold':'dark'));
 }else if(s.stage==='result'){
  art(s.resultKind==='flower'?'point-badge':'card-discard',cx-230,y+25,90,90);
  txt(s.resultKind==='flower'?'POINT WON':'ONE CARD LOST',cx-110,y+55,23,s.resultKind==='flower'?'#ffd981':'#ffb6cb',900,'left');
  txt(s.challenger===me?'You':s.seats[s.challenger].name,cx-110,y+87,16,'#f7f2e9',800,'left');
  button(host?'NEXT ROUND':'WAITING FOR HOST',cx+140,y+46,250,56,host?()=>sendAction({type:'next'}):null,host?'gold':'dark');
 }else if(s.stage==='paused'){
  center('Everyone still here can vote to continue.',y+25,17,'#f7f2e9');
  center(`${s.seats.filter(p=>!p.connected).length} offline · ${s.votes.filter(Boolean).length} votes recorded`,y+57,13,'#91d9c7');
  const disabled=mine.discs===0||s.votes?.[me];button(mine.discs===0?'YOU ARE OUT · WATCH THE TABLE':disabled?'VOTE RECORDED':'CONTINUE TOGETHER',cx-190,y+88,380,56,disabled?null:()=>sendAction({type:'continue'}),disabled?'dark':'gold');
 }
}
