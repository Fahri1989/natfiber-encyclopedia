const { supabaseUrl, publishableKey } = window.NATFIBER_CONFIG;
const headers = { apikey: publishableKey, 'Content-Type': 'application/json' };
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

async function rpc(name, body) {
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
    method: 'POST', headers, body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}
const rpcSearch = (term) => rpc('search_natfiber', { search_term: term });
const rpcProfile = (fiberId) => rpc('get_natfiber_profile', { target_fiber_id: fiberId });
const rpcDirectory = () => rpc('get_natfiber_directory', {});

const esc = (v='') => String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const fmt = (n) => Number.isFinite(Number(n)) ? Number(n).toLocaleString(undefined,{maximumFractionDigits:4}) : '—';
const range = (r) => Number(r.min_value) === Number(r.max_value) ? fmt(r.min_value) : `${fmt(r.min_value)}–${fmt(r.max_value)}`;
const valRange = (r) => {
  if (r.value != null) return fmt(r.value);
  if (r.value_min != null || r.value_max != null) return `${fmt(r.value_min)}–${fmt(r.value_max)}`;
  return '—';
};

function renderFiber(f, names, tax) {
  $('#fiberId').textContent = f.fiber_id;
  $('#fiberName').textContent = f.canonical_name;
  $('#scientificName').textContent = f.scientific_name || 'Scientific name pending';
  $('#fiberDescription').textContent = f.description_short || '';
  $('#nameChips').innerHTML = names.map(n => `<span class="chip">${esc(n.name)} · ${esc(n.name_type||'name')}</span>`).join('');
  const fields = [
    ['Family',tax?.family||f.family],['Order',tax?.order_name],['Plant part',f.plant_part],['Origin category',f.fiber_origin_category],
    ['Region',f.country_region_notes],['Use status',f.commercial_status]
  ].filter(x=>x[1]);
  $('#identityGrid').innerHTML = fields.map(([k,v])=>`<div class="identity"><b>${esc(k)}</b><span>${esc(v)}</span></div>`).join('');
}
function renderSummary(p) {
  const items = [
    ['Canonical values', p.canonical_values.length],
    ['Chemical records', p.chemical_composition.length],
    ['Morphology records', p.morphology.length],
    ['Property observations', p.properties.length],
    ['Treatments', p.treatments.length],
    ['Composite systems', p.composites.length],
    ['Evidence domains', p.evidence.length],
    ['Public references', p.references.length]
  ];
  $('#datasetSummary').innerHTML = items.map(([k,v])=>`<div class="summary-item"><strong>${esc(v)}</strong><span>${esc(k)}</span></div>`).join('');
}
function renderCanonical(rows) {
  $('#canonicalGrid').innerHTML = rows.slice(0,8).map(r=>`<article class="metric">
    <div class="metric-label">${esc(r.display_field)}</div><div class="metric-value">${range(r)}</div>
    <div class="metric-unit">${esc(r.unit||'')}</div><span class="confidence ${esc(r.confidence||'')}">${esc(r.confidence||'EVIDENCE')}</span>
  </article>`).join('');
  $('#propertyTable').innerHTML = `<table class="data-table"><thead><tr><th>Property</th><th>Verified range</th><th>Evidence</th><th>Public wording</th><th>Method / condition warning</th></tr></thead><tbody>${rows.map(r=>`<tr>
    <td><strong>${esc(r.display_field)}</strong></td><td>${range(r)} ${esc(r.unit||'')}</td><td>${esc(r.confidence||'')}</td>
    <td>${esc(r.recommended_public_wording||'')}</td><td class="${r.method_condition_warning?'warn':''}">${esc(r.method_condition_warning||'—')}</td>
  </tr>`).join('')}</tbody></table>`;
}
function renderChemistry(rows) {
  $('#chemistryTable').innerHTML = `<table class="data-table"><thead><tr><th>Component</th><th>Value</th><th>Unit</th><th>Method</th><th>Sample condition</th><th>Source</th></tr></thead><tbody>${rows.map(r=>`<tr>
    <td><strong>${esc(r.component)}</strong></td><td>${valRange(r)}</td><td>${esc(r.unit||'')}</td><td>${esc(r.analysis_method||'—')}</td>
    <td>${esc(r.sample_condition||'—')}</td><td>${esc(r.reference_id||'—')}</td>
  </tr>`).join('')}</tbody></table>`;
}
function renderMorphology(rows) {
  $('#morphologyTable').innerHTML = `<table class="data-table"><thead><tr><th>Parameter</th><th>Value / range</th><th>Unit</th><th>Method</th><th>Source location</th><th>Reference</th></tr></thead><tbody>${rows.map(r=>`<tr>
    <td><strong>${esc(r.parameter)}</strong></td><td>${valRange(r)}${r.value_min!=null||r.value_max!=null?` <span class="muted">(range ${fmt(r.value_min)}–${fmt(r.value_max)})</span>`:''}</td>
    <td>${esc(r.unit||'')}</td><td>${esc(r.test_method||'—')}</td><td>${esc(r.source_location||'—')}</td><td>${esc(r.reference_id||'—')}</td>
  </tr>`).join('')}</tbody></table>`;
}
function renderObservations(rows) {
  $('#observationTable').innerHTML = `<table class="data-table observations"><thead><tr><th>Category</th><th>Property</th><th>Value</th><th>SD</th><th>n</th><th>Standard / method</th><th>Condition</th><th>Treatment</th><th>Reference</th></tr></thead><tbody>${rows.map(r=>`<tr>
    <td>${esc(r.property_category)}</td><td><strong>${esc(r.property_name)}</strong></td><td>${valRange(r)} ${esc(r.unit||'')}</td><td>${fmt(r.value_sd)}</td><td>${r.n_replicates??'—'}</td>
    <td>${esc(r.test_standard||'')}${r.test_standard&&r.test_method?' · ':''}${esc(r.test_method||'—')}</td><td>${esc(r.sample_condition||'—')}</td><td>${esc(r.treatment_id||'Untreated / none')}</td><td>${esc(r.reference_id||'—')}</td>
  </tr>`).join('')}</tbody></table>`;
}
function renderTreatments(rows) {
  $('#treatmentGrid').innerHTML = rows.map(r=>`<article class="record"><div class="record-top"><div><div class="record-id">${esc(r.treatment_id)}</div><h4>${esc(r.agent_method)}</h4></div><span class="confidence">${esc(r.treatment_category||'Treatment')}</span></div>
    <div class="kv"><b>Concentration</b><span>${r.concentration_value??'—'} ${esc(r.concentration_unit||'')}</span><b>Temperature</b><span>${r.temperature_c??'—'} ${r.temperature_c!=null?'°C':''}</span><b>Duration</b><span>${r.time_value??'—'} ${esc(r.time_unit||'')}</span><b>Solvent</b><span>${esc(r.solvent||'—')}</span><b>Washing</b><span>${esc(r.washing||'—')}</span><b>Drying</b><span>${esc(r.drying_condition||'—')}</span></div>
    <div class="record-summary">${esc(r.purpose||r.evidence_note||'')}</div></article>`).join('') || '<div class="state-card">No public treatment records yet.</div>';
}
function renderComposites(rows) {
  $('#compositeGrid').innerHTML = rows.map(r=>`<article class="record"><div class="record-top"><div><div class="record-id">${esc(r.composite_id)}</div><h4>${esc(r.matrix_name)}</h4></div><span class="confidence">${esc(r.matrix_family||'Matrix')}</span></div>
    <div class="kv"><b>Fiber form</b><span>${esc(r.fiber_form||'—')}</span><b>Fiber content</b><span>${r.fiber_content_value??'—'} ${esc(r.fiber_content_unit||'')}</span><b>Orientation</b><span>${esc(r.orientation||'—')}</span><b>Fabrication</b><span>${esc(r.fabrication_method||'—')}</span><b>Application</b><span>${esc(r.application_context||'—')}</span></div>
    <div class="record-summary">${esc(r.property_summary||'')}</div></article>`).join('') || '<div class="state-card">No public composite records yet.</div>';
}
function renderEvidence(rows, conflicts) {
  $('#evidenceGrid').innerHTML = rows.map(r=>`<article class="evidence-card"><div class="evidence-row"><div class="evidence-title">${esc(r.domain)}</div><span class="evidence-level">${esc(r.evidence_level)}</span></div><div class="bar"><span style="width:${Math.max(0,Math.min(100,Number(r.coverage_pct)||0))}%"></span></div><div class="evidence-notes"><strong>${fmt(r.coverage_pct)}% coverage.</strong> ${esc(r.main_strength||'')}<br><br><em>Gap:</em> ${esc(r.main_gap||'—')}</div></article>`).join('');
  $('#conflictBox').innerHTML = conflicts.length ? `<div class="section-title"><div><span>TRANSPARENCY</span><h3>Source conflicts and editorial decisions</h3></div></div>${conflicts.map(c=>`<article class="conflict"><strong>${esc(c.issue_type)} · ${esc(c.affected_data||'')}</strong><p>${esc(c.issue_summary)} <b>Decision:</b> ${esc(c.current_decision||'')}</p></article>`).join('')}` : '';
}
function renderReferences(rows) {
  $('#referenceList').innerHTML = rows.map(r=>`<article class="reference"><div class="reference-meta">${esc(r.reference_id)} · ${esc(r.year||'')} · ${esc(r.journal_book||'')}</div><h4>${esc(r.title)}</h4><p>${esc(r.authors||'')}</p>${r.url?`<a href="${esc(r.url)}" target="_blank" rel="noopener">Open source ↗</a>`:''}</article>`).join('');
}

