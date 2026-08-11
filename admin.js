import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const { supabaseUrl, publishableKey } = window.NATFIBER_CONFIG;
const sb = createClient(supabaseUrl, publishableKey);

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const state = { dashboard:null, role:null, fibers:[], selectedFiber:null, user:null };

const clean = obj => Object.fromEntries(Object.entries(obj).filter(([,v]) => v !== '' && v !== null && v !== undefined));
const nullable = v => v === '' ? null : v;
const numOrNull = v => v === '' ? null : Number(v);
const intOrNull = v => v === '' ? null : parseInt(v,10);

function msg(id, text='', type=''){
  const el=$(id); el.textContent=text; el.className=`message ${type}`;
}
function statusClass(s=''){ return String(s).toLowerCase().replace(/[^a-z]+/g,''); }

async function rpc(name,args={}){
  const {data,error}=await sb.rpc(name,args);
  if(error) throw error;
  return data;
}

async function authenticate(){
  const {data:{session}}=await sb.auth.getSession();
  if(!session) return showAuth();
  state.user=session.user;
  try{
    const d=await rpc('get_natfiber_editor_dashboard');
    if(!d) throw new Error('Akun ini belum diizinkan sebagai editor NatFiber.');
    state.dashboard=d; state.role=d.role; state.fibers=d.fibers||[];
    showEditor();
  }catch(e){
    await sb.auth.signOut();
    showAuth(e.message);
  }
}

function showAuth(message=''){
  $('#editorApp').hidden=true; $('#authScreen').hidden=false;
  msg('#authMessage',message,message?'error':'');
}
function showEditor(){
  $('#authScreen').hidden=true; $('#editorApp').hidden=false;
  $('#editorEmail').textContent=state.user?.email||'';
  $('#editorRole').textContent=state.role||'EDITOR';
  applyRoleControls();
  renderDashboard(); renderFiberList(); renderAudit();
  if(state.selectedFiber) selectFiber(state.selectedFiber.fiber_id);
}

function applyRoleControls(){
  const admin=state.role==='ADMIN';
  ['#referenceForm','#propertyForm','#treatmentForm','#compositeForm'].forEach(sel=>{
    const form=$(sel);
    if(!form) return;
    const pub=form.querySelector('[name=is_public]');
    if(pub){ pub.disabled=!admin; if(!admin) pub.checked=false; }
    const status=form.querySelector('[name=record_status]');
    if(status){
      [...status.options].forEach(o=>{ if(o.value==='PUBLISHED') o.disabled=!admin; });
      if(!admin && status.value==='PUBLISHED') status.value='REVIEWED';
    }
  });
}

async function refreshDashboard(){
  const d=await rpc('get_natfiber_editor_dashboard');
  if(!d) throw new Error('Akses editor tidak tersedia.');
  state.dashboard=d; state.role=d.role; state.fibers=d.fibers||[];
  $('#editorRole').textContent=state.role;
  renderDashboard(); renderFiberList(); renderAudit();
}

function renderDashboard(){
  const d=state.dashboard||{};
  const cards=[
    ['Serat total',d.fibers_total||0],['Published',d.fibers_published||0],['Draft/private',d.fibers_draft||0],
    ['References',d.references_total||0],['Properties',d.properties_total||0],['Treatments',d.treatments_total||0],
    ['Composites',d.composites_total||0],['Open conflicts',d.open_conflicts||0],['Role',d.role||'—']
  ];
  $('#summaryCards').innerHTML=cards.map(([k,v])=>`<div class="summary-card"><b>${v}</b><span>${k}</span></div>`).join('');
  $('#dashboardFiberList').innerHTML=(state.fibers||[]).slice(0,10).map(f=>`<div class="mini-item"><span><b>${f.fiber_id} · ${f.canonical_name}</b><br><span class="muted">${f.scientific_name||''}</span></span><span class="status ${statusClass(f.publication_status)}">${f.is_public?'PUBLIC':'PRIVATE'} · ${f.publication_status}</span></div>`).join('');
  const audit=d.recent_audit||[];
  $('#dashboardAudit').innerHTML=audit.length?audit.slice(0,10).map(a=>`<div class="mini-item"><span><b>${a.action} · ${a.table_name}</b><br><span class="muted">${a.record_id||'—'} · ${new Date(a.occurred_at).toLocaleString()}</span></span></div>`).join(''):'<div class="muted">Belum ada perubahan melalui panel editor.</div>';
}

