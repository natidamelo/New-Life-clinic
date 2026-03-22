const mongoose = require('mongoose');
require('dotenv').config();

async function testAttendanceStatus() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    const User = require('./models/User');
    const user = await User.findOne({ role: 'doctor' });
    
    if (!user) {
      console.log('❌ No doctor user found');
      return;
    }
    
    console.log(`👤 Testing with user: ${user.firstName} ${user.lastName} (${user._id})`);
    
    // Test the QRCodeService method directly
    const QRCodeService = require('./services/qrCodeService');
    const currentStatus = await QRCodeService.getCurrentAttendanceStatus(user._id);
    
    console.log('📊 Current Attendance Status:');
    console.log(JSON.stringify(currentStatus, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testAttendanceStatus();
