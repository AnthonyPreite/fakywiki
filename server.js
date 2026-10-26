// node server.js  ->  http://localhost:3000   (mot de passe admin: variable ADMIN_TOKEN, défaut "astorie")
const http = require('http'), fs = require('fs'), path = require('path');
const TOKEN = process.env.ADMIN_TOKEN || 'astorie', DB = path.join(__dirname, 'data/pages.json');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.json': 'application/json' };
const load = () => JSON.parse(fs.readFileSync(DB, 'utf8'));
const save = d => { fs.writeFileSync(DB + '.tmp', JSON.stringify(d, null, 2)); fs.renameSync(DB + '.tmp', DB); };
const send = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x'), admin = req.headers['x-admin-token'] === TOKEN;
  const m = url.pathname.match(/^\/api\/pages(?:\/([a-z0-9-]+))?$/);
  if (url.pathname === '/api/login') return send(res, admin ? 200 : 401, { ok: admin });
  if (m) {
    const slug = m[1], pages = load();
    if (req.method === 'GET') {
      if (!slug) return send(res, 200, pages.filter(p => admin || p.published));
      const p = pages.find(p => p.slug === slug);
      return p && (admin || p.published) ? send(res, 200, p) : send(res, 404, { error: 'Introuvable' });
    }
    if (!admin) return send(res, 401, { error: 'Non autorisé' });
    if (req.method === 'DELETE') { save(pages.filter(p => p.slug !== slug)); return send(res, 200, { ok: true }); }
    if (req.method === 'PUT') {
      let b = ''; req.on('data', c => b += c); req.on('end', () => {
        try {
          const p = { ...JSON.parse(b), slug, updated: new Date().toISOString() }, i = pages.findIndex(x => x.slug === slug);
          i < 0 ? pages.push(p) : pages[i] = p; save(pages); send(res, 200, p);
        } catch { send(res, 400, { error: 'JSON invalide' }); }
      }); return;
    }
  }
  // fichiers statiques
  let f = path.join(__dirname, decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
  if (!f.startsWith(__dirname) || f.startsWith(path.join(__dirname, 'data'))) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(d); });
}).listen(3000, () => console.log('http://localhost:3000'));
