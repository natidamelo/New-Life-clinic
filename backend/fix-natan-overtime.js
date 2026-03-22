const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Timesheet = require('./models/Timesheet');
const User = require('./models/User');

async function fixNatanOvertime() {
  try {
    console.log('🔧 Fixing Doctor Natan\'s overtime...');
    
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
    
    // Find Doctor Natan's regular timesheet
    const regularTimesheet = await Timesheet.findOne({
      userId: doctorNatan._id,
      date: { $gte: today, $lt: tomorrow },
      isOvertime: { $ne: true }
    });
    
    if (!regularTimesheet) {
      console.log('❌ No regular timesheet found for Doctor Natan');
      return;
    }
    
    console.log('📋 Regular timesheet found:');
    console.log('  Clock In:', regularTimesheet.clockIn?.time);
    console.log('  Clock Out:', regularTimesheet.clockOut?.time);
    console.log('  Work Hours:', regularTimesheet.totalWorkHours);
    
    // Check if overtime timesheet already exists
    const existingOvertime = await Timesheet.findOne({
      userId: doctorNatan._id,
      date: { $gte: today, $lt: tomorrow },
      isOvertime: true
    });
    
    if (existingOvertime) {
      console.log('✅ Overtime timesheet already exists');
      console.log('  Overtime Hours:', existingOvertime.overtimeHours);
      console.log('  Day Status:', existingOvertime.dayAttendanceStatus);
      return;
    }
    
    // Calculate overtime based on clock-out time (1:30 AM)
    const clockOutTime = regularTimesheet.clockOut.time;
    const clockOutHour = clockOutTime.getHours();
    const clockOutMinute = clockOutTime.getMinutes();
    const clockOutTimeInMinutes = clockOutHour * 60 + clockOutMinute;
    
    // Overtime period: 17:00 (5:00 PM) to 01:30 (1:30 AM next day)
    const overtimeStartMinutes = 17 * 60; // 5:00 PM
    const overtimeEndMinutes = 1 * 60 + 30; // 1:30 AM
    
    // Calculate overtime minutes (from 5:00 PM to 1:30 AM)
    let overtimeMinutes = 0;
    if (clockOutTimeInMinutes >= overtimeStartMinutes) {
      // Clock out after 5:00 PM
      overtimeMinutes = clockOutTimeInMinutes - overtimeStartMinutes;
    } else {
      // Clock out before 1:30 AM (next day)
      overtimeMinutes = (24 * 60 - overtimeStartMinutes) + clockOutTimeInMinutes;
    }
    
    const overtimeHours = overtimeMinutes / 60;
    
    console.log('🕐 Overtime calculation:');
    console.log('  Clock out time in minutes:', clockOutTimeInMinutes);
    console.log('  Overtime start (minutes):', overtimeStartMinutes);
    console.log('  Calculated overtime minutes:', overtimeMinutes);
    console.log('  Calculated overtime hours:', overtimeHours);
    
    // Create overtime timesheet
    const overtimeTimesheet = new Timesheet({
      userId: doctorNatan._id,
      date: today,
      department: 'Doctors/OPD',
      isOvertime: true,
      dayAttendanceStatus: 'overtime-complete',
      clockIn: {
        time: new Date(clockOutTime.getTime() - (overtimeMinutes * 60 * 1000)), // Overtime start time
        ethiopianTime: new Date(clockOutTime.getTime() - (overtimeMinutes * 60 * 1000)),
        attendanceStatus: 'on-time',
        minutesLate: 0,
        method: 'system'
      },
      clockOut: {
        time: clockOutTime, // Actual clock-out time
        ethiopianTime: clockOutTime,
        isEarlyClockOut: false,
        minutesEarly: 0,
        method: 'system'
      },
      overtimeHours: overtimeHours,
      overtimeMinutes: overtimeMinutes,
      totalWorkHours: overtimeHours,
      workingHours: regularTimesheet.workingHours,
      overtime: regularTimesheet.overtime
    });
    
    await overtimeTimesheet.save();
    
    console.log('✅ Created overtime timesheet for Doctor Natan');
    console.log('  Overtime Hours:', overtimeTimesheet.overtimeHours);
    console.log('  Day Status:', overtimeTimesheet.dayAttendanceStatus);
    console.log('  Overtime Clock In:', overtimeTimesheet.clockIn.time);
    console.log('  Overtime Clock Out:', overtimeTimesheet.clockOut.time);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

fixNatanOvertime();
