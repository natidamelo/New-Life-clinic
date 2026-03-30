
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function debugHabtamu() {
  await mongoose.connect(MONGODB_URI);
  
  const Prescription = require('./backend/models/Prescription');
  const Patient = require('./backend/models/Patient');
  const NurseTask = require('./backend/models/NurseTask');

  const patient = await Patient.findOne({ firstName: /Habtamu/i });
  if (!patient) { console.log('Habtamu not found'); return; }

  console.log(`👤 Habtamu ID: ${patient._id}`);

  const prescriptions = await Prescription.find({ patient: patient._id }).lean();
  console.log(`📋 Prescriptions: ${prescriptions.length}`);
  
  prescriptions.forEach(p => {
    console.log(`\n--- P: ${p._id} ---`);
    console.log(`Med: ${p.medicationName}`);
    console.log(`Paid: ${p.paymentStatus}`);
    console.log(`Medications array:`, JSON.stringify(p.medications, null, 2));
  });

  const tasks = await NurseTask.find({ patientId: patient._id }).lean();
  console.log(`\n🏥 Nurse Tasks: ${tasks.length}`);
  tasks.forEach(t => {
    console.log(`- ${t.description} (status: ${t.status}, med: ${t.medicationDetails?.medicationName})`);
  });

  await mongoose.disconnect();
}

debugHabtamu();
