const fs = require('fs');
const path = require('path');

// Lit FIREBASE_SERVICE_ACCOUNT (Netlify) ou service-account.json (local).
// Sans identifiants, db = null et l'API se rabat sur data/pages.json (lecture seule).
let cert = null;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    cert = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (e) {
    console.error('Erreur de parsing FIREBASE_SERVICE_ACCOUNT:', e);
  }
} else {
  const localSaPath = path.join(process.cwd(), 'service-account.json');
  if (fs.existsSync(localSaPath)) cert = require(localSaPath);
}

// firebase-admin n'est chargé que si des identifiants existent
let db = null;
if (cert) {
  const admin = require('firebase-admin');
  if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(cert) });
  db = admin.firestore();
}

module.exports = { db };
