import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const CFG=window.NATFIBER_CONFIG||{};
if(!CFG.supabaseUrl||!CFG.publishableKey) throw new Error('NatFiber config missing');
const sb=createClient(CFG.supabaseUrl,CFG.publishableKey);
const $=s=>document.querySelector(s);
const esc=(v='')=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const FIBER_ID='NF-0001';
const RELEASE_GROUP='IJUK_MEDIA_V1';
let role=null,preview=null,loading=false;

function lang(){try{return window.NF_I18N?.getLang?.()||localStorage.getItem('natfiber_lang')||'id';}catch{return'id';}}
function L(id,en){return lang()==='id'?id:en;}
async function rpc(name,args={}){const {data,error}=await sb.rpc(name,args);if(error)throw error;return data;}
async function resolveRole(){
  const {data:{session}}=await sb.auth.getSession();
  if(!session){role=null;return null;}
  try{const d=await rpc('get_natfiber_editor_dashboard');role=d?.role||null;}catch{role=null;}
  return role;
}
function safeUrl(u){try{const x=new URL(u,location.href);return ['http:','https:'].includes(x.protocol)?x.href:'';}catch{return'';}}

function addStyle(){
  if($('#ijukMediaStyle'))return;
  const s=document.createElement('style');s.id='ijukMediaStyle';
  s.textContent=`
    #ijukMediaStage3{margin-top:30px;padding-top:26px;border-top:3px solid #dbe8e1}
    .nf-media-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;flex-wrap:wrap}
    .nf-media-head h3{margin:4px 0 6px}.nf-media-head p{margin:0;color:#64776f;max-width:780px}
    .nf-media-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-top:18px}
    .nf-media-review{border:1px solid #dce7e2;border-radius:16px;background:#fff;overflow:hidden}
    .nf-media-review img{display:block;width:100%;height:300px;object-fit:cover;background:#eef4f1}
    .nf-media-body{padding:15px}.nf-media-body h4{margin:4px 0 8px}.nf-media-body p{font-size:10.5px;color:#5d7168;line-height:1.55}
    .nf-media-tags{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}.nf-media-tag{padding:4px 8px;border-radius:999px;background:#e7f3ed;color:#1f6048;font-size:9px;font-weight:800}
    .nf-media-hero{background:#d8f0e4;color:#14543d}
    .nf-media-ready{margin:14px 0;padding:12px 14px;border:1px solid #b9d7c7;background:#f0f8f4;border-radius:12px;color:#1f5d45;font-size:11px;line-height:1.55}
    @media(max-width:760px){.nf-media-grid{grid-template-columns:1fr}.nf-media-review img{height:240px}}
  `;
  document.head.appendChild(s);
}

function ensureStage(){
  const parent=$('#ijukEnrichmentPanel');
  if(!parent||$('#ijukMediaStage3'))return Boolean($('#ijukMediaStage3'));
  addStyle();
  const el=document.createElement('section');el.id='ijukMediaStage3';
  el.innerHTML=`
    <div class="nf-media-head">
      <div>
        <span class="eyebrow">NF-0001 · STAGE 3 · MEDIA GALLERY & HERO IMAGE</span>
        <h3>IJUK_MEDIA_V1 — Media Gallery</h3>
        <p>${L('Media berlisensi terverifikasi untuk melengkapi identitas visual Ijuk. Hero image, foto serat, sumber, lisensi, atribusi, dan provenance diperiksa sebelum publikasi.','License-verified media for the visual identity of Ijuk. Hero image, fibre photo, source, license, attribution, and provenance are reviewed before publication.')}</p>
      </div>
      <div class="release-actions">
        <button id="approveIjukMediaBtn" class="btn primary compact" disabled>${L('Setujui Media','Approve Media')}</button>
        <button id="publishIjukMediaBtn" class="btn danger compact" disabled>${L('Publikasikan Media','Publish Media')}</button>
        <button id="refreshIjukMediaBtn" class="btn secondary compact">${L('Muat Ulang','Refresh')}</button>
      </div>
    </div>
    <div id="ijukMediaSummary" class="summary-grid release-summary"></div>
    <div id="ijukMediaStatus" class="release-status-note"></div>
    <div class="nf-media-ready"><strong>${L('Public renderer siap:','Public renderer ready:')}</strong> ${L('Setelah media dipublish, hero image akan mengisi bidang kosong di Global Footprint dan tab Galeri akan muncul otomatis.','After publishing, the hero image will fill the empty Global Footprint image area and the Gallery tab will appear automatically.')}</div>
    <div id="ijukMediaBody"><div class="muted">${L('Memuat kandidat media…','Loading media candidates…')}</div></div>`;
  parent.appendChild(el);
  $('#approveIjukMediaBtn')?.addEventListener('click',approve);
  $('#publishIjukMediaBtn')?.addEventListener('click',publish);
  $('#refreshIjukMediaBtn')?.addEventListener('click',loadPreview);
  return true;
}
const card=(v,l)=>`<div class="summary-card"><strong>${esc(v)}</strong><span>${esc(l)}</span></div>`;

