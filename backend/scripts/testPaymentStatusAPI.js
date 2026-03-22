const mongoose = require('mongoose');
const MedicalInvoice = require('../models/MedicalInvoice');
const Prescription = require('../models/Prescription');

async function testPaymentStatusAPI() {
  try {
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('Connected to MongoDB');
    
    // Test the logic from the API with the shortened patient ID
    const prescriptionId = 'e1fe3d35'; // Shortened patient ID from frontend
    const medicationName = 'Ceftriaxone';
    
    console.log(`\n=== Testing Payment Status API Logic ===`);
    console.log(`Patient ID (shortened): ${prescriptionId}`);
    console.log(`Medication: ${medicationName}`);
    
    // Find prescription using the new logic
    const baseMedicationName = medicationName.split(/\s*[-–]\s*/)[0].trim();
    const medicationNameRegex = new RegExp(baseMedicationName, 'i');
    
    let prescription = null;
    
    // Try exact patient ID match first
    prescription = await Prescription.findOne({
      $and: [
        { $or: [ { patient: prescriptionId }, { patientId: prescriptionId } ] },
        { $or: [ { medicationName: medicationNameRegex }, { 'medications.name': medicationNameRegex } ] }
      ]
    }).sort({ createdAt: -1 });
    
    // If not found and prescriptionId looks like a shortened ID, try to find by partial match
    if (!prescription && prescriptionId.length === 8) {
      console.log(`🔍 Trying partial patient ID match for: ${prescriptionId}`);
      prescription = await Prescription.findOne({
        $and: [
          { 
            $or: [
              { patient: { $regex: prescriptionId + '$' } },
              { patientId: { $regex: prescriptionId + '$' } }
            ]
          },
          { $or: [ { medicationName: medicationNameRegex }, { 'medications.name': medicationNameRegex } ] }
        ]
      }).sort({ createdAt: -1 });
    }
    
    if (!prescription) {
      console.log('❌ No prescription found');
      return;
    }
    
    console.log('✅ Found prescription:', prescription.medicationName);
    console.log('   Patient ID:', prescription.patient);
    console.log('   Patient ID (alt):', prescription.patientId);
    
    // Find invoices using the new logic
    let invoices = await MedicalInvoice.find({
      $or: [
        { 'items.prescriptionId': prescription._id },
        { prescriptionId: prescription._id }
      ],
      $or: [
        { 'items.medicationName': medicationNameRegex },
        { 'items.description': medicationNameRegex }
      ]
    });
    
    if (!invoices || invoices.length === 0) {
      console.log('⚠️ No invoices found by prescriptionId, trying patient fallback');
      invoices = await MedicalInvoice.find({
        $or: [
          { patient: prescription.patient },
          { patientId: prescription.patientId },
          { patient: { $regex: prescriptionId + '$' } },
          { patientId: { $regex: prescriptionId + '$' } }
        ],
        $or: [
          { 'items.medicationName': medicationNameRegex },
          { 'items.description': medicationNameRegex }
        ]
      }).sort({ createdAt: -1 }).limit(10);
    }
    
    console.log(`📊 Found ${invoices.length} invoices`);
    
    let totalPaid = 0;
    let totalCost = 0;
    
    for (const invoice of invoices) {
      console.log(`\nInvoice: ${invoice.invoiceNumber}`);
      console.log(`  Total: ${invoice.total}`);
      console.log(`  Amount Paid: ${invoice.amountPaid}`);
      console.log(`  Balance: ${invoice.balance}`);
      console.log(`  Status: ${invoice.status}`);
      console.log(`  Items: ${invoice.items?.map(item => item.description).join(', ')}`);
      
      totalPaid += (invoice.amountPaid || 0);
      totalCost += (invoice.total || 0);
    }
    
    console.log(`\n💰 API Response would be:`);
    console.log(`  Total Cost: ${totalCost}`);
    console.log(`  Total Paid: ${totalPaid}`);
    console.log(`  Outstanding: ${totalCost - totalPaid}`);
    
    const paymentStatus = totalPaid >= totalCost ? 'fully_paid' : totalPaid > 0 ? 'partially_paid' : 'unpaid';
    console.log(`  Payment Status: ${paymentStatus}`);
    
    const apiResponse = {
      medicationName,
      totalPaid,
      totalCost,
      outstandingAmount: totalCost - totalPaid,
      paymentPercentage: totalCost > 0 ? Math.round((totalPaid / totalCost) * 100) : 0,
      paymentStatus,
      status: totalPaid >= totalCost ? 'fully_paid' : totalPaid > 0 ? 'partial' : 'unpaid'
    };
    
    console.log(`\n📤 Full API Response:`);
    console.log(JSON.stringify(apiResponse, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testPaymentStatusAPI();
