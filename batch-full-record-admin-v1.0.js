import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const CFG = window.NATFIBER_CONFIG || {};
if (!CFG.supabaseUrl || !CFG.publishableKey) throw new Error('NatFiber config missing');
const sb = createClient(CFG.supabaseUrl, CFG.publishableKey);
const $ = s => document.querySelector(s);
const esc = (v='') => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const FLOWS = {
  'NF-0006': {name:'Kenaf', scientific:'Sabdariffa cannabina', group:'KENAF_FULL_RECORD_V1'},
  'NF-0007': {name:'Ramie', scientific:'Boehmeria nivea', group:'RAMIE_FULL_RECORD_V1'},
  'NF-0008': {name:'Abaca', scientific:'Musa textilis', group:'ABACA_FULL_RECORD_V1'},
  'NF-0009': {name:'Coir', scientific:'Cocos nucifera', group:'COIR_FULL_RECORD_V1'},
  'NF-0010': {name:'Kapok', scientific:'Ceiba pentandra', group:'KAPOK_FULL_RECORD_V1'},
  'NF-0011': {name:'Banana fiber', scientific:'Musa spp.', group:'BANANA_FULL_RECORD_V1'},
  'NF-0012': {name:'Pineapple leaf fiber', scientific:'Ananas comosus', group:'PALF_FULL_RECORD_V1'},
  'NF-0013': {name:'Bamboo fiber', scientific:'Bambusoideae spp.', group:'BAMBOO_FULL_RECORD_V1'},
  'NF-0014': {name:'Oil palm empty fruit bunch fiber', scientific:'Elaeis guineensis', group:'OPEFB_FULL_RECORD_V1'},
  'NF-0015': {name:'Sugarcane bagasse fiber', scientific:'Saccharum spp.', group:'BAGASSE_FULL_RECORD_V1'},
  'NF-0016': {name:'Rice straw fiber', scientific:'Oryza sativa', group:'RICE_STRAW_FULL_RECORD_V1'},
  'NF-0017': {name:'Rice husk fiber', scientific:'Oryza sativa', group:'RICE_HUSK_FULL_RECORD_V1'},
  'NF-0018': {name:'Corn husk fiber', scientific:'Zea mays', group:'CORN_HUSK_FULL_RECORD_V1'},
  'NF-0019': {name:'Corn stalk fiber', scientific:'Zea mays', group:'CORN_STALK_FULL_RECORD_V1'},
  'NF-0020': {name:'Water hyacinth fiber', scientific:'Pontederia crassipes', group:'WATER_HYACINTH_FULL_RECORD_V1'},
  'NF-0021': {name:'Pandanus fiber', scientific:'Pandanus spp.', group:'PANDANUS_FULL_RECORD_V1'},
  'NF-0022': {name:'Date palm fiber', scientific:'Phoenix dactylifera', group:'DATE_PALM_FULL_RECORD_V1'},
  'NF-0023': {name:'Alfa fiber', scientific:'Macrochloa tenacissima', group:'ALFA_FULL_RECORD_V1'},
  'NF-0024': {name:'Nettle fiber', scientific:'Urtica dioica', group:'NETTLE_FULL_RECORD_V1'},
  'NF-0025': {name:'Palmyra fiber', scientific:'Borassus flabellifer', group:'PALMYRA_FULL_RECORD_V1'}
};
const ORDER = Object.keys(FLOWS);
let role = null, busy = false, lastFiber = null;

