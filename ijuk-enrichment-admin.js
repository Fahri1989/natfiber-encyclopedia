import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const CFG=window.NATFIBER_CONFIG||{};
const sb=createClient(CFG.supabaseUrl,CFG.publishableKey);
const FIBER_ID='NF-0001';
const RELEASE_GROUP='IJUK_ENRICHMENT_V1';
const $=s=>document.querySelector(s);
const esc=(v='')=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let role=null,preview=null,started=false;

async function rpc(name,args={}){const {data,error}=await sb.rpc(name,args);if(error)throw error;return data}
function lang(){try{return window.NF_I18N?.getLang?.()||localStorage.getItem('natfiber_lang')||'id'}catch{return'id'}}
function L(id,en){return lang()==='id'?id:en}
function safeUrl(u){try{const x=new URL(u,location.href);return ['http:','https:'].includes(x.protocol)?x.href:''}catch{return''}}
function isPublished(i){return Boolean(i?.record?.is_public)}
function sumCard(v,l){return `<div class="summary-card"><strong>${esc(v)}</strong><span>${esc(l)}</span></div>`}

function addStyle(){
  if($('#ijukStage1AStyle')) return;
  const s=document.createElement('style'); s.id='ijukStage1AStyle';
  s.textContent=`
  #ijukEnrichmentPanel{margin-top:24px}
  .ijuk-note{padding:15px 17px;border:1px solid #d7e5de;background:#f2f7f4;border-radius:14px;margin:14px 0;font-size:12px;line-height:1.65}
  .ijuk-note strong{color:#173f33}
  .ijuk-section{border-top:1px solid #e4ece8;padding-top:20px;margin-top:22px}
  .ijuk-section h4{font-size:18px;margin:0 0 14px}
  .ijuk-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
  .ijuk-card{border:1px solid #dce7e2;border-radius:16px;padding:15px;background:#fff}
  .ijuk-card .rid{font-size:10px;color:#687b72;font-weight:800;letter-spacing:.05em}
  .ijuk-card h5{margin:5px 0 9px;font-size:14px}
  .ijuk-card p{font-size:11px;color:#5f7069;line-height:1.55}
  .ijuk-kv{display:grid;grid-template-columns:105px 1fr;gap:5px 9px;font-size:11px}
  .ijuk-kv b{color:#65776f}
  .ijuk-tag{display:inline-block;border-radius:999px;background:#e4f3eb;color:#205c47;font-size:9px;font-weight:800;padding:3px 7px;margin:2px 4px 2px 0}
  .ijuk-cov-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
  .ijuk-cov{border:1px solid #dce7e2;border-radius:14px;padding:13px;background:#fff}
  .ijuk-cov strong,.ijuk-cov span,.ijuk-cov small{display:block}
  .ijuk-cov span{font-size:10px;color:#1f654c;font-weight:800;margin:4px 0}
  .ijuk-cov small{font-size:10px;color:#687b72}
  .ijuk-table{max-height:440px;overflow:auto;border:1px solid #e1e9e5;border-radius:14px}
  .ijuk-table table{width:100%;border-collapse:collapse;min-width:850px}
  .ijuk-table th,.ijuk-table td{padding:9px 10px;border-bottom:1px solid #e6ece9;text-align:left;font-size:10px;vertical-align:top}
  .ijuk-table th{position:sticky;top:0;background:#f1f6f3;z-index:1}
  @media(max-width:900px){.ijuk-grid{grid-template-columns:1fr}.ijuk-cov-grid{grid-template-columns:repeat(2,1fr)}}`;
  document.head.appendChild(s);
}

