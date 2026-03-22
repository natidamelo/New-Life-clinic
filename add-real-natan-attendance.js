const mongoose = require('mongoose');
const StaffAttendance = require('./backend/models/StaffAttendance');
const User = require('./backend/models/User');

// Connect to MongoDB with timeout settings
mongoose.connect('mongodb://localhost:27017/clinic-cms', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000, // 5 second timeout
});

const addRealNatanAttendance = async () => {
  try {
    console.log('🔄 Adding real attendance record for Natan...');
    
    // Find Natan
    const natan = await User.findOne({ 
      $or: [
        { firstName: 'Natan', lastName: 'Kinfe' },
        { firstName: 'DR Natan' },
        { firstName: 'Natan' }
      ]
    });
    
    if (!natan) {
      console.log('❌ Natan not found');
      return;
    }
    
    console.log('✅ Found Natan:', natan.firstName, natan.lastName);
    
    // Create today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Check if Natan already has attendance for today
    const existingAttendance = await StaffAttendance.findOne({
      userId: natan._id,
      checkInTime: { $gte: today, $lt: tomorrow }
    });
    
    if (existingAttendance) {
      console.log('📋 Natan already has attendance record for today');
      console.log('   Check-in:', existingAttendance.checkInTime);
      console.log('   Status:', existingAttendance.status);
      return;
    }
    
    // Create real attendance record
    const checkInTime = new Date();
    const realAttendance = new StaffAttendance({
      userId: natan._id,
      checkInTime,
      checkInLocation: 'Main Entrance',
      status: 'checked-in',
      attendanceStatus: 'present-on-time',
      isWithinWorkingHours: true,
      ethiopianCheckInTime: checkInTime,
      notes: 'Real QR code check-in',
      deviceInfo: {
        userAgent: 'Real Mobile Device',
        ipAddress: '192.168.1.100'
      }
    });
    
    await realAttendance.save();
    console.log('✅ Created real attendance record for Natan');
    console.log('   Check-in time:', realAttendance.checkInTime);
    console.log('   Status:', realAttendance.status);
    
    // Verify the record
    const verifyRecord = await StaffAttendance.findById(realAttendance._id);
    console.log('🔍 Verification:', verifyRecord ? 'SUCCESS' : 'FAILED');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

// Run the script
addRealNatanAttendance();