function activeFiber(){ return $('#adminFiberSelector')?.value || localStorage.getItem('natfiber_admin_fiber') || 'NF-0001'; }
function activeFlow(){ return FLOWS[activeFiber()] || null; }
async function rpc(name,args={}){ const {data,error}=await sb.rpc(name,args); if(error) throw error; return data; }
async function resolveRole(){
  try{
    const {data:{session}}=await sb.auth.getSession();
    if(!session){ role=null; return null; }
    const d=await rpc('get_natfiber_editor_dashboard');
    role=d?.role||null;
  }catch{ role=null; }
  return role;
}
function addStyle(){
  if($('#nfBatchFullStyle')) return;
  const s=document.createElement('style'); s.id='nfBatchFullStyle';
  s.textContent=`
  #nfBatchFullRecordPanel{border:2px solid #426b5a;box-shadow:0 10px 30px rgba(28,67,52,.08);margin-bottom:20px}
  #nfBatchFullRecordPanel[hidden]{display:none!important}
  #nfBatchFullRecordPanel.nf-hidden-by-fiber:not([hidden]){display:block!important}
  body.nf-batch-full-active .nf-fiber-context{display:none!important}
  body.nf-batch-full-active #view-preview > .panel:not(#nfBatchFullRecordPanel){display:none!important}
  body.nf-batch-full-active #view-review > .panel{display:none!important}
  .nf-batch-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}
  .nf-batch-head h3{margin:4px 0 6px}.nf-batch-head p{margin:0;color:#66776f;font-size:11px;line-height:1.55;max-width:820px}
  .nf-batch-actions,.nf-batch-nav{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
  .nf-batch-nav{border-right:1px solid #d8e2dd;padding-right:8px}
  .nf-batch-note{margin:14px 0;padding:12px 14px;border:1px solid #d9e6df;border-radius:12px;background:#f3f8f5;font-size:10.5px;line-height:1.6;color:#50645b}
  .nf-batch-note.warn{background:#fff8e9;border-color:#eed8a6;color:#75541b}
  .nf-batch-note.danger{background:#fff0ee;border-color:#e9c1ba;color:#823c31}
  .nf-batch-progress{margin:12px 0 2px;display:flex;align-items:center;gap:10px;font-size:9px;color:#61736a}
  .nf-batch-progress-track{flex:1;height:8px;border-radius:999px;background:#e7eee9;overflow:hidden}.nf-batch-progress-bar{height:100%;background:#39745a}
  .nf-batch-sections{display:grid;gap:10px;margin-top:14px}
  .nf-batch-section{border:1px solid #dce7e2;border-radius:14px;background:#fff;overflow:hidden}
  .nf-batch-section summary{cursor:pointer;list-style:none;padding:12px 14px;display:flex;justify-content:space-between;gap:10px;align-items:center;font-size:11px;font-weight:800;color:#234a3b;background:#f8fbf9}
  .nf-batch-section summary::-webkit-details-marker{display:none}
  .nf-batch-badges{display:flex;gap:5px;flex-wrap:wrap}.nf-batch-badge{font-size:8.5px;border-radius:999px;padding:3px 7px;background:#e5f2eb;color:#245d47;font-weight:800}.nf-batch-badge.hold{background:#fff0d5;color:#8a5c12}.nf-batch-badge.reject{background:#ffe3df;color:#9b372a}
  .nf-batch-table{overflow:auto;max-height:380px;border-top:1px solid #e6eeea}.nf-batch-table table{width:100%;border-collapse:collapse;min-width:820px}.nf-batch-table th,.nf-batch-table td{padding:8px 10px;border-bottom:1px solid #edf2ef;text-align:left;vertical-align:top;font-size:9.5px}.nf-batch-table th{position:sticky;top:0;background:#f1f6f3;z-index:1}
  .nf-batch-hold{color:#9a6410;font-weight:800}.nf-batch-reject{color:#a43d30;font-weight:800}.nf-batch-approved{color:#246947;font-weight:800}.nf-batch-selected{color:#355e77;font-weight:800}`;
  document.head.appendChild(s);
}
function ensureSelector(){
  const sel=$('#adminFiberSelector'); if(!sel) return false;
  for(const id of ORDER){
    if(![...sel.options].some(o=>o.value===id)){
      const o=document.createElement('option'); o.value=id; o.textContent=`${id} · ${FLOWS[id].name}`; sel.appendChild(o);
    }
  }
  const saved=localStorage.getItem('natfiber_admin_fiber');
  if(saved && FLOWS[saved]) sel.value=saved;
  if(!sel.dataset.nfBatchFullBound){
    sel.dataset.nfBatchFullBound='1';
    sel.addEventListener('change',()=>{
      localStorage.setItem('natfiber_admin_fiber',sel.value);
      setTimeout(syncContext,40); setTimeout(refresh,100);
    });
  }
  return true;
}
function syncContext(){
  const flow=activeFlow(), active=Boolean(flow);
  document.body.classList.toggle('nf-batch-full-active',active);
  const p=$('#nfBatchFullRecordPanel');
  if(p){ p.hidden=!active; if(active) p.classList.remove('nf-hidden-by-fiber'); }
  if(active){
    const title=$('#viewTitle');
    if(title && $('#view-preview')?.classList.contains('active')) title.textContent=`Release Preview · ${flow.name}`;
    if(title && $('#view-review')?.classList.contains('active')) title.textContent=`Review Queue · ${flow.name}`;
  }
}
function ensurePanel(){
  const host=$('#view-preview'); if(!host) return null;
  let p=$('#nfBatchFullRecordPanel'); if(p) return p;
  p=document.createElement('article'); p.id='nfBatchFullRecordPanel'; p.className='panel'; p.dataset.nfFiberAware='1';
  p.innerHTML=`
  <div class="nf-batch-head">
    <div><span id="nfBatchEyebrow" class="eyebrow">NF-0006–NF-0025 · FULL ENGINEERING RECORD</span><h3 id="nfBatchTitle">Batch Full Record Release</h3><p id="nfBatchSubtitle">Loading fibre context…</p></div>
    <div class="nf-batch-actions">
      <div class="nf-batch-nav"><button id="nfBatchPrev" class="btn secondary compact">← Previous</button><button id="nfBatchNext" class="btn secondary compact">Next →</button></div>
      <button id="nfBatchApprove" class="btn primary compact" disabled>Approve selected</button>
      <button id="nfBatchPublish" class="btn danger compact" disabled>Publish full record</button>
      <button id="nfBatchRefresh" class="btn secondary compact">Refresh</button>
    </div>
  </div>
  <div id="nfBatchProgress" class="nf-batch-progress"></div>
  <div id="nfBatchSummary" class="summary-grid release-summary"></div>
  <div id="nfBatchStatus" class="release-status-note"></div>
  <div id="nfBatchBody"><div class="muted">Loading release manifest…</div></div>`;
  host.prepend(p);
  $('#nfBatchApprove').addEventListener('click',approve);
  $('#nfBatchPublish').addEventListener('click',publish);
  $('#nfBatchRefresh').addEventListener('click',refresh);
  $('#nfBatchPrev').addEventListener('click',()=>move(-1));
  $('#nfBatchNext').addEventListener('click',()=>move(1));
  return p;
}
function move(delta){
  const id=activeFiber(), idx=ORDER.indexOf(id); if(idx<0) return;
  const target=ORDER[Math.max(0,Math.min(ORDER.length-1,idx+delta))];
  const sel=$('#adminFiberSelector'); if(!sel||target===id) return;
  sel.value=target; localStorage.setItem('natfiber_admin_fiber',target);
  sel.dispatchEvent(new Event('change',{bubbles:true}));
}
const card=(v,l)=>`<div class="summary-card"><b>${esc(v)}</b><span>${esc(l)}</span></div>`;
function titleOf(i){
  const r=i.record||{};
  return r.application_name||r.title||r.name||r.display_field||r.component||r.parameter||r.property_name||
    r.agent_method||r.process_name||r.matrix_name||r.statistic_name||r.commodity_definition||r.place_name||
    r.product_name_en||r.technique||r.domain||r.issue_type||r.gap||i.public_label||i.record_id;
}
function cls(s){ return s==='HOLD'?'nf-batch-hold':s==='REJECTED'?'nf-batch-reject':s==='APPROVED'?'nf-batch-approved':'nf-batch-selected'; }
function renderSection(key,items){
  const selected=items.filter(x=>x.is_selected).length;
  const approved=items.filter(x=>x.is_selected&&x.editor_status==='APPROVED').length;
  const holds=items.filter(x=>x.editor_status==='HOLD').length;
  const rejected=items.filter(x=>x.editor_status==='REJECTED').length;
  const rows=items.map(i=>`<tr><td><b>${esc(i.record_id)}</b></td><td>${esc(titleOf(i))}</td><td class="${cls(i.editor_status)}">${esc(i.editor_status)}</td><td>${i.is_selected?'YES':'NO'}</td><td>${esc(i.release_note||i.selection_reason||'')}</td></tr>`).join('');
  return `<details class="nf-batch-section" ${(holds||rejected)?'open':''}><summary><span>${esc(key.replaceAll('_',' ').toUpperCase())}</span><span class="nf-batch-badges"><span class="nf-batch-badge">${items.length} items</span><span class="nf-batch-badge">${selected} selected</span><span class="nf-batch-badge">${approved} approved</span>${holds?`<span class="nf-batch-badge hold">${holds} HOLD</span>`:''}${rejected?`<span class="nf-batch-badge reject">${rejected} REJECTED</span>`:''}</span></summary><div class="nf-batch-table"><table><thead><tr><th>ID</th><th>Record</th><th>Status</th><th>Selected</th><th>Editorial note</th></tr></thead><tbody>${rows}</tbody></table></div></details>`;
}
async function refresh(){
  const panel=ensurePanel(); if(!panel) return;
  syncContext();
  const id=activeFiber(), flow=activeFlow(); if(!flow||busy) return;
  busy=true;
  try{
    if(!role) await resolveRole();
    const d=await rpc('get_natfiber_full_record_preview',{target_fiber_id:id,target_release_group:flow.group});
    if(!d) throw new Error(`Editor session required for ${id} full-record preview.`);
    const s=d.summary||{}, items=d.items||[];
    const selected=Number(s.selected_items ?? items.filter(x=>x.is_selected).length);
    const approved=Number(s.approved_items ?? items.filter(x=>x.is_selected&&x.editor_status==='APPROVED').length);
    const selectedHold=Number(s.hold_items ?? items.filter(x=>x.is_selected&&x.editor_status==='HOLD').length);
    const unselectedHold=Number(s.unselected_hold_items ?? items.filter(x=>!x.is_selected&&x.editor_status==='HOLD').length);
    const rejected=items.filter(x=>!x.is_selected&&x.editor_status==='REJECTED').length;
    const allApproved=selected>0 && approved===selected && selectedHold===0;
    const isPublished=Boolean(d.fiber?.is_public===true || d.fiber?.publication_status==='published' ||
      (items.length && items.filter(x=>x.is_selected).every(x=>x.record?.is_public===true)));
    $('#nfBatchEyebrow').textContent=`${id} · ${flow.group}`;
    $('#nfBatchTitle').textContent=`${flow.name} — Full Record Release V1`;
    $('#nfBatchSubtitle').innerHTML=`<em>${esc(flow.scientific)}</em>. PRIVATE curated release; HOLD/REJECTED records remain outside publication. Setiap serat mempunyai Human Admin gate independen.`;
    const idx=ORDER.indexOf(id)+1, pct=idx/ORDER.length*100;
    $('#nfBatchProgress').innerHTML=`<span>${idx}/${ORDER.length}</span><div class="nf-batch-progress-track"><div class="nf-batch-progress-bar" style="width:${pct}%"></div></div><span>${esc(flow.name)}</span>`;
    $('#nfBatchPrev').disabled=idx<=1; $('#nfBatchNext').disabled=idx>=ORDER.length;
    $('#nfBatchSummary').innerHTML=[card(selected,'Selected'),card(approved,'Approved'),card(unselectedHold,'Unselected HOLD'),card(rejected,'Rejected'),card(items.length,'Total manifest')].join('');
    $('#nfBatchApprove').disabled=!(role==='ADMIN'&&!isPublished&&selected>0&&approved<selected&&selectedHold===0);
    $('#nfBatchPublish').disabled=!(role==='ADMIN'&&!isPublished&&allApproved);
    if(isPublished) $('#nfBatchStatus').innerHTML='<strong>PUBLISHED.</strong> Selected records public; HOLD/REJECTED tetap excluded.';
    else if(allApproved) $('#nfBatchStatus').innerHTML=`<strong>APPROVED · PRIVATE.</strong> ${selected}/${selected} selected items approved. Publish tetap tindakan Admin terpisah.`;
    else $('#nfBatchStatus').innerHTML=`<strong>PRIVATE.</strong> ${selected-approved} selected item menunggu approval. ${unselectedHold} HOLD dan ${rejected} REJECTED tetap tidak dipilih.`;
    const grouped={}; for(const i of items) (grouped[i.section_key]??=[]).push(i);
    const sections=Object.entries(grouped).map(([k,v])=>renderSection(k,v)).join('');
    $('#nfBatchBody').innerHTML=`<div class="nf-batch-note"><strong>Scientific guard:</strong> source-scoped observations dapat dirilis setelah Admin approval; heterogeneous canonicals, crop→residue conversions, combined-HS single-fibre claims, material-scope contamination, dan NOT_FOUND_INTRINSIC tetap excluded.</div><div class="nf-batch-note warn"><strong>Media guard:</strong> Mega Research belum menyelesaikan direct asset + licence untuk mayoritas hero. Scientific record tidak ditahan hanya karena gambar belum reusable.</div>${rejected?`<div class="nf-batch-note danger"><strong>REJECTED:</strong> ${rejected} record dikarantina dan tidak dapat ikut release ini.</div>`:''}<div class="nf-batch-sections">${sections}</div>`;
  }catch(e){
    $('#nfBatchBody').innerHTML=`<div class="message error">${esc(e.message||e)}</div>`;
  }finally{ busy=false; }
}
async function approve(){
  const id=activeFiber(), flow=activeFlow(); if(role!=='ADMIN'||!flow) return;
  if(!confirm(`Approve seluruh SELECTED item ${id} ${flow.name}?\n\nHOLD/REJECTED tetap PRIVATE. Approval belum mempublikasikan data.`)) return;
  try{ await rpc('approve_natfiber_full_record',{target_fiber_id:id,target_release_group:flow.group}); await refresh(); }
  catch(e){ alert(e.message||e); }
}
async function publish(){
  const id=activeFiber(), flow=activeFlow(); if(role!=='ADMIN'||!flow) return;
  if(!confirm(`Publish ${id} ${flow.name} Full Record V1?\n\nHanya SELECTED + APPROVED yang dipublikasikan. HOLD/REJECTED tetap PRIVATE.`)) return;
  try{
    await rpc('publish_natfiber_full_record',{target_fiber_id:id,target_release_group:flow.group});
    await refresh();
    alert(`${id} ${flow.name} published. Klik Next → untuk serat berikutnya.`);
  }catch(e){ alert(e.message||e); }
}
function boot(){
  addStyle();
  setInterval(()=>{
    if(!$('#editorApp')) return;
    ensureSelector(); ensurePanel(); syncContext();
    const now=activeFiber();
    if(now!==lastFiber){ lastFiber=now; if(FLOWS[now]) refresh(); }
  },500);
  document.addEventListener('click',e=>{
    if(e.target.closest('[data-view="preview"]')) setTimeout(()=>{syncContext();if(activeFlow())refresh();},100);
  });
  setTimeout(async()=>{
    await resolveRole(); ensureSelector(); ensurePanel(); syncContext(); if(activeFlow()) refresh();
  },350);
  console.info('[NatFiber] NF-0006–NF-0025 Batch Full Record Admin v1.0 loaded.');
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
