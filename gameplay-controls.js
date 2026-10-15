let net, sendAction;
export function configureGameplayControls(state, action) { net = state; sendAction = action; }

const bids = document.createElement('section'); bids.id = 'quick-bids'; bids.hidden = true;
bids.setAttribute('aria-label','Choose a bid');
bids.innerHTML = '<p></p><div class="bid-numbers"></div>';
document.body.append(bids);
let bidKey = '';
export function hideBids() { bids.hidden = true; }
export function showBids({x,y,w,min,max,height=96,bottomAlign=false}) {
  const canvas = document.querySelector('#game'), rect = canvas.getBoundingClientRect(), scale = rect.width / Number(canvas.dataset.logicalWidth||390), scaleY=rect.height/Number(canvas.dataset.logicalHeight||844);
  const columns = rect.width < 350 ? 5 : 6;
  bids.style.setProperty('--bid-columns',columns);
  bids.hidden = false; bids.style.left = `${rect.left+x*scale}px`; bids.style.top = `${rect.top+y*scaleY}px`;
  bids.style.width = `${w*scale}px`; bids.style.setProperty('--bid-height',`${Math.max(94,height*scaleY)}px`);
  bids.querySelector('p').textContent = max-min>=12 ? 'Tap a bid · swipe for more numbers →' : 'How many flowers? Tap your bid.';
  const key = `${net.code}:${net.state?.round}:${min}:${max}:${columns}`;
  if (key !== bidKey) {
    bidKey = key; const grid = bids.querySelector('.bid-numbers'); grid.replaceChildren();
    for (let amount=min;amount<=max;amount++) {
      const button = document.createElement('button'); button.textContent = amount; button.setAttribute('aria-label',`Bid ${amount} flower${amount===1?'':'s'}`);
      const offset=amount-min; button.style.gridRow = Math.floor(offset%(columns*2)/columns)+1; button.style.gridColumn = Math.floor(offset/(columns*2))*columns+offset%columns+1;
      button.onclick = () => sendAction({type:'bid',amount}); grid.append(button);
    }
    grid.scrollLeft = 0;
  }
  for (const button of bids.querySelectorAll('button')) button.disabled = net.pendingAction || net.connecting || !net.connected;
  const renderedHeight=bids.getBoundingClientRect().height;
  if(bottomAlign){y=Math.max(y,(rect.height-renderedHeight-16)/scaleY);bids.style.top=`${rect.top+y*scaleY}px`;}
  return {bottom:y+renderedHeight/scaleY,scale};
}
export function syncGameplayControls() { const s=net.state,turn=s?.turn===s?.seat; if(!turn||!['add','bid'].includes(s?.stage))hideBids(); if(s?.stage!=='reveal')tables.hidden=true; if(s?.stage!=='reveal'||!turn||net.features?.automaticReveal&&s.seats[s.challenger]?.stack>s.flips.filter(f=>f.owner===s.challenger).length)confirm.hidden=true; }

