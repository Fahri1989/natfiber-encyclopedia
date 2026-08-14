// Public client configuration. The publishable key is safe for browser use with RLS enabled.
window.NATFIBER_CONFIG = {
  supabaseUrl: 'https://ennnhgrffgoeqjvhpelh.supabase.co',
  publishableKey: 'sb_publishable_ftskQZKSALKljnfIfY635g_YR-vvO4H'
};

// Fiber-aware editorial workspace (Admin only).
if (/\/admin\.html$/.test(window.location.pathname)) {
  const selector = document.createElement('script');
  selector.type = 'module';
  selector.src = 'fiber-admin-switcher-v1.3.js?v=1.3';
  document.head.appendChild(selector);

  const globalIjuk = document.createElement('script');
  globalIjuk.type = 'module';
  globalIjuk.src = 'ijuk-global-admin-v1.0.js?v=1.0';
  document.head.appendChild(globalIjuk);
}