function ensurePanel(){
  addStyle();
  if($('#ijukEnrichmentPanel')) return;
  const host=$('#view-preview'); if(!host) return;
  const panel=document.createElement('article');
  panel.className='panel'; panel.id='ijukEnrichmentPanel';
  panel.innerHTML=`
    <div class="panel-head">
      <div>
        <span class="eyebrow">NF-0001 VERIFIED ENRICHMENT</span>
        <h3>NF-0001 Ijuk — Enrichment & Characterization V1</h3>
        <p>${L('Tahap 1A: verifikasi sumber primer dan migrasi kandidat.','Stage 1A: primary-source verification and migration candidates.')}</p>
      </div>
      <div class="release-actions">
        <button id="approveIjukBtn" class="btn primary compact" disabled>${L('Setujui Enrichment','Approve Enrichment')}</button>
        <button id="publishIjukBtn" class="btn danger compact" disabled>${L('Publikasikan Enrichment','Publish Enrichment')}</button>
        <button id="refreshIjukBtn" class="btn secondary compact">${L('Muat Ulang','Refresh')}</button>
      </div>
    </div>
    <div id="ijukSummary" class="summary-grid release-summary"></div>
    <div id="ijukStatus" class="release-status-note"></div>
    <div class="ijuk-note">
      <strong>${L('Koreksi Stage 1A:','Stage 1A corrections:')}</strong>
      ${L(
        'FTIR dan XRD dipulihkan dari sumber primer Ilyas et al. (2017). Asumsi UPR/10–30% serat dari laporan mentah, detector SEM yang tidak dilaporkan, dan unit diameter 0.081–0.500 m tidak dimasukkan. Lima composite record publik lama tetap dipertahankan tanpa perubahan.',
        'FTIR and XRD were restored from primary Ilyas et al. (2017). Unsupported UPR/10–30% fibre assumptions, an unreported SEM detector and the erroneous 0.081–0.500 m diameter unit were excluded. Five existing public composite records remain unchanged.'
      )}
    </div>
    <div id="ijukBody"><div class="muted">Memuat IJUK_ENRICHMENT_V1…</div></div>`;
  host.appendChild(panel);
  $('#approveIjukBtn').addEventListener('click',approve);
  $('#publishIjukBtn').addEventListener('click',publishNow);
  $('#refreshIjukBtn').addEventListener('click',load);
}

async function resolveRole(){
  const {data:{session}}=await sb.auth.getSession(); if(!session) return null;
  try{const d=await rpc('get_natfiber_editor_dashboard');role=d?.role||null;return role}catch{return null}
}

const section=(n,title,html,count)=>`<section class="ijuk-section"><h4>${n}. ${esc(title)}${count!==undefined?` <span class="ijuk-tag">${esc(count)}</span>`:''}</h4>${html}</section>`;

