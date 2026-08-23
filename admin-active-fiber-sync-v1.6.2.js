(function(){
'use strict';
const EV='natfiber:fiber-changed';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const valid=id=>/^NF-\d{4}$/.test(String(id||''));
const active=()=>window.NATFIBER_ADMIN?.getActiveFiber?.()||window.NATFIBER_ADMIN_STATE?.activeFiberId||$('#adminFiberSelector')?.value||localStorage.getItem('natfiber_admin_fiber')||'NF-0001';
const fiberMeta=id=>(window.NATFIBER_ADMIN_STATE?.fibers||[]).find(f=>f.fiber_id===id)||null;
let bridging=false,lastGuard='';

function updateEntryContext(id=active()){
  const f=fiberMeta(id);
  const t=$('#entryFiberTitle'),s=$('#entryFiberSub');
  if(t)t.textContent=`${id} · ${f?.canonical_name||''}`;
  if(s)s.textContent=f?.scientific_name||'';
  const host=$('#view-entry .context-panel');
  if(host){
    let b=$('#nfWriteTargetBadge');
    if(!b){b=document.createElement('span');b.id='nfWriteTargetBadge';b.className='secure-pill';b.style.marginLeft='8px';host.querySelector('div')?.appendChild(b);}
    b.textContent=`WRITE TARGET · ${id}`;
  }
}

function syncLegacySelection(id=active()){
  if(!valid(id)||bridging)return false;
  updateEntryContext(id);
  const selected=$('#selectedFiberId')?.textContent?.trim();
  if(selected===id)return true;
  const row=$$('.fiber-row[data-id]').find(x=>x.dataset.id===id);
  if(!row)return false;
  bridging=true;
  try{row.click();}
  finally{setTimeout(()=>{bridging=false;updateEntryContext(id);},0);}
  return true;
}

function emitAfterLegacy(id,source){
  setTimeout(()=>window.dispatchEvent(new CustomEvent(EV,{detail:{fiberId:id,source}})),0);
}

function installFiberListBridge(){
  document.addEventListener('click',e=>{
    const row=e.target.closest?.('.fiber-row[data-id]');
    if(!row||bridging)return;
    const id=row.dataset.id;if(!valid(id))return;
    const before=active();
    window.NATFIBER_ADMIN?.setActiveFiber?.(id,{emit:false,source:'fiber-list'});
    updateEntryContext(id);
    if(before!==id)emitAfterLegacy(id,'fiber-list');
  },true);
}

function installWriteGuard(){
  const guarded=['propertyForm','treatmentForm','compositeForm','fiberForm'];
  document.addEventListener('submit',e=>{
    const form=e.target;if(!form||!guarded.includes(form.id))return;
    const id=active(),selected=$('#selectedFiberId')?.textContent?.trim();
    if(!valid(id))return;
    if(selected===id)return;
    e.preventDefault();e.stopImmediatePropagation();
    syncLegacySelection(id);
    const msgId=form.id==='propertyForm'?'#propertyMessage':form.id==='treatmentForm'?'#treatmentMessage':form.id==='compositeForm'?'#compositeMessage':'#fiberMessage';
    const m=$(msgId);if(m){m.textContent=`Konteks disinkronkan ke ${id}. Periksa kembali lalu klik Simpan sekali lagi.`;m.className='message error';}
    if(lastGuard!==id){lastGuard=id;console.warn(`[NatFiber] write blocked until legacy selection matches ${id}`);}
  },true);
}

function installNavigationSync(){
  document.addEventListener('click',e=>{
    const b=e.target.closest?.('[data-view="entry"],[data-goto="entry"],[data-view="fibers"],[data-goto="fibers"]');
    if(b)setTimeout(()=>syncLegacySelection(active()),0);
  },true);
}

function boot(){
  installFiberListBridge();installWriteGuard();installNavigationSync();
  window.addEventListener(EV,e=>setTimeout(()=>syncLegacySelection(e.detail?.fiberId||active()),0));
  const app=$('#editorApp');
  if(app)new MutationObserver(()=>{if(!app.hidden)setTimeout(()=>syncLegacySelection(active()),40);}).observe(app,{attributes:true,attributeFilter:['hidden']});
  setTimeout(()=>syncLegacySelection(active()),350);
}
window.NATFIBER_PATCH3={version:'1.6.2',sync:syncLegacySelection,getWriteTarget:active};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
