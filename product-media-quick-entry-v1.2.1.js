
(function(){
'use strict';
const $=s=>document.querySelector(s);
function lang(){try{return window.NF_I18N?.getLang?.()||localStorage.getItem('natfiber_lang')||'id';}catch{return'id';}}
function L(id,en){return lang()==='id'?id:en;}
function f(n){return document.querySelector(`#nfProductMediaForm [name="${n}"]`);}
function set(n,v){const e=f(n);if(e)e.value=v??'';}
function val(n){return f(n)?.value??'';}
const LICENSES={
'CC BY 4.0':'https://creativecommons.org/licenses/by/4.0/',
'CC BY-SA 4.0':'https://creativecommons.org/licenses/by-sa/4.0/',
'CC0 1.0':'https://creativecommons.org/publicdomain/zero/1.0/',
'Public Domain':'https://creativecommons.org/publicdomain/mark/1.0/'
};
function addStyle(){
 if($('#nfQuickEntryStyle'))return;
 const s=document.createElement('style');s.id='nfQuickEntryStyle';
 s.textContent=`
 .nf-qe{margin-top:14px}.nf-qe-banner{padding:13px 15px;border:1px solid #d2e3da;background:#edf6f1;border-radius:13px;margin-bottom:12px}
 .nf-qe-banner strong{display:block;color:#173f33;font-size:13px}.nf-qe-banner span{font-size:9.5px;color:#65766e}
 .nf-qe-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.nf-qe-field{display:flex;flex-direction:column;gap:4px}
 .nf-qe-field label{font-size:8.5px;font-weight:850;color:#65776f;text-transform:uppercase}.nf-qe-field input,.nf-qe-field select{border:1px solid #d5e1db;border-radius:9px;padding:10px;font-size:10px}
 .nf-qe-third{display:none}.nf-qe-third.active{display:flex}.nf-qe-adv{margin-top:13px;border:1px solid #dce5e1;border-radius:12px;background:#fbfcfb}.nf-qe-adv summary{padding:11px 13px;cursor:pointer;font-size:9.5px;font-weight:850}
 .nf-qe-adv-body{padding:0 13px 13px}.nf-qe-adv-body .nf-pm-field{display:flex!important;margin-top:8px}
 #nfProductMediaForm>.nf-pm-field{display:none!important} #nfProductMediaForm>.nf-pm-photo-source{display:block!important}
 @media(max-width:900px){.nf-qe-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:620px){.nf-qe-grid{grid-template-columns:1fr}}
 `;
 document.head.appendChild(s);
}
function editorIdentity(){return ($('#editorEmail')?.textContent||'NatFiber editor').trim();}
function build(){
 const form=$('#nfProductMediaForm'); if(!form||$('#nfQuickEntry'))return;
 addStyle();
 const div=document.createElement('div');div.id='nfQuickEntry';div.className='nf-qe';
 div.innerHTML=`
 <div class="nf-qe-banner"><strong>${L('Mode Pengisian Cepat','Quick Entry Mode')}</strong><span>${L('Cukup isi informasi utama. Metadata teknis diisi otomatis.','Enter only the essentials. Technical metadata is filled automatically.')}</span></div>
 <div class="nf-qe-grid">
  <div class="nf-qe-field"><label>${L('Jenis sumber foto','Photo source')}</label><select id="qeSource"><option value="OWNER">${L('Foto milik sendiri','My own photo')}</option><option value="THIRD">${L('Foto pihak ketiga','Third-party photo')}</option></select></div>
  <div class="nf-qe-field"><label>${L('Kelas aplikasi','Application class')}</label><select id="qeClass"><option value="TRADITIONAL">${L('Konvensional / Tradisional','Conventional / Traditional')}</option><option value="MODERN_ENGINEERING">${L('Modern / Rekayasa','Modern / Engineering')}</option></select></div>
  <div class="nf-qe-field"><label>${L('Tahap produk','Product stage')}</label><select id="qeStage"><option value="FINISHED_PRODUCT">${L('Produk jadi','Finished product')}</option><option value="INTERMEDIATE_MATERIAL">${L('Material antara','Intermediate material')}</option></select></div>
  <div class="nf-qe-field"><label>${L('Nama produk (ID)','Product name (ID)')}</label><input id="qeNameId"></div>
  <div class="nf-qe-field"><label>${L('Nama produk (EN)','Product name (EN)')}</label><input id="qeNameEn"></div>
  <div class="nf-qe-field"><label>Maturity</label><select id="qeMat"><option value="COMMERCIAL">${L('Komersial','Commercial')}</option><option value="DEMONSTRATED">${L('Terdemonstrasi','Demonstrated')}</option><option value="EXPERIMENTAL">${L('Eksperimental','Experimental')}</option><option value="PROPOSED">${L('Diusulkan','Proposed')}</option></select></div>
  <div class="nf-qe-field nf-qe-third" id="qeUrlWrap"><label>${L('URL sumber foto','Photo source URL')}</label><input id="qeUrl" type="url"></div>
  <div class="nf-qe-field nf-qe-third" id="qeCreatorWrap"><label>${L('Creator / Fotografer','Creator / Photographer')}</label><input id="qeCreator"></div>
  <div class="nf-qe-field nf-qe-third" id="qeLicWrap"><label>${L('Lisensi','Licence')}</label><select id="qeLic"><option value="">${L('Pilih lisensi','Choose licence')}</option><option>CC BY 4.0</option><option>CC BY-SA 4.0</option><option>CC0 1.0</option><option>Public Domain</option></select></div>
 </div>
 <details class="nf-qe-adv"><summary>${L('Advanced — metadata tambahan (opsional)','Advanced — additional metadata (optional)')}</summary><div class="nf-qe-adv-body" id="qeAdv"></div></details>`;
 form.querySelector('.nf-pm-photo-source')?.insertAdjacentElement('afterend',div);
 const names=['application_id','product_category','evidence_relation','reference_id','product_description_id','product_verification','product_description_en','capture_year','media_title','media_creator','source_name','source_page_url','location_text','original_file_url','license_name','license_url','attribution_text','alt_text_id','media_verification','alt_text_en','provenance_note'];
 names.forEach(n=>{const w=f(n)?.closest('.nf-pm-field');if(w)$('#qeAdv').appendChild(w);});
 $('#qeSource').addEventListener('change',()=>{const third=$('#qeSource').value==='THIRD';['#qeUrlWrap','#qeCreatorWrap','#qeLicWrap'].forEach(x=>$(x)?.classList.toggle('active',third));});
 $('#nfPmSaveBtn')?.addEventListener('click',e=>{if(!prepare()){e.preventDefault();e.stopImmediatePropagation();}},true);
}
function prepare(){
 const nameId=$('#qeNameId')?.value.trim(), nameEn=$('#qeNameEn')?.value.trim();
 if(!nameId||!nameEn){alert(L('Isi Nama Produk (ID) dan Nama Produk (EN).','Enter Product Name (ID) and Product Name (EN).'));return false;}
 const mat=$('#qeMat').value;
 set('application_class',$('#qeClass').value); set('value_chain_stage',$('#qeStage').value); set('product_name_id',nameId); set('product_name_en',nameEn); set('maturity_level',mat);
 set('media_title',val('media_title')||nameEn); if(!val('capture_year'))set('capture_year',String(new Date().getFullYear()));
 if(!val('alt_text_id'))set('alt_text_id',nameId); if(!val('alt_text_en'))set('alt_text_en',nameEn);
 if(['EXPERIMENTAL','PROPOSED'].includes(mat)){set('evidence_relation','RESEARCH_PROTOTYPE');set('product_verification','VERIFIED_RESEARCH_PROTOTYPE');}
 else{set('evidence_relation',val('evidence_relation')||'SOURCE_EXPLICIT_PRODUCT_FIBER');set('product_verification',val('product_verification')||'VERIFIED_FIBER_PRODUCT');}
 if($('#qeSource').value==='OWNER'){
   const c=val('media_creator')||editorIdentity();set('media_creator',c);set('source_name',val('source_name')||'Owner media');set('license_name',val('license_name')||'CC BY 4.0');set('license_url',val('license_url')||LICENSES['CC BY 4.0']);set('attribution_text',val('attribution_text')||`${c} · CC BY 4.0`);set('provenance_note',val('provenance_note')||'Original photo supplied by the NatFiber owner/editor.');
 }else{
   const u=$('#qeUrl').value.trim(),c=$('#qeCreator').value.trim(),lic=$('#qeLic').value;
   if(!u||!c||!lic){alert(L('Isi URL sumber, Creator, dan Lisensi.','Enter Source URL, Creator, and Licence.'));return false;}
   set('source_page_url',u);set('media_creator',c);set('license_name',lic);set('license_url',LICENSES[lic]||'');set('attribution_text',`${c} · ${lic}`);set('source_name','External source');
 }
 return true;
}
function boot(){addStyle();setInterval(()=>{build();},500);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();