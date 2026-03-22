const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Timesheet = require('./models/Timesheet');
const User = require('./models/User');

async function fixDoctorNatanOvertime() {
  try {
    console.log('🔧 Fixing Doctor Natan\'s overtime calculation...');
    
    // Find Doctor Natan
    const doctorNatan = await User.findOne({
      firstName: 'Doctor',
      lastName: 'Natan'
    });
    
    if (!doctorNatan) {
      console.log('❌ Doctor Natan not found');
      return;
    }
    
    console.log('✅ Found Doctor Natan:', doctorNatan._id);
    
    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Find Doctor Natan's timesheet for today
    const timesheet = await Timesheet.findOne({
      userId: doctorNatan._id,
      date: {
        $gte: today,
        $lt: tomorrow
      }
    });
    
    if (!timesheet) {
      console.log('❌ No timesheet found for Doctor Natan today');
      return;
    }
    
    console.log('📋 Current timesheet data:');
    console.log('  Clock In:', timesheet.clockIn?.time);
    console.log('  Clock Out:', timesheet.clockOut?.time);
    console.log('  Work Hours:', timesheet.totalWorkHours);
    console.log('  Is Overtime:', timesheet.isOvertime);
    console.log('  Day Status:', timesheet.dayAttendanceStatus);
    
    // Check if clock-out time is in overtime period (5:00 PM - 1:30 AM)
    const clockOutTime = timesheet.clockOut?.time;
    if (clockOutTime) {
      const clockOutHour = clockOutTime.getHours();
      const clockOutMinute = clockOutTime.getMinutes();
      const clockOutTimeInMinutes = clockOutHour * 60 + clockOutMinute;
      
      // Overtime period: 17:00 (5:00 PM) to 01:30 (1:30 AM next day)
      const overtimeStartMinutes = 17 * 60; // 5:00 PM
      const overtimeEndMinutes = 1 * 60 + 30; // 1:30 AM
      
      console.log('🕐 Clock out time analysis:');
      console.log('  Clock out time in minutes:', clockOutTimeInMinutes);
      console.log('  Overtime start (minutes):', overtimeStartMinutes);
      console.log('  Overtime end (minutes):', overtimeEndMinutes);
      
      // Check if clock-out is in overtime period
      let isInOvertimePeriod = false;
      if (clockOutTimeInMinutes >= overtimeStartMinutes || clockOutTimeInMinutes <= overtimeEndMinutes) {
        isInOvertimePeriod = true;
      }
      
      console.log('  Is in overtime period:', isInOvertimePeriod);
      
      if (isInOvertimePeriod) {
        console.log('🎯 Doctor Natan worked overtime! Updating timesheet...');
        
        // Calculate overtime hours
        let overtimeMinutes = 0;
        if (clockOutTimeInMinutes >= overtimeStartMinutes) {
          // Clock out after 5:00 PM
          overtimeMinutes = clockOutTimeInMinutes - overtimeStartMinutes;
        } else {
          // Clock out before 1:30 AM (next day)
          overtimeMinutes = (24 * 60 - overtimeStartMinutes) + clockOutTimeInMinutes;
        }
        
        const overtimeHours = overtimeMinutes / 60;
        
        console.log('  Calculated overtime minutes:', overtimeMinutes);
        console.log('  Calculated overtime hours:', overtimeHours);
        
        // Update the timesheet
        timesheet.isOvertime = true;
        timesheet.overtimeHours = overtimeHours;
        timesheet.overtimeMinutes = overtimeMinutes;
        timesheet.dayAttendanceStatus = 'overtime-complete';
        
        // Save the updated timesheet
        await timesheet.save();
        
        console.log('✅ Timesheet updated successfully!');
        console.log('  New overtime hours:', timesheet.overtimeHours);
        console.log('  New day status:', timesheet.dayAttendanceStatus);
      } else {
        console.log('ℹ️ Doctor Natan did not work overtime');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

fixDoctorNatanOvertime();
