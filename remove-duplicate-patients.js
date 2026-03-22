/**
 * Remove duplicate patients from clinic-cms database.
 * Duplicates: same normalized name AND same normalized phone.
 * Uses native MongoDB driver (same as Compass) to avoid connection issues.
 *
 * Usage: node remove-duplicate-patients.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/clinic-cms';

function normalizePhone(phone) {
  if (phone == null || typeof phone !== 'string') return '';
  return phone.replace(/\D/g, '');
}

function normalizeName(firstName, lastName) {
  const first = (firstName == null ? '' : String(firstName)).trim().toLowerCase();
  const last = (lastName == null ? '' : String(lastName)).trim().toLowerCase();
  return `${first} ${last}`.trim() || '';
}

function choosePatientToKeep(patients) {
  const withCard = patients.filter(p => p.cardStatus === 'active' || (p.cardIssueDate && p.cardStatus !== 'suspended'));
  if (withCard.length > 0) {
    withCard.sort((a, b) => new Date(b.createdAt || b._id.getTimestamp()) - new Date(a.createdAt || a._id.getTimestamp()));
    return withCard[0];
  }
  patients.sort((a, b) => new Date(b.createdAt || b._id.getTimestamp()) - new Date(a.createdAt || a._id.getTimestamp()));
  return patients[0];
}

// Collections that reference patients (collection name, field(s) to update)
const REFS = [
  { coll: 'medicalrecords', fields: ['patient', 'patientId'] },
  { coll: 'medicalinvoices', fields: ['patient'] },
  { coll: 'prescriptions', fields: ['patient'] },
  { coll: 'vitalsigns', fields: ['patientId'] },
  { coll: 'nursetasks', fields: ['patientId'] },
  { coll: 'referrals', fields: ['patientId'] },
  { coll: 'inventorytransactions', fields: ['patient'] },
  { coll: 'patientcards', fields: ['patient'] },
  { coll: 'servicerequests', fields: ['patient'] },
  { coll: 'appointments', fields: ['patientId'] },
  { coll: 'labrequests', fields: ['patient'] },
  { coll: 'medicalcertificates', fields: ['patientId'] },
  { coll: 'consultations', fields: ['patientId'] },
  { coll: 'visits', fields: ['patientId'] },
  { coll: 'imagingorders', fields: ['patientId'] },
  { coll: 'depoinjectionschedules', fields: ['patient', 'patientId'] },
  { coll: 'billinginvoices', fields: ['patientId'] },
  { coll: 'dispenseditemcharges', fields: ['patient'] },
  { coll: 'invoices', fields: ['patient'] },
  { coll: 'medicalrecordversions', fields: ['patient'] },
];

async function updateReferences(db, duplicateId, keepId, keepPatientIdStr) {
  for (const { coll, fields } of REFS) {
    try {
      const col = db.collection(coll);
      for (const field of fields) {
        const r = await col.updateMany({ [field]: duplicateId }, { $set: { [field]: keepId } });
        if (r.modifiedCount > 0) console.log(`  Updated ${coll}.${field}: ${r.modifiedCount}`);
      }
    } catch (e) {
      console.warn(`  Warning ${coll}:`, e.message);
    }
  }
  // laborders: patient (ObjectId) and patientId (string)
  try {
    const r = await db.collection('laborders').updateMany(
      { $or: [ { patient: duplicateId }, { patientId: duplicateId } ] },
      { $set: { patient: keepId, patientId: keepPatientIdStr } }
    );
    if (r.modifiedCount > 0) console.log(`  Updated laborders: ${r.modifiedCount}`);
  } catch (e) {
    console.warn('  Warning laborders:', e.message);
  }
  // dashdiets: patientId is string
  try {
    const dupDoc = await db.collection('patients').findOne({ _id: duplicateId }, { projection: { patientId: 1 } });
    if (dupDoc && dupDoc.patientId) {
      const r = await db.collection('dashdiets').updateMany(
        { patientId: dupDoc.patientId },
        { $set: { patientId: keepPatientIdStr } }
      );
      if (r.modifiedCount > 0) console.log(`  Updated dashdiets: ${r.modifiedCount}`);
    }
  } catch (e) {
    console.warn('  Warning dashdiets:', e.message);
  }
}

async function run() {
  console.log('Connecting to', MONGODB_URI.replace(/\/\/[^@]+@/, '//***@'));
  const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  await client.connect();
  const db = client.db();
  console.log('Connected to clinic-cms\n');

  const patients = await db.collection('patients').find({}).toArray();
  console.log(`Total patients: ${patients.length}`);

  const byNameAndPhone = new Map();
  for (const p of patients) {
    const phone = normalizePhone(p.contactNumber);
    const name = normalizeName(p.firstName, p.lastName);
    if (!phone || !name) continue;
    const key = `${name}|${phone}`;
    if (!byNameAndPhone.has(key)) byNameAndPhone.set(key, []);
    byNameAndPhone.get(key).push(p);
  }

  const duplicateGroups = [...byNameAndPhone.values()].filter(g => g.length > 1);
  console.log(`Duplicate groups (same name + same phone): ${duplicateGroups.length}\n`);

  if (duplicateGroups.length === 0) {
    console.log('No duplicate patients found.');
    await client.close();
    return;
  }

  let totalRemoved = 0;
  for (const group of duplicateGroups) {
    const keep = choosePatientToKeep(group);
    const toRemove = group.filter(p => !p._id.equals(keep._id));
    const keepId = keep._id;
    const keepPatientIdStr = keep.patientId || keepId.toString();

    console.log(`"${keep.firstName} ${keep.lastName}" + ${group[0].contactNumber}: keeping ${keep.patientId}, removing ${toRemove.map(p => p.patientId).join(', ')}`);

    for (const dup of toRemove) {
      await updateReferences(db, dup._id, keepId, keepPatientIdStr);
      await db.collection('patients').deleteOne({ _id: dup._id });
      console.log(`  Deleted ${dup.patientId} (${dup.firstName} ${dup.lastName}).`);
      totalRemoved++;
    }
    console.log('');
  }

  console.log(`Done. Removed ${totalRemoved} duplicate patient(s).`);
  await client.close();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
