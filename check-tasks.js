
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, 'backend', '.env') });
const MONGODB_URI = process.env.MONGODB_URI;

async function checkTasks() {
  await mongoose.connect(MONGODB_URI);
  const Patient = require('./backend/models/Patient');
  const NurseTask = require('./backend/models/NurseTask');
  const patient = await Patient.findOne({ firstName: /Habtamu/i });
  if (patient) {
     const tasks = await NurseTask.find({ patientId: patient._id });
     console.log(`--- Tasks for ${patient.firstName} ---`);
     tasks.forEach(t => console.log(`- ${t.description} (${t.status})`));
  }
  await mongoose.disconnect();
}
checkTasks().catch(console.error);
