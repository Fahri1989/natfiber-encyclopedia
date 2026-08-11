(() => {
  'use strict';

  const CFG = window.NATFIBER_CONFIG || {};
  if (!CFG.supabaseUrl || !CFG.publishableKey) return;

  const TECHNIQUES = ['SEM','FTIR','XRD','DSC','TGA_DTG','H_NMR','C13_NMR','XRF'];
  const LABELS = {
    id: {
      tab:'Karakterisasi',
      eyebrow:'PUSTAKA KARAKTERISASI ILMIAH',
      title:'Karakterisasi sumber-terlacak',
      desc:'SEM, FTIR, XRD, DSC, TGA/DTG, NMR, dan XRF ditampilkan bersama kondisi sampel, metode, sumber, lisensi, dan status verifikasi.',
      evidence:'Bukti',
      sources:'sumber primer',
      fulltext:'full-text diverifikasi',
      figure:'figure',
      rehost:'boleh ditampilkan',
      notFound:'Belum ditemukan',
      limitation:'Keterbatasan',
      condition:'Kondisi sampel',
      context:'Konteks',
      treatment:'Perlakuan',
      instrument:'Instrumen',
      method:'Kondisi pengukuran',
      figureNo:'Figure',
      verification:'Verifikasi',
      license:'Lisensi',
      observations:'Observasi sumber',
      openSource:'Buka sumber',
      openFigure:'Buka figure/sumber',
      imageUnavailable:'Preview gambar belum tersedia. Metadata dan tautan sumber tetap dapat diperiksa.',
      sourceOnly:'Figure tersedia di artikel sumber tetapi tidak di-host ulang karena status lisensi.',
      fraction:'Fraksi serat',
      composite:'Konteks komposit',
      intrinsic:'Serat intrinsik',
      corrected:'Data ini mempertahankan koreksi/ketentuan metode pada sumber primer; nilai lintas-metode tidak digabung otomatis.',
      external:'Thumbnail dapat dimuat dari aset publisher berlisensi. Jika aset eksternal gagal, NatFiber menampilkan metadata dan tautan sumber tanpa broken-image.',
      none:'Belum ada data karakterisasi publik untuk serat ini.'
    },
    en: {
      tab:'Characterization',
      eyebrow:'SCIENTIFIC CHARACTERIZATION LIBRARY',
      title:'Source-resolved characterization',
      desc:'SEM, FTIR, XRD, DSC, TGA/DTG, NMR and XRF are shown with sample condition, method, source, license and verification status.',
      evidence:'Evidence',
      sources:'primary sources',
      fulltext:'full-text verified',
      figure:'figure',
      rehost:'rehost allowed',
      notFound:'Not found',
      limitation:'Limitation',
      condition:'Sample condition',
      context:'Context',
      treatment:'Treatment',
      instrument:'Instrument',
      method:'Measurement conditions',
      figureNo:'Figure',
      verification:'Verification',
      license:'License',
      observations:'Source observations',
      openSource:'Open source',
      openFigure:'Open figure/source',
      imageUnavailable:'Image preview is not currently available. Metadata and the source link remain accessible.',
      sourceOnly:'The figure exists in the source article but is not rehosted because of its licensing status.',
      fraction:'Fibre fraction',
      composite:'Composite context',
      intrinsic:'Intrinsic fibre',
      corrected:'Primary-source corrections and method conditions are preserved; non-comparable methods are not automatically merged.',
      external:'Thumbnails may load from licensed publisher assets. If an external asset fails, NatFiber shows metadata and the source link without a broken image.',
      none:'No public characterization data are available for this fibre yet.'
    }
  };
  const TECH_LABEL = {
    SEM:'SEM / FESEM', FTIR:'FTIR', XRD:'XRD', DSC:'DSC', TGA_DTG:'TGA / DTG',
    H_NMR:'¹H-NMR', C13_NMR:'¹³C-NMR', XRF:'XRF'
  };

  let lastFiberId = null;
  let currentData = null;
  let activeTechnique = null;
  let requestSerial = 0;

  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const esc = (v='') => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const lang = () => {
    try { return window.NF_I18N?.getLang?.() || localStorage.getItem('natfiber_lang') || 'id'; }
    catch { return 'id'; }
  };
  const txt = k => (LABELS[lang()] || LABELS.id)[k] || k;
  const safeUrl = u => {
    try {
      const x = new URL(u, window.location.href);
      return ['http:','https:'].includes(x.protocol) ? x.href : '';
    } catch { return ''; }
  };
  const fmt = v => {
    if (v === null || v === undefined || v === '') return '—';
    const n = Number(v);
    return Number.isFinite(n) ? new Intl.NumberFormat(undefined,{maximumFractionDigits:4}).format(n) : String(v);
  };

  async function rpcProfile(fiberId){
    const url = `${CFG.supabaseUrl}/rest/v1/rpc/get_natfiber_profile`;
    const res = await fetch(url,{
      method:'POST',
      headers:{apikey:CFG.publishableKey,'Content-Type':'application/json'},
      body:JSON.stringify({target_fiber_id:fiberId})
    });
    if(!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    return res.json();
  }

  function ensureUI(){
    const tabs = $('.tabs');
    if(!tabs) return false;

    let btn = $('.tab[data-tab="characterization"]');
    if(!btn){
      btn = document.createElement('button');
      btn.className = 'tab char-tab';
      btn.dataset.tab = 'characterization';
      btn.type = 'button';
      btn.innerHTML = `<span>${esc(txt('tab'))}</span>`;
      const gallery = $('.tab[data-tab="gallery"]');
      if(gallery?.nextSibling) tabs.insertBefore(btn,gallery.nextSibling);
      else tabs.appendChild(btn);
    }

    let panel = $('#tab-characterization');
    if(!panel){
      panel = document.createElement('section');
      panel.className = 'tabpanel char-panel';
      panel.id = 'tab-characterization';
      panel.innerHTML = `
        <div class="section-title char-title-row">
          <div><span class="char-eyebrow"></span><h3 class="char-title"></h3></div>
          <p class="char-desc"></p>
        </div>
        <div class="char-notice"></div>
        <div id="charCoverage" class="char-coverage"></div>
        <div id="charTechniqueNav" class="char-tech-nav" role="tablist" aria-label="Characterization techniques"></div>
        <div id="charTechniqueBody" class="char-tech-body"></div>`;
      const galleryPanel = $('#tab-gallery');
      if(galleryPanel?.nextSibling) galleryPanel.parentNode.insertBefore(panel,galleryPanel.nextSibling);
      else tabs.parentNode.appendChild(panel);
    }

    if(!tabs.dataset.charBound){
      tabs.dataset.charBound='1';
      tabs.addEventListener('click', ev => {
        const b = ev.target.closest('.tab');
        if(!b) return;
        if(b.dataset.tab === 'characterization'){
          $$('.tab').forEach(x=>x.classList.remove('active'));
          $$('.tabpanel').forEach(x=>x.classList.remove('active'));
          b.classList.add('active');
          panel.classList.add('active');
          renderTechnique(activeTechnique || firstTechnique());
        }else{
          $('.tab[data-tab="characterization"]')?.classList.remove('active');
          $('#tab-characterization')?.classList.remove('active');
        }
      });
    }
    return true;
  }

  function firstTechnique(){
    const coverage = currentData?.characterization_coverage || [];
    const available = TECHNIQUES.find(k => coverage.some(c=>c.technique===k && c.evidence_level!=='NOT_FOUND'));
    return available || coverage[0]?.technique || TECHNIQUES[0];
  }

  function resetToOverviewIfNeeded(){
    const charBtn = $('.tab[data-tab="characterization"]');
    const charPanel = $('#tab-characterization');
    if(charBtn?.classList.contains('active')){
      charBtn.classList.remove('active'); charPanel?.classList.remove('active');
      $$('.tab').forEach(x=>x.classList.remove('active'));
      $$('.tabpanel').forEach(x=>x.classList.remove('active'));
      $('.tab[data-tab="overview"]')?.classList.add('active');
      $('#tab-overview')?.classList.add('active');
    }
  }

  function contextLabel(v){
    if(v==='FIBER_FRACTION') return txt('fraction');
    if(v==='COMPOSITE_CONTEXT') return txt('composite');
    return txt('intrinsic');
  }

  function evidenceClass(v=''){
    if(v==='STRONG_EVIDENCE') return 'strong';
    if(v==='MODERATE_EVIDENCE') return 'moderate';
    if(v==='LIMITED_EVIDENCE') return 'limited';
    return 'missing';
  }

  function renderCoverage(){
    const rows = currentData?.characterization_coverage || [];
    $('#charCoverage').innerHTML = rows.map(r=>`
      <article class="char-coverage-card ${evidenceClass(r.evidence_level)}">
        <div class="char-coverage-top"><strong>${esc(TECH_LABEL[r.technique]||r.technique)}</strong>
          <span>${esc(String(r.evidence_level||'').replaceAll('_',' '))}</span></div>
        <div class="char-coverage-meta">
          <b>${fmt(r.primary_source_count)}</b> ${esc(txt('sources'))} ·
          <b>${fmt(r.fulltext_verified_count)}</b> ${esc(txt('fulltext'))}
        </div>
        <div class="char-coverage-flags">
          <span>${r.figure_available?'✓':'—'} ${esc(txt('figure'))}</span>
          <span>${r.rehost_allowed?'✓':'—'} ${esc(txt('rehost'))}</span>
        </div>
      </article>`).join('');
  }

  function renderNav(){
    const coverage = currentData?.characterization_coverage || [];
    $('#charTechniqueNav').innerHTML = TECHNIQUES.map(k=>{
      const cov = coverage.find(c=>c.technique===k);
      if(!cov) return '';
      return `<button type="button" class="char-tech-btn ${k===activeTechnique?'active':''} ${cov.evidence_level==='NOT_FOUND'?'not-found':''}" data-tech="${esc(k)}">
        <span>${esc(TECH_LABEL[k])}</span><small>${esc(cov.evidence_level==='NOT_FOUND' ? txt('notFound') : cov.evidence_level.replaceAll('_',' '))}</small>
      </button>`;
    }).join('');
    $$('#charTechniqueNav .char-tech-btn').forEach(b=>b.addEventListener('click',()=>renderTechnique(b.dataset.tech)));
  }

  function observationValue(o){
    let parts=[];
    if(o.value_numeric!==null && o.value_numeric!==undefined) parts.push(`${fmt(o.value_numeric)}${o.unit?` ${esc(o.unit)}`:''}`);
    else if(o.value_min!==null || o.value_max!==null) parts.push(`${fmt(o.value_min)}–${fmt(o.value_max)}${o.unit?` ${esc(o.unit)}`:''}`);
    if(o.value_text) parts.push(esc(o.value_text));
    return parts.join(' · ') || '—';
  }

  function recordMedia(recordId){
    return (currentData?.characterization_media||[])
      .filter(m=>m.characterization_id===recordId)
      .sort((a,b)=>Number(b.is_primary)-Number(a.is_primary)||Number(a.display_order)-Number(b.display_order));
  }

  function mediaBlock(m){
    if(!m) return '';
    const source = safeUrl(m.source_page_url);
    const image = safeUrl(m.thumbnail_url || m.asset_path || m.original_image_url);
    if(m.reuse_status==='SOURCE_ONLY_DO_NOT_REHOST'){
      return `<div class="char-media char-media-source-only">
        <div class="char-media-placeholder">🔗</div>
        <div><strong>${esc(lang()==='id'?m.title_id:m.title_en)}</strong>
        <p>${esc(txt('sourceOnly'))}</p>
        ${source?`<a href="${esc(source)}" target="_blank" rel="noopener">${esc(txt('openSource'))} ↗</a>`:''}</div>
      </div>`;
    }
    return `<div class="char-media ${image?'has-image':''}">
      ${image?`<div class="char-image-wrap">
          <img loading="lazy" src="${esc(image)}" alt="${esc(lang()==='id'?m.title_id:m.title_en)}">
          <div class="char-image-fallback" hidden>${esc(txt('imageUnavailable'))}</div>
        </div>`:`<div class="char-media-placeholder">▧</div>`}
      <div class="char-media-info">
        <strong>${esc(lang()==='id'?m.title_id:m.title_en)}</strong>
        <p>${esc(lang()==='id'?(m.caption_id||''):(m.caption_en||''))}</p>
        <div class="char-media-badges"><span>${esc(m.reuse_status)}</span>${m.figure_license?`<span>${esc(m.figure_license)}</span>`:''}</div>
        ${source?`<a href="${esc(source)}" target="_blank" rel="noopener">${esc(txt('openFigure'))} ↗</a>`:''}
      </div>
    </div>`;
  }

  function bindImageFallbacks(root){
    root.querySelectorAll('.char-image-wrap img').forEach(img=>{
      img.addEventListener('error',()=>{
        img.style.display='none';
        const f=img.parentElement.querySelector('.char-image-fallback');
        if(f) f.hidden=false;
      },{once:true});
    });
  }

  function renderRecord(r){
    const obs = (currentData?.characterization_observations||[]).filter(o=>o.characterization_id===r.characterization_id);
    const media = recordMedia(r.characterization_id);
    const source = safeUrl(media[0]?.source_page_url || (r.doi?`https://doi.org/${r.doi}`:''));
    const license = media[0]?.figure_license || r.article_license || '—';
    return `<article class="char-record">
      <div class="char-record-head">
        <div><div class="char-record-id">${esc(r.characterization_id)} · ${esc(TECH_LABEL[r.technique]||r.technique)}</div>
        <h4>${esc(r.sample_condition||'—')}</h4></div>
        <span class="char-context ${esc(String(r.context_type||'').toLowerCase())}">${esc(contextLabel(r.context_type))}</span>
      </div>
      ${media.length?media.map(mediaBlock).join(''):''}
      <div class="char-kv">
        <b>${esc(txt('treatment'))}</b><span>${esc(r.treatment||'—')}</span>
        <b>${esc(txt('instrument'))}</b><span>${esc(r.instrument||'—')}</span>
        <b>${esc(txt('method'))}</b><span>${esc(r.measurement_conditions||'—')}</span>
        <b>${esc(txt('figureNo'))}</b><span>${esc(r.figure_number||'—')}${r.page?` · p. ${esc(r.page)}`:''}</span>
        <b>${esc(txt('verification'))}</b><span>${esc(r.verification_level||'—')}</span>
        <b>${esc(txt('license'))}</b><span>${esc(license)}</span>
      </div>
      ${r.interpretation?`<p class="char-interpretation">${esc(r.interpretation)}</p>`:''}
      ${r.source_note?`<p class="char-source-note">${esc(r.source_note)}</p>`:''}
      ${obs.length?`<div class="char-observations"><strong>${esc(txt('observations'))}</strong>
        <div class="char-observation-grid">${obs.map(o=>`<div class="char-observation">
          <span>${esc(o.parameter)}</span><b>${observationValue(o)}</b>
          ${o.assignment_status?`<small>${esc(o.assignment_status.replaceAll('_',' '))}</small>`:''}
        </div>`).join('')}</div></div>`:''}
      <div class="char-record-links">${source?`<a href="${esc(source)}" target="_blank" rel="noopener">${esc(txt('openSource'))} ↗</a>`:''}${r.doi?`<code>DOI ${esc(r.doi)}</code>`:''}</div>
    </article>`;
  }

  function renderTechnique(k){
    activeTechnique = k;
    renderNav();
    const coverage = (currentData?.characterization_coverage||[]).find(c=>c.technique===k);
    const records = (currentData?.characterization_records||[]).filter(r=>r.technique===k);
    const body = $('#charTechniqueBody');
    if(!coverage){ body.innerHTML=''; return; }

    if(coverage.evidence_level==='NOT_FOUND'){
      body.innerHTML = `<article class="char-missing">
        <div class="char-missing-icon">∅</div>
        <div><span>${esc(TECH_LABEL[k])}</span><h4>${esc(txt('notFound'))}</h4>
        <p><strong>${esc(txt('limitation'))}:</strong> ${esc(coverage.main_limitation||'—')}</p>
        ${coverage.notes?`<p>${esc(coverage.notes)}</p>`:''}</div>
      </article>`;
      return;
    }

    body.innerHTML = `
      <div class="char-tech-summary">
        <div><span>${esc(txt('evidence'))}</span><strong>${esc(coverage.evidence_level.replaceAll('_',' '))}</strong></div>
        <p>${esc(coverage.main_limitation||'')}</p>
      </div>
      <div class="char-record-grid">${records.map(renderRecord).join('') || `<div class="state-card">${esc(txt('none'))}</div>`}</div>`;
    bindImageFallbacks(body);
  }

  function renderAll(){
    if(!ensureUI()) return;
    const btn = $('.tab[data-tab="characterization"]');
    const panel = $('#tab-characterization');
    const coverage = currentData?.characterization_coverage || [];
    const records = currentData?.characterization_records || [];
    const has = coverage.length || records.length;
    btn.hidden=!has; btn.style.display=has?'':'none';
    panel.hidden=!has;
    if(!has){ resetToOverviewIfNeeded(); return; }

    btn.querySelector('span').textContent=txt('tab');
    panel.querySelector('.char-eyebrow').textContent=txt('eyebrow');
    panel.querySelector('.char-title').textContent=txt('title');
    panel.querySelector('.char-desc').textContent=txt('desc');
    panel.querySelector('.char-notice').innerHTML=`<strong>${esc(txt('corrected'))}</strong><span>${esc(txt('external'))}</span>`;
    if(!activeTechnique || !coverage.some(c=>c.technique===activeTechnique)) activeTechnique=firstTechnique();
    renderCoverage(); renderNav(); renderTechnique(activeTechnique);
  }

  async function loadForFiber(fiberId){
    const serial=++requestSerial;
    try{
      const p=await rpcProfile(fiberId);
      if(serial!==requestSerial) return;
      currentData=p; activeTechnique=null; renderAll();
    }catch(e){
      console.warn('NatFiber characterization load failed',e);
      currentData=null;
      if(ensureUI()){
        $('.tab[data-tab="characterization"]').hidden=true;
        $('#tab-characterization').hidden=true;
      }
    }
  }

  function watchFiber(){
    ensureUI();
    const id = ($('#fiberId')?.textContent||'').trim();
    if(id && id!=='—' && id!==lastFiberId){
      lastFiberId=id; loadForFiber(id);
    }
  }

  document.addEventListener('DOMContentLoaded',()=>{
    ensureUI();
    setInterval(watchFiber,650);
    document.addEventListener('click',ev=>{
      if(ev.target.closest('.language-switch [data-lang]')){
        setTimeout(()=>{ if(currentData) renderAll(); },80);
      }
    });
    watchFiber();
  });
})();
