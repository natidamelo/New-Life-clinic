const mongoose = require('mongoose');

async function run() {
  try {
    const uri = 'mongodb+srv://kinfenati7_db_user:Natkinfe2325@cluster0.smcnulu.mongodb.net/clinic-cms?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(uri);

    const db = mongoose.connection.db;
    const waiting = await db.collection('patients').countDocuments({ status: 'waiting' });
    const scheduled = await db.collection('patients').countDocuments({ status: 'scheduled' });
    const admitted = await db.collection('patients').countDocuments({ status: 'Admitted' });
    
    console.log(`Waiting: ${waiting}, Scheduled: ${scheduled}, Admitted: ${admitted}`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

run();
