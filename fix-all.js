
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'backend', '.env') });
const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  console.log('Connecting to', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  
  const Patient = require('./backend/models/Patient');
  const Prescription = require('./backend/models/Prescription');
  const NurseTask = require('./backend/models/NurseTask');
  const { processPaymentAndCreateNurseTasks } = require('./backend/utils/nurseTaskCreation');

  const patients = await Patient.find({ 
    $or: [{ firstName: /Habtamu/i }, { lastName: /Mekonnen/i }]
  });

  if (patients.length === 0) {
    console.log('No Habtamu found');
  } else {
    for(const patient of patients) {
      console.log(`Found: ${patient.firstName} ${patient.lastName} (${patient._id})`);
      const prescriptions = await Prescription.find({ patient: patient._id });
      console.log(`- ${prescriptions.length} prescriptions`);
      for(const p of prescriptions) {
        console.log(`  - ${p.medicationName} (${p.paymentStatus})`);
        const syncRes = await processPaymentAndCreateNurseTasks(p, patient);
        console.log(`    Sync: ${syncRes.tasksCreated} created, ${syncRes.tasksSkipped} skipped, err: ${syncRes.errors.length}`);
      }
    }
  }
  
  await mongoose.disconnect();
}
run().catch(console.error);
