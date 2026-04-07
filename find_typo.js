const { MongoClient } = require('mongodb');
require('dotenv').config({path: './backend/.env'});

async function info() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('clinic-cms');
  
  const patients = await db.collection('patients').find({ status: { $in: ['waiting', 'with_doctor'] } }).toArray();
  
  const doctorIds = patients.map(p => p.assignedDoctorId ? p.assignedDoctorId.toString() : 'none');
  
  const count = {};
  for(const id of doctorIds) {
    count[id] = (count[id] || 0) + 1;
  }
  console.log('Active Patients assignedDoctorId breakdown:');
  console.log(JSON.stringify(count, null, 2));
  
  // also check Dr Natan's exact id length
  const natan = await db.collection('users').findOne({role: 'doctor', username: /natan/i});
  console.log('Natan DB ID:', natan._id.toString(), 'length:', natan._id.toString().length);
  
  await client.close();
}
info().catch(console.error);
