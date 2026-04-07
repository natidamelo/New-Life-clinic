const mongoose = require('mongoose');

async function run() {
  try {
    const uri = 'mongodb+srv://kinfenati7_db_user:Natkinfe2325@cluster0.smcnulu.mongodb.net/clinic-cms?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(uri);
    console.log('Connected to MongoDB Atlas');

    const collections = await mongoose.connection.db.listCollections().toArray();
    for (const col of collections) {
      const name = col.name;
      const count = await mongoose.connection.db.collection(name).countDocuments();
      if (count > 0) {
        const sample = await mongoose.connection.db.collection(name).findOne({});
        console.log(`Collection: ${name}, Count: ${count}, Sample clinicId: ${sample.clinicId || 'MISSING'}`);
        
        // Count by clinicId
        const clinicIds = await mongoose.connection.db.collection(name).distinct('clinicId');
        console.log(`  Distinct clinicIds: ${JSON.stringify(clinicIds)}`);
      }
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
