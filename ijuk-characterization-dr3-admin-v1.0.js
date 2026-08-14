import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const C=window.NATFIBER_CONFIG,sb=createClient(C.supabaseUrl,C.publishableKey),$=s=>document.querySelector(s);
const F='NF-0001',G='IJUK_CHAR_DR3_V1'; let role=null,pv=null;
const e=(v='')=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
async function rpc(n,a={}){const {data,error}=await sb.rpc(n,a);if(error)throw error;return data}
async function getRole(){const d=await rpc('get_natfiber_editor_dashboard');role=d?.role||null}
function ensure(){
 const p=$('#ijukEnrichmentPanel'); if(!p||$('#ijukCharDr3'))return;
 const x=document.createElement('section');x.id='ijukCharDr3';x.style.cssText='margin-top:30px;padding-top:25px;border-top:3px solid #dbe8e1';
 x.innerHTML=`<div class="panel-head"><div><span class="eyebrow">NF-0001 · STAGE 3B · SCIENTIFIC EVIDENCE</span><h3>IJUK_CHAR_DR3_V1</h3><p>Deep Research Stage 3: SEM, FTIR, XRD evidence update. Figure with unresolved licence remains SOURCE_ONLY.</p></div><div class="release-actions"><button id="dr3Approve" class="btn primary compact" disabled>Approve Evidence</button><button id="dr3Publish" class="btn danger compact" disabled>Publish Evidence</button><button id="dr3Refresh" class="btn secondary compact">Refresh</button></div></div><div id="dr3Summary" class="summary-grid release-summary"></div><div class="nf-ijuk-note"><strong>Integrity:</strong> SEM/FTIR/XRD/TGA = FOUND; DTG = PARTIAL; intrinsic DSC = NOT_FOUND; intrinsic XRF = NOT_FOUND. EDX/EDS is not XRF. Yuanita 2024 figures are SOURCE_ONLY pending licence reconciliation.</div><div id="dr3Body"></div>`;
 p.appendChild(x); $('#dr3Approve').onclick=approve; $('#dr3Publish').onclick=publish; $('#dr3Refresh').onclick=load;
}
const sc=(v,l)=>`<div class="summary-card"><strong>${e(v)}</strong><span>${e(l)}</span></div>`;
function card(i){
 const r=i.record||{}; const title=r.title||r.title_en||r.title_id||r.sample_condition||i.public_label||i.record_id;
 const meta=[r.technique,r.context_type,r.reuse_status,r.verification_level,r.reference_id].filter(Boolean).join(' · ');
 const note=r.interpretation||r.notes||r.source_note||r.license_notes||'';
 const url=r.url||r.source_page_url||'';
 return `<article class="nf-ijuk-card"><div class="rid">${e(i.record_id)}</div><h5>${e(title)}</h5><p><b>${e(meta)}</b></p><p>${e(note)}</p>${url?`<a href="${e(url)}" target="_blank" rel="noopener">Open source ↗</a>`:''}</article>`;
}
function render(p){
 pv=p;ensure();const s=p.summary||{},a=p.items||[];
 const refs=a.filter(x=>x.data_table==='references'), rec=a.filter(x=>x.data_table==='fiber_characterization_records'), med=a.filter(x=>x.data_table==='fiber_characterization_media');
 const pub=a.length&&a.every(x=>x.record?.is_public), ok=s.selected_items>0&&s.approved_items===s.selected_items&&s.hold_items===0;
 $('#dr3Summary').innerHTML=[sc(s.selected_items||0,'Selected'),sc(s.approved_items||0,'Approved'),sc(s.hold_items||0,'Hold'),sc(rec.length,'Scientific records'),sc(med.length,'SOURCE_ONLY figures'),sc(refs.length,'References')].join('');
 $('#dr3Approve').disabled=role!=='ADMIN'||pub||ok; $('#dr3Publish').disabled=role!=='ADMIN'||pub||!ok;
 $('#dr3Body').innerHTML=`<section class="nf-ijuk-section"><h4>Scientific records</h4><div class="nf-ijuk-grid">${rec.map(card).join('')}</div></section><section class="nf-ijuk-section"><h4>Figure metadata — SOURCE_ONLY</h4><div class="nf-ijuk-grid">${med.map(card).join('')}</div></section><section class="nf-ijuk-section"><h4>Primary references</h4><div class="nf-ijuk-grid">${refs.map(card).join('')}</div></section>`;
}
async function load(){try{ensure();if(!role)await getRole();render(await rpc('get_natfiber_supplement_preview',{target_fiber_id:F,target_release_group:G}))}catch(err){if($('#dr3Body'))$('#dr3Body').innerHTML=`<div class="message error">${e(err.message)}</div>`}}
async function approve(){if(!confirm('Approve all Stage 3B evidence? This does not publish yet.'))return;await rpc('approve_natfiber_supplement',{target_fiber_id:F,target_release_group:G});await load()}
async function publish(){if(!confirm('Publish Stage 3B metadata? SOURCE_ONLY figures will not be rehosted.'))return;await rpc('publish_natfiber_supplement',{target_fiber_id:F,target_release_group:G});await load()}
function boot(){const t=setInterval(async()=>{if($('#editorApp')&&!$('#editorApp').hidden&&$('#ijukEnrichmentPanel')){ensure();await getRole();await load();clearInterval(t)}},700);setTimeout(()=>clearInterval(t),30000)}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot):boot();