let directoryRows = [];

function statusLabel(status){
  return status === 'AVAILABLE' ? 'Available'
       : status === 'RESEARCH' ? 'Research in progress'
       : 'Coming soon';
}

function renderDirectory(rows = directoryRows){
  const q = ($('#directoryFilter')?.value || '').trim().toLowerCase();
  const filtered = rows.filter(r => !q || [
    r.fiber_id, r.canonical_name, r.english_name, r.scientific_name,
    r.fiber_origin_category, r.plant_part
  ].some(v => String(v || '').toLowerCase().includes(q)));

  const box = $('#fiberDirectory');
  box.innerHTML = filtered.map(r => {
    const clickable = r.roadmap_status === 'AVAILABLE';
    const cls = r.roadmap_status.toLowerCase();
    return `<article class="directory-card ${cls} ${clickable ? 'clickable' : ''}" data-status="${esc(r.roadmap_status)}" ${clickable ? `data-directory-fiber="${esc(r.fiber_id)}"` : ''}>
      <div class="directory-card-top">
        <span class="directory-id">${esc(r.fiber_id)}</span>
        <span class="directory-status ${cls}">${esc(statusLabel(r.roadmap_status))}</span>
      </div>
      <h4>${esc(r.canonical_name)}</h4>
      <p class="directory-scientific">${esc(r.scientific_name || 'Taxonomy pending')}</p>
      <div class="directory-meta">${esc(r.fiber_origin_category || 'Natural fiber')} · ${esc(r.plant_part || 'Plant part pending')}</div>
      ${clickable ? '<div class="directory-action">Open scientific profile →</div>' :
        r.roadmap_status === 'RESEARCH' ? '<div class="directory-action muted-action">Evidence mapping underway</div>' :
        '<div class="directory-action muted-action">Queued for evidence review</div>'}
    </article>`;
  }).join('') || '<div class="state-card">No fibers match this filter.</div>';

  box.querySelectorAll('[data-directory-fiber]').forEach(card => card.addEventListener('click', async () => {
    await loadFiber(card.dataset.directoryFiber);
    document.querySelector('#fiberProfile').scrollIntoView({behavior:'smooth'});
  }));

  box.querySelectorAll('.directory-card.research').forEach(card => card.addEventListener('click', () => {
    const name = card.querySelector('h4')?.textContent || 'This fiber';
    const sci = card.querySelector('.directory-scientific')?.textContent || '';
    const notice = document.createElement('div');
    notice.className = 'research-toast';
    notice.innerHTML = `<strong>${esc(name)}</strong>${sci ? ` · <em>${esc(sci)}</em>` : ''}<br>Deep Research and source verification are in progress. Draft technical data remain private until publication criteria are met.`;
    document.body.appendChild(notice);
    setTimeout(() => notice.classList.add('show'), 20);
    setTimeout(() => { notice.classList.remove('show'); setTimeout(() => notice.remove(), 250); }, 4200);
  }));
}

