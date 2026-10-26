const { db } = require('../../lib/firebase');

const TOKEN = process.env.ADMIN_TOKEN || 'astorie';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const admin = req.headers['x-admin-token'] === TOKEN;

  try {
    const snapshot = await db.collection('pages').get();
    let pages = snapshot.docs.map(doc => doc.data());
    if (!admin) {
      pages = pages.filter(p => p.published);
    }
    return res.status(200).json(pages);
  } catch (err) {
    console.error('Erreur récupération pages:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};
