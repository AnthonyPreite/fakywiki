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
