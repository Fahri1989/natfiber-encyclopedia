// Public client configuration. The publishable key is safe for browser use with RLS enabled.
window.NATFIBER_CONFIG = {
  supabaseUrl: 'https://ennnhgrffgoeqjvhpelh.supabase.co',
  publishableKey: 'sb_publishable_ftskQZKSALKljnfIfY635g_YR-vvO4H'
};

// NatFiber NF-0001 Stage 1A Admin extension.
// Loaded only on the editorial admin page; public pages are unaffected.
if (/\/admin\.html$/.test(window.location.pathname)) {
  const s = document.createElement('script');
  s.type = 'module';
  s.src = 'ijuk-enrichment-admin.js?v=1.1a';
  document.head.appendChild(s);
}
