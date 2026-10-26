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
