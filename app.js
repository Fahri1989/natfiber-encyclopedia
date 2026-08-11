const { supabaseUrl, publishableKey } = window.NATFIBER_CONFIG;
const headers = { apikey: publishableKey, 'Content-Type': 'application/json' };
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const I18N = window.NF_I18N;
const t = I18N.t, term = I18N.term, prose = I18N.prose;
let currentProfile = null;

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
  $('#publishBadge').textContent = t('published');
  $('#fiberName').textContent = f.canonical_name;
  $('#scientificName').textContent = f.scientific_name || '—';
  $('#fiberDescription').textContent = I18N.fiberDescription(f.fiber_id, f.description_short || '');
  $('#nameChips').innerHTML = names.map(n => `<span class="chip">${esc(n.name)} · ${esc(I18N.nameType(n.name_type||'name'))}</span>`).join('');
  const fields = [
    [t('identity.family'),tax?.family||f.family],[t('identity.order'),tax?.order_name],[t('identity.plantPart'),term(f.plant_part)],[t('identity.originCategory'),term(f.fiber_origin_category)],
    [t('identity.region'),prose(f.country_region_notes)],[t('identity.useStatus'),term(f.commercial_status)]
  ].filter(x=>x[1]);
  $('#identityGrid').innerHTML = fields.map(([k,v])=>`<div class="identity"><b>${esc(k)}</b><span>${esc(v)}</span></div>`).join('');
}
function renderSummary(p) {
  const items = [
    [t('summary.canonical'), p.canonical_values.length],
    [t('summary.chemical'), p.chemical_composition.length],
    [t('summary.morphology'), p.morphology.length],
    [t('summary.properties'), p.properties.length],
    [t('summary.treatments'), p.treatments.length],
    [t('summary.composites'), p.composites.length],
    [t('summary.processing'), (p.processing||[]).length],
    [t('summary.applications'), (p.applications||[]).length],
    [t('summary.evidence'), p.evidence.length],
    [t('summary.gaps'), (p.research_gaps||[]).length],
    [t('summary.production'), (p.production_stats||[]).length],
    [t('summary.trade'), (p.trade_stats||[]).length],
    [t('summary.distribution'), (p.distribution||[]).length],
    [t('summary.media'), (p.media||[]).length],
    [t('summary.references'), p.references.length]
  ];
  $('#datasetSummary').innerHTML = items.map(([k,v])=>`<div class="summary-item"><strong>${esc(v)}</strong><span>${esc(k)}</span></div>`).join('');
}
function renderCanonical(rows) {
  $('#canonicalGrid').innerHTML = rows.slice(0,8).map(r=>`<article class="metric">
    <div class="metric-label">${esc(term(r.display_field))}</div><div class="metric-value">${range(r)}</div>
    <div class="metric-unit">${esc(r.unit||'')}</div><span class="confidence ${esc(r.confidence||'')}">${esc(term(r.confidence||'EVIDENCE'))}</span>
  </article>`).join('');
  $('#propertyTable').innerHTML = `<table class="data-table"><thead><tr><th>${t('table.property')}</th><th>${t('table.verifiedRange')}</th><th>${t('table.evidence')}</th><th>${t('table.publicWording')}</th><th>${t('table.methodWarning')}</th></tr></thead><tbody>${rows.map(r=>`<tr>
    <td><strong>${esc(term(r.display_field))}</strong></td><td>${range(r)} ${esc(r.unit||'')}</td><td>${esc(term(r.confidence||''))}</td>
    <td>${esc(I18N.canonicalWording(r))}</td><td class="${r.method_condition_warning?'warn':''}">${esc(prose(r.method_condition_warning||'—'))}</td>
  </tr>`).join('')}</tbody></table>`;
}
function renderChemistry(rows) {
  $('#chemistryTable').innerHTML = `<table class="data-table"><thead><tr><th>${t('table.component')}</th><th>${t('table.value')}</th><th>${t('table.unit')}</th><th>${t('table.method')}</th><th>${t('table.sampleCondition')}</th><th>${t('table.source')}</th></tr></thead><tbody>${rows.map(r=>`<tr>
    <td><strong>${esc(term(r.component))}</strong></td><td>${valRange(r)}</td><td>${esc(r.unit||'')}</td><td>${esc(prose(r.analysis_method||'—'))}</td>
    <td>${esc(prose(r.sample_condition||'—'))}</td><td>${esc(r.reference_id||'—')}</td>
  </tr>`).join('')}</tbody></table>`;
}
function renderMorphology(rows) {
  $('#morphologyTable').innerHTML = `<table class="data-table"><thead><tr><th>${t('table.parameter')}</th><th>${t('table.valueRange')}</th><th>${t('table.unit')}</th><th>${t('table.method')}</th><th>${t('table.sourceLocation')}</th><th>${t('table.reference')}</th></tr></thead><tbody>${rows.map(r=>`<tr>
    <td><strong>${esc(term(r.parameter))}</strong></td><td>${valRange(r)}${r.value_min!=null||r.value_max!=null?` <span class="muted">(${t('table.verifiedRange').toLowerCase()} ${fmt(r.value_min)}–${fmt(r.value_max)})</span>`:''}</td>
    <td>${esc(r.unit||'')}</td><td>${esc(prose(r.test_method||'—'))}</td><td>${esc(prose(r.source_location||'—'))}</td><td>${esc(r.reference_id||'—')}</td>
  </tr>`).join('')}</tbody></table>`;
}
function renderObservations(rows) {
  $('#observationTable').innerHTML = `<table class="data-table observations"><thead><tr><th>${t('table.category')}</th><th>${t('table.property')}</th><th>${t('table.value')}</th><th>${t('table.sd')}</th><th>${t('table.n')}</th><th>${t('table.standardMethod')}</th><th>${t('table.condition')}</th><th>${t('table.treatment')}</th><th>${t('table.reference')}</th></tr></thead><tbody>${rows.map(r=>`<tr>
    <td>${esc(term(r.property_category))}</td><td><strong>${esc(term(r.property_name))}</strong></td><td>${valRange(r)} ${esc(r.unit||'')}</td><td>${fmt(r.value_sd)}</td><td>${r.n_replicates??'—'}</td>
    <td>${esc(r.test_standard||'')}${r.test_standard&&r.test_method?' · ':''}${esc(prose(r.test_method||'—'))}</td><td>${esc(prose(r.sample_condition||'—'))}</td><td>${esc(r.treatment_id||'—')}</td><td>${esc(r.reference_id||'—')}</td>
  </tr>`).join('')}</tbody></table>`;
}
function renderTreatments(rows) {
  $('#treatmentGrid').innerHTML = rows.map(r=>`<article class="record"><div class="record-top"><div><div class="record-id">${esc(r.treatment_id)}</div><h4>${esc(r.agent_method)}</h4></div><span class="confidence">${esc(term(r.treatment_category||'Treatment'))}</span></div>
    <div class="kv"><b>${t('label.concentration')}</b><span>${r.concentration_value??'—'} ${esc(r.concentration_unit||'')}</span><b>${t('label.temperature')}</b><span>${r.temperature_c??'—'} ${r.temperature_c!=null?'°C':''}</span><b>${t('label.duration')}</b><span>${r.time_value??'—'} ${esc(r.time_unit||'')}</span><b>${t('label.solvent')}</b><span>${esc(r.solvent||'—')}</span><b>${t('label.washing')}</b><span>${esc(prose(r.washing||'—'))}</span><b>${t('label.drying')}</b><span>${esc(prose(r.drying_condition||'—'))}</span></div>
    <div class="record-summary">${esc(prose(r.purpose||r.evidence_note||''))}</div></article>`).join('') || `<div class="state-card">${t('empty.treatment')}</div>`;
}
function renderComposites(rows) {
  $('#compositeGrid').innerHTML = rows.map(r=>`<article class="record"><div class="record-top"><div><div class="record-id">${esc(r.composite_id)}</div><h4>${esc(r.matrix_name)}</h4></div><span class="confidence">${esc(term(r.matrix_family||'Matrix'))}</span></div>
    <div class="kv"><b>${t('label.fiberForm')}</b><span>${esc(prose(r.fiber_form||'—'))}</span><b>${t('label.fiberContent')}</b><span>${r.fiber_content_value??'—'} ${esc(r.fiber_content_unit||'')}</span><b>${t('label.orientation')}</b><span>${esc(prose(r.orientation||'—'))}</span><b>${t('label.fabrication')}</b><span>${esc(prose(r.fabrication_method||'—'))}</span><b>${t('label.application')}</b><span>${esc(prose(r.application_context||'—'))}</span></div>
    <div class="record-summary">${esc(prose(r.property_summary||''))}</div></article>`).join('') || `<div class="state-card">${t('empty.composite')}</div>`;
}
function renderProcessing(rows) {
  $('#processingGrid').innerHTML = rows.map(r=>`<article class="record"><div class="record-top"><div><div class="record-id">${esc(r.processing_id)}</div><h4>${esc(prose(r.process_name))}</h4></div><span class="confidence">${esc(term(r.process_category||'Processing'))}</span></div>
    <div class="kv"><b>${t('label.equipment')}</b><span>${esc(prose(r.equipment||'—'))}</span><b>${t('label.temperature')}</b><span>${r.temperature_c??'—'} ${r.temperature_c!=null?'°C':''}</span><b>${t('label.pressure')}</b><span>${esc(r.pressure||'—')}</span><b>${t('label.duration')}</b><span>${esc(prose(r.duration||'—'))}</span><b>${t('label.reference')}</b><span>${esc(r.reference_id||'—')}</span></div>
    <div class="record-summary">${esc(prose(r.notes||''))}</div></article>`).join('') || `<div class="state-card">${t('empty.processing')}</div>`;
}
function renderApplications(rows) {
  $('#applicationGrid').innerHTML = rows.map(r=>`<article class="record"><div class="record-top"><div><div class="record-id">${esc(r.application_id)}</div><h4>${esc(prose(r.application_name))}</h4></div><span class="confidence">${esc(term(r.maturity_level||'Application'))}</span></div>
    <div class="kv"><b>${t('label.sector')}</b><span>${esc(prose(r.application_sector||'—'))}</span><b>${t('label.reference')}</b><span>${esc(r.reference_id||'—')}</span></div>
    <div class="record-summary">${esc(prose(r.evidence_summary||r.notes||''))}</div></article>`).join('') || `<div class="state-card">${t('empty.application')}</div>`;
}
function renderResearchGaps(rows) {
  $('#researchGapGrid').innerHTML = rows.map(r=>`<article class="record gap-card"><div class="record-top"><div><div class="record-id">${esc(r.research_gap_id)}</div><h4>${esc(prose(r.gap))}</h4></div><span class="confidence">Priority ${esc(r.priority??'—')}</span></div>
    <div class="record-summary"><strong>${t('label.whyMatters')}</strong> ${esc(prose(r.why_it_matters||'—'))}<br><br><strong>${t('label.recommendedStudy')}</strong> ${esc(prose(r.recommended_study||'—'))}</div></article>`).join('') || `<div class="state-card">${t('empty.gaps')}</div>`;
}


