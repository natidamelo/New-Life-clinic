const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const NurseTask = require('./backend/models/NurseTask');
const Patient = require('./backend/models/Patient');

async function createBloodPressureTasks() {
  try {
    console.log('🔍 Finding patients...');
    
    // Find patients by name
    const patients = await Patient.find({
      $or: [
        { name: { $regex: /Hana/i } },
        { name: { $regex: /Game/i } },
        { name: { $regex: /Semhal Melaku/i } }
      ]
    });

    console.log(`Found ${patients.length} patients:`, patients.map(p => p.name));

    for (const patient of patients) {
      console.log(`\n📋 Creating Blood Pressure Check task for ${patient.name}...`);
      
      // Check if task already exists
      const existingTask = await NurseTask.findOne({
        patientId: patient._id,
        description: 'Blood Pressure Check',
        status: 'PENDING'
      });

      if (existingTask) {
        console.log(`⚠️  Task already exists for ${patient.name}`);
        continue;
      }

      // Create new Blood Pressure Check task
      const newTask = new NurseTask({
        patientId: patient._id,
        patientName: patient.name,
        description: 'Blood Pressure Check',
        type: 'VITAL_SIGNS',
        taskType: 'VITAL_SIGNS',
        priority: 'normal',
        status: 'PENDING',
        assignedTo: null, // Will be assigned when nurse picks it up
        assignedBy: null,
        assignedDate: null,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Due in 24 hours
        completedDate: null,
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
          paymentDate: new Date(),
          invoiceId: null
        },
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await newTask.save();
      console.log(`✅ Created Blood Pressure Check task for ${patient.name}`);
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
    console.error('❌ Error creating Blood Pressure Check tasks:', error);
  } finally {
    mongoose.connection.close();
  }
}

createBloodPressureTasks(); 