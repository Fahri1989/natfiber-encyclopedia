import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const { supabaseUrl, publishableKey } = window.NATFIBER_CONFIG;
const sb = createClient(supabaseUrl, publishableKey);

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const I18N = window.NF_I18N;
const t = I18N.t, term = I18N.term, prose = I18N.prose;
const state = { dashboard:null, role:null, fibers:[], selectedFiber:null, user:null, review:null, releasePreview:null };

const clean = obj => Object.fromEntries(Object.entries(obj).filter(([,v]) => v !== '' && v !== null && v !== undefined));
const nullable = v => v === '' ? null : v;
const numOrNull = v => v === '' ? null : Number(v);
const intOrNull = v => v === '' ? null : parseInt(v,10);

function msg(id, text='', type=''){
  const el=$(id); el.textContent=text; el.className=`message ${type}`;
}
function statusClass(s=''){ return String(s).toLowerCase().replace(/[^a-z]+/g,''); }
function esc(v=''){
  return String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function fmt(v){
  if(v === null || v === undefined || v === '') return '—';
  const n=Number(v);
  if(!Number.isFinite(n)) return esc(v);
  return new Intl.NumberFormat('en-US',{maximumFractionDigits:4}).format(n);
}

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
    [t('admin.totalFibers'),d.fibers_total||0],[t('admin.published'),d.fibers_published||0],[t('admin.draftPrivate'),d.fibers_draft||0],
    [t('admin.references'),d.references_total||0],[t('admin.properties'),d.properties_total||0],[t('admin.treatments'),d.treatments_total||0],
    [t('admin.composites'),d.composites_total||0],[t('admin.openConflicts'),d.open_conflicts||0],[t('admin.role'),d.role||'—']
  ];
  $('#summaryCards').innerHTML=cards.map(([k,v])=>`<div class="summary-card"><b>${v}</b><span>${k}</span></div>`).join('');
  $('#dashboardFiberList').innerHTML=(state.fibers||[]).slice(0,10).map(f=>`<div class="mini-item"><span><b>${f.fiber_id} · ${f.canonical_name}</b><br><span class="muted">${f.scientific_name||''}</span></span><span class="status ${statusClass(f.publication_status)}">${f.is_public?t('admin.public'):t('admin.private')} · ${term(f.publication_status)}</span></div>`).join('');
  const audit=d.recent_audit||[];
  $('#dashboardAudit').innerHTML=audit.length?audit.slice(0,10).map(a=>`<div class="mini-item"><span><b>${a.action} · ${a.table_name}</b><br><span class="muted">${a.record_id||'—'} · ${new Date(a.occurred_at).toLocaleString()}</span></span></div>`).join(''):`<div class="muted">${t('admin.noChanges')}</div>`;
}

