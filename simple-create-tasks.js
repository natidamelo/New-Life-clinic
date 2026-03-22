const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const NurseTask = require('./backend/models/NurseTask');

async function createSimpleTasks() {
  try {
    console.log('🔍 Creating Blood Pressure Check tasks...');
    
    // Create tasks for known patients
    const tasksToCreate = [
      {
        patientId: '688f7f4aa354287d78558014', // Hana Dejene
        patientName: 'Hana Dejene',
        description: 'Blood Pressure Check',
        type: 'VITAL_SIGNS',
        taskType: 'VITAL_SIGNS',
        priority: 'normal',
        status: 'PENDING',
        notes: 'Blood pressure measurement required',
        location: 'Clinic',
        department: 'nurse',
        paymentAuthorization: {
          isAuthorized: true,
          paymentStatus: 'fully_paid',
          amount: 50,
          paidAmount: 50,
          remainingAmount: 0,
          paymentMethod: 'cash',
          paymentDate: new Date()
        }
      },
      {
        patientId: '688f7f4aa354287d78558015', // Game (assuming ID)
        patientName: 'Game',
        description: 'Blood Pressure Check',
        type: 'VITAL_SIGNS',
        taskType: 'VITAL_SIGNS',
        priority: 'normal',
        status: 'PENDING',
        notes: 'Blood pressure measurement required',
        location: 'Clinic',
        department: 'nurse',
        paymentAuthorization: {
          isAuthorized: true,
          paymentStatus: 'fully_paid',
          amount: 50,
          paidAmount: 50,
          remainingAmount: 0,
          paymentMethod: 'cash',
          paymentDate: new Date()
        }
      }
    ];

    for (const taskData of tasksToCreate) {
      console.log(`\n📋 Creating task for ${taskData.patientName}...`);
      
      // Check if task already exists
      const existingTask = await NurseTask.findOne({
        patientId: taskData.patientId,
        description: 'Blood Pressure Check',
        status: 'PENDING'
      });

      if (existingTask) {
        console.log(`⚠️  Task already exists for ${taskData.patientName}`);
        continue;
      }

      const newTask = new NurseTask(taskData);
      await newTask.save();
      console.log(`✅ Created Blood Pressure Check task for ${taskData.patientName}`);
    }

    console.log('\n🎉 Blood Pressure Check tasks created successfully!');
    
    // Show summary
    const allTasks = await NurseTask.find({
      description: 'Blood Pressure Check',
      status: 'PENDING'
    });
    
    console.log(`\n📊 Summary: ${allTasks.length} pending Blood Pressure Check tasks`);
    for (const task of allTasks) {
      console.log(`  - ${task.patientName}: ${task.status}`);
    }

  } catch (error) {
    console.error('❌ Error creating tasks:', error);
  } finally {
    mongoose.connection.close();
  }
}

createSimpleTasks();
