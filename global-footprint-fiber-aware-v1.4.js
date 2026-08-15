/*
 NatFiber Encyclopedia
 Public Global Footprint Renderer v1.4
 Fiber-aware renderer for NF-0001 Ijuk.
 v1.4 QA corrections:
 - BPS 2021 is labelled as REPORTED "Ijuk/Palm Fiber" commodity output,
   not species-resolved global Arenga pinnata production.
 - Sugar-palm area remains resource-base context only.
 - Mixed HS codes remain excluded from Ijuk trade.
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
    const heroDesc=q('#globalHero .global-hero-content > p');
    const sectionDesc=q('#tab-global .section-title p');

    if(heroTitle) heroTitle.textContent=globalTitle;
    if(sectionTitle) sectionTitle.textContent=globalTitle;
    const desc=L(
      'Output komoditas Ijuk/Palm Fiber yang dilaporkan dipisahkan dari luas tanaman Aren. NatFiber tidak menganggap angka BPS ini sebagai seri produksi dunia Arenga pinnata.',
      'Reported Ijuk/Palm Fiber commodity output is separated from sugar-palm cultivation area. NatFiber does not treat the BPS figure as a world Arenga pinnata production series.'
    );
    if(heroDesc) heroDesc.textContent=desc;
    if(sectionDesc) sectionDesc.textContent=desc;

    const hero=media.find(r=>r.is_hero)||media[0];
    if(hero){
      const src=hero.asset_path||hero.original_file_url||'';
      const img=q('#heroFiberImage');
      if(img){
        img.src=src;
        img.alt=currentLang()==='id'?(hero.alt_text_id||hero.title||'Ijuk'):(hero.alt_text_en||hero.title||'Ijuk');
        img.style.visibility='visible';
        img.onerror=()=>{img.style.visibility='hidden';};
        img.onload=()=>{img.style.visibility='visible';};
      }
      if(q('#heroMediaCredit')){
        const licenseLink = hero.license_url
          ? `<a href="${htmlEsc(hero.license_url)}" target="_blank" rel="noopener">${htmlEsc(hero.license_name||'License')}</a>`
          : htmlEsc(hero.license_name||'');
        q('#heroMediaCredit').innerHTML=`${htmlEsc(hero.attribution_text||hero.creator||'')}${licenseLink?` · ${licenseLink}`:''}`;
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

    const outputLabel=L(
      'Output terlapor Ijuk/Palm Fiber — Indonesia',
      'Reported Ijuk/Palm Fiber output — Indonesia'
    );
    const outputNote=nationalOutput
      ? `${nationalOutput.year} · ${L('kategori komoditas BPS; caveat taksonomi','BPS commodity category; taxonomic caveat')}`
      : '—';

    const metrics=[
      [outputLabel, outputText, outputNote],
      [L('Luas Aren tetap terbaru','Latest fixed sugar-palm area'), fixedAreaText, fixedArea?`${fixedArea.year} · ${L('resource base, bukan produksi serat','resource base, not fibre output')}`:'—'],
      [L('Perdagangan numerik Ijuk','Numeric Ijuk trade'), tradeText, L('HS campuran tidak digunakan','Mixed HS code excluded')],
      [L('Seri produksi dunia Ijuk','World Ijuk production series'), globalSeriesText, L('Kesenjangan data eksplisit','Explicit data gap')]
    ];
    const metricHtml=metrics.map(([k,v,y])=>
      `<div class="global-metric"><span>${htmlEsc(k)}</span><strong>${htmlEsc(v)}</strong><small>${htmlEsc(y)}</small></div>`
    ).join('');
    if(q('#globalHeroMetrics')) q('#globalHeroMetrics').innerHTML=metricHtml;
    if(q('#globalMetrics')) q('#globalMetrics').innerHTML=metricHtml;

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

    setPanelTitle('#producerBars',L(
      'Bukti output komoditas Ijuk/Palm Fiber',
      'Reported Ijuk/Palm Fiber commodity evidence'
    ));
    if(q('#producerBars')){
      const rows=[];
      if(nationalOutput){
        rows.push(`<div class="producer-row">
          <div class="producer-label"><b>Indonesia</b><span>${safeFmt(nationalOutput.value)} ${htmlEsc(nationalOutput.unit||'t/year')} · ${nationalOutput.year}</span></div>
          <div class="producer-track"><span style="width:100%"></span></div>
        </div>
        <div class="nf-v14-caveat">${L(
          'BPS menyebut kategori Ijuk/Palm Fiber, tetapi tidak menyatakan nama botani Arenga pinnata pada tabel. Angka ini tidak digeneralisasi sebagai produksi dunia.',
          'BPS reports the Ijuk/Palm Fiber category but does not state Arenga pinnata in the table. This value is not generalized as world production.'
        )}</div>`);
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
      q('#commercialDistribution').innerHTML=availability.map(r=>
        `<div class="distribution-card" style="margin-bottom:10px"><strong>${htmlEsc(r.place_name)}</strong><p>${htmlEsc(r.description||'')}</p><span>${htmlEsc(r.source_organization||'')}</span></div>`
      ).join('') || '<div class="muted">—</div>';
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
        L('Output serat: BPS 2021 = 129,69 t kategori Ijuk/Palm Fiber; nama botani tidak dinyatakan eksplisit pada tabel.','Fibre output: BPS 2021 = 129.69 t in the Ijuk/Palm Fiber category; botanical name is not explicit in the table.'),
        L('Luas Aren: hanya konteks sumber daya tanaman, bukan produksi serat.','Sugar-palm area: host-resource context only, not fibre output.'),
        L('Perdagangan: tidak ada angka Ijuk spesifik yang dipublikasikan karena HS 5305 mencampur beberapa serat nabati.','Trade: no Ijuk-specific numeric value is published because HS 5305 combines several vegetable fibres.'),
        L('Produksi dunia tahunan Ijuk: belum ditemukan seri resmi yang terisolasi.','Annual world Ijuk production: no isolated official series has been located.')
      ];
      q('#historicalProduction').innerHTML=boundary.map((x,i)=>
        `<span class="history-chip"><b>${i+1}</b> ${htmlEsc(x)}</span>`
      ).join('');
    }
  }

  renderGlobalFootprint = function(p){
    if(p?.fiber?.fiber_id==='NF-0001') return renderIjukGlobal(p);
    return baseRenderGlobalFootprint(p);
  };

  try{
    if(typeof currentProfile!=='undefined' && currentProfile) renderGlobalFootprint(currentProfile);
  }catch(e){
    console.warn('[NatFiber] Global renderer refresh skipped:',e);
  }

  console.info('[NatFiber] Fiber-aware public Global renderer v1.4 loaded.');
})();
