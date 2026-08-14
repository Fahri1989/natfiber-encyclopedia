import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const CFG = window.NATFIBER_CONFIG || {};
if (!CFG.supabaseUrl || !CFG.publishableKey) throw new Error('NatFiber config missing');

const sb = createClient(CFG.supabaseUrl, CFG.publishableKey);
const $ = s => document.querySelector(s);
const esc = (v='') => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const RELEASE_GROUP='IJUK_GLOBAL_V1';
const FIBER_ID='NF-0001';
const PUBLIC_RENDERER_READY=true;
let role=null, preview=null, loading=false;

function lang(){ try{return window.NF_I18N?.getLang?.()||localStorage.getItem('natfiber_lang')||'id';}catch{return'id';} }
function L(id,en){ return lang()==='id'?id:en; }
async function rpc(name,args={}){ const {data,error}=await sb.rpc(name,args); if(error) throw error; return data; }
async function resolveRole(){
  const {data:{session}}=await sb.auth.getSession();
  if(!session){ role=null; return null; }
  try{ const d=await rpc('get_natfiber_editor_dashboard'); role=d?.role||null; }catch{ role=null; }
  return role;
}

function addStyle(){
  if($('#ijukGlobalStyle')) return;
  const s=document.createElement('style'); s.id='ijukGlobalStyle';
  s.textContent=`
    #ijukGlobalStage2{margin-top:30px;padding-top:26px;border-top:3px solid #dbe8e1}
    .nf-global-stage-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;flex-wrap:wrap}
    .nf-global-stage-head h3{margin:4px 0 6px}.nf-global-stage-head p{margin:0;color:#64776f;max-width:760px}
    .nf-global-ready{margin:14px 0;padding:12px 14px;border:1px solid #b9d7c7;background:#f0f8f4;border-radius:12px;color:#1f5d45;font-size:11px;line-height:1.55}
    .nf-global-caveat{margin:10px 0;padding:12px 14px;border-left:4px solid #6a8c7f;background:#f5f9f7;border-radius:8px;font-size:10.5px;line-height:1.55;color:#52685f}
    .nf-global-source-card{border:1px solid #dde7e2;border-radius:14px;padding:13px;background:#fff}
    .nf-global-source-card strong{display:block;margin-bottom:5px}.nf-global-source-card small{display:block;color:#697a73;line-height:1.45}
    .nf-global-status-badge{display:inline-block;margin:2px 5px 2px 0;padding:3px 7px;border-radius:999px;background:#edf5f1;color:#285e49;font-size:9px;font-weight:800}
  `;
  document.head.appendChild(s);
}

function ensureStage(){
  const parent=$('#ijukEnrichmentPanel');
  if(!parent || $('#ijukGlobalStage2')) return Boolean($('#ijukGlobalStage2'));
  addStyle();
  const stage=document.createElement('section'); stage.id='ijukGlobalStage2';
  stage.innerHTML=`
    <div class="nf-global-stage-head">
      <div><span class="eyebrow">NF-0001 · STAGE 2 · GLOBAL PRODUCTION & DISTRIBUTION</span>
        <h3>IJUK_GLOBAL_V1 — Global Production & Distribution</h3>
        <p>${L('Kandidat source-resolved untuk produksi ijuk yang dapat diverifikasi, sebaran botani, basis sumber daya tanaman aren, gap perdagangan, dan referensi resmi.','Source-resolved candidates for verifiable ijuk output, botanical distribution, sugar-palm resource base, trade-data gap, and official references.')}</p>
      </div>
      <div class="release-actions">
        <button id="approveIjukGlobalBtn" class="btn primary compact" disabled>${L('Setujui Tahap 2','Approve Stage 2')}</button>
        <button id="publishIjukGlobalBtn" class="btn danger compact" disabled>${L('Publikasikan Tahap 2','Publish Stage 2')}</button>
        <button id="refreshIjukGlobalBtn" class="btn secondary compact">${L('Muat Ulang','Refresh')}</button>
      </div>
    </div>
    <div id="ijukGlobalSummary" class="summary-grid release-summary"></div>
    <div id="ijukGlobalStatus" class="release-status-note"></div>
    <div class="nf-global-ready"><strong>${L('Renderer publik siap:','Public renderer ready:')}</strong> ${L('Renderer fiber-aware v1.3 sudah tersedia. Publish hanya dapat dilakukan oleh ADMIN setelah semua kandidat disetujui dan tidak ada HOLD.','Fiber-aware renderer v1.3 is available. Publishing is enabled only for ADMIN after all candidates are approved and no HOLD remains.')}</div>
    <div id="ijukGlobalBody"><div class="muted">${L('Memuat IJUK_GLOBAL_V1…','Loading IJUK_GLOBAL_V1…')}</div></div>`;
  parent.appendChild(stage);
  $('#refreshIjukGlobalBtn')?.addEventListener('click',loadPreview);
  $('#approveIjukGlobalBtn')?.addEventListener('click',approve);
  $('#publishIjukGlobalBtn')?.addEventListener('click',publish);
  return true;
}

