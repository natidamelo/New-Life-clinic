const mongoose = require('mongoose');
const QRCodeService = require('./services/qrCodeService');
const Timesheet = require('./models/Timesheet');
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/clinic-cms', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function testQROvertime() {
  try {
    console.log('🔧 Testing QR Code Overtime Functionality...\n');

    // Find a test user
    const testUser = await User.findOne({ role: 'doctor' });
    if (!testUser) {
      console.log('❌ No test user found. Please create a doctor user first.');
      return;
    }

    console.log(`👤 Testing with user: ${testUser.firstName} ${testUser.lastName} (${testUser.role})`);

    // Test 1: Check current status
    console.log('\n📊 Test 1: Check Current Status');
    const currentStatus = await QRCodeService.getCurrentAttendanceStatus(testUser._id);
    console.log('Current Status:', currentStatus);

    // Test 2: Process check-in (if not already checked in)
    if (currentStatus.canCheckIn) {
      console.log('\n📊 Test 2: Process Check-in');
      const checkInResult = await QRCodeService.processCheckIn(testUser._id, {
        location: 'Main Office',
        userAgent: 'Test Script',
        ipAddress: '127.0.0.1'
      });
      console.log('Check-in Result:', checkInResult);
    } else {
      console.log('\n📊 Test 2: Already checked in, skipping check-in test');
    }

    // Test 3: Process check-out (if currently checked in)
    const updatedStatus = await QRCodeService.getCurrentAttendanceStatus(testUser._id);
    if (updatedStatus.canCheckOut) {
      console.log('\n📊 Test 3: Process Check-out');
      const checkOutResult = await QRCodeService.processCheckOut(testUser._id, {
        location: 'Main Office',
        userAgent: 'Test Script',
        ipAddress: '127.0.0.1'
      });
      console.log('Check-out Result:', checkOutResult);
    } else {
      console.log('\n📊 Test 3: Not checked in, skipping check-out test');
    }

    // Test 4: Check overtime after check-out
    console.log('\n📊 Test 4: Check Overtime Status After Check-out');
    const finalStatus = await QRCodeService.getCurrentAttendanceStatus(testUser._id);
    console.log('Final Status:', finalStatus);

    // Test 5: Check timesheet data
    console.log('\n📊 Test 5: Check Timesheet Data');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const timesheet = await Timesheet.findOne({
      userId: testUser._id,
      date: { $gte: today, $lt: tomorrow }
    });

    if (timesheet) {
      console.log('Timesheet found:');
      console.log(`  Clock In: ${timesheet.clockIn?.time || 'N/A'}`);
      console.log(`  Clock Out: ${timesheet.clockOut?.time || 'N/A'}`);
      console.log(`  Total Work Hours: ${timesheet.totalWorkHours}h`);
      console.log(`  Overtime Hours: ${timesheet.overtimeHours}h`);
      console.log(`  Overtime Minutes: ${timesheet.overtimeMinutes}m`);
      console.log(`  Day Status: ${timesheet.dayAttendanceStatus}`);
      console.log(`  Early Clock Out: ${timesheet.clockOut?.isEarlyClockOut || false}`);
    } else {
      console.log('No timesheet found for today');
    }

    console.log('\n✅ QR Code overtime functionality test completed!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

testQROvertime();
