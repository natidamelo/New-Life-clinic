const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms');

const NurseTask = require('./backend/models/NurseTask');

async function createVitalTasksDirect() {
  try {
    console.log('🔍 Creating missing vital signs tasks directly...\n');

    // Create tasks for known patients who paid for Blood Pressure Check
    const tasksToCreate = [
      {
        patientId: '688f7f4aa354287d78558014', // Hana Dejene
        patientName: 'hana Dejene',
        serviceName: 'Blood Pressure Check - 50 ETB',
        description: 'Blood Pressure Check for hana Dejene',
        notes: 'Blood Pressure Check requested for hana Dejene'
      },
      {
        patientId: 'game-patient-id', // Game (we'll need to find the actual ID)
        patientName: 'Game',
        serviceName: 'Blood Pressure Check - 50 ETB',
        description: 'Blood Pressure Check for Game',
        notes: 'Blood Pressure Check requested for Game'
      }
    ];

    for (const taskData of tasksToCreate) {
      // Check if task already exists
      const existingTask = await NurseTask.findOne({
        patientId: taskData.patientId,
        serviceName: { $regex: /blood pressure check/i },
        taskType: 'VITAL_SIGNS'
      });

      if (existingTask) {
        console.log(`✅ Task already exists for ${taskData.patientName}`);
        continue;
      }

      // Create the nurse task
      const nurseTask = new NurseTask({
        patientId: taskData.patientId,
        patientName: taskData.patientName,
        serviceName: taskData.serviceName,
        description: taskData.description,
        taskType: 'VITAL_SIGNS',
        priority: 'MEDIUM',
        status: 'PENDING',
        assignedBy: '6823859485e2a37d8cb420ed',
        assignedByName: 'Reception',
        assignedTo: '6823859485e2a37d8cb420ed',
        assignedToName: 'Semhal Melaku',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        notes: taskData.notes,
        servicePrice: 50,
        paymentAuthorization: {
          paidDays: 1,
          totalDays: 1,
          paymentStatus: 'paid',
          canAdminister: true,
          authorizedDoses: 1,
          unauthorizedDoses: 0,
          outstandingAmount: 0,
          totalCost: 50,
          amountPaid: 50,
          lastUpdated: new Date()
        },
        vitalSignsOptions: {
          measurementType: 'blood_pressure',
          requiredFields: ['systolic', 'diastolic', 'position', 'arm'],
          fileType: 'single'
        }
      });

      await nurseTask.save();
      console.log(`✅ Created nurse task for ${taskData.patientName}: ${nurseTask._id}`);
    }

    console.log('\n🎉 Vital signs tasks created!');
    console.log('   Check the nurse dashboard for the new Blood Pressure Check tasks.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
  }
}

createVitalTasksDirect(); 
 
 
 
 
 