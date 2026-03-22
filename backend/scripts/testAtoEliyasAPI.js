const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Prescription = require('../models/Prescription');
const MedicalInvoice = require('../models/MedicalInvoice');

async function testAtoEliyasAPI() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to MongoDB');

    // Find prescriptions for ato eliyas (using the patient ID from logs)
    const patientId = '68b968839274105ee1fe3d35';
    console.log(`🔍 Looking for prescriptions for patient: ${patientId}`);

    const prescriptions = await Prescription.find({
      $or: [
        { patient: patientId },
        { patientId: patientId }
      ]
    });

    console.log(`📋 Found ${prescriptions.length} prescriptions for ato eliyas`);

    for (const prescription of prescriptions) {
      console.log(`\n📝 Prescription ID: ${prescription._id}`);
      console.log(`   Patient: ${prescription.patient}`);
      console.log(`   Patient ID: ${prescription.patientId}`);
      console.log(`   Medications: ${prescription.medications?.map(m => m.medicationName).join(', ')}`);

      // Test the medication payment status logic for each medication
      for (const medication of prescription.medications || []) {
        console.log(`\n💊 Testing medication: ${medication.medicationName}`);
        
        // Search for invoices for this prescription and medication
        const invoices = await MedicalInvoice.find({
          prescription: prescription._id,
          'medications.medicationName': medication.medicationName
        });

        console.log(`   📊 Found ${invoices.length} invoices for ${medication.medicationName}`);

        let totalPaid = 0;
        let totalCost = 0;

        for (const invoice of invoices) {
          const medItem = invoice.medications.find(m => m.medicationName === medication.medicationName);
          if (medItem) {
            totalPaid += invoice.amountPaid || 0;
            totalCost += medItem.quantity * medItem.unitPrice;
            console.log(`   💰 Invoice ${invoice._id}: amountPaid=${invoice.amountPaid}, cost=${medItem.quantity * medItem.unitPrice}`);
          }
        }

        const outstandingAmount = totalCost - totalPaid;
        const paymentStatus = totalPaid >= totalCost ? 'fully_paid' : totalPaid > 0 ? 'partially_paid' : 'unpaid';

        console.log(`   📈 Total Paid: ${totalPaid} ETB`);
        console.log(`   📈 Total Cost: ${totalCost} ETB`);
        console.log(`   📈 Outstanding: ${outstandingAmount} ETB`);
        console.log(`   📈 Payment Status: ${paymentStatus}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

testAtoEliyasAPI();
