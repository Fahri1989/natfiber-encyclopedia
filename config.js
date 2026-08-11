// Public client configuration. The publishable key is safe for browser use with RLS enabled.
window.NATFIBER_CONFIG = {
  supabaseUrl: 'https://ennnhgrffgoeqjvhpelh.supabase.co',
  publishableKey: 'sb_publishable_ftskQZKSALKljnfIfY635g_YR-vvO4H'
};

// Fiber-aware editorial workspace (Admin only).
if (/\/admin\.html$/.test(window.location.pathname)) {
  const s = document.createElement('script');
  s.type = 'module';
  s.src = 'fiber-admin-switcher.js?v=1.2';
  document.head.appendChild(s);
}
