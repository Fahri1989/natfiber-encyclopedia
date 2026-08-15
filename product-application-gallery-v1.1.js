import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
/*
 NatFiber Encyclopedia — Product Application Gallery v1.1
 Generic public renderer for traditional/conventional and modern/engineering product media.
 Data source: get_natfiber_product_gallery(fiber_id)
*/
(function(){
  'use strict';

  const CFG=window.NATFIBER_CONFIG||{};
  const sb=createClient(CFG.supabaseUrl,CFG.publishableKey);
  const STORAGE_BUCKET='natfiber-product-media';
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  let currentFiber=null, currentRows=[], requestSerial=0, lastLang=null;

  function lang(){
    try{return window.NF_I18N?.getLang?.()||localStorage.getItem('natfiber_lang')||'id';}
    catch{return'id';}
  }
  function L(id,en){return lang()==='id'?id:en;}
  function esc(v=''){
    return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function safeUrl(v){
    try{
      const u=new URL(v||'',location.href);
      return ['http:','https:'].includes(u.protocol)?u.href:'';
    }catch{return'';}
  }
  function mediaSrc(m){
    return safeUrl(m?.__signed_url||m?.original_file_url||'');
  }

  async function resolveStoredImages(rows){
    await Promise.all((rows||[]).map(async r=>{
      const path=r?.media?.asset_path;
      if(!path)return;
      try{
        const {data,error}=await sb.storage.from(STORAGE_BUCKET).createSignedUrl(path,3600);
        if(!error&&data?.signedUrl)r.media.__signed_url=data.signedUrl;
      }catch(e){
        console.warn('[NatFiber] signed product image unavailable',path,e);
      }
    }));
    return rows;
  }
  function labelStage(v){
    return v==='INTERMEDIATE_MATERIAL'?L('Material antara','Intermediate material'):L('Produk jadi','Finished product');
  }
  function labelMaturity(v){
    const id={COMMERCIAL:'Komersial',DEMONSTRATED:'Terdemonstrasi',EXPERIMENTAL:'Eksperimental',PROPOSED:'Diusulkan'};
    const en={COMMERCIAL:'Commercial',DEMONSTRATED:'Demonstrated',EXPERIMENTAL:'Experimental',PROPOSED:'Proposed'};
    return (lang()==='id'?id:en)[v]||v||'—';
  }
  function labelEvidence(v){
    const id={
      SOURCE_EXPLICIT_PRODUCT_FIBER:'Hubungan produk–serat eksplisit',
      SOURCE_EXPLICIT_PRODUCT_MATERIAL:'Material produk dinyatakan sumber',
      RESEARCH_PROTOTYPE:'Prototipe riset terverifikasi',
      HISTORICAL_DOCUMENTATION:'Dokumentasi historis',
      CONTEXT_ONLY:'Konteks saja'
    };
    const en={
      SOURCE_EXPLICIT_PRODUCT_FIBER:'Explicit product–fibre link',
      SOURCE_EXPLICIT_PRODUCT_MATERIAL:'Product material stated by source',
      RESEARCH_PROTOTYPE:'Verified research prototype',
      HISTORICAL_DOCUMENTATION:'Historical documentation',
      CONTEXT_ONLY:'Context only'
    };
    return (lang()==='id'?id:en)[v]||v||'';
  }

  function addStyle(){
    if($('#nfProductGalleryStyle'))return;
    const s=document.createElement('style');
    s.id='nfProductGalleryStyle';
    s.textContent=`
      .nf-product-gallery{margin:18px 0 28px}
      .nf-product-intro{display:grid;grid-template-columns:1.3fr .7fr;gap:18px;align-items:end;margin-bottom:16px}
      .nf-product-intro h4{font-size:22px;margin:3px 0 6px;color:#173f33}
      .nf-product-intro p{margin:0;color:#65736d;font-size:11.5px;line-height:1.6;max-width:720px}
      .nf-product-counts{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap}
      .nf-product-count{min-width:88px;border:1px solid #dce6e1;background:#fff;border-radius:13px;padding:10px 12px}
      .nf-product-count strong{display:block;font-size:19px;color:#173f33}.nf-product-count span{font-size:8.5px;color:#718079;text-transform:uppercase;font-weight:800}
      .nf-product-value-chain{display:flex;align-items:center;gap:8px;margin:10px 0 17px;overflow:auto;padding-bottom:2px}
      .nf-product-chain-node{white-space:nowrap;padding:7px 10px;border-radius:999px;background:#edf5f1;border:1px solid #d8e6df;font-size:9px;font-weight:800;color:#426258}
      .nf-product-chain-arrow{color:#8ca198;font-size:12px}
      .nf-product-groups{display:grid;grid-template-columns:1fr 1fr;gap:16px}
      .nf-product-group{border:1px solid #dce6e1;background:#f8fbf9;border-radius:18px;padding:15px}
      .nf-product-group-head{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:12px}
      .nf-product-group-head h5{margin:0;font-size:15px;color:#173f33}.nf-product-group-head span{font-size:9px;font-weight:850;padding:4px 7px;border-radius:999px;background:#e2efe8;color:#245c48}
      .nf-product-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}
      .nf-product-card{background:#fff;border:1px solid #dfe8e4;border-radius:15px;overflow:hidden;min-width:0}
      .nf-product-image{aspect-ratio:4/3;background:#edf3f0;position:relative;overflow:hidden}
      .nf-product-image img{width:100%;height:100%;object-fit:cover;display:block}
      .nf-product-image-fallback{position:absolute;inset:0;display:grid;place-items:center;padding:14px;text-align:center;color:#7c8b84;font-size:10px}
      .nf-product-card-body{padding:12px}
      .nf-product-badges{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:7px}
      .nf-product-badge{font-size:8px;font-weight:850;padding:3px 6px;border-radius:999px;background:#e6f3ec;color:#245d49}
      .nf-product-badge.stage{background:#eef0f7;color:#48536d}.nf-product-badge.evidence{background:#fff3d9;color:#795719}
      .nf-product-card h6{font-size:13px;margin:0 0 6px;color:#17372e}
      .nf-product-card p{font-size:9.5px;line-height:1.5;color:#687871;margin:0 0 8px}
      .nf-product-meta{font-size:8.5px;color:#7b8983;line-height:1.45;margin-top:7px}
      .nf-product-links{display:flex;gap:8px;flex-wrap:wrap;margin-top:9px}
      .nf-product-links a{font-size:9px;font-weight:800;color:#176047;text-decoration:none}
      .nf-product-empty{padding:22px 14px;border:1px dashed #b9c9c1;background:#fff;border-radius:13px;color:#6f8078;text-align:center;font-size:10px;line-height:1.55}
      .nf-product-policy{margin-top:12px;padding:11px 13px;border-left:4px solid #2e8064;background:#eef5f1;border-radius:9px;font-size:9.5px;color:#53665d;line-height:1.5}
      @media(max-width:950px){.nf-product-intro{grid-template-columns:1fr}.nf-product-counts{justify-content:flex-start}.nf-product-groups{grid-template-columns:1fr}}
      @media(max-width:620px){.nf-product-cards{grid-template-columns:1fr}}
    `;
    document.head.appendChild(s);
  }

  function ensureUI(){
    const panel=$('#tab-applications');
    if(!panel)return null;
    let host=$('#nfProductApplicationGallery');
    if(!host){
      host=document.createElement('section');
      host.id='nfProductApplicationGallery';
      host.className='nf-product-gallery';
      const grid=$('#applicationGrid');
      if(grid) grid.before(host); else panel.appendChild(host);
    }
    return host;
  }

  function card(r){
    const m=r.media||{};
    const image=mediaSrc(m);
    const source=safeUrl(m.source_page_url);
    const license=safeUrl(m.license_url);
    const name=lang()==='id'?r.product_name_id:r.product_name_en;
    const desc=lang()==='id'?(r.product_description_id||''):(r.product_description_en||'');
    const cat=r.product_category||r.application?.application_sector||'';
    return `<article class="nf-product-card">
      <div class="nf-product-image">
        ${image?`<img loading="lazy" src="${esc(image)}" alt="${esc(lang()==='id'?(m.alt_text_id||name):(m.alt_text_en||name))}">`:''}
        <div class="nf-product-image-fallback" ${image?'hidden':''}>${esc(L('Preview gambar tidak tersedia. Metadata produk tetap dapat ditelusuri.','Image preview unavailable. Product metadata remains traceable.'))}</div>
      </div>
      <div class="nf-product-card-body">
        <div class="nf-product-badges">
          <span class="nf-product-badge stage">${esc(labelStage(r.value_chain_stage))}</span>
          ${r.maturity_level?`<span class="nf-product-badge">${esc(labelMaturity(r.maturity_level))}</span>`:''}
          <span class="nf-product-badge evidence">${esc(labelEvidence(r.evidence_relation))}</span>
        </div>
        <h6>${esc(name||m.title||'Product')}</h6>
        ${desc?`<p>${esc(desc)}</p>`:''}
        ${cat?`<div class="nf-product-meta"><b>${esc(L('Kategori','Category'))}:</b> ${esc(cat)}</div>`:''}
        <div class="nf-product-meta"><b>${esc(L('Verifikasi','Verification'))}:</b> ${esc(String(r.verification_status||'').replaceAll('_',' '))}</div>
        ${m.attribution_text?`<div class="nf-product-meta"><b>${esc(L('Atribusi','Attribution'))}:</b> ${esc(m.attribution_text)}</div>`:''}
        <div class="nf-product-links">
          ${source?`<a href="${esc(source)}" target="_blank" rel="noopener">${esc(L('Sumber foto','Photo source'))} ↗</a>`:''}
          ${license?`<a href="${esc(license)}" target="_blank" rel="noopener">${esc(m.license_name||L('Lisensi','License'))} ↗</a>`:''}
        </div>
      </div>
    </article>`;
  }

  function group(rows,cls){
    const traditional=cls==='TRADITIONAL';
    const title=traditional?L('Pemanfaatan konvensional / tradisional','Conventional / traditional applications'):L('Pemanfaatan modern / rekayasa','Modern / engineering applications');
    const subtitle=traditional?L('Produk yang telah lama digunakan dalam rumah tangga, kerajinan, pertanian, perikanan, atau praktik lokal.','Long-established household, craft, agricultural, fisheries, or local-use products.'):L('Produk rekayasa, industri, komposit, fungsional, atau prototipe yang menggunakan serat/material turunannya.','Engineering, industrial, composite, functional, or prototype products using the fibre or its derived material.');
    return `<section class="nf-product-group">
      <div class="nf-product-group-head"><div><h5>${esc(title)}</h5><small>${esc(subtitle)}</small></div><span>${rows.length}</span></div>
      ${rows.length?`<div class="nf-product-cards">${rows.map(card).join('')}</div>`:`<div class="nf-product-empty">${esc(L('Belum ada foto produk berlisensi dan terverifikasi dalam kategori ini. Kesenjangan ini dipertahankan daripada menggunakan gambar yang identitas produknya tidak pasti.','No licensed, verified product photo is available in this category yet. This gap is preserved rather than using imagery with uncertain product identity.'))}</div>`}
    </section>`;
  }

  function render(){
    const host=ensureUI();
    if(!host)return;
    const traditional=currentRows.filter(r=>r.application_class==='TRADITIONAL');
    const modern=currentRows.filter(r=>r.application_class==='MODERN_ENGINEERING');
    const intermediate=currentRows.filter(r=>r.value_chain_stage==='INTERMEDIATE_MATERIAL').length;
    const finished=currentRows.filter(r=>r.value_chain_stage==='FINISHED_PRODUCT').length;
    host.innerHTML=`
      <div class="nf-product-intro">
        <div>
          <span class="eyebrow">${esc(L('DARI SERAT MENJADI PRODUK','FROM FIBRE TO PRODUCT'))}</span>
          <h4>${esc(L('Galeri produk aplikasi','Application Product Gallery'))}</h4>
          <p>${esc(L(
            'Foto produk menghubungkan data serat dengan pemanfaatan nyata. NatFiber memisahkan aplikasi konvensional/tradisional dari aplikasi modern/rekayasa, dan hanya menampilkan media dengan sumber, lisensi, serta hubungan produk–serat yang dapat ditelusuri.',
            'Product imagery connects fibre data with real-world use. NatFiber separates conventional/traditional applications from modern/engineering applications and only displays media with traceable source, licence, and product–fibre evidence.'
          ))}</p>
        </div>
        <div class="nf-product-counts">
          <div class="nf-product-count"><strong>${currentRows.length}</strong><span>${esc(L('Foto produk','Product media'))}</span></div>
          <div class="nf-product-count"><strong>${intermediate}</strong><span>${esc(L('Material antara','Intermediate'))}</span></div>
          <div class="nf-product-count"><strong>${finished}</strong><span>${esc(L('Produk jadi','Finished'))}</span></div>
        </div>
      </div>
      <div class="nf-product-value-chain">
        <span class="nf-product-chain-node">${esc(L('Tanaman / sumber','Plant / source'))}</span><span class="nf-product-chain-arrow">→</span>
        <span class="nf-product-chain-node">${esc(L('Serat mentah','Raw fibre'))}</span><span class="nf-product-chain-arrow">→</span>
        <span class="nf-product-chain-node">${esc(L('Material antara','Intermediate material'))}</span><span class="nf-product-chain-arrow">→</span>
        <span class="nf-product-chain-node">${esc(L('Produk jadi','Finished product'))}</span>
      </div>
      <div class="nf-product-groups">${group(traditional,'TRADITIONAL')}${group(modern,'MODERN_ENGINEERING')}</div>
      <div class="nf-product-policy"><strong>${esc(L('Kebijakan media produk:','Product-media policy:'))}</strong> ${esc(L(
        'Gambar tidak dimasukkan hanya karena secara visual “mirip” produk serat alam. Sumber harus menyatakan hubungan produk/material dengan serat, dan hak penggunaan gambar diperiksa terpisah. Gambar AI tidak digunakan sebagai bukti produk.',
        'Images are not admitted merely because they visually resemble a natural-fibre product. The source must state the product/material link to the fibre, and image reuse rights are assessed separately. AI-generated images are not used as product evidence.'
      ))}</div>`;
    host.querySelectorAll('.nf-product-image img').forEach(img=>img.addEventListener('error',()=>{
      img.style.display='none';
      const f=img.parentElement.querySelector('.nf-product-image-fallback');
      if(f)f.hidden=false;
    },{once:true}));

    let summary=$('#nfProductSummaryItem');
    if(currentRows.length){
      if(!summary){
        summary=document.createElement('div');
        summary.id='nfProductSummaryItem';
        summary.className='summary-item';
        $('#datasetSummary')?.appendChild(summary);
      }
      summary.innerHTML=`<strong>${currentRows.length}</strong><span>${esc(L('Media produk','Product media'))}</span>`;
    }else summary?.remove();
  }

  async function load(fiberId){
    const serial=++requestSerial;
    try{
      const res=await fetch(`${CFG.supabaseUrl}/rest/v1/rpc/get_natfiber_product_gallery`,{
        method:'POST',
        headers:{apikey:CFG.publishableKey,'Content-Type':'application/json'},
        body:JSON.stringify({target_fiber_id:fiberId})
      });
      if(!res.ok)throw new Error(`${res.status}`);
      const rows=await res.json();
      if(serial!==requestSerial)return;
      currentRows=await resolveStoredImages(Array.isArray(rows)?rows:[]);
    }catch(e){
      console.warn('[NatFiber] product gallery load failed',e);
      currentRows=[];
    }
    render();
  }

  function watch(){
    const id=($('#fiberId')?.textContent||'').trim();
    const lg=lang();
    if(/^NF-\d{4}$/.test(id)&&(id!==currentFiber||lg!==lastLang)){
      currentFiber=id;lastLang=lg;
      load(id);
    }
  }

  function boot(){
    addStyle();ensureUI();
    setInterval(watch,650);
    document.addEventListener('click',e=>{
      if(e.target.closest('.language-switch [data-lang]'))setTimeout(()=>{lastLang=null;watch();},100);
    });
    watch();
    console.info('[NatFiber] Product Application Gallery v1.1 loaded.');
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
