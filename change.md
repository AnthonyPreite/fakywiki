# 📋 Récapitulatif des fichiers — Adaptation Vercel + Firebase Firestore

---

## 1. Changement clé pour Vercel : `server.js` → [`dev-server.js`](file:///Users/astoryon/Documents/AstoryonCreative/ARG/Maps%20Astorie/astorie_wiki/dev-server.js)
> **Pourquoi ?** Lorsque Vercel détecte un fichier `server.js` à la racine, il tente de compiler tout le projet comme un serveur monolithique Node.js (`✓ Build complete — Using server.js as the root entrypoint`), ce qui empêchait les routes serverless `api/` de fonctionner.  
> En renommant en `dev-server.js`, Vercel déploie automatiquement les fichiers statiques + les Serverless Functions `api/`.  
> Tu peux toujours lancer ton serveur local avec `npm run dev`.

---

## 2. [`package.json`](file:///Users/astoryon/Documents/AstoryonCreative/ARG/Maps%20Astorie/astorie_wiki/package.json)
```json
{
  "name": "astorie-wiki",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "node dev-server.js",
    "import-data": "node scripts/import-to-firestore.js"
  },
  "dependencies": {
    "firebase-admin": "^13.0.0"
  }
}
```

---

## 3. [`lib/firebase.js`](file:///Users/astoryon/Documents/AstoryonCreative/ARG/Maps%20Astorie/astorie_wiki/lib/firebase.js)
> Initialisation Firebase Admin robuste : lit la variable d'environnement `FIREBASE_SERVICE_ACCOUNT` sur Vercel, ou bascule sur le fichier `service-account.json` local en développement.

```javascript
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

if (!admin.apps.length) {
  let cert = null;

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      cert = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (e) {
      console.error('Erreur de parsing FIREBASE_SERVICE_ACCOUNT:', e);
    }
  } else {
    const localSaPath = path.join(process.cwd(), 'service-account.json');
    if (fs.existsSync(localSaPath)) {
      cert = require(localSaPath);
    }
  }

  if (cert) {
    admin.initializeApp({
      credential: admin.credential.cert(cert)
    });
  } else {
    admin.initializeApp();
  }
}

const db = admin.firestore();

module.exports = { db };
```

---

## 4. [`api/login.js`](file:///Users/astoryon/Documents/AstoryonCreative/ARG/Maps%20Astorie/astorie_wiki/api/login.js)
> Route Serverless pour `/api/login` (vérification du token admin).

```javascript
const TOKEN = process.env.ADMIN_TOKEN || 'astorie';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const admin = req.headers['x-admin-token'] === TOKEN;
  return res.status(admin ? 200 : 401).json({ ok: admin });
};
```

---

## 5. [`api/pages/index.js`](file:///Users/astoryon/Documents/AstoryonCreative/ARG/Maps%20Astorie/astorie_wiki/api/pages/index.js)
> Route Serverless pour `/api/pages` : liste les pages depuis Firestore (pages publiées pour les visiteurs, ou toutes pour l'admin).

```javascript
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
```

---

## 6. [`api/pages/[slug].js`](file:///Users/astoryon/Documents/AstoryonCreative/ARG/Maps%20Astorie/astorie_wiki/api/pages/%5Bslug%5D.js)
> Route Serverless pour `/api/pages/:slug` :
> - `GET` : récupérer une page
> - `PUT` : créer / mettre à jour une page (avec parsing de body automatique & stream)
> - `DELETE` : supprimer une page

```javascript
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
```

---

## 7. [`vercel.json`](file:///Users/astoryon/Documents/AstoryonCreative/ARG/Maps%20Astorie/astorie_wiki/vercel.json)
> Fichier épuré `{}` : Vercel gère nativement le routage par fichiers (fichiers statiques à la racine + fonctions dans `api/`).

---

## 8. [`scripts/import-to-firestore.js`](file:///Users/astoryon/Documents/AstoryonCreative/ARG/Maps%20Astorie/astorie_wiki/scripts/import-to-firestore.js)
> Testé avec succès ! Les données locales ont déjà été synchronisées dans Firestore.
