const mongoose = require('mongoose');

async function inspectRuth() {
  try {
    // Connect to MongoDB using the same connection string
    // Let's verify if there is an env file with MONGODB_URI. We saw .env in the root directory.
    // Let's read .env first or try localhost:27017/clinic-cms
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB:', mongoUri);

    const db = mongoose.connection.db;
    const Patient = mongoose.connection.collection('patients');

    const ruthPatients = await Patient.find({
      $or: [
        { firstName: /ruth/i },
        { lastName: /ruth/i }
      ]
    }).toArray();

    console.log(`Found ${ruthPatients.length} patients with name containing "ruth":`);
    ruthPatients.forEach((p, i) => {
      console.log(`\nPatient #${i + 1}:`);
      console.log(`ID: ${p._id}`);
      console.log(`patientId: ${p.patientId}`);
      console.log(`Name: ${p.firstName} ${p.lastName}`);
      console.log(`Age: ${p.age}`);
      console.log(`Gender: ${p.gender}`);
      console.log(`Contact Number: ${p.contactNumber}`);
      console.log(`Date of Birth: ${p.dateOfBirth}`);
      console.log(`clinicId: ${p.clinicId}`);
      console.log(`status: ${p.status}`);
      console.log(`isActive: ${p.isActive}`);
      console.log(`Raw:`, JSON.stringify(p, null, 2));
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected');
  }
}

inspectRuth();
