const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const NurseTask = require('./models/NurseTask');

async function checkMedicationTasks() {
  try {
    console.log('🔍 Checking for medication tasks in database...');
    
    // Find all medication tasks
    const medicationTasks = await NurseTask.find({ taskType: 'MEDICATION' }).lean();
    
    console.log(`📊 Found ${medicationTasks.length} medication tasks in database`);
    
    if (medicationTasks.length === 0) {
      console.log('❌ No medication tasks found. This could be because:');
      console.log('   1. No medication prescriptions have been created');
      console.log('   2. No nurse tasks have been generated from prescriptions');
      console.log('   3. All medication tasks have been completed');
      
      // Check for any nurse tasks at all
      const allTasks = await NurseTask.find({}).lean();
      console.log(`📋 Total nurse tasks in database: ${allTasks.length}`);
      
      if (allTasks.length > 0) {
        console.log('🔍 Sample tasks found:');
        allTasks.slice(0, 3).forEach((task, index) => {
          console.log(`   Task ${index + 1}: ${task.taskType} - ${task.description}`);
        });
      }
    } else {
      console.log('✅ Medication tasks found:');
      medicationTasks.forEach((task, index) => {
        console.log(`   Task ${index + 1}:`);
        console.log(`     ID: ${task._id}`);
        console.log(`     Patient: ${task.patientName}`);
        console.log(`     Description: ${task.description}`);
        console.log(`     Status: ${task.status}`);
        console.log(`     Priority: ${task.priority}`);
        console.log(`     Medication: ${task.medicationDetails?.medicationName || 'N/A'}`);
        console.log(`     Assigned To: ${task.assignedTo || 'Unassigned'}`);
        console.log('');
      });
    }
    
    // Check for pending medication tasks specifically
    const pendingMedicationTasks = await NurseTask.find({ 
      taskType: 'MEDICATION', 
      status: 'PENDING' 
    }).lean();
    
    console.log(`⏳ Pending medication tasks: ${pendingMedicationTasks.length}`);
    
    // Check for tasks with medication details
    const tasksWithMedDetails = await NurseTask.find({ 
      'medicationDetails': { $exists: true, $ne: null } 
    }).lean();
    
    console.log(`💊 Tasks with medication details: ${tasksWithMedDetails.length}`);
    
  } catch (error) {
    console.error('❌ Error checking medication tasks:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkMedicationTasks();