function treatment(i){const r=i.record||{};return `<article class="ijuk-card"><div class="rid">${esc(r.treatment_id||i.record_id)}</div><h5>${esc(r.agent_method||'Treatment')}</h5><div class="ijuk-kv"><b>${L('Konsentrasi','Concentration')}</b><span>${r.concentration_value!=null?`${esc(r.concentration_value)} ${esc(r.concentration_unit||'')}`:'NOT_REPORTED'}</span><b>${L('Suhu','Temperature')}</b><span>${r.temperature_c!=null?`${esc(r.temperature_c)} °C`:'NOT_REPORTED'}</span><b>${L('Waktu','Time')}</b><span>${r.time_value!=null?`${esc(r.time_value)} ${esc(r.time_unit||'')}`:'NOT_REPORTED'}</span><b>Reference</b><span>${esc(r.reference_id||'—')}</span></div><p>${esc(r.evidence_note||'')}</p></article>`}
function process(i){const r=i.record||{};return `<article class="ijuk-card"><div class="rid">${esc(r.processing_id||i.record_id)}</div><h5>${esc(r.process_name||'Processing')}</h5><span class="ijuk-tag">${esc(r.process_category||'')}</span><p>${esc(r.notes||'')}</p><div class="ijuk-kv"><b>Parameters</b><span>${esc(JSON.stringify(r.process_parameters||{}))}</span><b>Reference</b><span>${esc(r.reference_id||'—')}</span></div></article>`}
function app(i){const r=i.record||{};return `<article class="ijuk-card"><div class="rid">${esc(r.application_id||i.record_id)}</div><h5>${esc(r.application_name||'Application')}</h5><span class="ijuk-tag">${esc(r.maturity_level||'')}</span><p>${esc(r.evidence_summary||'')}</p><div class="ijuk-kv"><b>Sector</b><span>${esc(r.application_sector||'—')}</span><b>Reference</b><span>${esc(r.reference_id||'—')}</span></div></article>`}
function gap(i){const r=i.record||{};return `<article class="ijuk-card"><div class="rid">${esc(r.research_gap_id||i.record_id)} · P${esc(r.priority||'')}</div><h5>${esc(r.gap||'Research gap')}</h5><p>${esc(r.why_it_matters||'')}</p><div class="ijuk-kv"><b>${L('Bukti','Evidence')}</b><span>${esc(r.current_evidence||'—')}</span><b>${L('Studi','Study')}</b><span>${esc(r.recommended_study||'—')}</span></div></article>`}
function record(i){const r=i.record||{};return `<article class="ijuk-card"><div class="rid">${esc(r.characterization_id||i.record_id)} · ${esc(r.technique||'')}</div><h5>${esc(r.sample_condition||'Scientific record')}</h5><div class="ijuk-kv"><b>Context</b><span>${esc(r.context_type||'—')}</span><b>Treatment</b><span>${esc(r.treatment||'—')}</span><b>Instrument</b><span>${esc(r.instrument||'—')}</span><b>Figure</b><span>${esc(r.figure_number||'—')}</span><b>Verification</b><span>${esc(r.verification_level||'—')}</span></div><p>${esc(r.interpretation||'')}</p></article>`}
function media(i){const r=i.record||{},u=safeUrl(r.source_page_url);return `<article class="ijuk-card"><div class="rid">${esc(r.char_media_id||i.record_id)} · ${esc(r.technique||'')}</div><h5>${esc(lang()==='id'?(r.title_id||r.title_en):(r.title_en||r.title_id))}</h5><span class="ijuk-tag">${esc(r.reuse_status||'')}</span><span class="ijuk-tag">${esc(r.figure_license||'')}</span><p>${esc(lang()==='id'?(r.caption_id||r.source_note||''):(r.caption_en||r.source_note||''))}</p>${u?`<a href="${esc(u)}" target="_blank" rel="noopener">${L('Buka sumber','Open source')} ↗</a>`:''}</article>`}
function coverage(items){return `<div class="ijuk-cov-grid">${items.map(i=>{const r=i.record||{};return `<div class="ijuk-cov"><strong>${esc(r.technique||'')}</strong><span>${esc(r.evidence_level||'')}</span><small>${esc(r.main_limitation||'')}</small></div>`}).join('')}</div>`}
function observations(items){return `<div class="ijuk-table"><table><thead><tr><th>ID</th><th>Parameter</th><th>Value</th><th>Unit</th><th>Status</th><th>Record</th></tr></thead><tbody>${items.map(i=>{const r=i.record||{};let v=r.value_numeric??r.value_text??'—';if((r.value_min!=null)||(r.value_max!=null))v=`${r.value_min??'—'}–${r.value_max??'—'}`;if(r.value_numeric!=null&&r.value_text)v=`${r.value_numeric} · ${r.value_text}`;return `<tr><td>${esc(r.observation_id||i.record_id)}</td><td>${esc(r.parameter||'')}</td><td>${esc(v)}</td><td>${esc(r.unit||'')}</td><td>${esc(r.assignment_status||'')}</td><td>${esc(r.characterization_id||'')}</td></tr>`}).join('')}</tbody></table></div>`}

