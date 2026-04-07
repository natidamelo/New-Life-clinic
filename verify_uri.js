const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://kinfenati7_db_user:Natkinfe2325@cluster0.smcnulu.mongodb.net/clinic-cms?retryWrites=true&w=majority&appName=Cluster0";

async function check() {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
  try {
    await client.connect();
    const db = client.db('clinic-cms');
    const count = await db.collection('patients').countDocuments();
    console.log('✅ Connection SUCCESSFUL!');
    console.log('   Database: clinic-cms');
    console.log('   Patients count:', count);
    await client.close();
  } catch (err) {
    console.error('❌ Connection FAILED:', err.message);
  }
}
check();
