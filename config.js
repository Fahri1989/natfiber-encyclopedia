// Public client configuration. The publishable key is safe for browser use with RLS enabled.
window.NATFIBER_CONFIG={supabaseUrl:'https://ennnhgrffgoeqjvhpelh.supabase.co',publishableKey:'sb_publishable_ftskQZKSALKljnfIfY635g_YR-vvO4H'};
if(/\/admin\.html$/.test(window.location.pathname)){
 for(const [src,module] of [['fiber-admin-switcher-v1.3.js?v=1.3',true],['ijuk-global-admin-v1.1.js?v=1.1',true],['ijuk-media-admin-v1.0.js?v=1.0',true],['ijuk-characterization-dr3-admin-v1.0.js?v=1.0',true]]){
   const s=document.createElement('script'); if(module)s.type='module'; s.src=src; document.head.appendChild(s);
 }
}
if(!/\/admin\.html$/.test(window.location.pathname)){
 window.addEventListener('load',()=>{const s=document.createElement('script');s.src='global-footprint-fiber-aware-v1.3.js?v=1.3';document.body.appendChild(s)},{once:true});
}
