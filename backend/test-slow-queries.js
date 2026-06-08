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

    // Define today and tomorrow for queries
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get collection counts
    const staffAttendanceCount = await db.collection('staffattendances').countDocuments();
    const timesheetsCount = await db.collection('timesheets').countDocuments();
    const usersCount = await db.collection('users').countDocuments();

    console.log('\n📊 Database Collection Counts:');
    console.log(`- staffattendances: ${staffAttendanceCount}`);
    console.log(`- timesheets: ${timesheetsCount}`);
    console.log(`- users: ${usersCount}`);

    console.log('\n⏱️ Measuring query execution times:');

    // 1. StaffAttendance.find today
    const start1 = Date.now();
    const q1 = await db.collection('staffattendances').find({
      checkInTime: { $gte: today, $lt: tomorrow }
    }).toArray();
    console.log(`1. StaffAttendance.find today: ${q1.length} docs in ${Date.now() - start1}ms`);

    // 2. StaffAttendance.find sort checkInTime
    const start2 = Date.now();
    const q2 = await db.collection('staffattendances').find()
      .sort({ checkInTime: -1 })
      .limit(10)
      .toArray();
    console.log(`2. StaffAttendance.find sort checkInTime -1: ${q2.length} docs in ${Date.now() - start2}ms`);

    // 3. Timesheet.find today
    const start3 = Date.now();
    const q3 = await db.collection('timesheets').find({
      date: { $gte: today, $lt: tomorrow }
    }).toArray();
    console.log(`3. Timesheet.find today: ${q3.length} docs in ${Date.now() - start3}ms`);

    // 4. User.find non-admin active via Mongoose
    const User = require('./models/User');
    const start4 = Date.now();
    const q4 = await User.find({
      role: { $nin: ['admin'] },
      isActive: true
    });
    console.log(`4. User.find active non-admin (Mongoose): ${q4.length} docs in ${Date.now() - start4}ms`);
    if (q4.length > 0) {
      console.log('Sample user keys:', Object.keys(q4[0]._doc || q4[0]));
      console.log('Sample user photo length:', q4[0].photo ? q4[0].photo.length : 'undefined');
      console.log('Sample user signature length:', q4[0].digitalSignature ? q4[0].digitalSignature.length : 'undefined');
    }

    // 5. Let's explain query 2 (sort)
    const explain2 = await db.collection('staffattendances').find()
      .sort({ checkInTime: -1 })
      .limit(10)
      .explain();
    
    // Check if it's a COLLSCAN
    const winningPlan = explain2.queryPlanner?.winningPlan;
    console.log('\n🔍 Explain Sort by checkInTime:', JSON.stringify(winningPlan, null, 2).substring(0, 500));

    await mongoose.disconnect();
    console.log('\n🔌 Disconnected.');
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

run();
