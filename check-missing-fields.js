const mongoose = require('mongoose');

async function checkMissingFields() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB:', mongoUri);

    const Patient = mongoose.connection.collection('patients');

    const totalCount = await Patient.countDocuments();
    const missingAge = await Patient.countDocuments({ $or: [{ age: null }, { age: { $exists: false } }] });
    const missingGender = await Patient.countDocuments({ $or: [{ gender: null }, { gender: '' }, { gender: { $exists: false } }] });
    const missingPhone = await Patient.countDocuments({ $or: [{ contactNumber: null }, { contactNumber: '' }, { contactNumber: { $exists: false } }] });

    console.log(`\nStatistics:`);
    console.log(`Total patients in DB: ${totalCount}`);
    console.log(`Patients missing age: ${missingAge}`);
    console.log(`Patients missing gender: ${missingGender}`);
    console.log(`Patients missing phone: ${missingPhone}`);

    // Let's get list of patients missing at least one of these
    const missingAny = await Patient.find({
      $or: [
        { age: null }, { age: { $exists: false } },
        { gender: null }, { gender: '' }, { gender: { $exists: false } },
        { contactNumber: null }, { contactNumber: '' }, { contactNumber: { $exists: false } }
      ]
    }).toArray();

    console.log(`\nPatients missing details (${missingAny.length} total):`);
    missingAny.forEach((p, i) => {
      console.log(`${i + 1}. [${p.patientId || 'NO ID'}] ${p.firstName} ${p.lastName} - Age: ${p.age}, Gender: "${p.gender}", Phone: "${p.contactNumber}"`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkMissingFields();
