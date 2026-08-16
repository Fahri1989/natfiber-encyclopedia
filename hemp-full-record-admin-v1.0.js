import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const CFG = window.NATFIBER_CONFIG || {};
if (!CFG.supabaseUrl || !CFG.publishableKey) throw new Error('NatFiber config missing');
const sb = createClient(CFG.supabaseUrl, CFG.publishableKey);

const FIBER_ID = 'NF-0005';
const GROUP = 'HEMP_FULL_RECORD_V1';
const $ = s => document.querySelector(s);
const esc = (v='') => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let role = null;
let busy = false;
let lastFiber = null;

function activeFiber(){
  return $('#adminFiberSelector')?.value || localStorage.getItem('natfiber_admin_fiber') || 'NF-0001';
}
async function rpc(name,args={}){
  const {data,error}=await sb.rpc(name,args);
  if(error) throw error;
  return data;
}
async function resolveRole(){
  try{
    const {data:{session}}=await sb.auth.getSession();
    if(!session){role=null;return null;}
    const d=await rpc('get_natfiber_editor_dashboard');
    role=d?.role||null;
  }catch{role=null;}
  return role;
}
function addStyle(){
  if($('#nfHempFullStyle')) return;
  const s=document.createElement('style');
  s.id='nfHempFullStyle';
  s.textContent=`
    #nfHempFullRecordPanel{border:2px solid #3f6f55;box-shadow:0 10px 30px rgba(23,63,51,.08);margin-bottom:20px}
    #nfHempFullRecordPanel[hidden]{display:none!important}
    #nfHempFullRecordPanel.nf-hidden-by-fiber:not([hidden]){display:block!important}
    body.nf-hemp-active .nf-fiber-context{display:none!important}
    body.nf-hemp-active #view-preview > .panel:not(#nfHempFullRecordPanel){display:none!important}
    body.nf-hemp-active #view-review > .panel{display:none!important}
    .nf-hemp-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}
    .nf-hemp-head h3{margin:4px 0 6px}.nf-hemp-head p{margin:0;color:#66776f;font-size:11px;line-height:1.55;max-width:780px}
    .nf-hemp-actions{display:flex;gap:8px;flex-wrap:wrap}
    .nf-hemp-note{margin:14px 0;padding:12px 14px;border:1px solid #d9e6df;border-radius:12px;background:#f3f8f5;font-size:10.5px;line-height:1.6;color:#50645b}
    .nf-hemp-note.warn{background:#fff8e9;border-color:#eed8a6;color:#75541b}
    .nf-hemp-sections{display:grid;gap:10px;margin-top:14px}
    .nf-hemp-section{border:1px solid #dce7e2;border-radius:14px;background:#fff;overflow:hidden}
    .nf-hemp-section summary{cursor:pointer;list-style:none;padding:12px 14px;display:flex;justify-content:space-between;gap:10px;align-items:center;font-size:11px;font-weight:800;color:#234a3b;background:#f8fbf9}
    .nf-hemp-section summary::-webkit-details-marker{display:none}
    .nf-hemp-badges{display:flex;gap:5px;flex-wrap:wrap}.nf-hemp-badge{font-size:8.5px;border-radius:999px;padding:3px 7px;background:#e5f2eb;color:#245d47;font-weight:800}.nf-hemp-badge.hold{background:#fff0d5;color:#8a5c12}
    .nf-hemp-table{overflow:auto;max-height:360px;border-top:1px solid #e6eeea}.nf-hemp-table table{width:100%;border-collapse:collapse;min-width:780px}.nf-hemp-table th,.nf-hemp-table td{padding:8px 10px;border-bottom:1px solid #edf2ef;text-align:left;vertical-align:top;font-size:9.5px}.nf-hemp-table th{position:sticky;top:0;background:#f1f6f3;z-index:1}.nf-hemp-hold{color:#9a6410;font-weight:800}.nf-hemp-approved{color:#246947;font-weight:800}.nf-hemp-selected{color:#355e77;font-weight:800}
  `;
  document.head.appendChild(s);
}
function ensureSelector(){
  const sel=$('#adminFiberSelector');
  if(!sel) return false;
  if(![...sel.options].some(o=>o.value===FIBER_ID)){
    const o=document.createElement('option');
    o.value=FIBER_ID;o.textContent='NF-0005 · Hemp';sel.appendChild(o);
  }
  if(localStorage.getItem('natfiber_admin_fiber')===FIBER_ID) sel.value=FIBER_ID;
  if(!sel.dataset.nfHempBound){
    sel.dataset.nfHempBound='1';
    sel.addEventListener('change',()=>{
      localStorage.setItem('natfiber_admin_fiber',sel.value);
      setTimeout(syncContext,50);setTimeout(refresh,120);
    });
  }
  return true;
}
function syncContext(){
  const isHemp=activeFiber()===FIBER_ID;
  document.body.classList.toggle('nf-hemp-active',isHemp);
  const panel=$('#nfHempFullRecordPanel');
  if(panel) panel.hidden=!isHemp;
  if(isHemp){
    const title=$('#viewTitle');
    if(title && $('#view-preview')?.classList.contains('active')) title.textContent='Release Preview · Hemp';
    if(title && $('#view-review')?.classList.contains('active')) title.textContent='Review Queue · Hemp';
  }
}
function ensurePanel(){
  const host=$('#view-preview'); if(!host) return null;
  let panel=$('#nfHempFullRecordPanel');
  if(panel) return panel;
  panel=document.createElement('article');
  panel.id='nfHempFullRecordPanel';
  panel.className='panel';
  panel.dataset.nfFiberAware='1';
  panel.dataset.nfFiberScope=FIBER_ID;
  panel.innerHTML=`
    <div class="nf-hemp-head">
      <div><span class="eyebrow">NF-0005 · FULL ENGINEERING RECORD</span><h3>Hemp — Full Record Release V1</h3><p><em>Cannabis sativa L.</em> stem bast engineering record. Bast fibre, hurd/shive, seed/oil and cannabinoid-related evidence are kept as separate material scopes. Semua kandidat tetap PRIVATE sampai ADMIN approval dan publication.</p></div>
      <div class="nf-hemp-actions"><button id="nfHempApprove" class="btn primary compact" disabled>Approve selected</button><button id="nfHempPublish" class="btn danger compact" disabled>Publish full record</button><button id="nfHempRefresh" class="btn secondary compact">Refresh</button></div>
    </div>
    <div id="nfHempSummary" class="summary-grid release-summary"></div>
    <div id="nfHempStatus" class="release-status-note"></div>
    <div id="nfHempBody"><div class="muted">Loading ${GROUP}…</div></div>`;
  host.prepend(panel);
  $('#nfHempApprove')?.addEventListener('click',approve);
  $('#nfHempPublish')?.addEventListener('click',publish);
  $('#nfHempRefresh')?.addEventListener('click',refresh);
  return panel;
}
const summaryCard=(v,l)=>`<div class="summary-card"><b>${esc(v)}</b><span>${esc(l)}</span></div>`;
function recordTitle(item){
  const r=item.record||{};
  return r.application_name||r.title||r.name||r.display_field||r.component||r.parameter||r.property_name||r.agent_method||r.process_name||r.matrix_name||r.statistic_name||r.commodity_definition||r.place_name||r.product_name_en||r.technique||r.domain||r.issue_type||r.gap||item.public_label||item.record_id;
}
function renderSection(key,items){
  const selected=items.filter(x=>x.is_selected).length;
  const holds=items.filter(x=>x.editor_status==='HOLD').length;
  const approved=items.filter(x=>x.is_selected&&x.editor_status==='APPROVED').length;
  const rows=items.map(i=>`<tr><td><b>${esc(i.record_id)}</b></td><td>${esc(recordTitle(i))}</td><td class="${i.editor_status==='HOLD'?'nf-hemp-hold':i.editor_status==='APPROVED'?'nf-hemp-approved':'nf-hemp-selected'}">${esc(i.editor_status)}</td><td>${i.is_selected?'YES':'NO'}</td><td>${esc(i.release_note||i.selection_reason||'')}</td></tr>`).join('');
  return `<details class="nf-hemp-section" ${holds?'open':''}><summary><span>${esc(key.replaceAll('_',' ').toUpperCase())}</span><span class="nf-hemp-badges"><span class="nf-hemp-badge">${items.length} items</span><span class="nf-hemp-badge">${selected} selected</span><span class="nf-hemp-badge">${approved} approved</span>${holds?`<span class="nf-hemp-badge hold">${holds} HOLD</span>`:''}</span></summary><div class="nf-hemp-table"><table><thead><tr><th>ID</th><th>Record</th><th>Status</th><th>Selected</th><th>Editorial note</th></tr></thead><tbody>${rows}</tbody></table></div></details>`;
}
async function refresh(){
  const panel=ensurePanel(); if(!panel) return;
  syncContext(); if(activeFiber()!==FIBER_ID||busy) return;
  busy=true;
  try{
    if(!role) await resolveRole();
    const d=await rpc('get_natfiber_full_record_preview',{target_fiber_id:FIBER_ID,target_release_group:GROUP});
    if(!d) throw new Error('Editor session required for NF-0005 full-record preview.');
    const s=d.summary||{}, items=d.items||[];
    const selected=Number(s.selected_items||0), approved=Number(s.approved_items||0), holds=Number(s.hold_items||0), uholds=Number(s.unselected_hold_items||0);
    const allApproved=selected>0 && approved===selected && holds===0;
    $('#nfHempSummary').innerHTML=[summaryCard(selected,'Selected items'),summaryCard(approved,'Approved'),summaryCard(uholds,'Unselected HOLD'),summaryCard(items.length,'Total manifest')].join('');
    $('#nfHempApprove').disabled=!(role==='ADMIN'&&selected>0&&approved<selected&&holds===0);
    $('#nfHempPublish').disabled=!(role==='ADMIN'&&allApproved);
    $('#nfHempStatus').innerHTML=allApproved
      ? '<strong>APPROVED · PRIVATE.</strong> Seluruh selected items telah disetujui. Publish full record akan membuka NF-0005 dan hanya item yang selected.'
      : `<strong>PRIVATE.</strong> ${selected-approved} selected item menunggu approval. ${uholds} HOLD sengaja tidak dipilih dan tidak akan ikut publish.`;
    const grouped={}; for(const i of items){(grouped[i.section_key]??=[]).push(i);}
    const sections=Object.entries(grouped).map(([k,v])=>renderSection(k,v)).join('');
    $('#nfHempBody').innerHTML=`<div class="nf-hemp-note"><strong>Publication guard:</strong> World FAOSTAT exact series belum dipaksakan; intrinsic H-NMR dan XRF tetap NOT_FOUND; disputed elementary-fibre scope, material-scope chemistry, unresolved characterization-media reuse, dan klaim produk yang belum source-explicit tetap HOLD/private.</div><div class="nf-hemp-note warn"><strong>Gold Standard:</strong> Full record dapat dipublikasikan tanpa otomatis memberi Gold certification. Gold tetap menunggu gap audit yang masih terbuka.</div><div class="nf-hemp-sections">${sections}</div>`;
  }catch(e){
    $('#nfHempBody').innerHTML=`<div class="message error">${esc(e.message||e)}</div>`;
  }finally{busy=false;}
}
async function approve(){
  if(role!=='ADMIN') return;
  if(!confirm('Approve seluruh SELECTED item NF-0005 Hemp Full Record V1?\n\nHOLD yang tidak dipilih tetap PRIVATE. Approval belum mempublikasikan data.')) return;
  try{await rpc('approve_natfiber_full_record',{target_fiber_id:FIBER_ID,target_release_group:GROUP});await refresh();}catch(e){alert(e.message||e);}
}
async function publish(){
  if(role!=='ADMIN') return;
  if(!confirm('Publish NF-0005 Hemp Full Record V1?\n\nHanya item SELECTED + APPROVED yang dipublikasikan. HOLD tetap PRIVATE.')) return;
  try{await rpc('publish_natfiber_full_record',{target_fiber_id:FIBER_ID,target_release_group:GROUP});await refresh();alert('NF-0005 Hemp Full Record published. Lakukan audit situs publik setelah data refresh.');}catch(e){alert(e.message||e);}
}
function boot(){
  addStyle();
  setInterval(()=>{
    if(!$('#editorApp')) return;
    ensureSelector();ensurePanel();syncContext();
    const now=activeFiber();
    if(now!==lastFiber){lastFiber=now;if(now===FIBER_ID)refresh();}
  },500);
  document.addEventListener('click',e=>{if(e.target.closest('[data-view="preview"]'))setTimeout(()=>{syncContext();if(activeFiber()===FIBER_ID)refresh();},100);});
  setTimeout(async()=>{await resolveRole();ensureSelector();ensurePanel();syncContext();if(activeFiber()===FIBER_ID)refresh();},350);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
