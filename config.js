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

// Public fiber-aware Global Production & Distribution renderer.
// Loaded after the page finishes so the existing app.js renderer is available.
// NF-0002 Sisal keeps the original renderer; NF-0001 Ijuk gets a method-aware renderer.
if (!/\/admin\.html$/.test(window.location.pathname)) {
  window.addEventListener('load', () => {
    const globalRenderer = document.createElement('script');
    globalRenderer.src = 'global-footprint-fiber-aware-v1.3.js?v=1.3';
    document.body.appendChild(globalRenderer);
  }, { once: true });
}
