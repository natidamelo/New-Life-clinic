
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'backend', '.env') });
const MONGODB_URI = process.env.MONGODB_URI;

async function checkHabtamu() {
  await mongoose.connect(MONGODB_URI);
  const Patient = require('./backend/models/Patient');
  const patients = await Patient.find({ 
    $or: [{ firstName: /Habtamu/i }, { lastName: /Habtamu/i }]
  });
  console.log('--- Patients ---');
  patients.forEach(p => console.log(`${p._id}: ${p.firstName} ${p.lastName}`));
  await mongoose.disconnect();
}
checkHabtamu().catch(console.error);
