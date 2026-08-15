/*
 NatFiber Encyclopedia — Admin Dashboard Fiber-Aware v1.5
 Stable editor version label: no conflict with Quick Entry v1.2.
*/
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const CFG=window.NATFIBER_CONFIG||{};
if(!CFG.supabaseUrl||!CFG.publishableKey) throw new Error('NatFiber config missing');
const sb=createClient(CFG.supabaseUrl,CFG.publishableKey);
const $=s=>document.querySelector(s);
let busy=false,lastFiber=null,lastLang=null;

function lang(){try{return window.NF_I18N?.getLang?.()||localStorage.getItem('natfiber_lang')||'id';}catch{return'id';}}
function L(id,en){return lang()==='id'?id:en;}
function activeFiber(){return $('#adminFiberSelector')?.value||localStorage.getItem('natfiber_admin_fiber')||'NF-0001';}
function esc(v=''){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
async function rpc(name,args={}){const {data,error}=await sb.rpc(name,args);if(error)throw error;return data;}

function setEditorVersion(){
  const v=$('.side-brand span');
  if(v && v.textContent!=='Editor v1.5') v.textContent='Editor v1.5';
}

function addStyle(){
  if($('#nfAdminDashV15Style'))return;
  const s=document.createElement('style');s.id='nfAdminDashV15Style';
  s.textContent=`
    .nf-dash-scope{margin:0 0 14px;padding:12px 15px;border:1px solid #d8e5df;background:#f3f8f5;border-radius:14px;display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap}
    .nf-dash-scope strong{color:#173f33}.nf-dash-scope span{font-size:10px;color:#687a72}
    .nf-dash-db-context{display:flex;gap:8px;flex-wrap:wrap}.nf-dash-db-context i{font-style:normal;font-size:9px;font-weight:800;padding:4px 7px;border-radius:999px;background:#e2efe8;color:#245c48}
  `;
  document.head.appendChild(s);
}

async function refresh(){
  const id=activeFiber(),lg=lang();
  if(busy||!id)return;
  busy=true;
  try{
    const [profile,dash]=await Promise.all([
      rpc('get_natfiber_profile',{target_fiber_id:id}),
      rpc('get_natfiber_editor_dashboard',{})
    ]);
    if(!profile?.fiber||!$('#summaryCards'))return;

    addStyle();setEditorVersion();
    let scope=$('#nfDashboardScopeV15');
    $('#nfDashboardScopeV14')?.remove();
    if(!scope){
      scope=document.createElement('div');
      scope.id='nfDashboardScopeV15';
      scope.className='nf-dash-scope';
      $('#summaryCards').before(scope);
    }
    scope.innerHTML=`<div><strong>${esc(id)} · ${esc(profile.fiber.canonical_name||'')}</strong><br><span>${esc(profile.fiber.scientific_name||'')} · ${esc(L('ringkasan Dashboard mengikuti serat aktif','Dashboard summary follows the active fiber'))}</span></div><div class="nf-dash-db-context"><i>${esc(L('Database','Database'))}: ${esc(dash?.fibers_total??'—')} ${esc(L('serat','fibers'))}</i><i>${esc(L('Publik','Published'))}: ${esc(dash?.fibers_published??'—')}</i><i>${esc(L('Peran','Role'))}: ${esc(dash?.role||'—')}</i></div>`;

    const openConf=(profile.conflicts||[]).filter(c=>!['RESOLVED','CLOSED'].includes(String(c.status||'').toUpperCase())).length;
    const cards=[
      [L('Referensi serat','Fiber references'),(profile.references||[]).length],
      [L('Observasi properti','Property observations'),(profile.properties||[]).length],
      [L('Perlakuan','Treatments'),(profile.treatments||[]).length],
      [L('Sistem komposit','Composite systems'),(profile.composites||[]).length],
      [L('Rute proses','Processing routes'),(profile.processing||[]).length],
      [L('Aplikasi','Applications'),(profile.applications||[]).length],
      [L('Rekaman karakterisasi','Characterization records'),(profile.characterization_records||[]).length],
      [L('Media publik','Public media'),(profile.media||[]).length],
      [L('Konflik terbuka','Open conflicts'),openConf]
    ];
    $('#summaryCards').innerHTML=cards.map(([k,v])=>`<div class="summary-card"><b>${esc(v)}</b><span>${esc(k)}</span></div>`).join('');
    lastFiber=id;lastLang=lg;
  }catch(e){
    console.warn('[NatFiber] dashboard v1.5 refresh failed',e);
  }finally{busy=false;}
}

function boot(){
  addStyle();
  setEditorVersion();
  document.addEventListener('change',e=>{if(e.target?.id==='adminFiberSelector')setTimeout(refresh,120);});
  document.addEventListener('click',e=>{if(e.target.closest('.language-switch [data-lang]'))setTimeout(refresh,120);});
  setInterval(()=>{
    setEditorVersion();
    const id=activeFiber(),lg=lang();
    if($('#editorApp')&&!$('#editorApp').hidden&&$('#summaryCards')&&(id!==lastFiber||lg!==lastLang))refresh();
  },900);
  setTimeout(refresh,300);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
