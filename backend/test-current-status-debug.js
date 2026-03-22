const mongoose = require('mongoose');
require('dotenv').config();

async function debugCurrentStatus() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    const User = require('./models/User');
    const Timesheet = require('./models/Timesheet');
    const user = await User.findOne({ role: 'doctor' });
    
    if (!user) {
      console.log('❌ No doctor user found');
      return;
    }
    
    console.log(`👤 Testing with user: ${user.firstName} ${user.lastName} (${user._id})`);
    
    // Check what timesheets exist for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    console.log('📅 Date range:', { today: today.toISOString(), tomorrow: tomorrow.toISOString() });
    
    const timesheets = await Timesheet.find({
      userId: user._id,
      date: { $gte: today, $lt: tomorrow }
    });
    
    console.log('📊 Timesheets found for today:', timesheets.length);
    timesheets.forEach((ts, index) => {
      console.log(`  Timesheet ${index + 1}:`, {
        id: ts._id,
        date: ts.date,
        clockIn: ts.clockIn ? {
          time: ts.clockIn.time,
          location: ts.clockIn.location,
          status: ts.clockIn.attendanceStatus
        } : null,
        clockOut: ts.clockOut ? {
          time: ts.clockOut.time,
          location: ts.clockOut.location
        } : null,
        status: ts.status,
        isOvertime: ts.isOvertime,
        dayAttendanceStatus: ts.dayAttendanceStatus
      });
    });
    
    // Test the QRCodeService method
    const QRCodeService = require('./services/qrCodeService');
    console.log('\n🔍 Testing getCurrentAttendanceStatus method...');
    const currentStatus = await QRCodeService.getCurrentAttendanceStatus(user._id);
    
    console.log('📊 Current Status Result:', JSON.stringify(currentStatus, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

debugCurrentStatus();
