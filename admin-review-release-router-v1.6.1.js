(function(){
'use strict';
const LEGACY='NF-0002',EV='natfiber:fiber-changed';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=(v='')=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const active=()=>window.NATFIBER_ADMIN?.getActiveFiber?.()||window.NATFIBER_ADMIN_STATE?.activeFiberId||$('#adminFiberSelector')?.value||localStorage.getItem('natfiber_admin_fiber')||'NF-0001';
const lang=()=>{try{return window.NF_I18N?.getLang?.()||localStorage.getItem('natfiber_lang')||'id'}catch{return'id'}};
const L=(id,en)=>lang()==='id'?id:en;
let sb=null,reviewSeq=0;

const RELEASE_TARGETS={
 'NF-0001':['#ijukEnrichmentPanel','#refreshIjukBtn'],
 'NF-0003':['#nfJuteFullRecordPanel','#nfJuteRefresh'],
 'NF-0004':['#nfFlaxFullRecordPanel','#nfFlaxRefresh'],
 'NF-0005':['#nfHempFullRecordPanel','#nfHempRefresh']
};
function fiberMeta(id){return (window.NATFIBER_ADMIN_STATE?.fibers||[]).find(f=>f.fiber_id===id)||{fiber_id:id,canonical_name:id,scientific_name:''};}
function view(){return $('.view.active')?.id?.replace('view-','')||'dashboard';}
function switchView(v){
 $$('.view').forEach(x=>x.classList.toggle('active',x.id===`view-${v}`));
 $$('.nav-btn').forEach(x=>x.classList.toggle('active',x.dataset.view===v));
 const f=fiberMeta(active()),title=$('#viewTitle');
 if(title) title.textContent=v==='review'?`Review Queue · ${f.canonical_name||f.fiber_id}`:v==='preview'?`Release Preview · ${f.canonical_name||f.fiber_id}`:title.textContent;
}
function addStyle(){
 if($('#nfPatch2Style'))return;
 const s=document.createElement('style');s.id='nfPatch2Style';s.textContent=`
 #nfUnifiedReviewPanel{display:block!important;border:1px solid #cfe0d7;background:linear-gradient(135deg,#fbfdfc,#f1f7f4);margin-bottom:18px}
 .nf-p2-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;flex-wrap:wrap}.nf-p2-head h3{margin:4px 0 5px}.nf-p2-head p{margin:0;color:#63756d;font-size:11px}
 .nf-p2-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin-top:14px}.nf-p2-stat{border:1px solid #dce7e2;border-radius:13px;padding:12px;background:#fff}.nf-p2-stat b{display:block;font-size:21px;color:#173f33}.nf-p2-stat span{font-size:9px;color:#667870;font-weight:800;text-transform:uppercase}
 .nf-p2-gates{margin-top:14px;border:1px solid #e1e9e5;border-radius:13px;overflow:auto;max-height:330px}.nf-p2-gates table{width:100%;border-collapse:collapse;min-width:720px}.nf-p2-gates th,.nf-p2-gates td{padding:8px 10px;border-bottom:1px solid #edf2ef;text-align:left;font-size:10px;vertical-align:top}.nf-p2-gates th{position:sticky;top:0;background:#f3f7f5}.nf-p2-note{margin-top:12px;padding:11px 13px;border-radius:11px;background:#edf6f1;color:#4f675d;font-size:10.5px;line-height:1.55}
 #nfReleaseContextFallback{display:block!important}.nf-p2-fallback{padding:16px;border:1px dashed #bfd4c9;border-radius:14px;background:#f8fbf9;color:#526a60}
 body.nf-jute-active #view-review>#nfUnifiedReviewPanel,body.nf-flax-active #view-review>#nfUnifiedReviewPanel,body.nf-hemp-active #view-review>#nfUnifiedReviewPanel,body.nf-batch-full-active #view-review>#nfUnifiedReviewPanel{display:block!important}
 @media(max-width:900px){.nf-p2-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}`;
 document.head.appendChild(s);
}
function markLegacy(){
 const r=$('#view-review'),p=$('#view-preview');
 if(r) [...r.children].filter(x=>x.classList?.contains('panel')&&x.id!=='nfUnifiedReviewPanel').forEach(x=>{if(!x.dataset.nfFiberAware)x.dataset.nfLegacySisal='1'});
 if(p) [...p.children].filter(x=>x.classList?.contains('panel')&&x.id!=='nfReleaseContextFallback').forEach(x=>{if(!x.dataset.nfFiberAware)x.dataset.nfLegacySisal='1'});
}
function legacyVisibility(show){$$('[data-nf-legacy-sisal="1"]').forEach(x=>x.hidden=!show);}
function ensureReview(){
 const host=$('#view-review');if(!host)return null;let p=$('#nfUnifiedReviewPanel');if(p)return p;
 p=document.createElement('article');p.id='nfUnifiedReviewPanel';p.className='panel';p.dataset.nfFiberAware='1';host.prepend(p);return p;
}
async function client(){if(sb)return sb;const c=window.NATFIBER_CONFIG||{};if(!c.supabaseUrl||!c.publishableKey)return null;const m=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');return sb=m.createClient(c.supabaseUrl,c.publishableKey)}
const arr=(p,...keys)=>{for(const k of keys)if(Array.isArray(p?.[k]))return p[k];return[]};
async function loadReview(){
 const panel=ensureReview();if(!panel)return;const id=active(),f=fiberMeta(id),seq=++reviewSeq;
 panel.innerHTML=`<div class="nf-p2-head"><div><span class="eyebrow">FIBER-AWARE REVIEW CONTEXT</span><h3>${esc(id)} · ${esc(f.canonical_name||'')}</h3><p><em>${esc(f.scientific_name||'')}</em> · ${esc(L('review hanya untuk serat aktif','review scoped to active fiber'))}</p></div><span class="status reviewed">${esc(L('Memuat…','Loading…'))}</span></div>`;
 try{
  const x=await client();if(!x)return;const [{data:p,error:pe},{data:gates,error:ge}]=await Promise.all([
   x.rpc('get_natfiber_profile',{target_fiber_id:id}),
   x.from('verification_log').select('verification_id,reference_id,field_or_property,decision,value_match,method_condition_checked').eq('fiber_id',id).order('verification_id')
  ]);
  if(seq!==reviewSeq)return;if(pe)throw pe;
  const conflicts=arr(p,'conflicts'),open=conflicts.filter(c=>!['RESOLVED','CLOSED'].includes(String(c.status||'').toUpperCase())).length;
  const canon=arr(p,'canonical_values','canonical'),evidence=arr(p,'evidence_records','evidence'),gaps=arr(p,'research_gaps','gaps'),refs=arr(p,'references');
  const gg=ge?[]:(gates||[]),ready=gg.filter(g=>g.decision==='READY_FOR_EDITOR_SIGNOFF').length,signed=gg.filter(g=>g.decision==='EDITOR_SIGNED_OFF').length;
  const rows=gg.map(g=>`<tr><td><b>${esc(g.verification_id)}</b></td><td>${esc(g.reference_id||'—')}</td><td>${esc(g.field_or_property||'—')}</td><td>${esc(g.decision||'—')}</td><td>${esc(g.value_match||'—')}</td></tr>`).join('');
  panel.innerHTML=`<div class="nf-p2-head"><div><span class="eyebrow">FIBER-AWARE REVIEW CONTEXT</span><h3>${esc(id)} · ${esc(p?.fiber?.canonical_name||f.canonical_name||'')}</h3><p><em>${esc(p?.fiber?.scientific_name||f.scientific_name||'')}</em> · ${esc(L('semua hitungan di bawah dibatasi pada serat aktif','all counts below are scoped to the active fiber'))}</p></div><span class="status reviewed">${esc(id)}</span></div><div class="nf-p2-grid"><div class="nf-p2-stat"><b>${gg.length}</b><span>Verification gates</span></div><div class="nf-p2-stat"><b>${open}</b><span>Open conflicts</span></div><div class="nf-p2-stat"><b>${canon.length}</b><span>Canonical values</span></div><div class="nf-p2-stat"><b>${evidence.length}</b><span>Evidence records</span></div><div class="nf-p2-stat"><b>${gaps.length}</b><span>Research gaps</span></div></div>${gg.length?`<div class="nf-p2-gates"><table><thead><tr><th>Gate</th><th>Reference</th><th>Scope</th><th>Decision</th><th>Value match</th></tr></thead><tbody>${rows}</tbody></table></div>`:''}<div class="nf-p2-note"><strong>${esc(L('Scope aman:','Safe scope:'))}</strong> ${esc(ge?L('Verification log tidak tersedia untuk serat ini; panel tidak mengambil gate dari serat lain.','Verification log is unavailable for this fiber; the panel does not borrow gates from another fiber.'):L(`${ready} gate menunggu sign-off, ${signed} sudah ditandatangani. ${refs.length} referensi terhubung pada profil serat aktif.`,`${ready} gate(s) await sign-off, ${signed} signed. ${refs.length} references are linked to the active-fiber profile.`))}</div>`;
 }catch(e){if(seq!==reviewSeq)return;panel.innerHTML=`<div class="message error">${esc(e.message||e)}</div>`}
}
function releaseTarget(id){
 if(RELEASE_TARGETS[id])return RELEASE_TARGETS[id];
 const n=Number(String(id).split('-')[1]);if(n>=6&&n<=25)return['#nfBatchFullRecordPanel','#nfBatchRefresh'];
 return[null,null];
}
function fallback(show){
 const host=$('#view-preview');if(!host)return;let p=$('#nfReleaseContextFallback');
 if(!p){p=document.createElement('article');p.id='nfReleaseContextFallback';p.className='panel';p.dataset.nfFiberAware='1';host.prepend(p)}
 p.hidden=!show;if(show){const f=fiberMeta(active());p.innerHTML=`<div class="nf-p2-fallback"><strong>${esc(active())} · ${esc(f.canonical_name||'')}</strong><br>${esc(L('Release context mengikuti serat aktif, tetapi panel manifest khusus belum siap/termuat. Tidak ada data Sisal yang ditampilkan sebagai pengganti.','Release context follows the active fiber, but its dedicated manifest panel is not ready/loaded. Sisal data is never shown as a fallback.'))}</div>`}
}
function routeRelease(){
 const id=active();legacyVisibility(id===LEGACY);if(id===LEGACY){fallback(false);return}
 const [panelSel,refreshSel]=releaseTarget(id);let tries=0;
 const show=()=>{tries++;const p=panelSel?$(panelSel):null;if(p){p.hidden=false;fallback(false);const b=refreshSel?$(refreshSel):null;if(b&&!b.disabled)setTimeout(()=>b.click(),40);return}if(tries<8)setTimeout(show,180);else fallback(true)};show();
}
function route(v=view()){
 markLegacy();const id=active();legacyVisibility(id===LEGACY);
 const f=fiberMeta(id),title=$('#viewTitle');if(title&&v==='review')title.textContent=`Review Queue · ${f.canonical_name||id}`;if(title&&v==='preview')title.textContent=`Release Preview · ${f.canonical_name||id}`;
 if(v==='review')loadReview();if(v==='preview')routeRelease();
}
function installGuard(){
 document.addEventListener('click',e=>{
  const b=e.target.closest?.('.nav-btn[data-view="review"],.nav-btn[data-view="preview"]');if(!b)return;
  const v=b.dataset.view;if(active()===LEGACY){setTimeout(()=>route(v),180);return}
  e.preventDefault();e.stopImmediatePropagation();switchView(v);setTimeout(()=>route(v),0);
 },true);
}
function boot(){addStyle();markLegacy();ensureReview();installGuard();route(view());
 window.addEventListener(EV,()=>{const v=view();if(active()===LEGACY&&['review','preview'].includes(v)){setTimeout(()=>$('.nav-btn[data-view="'+v+'"]')?.click(),30)}else route(v)});
 document.addEventListener('click',e=>{if(e.target.closest?.('.language-switch [data-lang]'))setTimeout(()=>route(view()),100)});
}
window.NATFIBER_PATCH2={version:'1.6.1',route,loadReview};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
