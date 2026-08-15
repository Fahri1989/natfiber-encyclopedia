/*
 NatFiber Encyclopedia — Public QA & Fiber-Aware UX v1.4
 Non-destructive overlay:
 - shareable ?fiber=NF-xxxx deep links
 - Ijuk gallery provenance badges
 - explicit TGA vs DTG status for NF-0001
 - page title + public beta version
 - small QA styling
*/
(function(){
  'use strict';

  const CFG=window.NATFIBER_CONFIG||{};
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  let profileCache=null;
  let lastFiber=null;
  let rpcBusy=false;

  function lang(){
    try{return window.NF_I18N?.getLang?.()||localStorage.getItem('natfiber_lang')||'id';}
    catch{return'id';}
  }
  function L(id,en){return lang()==='id'?id:en;}
  function esc(v=''){
    return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function currentFiber(){return ($('#fiberId')?.textContent||'').trim();}
  function validFiber(v){return /^NF-\d{4}$/.test(String(v||''));}

  function addStyle(){
    if($('#nfPublicQaV14Style')) return;
    const s=document.createElement('style');
    s.id='nfPublicQaV14Style';
    s.textContent=`
      .nf-v14-caveat{margin:10px 0 14px;padding:10px 12px;border-left:4px solid #b67c28;background:#fff8e9;border-radius:8px;font-size:10px;line-height:1.5;color:#69542e}
      .nf-media-qa{margin-top:10px;padding-top:10px;border-top:1px solid #e1e9e5}
      .nf-media-qa-badges{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:7px}
      .nf-media-qa-badge{font-size:8.5px;font-weight:800;letter-spacing:.04em;padding:4px 7px;border-radius:999px;background:#e6f3ec;color:#205b48}
      .nf-media-qa-badge.partial{background:#fff0d8;color:#7a571c}
      .nf-media-qa p{margin:0;font-size:9.5px;line-height:1.45;color:#6d7c75}
      .nf-char-split-note{margin:10px 0 14px;padding:11px 13px;border:1px solid #d8e5df;background:#f5f9f7;border-radius:11px;font-size:10.5px;color:#52665e}
      .nf-char-split-note b{color:#173f33}
      .nf-char-mini{display:inline-flex;gap:5px;align-items:center;margin-right:8px;padding:3px 7px;border-radius:999px;background:#e4f3eb;color:#205c47;font-weight:800;font-size:9px}
      .nf-char-mini.partial{background:#fff0d8;color:#7a571c}
    `;
    document.head.appendChild(s);
  }

  async function fetchProfile(fiberId){
    if(!CFG.supabaseUrl||!CFG.publishableKey||rpcBusy) return profileCache;
    rpcBusy=true;
    try{
      const res=await fetch(`${CFG.supabaseUrl}/rest/v1/rpc/get_natfiber_profile`,{
        method:'POST',
        headers:{apikey:CFG.publishableKey,'Content-Type':'application/json'},
        body:JSON.stringify({target_fiber_id:fiberId})
      });
      if(!res.ok) return null;
      profileCache=await res.json();
      return profileCache;
    }finally{rpcBusy=false;}
  }

  function setUrlFiber(fiberId,mode='replace'){
    if(!validFiber(fiberId)) return;
    const u=new URL(location.href);
    if(u.searchParams.get('fiber')===fiberId) return;
    u.searchParams.set('fiber',fiberId);
    history[mode==='push'?'pushState':'replaceState']({fiber:fiberId},'',u);
  }

  function applyTitle(){
    const id=currentFiber();
    const name=($('#fiberName')?.textContent||'').trim();
    if(validFiber(id)&&name) document.title=`${name} (${id}) — NatFiber Encyclopedia`;
  }

  function applyFooter(){
    const first=$('footer > div:first-child');
    if(first) first.textContent='NatFiber Encyclopedia · Public Beta v1.4';
  }

  function verificationBadge(status=''){
    if(status.includes('TAXONOMY_PARTIAL')) return [L('DOKUMENTASI HISTORIS','HISTORICAL DOCUMENTATION'),L('Kepastian taksonomi: PARSIAL','Taxonomic certainty: PARTIAL'),'partial'];
    if(status.includes('TAXONOMY_VERIFIED')) return [L('TAKSONOMI TERVERIFIKASI','TAXONOMY VERIFIED'),L('Lisensi terverifikasi','License verified'),''];
    if(status.includes('PRODUCT_IDENTITY')) return [L('IDENTITAS PRODUK TERVERIFIKASI','PRODUCT IDENTITY VERIFIED'),L('Media aplikasi','Application media'),''];
    return [status.replaceAll('_',' '),L('Metadata terverifikasi','Verified metadata'),''];
  }

  function localizedMediaTitle(m){
    if(lang()!=='id') return m.title||'';
    if(m.media_id==='MED-000009') return 'Pohon Aren (Arenga pinnata) di Indonesia';
    if(m.media_id==='MED-000010') return 'Serat aren mentah sebelum penyisiran, Jawa Barat (1927)';
    if(m.media_id==='MED-000011') return 'Sapu ijuk';
    return m.title||'';
  }

  async function patchGallery(){
    if(currentFiber()!=='NF-0001') return;
    const box=$('#mediaGallery');
    if(!box||!box.children.length) return;
    const p=(profileCache?.fiber?.fiber_id==='NF-0001')?profileCache:await fetchProfile('NF-0001');
    const media=p?.media||[];
    $$('#mediaGallery .media-card').forEach((card,idx)=>{
      const m=media[idx];
      if(!m) return;
      const h=card.querySelector('h4');
      if(h){
        const wantedTitle=localizedMediaTitle(m);
        if(h.textContent!==wantedTitle) h.textContent=wantedTitle;
      }
      let qa=card.querySelector('.nf-media-qa');
      if(!qa){qa=document.createElement('div');qa.className='nf-media-qa';card.querySelector('.media-card-body')?.appendChild(qa);}
      const [b1,b2,cls]=verificationBadge(m.verification_status||'');
      const note=m.media_id==='MED-000010'
        ? L('Arsip komoditas/vernacular yang kuat, tetapi bukan satu-satunya close-up canonical serat teknik Ijuk modern.','Strong commodity/vernacular archival evidence, but not the sole canonical modern engineering-fibre close-up.')
        : (m.provenance_note||'');
      const wanted=`<div class="nf-media-qa-badges"><span class="nf-media-qa-badge ${cls}">${esc(b1)}</span><span class="nf-media-qa-badge">${esc(b2)}</span></div>${note?`<p>${esc(note)}</p>`:''}`;
      if(qa.innerHTML!==wanted) qa.innerHTML=wanted;
    });
  }

  function patchCharacterization(){
    if(currentFiber()!=='NF-0001') return;

    const btn=$('#charTechniqueNav .char-tech-btn[data-tech="TGA_DTG"]');
    if(btn){
      const small=btn.querySelector('small');
      if(small){
        const wanted=L('TGA: FOUND · DTG: PARTIAL','TGA: FOUND · DTG: PARTIAL');
        if(small.textContent!==wanted) small.textContent=wanted;
      }
    }

    const coverage=$('#charCoverage');
    if(coverage){
      [...coverage.querySelectorAll('.char-coverage-card')].forEach(card=>{
        const strong=card.querySelector('strong');
        if(strong?.textContent?.includes('TGA')){
          let n=card.querySelector('.nf-char-split-note');
          if(!n){n=document.createElement('div');n.className='nf-char-split-note';card.appendChild(n);}
          const wanted=`<span class="nf-char-mini">TGA · FOUND</span><span class="nf-char-mini partial">DTG · PARTIAL</span>`;
          if(n.innerHTML!==wanted) n.innerHTML=wanted;
        }
      });
    }

    const active=$('#charTechniqueNav .char-tech-btn[data-tech="TGA_DTG"].active');
    const body=$('#charTechniqueBody');
    if(active&&body){
      let n=body.querySelector(':scope > .nf-char-split-note');
      if(!n){n=document.createElement('div');n.className='nf-char-split-note';body.prepend(n);}
      const wanted=L(
        '<b>TGA:</b> FOUND / MODERATE EVIDENCE. <b>DTG:</b> PARTIAL — pemetaan figure-level untuk DTG raw-fibre masih memerlukan verifikasi PDF terpisah.',
        '<b>TGA:</b> FOUND / MODERATE EVIDENCE. <b>DTG:</b> PARTIAL — raw-fibre DTG figure-level mapping still requires separate PDF verification.'
      );
      if(n.innerHTML!==wanted) n.innerHTML=wanted;
    }
  }

  async function refreshQa(){
    const id=currentFiber();
    if(!validFiber(id)) return;
    if(lastFiber!==id){lastFiber=id;profileCache=null;}
    setUrlFiber(id,'replace');
    applyTitle();
    applyFooter();
    await patchGallery();
    patchCharacterization();
  }

  function initialDeepLink(){
    const requested=new URL(location.href).searchParams.get('fiber');
    if(!validFiber(requested)||requested==='NF-0001') return;
    const tryLoad=()=>{
      if(typeof window.loadFiber==='function'){
        window.loadFiber(requested);
        setUrlFiber(requested,'replace');
        return true;
      }
      return false;
    };
    if(!tryLoad()){
      let n=0;
      const t=setInterval(()=>{if(tryLoad()||++n>20)clearInterval(t)},250);
    }
    // Guard against the application's default NF-0001 request completing after the deep-link request.
    setTimeout(()=>{if(currentFiber()!==requested&&typeof window.loadFiber==='function')window.loadFiber(requested);},900);
  }

  function bindNavigation(){
    document.addEventListener('click',e=>{
      const d=e.target.closest('[data-directory-fiber]');
      const s=e.target.closest('[data-fiber]');
      const id=d?.dataset?.directoryFiber||s?.dataset?.fiber;
      if(validFiber(id)) setUrlFiber(id,'push');
      if(e.target.closest('.language-switch [data-lang]')) setTimeout(refreshQa,120);
      if(e.target.closest('#charTechniqueNav .char-tech-btn')) setTimeout(patchCharacterization,80);
    },true);

    window.addEventListener('popstate',()=>{
      const id=new URL(location.href).searchParams.get('fiber');
      if(validFiber(id)&&typeof window.loadFiber==='function') window.loadFiber(id);
    });
  }

  function boot(){
    addStyle();
    bindNavigation();
    initialDeepLink();
    const root=$('#fiberProfile')||document.body;
    const obs=new MutationObserver(()=>{clearTimeout(window.__nfQaTimer);window.__nfQaTimer=setTimeout(refreshQa,80);});
    obs.observe(root,{subtree:true,childList:true,characterData:true});
    setTimeout(refreshQa,300);
    console.info('[NatFiber] Public QA & Fiber-Aware UX v1.4 loaded.');
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
