const { MongoClient } = require('mongodb');
const fs = require('fs');
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
  
  const natan = await db.collection('users').findOne({role: 'doctor', username: /natan/i});
  const natanId = natan ? natan._id.toString() : 'missing';
  
  const result = {
    activePatientsBreakdown: count,
    natanDBId: natanId,
    natanIdLength: natanId.length
  };
  
  fs.writeFileSync('typo_results.json', JSON.stringify(result, null, 2));
  
  await client.close();
}
info().catch(console.error);
