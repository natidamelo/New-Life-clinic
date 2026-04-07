const { MongoClient } = require('mongodb');
require('dotenv').config({path: './backend/.env'});

async function info() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('clinic-cms');
  
  // Get all active (non-completed) patients assigned to Natan
  const natanId = '6823301cdefc7776bf7537b3';
  
  const patients = await db.collection('patients').find({
    assignedDoctorId: natanId,
    status: { $ne: 'completed' },
    isActive: true
  }).project({ firstName: 1, lastName: 1, status: 1, assignedDoctorId: 1, clinicId: 1 }).toArray();
  
  console.log('Patients assigned to Natan with isActive:true and not completed:', patients.length);
  console.log(JSON.stringify(patients, null, 2));
  
  await client.close();
}
info().catch(console.error);
