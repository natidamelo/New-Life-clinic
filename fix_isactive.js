const { MongoClient } = require('mongodb');
require('dotenv').config({path: './backend/.env'});

async function info() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('clinic-cms');
  
  const res = await db.collection('patients').updateMany(
    { isActive: { $exists: false } },
    { $set: { isActive: true } }
  );
  
  console.log('Updated patients isActive missing field to true:', res.modifiedCount);
  
  const res2 = await db.collection('patients').updateMany(
    { isActive: null },
    { $set: { isActive: true } }
  );
  console.log('Updated patients isActive null field to true:', res2.modifiedCount);
  
  await client.close();
}
info().catch(console.error);