function renderFiberList(filter=''){
  const q=filter.trim().toLowerCase();
  const rows=state.fibers.filter(f=>!q || [f.fiber_id,f.canonical_name,f.english_name,f.scientific_name].some(x=>String(x||'').toLowerCase().includes(q)));
  $('#fiberList').innerHTML=rows.map(f=>`<button class="fiber-row ${state.selectedFiber?.fiber_id===f.fiber_id?'active':''}" data-id="${f.fiber_id}">
    <span><b>${f.fiber_id} · ${f.canonical_name}</b><span>${f.scientific_name||'scientific name pending'}</span></span>
    <span class="status ${statusClass(f.publication_status)}">${f.is_public?'PUBLIC':'PRIVATE'}</span>
  </button>`).join('');
  $$('.fiber-row').forEach(b=>b.addEventListener('click',()=>selectFiber(b.dataset.id)));
}

function fillForm(form,obj){
  [...form.elements].forEach(el=>{
    if(!el.name) return;
    if(el.type==='checkbox') el.checked=!!obj[el.name];
    else el.value=obj[el.name]??'';
  });
}
async function selectFiber(id){
  const f=state.fibers.find(x=>x.fiber_id===id);
  if(!f) return;
  state.selectedFiber=f;
  $('#fiberEmpty').hidden=true; $('#fiberForm').hidden=false;
  $('#selectedFiberId').textContent=f.fiber_id;
  $('#selectedFiberTitle').textContent=f.canonical_name;
  fillForm($('#fiberForm'),f);
  const admin=state.role==='ADMIN';
  ['record_status','publication_status','is_public'].forEach(n=>$('#fiberForm').elements[n].disabled=!admin);
  const pub=$('#publishBtn');
  pub.hidden=!admin;
  pub.textContent=f.is_public?'Unpublish':'Publish';
  pub.className=`btn compact ${f.is_public?'danger':'publish'}`;
  $('#entryFiberTitle').textContent=`${f.fiber_id} · ${f.canonical_name}`;
  $('#entryFiberSub').textContent=f.scientific_name||'';
  renderFiberList($('#fiberSearch').value);
  msg('#fiberMessage');
}

function switchView(view){
  $$('.view').forEach(v=>v.classList.remove('active'));
  $$('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  $(`#view-${view}`).classList.add('active');
  $('#viewTitle').textContent={dashboard:'Dashboard',fibers:'Kelola Serat',entry:'Input Data',audit:'Audit Log'}[view]||view;
  if(view==='audit') loadAudit();
}

async function loadAudit(){
  const {data,error}=await sb.from('editorial_audit_log').select('*').order('occurred_at',{ascending:false}).limit(100);
  if(error){ $('#auditTable').innerHTML=`<div class="message error">${error.message}</div>`; return; }
  $('#auditTable').innerHTML=`<table class="data-table"><thead><tr><th>Waktu</th><th>Actor</th><th>Action</th><th>Table</th><th>Record</th><th>New data</th></tr></thead><tbody>${data.map(a=>`<tr>
    <td>${new Date(a.occurred_at).toLocaleString()}</td><td>${a.actor_email||'system'}</td><td><b>${a.action}</b></td><td>${a.table_name}</td><td>${a.record_id||'—'}</td><td class="audit-json">${JSON.stringify(a.new_data||{})}</td>
  </tr>`).join('')}</tbody></table>`;
}
function renderAudit(){ if($('#view-audit').classList.contains('active')) loadAudit(); }

async function nextId(table,column,prefix,digits){
  const {data,error}=await sb.from(table).select(column).like(column,`${prefix}%`).order(column,{ascending:false}).limit(1);
  if(error) throw error;
  const last=data?.[0]?.[column];
  const n=last ? parseInt(String(last).split('-').pop(),10)+1 : 1;
  return `${prefix}${String(n).padStart(digits,'0')}`;
}
function requireFiber(){
  if(!state.selectedFiber) throw new Error('Pilih serat terlebih dahulu dari menu Serat.');
  return state.selectedFiber.fiber_id;
}
function formObject(form){
  const fd=new FormData(form), out={};
  for(const [k,v] of fd.entries()) out[k]=v;
  [...form.querySelectorAll('input[type=checkbox]')].forEach(c=>out[c.name]=c.checked);
  return out;
}

$('#authForm').addEventListener('submit',async e=>{
  e.preventDefault(); msg('#authMessage','Masuk...');
  const email=$('#authEmail').value.trim(), password=$('#authPassword').value;
  const {error}=await sb.auth.signInWithPassword({email,password});
  if(error) return msg('#authMessage',error.message,'error');
  authenticate();
});
$('#signupBtn').addEventListener('click',async()=>{
  const email=$('#authEmail').value.trim(), password=$('#authPassword').value;
  if(!email||password.length<6) return msg('#authMessage','Isi email dan password minimal 6 karakter.','error');
  msg('#authMessage','Membuat akun...');
  const {data,error}=await sb.auth.signUp({email,password,options:{emailRedirectTo:location.href}});
  if(error) return msg('#authMessage',error.message,'error');
  if(data.session) authenticate();
  else msg('#authMessage','Akun dibuat. Cek email untuk konfirmasi, lalu kembali dan klik Masuk.','success');
});
$('#signoutBtn').addEventListener('click',async()=>{await sb.auth.signOut();state.user=null;showAuth('Anda telah keluar.');});
$('#refreshBtn').addEventListener('click',async()=>{try{await refreshDashboard()}catch(e){alert(e.message)}});

$$('.nav-btn').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.view)));
$$('[data-goto]').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.goto)));
$('#fiberSearch').addEventListener('input',e=>renderFiberList(e.target.value));