function mediaSrc(m){ return m.asset_path || m.original_file_url || ''; }
function renderGlobalFootprint(p){
  const prod=p.production_stats||[], trade=p.trade_stats||[], dist=p.distribution||[], media=p.media||[];
  const modern=prod.filter(r=>r.statistic_name==='Annual commercial fibre production'&&r.geographic_level==='WORLD').sort((a,b)=>a.year-b.year);
  const latest=modern.find(r=>r.is_latest_verified)||modern.at(-1);
  const producers=prod.filter(r=>r.statistic_name==='Annual commercial fibre production'&&r.geographic_level==='COUNTRY'&&r.year===latest?.year).sort((a,b)=>Number(b.value)-Number(a.value));
  const top5=producers.slice(0,5); const top5sum=top5.reduce((s,r)=>s+Number(r.value||0),0); const top5pct=latest?100*top5sum/Number(latest.value):0;
  const rawImport=trade.find(r=>r.trade_flow==='IMPORT'&&r.product_form==='RAW_FIBRE'&&r.geographic_level==='WORLD'&&r.year===latest?.year);
  const native=dist.filter(r=>r.distribution_type==='NATIVE_RANGE');
  const commercial=dist.filter(r=>r.distribution_type==='COMMERCIAL_PRODUCTION');
  const history=prod.filter(r=>r.statistic_name==='Historical combined fibre production'&&r.geographic_level==='WORLD').sort((a,b)=>a.year-b.year);
  const hero=media.find(r=>r.is_hero)||media[0];

  const hasGlobal=Boolean(prod.length||trade.length||dist.length);
  const hasMedia=Boolean(media.length);
  const hasAny=hasGlobal||hasMedia;
  const heroBox=$('#globalHero');
  const globalTabBtn=document.querySelector('.tab[data-tab="global"]');
  const galleryTabBtn=document.querySelector('.tab[data-tab="gallery"]');

  // Hide sections completely for fibers that do not yet have global/media records.
  if(heroBox){ heroBox.hidden=!hasAny; heroBox.style.display=hasAny?'':'none'; }
  if(globalTabBtn){ globalTabBtn.hidden=!hasGlobal; globalTabBtn.style.display=hasGlobal?'':'none'; }
  if(galleryTabBtn){ galleryTabBtn.hidden=!hasMedia; galleryTabBtn.style.display=hasMedia?'':'none'; }

  // If user switches from a fiber with global/media data to one without it,
  // return safely to Overview instead of leaving an empty active panel.
  const activeHidden=(document.querySelector('.tab.active[data-tab="global"]')&&!hasGlobal)||(document.querySelector('.tab.active[data-tab="gallery"]')&&!hasMedia);
  if(activeHidden){
    $$('.tab').forEach(x=>x.classList.remove('active')); $$('.tabpanel').forEach(x=>x.classList.remove('active'));
    document.querySelector('.tab[data-tab="overview"]')?.classList.add('active');
    $('#tab-overview')?.classList.add('active');
  }

  if(!hasAny){
    if($('#heroFiberImage')){ $('#heroFiberImage').removeAttribute('src'); $('#heroFiberImage').alt=''; }
    if($('#heroMediaCredit')) $('#heroMediaCredit').innerHTML='';
    if($('#globalHeroMetrics')) $('#globalHeroMetrics').innerHTML='';
    if($('#globalMetrics')) $('#globalMetrics').innerHTML='';
    if($('#mediaGallery')) $('#mediaGallery').innerHTML='';
    return;
  }

  // Dynamic title follows the fiber currently opened; no hard-coded "Sisal" on Ijuk/Jute/etc.
  const fiberName=p.fiber?.canonical_name||'';
  const globalTitle=I18N.getLang()==='id'
    ? `Produksi, perdagangan, dan sebaran ${fiberName}`
    : `${fiberName} production, trade, and distribution`;
  const heroTitle=document.querySelector('#globalHero h3');
  const sectionTitle=document.querySelector('#tab-global .section-title h3');
  if(heroTitle) heroTitle.textContent=globalTitle;
  if(sectionTitle) sectionTitle.textContent=globalTitle;

  if(hero){
    $('#heroFiberImage').src=mediaSrc(hero);
    $('#heroFiberImage').alt=I18N.getLang()==='id'?(hero.alt_text_id||hero.title):(hero.alt_text_en||hero.title);
    $('#heroFiberImage').onerror=()=>{
      // Do not show a broken-image icon; gallery metadata remains available.
      $('#heroFiberImage').style.visibility='hidden';
    };
    $('#heroFiberImage').onload=()=>{ $('#heroFiberImage').style.visibility='visible'; };
    $('#heroMediaCredit').innerHTML=`${esc(hero.attribution_text||hero.creator||'')} · <a href="${esc(hero.license_url)}" target="_blank" rel="noopener">${esc(hero.license_name)}</a>`;
  } else {
    $('#heroFiberImage').removeAttribute('src'); $('#heroFiberImage').style.visibility='hidden';
    $('#heroMediaCredit').innerHTML='';
  }

  const metrics=[
    [t('global.latestProduction'),latest?`${fmt(latest.value)} kt`:'—',latest?String(latest.year):'—'],
    [t('global.rawImports'),rawImport?`${fmt(rawImport.value)} kt`:'—',rawImport?String(rawImport.year):'—'],
    [t('global.top5'),latest?`${fmt(top5pct)}%`:'—',latest?String(latest.year):'—'],
    [t('global.ecological'),t('global.notAssessed'),'']
  ];
  const metricHtml=metrics.map(([k,v,y])=>`<div class="global-metric"><span>${esc(k)}</span><strong>${esc(v)}</strong><small>${esc(y)}</small></div>`).join('');
  $('#globalHeroMetrics').innerHTML=metricHtml; $('#globalMetrics').innerHTML=metricHtml;
  const max=Math.max(...modern.map(r=>Number(r.value||0)),1);
  $('#productionTrend').innerHTML=modern.map(r=>`<div class="trend-col"><div class="trend-value">${fmt(r.value)}</div><div class="trend-bar-wrap"><div class="trend-bar" style="height:${Math.max(8,100*Number(r.value)/max)}%"></div></div><div class="trend-year">${r.year}</div></div>`).join('') || '<div class="muted">—</div>';
  const pmax=Math.max(...top5.map(r=>Number(r.value||0)),1);
  $('#producerBars').innerHTML=top5.map(r=>`<div class="producer-row"><div class="producer-label"><b>${esc(r.country_or_region)}</b><span>${fmt(r.value)} kt</span></div><div class="producer-track"><span style="width:${100*Number(r.value)/pmax}%"></span></div></div>`).join('') || '<div class="muted">—</div>';
  $('#nativeRangeBox').innerHTML=native.map(r=>`<div class="distribution-card"><strong>${esc(r.place_name)}</strong><p>${esc(prose(r.description||''))}</p><span>${esc(r.source_organization||'')}</span></div>`).join('') || '<div class="muted">—</div>';
  $('#commercialDistribution').innerHTML=commercial.map(r=>`<span class="distribution-chip">${esc(r.place_name)}</span>`).join('') || '<div class="muted">—</div>';
  $('#historicalProduction').innerHTML=history.map(r=>`<span class="history-chip"><b>${r.year}</b> ${esc(r.value_qualifier||'=')}${fmt(r.value)} kt</span>`).join('') || '<div class="muted">—</div>';
}

