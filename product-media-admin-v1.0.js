/*
 NatFiber Encyclopedia — Product Media Manager v1.0
 Generic for any active fiber.
 Creates PRIVATE media + product semantics + release manifest.
 Uses standard supplement Approve/Publish workflow.
*/
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const CFG=window.NATFIBER_CONFIG||{};
if(!CFG.supabaseUrl||!CFG.publishableKey) throw new Error('NatFiber config missing');
const sb=createClient(CFG.supabaseUrl,CFG.publishableKey);
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
let role=null,lastFiber=null,lastLang=null,busy=false;

function lang(){try{return window.NF_I18N?.getLang?.()||localStorage.getItem('natfiber_lang')||'id';}catch{return'id';}}
function L(id,en){return lang()==='id'?id:en;}
function esc(v=''){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function activeFiber(){return $('#adminFiberSelector')?.value||localStorage.getItem('natfiber_admin_fiber')||'NF-0001';}
function releaseGroup(id=activeFiber()){return id.replace('-','')+'_PRODUCT_MEDIA_V1';}
async function rpc(name,args={}){const {data,error}=await sb.rpc(name,args);if(error)throw error;return data;}

function addStyle(){
  if($('#nfProductAdminStyle'))return;
  const s=document.createElement('style');s.id='nfProductAdminStyle';
  s.textContent=`
    .nf-pm-panel{margin-bottom:22px;border:1px solid #d9e5df}
    .nf-pm-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;flex-wrap:wrap}
    .nf-pm-head h3{margin:4px 0 6px}.nf-pm-head p{font-size:10.5px;line-height:1.55;color:#63756d;max-width:760px}
    .nf-pm-form{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:16px}
    .nf-pm-field{display:flex;flex-direction:column;gap:4px}.nf-pm-field.wide{grid-column:span 2}.nf-pm-field.full{grid-column:1/-1}
    .nf-pm-field label{font-size:8.5px;font-weight:850;color:#65776f;text-transform:uppercase;letter-spacing:.04em}
    .nf-pm-field input,.nf-pm-field select,.nf-pm-field textarea{width:100%;border:1px solid #d5e1db;border-radius:9px;padding:9px 10px;background:#fff;color:#17372e;font:inherit;font-size:10px}
    .nf-pm-field textarea{min-height:70px;resize:vertical}
    .nf-pm-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:13px}
    .nf-pm-message{margin-top:10px;font-size:10px;padding:9px 11px;border-radius:9px;background:#f2f7f4;color:#53665d}.nf-pm-message.error{background:#fff2f2;color:#8b3535}
    .nf-pm-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:14px 0}
    .nf-pm-stat{background:#f7faf8;border:1px solid #dce6e1;border-radius:12px;padding:11px}.nf-pm-stat b{display:block;font-size:19px}.nf-pm-stat span{font-size:8px;font-weight:850;color:#6e7e77;text-transform:uppercase}
    .nf-pm-list{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.nf-pm-item{border:1px solid #dce6e1;border-radius:13px;padding:12px;background:#fff}
    .nf-pm-item .rid{font-size:8px;font-weight:850;color:#6f7e77}.nf-pm-item h5{margin:4px 0 7px;font-size:12px}.nf-pm-item p{font-size:9.5px;color:#65756e;line-height:1.5}
    .nf-pm-tag{display:inline-block;font-size:8px;font-weight:850;padding:3px 6px;border-radius:999px;background:#e5f1eb;color:#265c49;margin:2px 3px 2px 0}
    .nf-pm-release-actions{display:flex;gap:8px;flex-wrap:wrap}
    .nf-pm-note{margin-top:12px;padding:11px 13px;border-left:4px solid #2e8064;background:#eef5f1;border-radius:9px;font-size:9.5px;color:#52655d;line-height:1.5}
    @media(max-width:1000px){.nf-pm-form{grid-template-columns:repeat(2,1fr)}.nf-pm-field.wide{grid-column:span 2}}
    @media(max-width:700px){.nf-pm-form{grid-template-columns:1fr}.nf-pm-field.wide,.nf-pm-field.full{grid-column:1}.nf-pm-list{grid-template-columns:1fr}.nf-pm-stats{grid-template-columns:repeat(2,1fr)}}
  `;
  document.head.appendChild(s);
}

async function resolveRole(){
  try{const d=await rpc('get_natfiber_editor_dashboard',{});role=d?.role||null;}catch{role=null;}
}

function inputPanel(){
  const host=$('#view-entry');if(!host)return null;
  let panel=$('#nfProductMediaInputPanel');
  if(panel)return panel;
  panel=document.createElement('article');panel.id='nfProductMediaInputPanel';panel.className='panel nf-pm-panel';
  panel.innerHTML=`
    <div class="nf-pm-head"><div><span class="eyebrow">APPLICATION PRODUCT GALLERY</span><h3>${L('Tambah foto produk / material antara','Add product / intermediate-material media')}</h3><p>${L(
      'Form ini membuat aset media PRIVATE beserta metadata lisensi dan semantic record Traditional/Modern. Tidak ada data yang menjadi publik sampai release disetujui dan dipublikasikan oleh ADMIN.',
      'This form creates a PRIVATE media asset with licensing metadata and a Traditional/Modern semantic record. Nothing becomes public until the release is approved and published by an ADMIN.'
    )}</p></div><span class="nf-tag" id="nfPmInputFiber"></span></div>
    <form id="nfProductMediaForm" class="nf-pm-form">
      <div class="nf-pm-field"><label>${L('Kelas aplikasi','Application class')}</label><select name="application_class"><option value="TRADITIONAL">${L('Konvensional / Tradisional','Conventional / Traditional')}</option><option value="MODERN_ENGINEERING">${L('Modern / Rekayasa','Modern / Engineering')}</option></select></div>
      <div class="nf-pm-field"><label>${L('Tahap rantai nilai','Value-chain stage')}</label><select name="value_chain_stage"><option value="FINISHED_PRODUCT">${L('Produk jadi','Finished product')}</option><option value="INTERMEDIATE_MATERIAL">${L('Material antara','Intermediate material')}</option></select></div>
      <div class="nf-pm-field"><label>Maturity</label><select name="maturity_level"><option>COMMERCIAL</option><option>DEMONSTRATED</option><option>EXPERIMENTAL</option><option>PROPOSED</option></select></div>
      <div class="nf-pm-field"><label>${L('Application record (opsional)','Application record (optional)')}</label><select name="application_id"><option value="">—</option></select></div>
      <div class="nf-pm-field"><label>${L('Kategori produk','Product category')}</label><input name="product_category" placeholder="Automotive interior / Household / Geotextile"></div>
      <div class="nf-pm-field"><label>${L('Evidence relation','Evidence relation')}</label><select name="evidence_relation"><option value="SOURCE_EXPLICIT_PRODUCT_FIBER">SOURCE_EXPLICIT_PRODUCT_FIBER</option><option value="SOURCE_EXPLICIT_PRODUCT_MATERIAL">SOURCE_EXPLICIT_PRODUCT_MATERIAL</option><option value="RESEARCH_PROTOTYPE">RESEARCH_PROTOTYPE</option><option value="HISTORICAL_DOCUMENTATION">HISTORICAL_DOCUMENTATION</option><option value="CONTEXT_ONLY">CONTEXT_ONLY</option></select></div>
      <div class="nf-pm-field"><label>${L('Nama produk (ID)','Product name (ID)')}</label><input name="product_name_id" required></div>
      <div class="nf-pm-field"><label>${L('Nama produk (EN)','Product name (EN)')}</label><input name="product_name_en" required></div>
      <div class="nf-pm-field"><label>Reference ID ${L('(opsional)','(optional)')}</label><input name="reference_id" placeholder="REF-000000"></div>
      <div class="nf-pm-field wide"><label>${L('Deskripsi produk (ID)','Product description (ID)')}</label><textarea name="product_description_id"></textarea></div>
      <div class="nf-pm-field"><label>${L('Verifikasi produk','Product verification')}</label><select name="product_verification"><option value="VERIFIED_FIBER_PRODUCT">VERIFIED_FIBER_PRODUCT</option><option value="VERIFIED_RESEARCH_PROTOTYPE">VERIFIED_RESEARCH_PROTOTYPE</option><option value="HISTORICAL_VERIFIED">HISTORICAL_VERIFIED</option><option value="CONTEXT_ONLY">CONTEXT_ONLY</option><option value="UNVERIFIED">UNVERIFIED</option></select></div>
      <div class="nf-pm-field wide"><label>${L('Deskripsi produk (EN)','Product description (EN)')}</label><textarea name="product_description_en"></textarea></div>
      <div class="nf-pm-field"><label>${L('Tahun foto','Capture year')}</label><input name="capture_year" type="number" min="1800" max="2100"></div>
      <div class="nf-pm-field"><label>${L('Judul media','Media title')}</label><input name="media_title" required></div>
      <div class="nf-pm-field"><label>${L('Pembuat / fotografer','Creator / photographer')}</label><input name="media_creator" required></div>
      <div class="nf-pm-field"><label>${L('Nama sumber','Source name')}</label><input name="source_name" placeholder="Wikimedia Commons / Publisher / Museum"></div>
      <div class="nf-pm-field wide"><label>${L('URL halaman sumber','Source page URL')}</label><input name="source_page_url" type="url" required></div>
      <div class="nf-pm-field"><label>${L('Lokasi foto','Location')}</label><input name="location_text"></div>
      <div class="nf-pm-field wide"><label>${L('URL file gambar asli','Original image file URL')}</label><input name="original_file_url" type="url"></div>
      <div class="nf-pm-field"><label>${L('Nama lisensi','License name')}</label><input name="license_name" placeholder="CC BY 4.0" required></div>
      <div class="nf-pm-field wide"><label>${L('URL lisensi','License URL')}</label><input name="license_url" type="url" required></div>
      <div class="nf-pm-field full"><label>${L('Teks atribusi','Attribution text')}</label><input name="attribution_text" required></div>
      <div class="nf-pm-field wide"><label>Alt text ID</label><textarea name="alt_text_id"></textarea></div>
      <div class="nf-pm-field"><label>${L('Media verification','Media verification')}</label><input name="media_verification" value="LICENSE_AND_PRODUCT_IDENTITY_VERIFIED"></div>
      <div class="nf-pm-field wide"><label>Alt text EN</label><textarea name="alt_text_en"></textarea></div>
      <div class="nf-pm-field full"><label>${L('Catatan provenance / identitas produk','Provenance / product-identity note')}</label><textarea name="provenance_note"></textarea></div>
    </form>
    <div class="nf-pm-actions"><button id="nfPmSaveBtn" class="btn primary compact" type="button">${L('Simpan sebagai Kandidat PRIVATE','Save as PRIVATE Candidate')}</button></div>
    <div id="nfPmInputMessage" class="nf-pm-message">${L('Gunakan hanya foto yang sumber, lisensi, dan hubungan produk–seratnya dapat dibuktikan.','Use only photos with traceable source, licence, and product–fibre relationship.')}</div>`;
  host.prepend(panel);
  $('#nfPmSaveBtn').addEventListener('click',saveCandidate);
  return panel;
}

function previewPanel(){
  const host=$('#view-preview');if(!host)return null;
  let panel=$('#nfProductMediaPreviewPanel');
  if(panel)return panel;
  panel=document.createElement('article');panel.id='nfProductMediaPreviewPanel';panel.className='panel nf-pm-panel';
  panel.innerHTML=`
    <div class="nf-pm-head"><div><span class="eyebrow">PRODUCT MEDIA RELEASE</span><h3 id="nfPmPreviewTitle"></h3><p>${L('Review aset gambar dan semantic product record sebelum publikasi.','Review image assets and semantic product records before publication.')}</p></div>
      <div class="nf-pm-release-actions"><button id="nfPmApproveBtn" class="btn primary compact" disabled>${L('Approve Product Media','Approve Product Media')}</button><button id="nfPmPublishBtn" class="btn danger compact" disabled>${L('Publish Product Media','Publish Product Media')}</button><button id="nfPmRefreshBtn" class="btn secondary compact">${L('Muat Ulang','Refresh')}</button></div></div>
    <div id="nfPmStats" class="nf-pm-stats"></div><div id="nfPmPreviewMessage" class="nf-pm-message"></div><div id="nfPmItems" class="nf-pm-list"></div>
    <div class="nf-pm-note"><strong>${L('Gate publikasi:','Publication gate:')}</strong> ${L('Semua selected item harus APPROVED. Foto dan semantic record dipublikasikan bersama; lisensi media tetap disimpan di fiber_media.','All selected items must be APPROVED. The image and semantic record are published together; media licensing remains stored in fiber_media.')}</div>`;
  host.prepend(panel);
  $('#nfPmApproveBtn').addEventListener('click',approveRelease);
  $('#nfPmPublishBtn').addEventListener('click',publishRelease);
  $('#nfPmRefreshBtn').addEventListener('click',refreshAll);
  return panel;
}

async function loadApps(id){
  const {data,error}=await sb.from('applications').select('application_id,application_sector,application_name,maturity_level,is_public,record_status').eq('fiber_id',id).order('application_id');
  if(error)throw error;
  const sel=$('#nfProductMediaForm [name=application_id]');
  if(sel)sel.innerHTML='<option value="">—</option>'+((data||[]).map(a=>`<option value="${esc(a.application_id)}">${esc(a.application_id+' · '+(a.application_name||a.application_sector||''))}</option>`).join(''));
}

async function saveCandidate(){
  if(!role)await resolveRole();
  if(!['ADMIN','EDITOR'].includes(role||''))return;
  const form=$('#nfProductMediaForm');
  const f=Object.fromEntries(new FormData(form).entries());
  const id=activeFiber();
  $('#nfPmSaveBtn').disabled=true;
  try{
    const args={
      target_fiber_id:id,
      target_release_group:releaseGroup(id),
      media_title:f.media_title,
      media_creator:f.media_creator,
      media_source_page_url:f.source_page_url,
      media_original_file_url:f.original_file_url||null,
      media_license_name:f.license_name,
      media_license_url:f.license_url,
      media_attribution_text:f.attribution_text,
      media_source_name:f.source_name||null,
      media_capture_year:f.capture_year?Number(f.capture_year):null,
      media_location_text:f.location_text||null,
      media_alt_text_id:f.alt_text_id||null,
      media_alt_text_en:f.alt_text_en||null,
      media_provenance_note:f.provenance_note||null,
      media_verification_status:f.media_verification||'LICENSE_AND_PRODUCT_IDENTITY_VERIFIED',
      target_application_id:f.application_id||null,
      target_value_chain_stage:f.value_chain_stage,
      target_application_class:f.application_class,
      target_product_category:f.product_category||null,
      target_product_name_id:f.product_name_id,
      target_product_name_en:f.product_name_en,
      target_product_description_id:f.product_description_id||null,
      target_product_description_en:f.product_description_en||null,
      target_maturity_level:f.maturity_level,
      target_evidence_relation:f.evidence_relation,
      target_product_verification_status:f.product_verification,
      target_reference_id:f.reference_id||null
    };
    const result=await rpc('create_natfiber_product_media_candidate',args);
    $('#nfPmInputMessage').className='nf-pm-message';
    $('#nfPmInputMessage').innerHTML=`<strong>${L('Kandidat berhasil dibuat.','Candidate created.')}</strong> ${esc(result.media_id)} + ${esc(result.product_media_id)} · ${esc(result.release_group)}`;
    form.reset();
    form.querySelector('[name=media_verification]').value='LICENSE_AND_PRODUCT_IDENTITY_VERIFIED';
    await loadApps(id);
    await loadPreview();
  }catch(e){
    $('#nfPmInputMessage').className='nf-pm-message error';
    $('#nfPmInputMessage').textContent=e.message;
  }finally{$('#nfPmSaveBtn').disabled=false;}
}

function itemCard(i){
  const r=i.record||{};
  if(i.data_table==='fiber_media'){
    return `<article class="nf-pm-item"><div class="rid">${esc(i.release_item_id)} · ${esc(i.record_id)} · MEDIA ASSET</div><h5>${esc(r.title||i.public_label||'')}</h5><span class="nf-pm-tag">${esc(i.editor_status)}</span><span class="nf-pm-tag">${esc(r.license_name||'')}</span><p>${esc(r.attribution_text||'')}</p><small>${esc(r.source_page_url||'')}</small></article>`;
  }
  return `<article class="nf-pm-item"><div class="rid">${esc(i.release_item_id)} · ${esc(i.record_id)} · PRODUCT SEMANTICS</div><h5>${esc(lang()==='id'?(r.product_name_id||i.public_label):(r.product_name_en||i.public_label))}</h5><span class="nf-pm-tag">${esc(i.editor_status)}</span><span class="nf-pm-tag">${esc(r.application_class||'')}</span><span class="nf-pm-tag">${esc(r.value_chain_stage||'')}</span><span class="nf-pm-tag">${esc(r.maturity_level||'')}</span><p>${esc(lang()==='id'?(r.product_description_id||''):(r.product_description_en||''))}</p><small>${esc(r.evidence_relation||'')} · ${esc(r.verification_status||'')}</small></article>`;
}

async function loadPreview(){
  const id=activeFiber(),rg=releaseGroup(id);
  $('#nfPmPreviewTitle').textContent=`${id} · ${rg}`;
  try{
    const p=await rpc('get_natfiber_supplement_preview',{target_fiber_id:id,target_release_group:rg});
    const s=p?.summary||{};
    const items=p?.items||[];
    const selected=Number(s.selected_items||0),approved=Number(s.approved_items||0),hold=Number(s.hold_items||0);
    const publicRows=await rpc('get_natfiber_product_gallery',{target_fiber_id:id});
    $('#nfPmStats').innerHTML=[
      [selected,'Selected'],[approved,'Approved'],[hold,'Hold'],[Array.isArray(publicRows)?publicRows.length:0,L('Public product media','Public product media')]
    ].map(([v,k])=>`<div class="nf-pm-stat"><b>${esc(v)}</b><span>${esc(k)}</span></div>`).join('');
    $('#nfPmItems').innerHTML=items.length?items.map(itemCard).join(''):`<div class="nf-pm-message">${L('Belum ada kandidat Product Media dalam release group ini.','No Product Media candidates in this release group yet.')}</div>`;
    const admin=role==='ADMIN';
    $('#nfPmApproveBtn').disabled=!admin||selected===0||approved===selected;
    $('#nfPmPublishBtn').disabled=!admin||selected===0||approved!==selected;
    $('#nfPmPreviewMessage').innerHTML=selected===0?L('Release group kosong.','Release group is empty.'):approved===selected?`<strong>${L('Semua item sudah APPROVED.','All items are APPROVED.')}</strong> ${L('Siap dipublikasikan.','Ready to publish.')}`:`${approved}/${selected} ${L('item disetujui.','items approved.')}`;
  }catch(e){
    $('#nfPmPreviewMessage').className='nf-pm-message error';
    $('#nfPmPreviewMessage').textContent=e.message;
  }
}

async function approveRelease(){
  if(role!=='ADMIN')return alert('ADMIN_REQUIRED');
  if(!confirm(L('Approve seluruh selected Product Media? Data tetap PRIVATE sampai Publish.','Approve all selected Product Media? Data remains PRIVATE until Publish.')))return;
  try{await rpc('approve_natfiber_supplement',{target_fiber_id:activeFiber(),target_release_group:releaseGroup()});await loadPreview();}catch(e){alert(e.message);}
}
async function publishRelease(){
  if(role!=='ADMIN')return alert('ADMIN_REQUIRED');
  if(!confirm(L('Publish Product Media yang sudah approved? Aset gambar dan metadata produk akan menjadi PUBLIC.','Publish approved Product Media? Image assets and product metadata will become PUBLIC.')))return;
  try{await rpc('publish_natfiber_supplement',{target_fiber_id:activeFiber(),target_release_group:releaseGroup()});await loadPreview();}catch(e){alert(e.message);}
}

async function refreshAll(){
  const id=activeFiber();
  $('#nfPmInputFiber').textContent=id;
  await resolveRole();
  await loadApps(id);
  await loadPreview();
  lastFiber=id;lastLang=lang();
}

function boot(){
  addStyle();inputPanel();previewPanel();
  document.addEventListener('change',e=>{if(e.target?.id==='adminFiberSelector')setTimeout(refreshAll,120);});
  document.addEventListener('click',e=>{if(e.target.closest('.language-switch [data-lang]'))setTimeout(()=>{lastLang=null;refreshAll();},120);});
  setInterval(()=>{
    const id=activeFiber(),lg=lang();
    if(id!==lastFiber||lg!==lastLang)refreshAll();
  },850);
  setTimeout(refreshAll,500);
  console.info('[NatFiber] Product Media Manager v1.0 loaded.');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