function renderFiberList(filter=''){
  const q=filter.trim().toLowerCase();
  const rows=state.fibers.filter(f=>!q || [f.fiber_id,f.canonical_name,f.english_name,f.scientific_name].some(x=>String(x||'').toLowerCase().includes(q)));
  $('#fiberList').innerHTML=rows.map(f=>`<button class="fiber-row ${state.selectedFiber?.fiber_id===f.fiber_id?'active':''}" data-id="${f.fiber_id}">
    <span><b>${f.fiber_id} · ${f.canonical_name}</b><span>${f.scientific_name||'scientific name pending'}</span></span>
    <span class="status ${statusClass(f.publication_status)}">${f.is_public?t('admin.public'):t('admin.private')}</span>
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
  pub.textContent=f.is_public?t('admin.unpublish'):t('admin.publish');
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
  $('#viewTitle').textContent={dashboard:t('admin.dashboard'),fibers:t('admin.manageFibers'),entry:t('admin.input'),review:t('admin.reviewQueue'),preview:t('admin.releasePreview'),audit:t('admin.auditLog')}[view]||view;
  if(view==='review') loadReviewQueue();
  if(view==='preview') loadReleasePreview();
  if(view==='audit') loadAudit();
}


async function loadReviewQueue(){
  const box=$('#verificationQueue');
  box.innerHTML='<div class="muted">Memuat verification queue…</div>';
  try{
    const [{data:gates,error:gateErr},{data:refs,error:refErr},{data:canon,error:canErr},{data:conflicts,error:confErr}] = await Promise.all([
      sb.from('verification_log').select('*').eq('fiber_id','NF-0002').order('verification_id'),
      sb.from('references').select('reference_id,title,year,journal_book,doi,url,verification_status').gte('reference_id','REF-000019').lte('reference_id','REF-000099'),
      sb.from('canonical_values').select('*').eq('fiber_id','NF-0002').order('display_order'),
      sb.from('conflicts').select('*').eq('fiber_id','NF-0002').order('conflict_id')
    ]);
    if(gateErr) throw gateErr;if(refErr)throw refErr;if(canErr)throw canErr;if(confErr)throw confErr;

    const refMap=Object.fromEntries((refs||[]).map(r=>[r.reference_id,r]));
    state.review={gates:gates||[],refs:refs||[],canon:canon||[],conflicts:conflicts||[]};

    const signed=state.review.gates.filter(g=>g.decision==='EDITOR_SIGNED_OFF').length;
    const ready=state.review.gates.filter(g=>g.decision==='READY_FOR_EDITOR_SIGNOFF').length;
    const quarantined=state.review.gates.filter(g=>g.decision!=='READY_FOR_EDITOR_SIGNOFF' && g.decision!=='EDITOR_SIGNED_OFF').length;
    const reviewedCanon=state.review.canon.filter(c=>c.status==='REVIEWED_CANDIDATE').length;
    $('#reviewSummary').innerHTML=[
      [t('admin.verificationGates'),state.review.gates.length],
      [t('admin.editorSigned'),signed],
      [t('admin.readySign'),ready],
      [t('admin.quarantined'),quarantined],
      [t('admin.canonicalCandidates'),reviewedCanon]
    ].map(([k,v])=>`<div class="summary-card"><b>${v}</b><span>${k}</span></div>`).join('');

    const candidateBtn=$('#markCandidateBtn');
    const currentFiber=state.fibers.find(f=>f.fiber_id==='NF-0002');
    const alreadyCandidate=currentFiber?.publication_status==='candidate';
    const candidateEligible=state.role==='ADMIN' && ready===0 && signed>0 && !alreadyCandidate;
    candidateBtn.disabled=!candidateEligible;
    candidateBtn.textContent=alreadyCandidate?t('admin.candidate'):t('admin.markCandidate');
    $('#candidateReadiness').innerHTML = alreadyCandidate
      ? '<strong>NF-0002 is a PUBLISHABLE CANDIDATE.</strong> It remains PRIVATE until a separate ADMIN publish decision.'
      : ready>0
        ? `<strong>Candidate gate belum selesai.</strong> ${ready} item terverifikasi masih membutuhkan human editor sign-off. ${quarantined} item pending/non-core tetap dikarantina.`
        : signed>0
          ? `<strong>Core human sign-off selesai.</strong> ${quarantined} item pending/non-core tetap dikarantina. ADMIN dapat menandai NF-0002 sebagai Publishable Candidate tanpa mempublikasikannya.`
          : '<strong>Belum ada human sign-off.</strong> Tinjau gate yang berstatus READY_FOR_EDITOR_SIGNOFF.';

    box.innerHTML=state.review.gates.map(g=>{
      const r=refMap[g.reference_id]||{};
      const signedOff=g.decision==='EDITOR_SIGNED_OFF';
      const sourceUrl=r.url|| (r.doi?`https://doi.org/${r.doi}`:'');
      const pendingTable=String(g.value_match||'').includes('PENDING');
      return `<article class="review-item ${signedOff?'signed':''}">
        <div class="review-item-head">
          <div>
            <div class="review-code">${g.verification_id} · ${g.reference_id||''}</div>
            <h4>${esc(r.title||g.field_or_property||g.record_id)}</h4>
            <div class="review-meta">${esc(r.year||'')} · ${esc(r.journal_book||'')} · ${esc(r.verification_status||'')}</div>
          </div>
          <span class="review-decision ${signedOff?'signed':g.decision==='READY_FOR_EDITOR_SIGNOFF'?'ready':'pending'}">${signedOff?'EDITOR SIGNED':esc(g.decision||'PENDING')}</span>
        </div>

        <div class="review-grid">
          <div><b>Scope</b><span>${esc(g.field_or_property||'—')}</span></div>
          <div><b>Reported</b><span>${esc(g.reported_value||'—')} ${esc(g.unit||'')}</span></div>
          <div><b>Value match</b><span class="${pendingTable?'pending-text':''}">${esc(g.value_match||'—')}</span></div>
          <div><b>Method checked</b><span>${esc(g.method_condition_checked||'—')}</span></div>
        </div>

        <p class="review-note">${esc(g.decision_note||'')}</p>

        <div class="review-actions">
          ${sourceUrl?`<a class="btn secondary compact source-btn" href="${esc(sourceUrl)}" target="_blank" rel="noopener">${t('admin.openSource')}</a>`:''}
          ${!signedOff && state.role==='ADMIN' && g.decision==='READY_FOR_EDITOR_SIGNOFF' ? `<button class="btn primary compact signoff-btn" data-verification="${esc(g.verification_id)}">${t('admin.editorSignoff')}</button>` : ''}
          ${!signedOff && g.decision!=='READY_FOR_EDITOR_SIGNOFF' ? `<span class="gate-quarantine">${esc(g.decision||'PENDING')}</span>` : ''}
        </div>
      </article>`;
    }).join('') || '<div class="muted">Belum ada verification gate.</div>';

    box.querySelectorAll('.signoff-btn').forEach(btn=>btn.addEventListener('click',()=>editorSignoff(btn.dataset.verification)));

    renderCanonicalReview();
    renderConflictReview();
  }catch(err){
    box.innerHTML=`<div class="message error">${esc(err.message)}</div>`;
  }
}

