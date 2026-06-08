const mongoose = require('mongoose');
const mongoURI = 'mongodb://localhost:27017/clinic-cms';

async function run() {
  await mongoose.connect(mongoURI);
  console.log('Connected to DB');

  const Patient = mongoose.model('Patient', new mongoose.Schema({}, { strict: false }));
  
  const patients = await Patient.find({
    $or: [
      { firstName: /debel/i },
      { lastName: /debel/i },
      { firstName: /abebe/i },
      { lastName: /abebe/i }
    ]
  });

  console.log(`Found ${patients.length} patients matching 'abebe' or 'debel':`);
  patients.forEach(p => {
    console.log({
      id: p.id,
      _id: p._id,
      firstName: p.firstName,
      lastName: p.lastName,
      status: p.status,
      hidden: p.hidden,
      vitals: p.vitals
    });
  });

  await mongoose.disconnect();
}

run().catch(console.error);
