const mongoose = require('mongoose');

async function findAllData() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to MongoDB');
    
    // Check all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n📋 Available collections:');
    collections.forEach(col => console.log(`   - ${col.name}`));
    
    // Check NurseTasks collection
    const NurseTask = mongoose.connection.collection('nursetasks');
    const taskCount = await NurseTask.countDocuments();
    console.log(`\n📋 Total NurseTasks: ${taskCount}`);
    
    if (taskCount > 0) {
      const sampleTasks = await NurseTask.find({}).limit(5).toArray();
      console.log('\n📋 Sample tasks:');
      sampleTasks.forEach((task, i) => {
        console.log(`${i+1}. Patient: ${task.patientName}, Medication: ${task.medicationDetails?.medicationName || 'N/A'}`);
      });
    }
    
    // Check Patients collection
    const Patient = mongoose.connection.collection('patients');
    const patientCount = await Patient.countDocuments();
    console.log(`\n👥 Total Patients: ${patientCount}`);
    
    if (patientCount > 0) {
      const samplePatients = await Patient.find({}).limit(5).toArray();
      console.log('\n👥 Sample patients:');
      samplePatients.forEach((patient, i) => {
        console.log(`${i+1}. Name: ${patient.firstName} ${patient.lastName}, ID: ${patient._id}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

findAllData();

console.log('Invoice Details:', window.apiDebug.currentInvoice);

// Find the payment button and log its disabled state
const paymentButton = document.querySelector('button[aria-label="Add Payment"]');
console.log('Payment Button:', paymentButton);
console.log('Is Payment Button Disabled:', paymentButton?.disabled);
