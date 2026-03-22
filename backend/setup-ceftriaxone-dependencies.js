const mongoose = require('mongoose');
const NurseTask = require('./models/NurseTask');
const Prescription = require('./models/Prescription');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms';

async function setupCeftriaxoneDependencies() {
  try {
    console.log('🔗 Setting up Ceftriaxone prescription dependencies...');
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find all Ceftriaxone prescriptions for Natan Kinfe
    const ceftriaxonePrescriptions = await Prescription.find({
      medicationName: { $regex: /ceftriaxone/i },
      patient: { $exists: true }
    }).populate('patient', 'firstName lastName');
    
    console.log(`📋 Found ${ceftriaxonePrescriptions.length} Ceftriaxone prescriptions`);
    
    // Group prescriptions by patient
    const prescriptionsByPatient = {};
    ceftriaxonePrescriptions.forEach(prescription => {
      const patientName = `${prescription.patient?.firstName || ''} ${prescription.patient?.lastName || ''}`.trim();
      if (!prescriptionsByPatient[patientName]) {
        prescriptionsByPatient[patientName] = [];
      }
      prescriptionsByPatient[patientName].push(prescription);
    });
    
    // Process each patient's prescriptions
    for (const [patientName, prescriptions] of Object.entries(prescriptionsByPatient)) {
      console.log(`\n👤 Processing patient: ${patientName}`);
      
      if (prescriptions.length < 2) {
        console.log(`   ⚠️  Only ${prescriptions.length} prescription(s) found, skipping dependency setup`);
        continue;
      }
      
      // Sort prescriptions by date (oldest first)
      const sortedPrescriptions = prescriptions.sort((a, b) => {
        const dateA = new Date(a.datePrescribed || a.createdAt || 0);
        const dateB = new Date(b.datePrescribed || b.createdAt || 0);
        return dateA.getTime() - dateB.getTime();
      });
      
      console.log(`   📅 Prescriptions ordered by date:`);
      sortedPrescriptions.forEach((prescription, index) => {
        const date = new Date(prescription.datePrescribed || prescription.createdAt);
        console.log(`      ${index + 1}. ${prescription.medicationName} - ${date.toLocaleDateString()}`);
      });
      
      // Find corresponding nurse tasks
      const nurseTasks = [];
      for (const prescription of sortedPrescriptions) {
        const task = await NurseTask.findOne({
          prescriptionId: prescription._id,
          taskType: 'MEDICATION'
        });
        
        if (task) {
          nurseTasks.push({ prescription, task });
          console.log(`   ✅ Found nurse task for ${prescription.medicationName}: ${task._id}`);
        } else {
          console.log(`   ⚠️  No nurse task found for ${prescription.medicationName}`);
        }
      }
      
      if (nurseTasks.length < 2) {
        console.log(`   ⚠️  Not enough nurse tasks found, skipping dependency setup`);
        continue;
      }
      
      // Set up dependencies: 2nd prescription depends on 1st
      const firstPrescription = nurseTasks[0];
      const secondPrescription = nurseTasks[1];
      
      console.log(`\n🔗 Setting up dependency: ${secondPrescription.prescription.medicationName} depends on ${firstPrescription.prescription.medicationName}`);
      
      // Update the second prescription's nurse task to depend on the first
      const updatedTask = await NurseTask.findByIdAndUpdate(
        secondPrescription.task._id,
        {
          $set: {
            'prescriptionDependencies.dependsOn': [{
              prescriptionId: firstPrescription.prescription._id,
              medicationName: firstPrescription.prescription.medicationName,
              requiredCompletion: 'fully_completed'
            }],
            'prescriptionDependencies.isBlocked': false,
            'prescriptionDependencies.blockReason': ''
          }
        },
        { new: true }
      );
      
      if (updatedTask) {
        console.log(`   ✅ Successfully set up dependency for ${secondPrescription.prescription.medicationName}`);
        console.log(`   📋 Dependency details:`, {
          dependsOn: updatedTask.prescriptionDependencies.dependsOn,
          isBlocked: updatedTask.prescriptionDependencies.isBlocked
        });
      } else {
        console.log(`   ❌ Failed to update nurse task for ${secondPrescription.prescription.medicationName}`);
      }
      
      // If there are more prescriptions, set up chain dependencies
      for (let i = 2; i < nurseTasks.length; i++) {
        const currentPrescription = nurseTasks[i];
        const previousPrescription = nurseTasks[i - 1];
        
        console.log(`\n🔗 Setting up chain dependency: ${currentPrescription.prescription.medicationName} depends on ${previousPrescription.prescription.medicationName}`);
        
        const updatedChainTask = await NurseTask.findByIdAndUpdate(
          currentPrescription.task._id,
          {
            $set: {
              'prescriptionDependencies.dependsOn': [{
                prescriptionId: previousPrescription.prescription._id,
                medicationName: previousPrescription.prescription.medicationName,
                requiredCompletion: 'fully_completed'
              }],
              'prescriptionDependencies.isBlocked': false,
              'prescriptionDependencies.blockReason': ''
            }
          },
          { new: true }
        );
        
        if (updatedChainTask) {
          console.log(`   ✅ Successfully set up chain dependency for ${currentPrescription.prescription.medicationName}`);
        } else {
          console.log(`   ❌ Failed to update nurse task for ${currentPrescription.prescription.medicationName}`);
        }
      }
    }
    
    console.log('\n✅ Ceftriaxone dependency setup completed!');
    
  } catch (error) {
    console.error('❌ Error setting up Ceftriaxone dependencies:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
if (require.main === module) {
  setupCeftriaxoneDependencies();
}

module.exports = setupCeftriaxoneDependencies;
