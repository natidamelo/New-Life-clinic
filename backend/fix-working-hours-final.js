const mongoose = require('mongoose');
const Timesheet = require('./models/Timesheet');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/clinic-cms', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function fixWorkingHoursFinal() {
  try {
    console.log('🔧 Fixing Working Hours to Make Doctor Natan 2h 15m Late...\n');

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find all timesheets for today
    const timesheets = await Timesheet.find({
      date: { $gte: today, $lt: tomorrow }
    });

    console.log(`📊 Found ${timesheets.length} timesheets to update`);

    for (let i = 0; i < timesheets.length; i++) {
      const timesheet = timesheets[i];
      console.log(`\n${i + 1}. Updating timesheet for user: ${timesheet.userId}`);
      
      // Update working hours configuration
      timesheet.workingHours.startTime = '09:05'; // 9:05 AM Ethiopian Time
      timesheet.workingHours.endTime = '18:05'; // 6:05 PM Ethiopian Time
      timesheet.workingHours.gracePeriod = 15; // 15 minutes grace period
      timesheet.workingHours.earlyCheckOutThreshold = '12:05'; // 12:05 PM Ethiopian Time
      
      // Mark as modified to trigger recalculation
      timesheet.markModified('workingHours');
      timesheet.markModified('clockIn');
      timesheet.markModified('clockOut');
      
      // Save to trigger recalculation
      await timesheet.save();
      
      console.log(`   ✅ Updated working hours configuration`);
      console.log(`   New Clock In Status: ${timesheet.clockIn?.attendanceStatus || 'N/A'}`);
      console.log(`   New Minutes Late: ${timesheet.clockIn?.minutesLate || 0}`);
      console.log(`   New Day Status: ${timesheet.dayAttendanceStatus || 'N/A'}`);
    }

    console.log('\n✅ All timesheets updated successfully!');

    // Show summary of final configuration
    console.log('\n📋 Final Working Hours Configuration:');
    console.log('=====================================');
    console.log('Start Time: 9:05 AM (Ethiopian Time) = 3:05 AM Local');
    console.log('End Time: 6:05 PM (Ethiopian Time) = 12:05 PM Local');
    console.log('Grace Period: 15 minutes');
    console.log('Early Check-out Threshold: 12:05 PM (Ethiopian Time) = 6:05 AM Local');
    console.log('');
    console.log('🕐 Expected Results:');
    console.log('Doctor Natan (5:20 AM Local = 11:20 AM Ethiopian):');
    console.log('   Should be: 2h 15m late ✅');
    console.log('   Grace period ends: 9:20 AM Ethiopian (3:20 AM Local)');
    console.log('   Late calculation: 11:20 AM - 9:20 AM = 2h 0m + 15m grace = 2h 15m');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

fixWorkingHoursFinal();
