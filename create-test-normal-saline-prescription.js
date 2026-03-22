/**
 * Create a new Normal Saline prescription for testing inventory deduction
 * This script creates a fresh prescription with tasks for today
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });

// Import models
const Prescription = require('./backend/models/Prescription');
const NurseTask = require('./backend/models/NurseTask');
const Patient = require('./backend/models/Patient');
const User = require('./backend/models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms';

async function createTestPrescription() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get the patient (semhal melaku)
    const patient = await Patient.findById('68e36fa0f2ee9b30df5eba22');
    if (!patient) {
      throw new Error('❌ Patient not found!');
    }
    console.log(`✅ Found patient: ${patient.firstName} ${patient.lastName}`);

    // Get a doctor user (any user with role 'doctor' or 'admin')
    let doctor = await User.findOne({ role: 'doctor' });
    if (!doctor) {
      doctor = await User.findOne({ role: 'admin' });
    }
    if (!doctor) {
      throw new Error('❌ No doctor/admin user found!');
    }
    console.log(`✅ Found prescribing doctor: ${doctor.email}`);

    // Get a nurse user
    const nurse = await User.findOne({ role: 'nurse' });
    if (!nurse) {
      throw new Error('❌ No nurse user found!');
    }
    console.log(`✅ Found nurse: ${nurse.email}`);

    // Create the prescription
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const prescriptionData = {
      patient: patient._id,
      patientName: `${patient.firstName} ${patient.lastName}`,
      patientId: patient.patientId,
      prescribedBy: doctor._id,
      prescribedByName: doctor.name || doctor.email,
      medicationName: 'Normal Saline (0.9% NaCl)',
      dosage: '1000ml',
      frequency: 'QD',
      route: 'Intravenous',
      duration: 1,
      durationType: 'days',
      startDate: today,
      instructions: 'Test prescription for inventory deduction verification',
      status: 'active',
      category: 'IV Fluids'
    };

    const prescription = new Prescription(prescriptionData);
    await prescription.save();
    console.log(`✅ Prescription created: ${prescription._id}`);

    // Create nurse tasks for the prescription
    const taskData = {
      patient: patient._id,
      patientName: `${patient.firstName} ${patient.lastName}`,
      patientId: patient.patientId,
      taskType: 'medication',
      medicationName: 'Normal Saline (0.9% NaCl)',
      dosage: '1000ml',
      route: 'Intravenous',
      frequency: 'QD',
      duration: 1,
      durationType: 'days',
      startDate: today,
      assignedTo: nurse._id,
      assignedBy: doctor._id,
      status: 'pending',
      priority: 'medium',
      category: 'IV Fluids',
      prescriptionId: prescription._id,
      medicationDetails: {
        medicationName: 'Normal Saline (0.9% NaCl)',
        dosage: '1000ml',
        route: 'Intravenous',
        frequency: 'QD',
        duration: 1,
        durationType: 'days',
        instructions: 'Test prescription for inventory deduction verification',
        startDate: today
      }
    };

    const nurseTask = new NurseTask(taskData);
    await nurseTask.save();
    console.log(`✅ Nurse task created: ${nurseTask._id}`);

    console.log('\n✅ SUCCESS! New test prescription created:');
    console.log(`   Patient: ${patient.firstName} ${patient.lastName} (${patient.patientId})`);
    console.log(`   Medication: Normal Saline (0.9% NaCl)`);
    console.log(`   Dosage: 1000ml`);
    console.log(`   Frequency: QD (Once daily)`);
    console.log(`   Route: Intravenous`);
    console.log(`   Prescription ID: ${prescription._id}`);
    console.log(`   Nurse Task ID: ${nurseTask._id}`);
    console.log(`\n📋 NEXT STEPS:`);
    console.log(`   1. Hard refresh your browser (Ctrl + F5)`);
    console.log(`   2. Go to Ward Dashboard or Administer Meds page`);
    console.log(`   3. Look for the NEW Normal Saline task (it should NOT have a checkmark)`);
    console.log(`   4. Click the time slot button (QD)`);
    console.log(`   5. Click "Administer" in the modal`);
    console.log(`   6. Watch the terminal for [DOSE ADMIN] logs`);
    console.log(`   7. Check inventory - should go from 100 → 99`);

  } catch (error) {
    console.error('❌ Error creating test prescription:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the script
createTestPrescription()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

