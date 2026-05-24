const mongoose = require('mongoose');

async function printCounts() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms';
    await mongoose.connect(mongoUri);

    const Patient = mongoose.connection.collection('patients');

    const totalCount = await Patient.countDocuments();
    const missingAge = await Patient.countDocuments({ $or: [{ age: null }, { age: { $exists: false } }] });
    const missingGender = await Patient.countDocuments({ $or: [{ gender: null }, { gender: '' }, { gender: { $exists: false } }] });
    const missingPhone = await Patient.countDocuments({ $or: [{ contactNumber: null }, { contactNumber: '' }, { contactNumber: { $exists: false } }] });

    console.log(`Total patients in DB: ${totalCount}`);
    console.log(`Patients missing age: ${missingAge}`);
    console.log(`Patients missing gender: ${missingGender}`);
    console.log(`Patients missing phone: ${missingPhone}`);

  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
  }
}

printCounts();
