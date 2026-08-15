/*
 NatFiber Encyclopedia — Product Media Release Panel v1.1
 Dedicated, robust Release Preview panel.
 Independent from Product Media Data Entry UI.
*/
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const CFG=window.NATFIBER_CONFIG||{};
if(!CFG.supabaseUrl||!CFG.publishableKey) throw new Error('NatFiber config missing');
const sb=createClient(CFG.supabaseUrl,CFG.publishableKey);

const $=s=>document.querySelector(s);
let role=null;
let lastFiber=null;
let busy=false;

function lang(){
  try{return window.NF_I18N?.getLang?.()||localStorage.getItem('natfiber_lang')||'id';}
  catch{return'id';}
}
function L(id,en){return lang()==='id'?id:en;}
function esc(v=''){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function activeFiber(){return $('#adminFiberSelector')?.value||localStorage.getItem('natfiber_admin_fiber')||'NF-0001';}
function releaseGroup(id=activeFiber()){return id.replace('-','')+'_PRODUCT_MEDIA_V1';}
async function rpc(name,args={}){
  const {data,error}=await sb.rpc(name,args);
  if(error)throw error;
  return data;
}

function addStyle(){
  if($('#nfProductReleasePanelStyle'))return;
  const s=document.createElement('style');
  s.id='nfProductReleasePanelStyle';
  s.textContent=`
    .nf-prp{margin:0 0 22px;border:1px solid #cfe0d8;background:linear-gradient(135deg,#f8fcfa,#eef7f2)}
    .nf-prp-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;flex-wrap:wrap}
    .nf-prp-head h3{margin:4px 0 7px;color:#173f33}
    .nf-prp-head p{margin:0;max-width:760px;font-size:10.5px;line-height:1.55;color:#63756d}
    .nf-prp-actions{display:flex;gap:8px;flex-wrap:wrap}
    .nf-prp-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin:15px 0}
    .nf-prp-stat{background:#fff;border:1px solid #dbe6e1;border-radius:13px;padding:12px}
    .nf-prp-stat b{display:block;font-size:21px;color:#173f33}
    .nf-prp-stat span{display:block;margin-top:3px;font-size:8.5px;font-weight:850;text-transform:uppercase;color:#6d7d76}
    .nf-prp-status{padding:11px 13px;border-radius:11px;background:#fff7e3;border:1px solid #ead49a;color:#6c571f;font-size:10px;line-height:1.5}
    .nf-prp-status.good{background:#eff9f3;border-color:#b8dac6;color:#285b43}
    .nf-prp-items{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:12px}
    .nf-prp-item{background:#fff;border:1px solid #dce6e1;border-radius:12px;padding:11px}
    .nf-prp-item .rid{font-size:8px;font-weight:850;color:#72817a}
    .nf-prp-item strong{display:block;margin:4px 0 6px;color:#173f33;font-size:11px}
    .nf-prp-tag{display:inline-block;margin:2px 4px 2px 0;padding:3px 6px;border-radius:999px;background:#e5f1eb;color:#245c48;font-size:8px;font-weight:850}
    .nf-prp-empty{margin-top:12px;padding:16px;border:1px dashed #bfcfc7;border-radius:12px;background:#fff;color:#687970;text-align:center;font-size:10px}
    @media(max-width:800px){.nf-prp-stats{grid-template-columns:repeat(2,1fr)}.nf-prp-items{grid-template-columns:1fr}}
  `;
  document.head.appendChild(s);
}

function ensurePanel(){
  const host=$('#view-preview');
  if(!host)return null;

  // Remove the older product release panel to avoid duplicate/conflicting UI.
  $('#nfProductMediaPreviewPanel')?.remove();

  let panel=$('#nfProductReleasePanelV11');
  if(panel)return panel;

  panel=document.createElement('article');
  panel.id='nfProductReleasePanelV11';
  panel.className='panel nf-prp';
  panel.innerHTML=`
    <div class="nf-prp-head">
      <div>
        <span class="eyebrow">APPLICATION PRODUCT GALLERY · RELEASE</span>
        <h3 id="nfPrpTitle">Product Media Release</h3>
        <p>${L(
          'Panel khusus untuk menyetujui dan mempublikasikan foto produk. Kandidat tetap PRIVATE sampai seluruh selected item di-approve oleh ADMIN lalu dipublish.',
          'Dedicated panel for approving and publishing product imagery. Candidates remain PRIVATE until all selected items are approved by an ADMIN and then published.'
        )}</p>
      </div>
      <div class="nf-prp-actions">
        <button id="nfPrpApprove" class="btn primary compact" disabled>${L('Approve Product Media','Approve Product Media')}</button>
        <button id="nfPrpPublish" class="btn danger compact" disabled>${L('Publish Product Media','Publish Product Media')}</button>
        <button id="nfPrpRefresh" class="btn secondary compact">${L('Muat Ulang','Refresh')}</button>
      </div>
    </div>
    <div id="nfPrpStats" class="nf-prp-stats"></div>
    <div id="nfPrpStatus" class="nf-prp-status">${L('Memuat status release…','Loading release status…')}</div>
    <div id="nfPrpItems" class="nf-prp-items"></div>
  `;
  host.prepend(panel);

  $('#nfPrpApprove').addEventListener('click',approve);
  $('#nfPrpPublish').addEventListener('click',publish);
  $('#nfPrpRefresh').addEventListener('click',refresh);
  return panel;
}

async function resolveRole(){
  try{
    const d=await rpc('get_natfiber_editor_dashboard',{});
    role=d?.role||null;
  }catch{role=null;}
}

async function getState(id){
  const rg=releaseGroup(id);

  const {data:manifest,error:mErr}=await sb.from('release_manifest')
    .select('release_item_id,data_table,record_id,editor_status,is_selected,public_label,release_note')
    .eq('fiber_id',id)
    .eq('release_group',rg)
    .order('release_item_id');
  if(mErr)throw mErr;

  const selected=(manifest||[]).filter(x=>x.is_selected);
  const approved=selected.filter(x=>x.editor_status==='APPROVED');
  const hold=selected.filter(x=>x.editor_status==='HOLD');

  const productIds=selected.filter(x=>x.data_table==='fiber_product_media').map(x=>x.record_id);
  let products=[];
  if(productIds.length){
    const {data,error}=await sb.from('fiber_product_media')
      .select('product_media_id,product_name_id,product_name_en,application_class,value_chain_stage,maturity_level,record_status,is_public,media_id')
      .in('product_media_id',productIds);
    if(error)throw error;
    products=data||[];
  }

  const publicProducts=products.filter(x=>x.is_public&&x.record_status==='PUBLISHED');

  return {rg,manifest:manifest||[],selected,approved,hold,products,publicProducts};
}

function renderItems(state){
  const productById=new Map(state.products.map(x=>[x.product_media_id,x]));
  const items=state.selected;
  if(!items.length){
    $('#nfPrpItems').innerHTML=`<div class="nf-prp-empty">${L(
      'Belum ada selected Product Media untuk serat aktif ini.',
      'No selected Product Media exists for the active fiber.'
    )}</div>`;
    return;
  }

  $('#nfPrpItems').innerHTML=items.map(i=>{
    const p=productById.get(i.record_id);
    const label=p
      ? (lang()==='id'?(p.product_name_id||i.public_label):(p.product_name_en||i.public_label))
      : (i.public_label||i.record_id);
    return `<article class="nf-prp-item">
      <div class="rid">${esc(i.release_item_id)} · ${esc(i.data_table)} · ${esc(i.record_id)}</div>
      <strong>${esc(label||i.record_id)}</strong>
      <span class="nf-prp-tag">${esc(i.editor_status)}</span>
      ${p?`<span class="nf-prp-tag">${esc(p.application_class)}</span><span class="nf-prp-tag">${esc(p.value_chain_stage)}</span><span class="nf-prp-tag">${esc(p.maturity_level||'')}</span>`:''}
    </article>`;
  }).join('');
}

async function refresh(){
  if(busy)return;
  const panel=ensurePanel();
  if(!panel)return;
  busy=true;
  try{
    if(!role)await resolveRole();
    const id=activeFiber();
    const state=await getState(id);

    $('#nfPrpTitle').textContent=`${id} · Product Media Release`;

    const selectedN=state.selected.length;
    const approvedN=state.approved.length;
    const holdN=state.hold.length;
    const publicN=state.publicProducts.length;

    $('#nfPrpStats').innerHTML=[
      [selectedN,'Selected'],
      [approvedN,'Approved'],
      [holdN,'Hold'],
      [publicN,'Public']
    ].map(([v,k])=>`<div class="nf-prp-stat"><b>${esc(v)}</b><span>${esc(k)}</span></div>`).join('');

    const isAdmin=role==='ADMIN';
    $('#nfPrpApprove').disabled=!isAdmin||selectedN===0||approvedN===selectedN;
    $('#nfPrpPublish').disabled=!isAdmin||selectedN===0||approvedN!==selectedN||publicN>0;

    const status=$('#nfPrpStatus');
    if(selectedN===0){
      status.className='nf-prp-status';
      status.innerHTML=`<strong>${L('Release group kosong.','Release group is empty.')}</strong> ${esc(state.rg)}`;
    }else if(publicN>0){
      status.className='nf-prp-status good';
      status.innerHTML=`<strong>✓ ${L('Product Media sudah PUBLIC.','Product Media is PUBLIC.')}</strong> ${publicN} ${L('produk siap tampil di tab Applications.','product item(s) ready for the Applications tab.')}`;
    }else if(approvedN===selectedN){
      status.className='nf-prp-status';
      status.innerHTML=`<strong>${L('Semua selected item sudah APPROVED.','All selected items are APPROVED.')}</strong> ${L('Langkah berikutnya: Publish Product Media.','Next step: Publish Product Media.')}`;
    }else{
      status.className='nf-prp-status';
      status.innerHTML=`<strong>${L('Menunggu persetujuan ADMIN.','Waiting for ADMIN approval.')}</strong> ${approvedN}/${selectedN} Approved · ${esc(state.rg)}`;
    }

    renderItems(state);
    lastFiber=id;
  }catch(e){
    const s=$('#nfPrpStatus');
    if(s){s.className='nf-prp-status';s.textContent=e.message;}
    console.error('[NatFiber] Product Media Release Panel v1.1',e);
  }finally{busy=false;}
}

async function approve(){
  if(role!=='ADMIN')return alert('ADMIN_REQUIRED');
  const id=activeFiber(),rg=releaseGroup(id);
  if(!confirm(L(
    `Approve seluruh selected Product Media untuk ${id}? Data masih PRIVATE setelah tahap ini.`,
    `Approve all selected Product Media for ${id}? Data remains PRIVATE after this step.`
  )))return;
  try{
    $('#nfPrpApprove').disabled=true;
    await rpc('approve_natfiber_supplement',{target_fiber_id:id,target_release_group:rg});
    await refresh();
  }catch(e){alert(e.message);await refresh();}
}

async function publish(){
  if(role!=='ADMIN')return alert('ADMIN_REQUIRED');
  const id=activeFiber(),rg=releaseGroup(id);
  if(!confirm(L(
    `Publish Product Media untuk ${id}? Record yang sudah approved akan menjadi PUBLIC.`,
    `Publish Product Media for ${id}? Approved records will become PUBLIC.`
  )))return;
  try{
    $('#nfPrpPublish').disabled=true;
    await rpc('publish_natfiber_supplement',{target_fiber_id:id,target_release_group:rg});
    await refresh();
  }catch(e){alert(e.message);await refresh();}
}

function boot(){
  addStyle();
  ensurePanel();

  document.addEventListener('click',e=>{
    if(e.target.closest('.nav-btn[data-view="preview"]'))setTimeout(refresh,100);
    if(e.target.closest('.language-switch [data-lang]'))setTimeout(refresh,120);
  });
  document.addEventListener('change',e=>{
    if(e.target?.id==='adminFiberSelector')setTimeout(refresh,120);
  });

  setInterval(()=>{
    ensurePanel();
    const id=activeFiber();
    if(id!==lastFiber)refresh();
  },1000);

  setTimeout(refresh,500);
  console.info('[NatFiber] Product Media Release Panel v1.1 loaded.');
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
else boot();
