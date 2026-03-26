/**
 * One-time fix: Repair patients that were created with clinicId 'default'
 * when they should have 'clinicnew'.
 * Run with:  node scripts/fix-patient-clinicids.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function run() {
  if (!MONGO_URI) {
    console.error('No MONGO_URI found in environment');
    process.exit(1);
  }
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const Patient = mongoose.connection.collection('patients');

  // Find patients with clinicId 'default'
  const defaultPatients = await Patient.find({ clinicId: 'default' }).toArray();
  console.log(`Found ${defaultPatients.length} patients with clinicId "default"`);

  if (defaultPatients.length === 0) {
    console.log('Nothing to fix.');
    await mongoose.disconnect();
    return;
  }

  // Update them to 'clinicnew'
  const result = await Patient.updateMany(
    { clinicId: 'default' },
    { $set: { clinicId: 'clinicnew' } }
  );
  console.log(`Updated ${result.modifiedCount} patients from "default" to "clinicnew"`);

  // Verify
  const remaining = await Patient.countDocuments({ clinicId: 'default' });
  console.log(`Patients still with "default": ${remaining}`);

  await mongoose.disconnect();
  console.log('Done.');
}

run().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});
