const mongoose = require('mongoose');
const User = require('./models/User');
const Timesheet = require('./models/Timesheet');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/clinic-cms', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function fixDoctorNatanLateStatus() {
  try {
    console.log('🔧 Fixing Doctor Natan Late Status...\n');

    // Find Doctor Natan
    const doctorNatan = await User.findOne({
      firstName: 'Doctor',
      lastName: 'Natan'
    });

    if (!doctorNatan) {
      console.log('❌ Doctor Natan not found');
      return;
    }

    console.log(`✅ Found Doctor Natan: ${doctorNatan.firstName} ${doctorNatan.lastName}`);

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find Doctor Natan's timesheet for today
    const timesheet = await Timesheet.findOne({
      userId: doctorNatan._id,
      date: { $gte: today, $lt: tomorrow }
    });

    if (!timesheet) {
      console.log('❌ No timesheet found for Doctor Natan today');
      return;
    }

    console.log('\n📋 Current Timesheet Status:');
    console.log(`Clock In Time: ${timesheet.clockIn?.time ? new Date(timesheet.clockIn.time).toLocaleString() : 'N/A'}`);
    console.log(`Clock In Status: ${timesheet.clockIn?.attendanceStatus || 'N/A'}`);
    console.log(`Minutes Late: ${timesheet.clockIn?.minutesLate || 0}`);
    console.log(`Day Attendance Status: ${timesheet.dayAttendanceStatus || 'N/A'}`);

    // Check if there's a mismatch between minutesLate and attendanceStatus
    if (timesheet.clockIn?.minutesLate > 0 && timesheet.clockIn?.attendanceStatus !== 'late') {
      console.log('\n🔧 Fixing attendance status mismatch...');
      
      // Fix the clock in attendance status
      timesheet.clockIn.attendanceStatus = 'late';
      
      // Recalculate day attendance status
      if (timesheet.clockOut?.isEarlyClockOut) {
        timesheet.dayAttendanceStatus = 'partial';
      } else {
        timesheet.dayAttendanceStatus = 'late';
      }
      
      // Save the updated timesheet
      await timesheet.save();
      
      console.log('✅ Fixed attendance status!');
      console.log(`   Clock In Status: ${timesheet.clockIn.attendanceStatus}`);
      console.log(`   Day Attendance Status: ${timesheet.dayAttendanceStatus}`);
    } else {
      console.log('\n✅ No mismatch found - attendance status is correct');
    }

    // Verify the fix
    console.log('\n📊 Final Status:');
    console.log(`Clock In: ${new Date(timesheet.clockIn.time).toLocaleString()}`);
    console.log(`Clock Out: ${timesheet.clockOut?.time ? new Date(timesheet.clockOut.time).toLocaleString() : 'N/A'}`);
    console.log(`Clock In Status: ${timesheet.clockIn.attendanceStatus}`);
    console.log(`Day Status: ${timesheet.dayAttendanceStatus}`);
    console.log(`Minutes Late: ${timesheet.clockIn.minutesLate}`);
    console.log(`Work Hours: ${timesheet.totalWorkHours}h`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

fixDoctorNatanLateStatus();
