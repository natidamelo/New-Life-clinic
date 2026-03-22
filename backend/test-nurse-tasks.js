const mongoose = require('mongoose');
const NurseTask = require('./models/NurseTask');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/clinic-cms', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function testNurseTasks() {
  try {
    console.log('🔍 Testing nurse tasks...');

    // Semhal Melaku's nurse ID
    const semhalNurseId = '6823859485e2a37d8cb420ed';
    
    console.log(`\n📋 Fetching all tasks assigned to Semhal Melaku (${semhalNurseId}):`);
    
    // Fetch all tasks assigned to Semhal
    const assignedTasks = await NurseTask.find({ assignedTo: semhalNurseId });
    console.log(`Found ${assignedTasks.length} tasks assigned to Semhal:`);
    
    for (const task of assignedTasks) {
      console.log(`  - ${task.patientName}: ${task.description}`);
      console.log(`    Type: ${task.taskType}, Status: ${task.status}, Priority: ${task.priority}`);
      console.log(`    Due: ${task.dueDate}`);
      if (task.medicationDetails) {
        console.log(`    Medication: ${task.medicationDetails.medicationName} (${task.medicationDetails.dosage})`);
      }
      console.log('');
    }

    console.log(`\n💊 Fetching MEDICATION tasks assigned to Semhal:`);
    const medicationTasks = await NurseTask.find({ 
      assignedTo: semhalNurseId,
      taskType: 'MEDICATION' 
    });
    console.log(`Found ${medicationTasks.length} medication tasks for Semhal:`);
    
    for (const task of medicationTasks) {
      console.log(`  - ${task.patientName}: ${task.description}`);
      console.log(`    Status: ${task.status}, Priority: ${task.priority}`);
      if (task.medicationDetails) {
        console.log(`    Medication: ${task.medicationDetails.medicationName} (${task.medicationDetails.dosage})`);
      }
    }

    console.log(`\n🔄 Fetching all PENDING MEDICATION tasks (unassigned):`);
    const unassignedMedicationTasks = await NurseTask.find({ 
      taskType: 'MEDICATION',
      status: 'PENDING',
      assignedTo: null
    });
    console.log(`Found ${unassignedMedicationTasks.length} unassigned medication tasks:`);
    
    for (const task of unassignedMedicationTasks) {
      console.log(`  - ${task.patientName}: ${task.description}`);
    }

    console.log(`\n📊 Summary:`);
    console.log(`  - Total tasks for Semhal: ${assignedTasks.length}`);
    console.log(`  - Medication tasks for Semhal: ${medicationTasks.length}`);
    console.log(`  - Unassigned medication tasks: ${unassignedMedicationTasks.length}`);

  } catch (error) {
    console.error('❌ Error testing nurse tasks:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the test
testNurseTasks(); 