const tables = document.createElement('div'); tables.id='table-cards'; tables.hidden=true; document.body.append(tables);
let tablesKey='';
export function showTableCards({automaticOwn=false,state,selected,onSelect,startY,rowH,seatRects,flipAge,reducedMotion,busy,announcing}) {
  const canvas=document.querySelector('#game'),rect=canvas.getBoundingClientRect(),scale=rect.width/Number(canvas.dataset.logicalWidth||390),scaleY=rect.height/Number(canvas.dataset.logicalHeight||844);
  tables.hidden=false;tables.style.visibility=announcing?'hidden':'visible';
  const key=JSON.stringify([state.code,state.round,state.turn,state.challenger,state.flips,state.seats.map(p=>[p.name,p.stack])]);
  const ownLeft=state.seats[state.challenger].stack-state.flips.filter(f=>f.owner===state.challenger).length;
  if(key!==tablesKey){
    tablesKey=key;tables.replaceChildren();
    state.seats.forEach((player,seat)=>{
      const strip=document.createElement('div');strip.className='played-cards';strip.dataset.seat=seat;strip.setAttribute('role','group');strip.setAttribute('aria-label',`${player.name}'s played cards`);
      for(let index=0;index<player.stack;index++){
        const button=document.createElement('button');button.dataset.index=index;
        button.innerHTML='<img alt="" draggable="false"><span></span>';button.onclick=()=>onSelect({target:seat,index});strip.append(button);
      }
      tables.append(strip);
    });
  }
  const names=['coral','mint','amber','violet','blue','orchid'];
  for(const strip of tables.children){
    const seat=Number(strip.dataset.seat),player=state.seats[seat];
    const mat=seatRects?.[seat]||{x:20+seat%2*183,y:startY+Math.floor(seat/2)*rowH,w:168,h:rowH-12};
    Object.assign(strip.style,{left:`${rect.left+(mat.x+8)*scale}px`,top:`${rect.top+(mat.y+(seatRects?76:64))*scaleY}px`,width:`${(mat.w-16)*scale}px`,height:`${Math.max(74,(mat.h-(seatRects?88:66))*scaleY)}px`});
    const cardH=Math.max(64,Math.min(seatRects?128:92,(mat.h-(seatRects?90:78))*scaleY));strip.style.setProperty('--played-height',`${cardH}px`);strip.style.setProperty('--played-width',`${Math.max(56,cardH*.76)}px`);
    for(const button of strip.children){
      const index=Number(button.dataset.index),opened=state.flips.find(f=>f.owner===seat&&f.index===index),active=selected?.target===seat&&selected.index===index;
      button.onclick=()=>onSelect({target:seat,index});
      button.dataset.opened=String(!!opened);
      button.disabled=automaticOwn&&ownLeft>0||!!opened||state.turn!==state.seat||(seat!==state.challenger&&ownLeft>0)||net.pendingAction||net.connecting||!net.connected||busy;
      button.setAttribute('aria-pressed',String(active));button.setAttribute('aria-label',opened?`${player.name} card ${index+1}: ${opened.disc}`:`Select ${player.name} card ${index+1}${index===0?' (bottom)':index===player.stack-1?' (top)':''}`);
      button.style.setProperty('--seat-color',`var(--card-${names[seat]})`);
      const progress=opened===state.flips.at(-1)&&flipAge<.72&&!reducedMotion?Math.max(0,flipAge/.72):1,eased=progress*progress*(3-2*progress);
      const face=opened&&eased>=.5?opened.disc:null,img=button.querySelector('img');
      const src=`${import.meta.env.BASE_URL}assets/${face?`card-${face}-new`:`card-played-${names[seat]}`}.svg`;
      if(img.getAttribute('src')!==src)img.src=src;
      img.style.transform=`scaleX(${progress<1?Math.max(.025,Math.abs(Math.cos(Math.PI*eased))):1})`;
      button.querySelector('span').textContent=opened?(progress<1?'OPENING':opened.disc==='flower'?'SAFE':'SKULL'):index===0?'BOTTOM':index===player.stack-1?'TOP':`CARD ${index+1}`;
    }
  }
}
const confirm = document.createElement('button');confirm.id='reveal-confirm';confirm.style.backgroundImage=`url(${import.meta.env.BASE_URL}assets/button-gold.svg)`;confirm.hidden=true;document.body.append(confirm);
export function showRevealConfirm({x,y,w,h,choice,onConfirm,disabled,announcing}) {
  const canvas=document.querySelector('#game'),rect=canvas.getBoundingClientRect(),scale=rect.width/Number(canvas.dataset.logicalWidth||390),scaleY=rect.height/Number(canvas.dataset.logicalHeight||844);
  Object.assign(confirm.style,{left:`${rect.left+x*scale}px`,top:`${rect.top+y*scaleY}px`,width:`${w*scale}px`,height:`${Math.max(44,h*scaleY)}px`});
  confirm.hidden=!choice;confirm.style.visibility=announcing?'hidden':'visible';confirm.disabled=!choice||disabled||net.connecting||net.pendingAction||!net.connected;confirm.textContent=choice?'REVEAL SELECTED CARD':'TAP A CARD TO SELECT';confirm.onclick=onConfirm;
}
