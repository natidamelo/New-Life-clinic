/**
 * test-atlas-connection.js
 * Run with: node test-atlas-connection.js
 * This tests if your Atlas credentials work locally.
 */
require('dotenv').config();
const mongoose = require('mongoose');

const TIMEOUT = 20000;

const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI || '';

if (!mongoURI) {
  console.error('❌ No MONGODB_URI found in .env — cannot test');
  process.exit(1);
}

// Mask the password for logging
const masked = mongoURI.replace(/:([^:@/]+)@/, ':***@');
console.log(`\n🔍 Testing connection to: ${masked}\n`);

const opts = {
  serverSelectionTimeoutMS: TIMEOUT,
  connectTimeoutMS: TIMEOUT,
  socketTimeoutMS: TIMEOUT,
  bufferCommands: false,
};

(async () => {
  try {
    console.log('⏳ Connecting...');
    await mongoose.connect(mongoURI, opts);
    console.log('✅ SUCCESS — Connected to MongoDB Atlas!');
    console.log(`   readyState: ${mongoose.connection.readyState}`);
    console.log(`   host: ${mongoose.connection.host}`);
    console.log(`   db: ${mongoose.connection.name}`);

    // Quick ping
    const admin = mongoose.connection.db.admin();
    const ping = await admin.ping();
    console.log(`   ping: ${JSON.stringify(ping)}`);
    console.log('\n✅ Connection string is VALID. The problem is purely on Render\'s side.\n');
  } catch (err) {
    console.error(`\n❌ FAILED: ${err.message}`);
    if (err.message.includes('Authentication')) {
      console.error('   ➡  The PASSWORD in MONGODB_URI is WRONG.');
      console.error('   ➡  Go to Atlas → Database Access → Edit user → Reset password.');
    } else if (err.message.includes('ENOTFOUND') || err.message.includes('getaddrinfo')) {
      console.error('   ➡  DNS resolution failed. The cluster hostname may be wrong.');
    } else if (err.message.includes('Server selection timed out')) {
      console.error('   ➡  Cannot reach the Atlas cluster at all.');
      console.error('   ➡  Check your IP Access List and cluster status in Atlas.');
    } else {
      console.error('   ➡  Unknown error. Full details above.');
    }
  } finally {
    await mongoose.disconnect().catch(() => {});
    process.exit(0);
  }
})();
