import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const CFG = window.NATFIBER_CONFIG || {};
if (!CFG.supabaseUrl || !CFG.publishableKey) throw new Error('NatFiber config missing');

const sb = createClient(CFG.supabaseUrl, CFG.publishableKey);
const GROUP = 'IJUK_APPLICATIONS_T4_V1';
const FIBER_ID = 'NF-0001';
const $ = s => document.querySelector(s);
const esc = (v='') => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

let role = null;
let lastFiber = null;
let refreshing = false;

function activeFiber(){
  try { return localStorage.getItem('natfiber_admin_fiber') || FIBER_ID; }
  catch { return FIBER_ID; }
}

async function rpc(name,args={}){
  const {data,error}=await sb.rpc(name,args);
  if(error) throw error;
  return data;
}

async function resolveRole(){
  try{
    const {data:{session}}=await sb.auth.getSession();
    if(!session){ role=null; return null; }
    const d=await rpc('get_natfiber_editor_dashboard');
    role=d?.role || null;
  }catch{ role=null; }
  return role;
}

function addStyle(){
  if($('#nfIjukAppsT4Style')) return;
  const s=document.createElement('style');
  s.id='nfIjukAppsT4Style';
  s.textContent=`
    #nfIjukAppsT4Panel{border:2px solid #2f7d5a;box-shadow:0 8px 24px rgba(23,63,51,.08);margin-bottom:20px}
    #nfIjukAppsT4Panel[hidden]{display:none!important}
    .nf-t4-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;flex-wrap:wrap}
    .nf-t4-head h3{margin:3px 0 5px}.nf-t4-head p{margin:0;color:#61736b;font-size:11px;line-height:1.55}
    .nf-t4-actions{display:flex;gap:8px;flex-wrap:wrap}.nf-t4-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px}
    .nf-t4-card{border:1px solid #dbe7e1;border-radius:14px;padding:13px;background:#fff}.nf-t4-card h4{margin:4px 0 7px;font-size:13px}.nf-t4-card p{margin:0;font-size:10.5px;line-height:1.55;color:#607169}
    .nf-t4-id{font-size:9px;font-weight:800;letter-spacing:.06em;color:#718179}.nf-t4-meta{display:flex;gap:5px;flex-wrap:wrap;margin:8px 0}
    .nf-t4-tag{font-size:8.5px;font-weight:800;border-radius:999px;background:#edf5f1;color:#245f48;padding:3px 7px}.nf-t4-tag.hold{background:#fff1dd;color:#8a5a14}
    .nf-t4-note{margin:14px 0 0;padding:12px 14px;border-radius:12px;background:#f3f8f5;border:1px solid #dce8e2;font-size:10.5px;line-height:1.6;color:#53685e}
    .nf-t4-note.warn{background:#fff8ea;border-color:#f1dbac;color:#73541c}.nf-t4-ref-list{margin-top:14px;border-top:1px solid #e1e9e5;padding-top:12px}
    .nf-t4-ref{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid #edf1ef;font-size:10px}.nf-t4-ref:last-child{border-bottom:0}
    .nf-t4-ref b{display:block;color:#213f33}.nf-t4-ref span{color:#6c7c75}.nf-t4-state{font-weight:800;white-space:nowrap}.nf-t4-state.hold{color:#9b650c}.nf-t4-state.approved{color:#246947}
    @media(max-width:800px){.nf-t4-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(s);
}

function ensurePanel(){
  const host=$('#view-preview');
  if(!host) return null;
  let panel=$('#nfIjukAppsT4Panel');
  if(panel) return panel;
  panel=document.createElement('article');
  panel.id='nfIjukAppsT4Panel';
  panel.className='panel';
  panel.innerHTML=`
    <div class="nf-t4-head">
      <div>
        <span class="eyebrow">APPLICATIONS · STAGE 4A</span>
        <h3>NF-0001 Ijuk — Applications Release</h3>
        <p>Source-resolved engineering applications · PRIVATE until ADMIN approval and publish.</p>
      </div>
      <div class="nf-t4-actions">
        <button id="nfT4Approve" class="btn primary compact" disabled>Approve selected</button>
        <button id="nfT4Publish" class="btn danger compact" disabled>Publish applications</button>
        <button id="nfT4Refresh" class="btn secondary compact">Refresh</button>
      </div>
    </div>
    <div id="nfT4Summary" class="summary-grid release-summary"></div>
    <div id="nfT4Status" class="release-status-note"></div>
    <div id="nfT4Body"><div class="muted">Loading ${GROUP}…</div></div>`;
  host.prepend(panel);
  $('#nfT4Approve')?.addEventListener('click',approve);
  $('#nfT4Publish')?.addEventListener('click',publish);
  $('#nfT4Refresh')?.addEventListener('click',refresh);
  return panel;
}

function summaryCard(v,label){
  return `<div class="summary-card"><b>${esc(v)}</b><span>${esc(label)}</span></div>`;
}

function appCard(item){
  const r=item.record||{};
  const hold=String(item.editor_status||'')==='HOLD';
  return `<article class="nf-t4-card">
    <div class="nf-t4-id">${esc(item.record_id)} · ${esc(item.editor_status||'SELECTED')}</div>
    <h4>${esc(r.application_name||item.public_label||item.record_id)}</h4>
    <div class="nf-t4-meta">
      <span class="nf-t4-tag">${esc(r.application_class||'')}</span>
      <span class="nf-t4-tag">${esc(r.value_chain_stage||'')}</span>
      <span class="nf-t4-tag">Evidence ${esc(r.evidence_level||'—')}</span>
      <span class="nf-t4-tag ${hold?'hold':''}">${esc(r.maturity_level||'')}</span>
    </div>
    <p>${esc(r.evidence_summary||item.release_note||'')}</p>
    ${item.release_note?`<div class="nf-t4-note ${hold?'warn':''}">${esc(item.release_note)}</div>`:''}
  </article>`;
}

function refRow(item){
  const r=item.record||{};
  const st=String(item.editor_status||'SELECTED').toLowerCase();
  return `<div class="nf-t4-ref">
    <div><b>${esc(item.record_id)} · ${esc(r.title||item.public_label||'Reference')}</b><span>${esc(r.year||'')} · ${esc(r.doi||'')}</span></div>
    <div class="nf-t4-state ${st}">${esc(item.editor_status||'SELECTED')}</div>
  </div>`;
}

async function refresh(){
  const panel=ensurePanel();
  if(!panel) return;
  const active=activeFiber();
  panel.hidden=active!==FIBER_ID;
  if(active!==FIBER_ID) return;
  if(refreshing) return;
  refreshing=true;
  const body=$('#nfT4Body');
  try{
    await resolveRole();
    const d=await rpc('get_natfiber_supplement_preview',{target_fiber_id:FIBER_ID,target_release_group:GROUP});
    if(!d) throw new Error('Stage 4A preview unavailable for this account.');
    const s=d.summary||{}, items=d.items||[];
    const apps=items.filter(i=>i.data_table==='applications');
    const refs=items.filter(i=>i.data_table==='references');
    const selected=Number(s.selected_items||0), approved=Number(s.approved_items||0), holds=Number(s.hold_items||0);
    const allApproved=selected>0 && approved===selected;

    $('#nfT4Summary').innerHTML=[
      summaryCard(apps.length,'Application candidates'),
      summaryCard(selected,'Selected items'),
      summaryCard(approved,'Approved'),
      summaryCard(holds,'Hold')
    ].join('');

    const approveBtn=$('#nfT4Approve'), publishBtn=$('#nfT4Publish');
    approveBtn.disabled=!(role==='ADMIN' && selected>0 && approved<selected);
    publishBtn.disabled=!(role==='ADMIN' && allApproved);

    if(holds>0){
      $('#nfT4Status').innerHTML=`<strong>PRIVATE · ${holds} HOLD.</strong> Approve akan menyetujui item berstatus SELECTED, tetapi publish tetap terkunci sampai HOLD diselesaikan. APP-000008/REF-000066/REF-000072 menunggu pemeriksaan scope corrigendum.`;
    }else if(allApproved){
      $('#nfT4Status').innerHTML='<strong>APPROVED, still PRIVATE.</strong> Semua item terpilih telah disetujui. ADMIN dapat melakukan publish melalui workflow.';
    }else{
      $('#nfT4Status').innerHTML='<strong>REVIEWED / PRIVATE.</strong> Legacy APP-000005 dan APP-000006 belum diubah; replacement harus melewati human approval terlebih dahulu.';
    }

    body.innerHTML=`
      <div class="nf-t4-grid">${apps.map(appCard).join('')}</div>
      <div class="nf-t4-ref-list"><div class="eyebrow">STAGE 4 PRIMARY REFERENCES</div>${refs.map(refRow).join('') || '<div class="muted">No reference items.</div>'}</div>
      <div class="nf-t4-note"><strong>Publication guard:</strong> panel ini tidak melakukan raw SQL publication. Tombol hanya memanggil ADMIN-authenticated approval/publish RPC. Legacy public records remain untouched until the replacement set is explicitly approved.</div>`;
  }catch(err){
    body.innerHTML=`<div class="message error">${esc(err.message)}</div>`;
  }finally{ refreshing=false; }
}

async function approve(){
  if(role!=='ADMIN') return;
  const ok=confirm('Approve semua Stage 4A item yang masih berstatus SELECTED?\n\nItem HOLD tidak akan diubah. Approval belum mempublikasikan data.');
  if(!ok) return;
  try{
    await rpc('approve_natfiber_supplement',{target_fiber_id:FIBER_ID,target_release_group:GROUP});
    await refresh();
  }catch(err){ alert(err.message); }
}

async function publish(){
  if(role!=='ADMIN') return;
  const ok=confirm('Publish NF-0001 Stage 4A Applications?\n\nHanya item pada release group yang sudah APPROVED yang akan dibuka. Lanjutkan hanya setelah semua HOLD selesai.');
  if(!ok) return;
  try{
    await rpc('publish_natfiber_supplement',{target_fiber_id:FIBER_ID,target_release_group:GROUP});
    await refresh();
  }catch(err){ alert(err.message); }
}

function boot(){
  addStyle();
  ensurePanel();
  refresh();
  setInterval(()=>{
    ensurePanel();
    const now=activeFiber();
    const panel=$('#nfIjukAppsT4Panel');
    if(panel) panel.hidden=now!==FIBER_ID;
    if(now!==lastFiber){ lastFiber=now; refresh(); }
  },900);
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