const sumCard=(v,l)=>`<div class="summary-card"><strong>${esc(v)}</strong><span>${esc(l)}</span></div>`;
const section=(n,title,html,count)=>`<section class="nf-ijuk-section"><h4>${n}. ${esc(title)}${count!==undefined?` <span class="nf-tag">${esc(count)}</span>`:''}</h4>${html}</section>`;

function productionCard(i){
  const r=i.record||{}; const isArea=String(r.statistic_name||'').toLowerCase().includes('area');
  return `<article class="nf-ijuk-card"><div class="rid">${esc(r.production_stat_id||i.record_id)}</div><h5>${esc(r.statistic_name||'')}</h5>
    <span class="nf-global-status-badge">${esc(r.verification_status||'')}</span>${r.is_latest_verified?'<span class="nf-global-status-badge">LATEST VERIFIED</span>':''}
    <div class="nf-kv"><b>Year</b><span>${esc(r.year??'—')}</span><b>Geography</b><span>${esc(r.country_or_region||'—')}</span><b>Value</b><span>${esc(r.value_qualifier||'=')} ${esc(r.value??'—')} ${esc(r.unit||'')}</span><b>Source</b><span>${esc(r.reference_id||'—')}</span></div>
    <p>${esc(r.definition_warning||r.commodity_definition||'')}</p>${isArea?`<div class="nf-global-caveat">${L('Luas tanaman sumber; bukan produksi serat ijuk.','Host-plant area; not ijuk fibre production.')}</div>`:''}</article>`;
}

function distCard(i){
  const r=i.record||{}; return `<article class="nf-ijuk-card"><div class="rid">${esc(r.distribution_id||i.record_id)}</div><h5>${esc(r.place_name||'')}</h5><span class="nf-tag">${esc(r.distribution_type||'')}</span><p>${esc(r.description||'')}</p><div class="nf-kv"><b>Region</b><span>${esc(r.region_name||'—')}</span><b>Source</b><span>${esc(r.source_organization||r.reference_id||'—')}</span></div></article>`;
}

function conflictCard(i){
  const r=i.record||{}; return `<article class="nf-ijuk-card"><div class="rid">${esc(r.conflict_id||i.record_id)}</div><h5>${esc(r.issue_type||'Data integrity issue')}</h5><span class="nf-tag">${esc(r.status||'')}</span><span class="nf-tag">Risk: ${esc(r.risk||'')}</span><p>${esc(r.issue_summary||'')}</p><div class="nf-global-caveat"><strong>${L('Keputusan editorial:','Editorial decision:')}</strong> ${esc(r.current_decision||'')}</div></article>`;
}

