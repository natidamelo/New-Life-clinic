const mongoose = require('mongoose');
const User = require('./models/User');
const Timesheet = require('./models/Timesheet');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/clinic-cms', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function testEarlyClockOut() {
  try {
    console.log('🔍 Testing Early Clock Out Functionality...\n');

    // Find a test user (Admin User)
    const testUser = await User.findOne({
      firstName: 'Admin',
      lastName: 'User'
    });

    if (!testUser) {
      console.log('❌ Test user not found');
      return;
    }

    console.log(`✅ Found test user: ${testUser.firstName} ${testUser.lastName} (${testUser.role})`);

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's timesheet
    let timesheet = await Timesheet.findOne({
      userId: testUser._id,
      date: { $gte: today, $lt: tomorrow }
    });

    if (!timesheet) {
      console.log('❌ No timesheet found for today');
      return;
    }

    console.log('\n📊 Current Status:');
    console.log(`Clock In: ${timesheet.clockIn?.time ? new Date(timesheet.clockIn.time).toLocaleString() : 'N/A'}`);
    console.log(`Clock Out: ${timesheet.clockOut?.time ? new Date(timesheet.clockOut.time).toLocaleString() : 'N/A'}`);
    console.log(`Status: ${timesheet.status}`);
    console.log(`Day Attendance Status: ${timesheet.dayAttendanceStatus}`);

    // Create a new timesheet for testing early clock out
    console.log('\n🔄 Creating test scenario for early clock out...');
    
    // Create a new timesheet with early clock out (10:30 AM)
    const earlyClockOutTime = new Date();
    earlyClockOutTime.setHours(10, 30, 0, 0); // 10:30 AM
    
    const ethiopianTime = new Date(earlyClockOutTime.getTime() + (3 * 60 * 60 * 1000)); // UTC+3
    
    // Update the timesheet with early clock out
    timesheet.clockOut = {
      time: earlyClockOutTime,
      location: 'Test Location',
      method: 'system',
      ethiopianTime: ethiopianTime,
      isEarlyClockOut: false,
      minutesEarly: 0
    };

    // Calculate work hours
    if (timesheet.clockIn && timesheet.clockIn.time) {
      const clockInTime = new Date(timesheet.clockIn.time);
      const clockOutTime = earlyClockOutTime;
      const workHours = (clockOutTime - clockInTime) / (1000 * 60 * 60);
      timesheet.totalWorkHours = Math.round(workHours * 100) / 100;
    }

    // Check if early clock out (before 11:00 AM)
    const currentHour = earlyClockOutTime.getHours();
    const currentMinute = earlyClockOutTime.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    const earlyThresholdInMinutes = 11 * 60; // 11:00 AM

    console.log(`\n🔍 Early Clock Out Analysis:`);
    console.log(`Clock Out Time: ${currentHour}:${currentMinute.toString().padStart(2, '0')}`);
    console.log(`Time in Minutes: ${currentTimeInMinutes}`);
    console.log(`Early Threshold: ${earlyThresholdInMinutes} (11:00 AM)`);
    console.log(`Is Early Clock Out: ${currentTimeInMinutes < earlyThresholdInMinutes ? 'Yes' : 'No'}`);

    if (currentTimeInMinutes < earlyThresholdInMinutes) {
      timesheet.clockOut.isEarlyClockOut = true;
      timesheet.clockOut.minutesEarly = earlyThresholdInMinutes - currentTimeInMinutes;
      console.log(`Minutes Early: ${timesheet.clockOut.minutesEarly}`);
    }

    // Update day attendance status
    if (timesheet.clockIn?.attendanceStatus === 'late' && timesheet.clockOut?.isEarlyClockOut) {
      timesheet.dayAttendanceStatus = 'partial';
    } else if (timesheet.clockOut?.isEarlyClockOut) {
      timesheet.dayAttendanceStatus = 'early-clock-out';
    } else if (timesheet.clockIn?.attendanceStatus === 'late') {
      timesheet.dayAttendanceStatus = 'late';
    } else {
      timesheet.dayAttendanceStatus = 'present';
    }

    timesheet.status = 'completed';

    // Save the updated timesheet
    await timesheet.save();

    console.log('\n✅ Early clock out test completed!');
    console.log(`Clock Out Time: ${earlyClockOutTime.toLocaleString()}`);
    console.log(`Early Clock Out: ${timesheet.clockOut.isEarlyClockOut ? 'Yes' : 'No'}`);
    console.log(`Minutes Early: ${timesheet.clockOut.minutesEarly || 0}`);
    console.log(`Day Attendance Status: ${timesheet.dayAttendanceStatus}`);
    console.log(`Total Work Hours: ${timesheet.totalWorkHours || 0} hours`);

    // Verify the changes
    console.log('\n🔍 Verification:');
    const updatedTimesheet = await Timesheet.findOne({
      userId: testUser._id,
      date: { $gte: today, $lt: tomorrow }
    });

    console.log(`Updated isEarlyClockOut: ${updatedTimesheet.clockOut.isEarlyClockOut}`);
    console.log(`Updated dayAttendanceStatus: ${updatedTimesheet.dayAttendanceStatus}`);
    console.log(`Updated minutesEarly: ${updatedTimesheet.clockOut.minutesEarly}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

testEarlyClockOut();
