const mongoose = require('mongoose');
const MedicalInvoice = require('../models/MedicalInvoice');

async function testAPIResponse() {
  try {
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('Connected to MongoDB');
    
    // Test with the actual patient ID from the database
    const patientId = '68b968839274105ee1fe3d35'; // Full patient ID for ato eliyas
    const medicationName = 'Ceftriaxone';
    
    console.log(`\n=== Testing API Response for ${medicationName} ===`);
    console.log(`Patient ID: ${patientId}`);
    
    // Find invoices for ato eliyas with Ceftriaxone
    const medicationNameRegex = new RegExp(medicationName, 'i');
    
    const invoices = await MedicalInvoice.find({
      $or: [
        { patient: patientId },
        { patientId: patientId }
      ],
      $or: [
        { 'items.medicationName': medicationNameRegex },
        { 'items.description': medicationNameRegex }
      ]
    });
    
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
    
    console.log(`\n💰 API Response:`);
    console.log(`  Total Cost: ${totalCost}`);
    console.log(`  Total Paid: ${totalPaid}`);
    console.log(`  Outstanding: ${totalCost - totalPaid}`);
    
    const paymentStatus = totalPaid >= totalCost ? 'fully_paid' : totalPaid > 0 ? 'partially_paid' : 'unpaid';
    console.log(`  Payment Status: ${paymentStatus}`);
    
    // This should show 2000 ETB outstanding for ato eliyas
    if (totalCost - totalPaid === 2000) {
      console.log('✅ SUCCESS: Correct outstanding amount (2000 ETB)');
    } else {
      console.log('❌ ERROR: Expected 2000 ETB outstanding, got', totalCost - totalPaid);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testAPIResponse();