function refCard(i){
  const r=i.record||{}; const u=r.url&&/^https?:/i.test(r.url)?r.url:'';
  return `<div class="nf-global-source-card"><strong>${esc(r.reference_id||i.record_id)} · ${esc(r.title||'')}</strong><small>${esc(r.publisher||r.authors||'')} · ${esc(r.year||'')}</small><small>${esc(r.verification_status||'')}</small>${u?`<a href="${esc(u)}" target="_blank" rel="noopener">${L('Buka sumber','Open source')} ↗</a>`:''}</div>`;
}

function render(p){
  preview=p; ensureStage();
  const s=p?.summary||{}, items=p?.items||[], by=t=>items.filter(i=>i.data_table===t);
  const prod=by('fiber_production_stats'), dist=by('fiber_distribution'), trade=by('fiber_trade_stats'), conf=by('conflicts'), refs=by('references');
  const direct=prod.filter(i=>!String(i.record?.statistic_name||'').toLowerCase().includes('area'));
  const resource=prod.filter(i=>String(i.record?.statistic_name||'').toLowerCase().includes('area'));
  const pub=items.length>0&&items.every(i=>Boolean(i?.record?.is_public));
  const allApproved=(s.selected_items??0)>0&&s.approved_items===s.selected_items&&(s.hold_items??0)===0;

  $('#ijukGlobalSummary').innerHTML=[
    sumCard(s.selected_items??0,L('Selected','Selected')),
    sumCard(s.approved_items??0,L('Approved','Approved')),
    sumCard(s.hold_items??0,L('Hold','Hold')),
    sumCard(direct.length,L('Fibre-output records','Fibre-output records')),
    sumCard(dist.length,L('Distribution','Distribution')),
    sumCard(trade.length,L('Numeric trade','Numeric trade'))
  ].join('');

  $('#ijukGlobalStatus').innerHTML=pub
    ? `<strong>IJUK_GLOBAL_V1 published ✓</strong> · ${L('Data Tahap 2 sudah terbuka di situs publik.','Stage 2 data are available on the public site.')}`
    : `<strong>IJUK_GLOBAL_V1</strong> · ${L('PRIVATE candidate set. Belum ada data Tahap 2 yang dibuka ke publik.','PRIVATE candidate set. No Stage 2 data are public yet.')}`;

  $('#approveIjukGlobalBtn').disabled=role!=='ADMIN'||pub||allApproved;
  $('#publishIjukGlobalBtn').disabled=role!=='ADMIN'||pub||!allApproved||!PUBLIC_RENDERER_READY;
  $('#publishIjukGlobalBtn').title = $('#publishIjukGlobalBtn').disabled
    ? L('Publish memerlukan ADMIN, seluruh item APPROVED, 0 HOLD, dan renderer publik siap.','Publish requires ADMIN, all items APPROVED, 0 HOLD, and a ready public renderer.')
    : L('Semua gate terpenuhi. Klik untuk publikasi final.','All gates are satisfied. Click for final publication.');

  const tradeHtml=trade.length
    ? `<div class="nf-ijuk-grid">${trade.map(productionCard).join('')}</div>`
    : `<div class="nf-global-caveat"><strong>${L('Tidak ada angka perdagangan yang diadmit.','No numeric trade values admitted.')}</strong> ${L('HS 530500 menggabungkan coconut, abaca, ramie, dan other vegetable textile fibres; angka tersebut tidak boleh diklaim sebagai Ijuk/Arenga pinnata.','HS 530500 aggregates coconut, abaca, ramie, and other vegetable textile fibres; those totals cannot be claimed as Ijuk/Arenga pinnata trade.')}</div>`;

  $('#ijukGlobalBody').innerHTML=
    section(1,L('Produksi Ijuk yang Terverifikasi','Verified Ijuk Output'),`<div class="nf-ijuk-grid">${direct.map(productionCard).join('')}</div>`,direct.length)+
    section(2,L('Basis Sumber Daya Tanaman Aren','Sugar-Palm Host Resource Base'),`<div class="nf-ijuk-grid">${resource.map(productionCard).join('')}</div>`,resource.length)+
    section(3,L('Sebaran Botani & Ketersediaan','Botanical Distribution & Availability'),`<div class="nf-ijuk-grid">${dist.map(distCard).join('')}</div>`,dist.length)+
    section(4,L('Perdagangan Internasional','International Trade'),tradeHtml,trade.length)+
    section(5,L('Integrity Gates / Conflicts','Integrity Gates / Conflicts'),`<div class="nf-ijuk-grid">${conf.map(conflictCard).join('')}</div>`,conf.length)+
    section(6,L('Referensi Resmi','Official References'),`<div class="nf-ijuk-grid">${refs.map(refCard).join('')}</div>`,refs.length);
}

