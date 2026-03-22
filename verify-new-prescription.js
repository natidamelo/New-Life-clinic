/**
 * Verify the new Normal Saline prescription was created
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });

const Prescription = require('./backend/models/Prescription');
const NurseTask = require('./backend/models/NurseTask');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms';

async function verifyPrescription() {
  try {
    await mongoose.connect(MONGODB_URI);
    
    // Find the most recent Normal Saline prescription for semhal melaku
    const prescription = await Prescription.findOne({
      patient: '68e36fa0f2ee9b30df5eba22',
      medicationName: 'Normal Saline (0.9% NaCl)',
      status: 'active'
    }).sort({ createdAt: -1 });

    if (!prescription) {
      console.log('❌ No active Normal Saline prescription found');
      return;
    }

    console.log('✅ Found prescription:');
    console.log(`   ID: ${prescription._id}`);
    console.log(`   Medication: ${prescription.medicationName}`);
    console.log(`   Patient: ${prescription.patientName}`);
    console.log(`   Created: ${prescription.createdAt}`);
    console.log(`   Status: ${prescription.status}`);

    // Find associated nurse tasks
    const tasks = await NurseTask.find({
      prescriptionId: prescription._id
    }).sort({ createdAt: -1 });

    console.log(`\n✅ Found ${tasks.length} nurse task(s):`);
    tasks.forEach((task, index) => {
      console.log(`   Task ${index + 1}:`);
      console.log(`      ID: ${task._id}`);
      console.log(`      Status: ${task.status}`);
      console.log(`      Medication: ${task.medicationName}`);
      console.log(`      Created: ${task.createdAt}`);
    });

    console.log(`\n📋 NEXT STEPS:`);
    console.log(`   1. Hard refresh your browser (Ctrl + F5)`);
    console.log(`   2. Go to Ward Dashboard or Administer Meds page`);
    console.log(`   3. Look for the NEW Normal Saline task`);
    console.log(`   4. Click the time slot button and then "Administer"`);
    console.log(`   5. Watch terminal for [DOSE ADMIN] logs`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

verifyPrescription().then(() => process.exit(0)).catch(() => process.exit(1));

