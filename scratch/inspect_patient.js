const mongoose = require('mongoose');
const mongoURI = 'mongodb://localhost:27017/clinic-cms';

async function run() {
  await mongoose.connect(mongoURI);
  const Patient = mongoose.model('Patient', new mongoose.Schema({}, { strict: false }));
  
  const patient = await Patient.findOne({ firstName: 'Abebe', lastName: 'Debel' });
  console.log('Abebe Debel complete doc:', patient ? patient.toObject() : 'not found');

  await mongoose.disconnect();
}

run().catch(console.error);
