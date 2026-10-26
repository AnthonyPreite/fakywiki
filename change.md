# 📋 Récapitulatif des fichiers créés — Adaptation Vercel + Firebase Firestore

> **Aucun fichier existant n'a été modifié.** Tous les fichiers ci-dessous sont des ajouts.

---

## 1. [`package.json`](file:///Users/astoryon/Documents/AstoryonCreative/ARG/Maps%20Astorie/astorie_wiki/package.json)

> Déclare les dépendances du projet et les scripts npm.

```json
{
  "name": "astorie-wiki",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "node server.js",
    "import-data": "node scripts/import-to-firestore.js"
  },
  "dependencies": {
    "firebase-admin": "^13.0.0"
  }
}
```

---

## 2. [`lib/firebase.js`](file:///Users/astoryon/Documents/AstoryonCreative/ARG/Maps%20Astorie/astorie_wiki/lib/firebase.js)

> Initialisation partagée de Firebase Admin. Lit le service account depuis la variable d'environnement `FIREBASE_SERVICE_ACCOUNT` (définie sur Vercel).

```js
// Initialisation Firebase Admin partagée entre toutes les API routes
const admin = require('firebase-admin');

if (!admin.apps.length) {
  // Sur Vercel, utiliser les variables d'environnement pour le service account
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

module.exports = { db };
```

---

## 3. [`api/pages/[...slug].js`](file:///Users/astoryon/Documents/AstoryonCreative/ARG/Maps%20Astorie/astorie_wiki/api/pages/%5B...slug%5D.js)

> Serverless function Vercel — remplace la partie API de `server.js`. Gère le CRUD des pages via Firestore.

```js
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
```

---

## 4. [`api/login.js`](file:///Users/astoryon/Documents/AstoryonCreative/ARG/Maps%20Astorie/astorie_wiki/api/login.js)

> Serverless function Vercel — vérifie le mot de passe admin.

```js
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

## 5. [`vercel.json`](file:///Users/astoryon/Documents/AstoryonCreative/ARG/Maps%20Astorie/astorie_wiki/vercel.json)

> Configuration Vercel — route les appels API vers les bonnes serverless functions. Les fichiers statiques (HTML, CSS, JS, images) sont servis automatiquement.

```json
{
  "rewrites": [
    { "source": "/api/login", "destination": "/api/login" },
    { "source": "/api/pages", "destination": "/api/pages/index" },
    { "source": "/api/pages/:slug", "destination": "/api/pages/:slug" }
  ]
}
```

---

## 6. [`scripts/import-to-firestore.js`](file:///Users/astoryon/Documents/AstoryonCreative/ARG/Maps%20Astorie/astorie_wiki/scripts/import-to-firestore.js)

> Script à exécuter une seule fois pour migrer tes données `data/pages.json` vers Firestore.

```js
// Script pour importer les données de pages.json vers Firebase Firestore
// Usage : FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}' node scripts/import-to-firestore.js

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Charger le service account depuis la variable d'environnement ou un fichier local
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else if (fs.existsSync(path.join(__dirname, '..', 'service-account.json'))) {
  serviceAccount = require(path.join(__dirname, '..', 'service-account.json'));
} else {
  console.error('❌ Aucun service account trouvé.');
  console.error('   Créez un fichier service-account.json à la racine du projet');
  console.error('   ou définissez la variable FIREBASE_SERVICE_ACCOUNT.');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function importData() {
  const pagesPath = path.join(__dirname, '..', 'data', 'pages.json');
  const pages = JSON.parse(fs.readFileSync(pagesPath, 'utf8'));

  console.log(`📦 Import de ${pages.length} page(s) vers Firestore...\n`);

  for (const page of pages) {
    await db.collection('pages').doc(page.slug).set(page);
    console.log(`  ✅ ${page.title} (${page.slug})`);
  }

  console.log('\n🎉 Import terminé !');
  process.exit(0);
}

importData().catch(err => {
  console.error('❌ Erreur:', err);
  process.exit(1);
});
```

---

## 7. [`.gitignore`](file:///Users/astoryon/Documents/AstoryonCreative/ARG/Maps%20Astorie/astorie_wiki/.gitignore)

> Empêche de commit les fichiers sensibles et inutiles.

```
node_modules/
.vercel/
service-account.json
.DS_Store
data/pages.json.tmp
```

---

## Structure finale du projet

```
astorie_wiki/
├── api/                          🆕
│   ├── login.js                  🆕  Vérification admin
│   └── pages/                    🆕
│       └── [...slug].js          🆕  CRUD pages (Firestore)
├── data/
│   └── pages.json                    (inchangé, toujours utilisé en local)
├── lib/                          🆕
│   └── firebase.js               🆕  Init Firebase partagée
├── public/
│   └── img/                          (inchangé)
├── scripts/                      🆕
│   └── import-to-firestore.js    🆕  Migration JSON → Firestore
├── src/
│   ├── style.css                     (inchangé)
│   ├── wiki.js                       (inchangé)
│   └── main.js                       (inchangé)
├── admin.html                        (inchangé)
├── index.html                        (inchangé)
├── page.html                         (inchangé)
├── server.js                         (inchangé — toujours utilisable en local)
├── package.json                  🆕
├── vercel.json                   🆕
└── .gitignore                    🆕
```

> [!NOTE]
> **`server.js` est conservé** et fonctionne toujours pour le développement local avec `node server.js`. Les nouveaux fichiers dans `api/` ne sont utilisés que par Vercel.
