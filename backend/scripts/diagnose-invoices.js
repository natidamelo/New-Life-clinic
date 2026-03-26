/**
 * Diagnostic script: check recent patients and their invoices.
 * Run with:  node scripts/diagnose-invoices.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function run() {
  if (!MONGO_URI) {
    console.error('No MONGO_URI found in environment');
    process.exit(1);
  }
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const Patient = require('../models/Patient');
  const MedicalInvoice = require('../models/MedicalInvoice');

  // 1. Find the 5 most recent patients
  const recentPatients = await Patient.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .select('firstName lastName patientId clinicId cardType createdAt')
    .lean();

  console.log('\n=== 5 Most Recent Patients ===');
  for (const p of recentPatients) {
    console.log(`  ${p.firstName} ${p.lastName} | patientId: ${p.patientId} | clinicId: "${p.clinicId}" | cardType: ${p.cardType || 'NONE'} | created: ${p.createdAt}`);

    // 2. Check if they have invoices
    const invoices = await MedicalInvoice.find({ patient: p._id })
      .select('invoiceNumber total balance status clinicId isConsolidated isDailyConsolidated finalized items createdAt')
      .lean();

    if (invoices.length === 0) {
      console.log(`    ❌ NO INVOICES FOUND for this patient`);
    } else {
      for (const inv of invoices) {
        console.log(`    ✅ Invoice: ${inv.invoiceNumber} | total: ${inv.total} | balance: ${inv.balance} | status: ${inv.status} | clinicId: "${inv.clinicId}" | consolidated: ${inv.isConsolidated}/${inv.isDailyConsolidated} | finalized: ${inv.finalized} | items: ${inv.items?.length || 0} | created: ${inv.createdAt}`);
      }
    }
  }

  // 3. Check total invoices in DB
  const totalInvoices = await MedicalInvoice.countDocuments();
  console.log(`\n=== Total invoices in DB: ${totalInvoices} ===`);

  // 4. Check clinicId distribution
  const clinicIds = await MedicalInvoice.distinct('clinicId');
  console.log(`Invoice clinicIds: ${JSON.stringify(clinicIds)}`);

  const patientClinicIds = await Patient.distinct('clinicId');
  console.log(`Patient clinicIds: ${JSON.stringify(patientClinicIds)}`);

  // 5. Check the most recent 5 invoices
  const recentInvoices = await MedicalInvoice.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .select('invoiceNumber patientName total balance status clinicId isConsolidated isDailyConsolidated finalized createdAt')
    .lean();

  console.log('\n=== 5 Most Recent Invoices ===');
  for (const inv of recentInvoices) {
    console.log(`  ${inv.invoiceNumber} | ${inv.patientName} | total: ${inv.total} | balance: ${inv.balance} | status: ${inv.status} | clinicId: "${inv.clinicId}" | created: ${inv.createdAt}`);
  }

  await mongoose.disconnect();
  console.log('\nDone.');
}

run().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});
