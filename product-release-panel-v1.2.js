/*
 NatFiber Encyclopedia — Product Media Release Panel v1.2
 Independent loader-safe panel. Must render even if Product Media Data Entry fails.
*/
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

window.NATFIBER_RELEASE_PANEL_V12 = true;

const CFG = window.NATFIBER_CONFIG || {};
const sb = createClient(CFG.supabaseUrl, CFG.publishableKey);
const $ = s => document.querySelector(s);

let role = null;
let busy = false;
let lastFiber = null;

function lang(){
  try { return window.NF_I18N?.getLang?.() || localStorage.getItem('natfiber_lang') || 'id'; }
  catch { return 'id'; }
}
function L(id,en){ return lang()==='id' ? id : en; }
function esc(v=''){ return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function activeFiber(){ return $('#adminFiberSelector')?.value || localStorage.getItem('natfiber_admin_fiber') || 'NF-0001'; }
function releaseGroup(id){ return id.replace('-','') + '_PRODUCT_MEDIA_V1'; }

async function rpc(name,args={}){
  const {data,error} = await sb.rpc(name,args);
  if(error) throw error;
  return data;
}

function style(){
  if($('#nfReleaseV12Style')) return;
  const s=document.createElement('style');
  s.id='nfReleaseV12Style';
  s.textContent=`
  .nf-r12{margin:0 0 22px;border:2px solid #2a7a60;background:#f4faf7}
  .nf-r12-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;flex-wrap:wrap}
  .nf-r12-head h3{margin:4px 0 7px;color:#173f33}
  .nf-r12-head p{margin:0;max-width:760px;font-size:10.5px;line-height:1.55;color:#607269}
  .nf-r12-actions{display:flex;gap:8px;flex-wrap:wrap}
  .nf-r12-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin:15px 0}
  .nf-r12-stat{background:#fff;border:1px solid #d6e4dd;border-radius:13px;padding:12px}
  .nf-r12-stat b{display:block;font-size:22px;color:#173f33}.nf-r12-stat span{font-size:8px;font-weight:850;text-transform:uppercase;color:#6d7d76}
  .nf-r12-status{padding:11px 13px;border-radius:10px;background:#fff6df;border:1px solid #e8d29a;color:#66531d;font-size:10px;line-height:1.5}
  .nf-r12-status.good{background:#eff9f3;border-color:#b5d9c5;color:#285b43}
  .nf-r12-list{margin-top:11px;display:grid;grid-template-columns:repeat(2,1fr);gap:9px}
  .nf-r12-item{background:#fff;border:1px solid #dce6e1;border-radius:12px;padding:11px}
  .nf-r12-item small{display:block;color:#75847d}.nf-r12-item strong{display:block;margin:4px 0;color:#173f33}
  .nf-r12-tag{display:inline-block;padding:3px 6px;border-radius:999px;background:#e5f1eb;color:#245c48;font-size:8px;font-weight:850;margin:2px 3px 2px 0}
  @media(max-width:800px){.nf-r12-grid{grid-template-columns:repeat(2,1fr)}.nf-r12-list{grid-template-columns:1fr}}
  `;
  document.head.appendChild(s);
}

function ensure(){
  style();
  const host=$('#view-preview');
  if(!host) return null;

  // Kill all previous variants to avoid duplicates.
  $('#nfProductMediaPreviewPanel')?.remove();
  $('#nfProductReleasePanelV11')?.remove();

  let p=$('#nfProductReleasePanelV12');
  if(p) return p;

  p=document.createElement('article');
  p.id='nfProductReleasePanelV12';
  p.className='panel nf-r12';
  p.innerHTML=`
    <div class="nf-r12-head">
      <div>
        <span class="eyebrow">APPLICATION PRODUCT GALLERY · RELEASE</span>
        <h3 id="nfR12Title">Product Media Release</h3>
        <p>${L('Panel publikasi foto produk. Panel ini dimuat mandiri dan tidak bergantung pada form Data Entry.','Product-media publication panel. This panel loads independently of the Data Entry form.')}</p>
      </div>
      <div class="nf-r12-actions">
        <button id="nfR12Approve" class="btn primary compact" disabled>${L('Approve Product Media','Approve Product Media')}</button>
        <button id="nfR12Publish" class="btn danger compact" disabled>${L('Publish Product Media','Publish Product Media')}</button>
        <button id="nfR12Refresh" class="btn secondary compact">${L('Muat Ulang','Refresh')}</button>
      </div>
    </div>
    <div id="nfR12Grid" class="nf-r12-grid"></div>
    <div id="nfR12Status" class="nf-r12-status">Loading…</div>
    <div id="nfR12List" class="nf-r12-list"></div>`;
  host.prepend(p);

  $('#nfR12Approve').addEventListener('click',approve);
  $('#nfR12Publish').addEventListener('click',publish);
  $('#nfR12Refresh').addEventListener('click',refresh);
  return p;
}

async function resolveRole(){
  try {
    const d=await rpc('get_natfiber_editor_dashboard',{});
    role=d?.role||null;
  } catch { role=null; }
}

async function state(id){
  const rg=releaseGroup(id);
  // Use the release-preview RPC first; it is the canonical editor-facing source.
  const p=await rpc('get_natfiber_supplement_preview',{
    target_fiber_id:id,
    target_release_group:rg
  });

  const items=Array.isArray(p?.items)?p.items:[];
  const selected=items.filter(x=>x.is_selected!==false);
  const approved=selected.filter(x=>x.editor_status==='APPROVED');
  const hold=selected.filter(x=>x.editor_status==='HOLD');

  const {count:publicCount,error}=await sb.from('fiber_product_media')
    .select('*',{count:'exact',head:true})
    .eq('fiber_id',id)
    .eq('is_public',true)
    .eq('record_status','PUBLISHED');
  if(error) throw error;

  return {rg,items:selected,approved,hold,publicCount:publicCount||0};
}

function renderItems(st){
  const box=$('#nfR12List');
  if(!st.items.length){
    box.innerHTML=`<div class="nf-r12-item"><strong>${L('Tidak ada selected item.','No selected items.')}</strong><small>${esc(st.rg)}</small></div>`;
    return;
  }
  box.innerHTML=st.items.map(i=>`
    <div class="nf-r12-item">
      <small>${esc(i.release_item_id||'')} · ${esc(i.data_table||'')} · ${esc(i.record_id||'')}</small>
      <strong>${esc(i.public_label||i.record?.product_name_id||i.record?.product_name_en||i.record_id||'Product Media')}</strong>
      <span class="nf-r12-tag">${esc(i.editor_status||'')}</span>
    </div>`).join('');
}

async function refresh(){
  ensure();
  if(busy) return;
  busy=true;
  try{
    if(!role) await resolveRole();
    const id=activeFiber();
    const st=await state(id);
    const n=st.items.length, a=st.approved.length, h=st.hold.length, pub=st.publicCount;

    $('#nfR12Title').textContent=`${id} · Product Media Release`;
    $('#nfR12Grid').innerHTML=[
      [n,'Selected'],[a,'Approved'],[h,'Hold'],[pub,'Public']
    ].map(([v,k])=>`<div class="nf-r12-stat"><b>${v}</b><span>${k}</span></div>`).join('');

    const admin=role==='ADMIN';
    $('#nfR12Approve').disabled=!admin || n===0 || a===n;
    $('#nfR12Publish').disabled=!admin || n===0 || a!==n || pub>0;

    const s=$('#nfR12Status');
    if(pub>0){
      s.className='nf-r12-status good';
      s.innerHTML=`<strong>✓ ${L('Product Media sudah PUBLIC.','Product Media is PUBLIC.')}</strong> ${pub} ${L('item siap tampil di Applications.','item(s) ready for Applications.')}`;
    }else if(n===0){
      s.className='nf-r12-status';
      s.textContent=L('Release group kosong.','Release group is empty.');
    }else if(a===n){
      s.className='nf-r12-status';
      s.innerHTML=`<strong>${L('Semua item sudah APPROVED.','All items are APPROVED.')}</strong> ${L('Klik Publish Product Media.','Click Publish Product Media.')}`;
    }else{
      s.className='nf-r12-status';
      s.innerHTML=`<strong>${L('Menunggu approval ADMIN.','Waiting for ADMIN approval.')}</strong> ${a}/${n} Approved · ${esc(st.rg)}`;
    }
    renderItems(st);
    lastFiber=id;
  }catch(e){
    const s=$('#nfR12Status');
    if(s){s.className='nf-r12-status';s.textContent='ERROR: '+e.message;}
    console.error('[NatFiber Release Panel v1.2]',e);
  }finally{busy=false;}
}

async function approve(){
  if(role!=='ADMIN') return alert('ADMIN_REQUIRED');
  const id=activeFiber(),rg=releaseGroup(id);
  if(!confirm(L('Approve selected Product Media? Data tetap PRIVATE sampai Publish.','Approve selected Product Media? Data remains PRIVATE until Publish.')))return;
  try{
    await rpc('approve_natfiber_supplement',{target_fiber_id:id,target_release_group:rg});
    await refresh();
  }catch(e){alert(e.message);await refresh();}
}

async function publish(){
  if(role!=='ADMIN') return alert('ADMIN_REQUIRED');
  const id=activeFiber(),rg=releaseGroup(id);
  if(!confirm(L('Publish approved Product Media ke situs publik?','Publish approved Product Media to the public site?')))return;
  try{
    await rpc('publish_natfiber_supplement',{target_fiber_id:id,target_release_group:rg});
    await refresh();
  }catch(e){alert(e.message);await refresh();}
}

function boot(){
  ensure();
  setTimeout(refresh,250);
  document.addEventListener('click',e=>{
    if(e.target.closest('.nav-btn[data-view="preview"]')) setTimeout(refresh,80);
    if(e.target.closest('.language-switch [data-lang]')) setTimeout(refresh,100);
  });
  document.addEventListener('change',e=>{
    if(e.target?.id==='adminFiberSelector') setTimeout(refresh,100);
  });
  setInterval(()=>{
    ensure();
    const id=activeFiber();
    if(id!==lastFiber) refresh();
  },1200);
  console.info('[NatFiber] Product Release Panel v1.2 loaded independently.');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
else boot();
