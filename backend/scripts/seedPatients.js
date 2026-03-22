const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/clinic-cms').then(async () => {
  const Patient = require('../models/Patient');
  const drNatanId = '6916e19b8d6c5c4330705efb';

  const vitals = {
    temperature: 37.2,
    heartRate: 78,
    bloodPressure: '120/80',
    respiratoryRate: 16,
    oxygenSaturation: 98,
    timestamp: new Date()
  };

  const result = await Patient.updateMany(
    { assignedDoctorId: drNatanId },
    { $set: { vitals: vitals } }
  );
  console.log('Updated vitals for', result.modifiedCount, 'patients');

  const patients = await Patient.find({ assignedDoctorId: drNatanId }).select('firstName lastName status vitals assignedDoctorId').lean();
  patients.forEach(p => {
    console.log(`${p.firstName} ${p.lastName} | status: ${p.status} | hasVitals: ${!!p.vitals?.heartRate}`);
  });

  process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