$('#fiberForm').addEventListener('submit',async e=>{
  e.preventDefault(); if(!state.selectedFiber)return;
  const raw=formObject(e.currentTarget);
  const payload={
    canonical_name:raw.canonical_name,english_name:nullable(raw.english_name),scientific_name:nullable(raw.scientific_name),
    family:nullable(raw.family),genus:nullable(raw.genus),species:nullable(raw.species),plant_part:nullable(raw.plant_part),
    fiber_origin_category:nullable(raw.fiber_origin_category),country_region_notes:nullable(raw.country_region_notes),
    commercial_status:nullable(raw.commercial_status),description_short:nullable(raw.description_short)
  };
  if(state.role==='ADMIN'){
    payload.record_status=raw.record_status; payload.publication_status=raw.publication_status; payload.is_public=!!raw.is_public;
  }
  msg('#fiberMessage','Menyimpan...');
  const {data,error}=await sb.from('fibers').update(payload).eq('fiber_id',state.selectedFiber.fiber_id).select().single();
  if(error)return msg('#fiberMessage',error.message,'error');
  msg('#fiberMessage','Perubahan tersimpan.','success');
  await refreshDashboard(); await selectFiber(data.fiber_id);
});

$('#publishBtn').addEventListener('click',async()=>{
  if(!state.selectedFiber||state.role!=='ADMIN')return;
  const makePublic=!state.selectedFiber.is_public;
  const payload=makePublic
    ? {is_public:true,publication_status:'published',record_status:'PUBLISHED'}
    : {is_public:false,publication_status:'candidate',record_status:'VERIFIED'};
  if(!confirm(`${makePublic?'Publish':'Unpublish'} ${state.selectedFiber.canonical_name}?`))return;
  const {error}=await sb.from('fibers').update(payload).eq('fiber_id',state.selectedFiber.fiber_id);
  if(error)return msg('#fiberMessage',error.message,'error');
  await refreshDashboard(); selectFiber(state.selectedFiber.fiber_id);
});

$$('.entry-tab').forEach(b=>b.addEventListener('click',()=>{
  $$('.entry-tab').forEach(x=>x.classList.remove('active')); $$('.entry-pane').forEach(x=>x.classList.remove('active'));
  b.classList.add('active'); $(`#entry-${b.dataset.entry}`).classList.add('active');
}));

$('#referenceForm').addEventListener('submit',async e=>{
  e.preventDefault(); const r=formObject(e.currentTarget); msg('#referenceMessage','Menyimpan...');
  try{
    if(!r.reference_id) r.reference_id=await nextId('references','reference_id','REF-',6);
    const payload=clean({
      reference_id:r.reference_id,reference_type:r.reference_type,authors:nullable(r.authors),year:intOrNull(r.year),title:r.title,
      journal_book:nullable(r.journal_book),doi:nullable(r.doi),url:nullable(r.url),verification_status:r.verification_status||'SCREENED',
      is_public:!!r.is_public,notes:nullable(r.notes)
    });
    const {error}=await sb.from('references').insert(payload); if(error)throw error;
    e.currentTarget.reset(); msg('#referenceMessage',`Tersimpan: ${payload.reference_id}`,'success'); await refreshDashboard();
  }catch(err){msg('#referenceMessage',err.message,'error')}
});

