require('dotenv').config();
const mongoose = require('mongoose');

const mongoURI = process.env.MONGODB_URI;

const opts = {
  serverSelectionTimeoutMS: 15000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 15000,
  family: 4 // with family 4
};

async function run() {
  try {
    console.log('🔌 Connecting to MongoDB using URI from .env...');
    const start = Date.now();
    await mongoose.connect(mongoURI, opts);
    console.log(`✅ Connected in ${Date.now() - start}ms!`);

    console.log('📂 Listing collections...');
    const startList = Date.now();
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log(`✅ Collections listed in ${Date.now() - startList}ms!`);
    console.log('Collections:', collections.map(c => c.name));

    await mongoose.disconnect();
    console.log('🔌 Disconnected.');
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

run();
