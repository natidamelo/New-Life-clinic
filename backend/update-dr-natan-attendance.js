const mongoose = require('mongoose');
const Timesheet = require('./models/Timesheet');
const User = require('./models/User');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function updateDrNatanAttendance() {
  try {
    console.log('🔄 Updating Dr. Natan\'s Attendance Records...\n');

    // Find Dr. Natan
    const drNatan = await User.findOne({
      $or: [
        { firstName: { $regex: /natan/i } },
        { lastName: { $regex: /natan/i } },
        { firstName: { $regex: /dr/i }, lastName: { $regex: /natan/i } }
      ]
    });

    if (!drNatan) {
      console.log('❌ Dr. Natan not found');
      return;
    }

    console.log(`✅ Found Dr. Natan: ${drNatan.firstName} ${drNatan.lastName}`);
    console.log(`   User ID: ${drNatan._id}\n`);

    // Get all of Dr. Natan's timesheets
    const timesheets = await Timesheet.find({
      userId: drNatan._id
    }).sort({ date: -1 });

    console.log(`📋 Found ${timesheets.length} timesheet records\n`);

    if (timesheets.length === 0) {
      console.log('No timesheet records found for Dr. Natan');
      return;
    }

    // Update each timesheet with the new logic
    for (const timesheet of timesheets) {
      console.log(`📅 Updating timesheet for ${new Date(timesheet.date).toLocaleDateString()}:`);
      
      // Update working hours configuration
      timesheet.workingHours = {
        startTime: '08:00',
        endTime: '17:00',
        gracePeriod: 15,
        earlyCheckOutThreshold: '11:00'
      };

      // The pre-save middleware will automatically recalculate:
      // - clockIn.attendanceStatus (late/on-time)
      // - clockIn.minutesLate
      // - clockOut.isEarlyLogout
      // - clockOut.minutesEarly
      // - dayAttendanceStatus

      await timesheet.save();

      console.log(`   Clock In: ${timesheet.clockIn?.time ? new Date(timesheet.clockIn.time).toLocaleString() : 'N/A'}`);
      console.log(`   Clock Out: ${timesheet.clockOut?.time ? new Date(timesheet.clockOut.time).toLocaleString() : 'N/A'}`);
      console.log(`   Old Status: ${timesheet.dayAttendanceStatus}`);
      console.log(`   Minutes Late: ${timesheet.clockIn?.minutesLate || 0}`);
      console.log(`   Minutes Early: ${timesheet.clockOut?.minutesEarly || 0}`);
      console.log('');
    }

    console.log('✅ All timesheet records updated successfully!');

    // Show summary of updated records
    console.log('\n📊 Updated Attendance Summary:');
    const updatedTimesheets = await Timesheet.find({
      userId: drNatan._id
    }).sort({ date: -1 }).limit(10);

    updatedTimesheets.forEach(timesheet => {
      const date = new Date(timesheet.date).toLocaleDateString();
      const clockIn = timesheet.clockIn?.time ? new Date(timesheet.clockIn.time).toLocaleTimeString() : 'N/A';
      const clockOut = timesheet.clockOut?.time ? new Date(timesheet.clockOut.time).toLocaleTimeString() : 'N/A';
      const status = timesheet.dayAttendanceStatus;
      
      console.log(`   📅 ${date}:`);
      console.log(`      Clock In: ${clockIn}`);
      console.log(`      Clock Out: ${clockOut}`);
      console.log(`      Status: ${status}`);
      console.log(`      Work Hours: ${timesheet.totalWorkHours || 0}h`);
      
      if (timesheet.clockIn?.minutesLate > 0) {
        console.log(`      ⚠️  Late by: ${timesheet.clockIn.minutesLate} minutes`);
      }
      if (timesheet.clockOut?.isEarlyLogout) {
        console.log(`      ⚠️  Early logout by: ${timesheet.clockOut.minutesEarly} minutes`);
      }
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error updating attendance:', error);
  } finally {
    await mongoose.disconnect();
  }
}

updateDrNatanAttendance();
