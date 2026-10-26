const { db } = require('../../lib/firebase');

const TOKEN = process.env.ADMIN_TOKEN || 'astorie';

async function parseBody(req) {
  if (req.body) {
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body);
      } catch (_) {
        return null;
      }
    }
    return req.body;
  }
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', chunk => (raw += chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw));
      } catch (_) {
        resolve(null);
      }
    });
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const slug = req.query.slug;
  if (!slug) {
    return res.status(400).json({ error: 'Slug manquant' });
  }

  const admin = req.headers['x-admin-token'] === TOKEN;
  const docRef = db.collection('pages').doc(slug);

  try {
    if (req.method === 'GET') {
      const doc = await docRef.get();
      if (!doc.exists) {
        return res.status(404).json({ error: 'Introuvable' });
      }
      const data = doc.data();
      if (!admin && !data.published) {
        return res.status(404).json({ error: 'Introuvable' });
      }
      return res.status(200).json(data);
    }

    if (!admin) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    if (req.method === 'DELETE') {
      await docRef.delete();
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'PUT') {
      const body = await parseBody(req);
      if (!body) {
        return res.status(400).json({ error: 'Corps de requête JSON invalide' });
      }
      const page = {
        ...body,
        slug,
        updated: new Date().toISOString()
      };
      await docRef.set(page);
      return res.status(200).json(page);
    }

    return res.status(405).json({ error: 'Méthode non autorisée' });
  } catch (err) {
    console.error('Erreur API slug:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};
