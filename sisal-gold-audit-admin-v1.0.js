/*
 NatFiber Encyclopedia — NF-0002 Sisal Gold-Standard Audit Fix v1.0
 Release group: SISAL_GOLD_FIX_V1
 Purpose:
 - Human ADMIN approval/publication for corrected direct Sisal DSC evidence.
 - After successful publish, correct DSC coverage from NOT_FOUND -> LIMITED_EVIDENCE.
 - Reference URL/DOI metadata corrections were already applied in backend audit.
*/
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const CFG=window.NATFIBER_CONFIG||{};
if(!CFG.supabaseUrl||!CFG.publishableKey) throw new Error('NatFiber config missing');
const sb=createClient(CFG.supabaseUrl,CFG.publishableKey);

const $=s=>document.querySelector(s);
const RELEASE='SISAL_GOLD_FIX_V1';
const FIBER='NF-0002';
let role=null;
let lastVisible=null;
let busy=false;

function lang(){
  try{return window.NF_I18N?.getLang?.()||localStorage.getItem('natfiber_lang')||'id';}
  catch{return'id';}
}
function L(id,en){return lang()==='id'?id:en;}
function esc(v=''){
  return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function activeFiber(){
  return $('#adminFiberSelector')?.value||localStorage.getItem('natfiber_admin_fiber')||'NF-0001';
}
async function rpc(name,args={}){
  const {data,error}=await sb.rpc(name,args);
  if(error)throw error;
  return data;
}

function addStyle(){
  if($('#nfSisalGoldFixStyle'))return;
  const s=document.createElement('style');
  s.id='nfSisalGoldFixStyle';
  s.textContent=`
    .nf-sisal-gold-panel{margin-bottom:22px;border:1px solid #dccb87;background:linear-gradient(135deg,#fffdf6,#faf4d9)}
    .nf-sisal-gold-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;flex-wrap:wrap}
    .nf-sisal-gold-head h3{margin:4px 0 7px;color:#4e3e0c}
    .nf-sisal-gold-head p{max-width:760px;font-size:11px;color:#6c6245;line-height:1.6}
    .nf-sisal-gold-actions{display:flex;gap:8px;flex-wrap:wrap}
    .nf-sisal-gold-status{margin:14px 0;padding:12px 14px;border:1px solid #e3d9ad;background:#fffdf6;border-radius:12px;font-size:10.5px;color:#665b3c}
    .nf-sisal-gold-status.good{border-color:#b9dcc9;background:#f2faf5;color:#285b43}
    .nf-sisal-gold-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin:12px 0}
    .nf-sisal-gold-stat{background:#fff;border:1px solid #e3dac0;border-radius:13px;padding:12px}
    .nf-sisal-gold-stat strong{display:block;font-size:20px;color:#433608}
    .nf-sisal-gold-stat span{font-size:9px;color:#74694d;text-transform:uppercase;font-weight:800}
    .nf-sisal-gold-record{background:#fff;border:1px solid #e1d8bd;border-radius:14px;padding:14px;margin-top:12px}
    .nf-sisal-gold-record h4{margin:4px 0 8px}
    .nf-sisal-gold-record .rid{font-size:9px;font-weight:850;color:#766a4d}
    .nf-sisal-gold-kv{display:grid;grid-template-columns:120px 1fr;gap:6px 10px;font-size:10px}
    .nf-sisal-gold-kv b{color:#74694d}
    .nf-sisal-gold-note{margin-top:12px;padding:11px 13px;border-left:4px solid #bd8629;background:#fff8e9;border-radius:8px;font-size:10px;color:#6a562e;line-height:1.55}
    @media(max-width:900px){.nf-sisal-gold-grid{grid-template-columns:repeat(2,1fr)}}
  `;
  document.head.appendChild(s);
}

async function resolveRole(){
  try{
    const d=await rpc('get_natfiber_editor_dashboard',{});
    role=d?.role||null;
  }catch{role=null;}
}

function ensurePanel(){
  const host=$('#view-preview');
  if(!host)return null;
  let panel=$('#sisalGoldFixPanel');
  if(!panel){
    panel=document.createElement('article');
    panel.id='sisalGoldFixPanel';
    panel.className='panel nf-sisal-gold-panel';
    panel.innerHTML=`
      <div class="nf-sisal-gold-head">
        <div>
          <span class="eyebrow">NF-0002 · GOLD-STANDARD AUDIT FIX</span>
          <h3>Sisal — DSC Evidence Correction</h3>
          <p>${L(
            'Audit Gold Standard menemukan satu koreksi ilmiah penting: DSC intrinsic Sisal bukan NOT_FOUND. Martin et al. (2010) melaporkan DSC pada raw dan defatted Sisal fibre di atmosfer udara dan nitrogen. Record baru tetap konservatif: figure number dan reuse figure belum diklaim.',
            'Gold-Standard audit found one important scientific correction: intrinsic Sisal DSC is not NOT_FOUND. Martin et al. (2010) reports DSC on raw and defatted Sisal fibre under air and nitrogen atmospheres. The new record remains conservative: figure number and figure reuse are not claimed.'
          )}</p>
        </div>
        <div class="nf-sisal-gold-actions">
          <button id="approveSisalGoldFixBtn" class="btn primary compact" disabled>${L('Approve DSC Correction','Approve DSC Correction')}</button>
          <button id="publishSisalGoldFixBtn" class="btn danger compact" disabled>${L('Publish DSC Correction','Publish DSC Correction')}</button>
          <button id="refreshSisalGoldFixBtn" class="btn secondary compact">${L('Muat Ulang','Refresh')}</button>
        </div>
      </div>
      <div id="sisalGoldFixStats" class="nf-sisal-gold-grid"></div>
      <div id="sisalGoldFixStatus" class="nf-sisal-gold-status">${L('Memuat status audit…','Loading audit status…')}</div>
      <div id="sisalGoldFixBody"></div>
      <div class="nf-sisal-gold-note"><strong>${L('Catatan metodologis:','Method note:')}</strong> ${L(
        'Evidence level akan menjadi LIMITED_EVIDENCE karena baru satu primary source yang digunakan untuk direct intrinsic-fibre DSC. Figure_available dan rehost_allowed tetap false sampai full-PDF figure-level verification selesai.',
        'Evidence level will be LIMITED_EVIDENCE because only one primary source is currently used for direct intrinsic-fibre DSC. figure_available and rehost_allowed remain false until full-PDF figure-level verification is completed.'
      )}</div>`;
    host.prepend(panel);

    $('#approveSisalGoldFixBtn')?.addEventListener('click',approveFix);
    $('#publishSisalGoldFixBtn')?.addEventListener('click',publishFix);
    $('#refreshSisalGoldFixBtn')?.addEventListener('click',load);
  }
  return panel;
}

async function load(){
  const panel=ensurePanel();
  if(!panel)return;

  const visible=activeFiber()===FIBER;
  panel.style.display=visible?'':'none';
  if(!visible)return;

  if(busy)return;
  busy=true;
  try{
    if(!role)await resolveRole();

    const [{data:manifest,error:mErr},{data:record,error:rErr},{data:cov,error:cErr},{data:refs,error:refErr}] = await Promise.all([
      sb.from('release_manifest').select('release_item_id,editor_status,is_selected,release_group,public_label,release_note,selection_reason').eq('fiber_id',FIBER).eq('release_group',RELEASE),
      sb.from('fiber_characterization_records').select('characterization_id,technique,context_type,sample_condition,measurement_conditions,figure_number,verification_level,record_status,is_public,reference_id,doi,source_note').eq('characterization_id','CHR-000029').maybeSingle(),
      sb.from('fiber_characterization_coverage').select('coverage_id,evidence_level,primary_source_count,fulltext_verified_count,figure_available,rehost_allowed,main_limitation,is_public,record_status').eq('fiber_id',FIBER).eq('technique','DSC').maybeSingle(),
      sb.from('references').select('reference_id,url,doi').in('reference_id',['REF-000031','REF-000033','REF-000034','REF-000035','REF-000039','REF-000042','REF-000043','REF-000044','REF-000046'])
    ]);
    if(mErr)throw mErr;if(rErr)throw rErr;if(cErr)throw cErr;if(refErr)throw refErr;

    const item=(manifest||[])[0]||{};
    const selected=(manifest||[]).filter(x=>x.is_selected).length;
    const approved=(manifest||[]).filter(x=>x.is_selected&&x.editor_status==='APPROVED').length;
    const holds=(manifest||[]).filter(x=>x.editor_status==='HOLD').length;
    const publicCount=record?.is_public?1:0;
    const fixedRefs=(refs||[]).filter(x=>x.url).length;

    $('#sisalGoldFixStats').innerHTML=[
      [selected,L('Selected','Selected')],
      [approved,L('Approved','Approved')],
      [publicCount,L('Public','Public')],
      [fixedRefs+'/9',L('Reference URLs','Reference URLs')]
    ].map(([v,k])=>`<div class="nf-sisal-gold-stat"><strong>${esc(v)}</strong><span>${esc(k)}</span></div>`).join('');

    const isAdmin=role==='ADMIN';
    const approve=$('#approveSisalGoldFixBtn');
    const publish=$('#publishSisalGoldFixBtn');
    approve.disabled=!isAdmin||selected===0||approved===selected||publicCount>0;
    publish.disabled=!isAdmin||selected===0||approved!==selected||publicCount>0;

    const complete=publicCount===1 && cov?.evidence_level==='LIMITED_EVIDENCE';
    const status=$('#sisalGoldFixStatus');
    status.className=`nf-sisal-gold-status ${complete?'good':''}`;
    status.innerHTML=complete
      ? `<strong>${L('Koreksi DSC sudah PUBLIC dan coverage sudah konsisten.','DSC correction is PUBLIC and coverage is consistent.')}</strong> ${L('NF-0002 siap untuk final Gold-Standard certification audit.','NF-0002 is ready for final Gold-Standard certification audit.')}`
      : publicCount===1
        ? `<strong>${L('Record DSC sudah PUBLIC.','DSC record is PUBLIC.')}</strong> ${L('Coverage akan diselaraskan otomatis.','Coverage will be synchronized automatically.')}`
        : approved===selected && selected>0
          ? `<strong>${L('DSC correction sudah APPROVED.','DSC correction is APPROVED.')}</strong> ${L('Silakan Publish DSC Correction.','Publish DSC Correction when ready.')}`
          : `<strong>${L('Kandidat DSC masih PRIVATE.','DSC candidate remains PRIVATE.')}</strong> ${L('Human ADMIN approval diperlukan sebelum publication.','Human ADMIN approval is required before publication.')}`;

    if(record){
      $('#sisalGoldFixBody').innerHTML=`<article class="nf-sisal-gold-record">
        <div class="rid">${esc(record.characterization_id)} · ${esc(record.technique)} · ${esc(record.verification_level)}</div>
        <h4>${esc(record.sample_condition||'')}</h4>
        <div class="nf-sisal-gold-kv">
          <b>Context</b><span>${esc(record.context_type||'')}</span>
          <b>${L('Kondisi','Conditions')}</b><span>${esc(record.measurement_conditions||'')}</span>
          <b>Figure</b><span>${esc(record.figure_number||'—')}</span>
          <b>Reference</b><span>${esc(record.reference_id||'—')} · DOI ${esc(record.doi||'—')}</span>
          <b>Status</b><span>${esc(record.record_status||'')} · ${record.is_public?'PUBLIC':'PRIVATE'}</span>
          <b>DSC coverage</b><span>${esc(cov?.evidence_level||'—')}</span>
        </div>
      </article>`;
    }else{
      $('#sisalGoldFixBody').innerHTML=`<div class="message error">${L('CHR-000029 tidak ditemukan.','CHR-000029 not found.')}</div>`;
    }

    if(publicCount===1 && cov?.evidence_level!=='LIMITED_EVIDENCE' && isAdmin){
      await synchronizeCoverage();
      setTimeout(load,100);
    }
  }catch(e){
    $('#sisalGoldFixStatus').className='nf-sisal-gold-status';
    $('#sisalGoldFixStatus').textContent=e.message;
  }finally{busy=false;}
}

async function approveFix(){
  if(role!=='ADMIN')return alert(L('Hanya ADMIN yang dapat approve.','Only ADMIN can approve.'));
  const ok=confirm(L(
    'Approve SISAL_GOLD_FIX_V1?\n\nIni hanya menyetujui kandidat DSC. Data belum dipublikasikan.',
    'Approve SISAL_GOLD_FIX_V1?\n\nThis only approves the DSC candidate. Data will remain private.'
  ));
  if(!ok)return;
  try{
    $('#approveSisalGoldFixBtn').disabled=true;
    await rpc('approve_natfiber_supplement',{target_fiber_id:FIBER,target_release_group:RELEASE});
    await load();
  }catch(e){alert(e.message);await load();}
}

async function synchronizeCoverage(){
  const {error}=await sb.from('fiber_characterization_coverage').update({
    evidence_level:'LIMITED_EVIDENCE',
    primary_source_count:1,
    fulltext_verified_count:0,
    figure_available:false,
    rehost_allowed:false,
    main_limitation:'One direct primary source confirms DSC of raw/defatted Sisal fibre under air and nitrogen. Figure number, instrument/heating-rate details and figure reuse remain unresolved pending full-PDF verification.',
    notes:'NF-GS-v1 audit correction: Martin et al. 2010 (Thermochimica Acta, DOI 10.1016/j.tca.2010.04.008) overturns prior NOT_FOUND state. Direct intrinsic-fibre DSC is FOUND with LIMITED_EVIDENCE.',
    updated_at:new Date().toISOString()
  }).eq('fiber_id',FIBER).eq('technique','DSC');
  if(error)throw error;
}

async function publishFix(){
  if(role!=='ADMIN')return alert(L('Hanya ADMIN yang dapat publish.','Only ADMIN can publish.'));
  const ok=confirm(L(
    'Publish DSC Correction untuk NF-0002?\n\nCHR-000029 akan menjadi PUBLIC. Setelah publikasi, coverage DSC otomatis diubah dari NOT_FOUND menjadi LIMITED_EVIDENCE.',
    'Publish DSC Correction for NF-0002?\n\nCHR-000029 will become PUBLIC. After publication, DSC coverage will automatically change from NOT_FOUND to LIMITED_EVIDENCE.'
  ));
  if(!ok)return;
  try{
    $('#publishSisalGoldFixBtn').disabled=true;
    await rpc('publish_natfiber_supplement',{target_fiber_id:FIBER,target_release_group:RELEASE});
    await synchronizeCoverage();
    await load();
  }catch(e){alert(e.message);await load();}
}

function boot(){
  addStyle();
  ensurePanel();
  document.addEventListener('change',e=>{
    if(e.target?.id==='adminFiberSelector')setTimeout(load,120);
  });
  document.addEventListener('click',e=>{
    if(e.target.closest('[data-view="preview"]')||e.target.closest('.language-switch [data-lang]'))setTimeout(load,120);
  });
  setInterval(()=>{
    const visible=activeFiber()===FIBER && !!$('#view-preview');
    if(visible!==lastVisible){lastVisible=visible;load();}
  },700);
  setTimeout(load,500);
  console.info('[NatFiber] Sisal Gold-Standard Audit Fix v1.0 loaded.');
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
else boot();
