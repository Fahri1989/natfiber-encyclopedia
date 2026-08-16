import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const CFG = window.NATFIBER_CONFIG || {};
if (!CFG.supabaseUrl || !CFG.publishableKey) throw new Error('NatFiber config missing');
const sb = createClient(CFG.supabaseUrl, CFG.publishableKey);

const FIBER_ID = 'NF-0003';
const GROUP = 'JUTE_MEDIA_ENHANCEMENT_V1';
const $ = s => document.querySelector(s);
const esc = (v='') => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let role = null, busy = false, lastFiber = null;

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
  if($('#nfJuteMediaStyle')) return;
  const s=document.createElement('style');
  s.id='nfJuteMediaStyle';
  s.textContent=`
    body.nf-jute-active #view-preview > #nfJuteMediaReleasePanel.panel{display:block!important}
    #nfJuteMediaReleasePanel{border:2px solid #9a6b25;box-shadow:0 10px 30px rgba(101,70,24,.08);margin-bottom:20px}
    #nfJuteMediaReleasePanel[hidden]{display:none!important}
    .nf-jm-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}
    .nf-jm-head h3{margin:4px 0 6px}.nf-jm-head p{margin:0;color:#66776f;font-size:11px;line-height:1.55;max-width:790px}
    .nf-jm-actions{display:flex;gap:8px;flex-wrap:wrap}
    .nf-jm-note{margin:14px 0;padding:12px 14px;border:1px solid #e7dcc9;border-radius:12px;background:#fffaf1;font-size:10.5px;line-height:1.6;color:#665235}
    .nf-jm-section{border:1px solid #e5e7e4;border-radius:14px;background:#fff;overflow:hidden;margin-top:10px}
    .nf-jm-section summary{cursor:pointer;list-style:none;padding:12px 14px;display:flex;justify-content:space-between;gap:10px;align-items:center;font-size:11px;font-weight:800;color:#234a3b;background:#f8fbf9}
    .nf-jm-section summary::-webkit-details-marker{display:none}
    .nf-jm-badges{display:flex;gap:5px;flex-wrap:wrap}.nf-jm-badge{font-size:8.5px;border-radius:999px;padding:3px 7px;background:#e5f2eb;color:#245d47;font-weight:800}
    .nf-jm-table{overflow:auto;max-height:420px;border-top:1px solid #e6eeea}.nf-jm-table table{width:100%;border-collapse:collapse;min-width:850px}.nf-jm-table th,.nf-jm-table td{padding:8px 10px;border-bottom:1px solid #edf2ef;text-align:left;vertical-align:top;font-size:9.5px}.nf-jm-table th{position:sticky;top:0;background:#f1f6f3;z-index:1}.nf-jm-approved{color:#246947;font-weight:800}.nf-jm-selected{color:#355e77;font-weight:800}
  `;
  document.head.appendChild(s);
}
function ensurePanel(){
  const host=$('#view-preview'); if(!host) return null;
  let panel=$('#nfJuteMediaReleasePanel');
  if(panel) return panel;
  panel=document.createElement('article');
  panel.id='nfJuteMediaReleasePanel';
  panel.className='panel';
  panel.dataset.nfFiberAware='1';
  panel.dataset.nfFiberScope=FIBER_ID;
  panel.innerHTML=`
    <div class="nf-jm-head">
      <div><span class="eyebrow">NF-0003 · MEDIA ENHANCEMENT</span><h3>Jute — Media Gallery Enhancement V1</h3><p>Fibre-first visual chain: plant → field/retting → extraction → raw fibre → processed/dried fibre → fabric/rope/geotextile → product. Semua kandidat tetap PRIVATE sampai ADMIN approval dan publication.</p></div>
      <div class="nf-jm-actions"><button id="nfJuteMediaApprove" class="btn primary compact" disabled>Approve media</button><button id="nfJuteMediaPublish" class="btn danger compact" disabled>Publish media</button><button id="nfJuteMediaRefresh" class="btn secondary compact">Refresh</button></div>
    </div>
    <div id="nfJuteMediaSummary" class="summary-grid release-summary"></div>
    <div id="nfJuteMediaStatus" class="release-status-note"></div>
    <div id="nfJuteMediaBody"><div class="muted">Loading ${GROUP}…</div></div>`;
  host.prepend(panel);
  $('#nfJuteMediaApprove')?.addEventListener('click',approve);
  $('#nfJuteMediaPublish')?.addEventListener('click',publish);
  $('#nfJuteMediaRefresh')?.addEventListener('click',refresh);
  return panel;
}
function syncContext(){
  const panel=$('#nfJuteMediaReleasePanel');
  if(panel) panel.hidden=activeFiber()!==FIBER_ID;
}
const summaryCard=(v,l)=>`<div class="summary-card"><b>${esc(v)}</b><span>${esc(l)}</span></div>`;
function recordTitle(item){
  const r=item.record||{};
  return r.title||r.product_name_en||r.product_name_id||item.public_label||item.record_id;
}
function renderSection(key,items){
  const approved=items.filter(x=>x.editor_status==='APPROVED').length;
  const rows=items.map(i=>`<tr><td><b>${esc(i.record_id)}</b></td><td>${esc(recordTitle(i))}</td><td>${esc(i.record?.media_type||i.record?.product_category||'—')}</td><td class="${i.editor_status==='APPROVED'?'nf-jm-approved':'nf-jm-selected'}">${esc(i.editor_status)}</td><td>${esc(i.release_note||'')}</td></tr>`).join('');
  return `<details class="nf-jm-section" open><summary><span>${esc(key.replaceAll('_',' ').toUpperCase())}</span><span class="nf-jm-badges"><span class="nf-jm-badge">${items.length} items</span><span class="nf-jm-badge">${approved} approved</span></span></summary><div class="nf-jm-table"><table><thead><tr><th>ID</th><th>Record</th><th>Type</th><th>Status</th><th>Editorial note</th></tr></thead><tbody>${rows}</tbody></table></div></details>`;
}
async function refresh(){
  const panel=ensurePanel(); if(!panel) return;
  syncContext(); if(activeFiber()!==FIBER_ID||busy) return;
  busy=true;
  try{
    if(!role) await resolveRole();
    const d=await rpc('get_natfiber_supplement_preview',{target_fiber_id:FIBER_ID,target_release_group:GROUP});
    if(!d) throw new Error('Editor session required for NF-0003 media preview.');
    const s=d.summary||{},items=d.items||[];
    const selected=Number(s.selected_items||0),approved=Number(s.approved_items||0),holds=Number(s.hold_items||0);
    const privateCount=items.filter(x=>x.record?.is_public===false).length;
    const allApproved=selected>0&&approved===selected&&holds===0;
    const allPublished=items.length>0&&items.every(x=>x.record?.is_public===true&&x.record?.record_status==='PUBLISHED');
    $('#nfJuteMediaSummary').innerHTML=[summaryCard(selected,'Selected'),summaryCard(approved,'Approved'),summaryCard(privateCount,'Private records'),summaryCard(items.length,'Release items')].join('');
    $('#nfJuteMediaApprove').disabled=!(role==='ADMIN'&&selected>0&&approved<selected&&holds===0);
    $('#nfJuteMediaPublish').disabled=!(role==='ADMIN'&&allApproved&&!allPublished);
    $('#nfJuteMediaStatus').innerHTML=allPublished
      ? '<strong>PUBLISHED.</strong> Media enhancement sudah public. Jalankan QA halaman NF-0003.'
      : allApproved
        ? '<strong>APPROVED · PRIVATE.</strong> Semua item siap dipublikasikan melalui supplement workflow.'
        : `<strong>PRIVATE.</strong> ${selected-approved} item menunggu approval. Tidak ada publish sebelum seluruh selected item APPROVED.`;
    const grouped={};for(const i of items){(grouped[i.section_key]??=[]).push(i);}
    $('#nfJuteMediaBody').innerHTML=`<div class="nf-jm-note"><strong>Editorial target:</strong> M-JUT-09 (processed/dried fibre) ditempatkan segera setelah botanical hero. M-JUT-07 mewakili raw/freshly extracted fibre; M-JUT-05 mewakili extraction. Yarn, handicraft, dan modern engineering prototype tetap tidak dipaksakan.</div>${Object.entries(grouped).map(([k,v])=>renderSection(k,v)).join('')}`;
  }catch(e){$('#nfJuteMediaBody').innerHTML=`<div class="message error">${esc(e.message||e)}</div>`;}
  finally{busy=false;}
}
async function approve(){
  if(role!=='ADMIN') return;
  if(!confirm('Approve seluruh media Jute pada JUTE_MEDIA_ENHANCEMENT_V1?\n\nApproval belum mempublikasikan data.')) return;
  try{await rpc('approve_natfiber_supplement',{target_fiber_id:FIBER_ID,target_release_group:GROUP});await refresh();}catch(e){alert(e.message||e);}
}
async function publish(){
  if(role!=='ADMIN') return;
  if(!confirm('Publish Jute Media Gallery Enhancement V1?\n\nHanya item SELECTED + APPROVED pada release group ini yang akan dipublikasikan.')) return;
  try{await rpc('publish_natfiber_supplement',{target_fiber_id:FIBER_ID,target_release_group:GROUP});await refresh();alert('NF-0003 Jute Media Enhancement published.');}catch(e){alert(e.message||e);}
}
function boot(){
  addStyle();
  setInterval(()=>{
    if(!$('#editorApp')) return;
    ensurePanel();syncContext();
    const now=activeFiber();if(now!==lastFiber){lastFiber=now;if(now===FIBER_ID)refresh();}
  },500);
  document.addEventListener('click',e=>{if(e.target.closest('[data-view="preview"]'))setTimeout(()=>{syncContext();if(activeFiber()===FIBER_ID)refresh();},120);});
  setTimeout(async()=>{await resolveRole();ensurePanel();syncContext();if(activeFiber()===FIBER_ID)refresh();},450);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
