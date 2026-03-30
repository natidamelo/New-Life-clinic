
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, 'backend', '.env') });
const MONGODB_URI = process.env.MONGODB_URI;

async function forceSync() {
  await mongoose.connect(MONGODB_URI);
  const { processPaymentAndCreateNurseTasks } = require('./backend/utils/nurseTaskCreation');
  const Prescription = require('./backend/models/Prescription');
  const Patient = require('./backend/models/Patient');
  
  const patient = await Patient.findOne({ firstName: /Habtamu/i });
  const prescriptions = await Prescription.find({ patient: patient._id });
  
  for (const p of prescriptions) {
    console.log(`Syncing ${p._id}: ${p.medicationName}`);
    const res = await processPaymentAndCreateNurseTasks(p, patient);
    console.log(`- Created: ${res.tasksCreated}, Skipped: ${res.tasksSkipped}, Errs: ${res.errors.length}`);
  }
  process.exit(0);
}
forceSync();