async function editorSignoff(id){
  const gate=state.review?.gates?.find(g=>g.verification_id===id);
  if(!gate)return;

  const extra = String(gate.value_match||'').includes('PENDING')
    ? '\n\nCATATAN: Item ini masih berlabel PENDING_TABLE_SIGNOFF. Lanjutkan hanya jika Anda sudah memeriksa tabel/PDF sumber secara langsung.'
    : '';

  const ok=confirm(
    `Editor sign-off ${id}?\n\nSaya menyatakan telah memeriksa sumber, nilai/unit/konteks yang relevan.${extra}\n\nSign-off tidak mempublikasikan data.`
  );
  if(!ok)return;

  const stamp=new Date().toISOString();
  const oldNote=gate.decision_note||'';
  const newNote=`${oldNote} | EDITOR SIGN-OFF by ${state.user.email} at ${stamp}.`;
  const {error}=await sb.from('verification_log').update({
    verifier:state.user.email,
    decision:'EDITOR_SIGNED_OFF',
    verification_date:stamp,
    decision_note:newNote
  }).eq('verification_id',id);
  if(error){alert(error.message);return;}
  await loadReviewQueue();
}

function renderCanonicalReview(){
  const rows=state.review?.canon||[];
  $('#canonicalQueue').innerHTML=`<table class="data-table"><thead><tr>
    <th>Field</th><th>Candidate</th><th>Evidence</th><th>Gate</th><th>Status</th><th>Method warning</th>
  </tr></thead><tbody>${rows.map(c=>`<tr>
    <td><strong>${esc(c.display_field)}</strong></td>
    <td>${fmt(c.min_value)}${Number(c.min_value)!==Number(c.max_value)?`–${fmt(c.max_value)}`:''} ${esc(c.unit||'')}</td>
    <td>${esc(c.confidence||'')}</td><td>${esc(c.verification_gate||'')}</td>
    <td><span class="status ${statusClass(c.status)}">${esc(c.status||'')}</span></td>
    <td>${esc(c.method_condition_warning||'—')}</td>
  </tr>`).join('')}</tbody></table>`;
}

