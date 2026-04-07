const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  try {
    const uri = 'mongodb+srv://newlife-clinic:Sup3rAdm!n#2026#N3wL1fe@cluster0.smcnulu.mongodb.net/clinic-cms?retryWrites=true&w=majority';
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(uri);
    console.log('Connected.');

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const Patient = mongoose.model('Patient', new mongoose.Schema({}, { strict: false }));

    const users = await User.find({ username: /natan/i });
    console.log('Users found:', JSON.stringify(users, null, 2));

    const totalPatients = await Patient.countDocuments({});
    console.log('Total patients in DB:', totalPatients);

    const clinicCounts = await Patient.aggregate([
      { $group: { _id: '$clinicId', count: { $sum: 1 } } }
    ]);
    console.log('Patient counts by clinicId:', JSON.stringify(clinicCounts, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

run();
