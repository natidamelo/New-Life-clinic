const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/clinic-cms')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

async function findAllData() {
  try {
    // Check all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n📋 Available collections:');
    collections.forEach(col => console.log(`   - ${col.name}`));
    
    // Check NurseTasks collection
    const NurseTask = mongoose.connection.collection('nursetasks');
    const taskCount = await NurseTask.countDocuments();
    console.log(`\n📋 Total NurseTasks: ${taskCount}`);
    
    if (taskCount > 0) {
      const sampleTasks = await NurseTask.find({}).limit(10).toArray();
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
      const samplePatients = await Patient.find({}).limit(10).toArray();
      console.log('\n👥 Sample patients:');
      samplePatients.forEach((patient, i) => {
        console.log(`${i+1}. Name: ${patient.firstName} ${patient.lastName}, ID: ${patient._id}`);
      });
    }
    
    // Check if there are any medication-related collections
    const medCollections = collections.filter(col => 
      col.name.toLowerCase().includes('med') || 
      col.name.toLowerCase().includes('task') ||
      col.name.toLowerCase().includes('nurse')
    );
    
    console.log('\n💊 Medication/Task related collections:');
    for (const col of medCollections) {
      const count = await mongoose.connection.collection(col.name).countDocuments();
      console.log(`   - ${col.name}: ${count} documents`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

findAllData();
