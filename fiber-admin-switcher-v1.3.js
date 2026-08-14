import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const CFG = window.NATFIBER_CONFIG || {};
if (!CFG.supabaseUrl || !CFG.publishableKey) throw new Error('NatFiber config missing');

const sb = createClient(CFG.supabaseUrl, CFG.publishableKey);
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = (v='') => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl = u => { try { const x = new URL(u, location.href); return ['http:','https:'].includes(x.protocol) ? x.href : ''; } catch { return ''; } };

const FLOWS = {
  'NF-0001': { name:'Ijuk', scientific:'Arenga pinnata', type:'enrichment', releaseGroup:'IJUK_ENRICHMENT_V1' },
  'NF-0002': { name:'Sisal', scientific:'Agave sisalana', type:'legacy' }
};

let role = null;
let ijukPreview = null;
let lastVisible = false;

function lang(){ try { return window.NF_I18N?.getLang?.() || localStorage.getItem('natfiber_lang') || 'id'; } catch { return 'id'; } }
function L(id,en){ return lang()==='id' ? id : en; }
function activeFiber(){ return localStorage.getItem('natfiber_admin_fiber') || 'NF-0001'; }
function flow(){ return FLOWS[activeFiber()] || FLOWS['NF-0001']; }

async function rpc(name,args={}){
  const {data,error}=await sb.rpc(name,args);
  if(error) throw error;
  return data;
}

async function resolveRole(){
  const {data:{session}}=await sb.auth.getSession();
  if(!session){ role=null; return null; }
  try{
    const d=await rpc('get_natfiber_editor_dashboard');
    role=d?.role || null;
  }catch{ role=null; }
  return role;
}

