// NatFiber Encyclopedia — client configuration v1.4
window.NATFIBER_CONFIG={
  supabaseUrl:'https://ennnhgrffgoeqjvhpelh.supabase.co',
  publishableKey:'sb_publishable_ftskQZKSALKljnfIfY635g_YR-vvO4H'
};

function nfLoadScript(src,{module=false,onload=null}={}){
  const s=document.createElement('script');
  if(module)s.type='module';
  s.src=src;
  if(onload)s.onload=onload;
  document.head.appendChild(s);
}

if(/\/admin\.html$/.test(window.location.pathname)){
  nfLoadScript('fiber-admin-switcher-v1.3.js?v=1.3',{module:true});
  nfLoadScript('ijuk-global-admin-v1.1.js?v=1.1',{module:true});
  nfLoadScript('ijuk-media-admin-v1.0.js?v=1.0',{module:true});
  nfLoadScript('ijuk-characterization-dr3-admin-v1.0.js?v=1.0',{module:true});
  nfLoadScript('admin-dashboard-fiber-aware-v1.4.js?v=1.4',{module:true});
}else{
  // app.js and characterization.js are loaded by index.html before window.load.
  // Load the fiber-aware global renderer first, then QA overlay.
  window.addEventListener('load',()=>{
    nfLoadScript('global-footprint-fiber-aware-v1.4.js?v=1.4',{
      onload:()=>nfLoadScript('public-qa-fiber-aware-v1.4.js?v=1.4')
    });
  },{once:true});
}
