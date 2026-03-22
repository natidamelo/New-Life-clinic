const mongoose = require('mongoose');

async function checkPatients() {
  try {
    console.log('🚀 Starting patient check...');
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms';
    console.log('🔗 MongoDB URI:', mongoUri);

    // Test connection first
    console.log('🔄 Attempting to connect to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to database successfully');

    const Patient = require('./models/Patient');

    // Check if the specific IDs exist
    const patient1 = await Patient.findById('68e240b8536c5fc16dd53b86');
    const patient2 = await Patient.findById('68e240b8536c5fc16dd53b85');

    console.log('🔍 Patient 68e240b8536c5fc16dd53b86 exists:', !!patient1);
    console.log('🔍 Patient 68e240b8536c5fc16dd53b85 exists:', !!patient2);

    if (patient1) {
      console.log('   Patient 1 details:', patient1.firstName, patient1.lastName, patient1.patientId);
    }
    if (patient2) {
      console.log('   Patient 2 details:', patient2.firstName, patient2.lastName, patient2.patientId);
    }

    // Check total patients
    const totalPatients = await Patient.countDocuments();
    console.log('📊 Total patients in database:', totalPatients);

    // Get a few recent patients to see the format
    const recentPatients = await Patient.find().sort({createdAt: -1}).limit(5);
    console.log('📋 Recent patient IDs:');
    recentPatients.forEach(p => {
      console.log('   ID:', p._id, 'PatientID:', p.patientId, 'Name:', p.firstName, p.lastName);
    });

    // Also check if patients exist by patientId field
    const patientsByPatientId = await Patient.find({
      patientId: { $in: ['68e240b8536c5fc16dd53b86', '68e240b8536c5fc16dd53b85'] }
    });

    if (patientsByPatientId.length > 0) {
      console.log('🔍 Found patients by patientId field:');
      patientsByPatientId.forEach(p => {
        console.log('   Patient:', p.firstName, p.lastName, 'ID:', p._id, 'PatientID:', p.patientId);
      });
    }

    await mongoose.connection.close();
    console.log('✅ Patient check completed');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

checkPatients();