async function loadPreview(){
  if(loading) return; loading=true;
  try{
    ensureStage(); if(!role) await resolveRole();
    const p=await rpc('get_natfiber_supplement_preview',{target_fiber_id:FIBER_ID,target_release_group:RELEASE_GROUP});
    if(!p) throw new Error('Editor session required.');
    render(p);
  }catch(e){
    ensureStage();
    if($('#ijukGlobalBody')) $('#ijukGlobalBody').innerHTML=`<div class="message error">${esc(e.message||e)}</div>`;
  }finally{ loading=false; }
}

async function approve(){
  if(role!=='ADMIN') return;
  if(!confirm(L('Setujui seluruh kandidat IJUK_GLOBAL_V1? Ini BELUM mempublikasikan data.','Approve all IJUK_GLOBAL_V1 candidates? This does NOT publish data.'))) return;
  try{
    await rpc('approve_natfiber_supplement',{target_fiber_id:FIBER_ID,target_release_group:RELEASE_GROUP});
    await loadPreview();
  }catch(e){ alert(e.message||e); }
}

async function publish(){
  if(role!=='ADMIN') return;
  const p=preview;
  const s=p?.summary||{};
  const allApproved=(s.selected_items??0)>0&&s.approved_items===s.selected_items&&(s.hold_items??0)===0;
  if(!PUBLIC_RENDERER_READY || !allApproved){
    alert(L('Publish belum memenuhi seluruh gate.','Publish gates are not fully satisfied.'));
    return;
  }
  const ok=confirm(L(
    'PUBLIKASIKAN IJUK_GLOBAL_V1 sekarang?\n\nIni akan membuka 24 kandidat Tahap 2 ke situs publik. Produksi Ijuk, luas sumber daya Aren, sebaran botani, gap perdagangan, conflict notes, dan referensi terkait akan menjadi PUBLIC.\n\nLanjutkan?',
    'PUBLISH IJUK_GLOBAL_V1 now?\n\nThis will expose the 24 Stage 2 candidates on the public site. Ijuk output, sugar-palm resource area, botanical distribution, trade-data gap, conflict notes, and related references will become PUBLIC.\n\nContinue?'
  ));
  if(!ok) return;

  try{
    const result=await rpc('publish_natfiber_supplement',{target_fiber_id:FIBER_ID,target_release_group:RELEASE_GROUP});
    await loadPreview();
    alert(L(
      `Tahap 2 berhasil dipublikasikan. ${result?.published_items??24} item sekarang PUBLIC.`,
      `Stage 2 published successfully. ${result?.published_items??24} items are now PUBLIC.`
    ));
  }catch(e){
    alert(e.message||e);
  }
}

function boot(){
  const timer=setInterval(async()=>{
    const app=$('#editorApp'); const panel=$('#ijukEnrichmentPanel');
    if(app&&!app.hidden&&panel){
      ensureStage(); await resolveRole(); await loadPreview(); clearInterval(timer);
    }
  },700);
  setTimeout(()=>clearInterval(timer),30000);
  document.addEventListener('change',e=>{
    if(e.target?.id==='adminFiberSelector'&&e.target.value==='NF-0001') setTimeout(loadPreview,150);
  });
  document.addEventListener('click',e=>{
    if(e.target.closest('.language-switch [data-lang]')&&preview) setTimeout(()=>render(preview),120);
  });
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
