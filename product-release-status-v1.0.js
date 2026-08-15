/*
 NatFiber Encyclopedia — Product Release Status Helper v1.0
 Makes PRIVATE/SELECTED state obvious and provides direct navigation to Release Preview.
 Does not bypass ADMIN approval/publication guard.
*/
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const CFG=window.NATFIBER_CONFIG||{};
const sb=createClient(CFG.supabaseUrl,CFG.publishableKey);
const $=s=>document.querySelector(s);
let lastFiber=null,busy=false;

function lang(){try{return window.NF_I18N?.getLang?.()||localStorage.getItem('natfiber_lang')||'id';}catch{return'id';}}
function L(id,en){return lang()==='id'?id:en;}
function activeFiber(){return $('#adminFiberSelector')?.value||localStorage.getItem('natfiber_admin_fiber')||'NF-0001';}
function releaseGroup(id){return id.replace('-','')+'_PRODUCT_MEDIA_V1';}

function addStyle(){
  if($('#nfProductReleaseStatusStyle'))return;
  const s=document.createElement('style');s.id='nfProductReleaseStatusStyle';
  s.textContent=`
    .nf-prs{margin:12px 0 16px;padding:12px 14px;border:1px solid #ead49a;background:#fff8e7;border-radius:13px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
    .nf-prs.good{border-color:#b8dcca;background:#f1faf5}.nf-prs strong{color:#5b4713}.nf-prs.good strong{color:#245b43}
    .nf-prs p{margin:3px 0 0;font-size:9.5px;color:#6d644c}.nf-prs-actions{display:flex;gap:7px;flex-wrap:wrap}
    .nf-prs-btn{border:0;border-radius:9px;padding:8px 11px;background:#173f33;color:white;font-weight:800;font-size:9px;cursor:pointer}
  `;
  document.head.appendChild(s);
}
function gotoPreview(){
  const b=$('.nav-btn[data-view="preview"]');
  if(b)b.click();
  setTimeout(()=>$('#nfProductMediaPreviewPanel')?.scrollIntoView({behavior:'smooth',block:'start'}),250);
}
function ensureHost(){
  const entry=$('#view-entry');
  if(!entry)return null;
  let box=$('#nfProductReleaseStatus');
  if(!box){
    box=document.createElement('div');box.id='nfProductReleaseStatus';box.className='nf-prs';
    const panel=$('#nfProductMediaInputPanel');
    if(panel)panel.insertAdjacentElement('beforebegin',box);else entry.prepend(box);
  }
  return box;
}
async function refresh(){
  if(busy)return;
  busy=true;
  try{
    const id=activeFiber(),rg=releaseGroup(id);
    const {data,error}=await sb.from('release_manifest')
      .select('release_item_id,editor_status,is_selected,data_table,record_id')
      .eq('fiber_id',id).eq('release_group',rg);
    if(error)throw error;
    const selected=(data||[]).filter(x=>x.is_selected);
    const approved=selected.filter(x=>x.editor_status==='APPROVED');
    const productIds=selected.filter(x=>x.data_table==='fiber_product_media').map(x=>x.record_id);
    let publicCount=0;
    if(productIds.length){
      const {count,error:e2}=await sb.from('fiber_product_media').select('*',{count:'exact',head:true}).in('product_media_id',productIds).eq('is_public',true).eq('record_status','PUBLISHED');
      if(e2)throw e2; publicCount=count||0;
    }
    const box=ensureHost();if(!box)return;
    if(selected.length===0){
      box.className='nf-prs';
      box.innerHTML=`<div><strong>${L('Belum ada kandidat Product Media.','No Product Media candidates yet.')}</strong><p>${L('Tambahkan foto produk dari form di bawah.','Add product imagery using the form below.')}</p></div>`;
    }else if(publicCount>0){
      box.className='nf-prs good';
      box.innerHTML=`<div><strong>✓ ${L('Product Media sudah dipublikasikan.','Product Media is published.')}</strong><p>${publicCount} ${L('produk siap tampil pada tab Applications.','product item(s) ready for the Applications tab.')}</p></div><div class="nf-prs-actions"><button class="nf-prs-btn" id="nfPrsOpenPublic">${L('Buka Situs Publik','Open Public Site')} ↗</button></div>`;
      $('#nfPrsOpenPublic')?.addEventListener('click',()=>window.open(`./?fiber=${encodeURIComponent(id)}`,'_blank','noopener'));
    }else{
      box.className='nf-prs';
      const ready=approved.length===selected.length&&selected.length>0;
      box.innerHTML=`<div><strong>${ready?L('Kandidat sudah APPROVED tetapi belum PUBLISHED.','Candidate is APPROVED but not yet PUBLISHED.'):L('Foto belum tampil publik karena masih menunggu persetujuan.','Photo is not public yet because approval is still pending.')}</strong><p>${approved.length}/${selected.length} Approved · ${publicCount} Public · ${rg}</p></div><div class="nf-prs-actions"><button class="nf-prs-btn" id="nfPrsGoPreview">${L('Buka Release Preview','Open Release Preview')} →</button></div>`;
      $('#nfPrsGoPreview')?.addEventListener('click',gotoPreview);
    }
    lastFiber=id;
  }catch(e){console.warn('[NatFiber] Product release status helper failed',e);}
  finally{busy=false;}
}
function boot(){
  addStyle();ensureHost();
  document.addEventListener('change',e=>{if(e.target?.id==='adminFiberSelector')setTimeout(refresh,150);});
  setInterval(()=>{const id=activeFiber();if(id!==lastFiber)refresh();},900);
  setTimeout(refresh,500);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
