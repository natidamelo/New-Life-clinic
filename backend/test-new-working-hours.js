const mongoose = require('mongoose');
const User = require('./models/User');
const Timesheet = require('./models/Timesheet');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/clinic-cms', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function testNewWorkingHours() {
  try {
    console.log('🧪 Testing New Working Hours Configuration...\n');

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

    console.log('📋 New Working Hours Configuration:');
    console.log(`Start Time: ${timesheet.workingHours.startTime} (Ethiopian Time)`);
    console.log(`End Time: ${timesheet.workingHours.endTime} (Ethiopian Time)`);
    console.log(`Grace Period: ${timesheet.workingHours.gracePeriod} minutes`);
    console.log(`Early Check-out Threshold: ${timesheet.workingHours.earlyCheckOutThreshold} (Ethiopian Time)`);

    // Test different clock-in times
    console.log('\n🕐 Testing Different Clock-in Times:');
    console.log('=====================================');
    
    const testTimes = [
      { name: '11:30 PM Local (2:30 AM Ethiopian)', localHour: 23, localMinute: 30, localDay: -1 },
      { name: '11:45 PM Local (2:45 AM Ethiopian)', localHour: 23, localMinute: 45, localDay: -1 },
      { name: '12:00 AM Local (3:00 AM Ethiopian)', localHour: 0, localMinute: 0, localDay: 0 },
      { name: '5:20 AM Local (8:20 AM Ethiopian)', localHour: 5, localMinute: 20, localDay: 0 }
    ];

    testTimes.forEach(test => {
      const localTime = new Date();
      localTime.setDate(localTime.getDate() + test.localDay);
      localTime.setHours(test.localHour, test.localMinute, 0, 0);
      
      const ethiopianTime = new Date(localTime.getTime() + (3 * 60 * 60 * 1000));
      
      console.log(`\n${test.name}:`);
      console.log(`   Local: ${localTime.toLocaleString()}`);
      console.log(`   Ethiopian: ${ethiopianTime.toLocaleString()}`);
      console.log(`   Ethiopian Hours: ${ethiopianTime.getHours()}:${ethiopianTime.getMinutes().toString().padStart(2, '0')}`);
      
      // Check if this would be on time with new configuration
      const totalMinutes = ethiopianTime.getHours() * 60 + ethiopianTime.getMinutes();
      const startTime = 2 * 60 + 30; // 2:30 AM = 150 minutes
      const graceEnd = startTime + 15; // 2:45 AM = 165 minutes
      
      if (totalMinutes <= graceEnd) {
        console.log(`   ✅ ON TIME (${totalMinutes} <= ${graceEnd})`);
      } else {
        const lateMinutes = totalMinutes - graceEnd;
        console.log(`   ❌ LATE by ${lateMinutes} minutes (${totalMinutes} > ${graceEnd})`);
      }
    });

    // Test Doctor Natan's actual clock-in time
    console.log('\n🔍 Doctor Natan\'s Actual Clock-in Analysis:');
    console.log('============================================');
    
    if (timesheet.clockIn?.time) {
      const clockInTime = new Date(timesheet.clockIn.time);
      const ethiopianTime = new Date(clockInTime.getTime() + (3 * 60 * 60 * 1000));
      
      console.log(`Clock In Local: ${clockInTime.toLocaleString()}`);
      console.log(`Clock In Ethiopian: ${ethiopianTime.toLocaleString()}`);
      
      const totalMinutes = ethiopianTime.getHours() * 60 + ethiopianTime.getMinutes();
      const startTime = 2 * 60 + 30; // 2:30 AM = 150 minutes
      const graceEnd = startTime + 15; // 2:45 AM = 165 minutes
      
      if (totalMinutes <= graceEnd) {
        console.log(`✅ ON TIME (${totalMinutes} <= ${graceEnd})`);
      } else {
        const lateMinutes = totalMinutes - graceEnd;
        console.log(`❌ LATE by ${lateMinutes} minutes (${totalMinutes} > ${graceEnd})`);
      }
    }

    // Update Doctor Natan's timesheet with new configuration
    console.log('\n🔄 Updating Doctor Natan\'s Timesheet...');
    
    // Mark as modified to trigger recalculation
    timesheet.markModified('clockIn');
    timesheet.markModified('clockOut');
    
    // Save to trigger recalculation
    await timesheet.save();
    
    console.log('✅ Timesheet Updated!');
    console.log(`New Clock In Status: ${timesheet.clockIn.attendanceStatus}`);
    console.log(`New Minutes Late: ${timesheet.clockIn.minutesLate}`);
    console.log(`New Day Status: ${timesheet.dayAttendanceStatus}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

testNewWorkingHours();
