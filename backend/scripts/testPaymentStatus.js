const mongoose = require('mongoose');
const MedicalInvoice = require('../models/MedicalInvoice');
const Prescription = require('../models/Prescription');

async function testPaymentStatus() {
  try {
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('Connected to MongoDB');
    
    // Test the logic from the API
    const patientId = 'e1fe3d35'; // ato eliyas patient ID
    const medicationName = 'Ceftriaxone';
    
    console.log(`\n=== Testing Payment Status for ${medicationName} ===`);
    
    // Find prescription by patient ID
    let prescription = await Prescription.findOne({
      $or: [
        { patient: patientId },
        { patientId: patientId }
      ]
    }).sort({ createdAt: -1 });
    
    if (!prescription) {
      console.log('❌ No prescription found');
      return;
    }
    
    console.log('✅ Found prescription:', prescription.medicationName);
    
    // Find invoices
    const medicationNameRegex = new RegExp(medicationName, 'i');
    
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
          { patientId: prescription.patientId }
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
    
    console.log(`\n💰 Totals:`);
    console.log(`  Total Cost: ${totalCost}`);
    console.log(`  Total Paid: ${totalPaid}`);
    console.log(`  Outstanding: ${totalCost - totalPaid}`);
    
    const paymentStatus = totalPaid >= totalCost ? 'fully_paid' : totalPaid > 0 ? 'partially_paid' : 'unpaid';
    console.log(`  Payment Status: ${paymentStatus}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testPaymentStatus();
