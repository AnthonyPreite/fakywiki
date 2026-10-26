const { db } = require('../../lib/firebase');

const TOKEN = process.env.ADMIN_TOKEN || 'astorie';

module.exports = async (req, res) => {
  // CORS headers (utile si besoin)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const admin = req.headers['x-admin-token'] === TOKEN;

  // Extraire le slug depuis l'URL : /api/pages ou /api/pages/mon-slug
  const urlParts = req.url.split('?')[0].split('/').filter(Boolean);
  // urlParts = ['api', 'pages'] ou ['api', 'pages', 'mon-slug']
  const slug = urlParts[2] || null;

  const pagesRef = db.collection('pages');

  try {
    // GET — liste ou page unique
    if (req.method === 'GET') {
      if (!slug) {
        // Liste de toutes les pages
        const snapshot = await pagesRef.get();
        let pages = snapshot.docs.map(doc => doc.data());
        if (!admin) pages = pages.filter(p => p.published);
        return res.status(200).json(pages);
      } else {
        // Page unique par slug
        const doc = await pagesRef.doc(slug).get();
        if (!doc.exists || (!admin && !doc.data().published)) {
          return res.status(404).json({ error: 'Introuvable' });
        }
        return res.status(200).json(doc.data());
      }
    }

    // Toutes les opérations suivantes nécessitent l'authentification admin
    if (!admin) return res.status(401).json({ error: 'Non autorisé' });

    // PUT — créer ou modifier une page
    if (req.method === 'PUT' && slug) {
      const body = req.body;
      const page = { ...body, slug, updated: new Date().toISOString() };
      await pagesRef.doc(slug).set(page);
      return res.status(200).json(page);
    }

    // DELETE — supprimer une page
    if (req.method === 'DELETE' && slug) {
      await pagesRef.doc(slug).delete();
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Méthode non autorisée' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};
