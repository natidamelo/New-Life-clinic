const mongoose = require('mongoose');
const Prescription = require('../models/Prescription');
const NurseTask = require('../models/NurseTask');

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

// Function to sync nurse task payment status with prescription
const syncNurseTaskPaymentStatus = async (prescriptionId) => {
  try {
    console.log(`🔍 Syncing nurse task payment status for prescription: ${prescriptionId}`);
    
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
      paymentStatus: prescription.paymentStatus,
      status: prescription.status,
      paymentAuthorization: prescription.paymentAuthorization
    });
    
    // Find associated nurse tasks
    const nurseTasks = await NurseTask.find({
      'medicationDetails.prescriptionId': prescriptionId
    });
    
    if (nurseTasks.length === 0) {
      console.log(`⚠️ No nurse tasks found for prescription ${prescriptionId}`);
      return;
    }
    
    console.log(`🏥 Found ${nurseTasks.length} nurse tasks to update`);
    
    for (const task of nurseTasks) {
      console.log(`🔄 Updating nurse task ${task._id}...`);
      
      // Update task payment authorization
      if (task.paymentAuthorization) {
        const oldAuth = { ...task.paymentAuthorization };
        
        task.paymentAuthorization.paidDays = prescription.paymentAuthorization?.paidDays || 0;
        task.paymentAuthorization.totalDays = prescription.paymentAuthorization?.totalDays || 0;
        task.paymentAuthorization.paymentStatus = prescription.paymentAuthorization?.paymentStatus || 'unpaid';
        task.paymentAuthorization.canAdminister = (prescription.paymentAuthorization?.paidDays || 0) > 0;
        task.paymentAuthorization.authorizedDoses = prescription.paymentAuthorization?.authorizedDoses || 0;
        task.paymentAuthorization.unauthorizedDoses = prescription.paymentAuthorization?.unauthorizedDoses || 0;
        task.paymentAuthorization.outstandingAmount = prescription.paymentAuthorization?.outstandingAmount || 0;
        task.paymentAuthorization.lastUpdated = new Date();
        
        // Update restriction message
        if (prescription.paymentStatus === 'paid') {
          task.paymentAuthorization.restrictionMessage = '';
        } else if (prescription.paymentStatus === 'partial') {
          task.paymentAuthorization.restrictionMessage = 'Partial payment - limited doses authorized';
        } else {
          task.paymentAuthorization.restrictionMessage = 'Payment required before administration';
        }
        
        console.log(`📊 Payment authorization updated:`, {
          from: {
            paidDays: oldAuth.paidDays,
            totalDays: oldAuth.totalDays,
            paymentStatus: oldAuth.paymentStatus,
            canAdminister: oldAuth.canAdminister,
            authorizedDoses: oldAuth.authorizedDoses,
            unauthorizedDoses: oldAuth.unauthorizedDoses,
            outstandingAmount: oldAuth.outstandingAmount
          },
          to: {
            paidDays: task.paymentAuthorization.paidDays,
            totalDays: task.paymentAuthorization.totalDays,
            paymentStatus: task.paymentAuthorization.paymentStatus,
            canAdminister: task.paymentAuthorization.canAdminister,
            authorizedDoses: task.paymentAuthorization.authorizedDoses,
            unauthorizedDoses: task.paymentAuthorization.unauthorizedDoses,
            outstandingAmount: task.paymentAuthorization.outstandingAmount
          }
        });
      }
      
      await task.save();
      console.log(`✅ Successfully updated nurse task ${task._id}`);
    }
    
    console.log(`🎉 Successfully updated ${nurseTasks.length} nurse tasks for prescription ${prescriptionId}`);
    
  } catch (error) {
    console.error(`❌ Error syncing nurse task payment status:`, error);
  }
};

// Main function
const main = async () => {
  await connectDB();
  
  // Get prescription ID from command line argument
  const prescriptionId = process.argv[2];
  
  if (!prescriptionId) {
    console.error('❌ Please provide a prescription ID as an argument');
    console.log('Usage: node syncNurseTaskPaymentStatus.js <prescriptionId>');
    process.exit(1);
  }
  
  await syncNurseTaskPaymentStatus(prescriptionId);
  
  console.log('🎉 Script completed');
  process.exit(0);
};

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { syncNurseTaskPaymentStatus };
