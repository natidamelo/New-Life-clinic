const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const User = require('./models/User');
  const Timesheet = require('./models/Timesheet');
  const StaffAttendance = require('./models/StaffAttendance');
  
  const natan = await User.findOne({ 
    $or: [
      { username: /natan/i },
      { firstName: /natan/i },
      { lastName: /natan/i }
    ]
  }).setOptions({skipTenantScope:true});
  if (!natan) {
    console.log('User natan not found. Available users:');
    const users = await User.find({}).setOptions({skipTenantScope:true});
    users.forEach(u => console.log(`- Username: ${u.username}, Name: ${u.firstName} ${u.lastName}`));
    process.exit(1);
  }
  
  const userId = natan._id;
  console.log('Natan User ID:', userId.toString());
  
  const today = new Date('2026-05-24T00:00:00.000Z');
  const tomorrow = new Date('2026-05-25T00:00:00.000Z');
  
  console.log('\n--- TIMESHEETS FOR TODAY ---');
  const timesheets = await Timesheet.find({
    userId,
    date: { $gte: today, $lt: tomorrow }
  }).setOptions({skipTenantScope:true});
  
  console.log(`Found ${timesheets.length} timesheets:`);
  timesheets.forEach(ts => {
    console.log(JSON.stringify(ts, null, 2));
  });
  
  console.log('\n--- STAFF ATTENDANCE FOR TODAY ---');
  const attendance = await StaffAttendance.find({
    userId,
    checkInTime: { $gte: today, $lt: tomorrow }
  }).setOptions({skipTenantScope:true});
  
  console.log(`Found ${attendance.length} attendance records:`);
  attendance.forEach(att => {
    console.log(JSON.stringify(att, null, 2));
  });
  
  process.exit(0);
}

run().catch(console.dir);
