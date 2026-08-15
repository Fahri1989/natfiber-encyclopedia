/*
 NatFiber Encyclopedia — Quality Certification Badge v1.0
 Reads public certification metadata from Supabase.
 Generic: will work for any future certified fiber.
*/
(function(){
  'use strict';

  const CFG=window.NATFIBER_CONFIG||{};
  const $=s=>document.querySelector(s);
  let lastFiber=null, lastLang=null, loading=false;

  function lang(){
    try{return window.NF_I18N?.getLang?.()||localStorage.getItem('natfiber_lang')||'id';}
    catch{return'id';}
  }
  function L(id,en){return lang()==='id'?id:en;}
  function esc(v=''){
    return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function fiberId(){return ($('#fiberId')?.textContent||'').trim();}

  function addStyle(){
    if($('#nfQualityStyle'))return;
    const s=document.createElement('style');
    s.id='nfQualityStyle';
    s.textContent=`
      .nf-quality-badge{display:inline-flex;align-items:center;gap:7px;margin-left:8px;padding:5px 9px;border-radius:999px;background:#f1e7b7;color:#604a08;font-size:9px;font-weight:900;letter-spacing:.04em;vertical-align:middle}
      .nf-quality-badge::before{content:"★";font-size:10px}
      .nf-quality-box{margin:14px 0 18px;padding:16px 18px;border:1px solid #ddcf8b;background:linear-gradient(135deg,#fffdf4,#f7f0cd);border-radius:16px}
      .nf-quality-box-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;flex-wrap:wrap}
      .nf-quality-box h4{margin:0;color:#4e3d09;font-size:15px}
      .nf-quality-box p{margin:6px 0 0;color:#6b6040;font-size:10.5px;line-height:1.55;max-width:820px}
      .nf-quality-version{font-size:9px;font-weight:850;padding:4px 7px;border-radius:999px;background:#fff7d5;color:#6d5310;border:1px solid #e2d48b}
      .nf-quality-gaps{margin-top:12px;padding-top:11px;border-top:1px solid #e8ddb0}
      .nf-quality-gaps summary{cursor:pointer;font-size:10px;font-weight:800;color:#62501c}
      .nf-quality-gaps ul{margin:9px 0 0 18px;padding:0;color:#6d654f;font-size:9.5px;line-height:1.55}
    `;
    document.head.appendChild(s);
  }

  async function fetchCertification(id){
    if(!CFG.supabaseUrl||!CFG.publishableKey||loading)return null;
    loading=true;
    try{
      const url=new URL(`${CFG.supabaseUrl}/rest/v1/fiber_quality_certifications`);
      url.searchParams.set('select','fiber_id,quality_tier,standard_version,qa_status,public_label_id,public_label_en,certification_note,explicit_gaps,certified_at');
      url.searchParams.set('fiber_id',`eq.${id}`);
      url.searchParams.set('is_current','eq.true');
      url.searchParams.set('is_public','eq.true');
      url.searchParams.set('limit','1');
      const res=await fetch(url,{headers:{apikey:CFG.publishableKey}});
      if(!res.ok)return null;
      const rows=await res.json();
      return rows?.[0]||null;
    }catch{return null;}
    finally{loading=false;}
  }

  function removeCertification(){
    $('#nfQualityBadge')?.remove();
    $('#nfQualityBox')?.remove();
  }

  function label(c){
    return lang()==='id'?(c.public_label_id||'Gold-Standard Record'):(c.public_label_en||'Gold-Standard Record');
  }

  function gapText(g){
    const map={
      'Modern voucher-quality close-up raw Ijuk fibre image still desirable':
        L('Foto close-up serat Ijuk modern dengan voucher/taxonomic certainty tinggi masih diinginkan.','Modern voucher-quality close-up raw Ijuk fibre image is still desirable.'),
      'Extraction/process image remains source-only until file-level reuse is verified':
        L('Gambar ekstraksi/proses tetap SOURCE_ONLY sampai reuse file-level terverifikasi.','Extraction/process image remains SOURCE_ONLY until file-level reuse is verified.'),
      'DTG raw-fibre figure-level mapping remains partial':
        L('Pemetaan DTG raw-fibre pada level figure masih parsial.','Raw-fibre DTG figure-level mapping remains partial.'),
      'Intrinsic-fibre DSC not found':
        L('DSC intrinsic-fibre belum ditemukan.','Intrinsic-fibre DSC has not been found.'),
      'Intrinsic-fibre XRF not found':
        L('XRF intrinsic-fibre belum ditemukan.','Intrinsic-fibre XRF has not been found.'),
      'No isolated annual world Ijuk fibre production series located':
        L('Belum ditemukan seri tahunan produksi dunia Ijuk yang terisolasi.','No isolated annual world Ijuk fibre production series has been located.'),
      'No Ijuk-specific numeric trade series isolated from mixed HS classifications':
        L('Belum ada seri perdagangan numerik spesifik Ijuk yang dapat dipisahkan dari HS campuran.','No Ijuk-specific numeric trade series has been isolated from mixed HS classifications.')
    };
    return map[g]||g;
  }

  function render(c){
    removeCertification();
    if(!c||c.qa_status!=='CERTIFIED')return;

    const idline=$('.profile-head .idline');
    if(idline){
      const badge=document.createElement('span');
      badge.id='nfQualityBadge';
      badge.className='nf-quality-badge';
      badge.textContent=label(c);
      idline.appendChild(badge);
    }

    const summary=$('#datasetSummary');
    if(summary){
      const box=document.createElement('section');
      box.id='nfQualityBox';
      box.className='nf-quality-box';
      const gaps=Array.isArray(c.explicit_gaps)?c.explicit_gaps:[];
      box.innerHTML=`
        <div class="nf-quality-box-head">
          <div>
            <h4>★ ${esc(label(c))}</h4>
            <p>${esc(L(
              'Record ini telah melewati source-resolved enrichment, verifikasi evidence, review lisensi media, audit produksi/distribusi, dan QA tampilan publik. Status Gold Standard tidak berarti semua gap harus terisi; gap yang belum terverifikasi justru dipertahankan secara eksplisit.',
              'This record has passed source-resolved enrichment, evidence verification, media-licensing review, production/distribution audit, and public-display QA. Gold Standard does not mean every gap must be filled; unresolved gaps are preserved explicitly.'
            ))}</p>
          </div>
          <span class="nf-quality-version">${esc(c.standard_version||'')}</span>
        </div>
        ${gaps.length?`<details class="nf-quality-gaps">
          <summary>${esc(L(`Kesenjangan eksplisit yang masih terbuka (${gaps.length})`,`Explicit gaps still open (${gaps.length})`))}</summary>
          <ul>${gaps.map(g=>`<li>${esc(gapText(g))}</li>`).join('')}</ul>
        </details>`:''}`;
      summary.insertAdjacentElement('afterend',box);
    }
  }

  async function refresh(){
    const id=fiberId(), lg=lang();
    if(!/^NF-\d{4}$/.test(id))return;
    if(id===lastFiber&&lg===lastLang&&$('#nfQualityBox'))return;
    lastFiber=id;lastLang=lg;
    const c=await fetchCertification(id);
    render(c);
  }

  function boot(){
    addStyle();
    const root=$('#fiberProfile')||document.body;
    const obs=new MutationObserver(()=>{clearTimeout(window.__nfQualityTimer);window.__nfQualityTimer=setTimeout(refresh,100);});
    obs.observe(root,{subtree:true,childList:true,characterData:true});
    document.addEventListener('click',e=>{
      if(e.target.closest('.language-switch [data-lang]'))setTimeout(refresh,120);
    },true);
    setTimeout(refresh,400);
    console.info('[NatFiber] Quality Certification Badge v1.0 loaded.');
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
