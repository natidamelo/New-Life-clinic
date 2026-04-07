const mongoose = require('mongoose');

async function run() {
  try {
    const uri = 'mongodb+srv://kinfenati7_db_user:Natkinfe2325@cluster0.smcnulu.mongodb.net/clinic-cms?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(uri);

    const db = mongoose.connection.db;
    const collections = ['patients', 'services', 'users', 'medicalinvoices'];
    
    for (const name of collections) {
      const doc = await db.collection(name).findOne({ clinicId: { $exists: true } });
      if (doc) {
        console.log(`Col: ${name}, clinicId Type: ${typeof doc.clinicId}, Value: ${doc.clinicId}`);
      } else {
        console.log(`Col: ${name}, No doc with clinicId found.`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

run();
