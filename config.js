// NatFiber Encyclopedia — client configuration v1.5.5
window.NATFIBER_CONFIG={
  supabaseUrl:'https://ennnhgrffgoeqjvhpelh.supabase.co',
  publishableKey:'sb_publishable_ftskQZKSALKljnfIfY635g_YR-vvO4H'
};

function nfLoadScript(src,{module=false,onload=null,onerror=null}={}){
  const s=document.createElement('script');
  if(module)s.type='module';
  s.src=src;
  if(onload)s.onload=onload;
  if(onerror)s.onerror=onerror;
  document.head.appendChild(s);
  return s;
}

if(/\/admin\.html$/.test(window.location.pathname)){
  // Critical, independent modules first.
  nfLoadScript('admin-dashboard-fiber-aware-v1.5.js?v=1.5.5',{module:true});
  nfLoadScript('product-release-panel-v1.2.js?v=1.2',{module:true});

  // Existing feature modules.
  nfLoadScript('fiber-admin-switcher-v1.3.js?v=1.3.2',{module:true});
  nfLoadScript('ijuk-global-admin-v1.1.js?v=1.1.2',{module:true});
  nfLoadScript('ijuk-media-admin-v1.0.js?v=1.0.2',{module:true});
  nfLoadScript('ijuk-characterization-dr3-admin-v1.0.js?v=1.0.2',{module:true});
  nfLoadScript('sisal-gold-audit-admin-v1.0.js?v=1.0.2',{module:true});

  // Data-entry stack. Release panel does NOT depend on this loading successfully.
  nfLoadScript('product-media-admin-v1.1.js?v=1.1.3',{
    module:true,
    onload:()=>nfLoadScript('product-media-quick-entry-v1.2.js?v=1.2.3')
  });
}else{
  window.addEventListener('load',()=>{
    nfLoadScript('global-footprint-fiber-aware-v1.4.js?v=1.4.2',{
      onload:()=>nfLoadScript('public-qa-fiber-aware-v1.4.js?v=1.4.2',{
        onload:()=>nfLoadScript('quality-certification-v1.0.js?v=1.0.2',{
          onload:()=>nfLoadScript('product-application-gallery-v1.1.js?v=1.1.2',{module:true})
        })
      })
    });
  },{once:true});
}
