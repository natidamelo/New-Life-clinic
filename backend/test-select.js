const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');

const mongoURI = process.env.MONGODB_URI;

async function run() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoURI, { family: 4 });
    console.log('✅ Connected.');

    const db = mongoose.connection.db;

    console.log('\n⏱️ Measuring user query with projection (excluding photo and digitalSignature):');
    const start = Date.now();
    const result = await db.collection('users').find(
      { role: { $nin: ['admin'] }, isActive: true },
      { projection: { photo: 0, digitalSignature: 0 } }
    ).toArray();
    console.log(`✅ Completed in ${Date.now() - start}ms! Found ${result.length} users.`);

    await mongoose.disconnect();
    console.log('\n🔌 Disconnected.');
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

run();
