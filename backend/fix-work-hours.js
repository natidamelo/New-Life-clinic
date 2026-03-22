const mongoose = require('mongoose');
const User = require('./models/User');
const Timesheet = require('./models/Timesheet');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/clinic-cms', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function fixWorkHours() {
  try {
    console.log('🔧 Fixing Work Hours Calculation...\n');

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find Admin User
    const adminUser = await User.findOne({
      firstName: 'Admin',
      lastName: 'User'
    });

    if (!adminUser) {
      console.log('❌ Admin User not found');
      return;
    }

    console.log(`✅ Found: ${adminUser.firstName} ${adminUser.lastName} (${adminUser.role})`);

    // Get today's timesheet
    const timesheet = await Timesheet.findOne({
      userId: adminUser._id,
      date: { $gte: today, $lt: tomorrow }
    });

    if (!timesheet) {
      console.log('❌ No timesheet found for Admin User today');
      return;
    }

    console.log('\n📊 Current Status:');
    console.log(`Clock In: ${timesheet.clockIn?.time ? new Date(timesheet.clockIn.time).toLocaleString() : 'N/A'}`);
    console.log(`Clock Out: ${timesheet.clockOut?.time ? new Date(timesheet.clockOut.time).toLocaleString() : 'N/A'}`);
    console.log(`Current Work Hours: ${timesheet.totalWorkHours || 0}h`);

    // Check if both clock in and out times exist
    if (timesheet.clockIn?.time && timesheet.clockOut?.time) {
      const clockInTime = new Date(timesheet.clockIn.time);
      const clockOutTime = new Date(timesheet.clockOut.time);
      
      // Calculate work hours
      const workHours = (clockOutTime - clockInTime) / (1000 * 60 * 60); // Convert to hours
      const roundedWorkHours = Math.round(workHours * 100) / 100; // Round to 2 decimal places
      
      console.log(`\n🔧 Fixing Work Hours Calculation:`);
      console.log(`Clock In: ${clockInTime.toLocaleString()}`);
      console.log(`Clock Out: ${clockOutTime.toLocaleString()}`);
      console.log(`Time Difference: ${workHours.toFixed(4)} hours`);
      console.log(`Rounded Work Hours: ${roundedWorkHours} hours`);
      
      // Update the timesheet
      timesheet.totalWorkHours = roundedWorkHours;
      await timesheet.save();
      
      console.log(`\n✅ Work hours fixed! New total: ${roundedWorkHours}h`);
    } else {
      console.log('❌ Cannot calculate work hours - missing clock in or out time');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

fixWorkHours();