function render(p){
  preview=p; const s=p?.summary||{},items=p?.items||[],by=t=>items.filter(i=>i.data_table===t);
  const tr=by('treatments'),pr=by('processing'),ap=by('applications'),gp=by('research_gaps'),
        cv=by('fiber_characterization_coverage'),md=by('fiber_characterization_media'),
        rc=by('fiber_characterization_records'),ob=by('fiber_characterization_observations');
  const pub=items.length>0&&items.every(isPublished);
  $('#ijukSummary').innerHTML=[
    sumCard(s.selected_items??0,L('Item dipilih','Selected items')),
    sumCard(s.approved_items??0,L('Disetujui','Approved')),
    sumCard(s.hold_items??0,L('Ditahan','On hold')),
    sumCard(cv.length,L('Teknik','Techniques')),
    sumCard(md.length,L('Media/figure','Media/figures'))
  ].join('');
  $('#ijukStatus').innerHTML=pub
    ? `<strong>Ijuk enrichment published ✓</strong> — ${L('data sudah terbuka melalui RLS publik.','data are exposed through public RLS.')}`
    : `<strong>${RELEASE_GROUP}</strong> · ${L('masih PRIVATE sampai Prof menyetujui lalu mempublikasikannya.','remains PRIVATE until owner approval and publication.')}`;
  const approved=(s.selected_items??0)>0&&s.approved_items===s.selected_items&&(s.hold_items??0)===0;
  $('#approveIjukBtn').disabled=role!=='ADMIN'||pub||approved;
  $('#publishIjukBtn').disabled=role!=='ADMIN'||pub||!approved;
  $('#ijukBody').innerHTML=
    section(1,L('Treatment Terverifikasi','Verified Treatments'),`<div class="ijuk-grid">${tr.map(treatment).join('')}</div>`,tr.length)+
    section(2,'Processing',`<div class="ijuk-grid">${pr.map(process).join('')}</div>`,pr.length)+
    section(3,L('Aplikasi Konservatif','Conservative Applications'),`<div class="ijuk-grid">${ap.map(app).join('')}</div>`,ap.length)+
    section(4,L('Research Gaps yang Dikoreksi','Corrected Research Gaps'),`<div class="ijuk-grid">${gp.map(gap).join('')}</div>`,gp.length)+
    section(5,L('Kelengkapan Karakterisasi','Characterization Completeness'),coverage(cv),cv.length)+
    section(6,'Figure / Media Reuse Register',`<div class="ijuk-grid">${md.map(media).join('')}</div>`,md.length)+
    section(7,'Scientific Characterization Records',`<div class="ijuk-grid">${rc.map(record).join('')}</div>`,rc.length)+
    section(8,L('Observasi Source-resolved','Source-resolved Observations'),observations(ob),ob.length);
}

async function load(){
  ensurePanel();
  try{
    if(!role) await resolveRole();
    const p=await rpc('get_natfiber_enrichment_preview',{target_fiber_id:FIBER_ID,target_release_group:RELEASE_GROUP});
    if(!p) throw new Error('Editor session required.');
    render(p);
  }catch(e){$('#ijukBody').innerHTML=`<div class="message error">${esc(e.message||e)}</div>`}
}
async function approve(){
  if(role!=='ADMIN')return;
  if(!confirm(L('Setujui seluruh 73 kandidat Ijuk Enrichment V1? Ini belum mempublikasikan data.','Approve all Ijuk Enrichment V1 candidates? This does not publish them yet.')))return;
  try{await rpc('approve_natfiber_enrichment',{target_fiber_id:FIBER_ID,target_release_group:RELEASE_GROUP});await load()}catch(e){alert(e.message||e)}
}
async function publishNow(){
  if(role!=='ADMIN')return;
  if(!confirm(L('Publikasikan Ijuk Enrichment V1 sekarang? Data terpilih akan menjadi publik.','Publish Ijuk Enrichment V1 now? Selected data will become public.')))return;
  try{await rpc('publish_natfiber_enrichment',{target_fiber_id:FIBER_ID,target_release_group:RELEASE_GROUP});await load()}catch(e){alert(e.message||e)}
}
async function boot(){
  ensurePanel(); const app=$('#editorApp'); if(!app)return;
  const timer=setInterval(async()=>{if(!app.hidden&&!started){started=true;clearInterval(timer);await resolveRole();await load()}},600);
  setTimeout(()=>{if(!app.hidden&&!started){started=true;clearInterval(timer);resolveRole().then(load)}},2600);
  document.addEventListener('click',e=>{if(e.target.closest('.language-switch [data-lang]'))setTimeout(()=>{if(preview)render(preview)},100)});
}
document.addEventListener('DOMContentLoaded',boot);