async function loadDirectory(){
  try{
    directoryRows = await rpcDirectory();
    const available = directoryRows.filter(r => r.roadmap_status === 'AVAILABLE').length;
    const research = directoryRows.filter(r => r.roadmap_status === 'RESEARCH').length;
    const queued = directoryRows.filter(r => r.roadmap_status === 'QUEUED').length;
    $('#directoryStats').innerHTML = [
      ['Roadmap fibers', directoryRows.length],
      ['Available', available],
      ['In research', research],
      ['Queued', queued]
    ].map(([k,v]) => `<div class="directory-stat"><strong>${esc(v)}</strong><span>${esc(k)}</span></div>`).join('');
    renderDirectory();
  }catch(err){
    $('#fiberDirectory').innerHTML = `<div class="state-card error">Could not load directory: ${esc(err.message)}</div>`;
  }
}

async function loadFiber(fiberId='NF-0001') {
  $('#loading').hidden=false; $('#error').hidden=true; $('#fiberProfile').hidden=true;
  try {
    const p = await rpcProfile(fiberId);
    if (!p?.fiber) throw new Error(`Published fiber ${fiberId} not found.`);
    renderFiber(p.fiber,p.names||[],p.taxonomy);
    renderSummary(p);
    renderCanonical(p.canonical_values||[]);
    renderChemistry(p.chemical_composition||[]);
    renderMorphology(p.morphology||[]);
    renderObservations(p.properties||[]);
    renderTreatments(p.treatments||[]);
    renderComposites(p.composites||[]);
    renderEvidence(p.evidence||[],p.conflicts||[]);
    renderReferences(p.references||[]);
    $('#fiberProfile').hidden=false;
  } catch(err) { $('#error').textContent=`Could not load NatFiber data: ${err.message}`; $('#error').hidden=false; }
  finally { $('#loading').hidden=true; }
}

