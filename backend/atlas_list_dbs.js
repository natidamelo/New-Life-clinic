const mongoose = require('mongoose');

async function run() {
  try {
    const uri = 'mongodb+srv://kinfenati7_db_user:Natkinfe2325@cluster0.smcnulu.mongodb.net/clinic-cms?retryWrites=true&w=majority&appName=Cluster0';
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(uri);
    console.log('Connected.');

    const admin = mongoose.connection.db.admin();
    const dbs = await admin.listDatabases();
    console.log('Databases:', JSON.stringify(dbs.databases, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

run();
