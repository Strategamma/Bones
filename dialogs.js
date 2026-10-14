const base=import.meta.env.BASE_URL;
export function decorateDialog(dialog,asset){
 if(!dialog.hasAttribute('aria-label')&&!dialog.hasAttribute('aria-labelledby'))dialog.setAttribute('aria-label',dialog.querySelector('h2')?.textContent||'BONES menu');
 dialog.classList.add('arcade-dialog');
 if(!dialog.querySelector('.dialog-art, .room-art')){const img=document.createElement('img');img.className='dialog-art';img.src=`${base}assets/${asset}.svg`;img.alt='';dialog.prepend(img);}
}
export function messageDialog({title,detail,asset='card-back-new',actions}){
 const dialog=document.createElement('dialog');dialog.setAttribute('aria-label',title);dialog.className='arcade-dialog';
 const h=document.createElement('h2');h.textContent=title;const p=document.createElement('p');p.textContent=detail;dialog.append(h,p);
 actions.forEach(({label,run,primary=false})=>{const b=document.createElement('button');b.textContent=label;if(primary)b.className='dialog-primary';b.onclick=()=>{dialog.close();run?.()};dialog.append(b)});
 decorateDialog(dialog,asset);dialog.addEventListener('close',()=>dialog.remove());document.body.append(dialog);dialog.showModal();return dialog;
}
