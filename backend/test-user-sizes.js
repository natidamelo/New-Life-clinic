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

    console.log('\n📊 Investigating User sizes:');
    const users = await db.collection('users').find({}, { projection: { password: 0 } }).toArray();

    users.forEach(user => {
      console.log(`\n👤 User: ${user.username} (Role: ${user.role})`);
      let totalSize = 0;
      Object.keys(user).forEach(key => {
        const val = user[key];
        let valSize = 0;
        if (typeof val === 'string') {
          valSize = val.length;
        } else if (val && typeof val === 'object') {
          valSize = JSON.stringify(val).length;
        } else {
          valSize = String(val).length;
        }
        totalSize += valSize;
        if (valSize > 100) {
          console.log(`  - Key "${key}": ${valSize} bytes (preview: ${String(val).substring(0, 50)}...)`);
        } else {
          console.log(`  - Key "${key}": ${valSize} bytes`);
        }
      });
      console.log(`  Total User Object Size: ${totalSize} bytes`);
    });

    await mongoose.disconnect();
    console.log('\n🔌 Disconnected.');
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

run();
