let net, sendAction;
export function configureGameplayControls(state, action) { net = state; sendAction = action; }

const bids = document.createElement('section'); bids.id = 'quick-bids'; bids.hidden = true;
bids.setAttribute('aria-label','Choose a bid');
bids.innerHTML = '<p></p><div class="bid-numbers"></div>';
document.body.append(bids);
let bidKey = '';
export function hideBids() { bids.hidden = true; }
export function showBids({x,y,w,min,max,height=96}) {
  const canvas = document.querySelector('#game'), rect = canvas.getBoundingClientRect(), scale = rect.width / 390;
  const columns = rect.width < 350 ? 5 : 6;
  bids.style.setProperty('--bid-columns',columns);
  bids.hidden = false; bids.style.left = `${rect.left+x*scale}px`; bids.style.top = `${rect.top+y*scale}px`;
  bids.style.width = `${w*scale}px`; bids.style.setProperty('--bid-height',`${Math.max(94,height*scale)}px`);
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
  for (const button of bids.querySelectorAll('button')) button.disabled = net.pendingAction || !net.connected;
  return {bottom:y+bids.getBoundingClientRect().height/scale,scale};
}
export function syncGameplayControls() { const s=net.state,turn=s?.turn===s?.seat; if(!turn||!['add','bid'].includes(s?.stage))hideBids(); if(s?.stage!=='reveal')tables.hidden=true; if(s?.stage!=='reveal'||!turn)confirm.hidden=true; }

const tables = document.createElement('div'); tables.id='table-cards'; tables.hidden=true; document.body.append(tables);
let tablesKey='';
export function showTableCards({state,selected,onSelect,startY,rowH,flipAge,reducedMotion,busy,announcing}) {
  const canvas=document.querySelector('#game'),rect=canvas.getBoundingClientRect(),scale=rect.width/390;
  tables.hidden=false;tables.style.visibility=announcing?'hidden':'visible';
  const key=JSON.stringify([state.code,state.round,state.turn,state.challenger,state.flips,state.seats.map(p=>[p.name,p.stack])]);
  const ownLeft=state.seats[state.challenger].stack-state.flips.filter(f=>f.owner===state.challenger).length;
  if(key!==tablesKey){
    tablesKey=key;tables.replaceChildren();
    state.seats.forEach((player,seat)=>{
      const strip=document.createElement('div');strip.className='played-cards';strip.dataset.seat=seat;strip.setAttribute('role','group');strip.setAttribute('aria-label',`${player.name}'s played cards`);
      for(let index=0;index<player.stack;index++){
        const button=document.createElement('button');button.dataset.index=index;
        button.innerHTML='<img alt=""><span></span>';button.onclick=()=>onSelect({target:seat,index});strip.append(button);
      }
      tables.append(strip);
    });
  }
  const names=['coral','mint','amber','violet','blue','orchid'];
  for(const strip of tables.children){
    const seat=Number(strip.dataset.seat),player=state.seats[seat];
    Object.assign(strip.style,{left:`${rect.left+(28+seat%2*183)*scale}px`,top:`${rect.top+(startY+Math.floor(seat/2)*rowH+26)*scale}px`,width:`${152*scale}px`,height:`${Math.max(74,(rowH-28)*scale)}px`});
    const cardH=Math.max(64,Math.min(92,(rowH-50)*scale));strip.style.setProperty('--played-height',`${cardH}px`);strip.style.setProperty('--played-width',`${Math.max(56,cardH*.76)}px`);
    for(const button of strip.children){
      const index=Number(button.dataset.index),opened=state.flips.find(f=>f.owner===seat&&f.index===index),active=selected?.target===seat&&selected.index===index;
      button.dataset.opened=String(!!opened);
      button.disabled=!!opened||state.turn!==state.seat||(seat!==state.challenger&&ownLeft>0)||net.pendingAction||!net.connected||busy;
      button.setAttribute('aria-pressed',String(active));button.setAttribute('aria-label',opened?`${player.name} card ${index+1}: ${opened.disc}`:`Select ${player.name} card ${index+1}${index===0?' (bottom)':index===player.stack-1?' (top)':''}`);
      button.style.setProperty('--seat-color',`var(--card-${names[seat]})`);
      const progress=opened===state.flips.at(-1)&&flipAge<.55&&!reducedMotion?Math.max(0,flipAge/.55):1;
      const face=opened&&progress>=.5?opened.disc:null,img=button.querySelector('img');
      const src=`${import.meta.env.BASE_URL}assets/${face?`card-${face}-new`:`card-played-${names[seat]}`}.svg`;
      if(img.getAttribute('src')!==src)img.src=src;
      img.style.transform=`scaleX(${progress<1?Math.max(.04,Math.abs(Math.cos(Math.PI*progress))):1})`;
      button.querySelector('span').textContent=opened?(opened.disc==='flower'?'SAFE':'SKULL'):index===0?'BOTTOM':index===player.stack-1?'TOP':`CARD ${index+1}`;
    }
  }
}
const confirm = document.createElement('button');confirm.id='reveal-confirm';confirm.style.backgroundImage=`url(${import.meta.env.BASE_URL}assets/button-gold.svg)`;confirm.hidden=true;document.body.append(confirm);
export function showRevealConfirm({x,y,w,h,choice,onConfirm,disabled,announcing}) {
  const rect=document.querySelector('#game').getBoundingClientRect(),scale=rect.width/390;
  Object.assign(confirm.style,{left:`${rect.left+x*scale}px`,top:`${rect.top+y*scale}px`,width:`${w*scale}px`,height:`${Math.max(44,h*scale)}px`});
  confirm.hidden=false;confirm.style.visibility=announcing?'hidden':'visible';confirm.disabled=!choice||disabled;confirm.textContent=choice?'REVEAL SELECTED CARD':'TAP A CARD TO SELECT';confirm.onclick=onConfirm;
}
