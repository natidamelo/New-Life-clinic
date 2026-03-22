const mongoose = require('mongoose');
const Timesheet = require('./models/Timesheet');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/clinic-cms', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function testExactTimeCalculation() {
  try {
    console.log('🔧 Testing Exact Time Calculation...\n');

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find all timesheets for today
    const timesheets = await Timesheet.find({
      date: { $gte: today, $lt: tomorrow }
    });

    console.log(`📊 Found ${timesheets.length} timesheets to test`);

    for (let i = 0; i < timesheets.length; i++) {
      const timesheet = timesheets[i];
      console.log(`\n${i + 1}. Testing timesheet for user: ${timesheet.userId}`);
      
      // Show working hours configuration
      console.log(`   📋 Working Hours Configuration:`);
      console.log(`      Start Time: ${timesheet.workingHours.startTime}`);
      console.log(`      End Time: ${timesheet.workingHours.endTime}`);
      console.log(`      Grace Period: ${timesheet.workingHours.gracePeriod} minutes`);
      
      // Show clock-in calculation
      if (timesheet.clockIn?.time) {
        const clockInTime = timesheet.clockIn.time;
        const inHours = clockInTime.getHours();
        const inMinutes = clockInTime.getMinutes();
        const inTotalMinutes = inHours * 60 + inMinutes;
        
        const [startHour, startMin] = timesheet.workingHours.startTime.split(':').map(Number);
        const startMinutes = startHour * 60 + startMin;
        const gracePeriodMinutes = timesheet.workingHours.gracePeriod;
        const lateThreshold = startMinutes + gracePeriodMinutes;
        
        console.log(`   📊 Clock-in Calculation:`);
        console.log(`      Clock In: ${inHours}:${inMinutes.toString().padStart(2, '0')} (${inTotalMinutes} minutes)`);
        console.log(`      Start Time: ${startHour}:${startMin.toString().padStart(2, '0')} (${startMinutes} minutes)`);
        console.log(`      Late Threshold: ${Math.floor(lateThreshold/60)}:${(lateThreshold%60).toString().padStart(2, '0')} (${lateThreshold} minutes)`);
        console.log(`      Is Late: ${inTotalMinutes > lateThreshold ? 'Yes' : 'No'}`);
        console.log(`      Minutes Late: ${timesheet.clockIn.minutesLate || 0}`);
      }
      
      // Show clock-out calculation
      if (timesheet.clockOut?.time) {
        const clockOutTime = timesheet.clockOut.time;
        const outHours = clockOutTime.getHours();
        const outMinutes = clockOutTime.getMinutes();
        const outTotalMinutes = outHours * 60 + outMinutes;
        
        const [endHour, endMin] = timesheet.workingHours.endTime.split(':').map(Number);
        const endMinutes = endHour * 60 + endMin;
        
        console.log(`   📊 Clock-out Calculation:`);
        console.log(`      Clock Out: ${outHours}:${outMinutes.toString().padStart(2, '0')} (${outTotalMinutes} minutes)`);
        console.log(`      End Time: ${endHour}:${endMin.toString().padStart(2, '0')} (${endMinutes} minutes)`);
        console.log(`      Is Early Clock-out: ${outTotalMinutes < endMinutes ? 'Yes' : 'No'}`);
        console.log(`      Minutes Early: ${timesheet.clockOut.minutesEarly || 0}`);
        
        if (outTotalMinutes < endMinutes) {
          const earlyHours = Math.floor((endMinutes - outTotalMinutes) / 60);
          const earlyMins = (endMinutes - outTotalMinutes) % 60;
          console.log(`      Early by: ${earlyHours}h ${earlyMins}m`);
        }
        
        // Calculate work hours
        if (timesheet.clockIn?.time) {
          const workTimeMs = timesheet.clockOut.time - timesheet.clockIn.time;
          const workHours = Math.floor(workTimeMs / (1000 * 60 * 60));
          const workMinutes = Math.floor((workTimeMs % (1000 * 60 * 60)) / (1000 * 60));
          console.log(`      Work Duration: ${workHours}h ${workMinutes}m`);
        }
      }
      
      console.log(`   📊 Final Status: ${timesheet.dayAttendanceStatus}`);
    }

    console.log('\n✅ Exact time calculation test completed!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

testExactTimeCalculation();