function renderConflictReview(){
  const rows=state.review?.conflicts||[];
  $('#conflictQueue').innerHTML=rows.map(c=>`<article class="review-item conflict-review">
    <div class="review-item-head"><div><div class="review-code">${esc(c.conflict_id)}</div><h4>${esc(c.affected_data||c.issue_type)}</h4></div>
    <span class="review-decision monitor">${esc(c.status)}</span></div>
    <p>${esc(c.issue_summary||'')}</p>
    <div class="review-grid">
      <div><b>Decision</b><span>${esc(c.current_decision||'—')}</span></div>
      <div><b>Aggregation</b><span>${esc(c.canonical_aggregation||'—')}</span></div>
    </div>
  </article>`).join('');
}



const releaseSectionLabels = {
  identity:'1. Identity & Taxonomy',
  canonical:'2. Engineering Summary / Canonical Candidates',
  chemistry:'3. Source-Resolved Chemical Composition',
  morphology:'4. Morphology',
  properties:'5. Method-Qualified Physical / Mechanical / Thermal Properties',
  treatments:'6. Surface Treatments',
  composites:'7. Composite Systems',
  processing:'8. Processing Routes',
  applications:'9. Engineering Applications',
  conflicts:'10. Methodological Warnings & Conflicts',
  evidence:'11. Evidence Assessment',
  research_gaps:'12. Research Gaps',
  references:'13. References'
};

function releaseValue(r){
  if(!r) return '—';
  if(r.value !== null && r.value !== undefined){
    const sd=(r.value_sd!==null && r.value_sd!==undefined)?` ± ${fmt(r.value_sd)}`:'';
    return `${fmt(r.value)}${sd}${r.unit?` ${esc(r.unit)}`:''}`;
  }
  if(r.min_value !== null && r.min_value !== undefined){
    const same=Number(r.min_value)===Number(r.max_value);
    return `${fmt(r.min_value)}${!same?`–${fmt(r.max_value)}`:''}${r.unit?` ${esc(r.unit)}`:''}`;
  }
  return '—';
}