function mediaCard(i){
  const r=i.record||{};
  const img=safeUrl(r.asset_path||r.original_file_url);
  const src=safeUrl(r.source_page_url);
  const lic=safeUrl(r.license_url);
  const alt=lang()==='id'?(r.alt_text_id||r.title):(r.alt_text_en||r.title);
  return `<article class="nf-media-review">
    ${img?`<img src="${esc(img)}" alt="${esc(alt)}" loading="lazy" referrerpolicy="no-referrer">`:''}
    <div class="nf-media-body">
      <div class="rid">${esc(r.media_id||i.record_id)}</div>
      <h4>${esc(r.title||'')}</h4>
      <div class="nf-media-tags">
        <span class="nf-media-tag">${esc(r.media_type||'MEDIA')}</span>
        <span class="nf-media-tag">${esc(r.license_name||'')}</span>
        ${r.is_hero?`<span class="nf-media-tag nf-media-hero">HERO IMAGE</span>`:''}
      </div>
      <p>${esc(alt||'')}</p>
      <div class="nf-kv">
        <b>Creator</b><span>${esc(r.creator||'—')}</span>
        <b>Location</b><span>${esc(r.location_text||'—')}</span>
        <b>Year</b><span>${esc(r.capture_year||'—')}</span>
        <b>Verification</b><span>${esc(r.verification_status||'—')}</span>
        <b>Attribution</b><span>${esc(r.attribution_text||'—')}</span>
      </div>
      <div style="margin-top:10px;display:flex;gap:10px;flex-wrap:wrap">
        ${src?`<a href="${esc(src)}" target="_blank" rel="noopener">${L('Buka sumber','Open source')} ↗</a>`:''}
        ${lic?`<a href="${esc(lic)}" target="_blank" rel="noopener">${esc(r.license_name||'License')} ↗</a>`:''}
      </div>
    </div>
  </article>`;
}

function render(p){
  preview=p;ensureStage();
  const s=p?.summary||{},items=p?.items||[],media=items.filter(i=>i.data_table==='fiber_media');
  const pub=media.length>0&&media.every(i=>Boolean(i.record?.is_public));
  const allApproved=(s.selected_items??0)>0&&s.approved_items===s.selected_items&&(s.hold_items??0)===0;
  const heroes=media.filter(i=>i.record?.is_hero).length;
  $('#ijukMediaSummary').innerHTML=[
    card(s.selected_items??0,'Selected'),
    card(s.approved_items??0,'Approved'),
    card(s.hold_items??0,'Hold'),
    card(heroes,'Hero image'),
    card(media.filter(i=>i.record?.media_type==='RAW_FIBRE').length,'Raw fibre')
  ].join('');
  $('#ijukMediaStatus').innerHTML=pub
    ? `<strong>IJUK_MEDIA_V1 published ✓</strong> · ${L('Media sudah tampil pada situs publik.','Media are available on the public site.')}`
    : `<strong>IJUK_MEDIA_V1</strong> · ${L('PRIVATE candidate set. Belum ada media Tahap 3 yang public.','PRIVATE candidate set. No Stage 3 media are public yet.')}`;
  $('#approveIjukMediaBtn').disabled=role!=='ADMIN'||pub||allApproved;
  $('#publishIjukMediaBtn').disabled=role!=='ADMIN'||pub||!allApproved;
  $('#ijukMediaBody').innerHTML=`<div class="nf-media-grid">${media.map(mediaCard).join('')}</div>`;
}
async function loadPreview(){
  if(loading)return;loading=true;
  try{
    ensureStage();if(!role)await resolveRole();
    const p=await rpc('get_natfiber_supplement_preview',{target_fiber_id:FIBER_ID,target_release_group:RELEASE_GROUP});
    if(!p)throw new Error('Editor session required.');
    render(p);
  }catch(e){ensureStage();if($('#ijukMediaBody'))$('#ijukMediaBody').innerHTML=`<div class="message error">${esc(e.message||e)}</div>`;}
  finally{loading=false;}
}
async function approve(){
  if(role!=='ADMIN')return;
  if(!confirm(L('Setujui kedua kandidat media Ijuk? Ini belum mempublikasikannya.','Approve both Ijuk media candidates? This does not publish them yet.')))return;
  try{await rpc('approve_natfiber_supplement',{target_fiber_id:FIBER_ID,target_release_group:RELEASE_GROUP});await loadPreview();}catch(e){alert(e.message||e);}
}
async function publish(){
  if(role!=='ADMIN')return;
  const s=preview?.summary||{};
  const okGate=(s.selected_items??0)>0&&s.approved_items===s.selected_items&&(s.hold_items??0)===0;
  if(!okGate){alert(L('Semua media harus APPROVED dan HOLD harus 0.','All media must be APPROVED and HOLD must be 0.'));return;}
  if(!confirm(L('Publikasikan media Ijuk sekarang? Hero image dan foto serat akan tampil di situs publik.','Publish Ijuk media now? The hero image and fibre photo will appear on the public site.')))return;
  try{await rpc('publish_natfiber_supplement',{target_fiber_id:FIBER_ID,target_release_group:RELEASE_GROUP});await loadPreview();alert(L('Media Ijuk berhasil dipublikasikan.','Ijuk media published successfully.'));}catch(e){alert(e.message||e);}
}
function boot(){
  const timer=setInterval(async()=>{
    const app=$('#editorApp'),panel=$('#ijukEnrichmentPanel');
    if(app&&!app.hidden&&panel){ensureStage();await resolveRole();await loadPreview();clearInterval(timer);}
  },700);
  setTimeout(()=>clearInterval(timer),30000);
  document.addEventListener('change',e=>{if(e.target?.id==='adminFiberSelector'&&e.target.value==='NF-0001')setTimeout(loadPreview,150);});
  document.addEventListener('click',e=>{if(e.target.closest('.language-switch [data-lang]')&&preview)setTimeout(()=>render(preview),120);});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
