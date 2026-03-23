/**
 * Migrate all tenant-scoped data from SOURCE clinicId to TARGET clinicId.
 *
 * Use this after creating a real clinic (e.g. slug "clinic") to move historical
 * data that was stored under "default" into that clinic.
 *
 * Collections updated (models with clinicId):
 *   - users (skips role: super_admin)
 *   - patients
 *   - medicalrecords
 *   - medicalinvoices
 *
 * Usage (from backend/):
 *   # Preview counts only (no writes)
 *   set DRY_RUN=true&& node scripts/migrate-default-clinic-to-slug.js
 *
 *   # Migrate default -> clinic (Atlas / production)
 *   set MONGODB_URI=your-atlas-uri&& set MIGRATE_SOURCE=default&& set MIGRATE_TARGET=clinic&& node scripts/migrate-default-clinic-to-slug.js
 *
 * Linux/macOS:
 *   DRY_RUN=true MIGRATE_SOURCE=default MIGRATE_TARGET=clinic node scripts/migrate-default-clinic-to-slug.js
 *
 * Optional: SKIP_CLINIC_CHECK=true if TARGET is not yet in the clinics collection.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
require('../config/tenantIsolation');

const mongoose = require('mongoose');
const Clinic = require('../models/Clinic');
const User = require('../models/User');
const Patient = require('../models/Patient');
const MedicalRecord = require('../models/MedicalRecord');
const MedicalInvoice = require('../models/MedicalInvoice');

const SOURCE = (process.env.MIGRATE_SOURCE || 'default').trim();
const TARGET = (process.env.MIGRATE_TARGET || 'clinic').trim();
const DRY_RUN = String(process.env.DRY_RUN || '').toLowerCase() === 'true' || process.env.DRY_RUN === '1';
const SKIP_CLINIC_CHECK = String(process.env.SKIP_CLINIC_CHECK || '').toLowerCase() === 'true';

async function assertTargetClinicExists() {
  if (SKIP_CLINIC_CHECK) {
    console.warn('⚠️ SKIP_CLINIC_CHECK=true — not verifying Clinic document for target slug.');
    return;
  }
  const clinic = await Clinic.findOne({ slug: TARGET }).setOptions({ skipTenantScope: true }).lean();
  if (!clinic) {
    throw new Error(
      `No Clinic found with slug "${TARGET}". Create it in Clinic Management first, or set SKIP_CLINIC_CHECK=true.`
    );
  }
  console.log(`✅ Target clinic exists: ${clinic.name} (slug: ${clinic.slug})`);
}

async function countScoped(Model, filter) {
  return Model.countDocuments(filter).setOptions({ skipTenantScope: true });
}

async function migrateCollection(Model, name, filter) {
  const n = await countScoped(Model, filter);
  if (DRY_RUN) {
    console.log(`[DRY_RUN] ${name}: would update ${n} document(s)`);
    return { matched: n, modified: 0, dryRun: true };
  }
  const res = await Model.updateMany(filter, { $set: { clinicId: TARGET } }).setOptions({
    skipTenantScope: true
  });
  console.log(`✅ ${name}: matched ${res.matchedCount}, modified ${res.modifiedCount}`);
  return { matched: res.matchedCount, modified: res.modifiedCount, dryRun: false };
}

async function main() {
  if (!SOURCE || !TARGET) {
    throw new Error('MIGRATE_SOURCE and MIGRATE_TARGET must be non-empty');
  }
  if (SOURCE === TARGET) {
    throw new Error('MIGRATE_SOURCE and MIGRATE_TARGET must differ');
  }

  const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoURI) {
    throw new Error('Set MONGODB_URI (or MONGO_URI) to your database connection string');
  }

  console.log('--- Migrate clinicId ---');
  console.log(`SOURCE: ${SOURCE}`);
  console.log(`TARGET: ${TARGET}`);
  console.log(`DRY_RUN: ${DRY_RUN}`);
  console.log(`DB: ${mongoURI.replace(/:([^:@/]+)@/, ':***@')}`);

  await mongoose.connect(mongoURI, {
    serverSelectionTimeoutMS: 60000,
    connectTimeoutMS: 20000
  });
  console.log('✅ Connected to MongoDB');

  await assertTargetClinicExists();

  const userFilter = { clinicId: SOURCE, role: { $ne: 'super_admin' } };
  const simpleFilter = { clinicId: SOURCE };

  await migrateCollection(User, 'users', userFilter);
  await migrateCollection(Patient, 'patients', simpleFilter);
  await migrateCollection(MedicalRecord, 'medicalrecords', simpleFilter);
  await migrateCollection(MedicalInvoice, 'medicalinvoices', simpleFilter);

  const remainingUsers = await countScoped(User, { clinicId: SOURCE });
  const remainingPatients = await countScoped(Patient, simpleFilter);
  if (!DRY_RUN && remainingUsers > 0) {
    console.log(`ℹ️ ${remainingUsers} user(s) still have clinicId="${SOURCE}" (usually super_admin — left unchanged).`);
  }
  if (!DRY_RUN && remainingPatients > 0) {
    console.warn(`⚠️ ${remainingPatients} patient(s) still have clinicId="${SOURCE}" — re-run or check DB.`);
  }

  console.log(DRY_RUN ? '\n✅ Dry run complete. Set DRY_RUN=false (or unset) to apply.' : '\n✅ Migration complete.');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