function releaseItemHtml(item){
  const r=item.record||{};
  const table=item.data_table;
  let title=item.public_label||item.record_id;
  let value='';
  let meta='';
  let body='';

  if(table==='fibers'){
    title=`${r.fiber_id||''} · ${r.canonical_name||'Sisal'}`;
    value=esc(r.scientific_name||'');
    meta=`${esc(r.family||'')} · ${esc(r.plant_part||'')}`;
    body=esc(r.description_short||'');
  }else if(table==='taxonomy'){
    title='Accepted taxonomy';
    value=`${esc(r.genus||'')} ${esc(r.species||'')} ${esc(r.taxon_authority||'')}`;
    meta=`${esc(r.kingdom||'')} · ${esc(r.order_name||'')} · ${esc(r.family||'')}`;
  }else if(table==='fiber_names'){
    title=esc(r.name||item.public_label||item.record_id);
    value=esc(r.name_type||'Name');
    meta=`${esc(r.language||'')}${r.is_preferred?' · Preferred':''}`;
    body=r.name_type==='Botanical synonym'?'Botanical synonym retained for taxonomy traceability; not the accepted scientific name.':'';
  }else if(table==='canonical_values'){
    title=esc(r.display_field||item.record_id);
    value=releaseValue(r);
    meta=`Evidence: ${esc(r.confidence||'—')} · Gate: ${esc(r.verification_gate||'—')}`;
    body=`${esc(r.recommended_public_wording||'')}${r.method_condition_warning?`<div class="release-warning">${esc(r.method_condition_warning)}</div>`:''}`;
  }else if(table==='chemical_composition'){
    title=esc(r.component||item.record_id);
    value=releaseValue(r);
    meta=`${esc(r.sample_condition||'Source-specific sample')} · ${esc(r.reference_id||'')}`;
    body=esc(r.evidence_note||'');
  }else if(table==='morphology'){
    title=esc(r.parameter||item.record_id);
    value=releaseValue(r);
    meta=`${esc(r.sample_condition||'')} · ${esc(r.test_method||'')}`;
    body=esc(r.evidence_note||'');
  }else if(table==='properties'){
    title=`${esc(r.property_category||'Property')} · ${esc(r.property_name||item.record_id)}`;
    value=releaseValue(r);
    const gl=(r.gauge_length!==null && r.gauge_length!==undefined)?` · GL ${fmt(r.gauge_length)} mm`:'';
    meta=`${esc(r.test_standard||r.test_method||'Method as reported')}${gl} · ${esc(r.reference_id||'')}`;
    body=`${esc(r.sample_condition||'')}${r.evidence_note?`<div class="release-subnote">${esc(r.evidence_note)}</div>`:''}`;
  }else if(table==='treatments'){
    title=esc(r.agent_method||item.record_id);
    const conc=(r.concentration_value!==null && r.concentration_value!==undefined)?`${fmt(r.concentration_value)} ${esc(r.concentration_unit||'')}`:'';
    const time=(r.time_value!==null && r.time_value!==undefined)?`${fmt(r.time_value)} ${esc(r.time_unit||'')}`:'';
    value=[conc,time].filter(Boolean).join(' · ')||'Recipe verified';
    meta=esc(r.purpose||'Treatment condition');
    body=[r.washing&&`Wash: ${r.washing}`,r.drying_condition&&`Drying: ${r.drying_condition}`,r.evidence_note].filter(Boolean).map(esc).join('<br>');
  }else if(table==='composite_systems'){
    title=`${esc(r.matrix_name||'Composite')} · ${esc(r.matrix_family||'')}`;
    value=r.fiber_content_value!==null && r.fiber_content_value!==undefined?`${fmt(r.fiber_content_value)} ${esc(r.fiber_content_unit||'')}`:'Source-level system';
    meta=`${esc(r.fabrication_method||'Process as reported')} · ${esc(r.reference_id||'')}`;
    body=esc(r.property_summary||'');
  }else if(table==='processing'){
    title=esc(r.process_name||item.record_id);
    value=esc(r.process_category||'Processing');
    meta=esc(r.reference_id||'');
    body=esc(r.notes||'');
  }else if(table==='applications'){
    title=esc(r.application_name||item.record_id);
    value=esc(r.maturity_level||'');
    meta=esc(r.application_sector||'');
    body=esc(r.evidence_summary||'');
  }else if(table==='conflicts'){
    title=esc(r.affected_data||r.issue_type||item.record_id);
    value=esc(r.canonical_aggregation||'METHOD WARNING');
    meta=`Risk: ${esc(r.risk||'—')} · Status: ${esc(r.status||'—')}`;
    body=`${esc(r.current_decision||r.issue_summary||'')}<div class="release-warning">${esc(r.required_action||'')}</div>`;
  }else if(table==='evidence_map'){
    title=esc(r.domain||item.record_id);
    value=esc(r.evidence_level||'');
    meta=`Coverage ${fmt(r.coverage_pct||0)}% · ${fmt(r.primary_sources||0)} primary source(s)`;
    body=`${esc(r.main_strength||'')}<div class="release-subnote">Gap: ${esc(r.main_gap||'—')}</div>`;
  }else if(table==='research_gaps'){
    title=`Priority ${esc(r.priority||'—')} · ${esc(r.gap||item.record_id)}`;
    value=esc(r.status||'OPEN');
    meta=esc(r.application_relevance||'');
    body=`${esc(r.why_it_matters||'')}<div class="release-subnote">${esc(r.recommended_study||'')}</div>`;
  }else if(table==='references'){
    title=esc(r.title||item.record_id);
    value=esc(r.year||'');
    meta=`${esc(r.journal_book||r.publisher||'')} · ${esc(r.verification_status||'')}`;
    const doi=r.doi?`DOI: ${esc(r.doi)}`:'';
    body=doi;
  }

  return `<div class="release-item ${table}">
    <div class="release-item-top">
      <div>
        <div class="release-record-id">${esc(item.record_id)}</div>
        <h4>${title}</h4>
      </div>
      <span class="release-state ${String(item.editor_status||'selected').toLowerCase()}">${esc(item.editor_status||'SELECTED')}</span>
    </div>
    ${value?`<div class="release-value">${value}</div>`:''}
    ${meta?`<div class="release-meta">${meta}</div>`:''}
    ${body?`<div class="release-body">${body}</div>`:''}
    ${item.release_note?`<div class="release-warning">${esc(item.release_note)}</div>`:''}
  </div>`;
}

