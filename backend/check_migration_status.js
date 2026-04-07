const mongoose = require('mongoose');

async function run() {
  try {
    const uri = 'mongodb+srv://kinfenati7_db_user:Natkinfe2325@cluster0.smcnulu.mongodb.net/clinic-cms?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(uri);

    const target = 'new-life';
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    console.log(`Checking for docs NOT in ${target}:`);

    for (const col of collections) {
      const name = col.name;
      if (name.startsWith('system.')) continue;
      if (name === 'clinics') continue;

      const coll = db.collection(name);
      const total = await coll.countDocuments({});
      const notMatch = await coll.countDocuments({
        $or: [
          { clinicId: { $ne: target } },
          { clinicId: { $exists: false } },
          { clinicId: null },
          { clinicId: '' }
        ]
      });

      if (total > 0) {
        console.log(`${name}: Total=${total}, NotMatching=${notMatch}`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

run();
