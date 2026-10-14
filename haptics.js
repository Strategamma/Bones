let enabled=false;try{enabled=localStorage.getItem('bones-haptics')==='on'}catch{}
export function hapticsEnabled(){return enabled}
export function toggleHaptics(){enabled=!enabled;try{localStorage.setItem('bones-haptics',enabled?'on':'off')}catch{}if(enabled)pulse('tap');return enabled}
export function pulse(kind){if(!enabled||typeof navigator.vibrate!=='function')return;try{navigator.vibrate(({tap:12,turn:20,bid:[15,35,15],safe:15,skull:[40,60,40],point:[20,40,20],win:[25,50,25,50,50]})[kind]||12)}catch{}}
