const mongoose = require('mongoose');
const Timesheet = require('./models/Timesheet');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/clinic-cms', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function updateAllTimesheetsConfig() {
  try {
    console.log('🔄 Updating All Timesheets with New Working Hours Configuration...\n');

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
      timesheet.workingHours.startTime = '02:30'; // 2:30 AM Ethiopian Time
      timesheet.workingHours.endTime = '11:30'; // 11:30 AM Ethiopian Time
      timesheet.workingHours.gracePeriod = 15; // 15 minutes grace period
      timesheet.workingHours.earlyCheckOutThreshold = '05:30'; // 5:30 AM Ethiopian Time
      
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

    // Show summary of changes
    console.log('\n📋 Summary of New Configuration:');
    console.log('==================================');
    console.log('Start Time: 2:30 AM (Ethiopian Time)');
    console.log('End Time: 11:30 AM (Ethiopian Time)');
    console.log('Grace Period: 15 minutes');
    console.log('Early Check-out Threshold: 5:30 AM (Ethiopian Time)');
    console.log('');
    console.log('🕐 Time Conversions:');
    console.log('2:30 AM Ethiopian = 11:30 PM Local (previous day)');
    console.log('5:30 AM Ethiopian = 2:30 AM Local');
    console.log('11:30 AM Ethiopian = 8:30 AM Local');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

updateAllTimesheetsConfig();
