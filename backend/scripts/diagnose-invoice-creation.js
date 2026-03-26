/**
 * Diagnostic: Try to create an invoice manually to see what error occurs
 * Run with:  node scripts/diagnose-invoice-creation.js
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
  const CardType = require('../models/CardType');
  const billingService = require('../services/billingService');

  // Get the most recent patient
  const patient = await Patient.findOne().sort({ createdAt: -1 }).lean();
  if (!patient) {
    console.error('No patients found');
    process.exit(1);
  }
  console.log(`\nPatient: ${patient.firstName} ${patient.lastName} (${patient._id})`);
  console.log(`  clinicId: "${patient.clinicId}"`);
  console.log(`  cardType: ${patient.cardType}`);

  // Check card type
  if (patient.cardType) {
    const cardType = await CardType.findById(patient.cardType);
    if (cardType) {
      console.log(`  Card: ${cardType.name} - ETB ${cardType.price}`);
    } else {
      console.log(`  ❌ CardType ${patient.cardType} NOT FOUND in database!`);
    }
  }

  // Try to generate an invoice number
  console.log('\n--- Testing Invoice Number Generation ---');
  try {
    const invoiceNumber = await MedicalInvoice.generateInvoiceNumber();
    console.log(`  Generated invoice number: ${invoiceNumber}`);
  } catch (err) {
    console.error(`  ❌ Failed to generate invoice number: ${err.message}`);
  }

  // Try to create an invoice manually (without tenant context)
  console.log('\n--- Testing Invoice Creation ---');
  try {
    const cardType = await CardType.findById(patient.cardType);
    const fee = cardType ? cardType.price : 0;
    const cardName = cardType ? cardType.name : 'Unknown';

    const items = fee > 0 ? [{
      itemType: 'card',
      category: 'card',
      description: `${cardName} patient card membership`,
      quantity: 1,
      unitPrice: fee,
      totalPrice: fee,
      total: fee,
      metadata: { cardTypeId: patient.cardType },
      addedAt: new Date()
    }] : [];

    console.log(`  Items to create: ${items.length} (fee: ${fee})`);

    // Try creating invoice directly (bypassing billingService to isolate the issue)
    const invoiceNumber = await MedicalInvoice.generateInvoiceNumber();
    const invoice = new MedicalInvoice({
      invoiceNumber,
      patient: patient._id,
      patientId: patient.patientId,
      patientName: `${patient.firstName} ${patient.lastName}`,
      clinicId: patient.clinicId, // Use patient's clinicId explicitly
      items: items.map(item => ({
        ...item,
        discount: 0,
        tax: 0,
        total: item.totalPrice || item.unitPrice * item.quantity,
        addedAt: new Date(),
        category: item.category || 'card'
      })),
      subtotal: fee,
      taxTotal: 0,
      discountTotal: 0,
      total: fee,
      balance: fee,
      dateIssued: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'pending',
      notes: 'Diagnostic test invoice',
      isConsolidated: true,
      isDailyConsolidated: true,
      type: 'consolidated',
      finalized: false
    });

    console.log(`  Invoice before save:`, {
      invoiceNumber: invoice.invoiceNumber,
      clinicId: invoice.clinicId,
      total: invoice.total,
      balance: invoice.balance,
      items: invoice.items.length
    });

    await invoice.save();
    console.log(`  ✅ Invoice saved successfully: ${invoice.invoiceNumber} (total: ${invoice.total}, clinicId: "${invoice.clinicId}")`);

    // Verify it can be found
    const found = await MedicalInvoice.findById(invoice._id).lean();
    console.log(`  Found after save: ${found ? 'YES' : 'NO'}`);
    if (found) {
      console.log(`    clinicId: "${found.clinicId}", total: ${found.total}, balance: ${found.balance}`);
    }

    // Clean up test invoice
    await MedicalInvoice.findByIdAndDelete(invoice._id);
    console.log(`  Test invoice cleaned up.`);
  } catch (err) {
    console.error(`  ❌ Invoice creation FAILED: ${err.message}`);
    console.error(`  Stack: ${err.stack}`);
  }

  // Check what user clinicIds look like
  const User = require('../models/User');
  const users = await User.find().select('firstName lastName role clinicId').lean();
  console.log('\n=== Users and their clinicIds ===');
  for (const u of users) {
    console.log(`  ${u.firstName} ${u.lastName} | role: ${u.role} | clinicId: "${u.clinicId || 'NOT SET'}"`);
  }

  await mongoose.disconnect();
  console.log('\nDone.');
}

run().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});
