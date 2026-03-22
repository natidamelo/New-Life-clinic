const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/clinic-cms', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const NurseTask = require('./backend/models/NurseTask');

async function createTasks() {
  try {
    console.log('🔍 Creating Blood Pressure Check tasks...\n');

    // Create task for Hana Dejene
    const hanaTask = new NurseTask({
      patientId: '688f7f4aa354287d78558014',
      patientName: 'Hana Dejene',
      serviceName: 'Blood Pressure Check - 50 ETB',
      description: 'Blood Pressure Check for Hana Dejene',
      taskType: 'VITAL_SIGNS',
      priority: 'MEDIUM',
      status: 'PENDING',
      assignedBy: '6823859485e2a37d8cb420ed',
      assignedByName: 'Reception',
      assignedTo: '6823859485e2a37d8cb420ed',
      assignedToName: 'Semhal Melaku',
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      notes: 'Blood Pressure Check requested for Hana Dejene',
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

    await hanaTask.save();
    console.log('✅ Created task for Hana Dejene');

    // Create task for Game
    const gameTask = new NurseTask({
      patientId: '688f84faef722da62382c0e8',
      patientName: 'Game',
      serviceName: 'Blood Pressure Check - 50 ETB',
      description: 'Blood Pressure Check for Game',
      taskType: 'VITAL_SIGNS',
      priority: 'MEDIUM',
      status: 'PENDING',
      assignedBy: '6823859485e2a37d8cb420ed',
      assignedByName: 'Reception',
      assignedTo: '6823859485e2a37d8cb420ed',
      assignedToName: 'Semhal Melaku',
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      notes: 'Blood Pressure Check requested for Game',
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

    await gameTask.save();
    console.log('✅ Created task for Game');

    console.log('\n🎉 Blood Pressure Check tasks created successfully!');
    console.log('   Check the nurse dashboard "Administer Meds" section with "Vital Signs" filter.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
  }
}

createTasks(); 
 
 
 
 
 