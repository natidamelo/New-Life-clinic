/**
 * Check if the new prescription was created and why it's not showing
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });

const Prescription = require('./backend/models/Prescription');
const NurseTask = require('./backend/models/NurseTask');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms';

async function checkLatestPrescription() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Find ALL Normal Saline prescriptions for semhal melaku
    const prescriptions = await Prescription.find({
      patient: '68e36fa0f2ee9b30df5eba22',
      medicationName: 'Normal Saline (0.9% NaCl)'
    }).sort({ createdAt: -1 }).limit(10);

    console.log(`📋 Found ${prescriptions.length} Normal Saline prescriptions:\n`);
    
    prescriptions.forEach((p, index) => {
      console.log(`Prescription ${index + 1}:`);
      console.log(`   ID: ${p._id}`);
      console.log(`   Status: ${p.status}`);
      console.log(`   Created: ${p.createdAt}`);
      console.log(`   Start Date: ${p.startDate}`);
      console.log('');
    });

    // Find ALL Normal Saline nurse tasks
    const tasks = await NurseTask.find({
      patient: '68e36fa0f2ee9b30df5eba22',
      medicationName: 'Normal Saline (0.9% NaCl)'
    }).sort({ createdAt: -1 }).limit(10);

    console.log(`\n📋 Found ${tasks.length} Normal Saline nurse tasks:\n`);
    
    tasks.forEach((task, index) => {
      console.log(`Task ${index + 1}:`);
      console.log(`   ID: ${task._id}`);
      console.log(`   Status: ${task.status}`);
      console.log(`   Created: ${task.createdAt}`);
      console.log(`   Prescription ID: ${task.prescriptionId}`);
      console.log('');
    });

    // Check the most recent one
    if (tasks.length > 0) {
      const latestTask = tasks[0];
      console.log(`\n🔍 Most Recent Task Details:`);
      console.log(`   ID: ${latestTask._id}`);
      console.log(`   Status: ${latestTask.status}`);
      console.log(`   Task Type: ${latestTask.taskType}`);
      console.log(`   Medication: ${latestTask.medicationName}`);
      console.log(`   Patient ID: ${latestTask.patient}`);
      console.log(`   Created At: ${latestTask.createdAt}`);
      console.log(`   Start Date: ${latestTask.startDate}`);
      
      if (latestTask.status === 'pending') {
        console.log(`\n✅ GOOD! Latest task is PENDING - it should show in the UI`);
        console.log(`   Try refreshing the page with Ctrl + F5`);
      } else {
        console.log(`\n⚠️ Latest task status is: ${latestTask.status}`);
        console.log(`   This might be why it's not showing as available to administer`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkLatestPrescription().then(() => process.exit(0)).catch(() => process.exit(1));

