const dock=document.createElement('nav');dock.id='bottom-nav';dock.setAttribute('aria-label','Game navigation');document.body.append(dock);
const trigger=document.createElement('button');trigger.type='button';trigger.setAttribute('aria-label','MENU');trigger.setAttribute('aria-haspopup','dialog');trigger.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M5 12h14M5 17h14"/></svg><span>MENU</span>';dock.append(trigger);
const menu=document.createElement('dialog');menu.id='navigation-menu';menu.className='arcade-dialog';menu.setAttribute('aria-label','Game menu');document.body.append(menu);
let actions=[];
function renderMenu(){
 const focused=document.activeElement?.getAttribute('data-action');
 menu.replaceChildren();const kicker=document.createElement('p');kicker.className='menu-kicker';kicker.textContent='DECADENCE ARCADE';const title=document.createElement('h2');title.textContent='BONES MENU';menu.append(kicker,title);
 const tools=document.createElement('div');tools.className='menu-tools';
 for(const [label,action,icon] of actions){
  const button=document.createElement('button');button.type='button';button.dataset.action=label;
  const tool=['SOUND','MUTED','RULES'].includes(label);
  if(tool){button.className='menu-icon';button.setAttribute('aria-label',label);button.title=label==='RULES'?'How to play':label==='MUTED'?'Turn sound on':'Turn sound off';
   if(label!=='RULES')button.setAttribute('aria-pressed',String(label==='SOUND'));
   const image=document.createElement('img');image.src=`${import.meta.env.BASE_URL}assets/nav-${icon}.svg`;image.alt='';button.append(image);tools.append(button);
  }else{button.textContent=label;menu.append(button);}
  button.onclick=()=>{if(label==='RULES'||!tool)menu.close();action()};
 }
 menu.insertBefore(tools,menu.children[2]||null);
 const close=document.createElement('button');close.textContent=document.querySelector('#game').dataset.table==='true'?'BACK TO TABLE':'BACK TO BONES';close.className='dialog-primary';close.onclick=()=>menu.close();menu.append(close);
 if(focused)Array.from(menu.querySelectorAll('button')).find(b=>b.dataset.action===focused||['SOUND','MUTED'].includes(focused)&&['SOUND','MUTED'].includes(b.dataset.action))?.focus();
}
let directAction=null,triggerMode='menu';
trigger.onclick=()=>{if(directAction){directAction();return}renderMenu();if(!menu.open)menu.showModal()};
let key='';
export function syncNavigation(entries,direct){
 directAction=direct||null;
 const mode=direct?'home':'menu';
 if(mode!==triggerMode){
  triggerMode=mode;
  trigger.setAttribute('aria-label',direct?'BACK TO HOME':'MENU');
  if(direct)trigger.removeAttribute('aria-haspopup');else trigger.setAttribute('aria-haspopup','dialog');
  trigger.innerHTML=direct?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 5-7 7 7 7"/></svg><span>Home</span>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M5 12h14M5 17h14"/></svg><span>MENU</span>';
 }
 actions=entries.filter(([label])=>!['ROOMS','DECADENCE ARCADE'].includes(label));const next=actions.map(([label])=>label).join('|');
 if(menu.open&&next!==key)renderMenu();key=next;
}
