const mongoose = require('mongoose');

async function run() {
  try {
    const uri = 'mongodb+srv://kinfenati7_db_user:Natkinfe2325@cluster0.smcnulu.mongodb.net/clinic-cms?retryWrites=true&w=majority&appName=Cluster0';
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(uri);
    console.log('Connected.');

    const target = 'new-life';
    const db = mongoose.connection.db;
    const services = await db.collection('services').find({}).limit(5).toArray();
    console.log('Sample Services:', JSON.stringify(services.map(s => ({ _id: s._id, name: s.name, clinicId: s.clinicId })), null, 2));

    const users = await db.collection('users').find({}).limit(5).toArray();
    console.log('Sample Users:', JSON.stringify(users.map(u => ({ _id: u._id, username: u.username, clinicId: u.clinicId })), null, 2));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

run();