function renderMedia(rows){
  $('#mediaGallery').innerHTML=rows.map(m=>`<article class="media-card"><div class="media-image-wrap"><img src="${esc(mediaSrc(m))}" alt="${esc(I18N.getLang()==='id'?(m.alt_text_id||m.title):(m.alt_text_en||m.title))}" loading="lazy" referrerpolicy="no-referrer"></div><div class="media-card-body"><span class="media-type">${esc(term(m.media_type))}</span><h4>${esc(m.title)}</h4><p>${esc(m.attribution_text||'')}</p><div class="media-links"><a href="${esc(m.source_page_url)}" target="_blank" rel="noopener">${t('gallery.source')} ↗</a><a href="${esc(m.license_url)}" target="_blank" rel="noopener">${esc(m.license_name)}</a></div>${m.modification_note?`<small>${esc(prose(m.modification_note))}</small>`:''}</div></article>`).join('') || '<div class="state-card">—</div>';
}
function renderEvidence(rows, conflicts) {
  $('#evidenceGrid').innerHTML = rows.map(r=>`<article class="evidence-card"><div class="evidence-row"><div class="evidence-title">${esc(prose(r.domain))}</div><span class="evidence-level">${esc(term(r.evidence_level))}</span></div><div class="bar"><span style="width:${Math.max(0,Math.min(100,Number(r.coverage_pct)||0))}%"></span></div><div class="evidence-notes"><strong>${fmt(r.coverage_pct)}% ${t('label.coverage')}.</strong> ${esc(prose(r.main_strength||''))}<br><br><em>${t('label.gap')}</em> ${esc(prose(r.main_gap||'—'))}</div></article>`).join('');
  $('#conflictBox').innerHTML = conflicts.length ? `<div class="section-title"><div><span>${t('label.transparency')}</span><h3>${t('label.conflictTitle')}</h3></div></div>${conflicts.map(c=>`<article class="conflict"><strong>${esc(prose(c.issue_type))} · ${esc(prose(c.affected_data||''))}</strong><p>${esc(prose(c.issue_summary))} <b>${t('label.decision')}</b> ${esc(prose(c.current_decision||''))}</p></article>`).join('')}` : '';
}
function renderReferences(rows) {
  $('#referenceList').innerHTML = rows.map(r=>`<article class="reference"><div class="reference-meta">${esc(r.reference_id)} · ${esc(r.year||'')} · ${esc(r.journal_book||'')}</div><h4>${esc(r.title)}</h4><p>${esc(r.authors||'')}</p>${r.url?`<a href="${esc(r.url)}" target="_blank" rel="noopener">${t('label.openSource')}</a>`:''}</article>`).join('');
}

