const mongoose = require('mongoose');
require('dotenv').config({path: './backend/.env'});

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const User = require('./backend/models/User');
  const Patient = require('./backend/models/Patient');
  
  const natan = await User.findOne({ username: 'natan' }).setOptions({skipTenantScope:true});
  if (!natan) {
    console.log('User natan not found');
  } else {
    console.log('Natan ID:', natan._id.toString());
    const patients = await Patient.find({
      $or: [
        { assignedDoctorId: natan._id.toString() },
        { assignedDoctorId: natan._id }
      ]
    }).setOptions({skipTenantScope:true});
    console.log('Patients assigned to Natan:', patients.length);
    if(patients.length > 0) {
      console.log('Sample Patient Status:', patients[0].status);
    }
  }
  process.exit(0);
}
run().catch(console.dir);
