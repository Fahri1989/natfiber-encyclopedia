/* NatFiber Encyclopedia — NF-0005 Hemp Public Media Fix v1.0 */
(function(){
'use strict';
const CFG=window.NATFIBER_CONFIG||{},$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=(v='')=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const lang=()=>{try{return window.NF_I18N?.getLang?.()||localStorage.getItem('natfiber_lang')||'id'}catch{return'id'}};
const L=(id,en)=>lang()==='id'?id:en;
const currentFiber=()=>($('#fiberId')?.textContent||'').trim();
let cache=null,busy=false;

async function profile(){
  if(cache?.fiber?.fiber_id==='NF-0005') return cache;
  if(!CFG.supabaseUrl||!CFG.publishableKey||busy) return cache;
  busy=true;
  try{
    const r=await fetch(`${CFG.supabaseUrl}/rest/v1/rpc/get_natfiber_profile`,{
      method:'POST',
      headers:{apikey:CFG.publishableKey,'Content-Type':'application/json'},
      body:JSON.stringify({target_fiber_id:'NF-0005'})
    });
    if(!r.ok) throw new Error('get_natfiber_profile failed');
    cache=await r.json();
    return cache;
  }catch(e){ console.error('[NatFiber] Hemp profile error',e); return null; }
  finally{ busy=false; }
}

function safeUrl(v){
  try{ const u=new URL(v||'',location.href); return ['http:','https:'].includes(u.protocol)?u.href:''; }
  catch{ return ''; }
}
function mediaSrc(m){ return safeUrl(m?.asset_path||m?.original_file_url||''); }

function addStyle(){
  if($('#nfHempPublicStyle')) return;
  const s=document.createElement('style');
  s.id='nfHempPublicStyle';
  s.textContent=`
    .nf-hemp-gallery{margin-top:18px}
    .nf-hemp-gallery h4{font-size:22px;margin:0 0 6px;color:#173f33}
    .nf-hemp-gallery p{margin:0 0 14px;color:#65736d;font-size:11.5px;line-height:1.6}
    .nf-hemp-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
    .nf-hemp-card{border:1px solid #dce6e1;background:#fff;border-radius:16px;overflow:hidden}
    .nf-hemp-card-media{aspect-ratio:4/3;background:#edf4f0;position:relative}
    .nf-hemp-card-media img{width:100%;height:100%;object-fit:cover;display:block}
    .nf-hemp-card-body{padding:12px}
    .nf-hemp-card-body h5{margin:0 0 6px;font-size:14px;color:#17372e}
    .nf-hemp-card-body p{margin:0 0 8px;font-size:10px;line-height:1.5;color:#687871}
    .nf-hemp-badges{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:7px}
    .nf-hemp-badge{font-size:8px;font-weight:850;padding:3px 6px;border-radius:999px;background:#e6f3ec;color:#245d49}
    .nf-hemp-credit{font-size:8.5px;color:#728079}
    .nf-hemp-fallback{margin-top:10px;padding:11px 13px;border:1px solid #d8e5df;background:#f5f9f7;border-radius:11px;font-size:10.5px;color:#52665e}
    @media(max-width:960px){.nf-hemp-grid{grid-template-columns:repeat(2,minmax(0,1fr));}}
    @media(max-width:640px){.nf-hemp-grid{grid-template-columns:1fr;}}
  `;
  document.head.appendChild(s);
}

function showTabs(hasGlobal,hasGallery){
  const hero=$('#globalHero'), gtab=$('.tab[data-tab="global"]'), gal=$('.tab[data-tab="gallery"]');
  if(hero){ const any=hasGlobal||hasGallery; hero.hidden=!any; hero.style.display=any?'':'none'; }
  if(gtab){ gtab.hidden=!hasGlobal; gtab.style.display=hasGlobal?'':'none'; }
  if(gal){ gal.hidden=!hasGallery; gal.style.display=hasGallery?'':'none'; }
}

function setHero(media){
  const hero=media.find(x=>x.is_hero)||media[0];
  if(!hero) return false;
  const src=mediaSrc(hero); if(!src) return false;
  const img=$('#heroFiberImage');
  if(img){
    img.src=src;
    img.alt=(lang()==='id'?(hero.alt_text_id||hero.title):(hero.alt_text_en||hero.title))||'Hemp';
    img.style.visibility='visible';
    img.onerror=()=>{img.style.visibility='hidden';};
    img.onload=()=>{img.style.visibility='visible';};
  }
  const cr=$('#heroMediaCredit');
  if(cr){
    cr.innerHTML=`${esc(hero.attribution_text||hero.creator||'')}${hero.license_url?` · <a href="${esc(hero.license_url)}" target="_blank" rel="noopener">${esc(hero.license_name||'License')}</a>`:''}`;
  }
  return true;
}

function renderGalleryCards(rows){
  const tab=$('#tab-gallery'); if(!tab) return;
  let mount=$('#nfHempPublicGallery');
  if(!mount){
    mount=document.createElement('section');
    mount.id='nfHempPublicGallery';
    mount.className='nf-hemp-gallery';
    tab.innerHTML='';
    tab.appendChild(mount);
  }
  const cards=rows.filter(r=>mediaSrc(r)).slice(0,9).map(r=>{
    const src=mediaSrc(r);
    const title=r.title||r.product_name_en||r.product_name_id||r.media_scope||'Hemp media';
    const desc=(lang()==='id'?(r.description_id||r.product_description_id):(r.description_en||r.product_description_en))||r.what_image_shows||'';
    const badges=[r.media_scope,r.product_category,r.application_class].filter(Boolean).slice(0,3).map(b=>`<span class="nf-hemp-badge">${esc(b)}</span>`).join('');
    const credit=[r.creator||r.attribution_text,r.license_name].filter(Boolean).join(' · ');
    return `<article class="nf-hemp-card"><div class="nf-hemp-card-media"><img src="${src}" alt="${esc(title)}" loading="lazy" onerror="this.closest('.nf-hemp-card').style.display='none'"></div><div class="nf-hemp-card-body"><div class="nf-hemp-badges">${badges}</div><h5>${esc(title)}</h5><p>${esc(desc)}</p><div class="nf-hemp-credit">${esc(credit)}</div></div></article>`;
  }).join('');
  mount.innerHTML=`<h4>${L('Galeri visual Hemp','Hemp visual gallery')}</h4><p>${L('Galeri ini menampilkan hemp dari tanaman, bast fibre, proses, material antara, hingga produk jadi yang sudah dipublikasikan di NatFiber.','This gallery shows hemp from plant and bast fibre through processing, intermediate materials, and finished products already published in NatFiber.')}</p>${cards?`<div class="nf-hemp-grid">${cards}</div>`:`<div class="nf-hemp-fallback">${L('Data media Hemp sudah ada, tetapi tidak ada URL gambar yang valid untuk ditampilkan.','Hemp media records exist, but there is no valid image URL to display.')}</div>`}`;
}

function applyCopy(){
  const title=L('Produksi, media, dan aplikasi Hemp','Hemp production, media, and applications');
  const desc=L('Media publik Hemp dipisahkan secara editorial antara bast fibre, hurd/shive, dan produk. NatFiber tidak mencampurkan evidence serat dengan seed/oil/cannabinoid studies.','Public Hemp media are editorially separated across bast fibre, hurd/shive, and product contexts. NatFiber does not mix fibre evidence with seed/oil/cannabinoid studies.');
  if($('#globalHero h3')) $('#globalHero h3').textContent=title;
  if($('#tab-global .section-title h3')) $('#tab-global .section-title h3').textContent=title;
  if($('#globalHero .global-hero-content > p')) $('#globalHero .global-hero-content > p').textContent=desc;
  if($('#tab-global .section-title p')) $('#tab-global .section-title p').textContent=desc;
}

async function refreshHemp(){
  if(currentFiber()!=='NF-0005') return;
  addStyle();
  const p=await profile(); if(!p) return;
  const media=[...(p.media||[])];
  const productMedia=[...(p.product_media||[])];
  const hasGlobal=Boolean((p.production_stats||[]).length||(p.trade_stats||[]).length||(p.distribution||[]).length);
  const hasGallery=Boolean(media.length||productMedia.length);
  showTabs(hasGlobal,hasGallery);
  applyCopy();
  setHero(media.length?media:productMedia);
  renderGalleryCards(media.length?media:productMedia);
}

setInterval(()=>{ if(currentFiber()==='NF-0005') refreshHemp(); },1200);
document.addEventListener('click',e=>{ if(e.target.closest('.language-switch [data-lang]')) setTimeout(refreshHemp,180); });
window.addEventListener('load',()=>setTimeout(refreshHemp,450),{once:true});
console.info('[NatFiber] NF-0005 Hemp Public Media Fix v1.0 loaded.');
})();
