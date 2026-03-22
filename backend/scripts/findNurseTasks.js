const mongoose = require('mongoose');
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

// Function to find nurse tasks for a patient
const findNurseTasks = async (patientId) => {
  try {
    console.log(`🔍 Finding nurse tasks for patient: ${patientId}`);
    
    // Find nurse tasks for the patient
    const tasks = await NurseTask.find({
      patientId: patientId
    });
    
    console.log(`📋 Found ${tasks.length} nurse tasks for patient ${patientId}`);
    
    if (tasks.length === 0) {
      console.log('⚠️ No nurse tasks found for this patient');
      return;
    }
    
    tasks.forEach((task, index) => {
      console.log(`\n🏥 Task ${index + 1}:`);
      console.log('  ID:', task._id);
      console.log('  Patient:', task.patientId);
      console.log('  Patient Name:', task.patientName);
      console.log('  Medication:', task.medicationDetails?.medicationName);
      console.log('  Prescription ID:', task.medicationDetails?.prescriptionId);
      console.log('  Status:', task.status);
      console.log('  Task Type:', task.taskType);
      console.log('  Payment Authorization:', task.paymentAuthorization);
      console.log('  Created:', task.createdAt);
      console.log('---');
    });
    
  } catch (error) {
    console.error(`❌ Error finding nurse tasks:`, error);
  }
};

// Main function
const main = async () => {
  await connectDB();
  
  // Get patient ID from command line argument
  const patientId = process.argv[2];
  
  if (!patientId) {
    console.error('❌ Please provide a patient ID as an argument');
    console.log('Usage: node findNurseTasks.js <patientId>');
    process.exit(1);
  }
  
  await findNurseTasks(patientId);
  
  console.log('🎉 Script completed');
  process.exit(0);
};

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { findNurseTasks };
