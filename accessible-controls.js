const layer=document.createElement('div');
layer.id='canvas-controls';
layer.setAttribute('aria-label','Game controls');
document.body.append(layer);
let key='';
const taps=new WeakMap(),bindings=new WeakMap();
let activateAction,pressAction,blockedAction=false;
export function syncCanvasControls(canvas,spots,activate,press,blocked=false){
 const setupOpen=document.querySelector('#table-setup')?.hidden===false;
 layer.inert=setupOpen;document.querySelector('#bottom-nav').inert=setupOpen;
 if(setupOpen)document.querySelector('#navigation-menu[open]')?.close();
 activateAction=activate;pressAction=press;blockedAction=blocked;layer.setAttribute('aria-busy',String(blocked));
 const next=spots.map(s=>s.label).join('|');
 let restore=null;
 if(next!==key){
  const focused=layer.contains(document.activeElement)?document.activeElement:null;
  const index=focused?Array.from(layer.children).indexOf(focused):-1;
  const label=focused?.getAttribute('aria-label');
  key=next;layer.replaceChildren();
  for(const spot of spots){
   const b=document.createElement('button');b.type='button';b.textContent=spot.label;
   b.setAttribute('aria-label',spot.label);layer.append(b);
   b.onpointerdown=event=>{taps.set(b,{pointerId:event.pointerId,x:event.clientX,y:event.clientY});pressAction?.(bindings.get(b))};
   b.onpointerup=event=>{taps.set(b,{accepted:releasedTap(taps.get(b),{pointerId:event.pointerId,x:event.clientX,y:event.clientY})})};
   b.onpointercancel=()=>taps.delete(b);
   b.onclick=event=>{if(!blockedAction&&(event.detail===0||taps.get(b)?.accepted))activateAction(bindings.get(b));taps.delete(b)};
  }
  if(focused)restore=Array.from(layer.children).find(b=>b.getAttribute('aria-label')===label)||layer.children[Math.min(index,spots.length-1)]||document.querySelector('#bottom-nav button');
 }
 const rect=canvas.getBoundingClientRect(),scale=rect.width/390;
 for(let i=0;i<spots.length;i++){
  const spot=spots[i],b=layer.children[i];
  Object.assign(b.style,{left:`${rect.left+spot.x*scale}px`,top:`${rect.top+spot.y*scale}px`,width:`${spot.w*scale}px`,height:`${spot.h*scale}px`});
  bindings.set(b,spot);b.setAttribute('aria-disabled',String(blocked));
 }
 restore?.focus({preventScroll:true});
}
// Fixed overlays follow the canvas; keyboard focus must reveal offscreen actions.
document.addEventListener('focusin',event=>{
 if(!event.target.matches?.('#canvas-controls button, #quick-bids button, #table-cards button, #reveal-confirm')||document.querySelector('dialog[open]'))return;
 const rect=event.target.getBoundingClientRect(),bottom=innerHeight-64;
 if(rect.top<8||rect.bottom>bottom)window.scrollBy({top:rect.top-(bottom-rect.height)/2,behavior:'instant'});
});
import {releasedTap} from './input.js';
// Holding Enter/Space is one decision, not a stream of multiplayer actions.
document.addEventListener('keydown',event=>{
 if(event.repeat&&(event.key==='Enter'||event.key===' ')&&event.target.closest?.('button'))event.preventDefault();
},{capture:true});
