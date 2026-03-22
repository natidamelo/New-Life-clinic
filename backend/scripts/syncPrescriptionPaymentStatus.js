const mongoose = require('mongoose');
const Prescription = require('../models/Prescription');
const MedicalInvoice = require('../models/MedicalInvoice');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Function to sync prescription payment status with invoice
const syncPrescriptionPaymentStatus = async (prescriptionId) => {
  try {
    console.log(`🔍 Syncing payment status for prescription: ${prescriptionId}`);
    
    // Find the prescription
    const prescription = await Prescription.findById(prescriptionId);
    if (!prescription) {
      console.error(`❌ Prescription ${prescriptionId} not found`);
      return;
    }
    
    console.log(`📋 Found prescription:`, {
      id: prescription._id,
      patient: prescription.patient,
      medicationName: prescription.medicationName,
      currentPaymentStatus: prescription.paymentStatus,
      currentStatus: prescription.status
    });
    
    // Find associated invoice
    let invoice = null;
    
    // Try to find invoice by invoiceId field
    if (prescription.invoiceId) {
      invoice = await MedicalInvoice.findById(prescription.invoiceId);
      console.log(`🔍 Found invoice by invoiceId: ${prescription.invoiceId}`);
    }
    
    // If not found, try to find by medications array
    if (!invoice && prescription.medications && prescription.medications.length > 0) {
      for (const medication of prescription.medications) {
        if (medication.invoiceId) {
          invoice = await MedicalInvoice.findById(medication.invoiceId);
          if (invoice) {
            console.log(`🔍 Found invoice by medication invoiceId: ${medication.invoiceId}`);
            break;
          }
        }
      }
    }
    
    // If still not found, try to find by patient and medication name
    if (!invoice) {
      const invoices = await MedicalInvoice.find({
        patient: prescription.patient,
        'items.description': { $regex: prescription.medicationName, $options: 'i' }
      });
      
      if (invoices.length > 0) {
        invoice = invoices[0]; // Take the first match
        console.log(`🔍 Found invoice by patient and medication name: ${invoice._id}`);
      }
    }
    
    if (!invoice) {
      console.error(`❌ No associated invoice found for prescription ${prescriptionId}`);
      return;
    }
    
    console.log(`💰 Found associated invoice:`, {
      id: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      total: invoice.total,
      amountPaid: invoice.amountPaid,
      balance: invoice.balance,
      status: invoice.status
    });
    
    // Determine prescription payment status based on invoice
    const prescriptionPaymentStatus = invoice.balance <= 0 ? 'paid' : 'partial';
    const prescriptionStatus = prescriptionPaymentStatus === 'paid' ? 'Active' : prescription.status;
    
    console.log(`🔄 Updating prescription payment status:`, {
      from: prescription.paymentStatus,
      to: prescriptionPaymentStatus,
      statusFrom: prescription.status,
      statusTo: prescriptionStatus
    });
    
    // Update prescription
    prescription.paymentStatus = prescriptionPaymentStatus;
    prescription.status = prescriptionStatus;
    
    if (prescriptionPaymentStatus === 'paid') {
      prescription.paidAt = new Date();
    }
    
    // Update payment authorization if it exists
    if (prescription.paymentAuthorization) {
      prescription.paymentAuthorization.paymentStatus = prescriptionPaymentStatus === 'paid' ? 'fully_paid' : 'partially_paid';
      prescription.paymentAuthorization.lastUpdated = new Date();
      
      // If fully paid, authorize all doses
      if (prescriptionPaymentStatus === 'paid') {
        const totalDoses = prescription.quantity || 1;
        const totalDays = prescription.duration ? parseInt(prescription.duration) : 7;
        prescription.paymentAuthorization.paidDays = totalDays;
        prescription.paymentAuthorization.totalDays = totalDays;
        prescription.paymentAuthorization.authorizedDoses = totalDoses;
        prescription.paymentAuthorization.unauthorizedDoses = 0;
        prescription.paymentAuthorization.outstandingAmount = 0;
        
        console.log(`✅ Updated payment authorization for fully paid prescription:`, {
          paidDays: totalDays,
          totalDays: totalDays,
          authorizedDoses: totalDoses,
          unauthorizedDoses: 0,
          outstandingAmount: 0
        });
      }
    }
    
    await prescription.save();
    console.log(`✅ Successfully updated prescription ${prescriptionId} payment status to ${prescriptionPaymentStatus}`);
    
  } catch (error) {
    console.error(`❌ Error syncing prescription payment status:`, error);
  }
};

// Main function
const main = async () => {
  await connectDB();
  
  // Get prescription ID from command line argument
  const prescriptionId = process.argv[2];
  
  if (!prescriptionId) {
    console.error('❌ Please provide a prescription ID as an argument');
    console.log('Usage: node syncPrescriptionPaymentStatus.js <prescriptionId>');
    process.exit(1);
  }
  
  await syncPrescriptionPaymentStatus(prescriptionId);
  
  console.log('🎉 Script completed');
  process.exit(0);
};

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { syncPrescriptionPaymentStatus };
