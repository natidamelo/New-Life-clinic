const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');

// Load environment variables from backend/.env
dotenv.config({ path: 'c:/Users/HP/OneDrive/Desktop/clinic new life/backend/.env' });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://kinfenati7_db_user:Natkinfe2325@cluster0.smcnulu.mongodb.net/clinic-cms?retryWrites=true&w=majority&appName=Cluster0';

console.log('Connecting to MongoDB via Native Driver...');

async function run() {
  const client = new MongoClient(MONGO_URI, {
    serverSelectionTimeoutMS: 5000
  });

  try {
    await client.connect();
    console.log('Connected to MongoDB successfully!');
    
    const db = client.db('clinic-cms');
    const usersCollection = db.collection('users');
    
    // Find Natan by various possible fields
    const natan = await usersCollection.findOne({
      $or: [
        { username: 'natan' },
        { username: 'drnatan' },
        { username: 'doctor' },
        { firstName: 'DR', lastName: 'Natan' },
        { firstName: 'Natan', lastName: 'Kinfe' },
        { firstName: 'Natan' },
        { lastName: 'Natan' },
        { email: 'doctor123@clinic.com' }
      ]
    });
    
    if (!natan) {
      console.log('User Natan not found. Listing all users in database:');
      const allUsers = await usersCollection.find({}).limit(20).toArray();
      allUsers.forEach(u => {
        console.log(`- ID: ${u._id}, Username: ${u.username}, Name: ${u.firstName} ${u.lastName}, Role: ${u.role}, Email: ${u.email}`);
      });
      await client.close();
      process.exit(1);
    }
    
    console.log('Natan User Found:', {
      _id: natan._id,
      username: natan.username,
      firstName: natan.firstName,
      lastName: natan.lastName,
      role: natan.role,
      email: natan.email
    });
    
    const timesheetsCollection = db.collection('timesheets');
    const today = new Date('2026-05-24T00:00:00.000Z');
    const tomorrow = new Date('2026-05-25T00:00:00.000Z');
    
    // Query timesheets for Natan on May 24, 2026
    const timesheets = await timesheetsCollection.find({
      userId: natan._id,
      date: { $gte: today, $lt: tomorrow }
    }).sort({ createdAt: -1 }).toArray();
    
    console.log(`\nFound ${timesheets.length} timesheets for today (2026-05-24):`);
    timesheets.forEach(ts => {
      console.log('----------------------------------------------------');
      console.log(`ID: ${ts._id}`);
      console.log(`Date: ${ts.date ? ts.date.toISOString() : 'N/A'}`);
      console.log(`IsOvertime: ${ts.isOvertime}`);
      console.log(`Status: ${ts.status}`);
      console.log(`DayAttendanceStatus: ${ts.dayAttendanceStatus}`);
      console.log(`ClockIn:`, ts.clockIn);
      console.log(`ClockOut:`, ts.clockOut);
      console.log(`Hours: Work=${ts.totalWorkHours}, Overtime=${ts.overtimeHours}`);
    });
    
    console.log('\n--- ALL STAFF ATTENDANCE ---');
    const staffattendanceCollection = db.collection('staffattendances');
    const attendance = await staffattendanceCollection.find({
      userId: natan._id,
      checkInTime: { $gte: today, $lt: tomorrow }
    }).toArray();
    
    console.log(`Found ${attendance.length} staff attendance records:`);
    attendance.forEach(att => {
      console.log(JSON.stringify(att, null, 2));
    });

  } catch (error) {
    console.error('Error running script:', error);
  } finally {
    await client.close();
    process.exit(0);
  }
}

run();