$$('.tab').forEach(btn=>btn.addEventListener('click',()=>{
  $$('.tab').forEach(x=>x.classList.remove('active')); $$('.tabpanel').forEach(x=>x.classList.remove('active'));
  btn.classList.add('active'); $(`#tab-${btn.dataset.tab}`).classList.add('active');
}));
$('#searchForm').addEventListener('submit',async e=>{
  e.preventDefault(); const q=$('#searchInput').value.trim(); if(!q) return;
  const box=$('#searchResults'); box.hidden=false; box.innerHTML='<div class="search-item">Searching…</div>';
  try{
    const rows=await rpcSearch(q); box.innerHTML=rows.length?rows.map(r=>`<div class="search-item" data-fiber="${esc(r.fiber_id)}"><div><div class="search-type">${esc(r.entity_type)}</div><div class="search-title">${esc(r.title)}</div></div><div class="search-sub">${esc(r.subtitle||'')}</div></div>`).join(''):'<div class="search-item">No public matches yet.</div>';
    box.querySelectorAll('[data-fiber]').forEach(el=>el.addEventListener('click',()=>{loadFiber(el.dataset.fiber);box.hidden=true;document.querySelector('#fiberProfile').scrollIntoView({behavior:'smooth'});}));
  }catch(err){box.innerHTML=`<div class="search-item">Search error: ${esc(err.message)}</div>`}
});

document.addEventListener('click',e=>{if(!e.target.closest('.searchbox')&&!e.target.closest('.search-results')) $('#searchResults').hidden=true});
$('#directoryFilter')?.addEventListener('input', () => renderDirectory());
loadDirectory();
loadFiber();
