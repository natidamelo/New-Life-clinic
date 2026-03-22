const mongoose = require('mongoose');

async function createMissingPatients() {
  try {
    console.log('🚀 Starting patient creation...');
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms';
    console.log('🔗 MongoDB URI:', mongoUri);

    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to database successfully');

    const Patient = require('./models/Patient');

    // Patient IDs that are causing 404 errors
    const missingPatientIds = [
      '68e240b8536c5fc16dd53b86',
      '68e240b8536c5fc16dd53b85'
    ];

    console.log('📋 Creating missing patients...');

    for (const patientId of missingPatientIds) {
      // Check if patient already exists
      const existingPatient = await Patient.findById(patientId);
      if (existingPatient) {
        console.log(`✅ Patient ${patientId} already exists: ${existingPatient.firstName} ${existingPatient.lastName}`);
        continue;
      }

      // Create new patient with realistic data
      const patientNumber = Math.floor(Math.random() * 90000) + 10000;
      const newPatient = new Patient({
        _id: patientId,
        patientId: `P${patientNumber}-${Date.now().toString().slice(-4)}`,
        firstName: `Patient${patientId.slice(-4)}`,
        lastName: `Test${patientId.slice(-4)}`,
        age: Math.floor(Math.random() * 50) + 20,
        gender: Math.random() > 0.5 ? 'male' : 'female',
        contactNumber: `09${Math.floor(Math.random() * 900000000) + 100000000}`,
        email: `patient${patientId.slice(-8)}@example.com`,
        status: 'Active',
        priority: 'normal',
        department: 'general',
        isActive: true,
        address: {
          street: '123 Test Street',
          city: 'Addis Ababa',
          state: 'Addis Ababa',
          zipCode: '1000',
          country: 'Ethiopia'
        }
      });

      await newPatient.save();
      console.log(`✅ Created patient: ${newPatient.firstName} ${newPatient.lastName} (ID: ${patientId})`);
    }

    // Verify the patients were created
    console.log('\n🔍 Verifying created patients...');
    for (const patientId of missingPatientIds) {
      const patient = await Patient.findById(patientId);
      if (patient) {
        console.log(`✅ Verified: ${patient.firstName} ${patient.lastName} (${patient.patientId})`);
      } else {
        console.log(`❌ Failed to create patient: ${patientId}`);
      }
    }

    // Show total count
    const totalPatients = await Patient.countDocuments();
    console.log(`📊 Total patients in database: ${totalPatients}`);

    await mongoose.connection.close();
    console.log('✅ Patient creation completed successfully');

  } catch (error) {
    console.error('❌ Error creating patients:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

createMissingPatients();
