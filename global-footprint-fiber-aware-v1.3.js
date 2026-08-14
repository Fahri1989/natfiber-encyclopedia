/*
 NatFiber Encyclopedia
 Public Global Footprint Renderer v1.3
 Fiber-aware override for NF-0001 Ijuk.
 - Preserves existing Sisal renderer unchanged.
 - Separates verified ijuk fibre output from sugar-palm host-resource area.
 - Does not infer numeric trade where species/product isolation is unavailable.
*/
(function(){
  if (typeof renderGlobalFootprint !== 'function') {
    console.warn('[NatFiber] Base renderGlobalFootprint not ready.');
    return;
  }

  const baseRenderGlobalFootprint = renderGlobalFootprint;

  function q(sel){ return document.querySelector(sel); }
  function num(v){ return Number(v || 0); }
  function safeFmt(v){
    return Number.isFinite(Number(v))
      ? Number(v).toLocaleString(undefined,{maximumFractionDigits:2})
      : '—';
  }
  function htmlEsc(v=''){
    return String(v ?? '').replace(/[&<>"']/g,c=>({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }
  function currentLang(){
    try { return I18N?.getLang?.() || localStorage.getItem('natfiber_lang') || 'id'; }
    catch { return 'id'; }
  }
  function L(id,en){ return currentLang()==='id' ? id : en; }

  function setPanelTitle(containerSelector, title){
    const box=q(containerSelector);
    const h=box?.closest('.global-panel')?.querySelector('h4');
    if(h) h.textContent=title;
  }

  function showGlobalControls(hasGlobal, hasMedia){
    const heroBox=q('#globalHero');
    const globalTabBtn=q('.tab[data-tab="global"]');
    const galleryTabBtn=q('.tab[data-tab="gallery"]');
    const hasAny=hasGlobal||hasMedia;

    if(heroBox){ heroBox.hidden=!hasAny; heroBox.style.display=hasAny?'':'none'; }
    if(globalTabBtn){ globalTabBtn.hidden=!hasGlobal; globalTabBtn.style.display=hasGlobal?'':'none'; }
    if(galleryTabBtn){ galleryTabBtn.hidden=!hasMedia; galleryTabBtn.style.display=hasMedia?'':'none'; }

    const activeHidden =
      (q('.tab.active[data-tab="global"]')&&!hasGlobal) ||
      (q('.tab.active[data-tab="gallery"]')&&!hasMedia);

    if(activeHidden){
      document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
      document.querySelectorAll('.tabpanel').forEach(x=>x.classList.remove('active'));
      q('.tab[data-tab="overview"]')?.classList.add('active');
      q('#tab-overview')?.classList.add('active');
    }
  }

  function renderIjukGlobal(p){
    const prod=p.production_stats||[];
    const trade=p.trade_stats||[];
    const dist=p.distribution||[];
    const media=p.media||[];

    const fibreOutput=prod
      .filter(r=>r.statistic_name==='Reported ijuk / palm fibre production')
      .sort((a,b)=>a.year-b.year);

    const nationalOutput=fibreOutput.find(r=>r.country_or_region==='Indonesia')
      || fibreOutput.find(r=>r.geographic_level==='COUNTRY')
      || fibreOutput.at(-1);

    const area=prod
      .filter(r=>r.statistic_name==='Reported sugar-palm estate area')
      .sort((a,b)=>a.year-b.year);

    const fixedArea=area
      .filter(r=>String(r.verification_status||'').includes('FIXED') || r.year<=2024)
      .sort((a,b)=>a.year-b.year)
      .at(-1);

    const latestArea=area.at(-1);
    const native=dist.filter(r=>r.distribution_type==='NATIVE_RANGE');
    const introduced=dist.filter(r=>r.distribution_type==='INTRODUCED_RANGE');
    const fibreOutputPlaces=dist.filter(r=>r.distribution_type==='COMMERCIAL_PRODUCTION');
    const availability=dist.filter(r=>r.distribution_type==='AVAILABILITY_SUMMARY');

    const hasGlobal=Boolean(prod.length||trade.length||dist.length);
    const hasMedia=Boolean(media.length);
    showGlobalControls(hasGlobal,hasMedia);

    if(!hasGlobal){
      if(q('#globalHeroMetrics')) q('#globalHeroMetrics').innerHTML='';
      if(q('#globalMetrics')) q('#globalMetrics').innerHTML='';
      return;
    }

    const globalTitle=L(
      'Produksi Ijuk, sumber daya Aren, dan sebaran',
      'Ijuk production, sugar-palm resource base, and distribution'
    );
    const heroTitle=q('#globalHero h3');
    const sectionTitle=q('#tab-global .section-title h3');
    const sectionDesc=q('#tab-global .section-title p');
    if(heroTitle) heroTitle.textContent=globalTitle;
    if(sectionTitle) sectionTitle.textContent=globalTitle;
    if(sectionDesc) sectionDesc.textContent=L(
      'Produksi serat terverifikasi dipisahkan dari luas tanaman Aren. Tidak ada angka perdagangan Ijuk yang ditampilkan tanpa klasifikasi produk yang benar-benar spesifik.',
      'Verified fibre output is separated from sugar-palm cultivation area. No numeric Ijuk trade figure is shown without a genuinely product-specific classification.'
    );

    const hero=media.find(r=>r.is_hero)||media[0];
    if(hero){
      const src=hero.asset_path||hero.original_file_url||'';
      const img=q('#heroFiberImage');
      if(img){
        img.src=src;
        img.alt=currentLang()==='id'?(hero.alt_text_id||hero.title||'Ijuk'):(hero.alt_text_en||hero.title||'Ijuk');
        img.style.visibility='visible';
        img.onerror=()=>{img.style.visibility='hidden';};
      }
      if(q('#heroMediaCredit')){
        q('#heroMediaCredit').innerHTML=`${htmlEsc(hero.attribution_text||hero.creator||'')} ${hero.license_name?`· ${htmlEsc(hero.license_name)}`:''}`;
      }
    }else{
      const img=q('#heroFiberImage');
      if(img){ img.removeAttribute('src'); img.style.visibility='hidden'; }
      if(q('#heroMediaCredit')) q('#heroMediaCredit').innerHTML='';
    }

    const outputText=nationalOutput
      ? `${safeFmt(nationalOutput.value)} ${htmlEsc(nationalOutput.unit||'t/year')}`
      : L('Belum ada angka terverifikasi','No verified figure');

    const fixedAreaText=fixedArea
      ? `${safeFmt(fixedArea.value)} ${htmlEsc(fixedArea.unit||'ha')}`
      : L('Belum tersedia','Not available');

    const tradeText=trade.length
      ? L('Ada record terpisah','Separate records available')
      : L('Tidak terisolasi','Not isolated');

    const globalSeriesText=L('Belum ditemukan','Not found');

    const metrics=[
      [L('Produksi Ijuk terverifikasi','Verified Ijuk output'), outputText, nationalOutput?String(nationalOutput.year):'—'],
      [L('Luas Aren tetap terbaru','Latest fixed sugar-palm area'), fixedAreaText, fixedArea?String(fixedArea.year):'—'],
      [L('Perdagangan numerik','Numeric trade'), tradeText, L('HS campuran tidak digunakan','Mixed HS code excluded')],
      [L('Seri produksi global Ijuk','Global Ijuk production series'), globalSeriesText, L('Kesenjangan data','Data gap')]
    ];
    const metricHtml=metrics.map(([k,v,y])=>
      `<div class="global-metric"><span>${htmlEsc(k)}</span><strong>${htmlEsc(v)}</strong><small>${htmlEsc(y)}</small></div>`
    ).join('');
    if(q('#globalHeroMetrics')) q('#globalHeroMetrics').innerHTML=metricHtml;
    if(q('#globalMetrics')) q('#globalMetrics').innerHTML=metricHtml;

    // Resource-base trend: hectares, explicitly NOT fibre output.
    setPanelTitle('#productionTrend',L(
      'Luas sumber daya tanaman Aren — Indonesia',
      'Sugar-palm host-resource area — Indonesia'
    ));
    const trendNote=q('#productionTrend')?.closest('.global-panel')?.querySelector('p.muted');
    if(trendNote) trendNote.textContent=L(
      'Satuan hektare. Ini bukan produksi Ijuk. 2025 adalah angka sementara dan 2026 merupakan estimasi resmi.',
      'Unit: hectares. This is not Ijuk fibre production. 2025 is preliminary and 2026 is an official estimate.'
    );

    const maxArea=Math.max(...area.map(r=>num(r.value)),1);
    if(q('#productionTrend')){
      q('#productionTrend').innerHTML=area.map(r=>{
        const qualifier=r.value_qualifier==='~'?'~':'';
        const flag=r.year===2025?L('sementara','prelim.'):r.year===2026?L('estimasi','estimate'):'';
        return `<div class="trend-col">
          <div class="trend-value">${qualifier}${safeFmt(r.value)}</div>
          <div class="trend-bar-wrap"><div class="trend-bar" style="height:${Math.max(8,100*num(r.value)/maxArea)}%"></div></div>
          <div class="trend-year">${r.year}${flag?`<small style="display:block">${htmlEsc(flag)}</small>`:''}</div>
        </div>`;
      }).join('') || '<div class="muted">—</div>';
    }

    // Verified fibre-output evidence. Do not pretend these are multiple independent producers.
    setPanelTitle('#producerBars',L(
      'Bukti produksi Ijuk yang terverifikasi',
      'Verified Ijuk production evidence'
    ));
    if(q('#producerBars')){
      const rows=[];
      if(nationalOutput){
        rows.push(`<div class="producer-row">
          <div class="producer-label"><b>Indonesia</b><span>${safeFmt(nationalOutput.value)} ${htmlEsc(nationalOutput.unit||'t/year')} · ${nationalOutput.year}</span></div>
          <div class="producer-track"><span style="width:100%"></span></div>
        </div>`);
      }
      const java=fibreOutputPlaces.find(r=>String(r.place_name||'').toLowerCase().includes('java'));
      if(java){
        rows.push(`<div class="distribution-card" style="margin-top:12px">
          <strong>${htmlEsc(java.place_name)}</strong>
          <p>${htmlEsc(java.description||'')}</p>
          <span>${htmlEsc(java.source_organization||'BPS')}</span>
        </div>`);
      }
      q('#producerBars').innerHTML=rows.join('') || `<div class="muted">${L('Belum ada angka terverifikasi','No verified figure')}</div>`;
    }

    setPanelTitle('#nativeRangeBox',L('Sebaran alami botani','Botanical native range'));
    if(q('#nativeRangeBox')){
      q('#nativeRangeBox').innerHTML=[
        ...native.map(r=>`<div class="distribution-card"><strong>${htmlEsc(r.place_name)}</strong><p>${htmlEsc(r.description||'')}</p><span>${htmlEsc(r.source_organization||'')}</span></div>`),
        ...introduced.map(r=>`<div class="distribution-card"><strong>${L('Wilayah introduksi','Introduced range')}</strong><p>${htmlEsc(r.description||'')}</p><span>${htmlEsc(r.source_organization||'')}</span></div>`)
      ].join('') || '<div class="muted">—</div>';
    }

    setPanelTitle('#commercialDistribution',L(
      'Ketersediaan sumber daya & bukti lokasi',
      'Resource availability & location evidence'
    ));
    if(q('#commercialDistribution')){
      const cards=availability.map(r=>
        `<div class="distribution-card" style="margin-bottom:10px"><strong>${htmlEsc(r.place_name)}</strong><p>${htmlEsc(r.description||'')}</p><span>${htmlEsc(r.source_organization||'')}</span></div>`
      );
      q('#commercialDistribution').innerHTML=cards.join('') || '<div class="muted">—</div>';
    }

    setPanelTitle('#historicalProduction',L(
      'Batas data & kesenjangan perdagangan',
      'Data boundaries & trade gap'
    ));
    const histNote=q('#historicalProduction')?.closest('.global-panel')?.querySelector('p.muted');
    if(histNote) histNote.textContent=L(
      'NatFiber tidak mengubah produksi gula Aren, luas perkebunan, atau HS 5305 campuran menjadi tonase Ijuk.',
      'NatFiber does not convert sugar-palm sugar production, plantation area, or mixed HS 5305 trade into Ijuk fibre tonnage.'
    );
    if(q('#historicalProduction')){
      const boundary=[
        L('Produksi serat: BPS 2021 = 129,69 t kategori Ijuk/Palm Fiber; nama botani tidak dinyatakan eksplisit pada tabel.','Fibre output: BPS 2021 = 129.69 t in the Ijuk/Palm Fiber category; botanical name is not explicit in the table.'),
        L('Luas Aren: hanya konteks sumber daya tanaman, bukan produksi serat.','Sugar-palm area: host-resource context only, not fibre output.'),
        L('Perdagangan: tidak ada angka yang dipublikasikan karena HS 5305 mencampur beberapa serat nabati.','Trade: no numeric value is published because HS 5305 combines several vegetable fibres.'),
        L('Produksi global tahunan Ijuk: belum ditemukan seri resmi yang terisolasi.','Annual global Ijuk production: no isolated official series has been located.')
      ];
      q('#historicalProduction').innerHTML=boundary.map((x,i)=>
        `<span class="history-chip"><b>${i+1}</b> ${htmlEsc(x)}</span>`
      ).join('');
    }
  }

  renderGlobalFootprint = function(p){
    if(p?.fiber?.fiber_id==='NF-0001'){
      return renderIjukGlobal(p);
    }
    return baseRenderGlobalFootprint(p);
  };

  // If the profile resolved before this override loaded, refresh only the global block.
  try{
    if(typeof currentProfile!=='undefined' && currentProfile){
      renderGlobalFootprint(currentProfile);
    }
  }catch(e){
    console.warn('[NatFiber] Global renderer refresh skipped:',e);
  }

  console.info('[NatFiber] Fiber-aware public Global renderer v1.3 loaded.');
})();
