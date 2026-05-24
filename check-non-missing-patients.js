const mongoose = require('mongoose');

async function checkNonMissing() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms';
    await mongoose.connect(mongoUri);

    const Patient = mongoose.connection.collection('patients');

    const validPatients = await Patient.find({
      age: { $ne: null },
      gender: { $ne: '' },
      contactNumber: { $ne: '' }
    }).toArray();

    console.log(`Found ${validPatients.length} valid patients:`);
    validPatients.forEach((p, i) => {
      console.log(`${i + 1}. [${p.patientId}] ${p.firstName} ${p.lastName} - Age: ${p.age}, Gender: ${p.gender}, Phone: ${p.contactNumber}, Created: ${p.createdAt}`);
    });

  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
  }
}

checkNonMissing();
