const mongoose = require('mongoose');

async function run() {
  try {
    const uri = 'mongodb+srv://kinfenati7_db_user:Natkinfe2325@cluster0.smcnulu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(uri);
    console.log('Connected.');

    const admin = mongoose.connection.db.admin();
    const dbs = await admin.listDatabases();
    
    for (const dbInfo of dbs.databases) {
      if (['admin', 'local', 'config'].includes(dbInfo.name)) continue;
      
      console.log(`--- DB: ${dbInfo.name} ---`);
      const targetDb = mongoose.connection.useDb(dbInfo.name);
      const collections = await targetDb.db.listCollections().toArray();
      
      for (const col of collections) {
         const count = await targetDb.db.collection(col.name).countDocuments({});
         console.log(`${col.name}: ${count}`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

run();
