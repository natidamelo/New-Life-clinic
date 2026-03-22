const mongoose = require('mongoose');
const NurseTask = require('./models/NurseTask');
const Prescription = require('./models/Prescription');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms';

async function testDependencySystem() {
  try {
    console.log('🧪 Testing prescription dependency system...');
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find Ceftriaxone prescriptions for Natan Kinfe
    const ceftriaxonePrescriptions = await Prescription.find({
      medicationName: { $regex: /ceftriaxone/i },
      patient: { $exists: true }
    }).populate('patient', 'firstName lastName');
    
    console.log(`📋 Found ${ceftriaxonePrescriptions.length} Ceftriaxone prescriptions`);
    
    // Group by patient
    const prescriptionsByPatient = {};
    ceftriaxonePrescriptions.forEach(prescription => {
      const patientName = `${prescription.patient?.firstName || ''} ${prescription.patient?.lastName || ''}`.trim();
      if (!prescriptionsByPatient[patientName]) {
        prescriptionsByPatient[patientName] = [];
      }
      prescriptionsByPatient[patientName].push(prescription);
    });
    
    // Test each patient's prescriptions
    for (const [patientName, prescriptions] of Object.entries(prescriptionsByPatient)) {
      console.log(`\n👤 Testing patient: ${patientName}`);
      
      if (prescriptions.length < 2) {
        console.log(`   ⚠️  Only ${prescriptions.length} prescription(s) found, skipping test`);
        continue;
      }
      
      // Sort by date (oldest first)
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
        console.log(`   ⚠️  Not enough nurse tasks found, skipping test`);
        continue;
      }
      
      // Test dependency logic
      const firstTask = nurseTasks[0].task;
      const secondTask = nurseTasks[1].task;
      
      console.log(`\n🔗 Testing dependency: ${secondTask.medicationDetails?.medicationName || '2nd medication'} depends on ${firstTask.medicationDetails?.medicationName || '1st medication'}`);
      
      // Check if dependency is set up
      if (secondTask.prescriptionDependencies?.dependsOn?.length > 0) {
        console.log(`   ✅ Dependency is configured:`, secondTask.prescriptionDependencies.dependsOn);
        
        // Test dependency check logic
        const dependency = secondTask.prescriptionDependencies.dependsOn[0];
        const dependentTask = await NurseTask.findOne({
          prescriptionId: dependency.prescriptionId,
          taskType: 'MEDICATION'
        });
        
        if (dependentTask) {
          const dependentDoses = dependentTask.medicationDetails?.doseRecords || [];
          const totalDependentDoses = dependentDoses.length;
          const completedDependentDoses = dependentDoses.filter(d => d.administered).length;
          
          console.log(`   📊 Dependency status: ${completedDependentDoses}/${totalDependentDoses} doses completed`);
          
          if (dependency.requiredCompletion === 'fully_completed') {
            const isDependencyMet = totalDependentDoses > 0 && completedDependentDoses === totalDependentDoses;
            console.log(`   🔍 Dependency met: ${isDependencyMet ? 'YES' : 'NO'}`);
            
            if (!isDependencyMet) {
              console.log(`   🚫 2nd prescription should be blocked until 1st is fully completed`);
            } else {
              console.log(`   ✅ 2nd prescription can be administered`);
            }
          }
        }
      } else {
        console.log(`   ⚠️  No dependency configured - running setup...`);
        
        // Set up dependency
        const updatedTask = await NurseTask.findByIdAndUpdate(
          secondTask._id,
          {
            $set: {
              'prescriptionDependencies.dependsOn': [{
                prescriptionId: firstTask.prescriptionId,
                medicationName: firstTask.medicationDetails?.medicationName || '1st medication',
                requiredCompletion: 'fully_completed'
              }],
              'prescriptionDependencies.isBlocked': false,
              'prescriptionDependencies.blockReason': ''
            }
          },
          { new: true }
        );
        
        if (updatedTask) {
          console.log(`   ✅ Successfully set up dependency for ${secondTask.medicationDetails?.medicationName || '2nd medication'}`);
          console.log(`   📋 Dependency details:`, updatedTask.prescriptionDependencies);
        } else {
          console.log(`   ❌ Failed to set up dependency`);
        }
      }
    }
    
    console.log('\n✅ Dependency system test completed!');
    
  } catch (error) {
    console.error('❌ Error testing dependency system:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
if (require.main === module) {
  testDependencySystem();
}

module.exports = testDependencySystem;
