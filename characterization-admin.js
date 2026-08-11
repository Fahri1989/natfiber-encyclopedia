import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const CFG = window.NATFIBER_CONFIG || {};
const sb = createClient(CFG.supabaseUrl, CFG.publishableKey);
const FIBER_ID='NF-0002';
const RELEASE_GROUP='CHARACTERIZATION_V1';
const $=s=>document.querySelector(s);
const esc=(v='')=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl=u=>{try{const x=new URL(u,location.href);return ['http:','https:'].includes(x.protocol)?x.href:''}catch{return''}};
const TECH={SEM:'SEM / FESEM',FTIR:'FTIR',XRD:'XRD',DSC:'DSC',TGA_DTG:'TGA / DTG',H_NMR:'¹H-NMR',C13_NMR:'¹³C-NMR',XRF:'XRF'};
let role=null, preview=null, initialized=false;

async function rpc(name,args={}){
  const {data,error}=await sb.rpc(name,args);
  if(error) throw error;
  return data;
}
function lang(){try{return window.NF_I18N?.getLang?.()||localStorage.getItem('natfiber_lang')||'id'}catch{return'id'}}
function L(id,en){return lang()==='id'?id:en}

function ensurePanel(){
  if($('#characterizationReleasePanel')) return;
  const host=$('#view-preview');
  if(!host) return;
  const panel=document.createElement('article');
  panel.className='panel char-admin-panel';
  panel.id='characterizationReleasePanel';
  panel.innerHTML=`
    <div class="panel-head char-admin-head">
      <div>
        <span class="eyebrow">SCIENTIFIC CHARACTERIZATION LIBRARY</span>
        <h3>NF-0002 Sisal — Characterization V1</h3>
        <p id="charAdminDesc">SEM · FTIR · XRD · DSC · TGA/DTG · ¹H-NMR · ¹³C-NMR · XRF</p>
      </div>
      <div class="release-actions">
        <button id="approveCharacterizationBtn" class="btn primary compact" disabled>Setujui Karakterisasi</button>
        <button id="publishCharacterizationBtn" class="btn danger compact" disabled>Publikasikan Karakterisasi</button>
        <button id="characterizationRefreshBtn" class="btn secondary compact">Muat Ulang</button>
      </div>
    </div>
    <div id="characterizationSummary" class="summary-grid release-summary"></div>
    <div id="characterizationStatus" class="release-status-note"></div>
    <div id="characterizationPreviewBody" class="char-admin-preview"><div class="muted">Memuat CHARACTERIZATION_V1…</div></div>`;
  const supplement=$('.supplement-panel');
  if(supplement?.nextSibling) supplement.parentNode.insertBefore(panel,supplement.nextSibling);
  else host.appendChild(panel);

  $('#characterizationRefreshBtn').addEventListener('click',loadPreview);
  $('#approveCharacterizationBtn').addEventListener('click',approve);
  $('#publishCharacterizationBtn').addEventListener('click',publish);
  document.addEventListener('click',e=>{
    if(e.target.closest('.language-switch [data-lang]')) setTimeout(()=>{if(preview) render(preview)},80);
  });
}

async function resolveRole(){
  const {data:{session}}=await sb.auth.getSession();
  if(!session) return null;
  try{
    const d=await rpc('get_natfiber_editor_dashboard');
    role=d?.role||null;
    return role;
  }catch{return null}
}

