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
