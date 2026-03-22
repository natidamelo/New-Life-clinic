const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Timesheet = require('./models/Timesheet');

async function updateExistingOvertime() {
  try {
    console.log('🔧 Updating existing timesheets to recalculate overtime...');
    
    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Find all timesheets for today that have clock-out times
    const timesheets = await Timesheet.find({
      date: {
        $gte: today,
        $lt: tomorrow
      },
      'clockOut.time': { $exists: true, $ne: null }
    });
    
    console.log(`📊 Found ${timesheets.length} timesheets with clock-out times for today`);
    
    let updatedCount = 0;
    
    for (const timesheet of timesheets) {
      console.log(`\n🔍 Processing timesheet for user: ${timesheet.userId}`);
      console.log(`  Clock In: ${timesheet.clockIn?.time}`);
      console.log(`  Clock Out: ${timesheet.clockOut?.time}`);
      console.log(`  Current Overtime Hours: ${timesheet.overtimeHours}`);
      console.log(`  Current Is Overtime: ${timesheet.isOvertime}`);
      console.log(`  Current Day Status: ${timesheet.dayAttendanceStatus}`);
      
      // Force recalculation by calling the pre-save middleware
      const overtimeMinutes = timesheet.calculateOvertimeMinutes(timesheet.clockOut.time);
      const overtimeHours = Math.round((overtimeMinutes / 60) * 100) / 100;
      
      console.log(`  Calculated Overtime Minutes: ${overtimeMinutes}`);
      console.log(`  Calculated Overtime Hours: ${overtimeHours}`);
      
      // Update the timesheet
      timesheet.overtimeMinutes = overtimeMinutes;
      timesheet.overtimeHours = overtimeHours;
      
      // Set isOvertime flag if overtime was worked
      if (overtimeMinutes > 0) {
        timesheet.isOvertime = true;
        console.log(`  ✅ Set isOvertime = true`);
      } else {
        timesheet.isOvertime = false;
        console.log(`  ℹ️ Set isOvertime = false`);
      }
      
      // Recalculate day attendance status
      timesheet.dayAttendanceStatus = timesheet.calculateDayAttendanceStatus();
      console.log(`  New Day Status: ${timesheet.dayAttendanceStatus}`);
      
      // Save the updated timesheet
      await timesheet.save();
      updatedCount++;
      
      console.log(`  ✅ Timesheet updated successfully`);
    }
    
    console.log(`\n🎉 Update complete! Updated ${updatedCount} timesheets`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

updateExistingOvertime();
