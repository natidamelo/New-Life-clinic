const mongoose = require('mongoose');
const User = require('./models/User');
const Timesheet = require('./models/Timesheet');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/clinic-cms', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function refreshDoctorNatanTimesheet() {
  try {
    console.log('🔄 Refreshing Doctor Natan Timesheet...\n');

    // Find Doctor Natan
    const doctorNatan = await User.findOne({
      firstName: 'Doctor',
      lastName: 'Natan'
    });

    if (!doctorNatan) {
      console.log('❌ Doctor Natan not found');
      return;
    }

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find Doctor Natan's timesheet
    const timesheet = await Timesheet.findOne({
      userId: doctorNatan._id,
      date: { $gte: today, $lt: tomorrow }
    });

    if (!timesheet) {
      console.log('❌ No timesheet found for Doctor Natan today');
      return;
    }

    console.log('📋 Before Refresh:');
    console.log(`Clock In Time: ${timesheet.clockIn?.time}`);
    console.log(`Clock In Status: ${timesheet.clockIn?.attendanceStatus}`);
    console.log(`Minutes Late: ${timesheet.clockIn?.minutesLate}`);
    console.log(`Day Status: ${timesheet.dayAttendanceStatus}`);

    // Test the methods with current data
    if (timesheet.clockIn?.time) {
      const clockInTime = new Date(timesheet.clockIn.time);
      console.log('\n🧪 Testing Methods:');
      console.log(`isLateCheckIn(): ${timesheet.isLateCheckIn(clockInTime)}`);
      console.log(`calculateMinutesLate(): ${timesheet.calculateMinutesLate(clockInTime)}`);
      console.log(`calculateDayAttendanceStatus(): ${timesheet.calculateDayAttendanceStatus()}`);
    }

    // Force recalculation by triggering the pre-save middleware
    console.log('\n🔄 Force Recalculating...');
    
    // Mark the timesheet as modified to trigger pre-save middleware
    timesheet.markModified('clockIn');
    timesheet.markModified('clockOut');
    
    // Save to trigger recalculation
    await timesheet.save();

    console.log('\n✅ After Refresh:');
    console.log(`Clock In Time: ${timesheet.clockIn?.time}`);
    console.log(`Clock In Status: ${timesheet.clockIn?.attendanceStatus}`);
    console.log(`Minutes Late: ${timesheet.clockIn?.minutesLate}`);
    console.log(`Day Status: ${timesheet.dayAttendanceStatus}`);

    // Test Ethiopian time calculation
    if (timesheet.clockIn?.time) {
      const clockInTime = new Date(timesheet.clockIn.time);
      const ethiopianTime = new Date(clockInTime.getTime() + (3 * 60 * 60 * 1000));
      
      console.log('\n🕐 Time Analysis:');
      console.log(`Local Time: ${clockInTime.toLocaleString()}`);
      console.log(`Ethiopian Time: ${ethiopianTime.toLocaleString()}`);
      console.log(`Ethiopian Hours: ${ethiopianTime.getHours()}`);
      console.log(`Ethiopian Minutes: ${ethiopianTime.getMinutes()}`);
      console.log(`Total Ethiopian Minutes: ${ethiopianTime.getHours() * 60 + ethiopianTime.getMinutes()}`);
      console.log(`Grace Period End: ${8 * 60 + 15} minutes (8:15 AM)`);
      console.log(`Is Late: ${(ethiopianTime.getHours() * 60 + ethiopianTime.getMinutes()) > (8 * 60 + 15)}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

refreshDoctorNatanTimesheet();
