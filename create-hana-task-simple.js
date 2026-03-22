const mongoose = require('mongoose');
require('dotenv').config();

// Simple connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms');

const NurseTask = require('./backend/models/NurseTask');

async function createHanaTask() {
  try {
    console.log('🔍 Creating Hana\'s Blood Pressure Check task...\n');

    // Create the nurse task directly
    const nurseTask = new NurseTask({
      patientId: '688f7f4aa354287d78558014', // From the invoice URL
      patientName: 'hana Dejene',
      serviceName: 'Blood Pressure Check - 50 ETB',
      description: 'Blood Pressure Check for hana Dejene',
      taskType: 'VITAL_SIGNS',
      priority: 'MEDIUM', // Fixed: use valid enum value
      status: 'PENDING',
      assignedBy: '6823859485e2a37d8cb420ed', // Semhal Melaku's ID from the dashboard
      assignedByName: 'Semhal Melaku',
      assignedTo: '6823859485e2a37d8cb420ed', // Semhal Melaku's ID from the dashboard
      assignedToName: 'Semhal Melaku',
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      notes: 'Blood Pressure Check requested for hana Dejene',
      vitalSignsOptions: {
        measurementType: 'blood_pressure',
        requiredFields: ['systolic', 'diastolic', 'position', 'arm'],
        fileType: 'single'
      }
    });

    await nurseTask.save();
    console.log(`✅ Created nurse task: ${nurseTask._id}`);
    console.log(`   Patient: ${nurseTask.patientName}`);
    console.log(`   Task Type: ${nurseTask.taskType}`);
    console.log(`   Status: ${nurseTask.status}`);
    console.log(`   Assigned to: ${nurseTask.assignedToName}`);

    console.log('\n🎉 Hana\'s Blood Pressure Check task has been created!');
    console.log('   The task should now appear on the nurse dashboard.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

createHanaTask(); 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 