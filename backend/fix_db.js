require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const target = 'new-life';

    const notYetThisClinic = {
      $or: [
        { clinicId: { $exists: false } },
        { clinicId: null },
        { clinicId: '' },
        { clinicId: { $ne: target } }
      ]
    };

    const db = mongoose.connection.db;
    const listed = await db.listCollections().toArray();
    const names = listed.map((c) => c.name).filter(Boolean);

    for (const name of names) {
      const lower = name.toLowerCase();
      if (lower.startsWith('system.')) continue;
      if (lower === 'clinics') continue;

      const coll = db.collection(name);
      let filter = notYetThisClinic;
      if (name === 'users') {
        filter = { $and: [notYetThisClinic, { role: { $ne: 'super_admin' } }] };
      }

      const count = await coll.countDocuments(filter);
      console.log(`Collection ${name} has ${count} documents to update...`);
      if (count > 0) {
        const result = await coll.updateMany(filter, { $set: { clinicId: target } });
        console.log(`  Updated ${result.modifiedCount} documents in ${name}.`);
      }
    }

    console.log('Done!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
