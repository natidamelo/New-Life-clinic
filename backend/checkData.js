const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const Patient = require('./models/Patient');
    const p1 = await Patient.findOne({ status: 'completed' });
    if(p1) {
      console.log('Sample Completed Patient:', {
        id: p1._id,
        firstName: p1.firstName,
        status: p1.status,
        isActive: p1.isActive,
        assignedDoctorId: p1.assignedDoctorId
      });
      
      const withoutIsActive = await Patient.countDocuments({ status: 'completed', isActive: { $ne: true } });
      const withIsActive = await Patient.countDocuments({ status: 'completed', isActive: true });
      console.log('Completed Patients WITHOUT isActive=true:', withoutIsActive);
      console.log('Completed Patients WITH isActive=true:', withIsActive);
    } else {
      console.log('No completed patients found at all');
    }
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
