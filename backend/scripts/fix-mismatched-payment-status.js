/**
 * Fix Mismatched Payment Status Script
 * 
 * This script finds prescriptions marked as 'paid' but with unpaid invoices,
 * and resets them to the correct status.
 */

const mongoose = require('mongoose');
const Prescription = require('../models/Prescription');
const MedicalInvoice = require('../models/MedicalInvoice');

async function fixMismatchedPaymentStatus() {
  try {
    console.log('🔧 Starting fix for mismatched payment status...');
    
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/clinic-cms', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');
    
    // Find all prescriptions marked as paid
    const paidPrescriptions = await Prescription.find({
      paymentStatus: 'paid'
    });
    
    console.log(`📋 Found ${paidPrescriptions.length} prescriptions marked as paid`);
    
    let fixedCount = 0;
    let alreadyCorrectCount = 0;
    let errors = 0;
    
    for (const prescription of paidPrescriptions) {
      try {
        console.log(`🔍 Checking prescription: ${prescription.medicationName} (${prescription._id})`);
        
        // Find related invoices for this prescription
        const relatedInvoices = await MedicalInvoice.find({
          patient: prescription.patient,
          'items.prescriptionId': prescription._id
        });
        
        if (relatedInvoices.length === 0) {
          console.log(`⚠️ No invoices found for prescription ${prescription._id}`);
          continue;
        }
        
        // Check if any invoice is actually paid
        const hasPaidInvoice = relatedInvoices.some(invoice => 
          invoice.status === 'paid' || 
          (invoice.amountPaid && invoice.amountPaid >= invoice.total)
        );
        
        if (hasPaidInvoice) {
          console.log(`✅ Prescription ${prescription._id} has paid invoice - status is correct`);
          alreadyCorrectCount++;
          continue;
        }
        
        // Check if all invoices are unpaid
        const allUnpaid = relatedInvoices.every(invoice => 
          invoice.status === 'pending' || 
          invoice.status === 'unpaid' ||
          (invoice.amountPaid === 0 || invoice.amountPaid < invoice.total)
        );
        
        if (allUnpaid) {
          console.log(`❌ Prescription ${prescription._id} has unpaid invoices - fixing status...`);
          
          // Reset prescription status to pending
          prescription.paymentStatus = 'pending';
          prescription.status = 'Pending';
          if (prescription.paymentAuthorization) {
            prescription.paymentAuthorization.paymentStatus = 'unpaid';
          }
          prescription.paidAt = undefined;
          
          await prescription.save();
          console.log(`✅ Fixed prescription ${prescription._id} status to pending`);
          fixedCount++;
        } else {
          console.log(`⚠️ Prescription ${prescription._id} has mixed invoice statuses`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing prescription ${prescription._id}:`, error.message);
        errors++;
      }
    }
    
    console.log('\n🎉 Fix completed!');
    console.log(`📊 Summary:`);
    console.log(`   - Prescriptions fixed: ${fixedCount}`);
    console.log(`   - Already correct: ${alreadyCorrectCount}`);
    console.log(`   - Errors: ${errors}`);
    console.log(`   - Total processed: ${paidPrescriptions.length}`);
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
if (require.main === module) {
  fixMismatchedPaymentStatus();
}

module.exports = { fixMismatchedPaymentStatus };

