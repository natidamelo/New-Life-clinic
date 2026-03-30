
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env file');
  process.on('exit', () => process.exit(1));
}

async function fixHabtamu() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected successfully');

    const Prescription = require('./backend/models/Prescription');
    const Patient = require('./backend/models/Patient');
    const { processPaymentAndCreateNurseTasks } = require('./backend/utils/nurseTaskCreation');

    // Find Habtamu
    const patient = await Patient.findOne({ 
      $or: [
        { firstName: /Habtamu/i },
        { lastName: /Habtamu/i }
      ]
    });

    if (!patient) {
      console.error('❌ Patient Habtamu not found');
      return;
    }

    console.log(`👤 Found Patient: ${patient.firstName} ${patient.lastName} (${patient._id})`);

    // Find all active/paid prescriptions for Habtamu
    const prescriptions = await Prescription.find({ 
      patient: patient._id,
      status: { $ne: 'Cancelled' }
    }).sort({ createdAt: -1 });

    console.log(`📋 Found ${prescriptions.length} prescriptions for Habtamu`);

    for (const prescription of prescriptions) {
      console.log(`\n--- Processing Prescription: ${prescription._id} ---`);
      console.log(`💊 Medication: ${prescription.medicationName}`);
      console.log(`💰 Payment Status: ${prescription.paymentStatus}`);
      console.log(`📦 Medications Array length: ${prescription.medications ? prescription.medications.length : 0}`);

      const result = await processPaymentAndCreateNurseTasks(prescription, patient);
      console.log(`📊 Sync Result:`, {
        success: result.success,
        created: result.tasksCreated,
        skipped: result.tasksSkipped,
        errors: result.errors
      });
      
      if (result.tasksCreated > 0) {
        console.log(`✅ Tasks created for:`, result.tasks.map(t => t.description).join(', '));
      }
    }

    console.log('\n✨ Habtamu fix completed');

  } catch (error) {
    console.error('❌ Error fixing Habtamu:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

fixHabtamu();