let directoryRows = [];

function statusLabel(status){
  return status === 'AVAILABLE' ? t('status.available')
       : status === 'RESEARCH' ? t('status.research')
       : t('status.queued');
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
      ${clickable ? `<div class="directory-action">${t('directory.open')}</div>` :
        r.roadmap_status === 'RESEARCH' ? `<div class="directory-action muted-action">${t('directory.researchAction')}</div>` :
        `<div class="directory-action muted-action">${t('directory.queuedAction')}</div>`}
    </article>`;
  }).join('') || `<div class="state-card">${t('directory.noMatch')}</div>`;

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
      [t('directory.roadmapFibers'), directoryRows.length],
      [t('directory.available'), available],
      [t('directory.inResearch'), research],
      [t('directory.queued'), queued]
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
    if (!p?.fiber) throw new Error(`${t('profile.notFound')} (${fiberId})`);
    currentProfile = p;
    renderFiber(p.fiber,p.names||[],p.taxonomy);
    renderSummary(p);
    renderCanonical(p.canonical_values||[]);
    renderChemistry(p.chemical_composition||[]);
    renderMorphology(p.morphology||[]);
    renderObservations(p.properties||[]);
    renderTreatments(p.treatments||[]);
    renderComposites(p.composites||[]);
    renderProcessing(p.processing||[]);
    renderApplications(p.applications||[]);
    // v1.0.2: render fiber-specific global footprint and licensed media
    // on EVERY profile load. This also hides the blocks for fibers with no data.
    renderGlobalFootprint(p);
    renderMedia(p.media||[]);
    renderEvidence(p.evidence||[],p.conflicts||[]);
    renderResearchGaps(p.research_gaps||[]);
    renderReferences(p.references||[]);
    $('#fiberProfile').hidden=false;
  } catch(err) { $('#error').textContent=`${t('search.error')} ${err.message}`; $('#error').hidden=false; }
  finally { $('#loading').hidden=true; }
}

$$('.tab').forEach(btn=>btn.addEventListener('click',()=>{
  $$('.tab').forEach(x=>x.classList.remove('active')); $$('.tabpanel').forEach(x=>x.classList.remove('active'));
  btn.classList.add('active'); $(`#tab-${btn.dataset.tab}`).classList.add('active');
}));
$('#searchForm').addEventListener('submit',async e=>{
  e.preventDefault(); const q=$('#searchInput').value.trim(); if(!q) return;
  const box=$('#searchResults'); box.hidden=false; box.innerHTML=`<div class="search-item">${t('search.searching')}</div>`;
  try{
    const rows=await rpcSearch(q); box.innerHTML=rows.length?rows.map(r=>`<div class="search-item" data-fiber="${esc(r.fiber_id)}"><div><div class="search-type">${esc(r.entity_type)}</div><div class="search-title">${esc(r.title)}</div></div><div class="search-sub">${esc(r.subtitle||'')}</div></div>`).join(''):`<div class="search-item">${t('search.noMatch')}</div>`;
    box.querySelectorAll('[data-fiber]').forEach(el=>el.addEventListener('click',()=>{loadFiber(el.dataset.fiber);box.hidden=true;document.querySelector('#fiberProfile').scrollIntoView({behavior:'smooth'});}));
  }catch(err){box.innerHTML=`<div class="search-item">${t('search.error')} ${esc(err.message)}</div>`}
});

document.addEventListener('click',e=>{if(!e.target.closest('.searchbox')&&!e.target.closest('.search-results')) $('#searchResults').hidden=true});
$('#directoryFilter')?.addEventListener('input', () => renderDirectory());
I18N.onChange(() => {
  I18N.apply();
  if (directoryRows.length) renderDirectory();
  if (currentProfile) {
    const p=currentProfile;
    renderFiber(p.fiber,p.names||[],p.taxonomy);
    renderSummary(p); renderCanonical(p.canonical_values||[]); renderChemistry(p.chemical_composition||[]);
    renderMorphology(p.morphology||[]); renderObservations(p.properties||[]); renderTreatments(p.treatments||[]);
    renderComposites(p.composites||[]); renderProcessing(p.processing||[]); renderApplications(p.applications||[]);
    renderGlobalFootprint(p); renderMedia(p.media||[]);
    renderEvidence(p.evidence||[],p.conflicts||[]); renderResearchGaps(p.research_gaps||[]); renderReferences(p.references||[]);
  }
});
loadDirectory();
loadFiber();
