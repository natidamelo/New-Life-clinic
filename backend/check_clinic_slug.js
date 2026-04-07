const mongoose = require('mongoose');

async function run() {
  try {
    const uri = 'mongodb+srv://kinfenati7_db_user:Natkinfe2325@cluster0.smcnulu.mongodb.net/clinic-cms?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(uri);

    const db = mongoose.connection.db;
    const clinics = await db.collection('clinics').find({}).toArray();
    clinics.forEach(c => console.log(`_id: ${c._id}, name: ${c.name}, slug: ${c.slug}`));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

run();
