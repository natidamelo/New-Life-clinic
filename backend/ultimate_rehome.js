const mongoose = require('mongoose');

async function run() {
  try {
    const uri = 'mongodb+srv://kinfenati7_db_user:Natkinfe2325@cluster0.smcnulu.mongodb.net/clinic-cms?retryWrites=true&w=majority&appName=Cluster0';
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(uri);
    console.log('Connected.');

    const target = 'new-life';
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    console.log(`Starting REHOME ALL DATA to ${target}...`);

    for (const col of collections) {
      const name = col.name;
      if (name.startsWith('system.')) continue;
      if (name === 'clinics') continue;

      const coll = db.collection(name);
      
      let filter = {
        $or: [
          { clinicId: { $ne: target } },
          { clinicId: { $exists: false } },
          { clinicId: null },
          { clinicId: '' }
        ]
      };

      if (name === 'users') {
        filter = {
          $and: [
            filter,
            { role: { $ne: 'super_admin' } }
          ]
        };
      }

      const count = await coll.countDocuments(filter);
      if (count > 0) {
        console.log(`Rehoming ${count} docs in ${name}...`);
        const result = await coll.updateMany(filter, { $set: { clinicId: target } });
        console.log(`  Updated: ${result.modifiedCount}`);
      } else {
        console.log(`Collection ${name} is already clean or empty.`);
      }
    }

    console.log('ALL DATA REHOMED SUCCESSFULLY.');
    process.exit(0);
  } catch (error) {
    console.error('Error during rehome:', error.message);
    process.exit(1);
  }
}

run();