async function loadReleasePreview(){
  const body=$('#releasePreviewBody');
  body.innerHTML='<div class="muted">Memuat curated release preview…</div>';
  try{
    const d=await rpc('get_natfiber_release_preview',{target_fiber_id:'NF-0002'});
    if(!d) throw new Error('Release preview tidak tersedia untuk akun ini.');
    state.releasePreview=d;
    const items=d.items||[];
    const s=d.summary||{};
    const f=d.fiber||{};
    const sectionCounts={};
    items.forEach(i=>sectionCounts[i.section_key]=(sectionCounts[i.section_key]||0)+1);

    $('#releaseSummary').innerHTML=[
      [t('admin.releaseSelected'),s.selected_items||0],
      [t('admin.releaseApproved'),s.approved_items||0],
      [t('admin.onHold'),s.hold_items||0],
      [t('admin.sections'),Object.keys(sectionCounts).length],
      [t('admin.fiberStatus'),term(f.publication_status||'—')]
    ].map(([k,v])=>`<div class="summary-card"><b>${esc(v)}</b><span>${esc(k)}</span></div>`).join('');

    const allApproved=(s.selected_items||0)>0 && Number(s.approved_items||0)===Number(s.selected_items||0);
    const isCandidate=f.publication_status==='candidate' && !f.is_public;
    const isPublished=f.publication_status==='published' && f.is_public;
    const approveBtn=$('#approveReleaseBtn');
    const publishBtn=$('#finalPublishBtn');
    approveBtn.textContent=t('admin.approveRelease');
    approveBtn.disabled=!(state.role==='ADMIN' && isCandidate && !allApproved);
    publishBtn.disabled=!(state.role==='ADMIN' && isCandidate && allApproved);
    if(isPublished){ approveBtn.disabled=true; publishBtn.disabled=true; publishBtn.textContent='Published ✓'; }
    else publishBtn.textContent=t('admin.finalPublish');

    $('#releaseStatusNote').innerHTML=isPublished
      ? '<strong>NF-0002 sudah PUBLISHED.</strong> Release Manifest menjadi jejak kurasi untuk record yang dibuka.'
      : allApproved
        ? '<strong>Release Set APPROVED.</strong> Semua item terpilih sudah lolos release-set approval. Final Publish akan membuka hanya item pada manifest ini secara atomik.'
        : `<strong>PREVIEW ONLY — PRIVATE.</strong> ${fmt(s.selected_items||0)} curated item(s) dipilih. Tidak ada record scientific Sisal yang dibuka ke publik pada tahap preview ini.`;

    const groups={};
    items.forEach(i=>(groups[i.section_key]??=[]).push(i));
    body.innerHTML=Object.entries(releaseSectionLabels).map(([key,label])=>{
      const rows=groups[key]||[];
      if(!rows.length) return '';
      const open=['identity','canonical','conflicts'].includes(key)?' open':'';
      return `<details class="release-section"${open}>
        <summary><span>${esc(label)}</span><b>${rows.length}</b></summary>
        <div class="release-section-body">${rows.map(releaseItemHtml).join('')}</div>
      </details>`;
    }).join('');
  }catch(err){
    body.innerHTML=`<div class="message error">${esc(err.message)}</div>`;
  }
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
  
I18N.onChange(() => {
  I18N.apply();
  if(state.dashboard){ renderDashboard(); renderFiberList($('#fiberSearch')?.value||''); }
  const active=document.querySelector('.view.active')?.id;
  if(active==='view-review') loadReviewQueue();
  if(active==='view-preview') loadReleasePreview();
  if(active==='view-audit') loadAudit();
  const currentView = active?.replace('view-','') || 'dashboard';
  $('#viewTitle').textContent={dashboard:t('admin.dashboard'),fibers:t('admin.manageFibers'),entry:t('admin.input'),review:t('admin.reviewQueue'),preview:t('admin.releasePreview'),audit:t('admin.auditLog')}[currentView]||currentView;
});

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


$$('.review-tab').forEach(b=>b.addEventListener('click',()=>{
  $$('.review-tab').forEach(x=>x.classList.remove('active'));
  $$('.review-pane').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
  $(`#review-${b.dataset.reviewTab}`).classList.add('active');
}));
$('#reviewRefreshBtn')?.addEventListener('click',loadReviewQueue);

$('#releaseRefreshBtn')?.addEventListener('click',loadReleasePreview);

$('#approveReleaseBtn')?.addEventListener('click',async()=>{
  if(state.role!=='ADMIN') return;
  const ok=confirm(
    'Approve seluruh curated Release Set NF-0002 Sisal?\n\n' +
    'Ini BELUM mempublikasikan Sisal. Approval hanya mengunci bahwa item-item di Release Manifest telah disetujui untuk final release check.'
  );
  if(!ok)return;
  try{
    await rpc('approve_natfiber_release',{target_fiber_id:'NF-0002'});
    await loadReleasePreview();
  }catch(err){alert(err.message)}
});

$('#finalPublishBtn')?.addEventListener('click',async()=>{
  if(state.role!=='ADMIN') return;
  const ok=confirm(
    'FINAL PUBLISH NF-0002 SISAL?\n\n' +
    'Tindakan ini akan membuka fiber dan HANYA record yang ada di Release Manifest kepada publik. ' +
    'Record quarantined/pending tetap private.\n\nLanjutkan hanya setelah preview final sudah diperiksa.'
  );
  if(!ok)return;
  try{
    const result=await rpc('publish_natfiber_release',{target_fiber_id:'NF-0002'});
    alert(`NF-0002 published. Curated release items: ${result.published_items}`);
    await refreshDashboard();
    await loadReleasePreview();
  }catch(err){alert(err.message)}
});



$('#markCandidateBtn')?.addEventListener('click',async()=>{
  if(state.role!=='ADMIN') return;
  const ready=(state.review?.gates||[]).filter(g=>g.decision==='READY_FOR_EDITOR_SIGNOFF').length;
  if(ready>0){alert(`${ready} verification gate masih membutuhkan Editor sign-off.`);return;}
  const ok=confirm('Tandai NF-0002 Sisal sebagai PUBLISHABLE CANDIDATE?\n\nIni TIDAK mempublikasikan Sisal. is_public tetap false dan publikasi tetap keputusan ADMIN terpisah.');
  if(!ok)return;
  const {error}=await sb.from('fibers').update({publication_status:'candidate',record_status:'REVIEWED'}).eq('fiber_id','NF-0002');
  if(error){alert(error.message);return;}
  await refreshDashboard();
  await loadReviewQueue();
});


$('#auditRefreshBtn').addEventListener('click',loadAudit);

sb.auth.onAuthStateChange((event,session)=>{
  if(event==='SIGNED_OUT')showAuth();
  if(event==='SIGNED_IN'&&session&&!state.user)authenticate();
});
authenticate();