$('#propertyForm').addEventListener('submit',async e=>{
  e.preventDefault(); const r=formObject(e.currentTarget); msg('#propertyMessage','Menyimpan...');
  try{
    const fiber_id=requireFiber(); if(!r.property_data_id) r.property_data_id=await nextId('properties','property_data_id','PROP-',6);
    const payload=clean({
      property_data_id:r.property_data_id,fiber_id,property_category:r.property_category,property_name:r.property_name,
      value:numOrNull(r.value),value_min:numOrNull(r.value_min),value_max:numOrNull(r.value_max),value_sd:numOrNull(r.value_sd),
      n_replicates:intOrNull(r.n_replicates),unit:nullable(r.unit),test_standard:nullable(r.test_standard),test_method:nullable(r.test_method),
      sample_condition:nullable(r.sample_condition),treatment_id:nullable(r.treatment_id),reference_id:nullable(r.reference_id),
      page_table_figure:nullable(r.page_table_figure),evidence_note:nullable(r.evidence_note),record_status:r.record_status||'DRAFT',is_public:!!r.is_public
    });
    const {error}=await sb.from('properties').insert(payload);if(error)throw error;
    e.currentTarget.reset();msg('#propertyMessage',`Tersimpan: ${payload.property_data_id}`,'success');await refreshDashboard();
  }catch(err){msg('#propertyMessage',err.message,'error')}
});

$('#treatmentForm').addEventListener('submit',async e=>{
  e.preventDefault(); const r=formObject(e.currentTarget); msg('#treatmentMessage','Menyimpan...');
  try{
    const fiber_id=requireFiber();if(!r.treatment_id)r.treatment_id=await nextId('treatments','treatment_id','TRT-',6);
    const payload=clean({
      treatment_id:r.treatment_id,fiber_id,treatment_category:nullable(r.treatment_category),agent_method:r.agent_method,
      concentration_value:numOrNull(r.concentration_value),concentration_unit:nullable(r.concentration_unit),solvent:nullable(r.solvent),
      temperature_c:numOrNull(r.temperature_c),time_value:numOrNull(r.time_value),time_unit:nullable(r.time_unit),
      solid_liquid_ratio:nullable(r.solid_liquid_ratio),ph:numOrNull(r.ph),washing:nullable(r.washing),drying_condition:nullable(r.drying_condition),
      purpose:nullable(r.purpose),reference_id:nullable(r.reference_id),record_status:r.record_status||'DRAFT',is_public:!!r.is_public
    });
    const {error}=await sb.from('treatments').insert(payload);if(error)throw error;
    e.currentTarget.reset();msg('#treatmentMessage',`Tersimpan: ${payload.treatment_id}`,'success');await refreshDashboard();
  }catch(err){msg('#treatmentMessage',err.message,'error')}
});

$('#compositeForm').addEventListener('submit',async e=>{
  e.preventDefault();const r=formObject(e.currentTarget);msg('#compositeMessage','Menyimpan...');
  try{
    const fiber_id=requireFiber();if(!r.composite_id)r.composite_id=await nextId('composite_systems','composite_id','CMP-',6);
    const payload=clean({
      composite_id:r.composite_id,fiber_id,matrix_family:nullable(r.matrix_family),matrix_name:r.matrix_name,matrix_grade:nullable(r.matrix_grade),
      fiber_form:nullable(r.fiber_form),fiber_content_value:numOrNull(r.fiber_content_value),fiber_content_unit:nullable(r.fiber_content_unit),
      orientation:nullable(r.orientation),treatment_id:nullable(r.treatment_id),fabrication_method:nullable(r.fabrication_method),
      curing_processing:nullable(r.curing_processing),property_summary:nullable(r.property_summary),application_context:nullable(r.application_context),
      reference_id:nullable(r.reference_id),record_status:r.record_status||'DRAFT',is_public:!!r.is_public
    });
    const {error}=await sb.from('composite_systems').insert(payload);if(error)throw error;
    e.currentTarget.reset();msg('#compositeMessage',`Tersimpan: ${payload.composite_id}`,'success');await refreshDashboard();
  }catch(err){msg('#compositeMessage',err.message,'error')}
});

$('#auditRefreshBtn').addEventListener('click',loadAudit);

sb.auth.onAuthStateChange((event,session)=>{
  if(event==='SIGNED_OUT')showAuth();
  if(event==='SIGNED_IN'&&session&&!state.user)authenticate();
});
authenticate();