function itemPublished(i){
  return Boolean(i?.record?.is_public);
}
function summaryCard(value,label){
  return `<div class="summary-card"><strong>${esc(value)}</strong><span>${esc(label)}</span></div>`;
}
function mediaCard(i){
  const m=i.record||{};
  const image=safeUrl(m.thumbnail_url||m.asset_path||m.original_image_url);
  const source=safeUrl(m.source_page_url);
  const title=lang()==='id'?(m.title_id||m.title_en):(m.title_en||m.title_id);
  const allow=m.reuse_status==='REHOST_ALLOWED';
  return `<article class="char-admin-media">
    ${allow&&image?`<div class="char-admin-image"><img loading="lazy" src="${esc(image)}" alt="${esc(title)}"><div class="char-admin-img-fallback" hidden>Preview eksternal gagal dimuat.</div></div>`:
      `<div class="char-admin-media-placeholder">${allow?'▧':'🔗'}</div>`}
    <div><div class="record-id">${esc(m.char_media_id||i.record_id)} · ${esc(TECH[m.technique]||m.technique||'')}</div>
      <strong>${esc(title||'Characterization media')}</strong>
      <div class="char-admin-tags"><span>${esc(m.reuse_status||'')}</span>${m.figure_license?`<span>${esc(m.figure_license)}</span>`:''}</div>
      <p>${esc(lang()==='id'?(m.caption_id||m.source_note||''):(m.caption_en||m.source_note||''))}</p>
      ${source?`<a href="${esc(source)}" target="_blank" rel="noopener">Buka sumber ↗</a>`:''}
    </div>
  </article>`;
}
function recordCard(i){
  const r=i.record||{};
  return `<article class="char-admin-record">
    <div class="record-id">${esc(r.characterization_id||i.record_id)} · ${esc(TECH[r.technique]||r.technique||'')}</div>
    <h4>${esc(r.sample_condition||i.public_label||'—')}</h4>
    <div class="char-admin-kv">
      <b>Konteks</b><span>${esc(r.context_type||'—')}</span>
      <b>Perlakuan</b><span>${esc(r.treatment||'—')}</span>
      <b>Instrumen</b><span>${esc(r.instrument||'—')}</span>
      <b>Figure</b><span>${esc(r.figure_number||'—')}</span>
      <b>Verifikasi</b><span>${esc(r.verification_level||'—')}</span>
    </div>
    <p>${esc(r.interpretation||'')}</p>
    ${r.source_note?`<div class="char-admin-note">${esc(r.source_note)}</div>`:''}
  </article>`;
}
function observationRows(items){
  const rows=items.map(i=>{
    const o=i.record||{};
    let v=o.value_numeric ?? o.value_text ?? '—';
    if(o.value_numeric!==null&&o.value_numeric!==undefined) v=`${o.value_numeric}${o.unit?' '+o.unit:''}${o.value_text?' · '+o.value_text:''}`;
    return `<tr><td>${esc(o.observation_id||i.record_id)}</td><td>${esc(o.parameter||'—')}</td><td>${esc(v)}</td><td>${esc(o.assignment_status||'—')}</td><td>${esc(o.characterization_id||'—')}</td></tr>`;
  }).join('');
  return `<div class="table-wrap"><table class="data-table"><thead><tr><th>ID</th><th>Parameter</th><th>Value</th><th>Status</th><th>Record</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
function coverageCards(items){
  return `<div class="char-admin-coverage">${items.map(i=>{
    const c=i.record||{};
    return `<div class="char-admin-cov ${String(c.evidence_level||'').toLowerCase()}"><strong>${esc(TECH[c.technique]||c.technique||'')}</strong><span>${esc(c.evidence_level||'')}</span><small>${esc(c.main_limitation||'')}</small></div>`;
  }).join('')}</div>`;
}

function bindImageFallbacks(){
  document.querySelectorAll('#characterizationPreviewBody .char-admin-image img').forEach(img=>{
    img.addEventListener('error',()=>{img.style.display='none';const f=img.parentElement.querySelector('.char-admin-img-fallback');if(f)f.hidden=false},{once:true});
  });
}

function render(p){
  preview=p;
  const s=p?.summary||{};
  const items=p?.items||[];
  const coverage=items.filter(i=>i.data_table==='fiber_characterization_coverage');
  const records=items.filter(i=>i.data_table==='fiber_characterization_records');
  const media=items.filter(i=>i.data_table==='fiber_characterization_media');
  const obs=items.filter(i=>i.data_table==='fiber_characterization_observations');
  const refs=items.filter(i=>i.data_table==='references');
  const published=items.length>0 && items.every(itemPublished);

  $('#characterizationSummary').innerHTML=[
    summaryCard(s.selected_items??0,L('Item dipilih','Selected items')),
    summaryCard(s.approved_items??0,L('Disetujui','Approved')),
    summaryCard(s.hold_items??0,L('Ditahan','On hold')),
    summaryCard(coverage.length,L('Teknik','Techniques')),
    summaryCard(media.length,L('Media/figure','Media/figures'))
  ].join('');

  $('#characterizationStatus').innerHTML = published
    ? `<strong>Characterization published ✓</strong> — ${esc(L('data karakterisasi sudah terbuka melalui RLS publik.','characterization data are exposed through public RLS.'))}`
    : `<strong>${esc(RELEASE_GROUP)}</strong> · ${esc(L('masih private sampai Prof menyetujui lalu mempublikasikan release ini.','remains private until approval and publication.'))}`;

  const allApproved=(s.selected_items??0)>0 && s.approved_items===s.selected_items && (s.hold_items??0)===0;
  $('#approveCharacterizationBtn').disabled=role!=='ADMIN' || published || allApproved;
  $('#publishCharacterizationBtn').disabled=role!=='ADMIN' || published || !allApproved;

  $('#characterizationPreviewBody').innerHTML=`
    <section class="char-admin-section"><h4>1. Characterization Completeness</h4>${coverageCards(coverage)}</section>
    <section class="char-admin-section"><h4>2. Figure / Media Reuse Register</h4><div class="char-admin-media-grid">${media.map(mediaCard).join('')}</div></section>
    <section class="char-admin-section"><h4>3. Scientific Records</h4><div class="char-admin-record-grid">${records.map(recordCard).join('')}</div></section>
    <section class="char-admin-section"><h4>4. Source-resolved Observations <span>${obs.length}</span></h4>${observationRows(obs)}</section>
    <section class="char-admin-section"><h4>5. References <span>${refs.length}</span></h4>
      <div class="char-admin-ref-list">${refs.map(i=>{const r=i.record||{};const u=safeUrl(r.url||(r.doi?`https://doi.org/${r.doi}`:''));return `<div><strong>${esc(r.reference_id||i.record_id)}</strong> ${esc(r.title||'')}${u?` <a href="${esc(u)}" target="_blank" rel="noopener">↗</a>`:''}</div>`}).join('')}</div>
    </section>`;
  bindImageFallbacks();
}

async function loadPreview(){
  ensurePanel();
  const body=$('#characterizationPreviewBody');
  if(body) body.innerHTML='<div class="muted">Memuat CHARACTERIZATION_V1…</div>';
  try{
    if(!role) await resolveRole();
    const p=await rpc('get_natfiber_characterization_preview',{target_fiber_id:FIBER_ID,target_release_group:RELEASE_GROUP});
    if(!p) throw new Error('Editor session required.');
    render(p);
  }catch(e){
    if(body) body.innerHTML=`<div class="message error">${esc(e.message||e)}</div>`;
  }
}
async function approve(){
  if(role!=='ADMIN') return;
  if(!confirm(L('Setujui seluruh item Characterization V1? Ini belum mempublikasikan data.','Approve all Characterization V1 items? This does not publish them yet.'))) return;
  try{
    await rpc('approve_natfiber_characterization',{target_fiber_id:FIBER_ID,target_release_group:RELEASE_GROUP});
    await loadPreview();
  }catch(e){alert(e.message||e)}
}
async function publish(){
  if(role!=='ADMIN') return;
  if(!confirm(L('Publikasikan Characterization V1 sekarang? Setelah ini data dan media yang dipilih akan terlihat di situs publik.','Publish Characterization V1 now? Selected data and media will become visible on the public site.'))) return;
  try{
    await rpc('publish_natfiber_characterization',{target_fiber_id:FIBER_ID,target_release_group:RELEASE_GROUP});
    await loadPreview();
  }catch(e){alert(e.message||e)}
}

async function boot(){
  ensurePanel();
  const app=$('#editorApp');
  if(!app) return;
  const timer=setInterval(async()=>{
    if(!app.hidden && !initialized){
      initialized=true;
      clearInterval(timer);
      await resolveRole();
      await loadPreview();
    }
  },600);
  setTimeout(()=>{if(!app.hidden&&!initialized){initialized=true;clearInterval(timer);resolveRole().then(loadPreview)}},2500);
}
document.addEventListener('DOMContentLoaded',boot);
