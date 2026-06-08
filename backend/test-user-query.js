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

    console.log('\n⏱️ Measuring user queries:');

    // 1. Find one user
    const start1 = Date.now();
    const u1 = await db.collection('users').findOne({});
    console.log(`1. findOne: ${u1 ? u1.username : 'none'} in ${Date.now() - start1}ms`);

    // 2. Count documents
    const start2 = Date.now();
    const count = await db.collection('users').countDocuments();
    console.log(`2. countDocuments: ${count} in ${Date.now() - start2}ms`);

    // 3. Find all users
    const start3 = Date.now();
    const all = await db.collection('users').find({}).toArray();
    console.log(`3. find all: ${all.length} docs in ${Date.now() - start3}ms`);

    // 4. Find with role $nin: ['admin'] and isActive: true
    const start4 = Date.now();
    const q4 = await db.collection('users').find({
      role: { $nin: ['admin'] },
      isActive: true
    }).toArray();
    console.log(`4. find { role: { $nin: ['admin'] }, isActive: true }: ${q4.length} docs in ${Date.now() - start4}ms`);

    // 5. Find only isActive: true
    const start5 = Date.now();
    const q5 = await db.collection('users').find({
      isActive: true
    }).toArray();
    console.log(`5. find { isActive: true }: ${q5.length} docs in ${Date.now() - start5}ms`);

    // 6. Explain query 4
    console.log('\n🔍 Explaining query 4...');
    const explain = await db.collection('users').find({
      role: { $nin: ['admin'] },
      isActive: true
    }).explain();
    console.log(JSON.stringify(explain.queryPlanner?.winningPlan, null, 2));

    await mongoose.disconnect();
    console.log('\n🔌 Disconnected.');
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

run();
