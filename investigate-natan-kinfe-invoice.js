const mongoose = require('mongoose');
require('dotenv').config();

const MedicalInvoice = require('./backend/models/MedicalInvoice');
const Patient = require('./backend/models/Patient');
const Prescription = require('./backend/models/Prescription');

async function investigateNatanKinfeInvoice() {
  try {
    console.log('🔍 Investigating Natan Kinfe\'s medication extension invoice...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find Natan Kinfe's patient record
    const natanPatient = await Patient.findOne({ 
      $or: [
        { firstName: 'Natan', lastName: 'Kinfe' },
        { firstName: 'natan', lastName: 'kinfe' },
        { firstName: { $regex: /natan/i } },
        { lastName: { $regex: /kinfe/i } }
      ]
    });
    
    if (!natanPatient) {
      console.log('❌ Patient Natan Kinfe not found');
      return;
    }
    
    console.log(`✅ Found patient: ${natanPatient.firstName} ${natanPatient.lastName}`);
    console.log(`   Patient ID: ${natanPatient._id}`);
    console.log(`   Patient ID (string): ${natanPatient.patientId}`);
    
    // Find the specific invoice mentioned in the user query
    const invoice = await MedicalInvoice.findOne({
      invoiceNumber: { $regex: /1756132268415/ }
    });
    
    if (!invoice) {
      console.log('❌ Invoice INV-EXT-1756132268415-ibriy not found');
      
      // Let's find recent extension invoices for Natan Kinfe
      const recentInvoices = await MedicalInvoice.find({
        patient: natanPatient._id,
        isExtension: true
      }).sort({ createdAt: -1 }).limit(5);
      
      console.log(`\n📋 Found ${recentInvoices.length} recent extension invoices for Natan Kinfe:`);
      recentInvoices.forEach((inv, index) => {
        console.log(`\n${index + 1}. Invoice: ${inv.invoiceNumber}`);
        console.log(`   Status: ${inv.status}`);
        console.log(`   Total: ${inv.total} ETB`);
        console.log(`   Balance: ${inv.balance} ETB`);
        console.log(`   Items: ${inv.items?.length || 0}`);
        
        if (inv.items && inv.items.length > 0) {
          inv.items.forEach((item, itemIndex) => {
            console.log(`   Item ${itemIndex + 1}: ${item.description}`);
            console.log(`     Quantity: ${item.quantity}`);
            console.log(`     Unit Price: ${item.unitPrice} ETB`);
            console.log(`     Total: ${item.total} ETB`);
            if (item.metadata) {
              console.log(`     Metadata:`, item.metadata);
            }
          });
        }
      });
      
      return;
    }
    
    console.log(`\n📄 Found invoice: ${invoice.invoiceNumber}`);
    console.log(`   Status: ${invoice.status}`);
    console.log(`   Total: ${invoice.total} ETB`);
    console.log(`   Balance: ${invoice.balance} ETB`);
    console.log(`   Created: ${invoice.createdAt}`);
    console.log(`   Items: ${invoice.items?.length || 0}`);
    
    if (invoice.items && invoice.items.length > 0) {
      invoice.items.forEach((item, index) => {
        console.log(`\n   Item ${index + 1}:`);
        console.log(`     Description: ${item.description}`);
        console.log(`     Quantity: ${item.quantity}`);
        console.log(`     Unit Price: ${item.unitPrice} ETB`);
        console.log(`     Total: ${item.total} ETB`);
        console.log(`     Category: ${item.category}`);
        console.log(`     Item Type: ${item.itemType}`);
        
        if (item.metadata) {
          console.log(`     Metadata:`);
          console.log(`       Extension: ${item.metadata.extension}`);
          console.log(`       Additional Days: ${item.metadata.additionalDays}`);
          console.log(`       Additional Doses: ${item.metadata.additionalDoses}`);
          console.log(`       Doses Per Day: ${item.metadata.dosesPerDay}`);
          console.log(`       Total Doses: ${item.metadata.totalDoses}`);
          console.log(`       Frequency: ${item.metadata.frequency}`);
          console.log(`       Medication Name: ${item.metadata.medicationName}`);
        }
      });
    }
    
    // Check if this invoice has extension details
    if (invoice.extensionDetails) {
      console.log(`\n🔧 Extension Details:`);
      console.log(`   Original Duration: ${invoice.extensionDetails.originalDuration}`);
      console.log(`   Additional Days: ${invoice.extensionDetails.additionalDays}`);
      console.log(`   Explicit Additional Doses: ${invoice.extensionDetails.explicitAdditionalDoses}`);
      console.log(`   Doses Per Day: ${invoice.extensionDetails.dosesPerDay}`);
      console.log(`   Total Doses: ${invoice.extensionDetails.totalDoses}`);
      console.log(`   Frequency: ${invoice.extensionDetails.frequency}`);
      console.log(`   Extension Type: ${invoice.extensionDetails.extensionType}`);
    }
    
    // Find the related prescription
    if (invoice.originalPrescriptionId) {
      const prescription = await Prescription.findById(invoice.originalPrescriptionId);
      if (prescription) {
        console.log(`\n💊 Related Prescription:`);
        console.log(`   Medication: ${prescription.medicationName}`);
        console.log(`   Frequency: ${prescription.frequency}`);
        console.log(`   Duration: ${prescription.duration}`);
        console.log(`   Dosage: ${prescription.dosage}`);
        console.log(`   Status: ${prescription.status}`);
        console.log(`   Is Extension: ${prescription.isExtension}`);
        
        if (prescription.extensionDetails) {
          console.log(`   Extension Details:`);
          console.log(`     Additional Days: ${prescription.extensionDetails.additionalDays}`);
          console.log(`     Additional Doses: ${prescription.extensionDetails.additionalDoses}`);
          console.log(`     Extension Frequency: ${prescription.extensionDetails.extensionFrequency}`);
        }
      }
    }
    
    console.log('\n🔍 Analysis:');
    console.log('Based on the user\'s report, this should be a BID (twice daily) medication');
    console.log('that was extended for 3 days, which should result in 6 doses (3 days × 2 doses/day)');
    console.log('but the invoice shows only 3 doses, indicating it was calculated as QD (once daily).');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  }
}

investigateNatanKinfeInvoice();
