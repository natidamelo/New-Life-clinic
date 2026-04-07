const mongoose = require('mongoose');

async function run() {
  try {
    const uri = 'mongodb+srv://kinfenati7_db_user:Natkinfe2325@cluster0.smcnulu.mongodb.net/clinic-cms?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(uri);

    const db = mongoose.connection.db;
    const doc = await db.collection('patients').findOne({ clinicId: { $exists: true } });
    
    if (doc) {
      console.log('Patient doc clinicId:', doc.clinicId);
      console.log('Type of clinicId:', typeof doc.clinicId);
      console.log('Raw JSON:', JSON.stringify(doc.clinicId));
    } else {
      console.log('No patient with clinicId found.');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

run();
