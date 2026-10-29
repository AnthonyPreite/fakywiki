// API du wiki : /api/login, /api/pages, /api/pages/:slug
import fs from 'node:fs';
import path from 'node:path';
import 'firebase-admin'; // import statique : force l'inclusion de firebase-admin dans le bundle Netlify
import firebase from '../../lib/firebase.js';

const { db } = firebase;
const TOKEN = process.env.ADMIN_TOKEN || 'astorie';
const json = (obj, status = 200) => Response.json(obj, { status });

// Données de secours si Firebase n'est pas configuré
const local = () => JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/pages.json'), 'utf8'));

async function getAll() {
  if (!db) return local();
  const snapshot = await db.collection('pages').get();
  return snapshot.docs.map(doc => doc.data());
}

async function getOne(slug) {
  if (!db) return local().find(p => p.slug === slug) || null;
  const doc = await db.collection('pages').doc(slug).get();
  return doc.exists ? doc.data() : null;
}

export default async (req) => {
  const url = new URL(req.url);
  const admin = req.headers.get('x-admin-token') === TOKEN;

  if (url.pathname === '/api/login') return json({ ok: admin }, admin ? 200 : 401);

  const m = url.pathname.match(/^\/api\/pages(?:\/([a-z0-9-]+))?\/?$/);
  if (!m) return json({ error: 'Introuvable' }, 404);
  const slug = m[1];

  try {
    if (req.method === 'GET') {
      if (!slug) return json((await getAll()).filter(p => admin || p.published));
      const p = await getOne(slug);
      return p && (admin || p.published) ? json(p) : json({ error: 'Introuvable' }, 404);
    }

    if (!admin) return json({ error: 'Non autorisé' }, 401);
    if (!slug) return json({ error: 'Slug manquant' }, 400);
    if (!db) return json({ error: 'Firebase non configuré (FIREBASE_SERVICE_ACCOUNT manquant)' }, 503);

    if (req.method === 'DELETE') {
      await db.collection('pages').doc(slug).delete();
      return json({ ok: true });
    }

    if (req.method === 'PUT') {
      let body;
      try { body = await req.json(); } catch { return json({ error: 'JSON invalide' }, 400); }
      const page = { ...body, slug, updated: new Date().toISOString() };
      await db.collection('pages').doc(slug).set(page);
      return json(page);
    }

    return json({ error: 'Méthode non autorisée' }, 405);
  } catch (err) {
    console.error('Erreur API:', err);
    return json({ error: 'Erreur serveur' }, 500);
  }
};

// /data, /lib et /scripts passent aussi par ici pour ne pas être servis publiquement (→ 404)
export const config = { path: ['/api/login', '/api/pages', '/api/pages/*', '/data/*', '/lib/*', '/scripts/*'] };
