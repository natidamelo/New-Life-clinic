const mongoose = require('mongoose');

async function run() {
  try {
    const user = 'newlife-clinic';
    const pass = encodeURIComponent('Sup3rAdm!n#2026#N3wL1fe');
    const uri = `mongodb+srv://${user}:${pass}@cluster0.smcnulu.mongodb.net/clinic-cms?retryWrites=true&w=majority`;
    
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(uri);
    console.log('Connected.');

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log(`Found ${collections.length} collections.`);

    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments({});
      console.log(`Col: ${col.name}, DocCount: ${count}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

run();
