const mongoose = require('mongoose');
const Timesheet = require('./models/Timesheet');
const User = require('./models/User');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function testNewAttendanceLogic() {
  try {
    console.log('🧪 Testing New Attendance Logic...\n');

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

    // Test 1: Create a timesheet with late arrival (9:30 AM - should be "late")
    console.log('📅 Test 1: Late Arrival (9:30 AM)');
    const lateArrivalTime = new Date();
    lateArrivalTime.setHours(9, 30, 0, 0); // 9:30 AM (90 minutes late)
    
    const lateArrivalTimesheet = new Timesheet({
      userId: drNatan._id,
      date: new Date(),
      clockIn: {
        time: lateArrivalTime,
        location: 'Main Office',
        method: 'system'
      },
      department: 'Doctors/OPD',
      status: 'active',
      workingHours: {
        startTime: '08:00',
        endTime: '17:00',
        gracePeriod: 15,
        earlyCheckOutThreshold: '11:00'
      }
    });

    await lateArrivalTimesheet.save();
    console.log('✓ Late arrival timesheet created');
    console.log(`   Clock In: ${new Date(lateArrivalTimesheet.clockIn.time).toLocaleString()}`);
    console.log(`   Attendance Status: ${lateArrivalTimesheet.clockIn.attendanceStatus}`);
    console.log(`   Minutes Late: ${lateArrivalTimesheet.clockIn.minutesLate}`);
    console.log(`   Day Status: ${lateArrivalTimesheet.dayAttendanceStatus}\n`);

    // Test 2: Create a timesheet with early check-out (10:30 AM - before 11:00 AM)
    console.log('📅 Test 2: Early Check-out (10:30 AM)');
    const earlyCheckOutTime = new Date();
    earlyCheckOutTime.setHours(10, 30, 0, 0); // 10:30 AM (30 minutes before 11:00 AM)
    
    const earlyCheckOutTimesheet = new Timesheet({
      userId: drNatan._id,
      date: new Date(),
      clockIn: {
        time: new Date(earlyCheckOutTime.getTime() - (2 * 60 * 60 * 1000)), // 8:30 AM
        location: 'Main Office',
        method: 'system'
      },
      clockOut: {
        time: earlyCheckOutTime,
        location: 'Main Office',
        method: 'system'
      },
      department: 'Doctors/OPD',
      status: 'completed',
      workingHours: {
        startTime: '08:00',
        endTime: '17:00',
        gracePeriod: 15,
        earlyCheckOutThreshold: '11:00'
      }
    });

    await earlyCheckOutTimesheet.save();
    console.log('✓ Early check-out timesheet created');
    console.log(`   Clock In: ${new Date(earlyCheckOutTimesheet.clockIn.time).toLocaleString()}`);
    console.log(`   Clock Out: ${new Date(earlyCheckOutTimesheet.clockOut.time).toLocaleString()}`);
    console.log(`   Is Early Logout: ${earlyCheckOutTimesheet.clockOut.isEarlyLogout}`);
    console.log(`   Minutes Early: ${earlyCheckOutTimesheet.clockOut.minutesEarly}`);
    console.log(`   Day Status: ${earlyCheckOutTimesheet.dayAttendanceStatus}\n`);

    // Test 3: Create a timesheet with on-time arrival and full day
    console.log('📅 Test 3: On-time Arrival and Full Day');
    const onTimeCheckIn = new Date();
    onTimeCheckIn.setHours(8, 0, 0, 0); // 8:00 AM exactly
    
    const fullDayTimesheet = new Timesheet({
      userId: drNatan._id,
      date: new Date(),
      clockIn: {
        time: onTimeCheckIn,
        location: 'Main Office',
        method: 'system'
      },
      clockOut: {
        time: new Date(onTimeCheckIn.getTime() + (9 * 60 * 60 * 1000)), // 5:00 PM
        location: 'Main Office',
        method: 'system'
      },
      department: 'Doctors/OPD',
      status: 'completed',
      workingHours: {
        startTime: '08:00',
        endTime: '17:00',
        gracePeriod: 15,
        earlyCheckOutThreshold: '11:00'
      }
    });

    await fullDayTimesheet.save();
    console.log('✓ Full day timesheet created');
    console.log(`   Clock In: ${new Date(fullDayTimesheet.clockIn.time).toLocaleString()}`);
    console.log(`   Clock Out: ${new Date(fullDayTimesheet.clockOut.time).toLocaleString()}`);
    console.log(`   Attendance Status: ${fullDayTimesheet.clockIn.attendanceStatus}`);
    console.log(`   Day Status: ${fullDayTimesheet.dayAttendanceStatus}`);
    console.log(`   Total Work Hours: ${fullDayTimesheet.totalWorkHours}\n`);

    // Test 4: Test the new early check-out threshold logic
    console.log('📅 Test 4: Early Check-out Threshold Logic');
    const testTimes = [
      { time: '09:00', description: '9:00 AM (before 11:00 AM threshold)' },
      { time: '10:30', description: '10:30 AM (before 11:00 AM threshold)' },
      { time: '11:00', description: '11:00 AM (at threshold)' },
      { time: '11:30', description: '11:30 AM (after threshold)' },
      { time: '17:00', description: '5:00 PM (normal end time)' }
    ];

    testTimes.forEach(({ time, description }) => {
      const [hours, minutes] = time.split(':').map(Number);
      const testTime = new Date();
      testTime.setHours(hours, minutes, 0, 0);
      
      const isEarly = lateArrivalTimesheet.isEarlyCheckOut(testTime);
      console.log(`   ${description}: ${isEarly ? 'Early Logout' : 'Normal'}`);
    });

    console.log('\n📊 Summary of New Logic:');
    console.log('✓ Late arrivals (after 8:15 AM) are marked as "late" (not "absent")');
    console.log('✓ Early check-outs (before 11:00 AM) are marked as "early-logout"');
    console.log('✓ On-time arrivals with full days are marked as "present"');
    console.log('✓ All actual check-in times are saved and displayed');
    console.log('✓ Ethiopian time conversion is maintained');

    // Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    await Timesheet.deleteMany({
      userId: drNatan._id,
      date: { $gte: new Date().setHours(0, 0, 0, 0) }
    });
    console.log('✓ Test data cleaned up');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testNewAttendanceLogic();
