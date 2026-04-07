const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Patient = require('./models/Patient');
  const active = await Patient.find({ status: { $in: ['waiting', 'with_doctor', 'with_nurse'] } }).setOptions({ skipTenantScope: true }).lean();
  console.log('Active patients:', active.length);
  if (active.length > 0) {
    console.log('Sample Active Patient:', active[0]._id, active[0].status, active[0].assignedDoctorId, active[0].clinicId);
  } else {
    console.log('No active patients found in DB.');
  }
  process.exit(0);
}
run().catch(console.dir);
