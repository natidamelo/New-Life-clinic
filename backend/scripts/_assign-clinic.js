/**
 * Assign clinicId to all documents that are missing it (or have empty string).
 * TARGET defaults to env MIGRATE_TARGET or "clinicnew".
 * DRY_RUN=true to preview only.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const TARGET = (process.env.MIGRATE_TARGET || 'clinicnew').trim();
const DRY_RUN = ['true', '1'].includes(String(process.env.DRY_RUN || '').toLowerCase());

const filter = {
  $or: [
    { clinicId: { $exists: false } },
    { clinicId: '' },
    { clinicId: null }
  ]
};

(async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Set MONGODB_URI');

  console.log(`--- Assign missing clinicId ---`);
  console.log(`TARGET: ${TARGET}`);
  console.log(`DRY_RUN: ${DRY_RUN}`);
  console.log(`DB: ${uri.replace(/:([^:@/]+)@/, ':***@')}`);

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 30000 });
  const db = mongoose.connection.db;

  const collections = ['users', 'patients', 'medicalrecords', 'medicalinvoices'];

  for (const name of collections) {
    const col = db.collection(name);
    const count = await col.countDocuments(filter);
    if (DRY_RUN) {
      console.log(`[DRY_RUN] ${name}: would assign clinicId="${TARGET}" to ${count} document(s)`);
    } else {
      const res = await col.updateMany(filter, { $set: { clinicId: TARGET } });
      console.log(`${name}: matched ${res.matchedCount}, modified ${res.modifiedCount} -> clinicId="${TARGET}"`);
    }
  }

  console.log(DRY_RUN ? '\nDry run complete. Set DRY_RUN=false to apply.' : '\nDone.');
  await mongoose.disconnect();
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