function addStyles(){
  if($('#nfFiberAdminStyleV13')) return;
  const s=document.createElement('style');
  s.id='nfFiberAdminStyleV13';
  s.textContent=`
    .nf-fiber-selector-wrap{display:flex;align-items:center;gap:8px;padding:6px 8px 6px 12px;border:1px solid #d8e5df;border-radius:999px;background:#fff;box-shadow:0 1px 0 rgba(23,63,51,.03)}
    .nf-fiber-selector-wrap label{font-size:9px;font-weight:800;letter-spacing:.08em;color:#698078;white-space:nowrap}
    #adminFiberSelector{border:0;background:#eef6f2;color:#173f33;font-weight:800;border-radius:999px;padding:8px 30px 8px 12px;outline:none;cursor:pointer}
    .nf-fiber-context{margin:0 0 18px;padding:15px 18px;border:1px solid #d8e5df;border-radius:16px;background:linear-gradient(135deg,#f6faf8,#eef6f2);display:flex;align-items:center;justify-content:space-between;gap:14px}
    .nf-fiber-context strong{display:block;font-size:17px;color:#173f33}.nf-fiber-context span{font-size:11px;color:#64776f}
    .nf-fiber-badge{display:inline-flex;align-items:center;padding:6px 10px;border-radius:999px;background:#dff2e8;color:#1f654c;font-size:10px;font-weight:800}
    .nf-ijuk-panel{margin-bottom:22px}.nf-hidden-by-fiber{display:none!important}
    .nf-ijuk-note{margin:14px 0;padding:14px 16px;border:1px solid #d7e5de;background:#f2f7f4;border-radius:14px;font-size:11px;line-height:1.65;color:#556b61}.nf-ijuk-note strong{color:#173f33}
    .nf-ijuk-actions{display:flex;gap:8px;flex-wrap:wrap}.nf-ijuk-section{border-top:1px solid #e4ece8;padding-top:20px;margin-top:22px}.nf-ijuk-section h4{font-size:17px;margin:0 0 13px}
    .nf-ijuk-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.nf-ijuk-card{border:1px solid #dce7e2;border-radius:16px;padding:15px;background:#fff}.nf-ijuk-card .rid{font-size:9px;color:#687b72;font-weight:800;letter-spacing:.05em}.nf-ijuk-card h5{margin:5px 0 8px;font-size:13px}.nf-ijuk-card p{font-size:10.5px;color:#5f7069;line-height:1.55}
    .nf-kv{display:grid;grid-template-columns:105px 1fr;gap:5px 9px;font-size:10.5px}.nf-kv b{color:#65776f}.nf-tag{display:inline-block;border-radius:999px;background:#e4f3eb;color:#205c47;font-size:9px;font-weight:800;padding:3px 7px;margin:2px 4px 2px 0}
    .nf-cov-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.nf-cov{border:1px solid #dce7e2;border-radius:14px;padding:13px;background:#fff}.nf-cov strong,.nf-cov span,.nf-cov small{display:block}.nf-cov span{font-size:9px;color:#1f654c;font-weight:800;margin:4px 0}.nf-cov small{font-size:9.5px;color:#687b72;line-height:1.4}
    .nf-table{max-height:430px;overflow:auto;border:1px solid #e1e9e5;border-radius:14px}.nf-table table{width:100%;border-collapse:collapse;min-width:850px}.nf-table th,.nf-table td{padding:9px 10px;border-bottom:1px solid #e6ece9;text-align:left;font-size:9.5px;vertical-align:top}.nf-table th{position:sticky;top:0;background:#f1f6f3;z-index:1}
    .nf-review-hero{display:grid;grid-template-columns:1.4fr .8fr;gap:18px;align-items:center}.nf-review-list{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:15px}.nf-review-stat{border:1px solid #dce7e2;border-radius:15px;padding:14px;background:#fff}.nf-review-stat strong{display:block;font-size:24px;color:#173f33}.nf-review-stat span{font-size:9.5px;color:#65776f;font-weight:700;text-transform:uppercase}
    @media(max-width:1000px){.nf-fiber-selector-wrap label{display:none}.nf-cov-grid,.nf-review-list{grid-template-columns:repeat(2,minmax(0,1fr))}.nf-review-hero{grid-template-columns:1fr}}
    @media(max-width:760px){.nf-ijuk-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(s);
}

function ensureSelector(){
  const top=$('.editor-top .top-actions');
  if(!top) return false;
  let sel=$('#adminFiberSelector');
  if(!sel){
    const wrap=document.createElement('div');
    wrap.className='nf-fiber-selector-wrap';
    wrap.innerHTML=`<label>${L('SERAT AKTIF','ACTIVE FIBER')}</label><select id="adminFiberSelector" aria-label="Active fiber"><option value="NF-0001">NF-0001 · Ijuk</option><option value="NF-0002">NF-0002 · Sisal</option></select>`;
    top.insertBefore(wrap,top.firstChild);
    sel=$('#adminFiberSelector');
    sel.addEventListener('change',()=>{
      localStorage.setItem('natfiber_admin_fiber',sel.value);
      ijukPreview=null;
      applySelection(true);
    });
  }
  sel.value=activeFiber();
  return true;
}

function updateVersion(){
  const v=$('.side-brand span');
  if(v && v.textContent!=='Editor v1.3') v.textContent='Editor v1.3';
}

function ensureContextBanner(hostSelector){
  const host=$(hostSelector); if(!host) return null;
  let banner=host.querySelector(':scope > .nf-fiber-context');
  if(!banner){ banner=document.createElement('div'); banner.className='nf-fiber-context'; host.prepend(banner); }
  const id=activeFiber(), f=flow();
  if(banner.dataset.fiber!==id || banner.dataset.lang!==lang()){
    banner.dataset.fiber=id; banner.dataset.lang=lang();
    banner.innerHTML=`<div><strong>${esc(id)} · ${esc(f.name)}</strong><span><em>${esc(f.scientific)}</em> · ${L('konteks editorial aktif','active editorial context')}</span></div><span class="nf-fiber-badge">${f.type==='legacy'?'PUBLISHED / LEGACY FLOW':'ENRICHMENT V1'}</span>`;
  }
  return banner;
}

function ensureIjukReview(){
  const host=$('#view-review'); if(!host) return null;
  let panel=$('#ijukReviewPanel'); if(panel) return panel;
  panel=document.createElement('article'); panel.id='ijukReviewPanel'; panel.className='panel nf-ijuk-panel';
  panel.innerHTML=`<div class="nf-review-hero"><div><span class="eyebrow">HUMAN VERIFICATION · NF-0001</span><h3>NF-0001 Ijuk — Review Queue</h3><p>${L('Ijuk menggunakan alur Enrichment V1. Kandidat telah melalui Verification & Canonicalization Tahap 1A sebelum owner approval.','Ijuk uses the Enrichment V1 workflow. Candidates passed Stage 1A Verification & Canonicalization before owner approval.')}</p></div><div class="nf-ijuk-actions"><button id="openIjukPreviewBtn" class="btn primary compact">${L('Buka Release Preview Ijuk','Open Ijuk Release Preview')}</button><button id="refreshIjukReviewBtn" class="btn secondary compact">${L('Muat Ulang','Refresh')}</button></div></div><div id="ijukReviewStats" class="nf-review-list"></div><div class="nf-ijuk-note"><strong>${L('Koreksi penting:','Important corrections:')}</strong> ${L('FTIR dan XRD dipertahankan hanya berdasarkan sumber primer terverifikasi. Asumsi matriks/kadar serat, detector SEM yang tidak dilaporkan, dan unit diameter yang salah tidak dimigrasikan.','FTIR and XRD are retained only where primary-source verified. Guessed matrix/fibre-content data, an unreported SEM detector and the erroneous diameter unit were not migrated.')}</div>`;
  host.prepend(panel);
  $('#openIjukPreviewBtn')?.addEventListener('click',()=>{ $('[data-view="preview"]')?.click(); setTimeout(()=>applySelection(true),100); });
  $('#refreshIjukReviewBtn')?.addEventListener('click',loadIjukPreview);
  return panel;
}

function ensureIjukPreview(){
  const host=$('#view-preview'); if(!host) return null;
  let panel=$('#ijukEnrichmentPanel'); if(panel) return panel;
  panel=document.createElement('article'); panel.id='ijukEnrichmentPanel'; panel.className='panel nf-ijuk-panel';
  panel.innerHTML=`<div class="panel-head"><div><span class="eyebrow">NF-0001 VERIFIED ENRICHMENT</span><h3>NF-0001 Ijuk — Enrichment & Characterization V1</h3><p>${L('Tahap 1A · primary-source verification · owner-controlled publication','Stage 1A · primary-source verification · owner-controlled publication')}</p></div><div class="release-actions"><button id="approveIjukBtn" class="btn primary compact" disabled>${L('Setujui Enrichment','Approve Enrichment')}</button><button id="publishIjukBtn" class="btn danger compact" disabled>${L('Publikasikan Enrichment','Publish Enrichment')}</button><button id="refreshIjukBtn" class="btn secondary compact">${L('Muat Ulang','Refresh')}</button></div></div><div id="ijukSummary" class="summary-grid release-summary"></div><div id="ijukStatus" class="release-status-note"></div><div class="nf-ijuk-note"><strong>Verification & Canonicalization 1A:</strong> ${L('73 kandidat private. FTIR/XRD dipulihkan dari sumber primer. Tidak ada composite baru berbasis asumsi.','73 private candidates. FTIR/XRD restored from primary sources. No assumption-based composite rows were added.')}</div><div id="ijukBody"><div class="muted">${L('Memuat IJUK_ENRICHMENT_V1…','Loading IJUK_ENRICHMENT_V1…')}</div></div>`;
  host.prepend(panel);
  $('#approveIjukBtn')?.addEventListener('click',approveIjuk);
  $('#publishIjukBtn')?.addEventListener('click',publishIjuk);
  $('#refreshIjukBtn')?.addEventListener('click',loadIjukPreview);
  return panel;
}

const sumCard=(v,l)=>`<div class="summary-card"><strong>${esc(v)}</strong><span>${esc(l)}</span></div>`;
const section=(n,title,html,count)=>`<section class="nf-ijuk-section"><h4>${n}. ${esc(title)}${count!==undefined?` <span class="nf-tag">${esc(count)}</span>`:''}</h4>${html}</section>`;

function simpleCard(i,titleKey=''){
  const r=i.record||{};
  const id=r.treatment_id||r.processing_id||r.application_id||r.research_gap_id||r.characterization_id||i.record_id;
  const title=r.agent_method||r.process_name||r.application_name||r.gap||r.sample_condition||titleKey||'Record';
  const note=r.evidence_note||r.notes||r.evidence_summary||r.why_it_matters||r.interpretation||'';
  return `<article class="nf-ijuk-card"><div class="rid">${esc(id)}</div><h5>${esc(title)}</h5><p>${esc(note)}</p><div class="nf-kv"><b>Reference</b><span>${esc(r.reference_id||'—')}</span><b>Status</b><span>${esc(r.record_status||r.status||'—')}</span></div></article>`;
}

function mediaCard(i){
  const r=i.record||{}, u=safeUrl(r.source_page_url), title=lang()==='id'?(r.title_id||r.title_en):(r.title_en||r.title_id);
  return `<article class="nf-ijuk-card"><div class="rid">${esc(r.char_media_id||i.record_id)} · ${esc(r.technique||'')}</div><h5>${esc(title||'Characterization media')}</h5><span class="nf-tag">${esc(r.reuse_status||'')}</span><span class="nf-tag">${esc(r.figure_license||'')}</span><p>${esc(lang()==='id'?(r.caption_id||r.source_note||''):(r.caption_en||r.source_note||''))}</p>${u?`<a href="${esc(u)}" target="_blank" rel="noopener">${L('Buka sumber','Open source')} ↗</a>`:''}</article>`;
}

function coverageCards(items){
  return `<div class="nf-cov-grid">${items.map(i=>{const r=i.record||{};return `<div class="nf-cov"><strong>${esc(r.technique||'')}</strong><span>${esc(r.evidence_level||'')}</span><small>${esc(r.main_limitation||'')}</small></div>`;}).join('')}</div>`;
}

function observationTable(items){
  return `<div class="nf-table"><table><thead><tr><th>ID</th><th>Parameter</th><th>Value</th><th>Unit</th><th>Status</th><th>Record</th></tr></thead><tbody>${items.map(i=>{const r=i.record||{};let v=r.value_numeric??r.value_text??'—';if(r.value_min!=null||r.value_max!=null)v=`${r.value_min??'—'}–${r.value_max??'—'}`;return `<tr><td>${esc(r.observation_id||i.record_id)}</td><td>${esc(r.parameter||'')}</td><td>${esc(v)}</td><td>${esc(r.unit||'')}</td><td>${esc(r.assignment_status||'')}</td><td>${esc(r.characterization_id||'')}</td></tr>`;}).join('')}</tbody></table></div>`;
}

function renderIjukPreview(p){
  ijukPreview=p; ensureIjukPreview(); ensureIjukReview();
  const s=p?.summary||{}, items=p?.items||[], by=t=>items.filter(i=>i.data_table===t);
  const tr=by('treatments'), pr=by('processing'), ap=by('applications'), gp=by('research_gaps'), cv=by('fiber_characterization_coverage'), md=by('fiber_characterization_media'), rc=by('fiber_characterization_records'), ob=by('fiber_characterization_observations');
  const pub=items.length>0 && items.every(i=>Boolean(i?.record?.is_public));
  const allApproved=(s.selected_items??0)>0 && s.approved_items===s.selected_items && (s.hold_items??0)===0;

  $('#ijukSummary').innerHTML=[sumCard(s.selected_items??0,L('Item dipilih','Selected items')),sumCard(s.approved_items??0,L('Disetujui','Approved')),sumCard(s.hold_items??0,L('Ditahan','On hold')),sumCard(cv.length,L('Teknik','Techniques')),sumCard(md.length,L('Media/figure','Media/figures'))].join('');
  $('#ijukStatus').innerHTML=pub?`<strong>Ijuk enrichment published ✓</strong> — ${L('data sudah terbuka melalui RLS publik.','data are exposed through public RLS.')}`:`<strong>IJUK_ENRICHMENT_V1</strong> · ${L('masih PRIVATE sampai owner approval dan publication.','remains PRIVATE until owner approval and publication.')}`;
  $('#approveIjukBtn').disabled=role!=='ADMIN'||pub||allApproved;
  $('#publishIjukBtn').disabled=role!=='ADMIN'||pub||!allApproved;
  $('#ijukBody').innerHTML=section(1,L('Treatment Terverifikasi','Verified Treatments'),`<div class="nf-ijuk-grid">${tr.map(simpleCard).join('')}</div>`,tr.length)+section(2,'Processing',`<div class="nf-ijuk-grid">${pr.map(simpleCard).join('')}</div>`,pr.length)+section(3,L('Aplikasi Konservatif','Conservative Applications'),`<div class="nf-ijuk-grid">${ap.map(simpleCard).join('')}</div>`,ap.length)+section(4,L('Research Gaps Terkoreksi','Corrected Research Gaps'),`<div class="nf-ijuk-grid">${gp.map(simpleCard).join('')}</div>`,gp.length)+section(5,L('Kelengkapan Karakterisasi','Characterization Completeness'),coverageCards(cv),cv.length)+section(6,'Figure / Media Reuse Register',`<div class="nf-ijuk-grid">${md.map(mediaCard).join('')}</div>`,md.length)+section(7,'Scientific Characterization Records',`<div class="nf-ijuk-grid">${rc.map(simpleCard).join('')}</div>`,rc.length)+section(8,L('Observasi Source-resolved','Source-resolved Observations'),observationTable(ob),ob.length);
  const rs=$('#ijukReviewStats');
  if(rs) rs.innerHTML=[[s.selected_items??0,'Selected candidates'],[s.approved_items??0,'Owner approved'],[s.hold_items??0,'On hold'],[cv.filter(i=>i.record?.evidence_level!=='NOT_FOUND').length,'Techniques with evidence']].map(([v,l])=>`<div class="nf-review-stat"><strong>${esc(v)}</strong><span>${esc(l)}</span></div>`).join('');
}

async function loadIjukPreview(){
  try{
    if(!role) await resolveRole();
    const p=await rpc('get_natfiber_enrichment_preview',{target_fiber_id:'NF-0001',target_release_group:'IJUK_ENRICHMENT_V1'});
    if(!p) throw new Error('Editor session required.');
    renderIjukPreview(p);
  }catch(e){ ensureIjukPreview(); if($('#ijukBody')) $('#ijukBody').innerHTML=`<div class="message error">${esc(e.message||e)}</div>`; }
}

async function approveIjuk(){
  if(role!=='ADMIN') return;
  if(!confirm(L('Setujui seluruh kandidat NF-0001 Ijuk Enrichment V1? Ini BELUM mempublikasikan data.','Approve all NF-0001 Ijuk Enrichment V1 candidates? This does NOT publish data yet.'))) return;
  try{ await rpc('approve_natfiber_enrichment',{target_fiber_id:'NF-0001',target_release_group:'IJUK_ENRICHMENT_V1'}); await loadIjukPreview(); }catch(e){ alert(e.message||e); }
}

async function publishIjuk(){
  if(role!=='ADMIN') return;
  if(!confirm(L('Publikasikan NF-0001 Ijuk Enrichment V1 sekarang? Item terpilih akan menjadi publik.','Publish NF-0001 Ijuk Enrichment V1 now? Selected items will become public.'))) return;
  try{ await rpc('publish_natfiber_enrichment',{target_fiber_id:'NF-0001',target_release_group:'IJUK_ENRICHMENT_V1'}); await loadIjukPreview(); }catch(e){ alert(e.message||e); }
}

function setLegacyVisibility(host, show, keepId){
  if(!host) return;
  [...host.children].forEach(el=>{
    if(el.classList.contains('nf-fiber-context') || el.id===keepId) return;
    el.classList.toggle('nf-hidden-by-fiber',!show);
  });
}

function enforceVisibility(){
  const isIjuk=activeFiber()==='NF-0001';
  const review=$('#view-review'), preview=$('#view-preview');
  if(review){ setLegacyVisibility(review,!isIjuk,'ijukReviewPanel'); $('#ijukReviewPanel')?.classList.toggle('nf-hidden-by-fiber',!isIjuk); }
  if(preview){ setLegacyVisibility(preview,!isIjuk,'ijukEnrichmentPanel'); $('#ijukEnrichmentPanel')?.classList.toggle('nf-hidden-by-fiber',!isIjuk); }
}

function updateViewTitle(){
  const t=$('#viewTitle'); if(!t) return;
  const f=flow(), id=$('.view.active')?.id;
  if(id==='view-review') t.textContent=`Review Queue · ${f.name}`;
  else if(id==='view-preview') t.textContent=`Release Preview · ${f.name}`;
}

function applySelection(forceLoad=false){
  ensureSelector(); updateVersion(); ensureContextBanner('#view-review'); ensureContextBanner('#view-preview'); ensureIjukReview(); ensureIjukPreview(); enforceVisibility(); updateViewTitle();
  if(activeFiber()==='NF-0001' && (forceLoad || !ijukPreview)) loadIjukPreview();
}

function bindNavigation(){
  $$('.side-nav .nav-btn').forEach(btn=>{
    if(btn.dataset.nfFiberBound) return;
    btn.dataset.nfFiberBound='1';
    btn.addEventListener('click',()=>setTimeout(()=>applySelection(false),80));
  });
  document.addEventListener('click',e=>{ if(e.target.closest('.language-switch [data-lang]')) setTimeout(()=>applySelection(false),120); });
}

function start(){
  addStyles(); bindNavigation();
  setInterval(async()=>{
    const app=$('#editorApp'); if(!app) return;
    const visible=!app.hidden;
    if(visible && !lastVisible){ await resolveRole(); applySelection(true); }
    if(visible){ ensureSelector(); enforceVisibility(); }
    lastVisible=visible;
  },600);
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
