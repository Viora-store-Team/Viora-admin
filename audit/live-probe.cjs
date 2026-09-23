/* eslint-disable @typescript-eslint/no-require-imports -- Standalone CommonJS diagnostic script. */
const fs = require('node:fs');
const base = 'https://viora-backend-tuqg.onrender.com/api';
const results = [];
async function request(path, options = {}) {
  const start = Date.now();
  try {
    const r = await fetch(base + path, { ...options, signal: AbortSignal.timeout(45000) });
    const body = await r.json().catch(() => ({}));
    results.push({ method: options.method || 'GET', path, status: r.status, success: body.success, keys: Object.keys(body), ms: Date.now() - start, authenticated: !!options.headers?.Authorization });
    console.log(JSON.stringify(results.at(-1)));
    return body;
  } catch (e) {
    results.push({ path, error: e.name, ms: Date.now() - start });
    console.log(JSON.stringify(results.at(-1)));
    return {};
  }
}
(async () => {
  await request('/health');
  await request('/admin/stats');
  const credentials = process.env.QA_ADMIN_EMAIL && process.env.QA_ADMIN_PASSWORD
    ? JSON.stringify({email:process.env.QA_ADMIN_EMAIL,password:process.env.QA_ADMIN_PASSWORD}) : null;
  const login = credentials ? await request('/admin/login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: credentials }) : {};
  if (login.token && login.user?.role === 'ADMIN') {
    const headers = { Authorization: `Bearer ${login.token}` };
    const paths = ['/admin/me','/admin/stats?period=7','/admin/stores?limit=1','/admin/users?limit=1','/admin/categories','/admin/occasions','/admin/collections','/admin/orders?limit=1','/admin/ratings?limit=1','/admin/support/tickets?limit=1','/admin/content','/admin/content/terms','/admin/content/privacy','/admin/content/about','/admin/content/faq','/admin/banners','/notifications?limit=1','/notifications/count','/admin/reports?limit=1','/admin/delivery/health','/admin/delivery/failures?limit=1','/admin/reviews/overview','/admin/reviews/stores','/health/db'];
    for (let i=0;i<paths.length;i+=3) await Promise.all(paths.slice(i,i+3).map(p=>request(p,{headers})));
  }
  fs.writeFileSync('audit/live-results.json', JSON.stringify({at:new Date().toISOString(), results},null,2));
})();
