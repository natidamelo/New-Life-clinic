const mongoose = require('mongoose');
const StaffAttendance = require('../models/StaffAttendance');
const User = require('../models/User');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const populateAttendanceData = async () => {
  try {
    console.log('🔍 Connecting to database...');
    
    // Get existing staff members (excluding admins)
    const staffMembers = await User.find({ 
      role: { $nin: ['admin'] },
      isActive: true 
    });
    
    if (staffMembers.length === 0) {
      console.log('❌ No staff members found. Please create some staff members first.');
      return;
    }
    
    console.log(`📋 Found ${staffMembers.length} staff members`);
    
    // Clear existing attendance data
    await StaffAttendance.deleteMany({});
    console.log('🧹 Cleared existing attendance data');
    
    // Generate attendance data for the last 7 days
    const attendanceRecords = [];
    const today = new Date();
    
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const currentDate = new Date(today);
      currentDate.setDate(currentDate.getDate() - dayOffset);
      currentDate.setHours(0, 0, 0, 0);
      
      console.log(`📅 Generating attendance for ${currentDate.toDateString()}`);
      
      for (let i = 0; i < staffMembers.length; i++) {
        const staff = staffMembers[i];
        
        // 80% chance of being present each day
        const isPresent = Math.random() > 0.2;
        
        if (isPresent) {
          // Generate check-in time between 7:00 AM and 9:00 AM
          const checkInHour = 7 + Math.floor(Math.random() * 2); // 7-8 AM
          const checkInMinute = Math.floor(Math.random() * 60);
          const checkInTime = new Date(currentDate);
          checkInTime.setHours(checkInHour, checkInMinute, 0, 0);
          
          // 70% chance of checking out (some might still be working)
          const willCheckOut = Math.random() > 0.3;
          let checkOutTime = null;
          let totalHours = 0;
          
          if (willCheckOut) {
            // Generate check-out time between 4:00 PM and 8:00 PM
            const checkOutHour = 16 + Math.floor(Math.random() * 4); // 4-7 PM
            const checkOutMinute = Math.floor(Math.random() * 60);
            checkOutTime = new Date(currentDate);
            checkOutTime.setHours(checkOutHour, checkOutMinute, 0, 0);
            
            // Calculate total hours
            totalHours = (checkOutTime - checkInTime) / (1000 * 60 * 60);
          }
          
          // Determine attendance status
          let attendanceStatus = 'present-on-time';
          if (checkInHour > 8) {
            attendanceStatus = 'late-present';
          }
          
          const attendanceRecord = new StaffAttendance({
            userId: staff._id,
            checkInTime,
            checkOutTime,
            checkInLocation: 'Main Entrance',
            checkOutLocation: willCheckOut ? 'Main Entrance' : undefined,
            totalHours: Math.round(totalHours * 100) / 100,
            status: willCheckOut ? 'checked-out' : 'checked-in',
            attendanceStatus,
            isWithinWorkingHours: true,
            ethiopianCheckInTime: checkInTime,
            ethiopianCheckOutTime: checkOutTime,
            notes: `Regular attendance for ${staff.firstName} ${staff.lastName}`,
            deviceInfo: {
              userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              ipAddress: '192.168.1.' + (100 + Math.floor(Math.random() * 155))
            }
          });
          
          attendanceRecords.push(attendanceRecord);
        }
      }
    }
    
    // Save all attendance records
    await StaffAttendance.insertMany(attendanceRecords);
    console.log(`✅ Created ${attendanceRecords.length} attendance records`);
    
    // Display summary
    const totalRecords = await StaffAttendance.countDocuments();
    const todayRecords = await StaffAttendance.countDocuments({
      checkInTime: {
        $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        $lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
      }
    });
    
    const checkedInToday = await StaffAttendance.countDocuments({
      checkInTime: {
        $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        $lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
      },
      status: 'checked-in'
    });
    
    const checkedOutToday = await StaffAttendance.countDocuments({
      checkInTime: {
        $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        $lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
      },
      status: 'checked-out'
    });
    
    console.log('\n📊 Attendance Data Summary:');
    console.log(`Total attendance records: ${totalRecords}`);
    console.log(`Today's records: ${todayRecords}`);
    console.log(`Currently checked in: ${checkedInToday}`);
    console.log(`Checked out today: ${checkedOutToday}`);
    console.log(`Staff members: ${staffMembers.length}`);
    
    // Show some sample records
    const sampleRecords = await StaffAttendance.find()
      .populate('userId', 'firstName lastName role department')
      .sort({ checkInTime: -1 })
      .limit(5);
    
    console.log('\n📝 Sample Attendance Records:');
    sampleRecords.forEach((record, index) => {
      console.log(`   ${index + 1}. ${record.userId.firstName} ${record.userId.lastName} (${record.userId.role})`);
      console.log(`      Check-in: ${record.checkInTime.toLocaleString()}`);
      console.log(`      Check-out: ${record.checkOutTime ? record.checkOutTime.toLocaleString() : 'Still working'}`);
      console.log(`      Hours: ${record.totalHours} | Status: ${record.status}`);
    });
    
    console.log('\n🎉 Attendance data population completed successfully!');
    console.log('You can now test the staff attendance control system with real data.');
    
  } catch (error) {
    console.error('❌ Error populating attendance data:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

// Run the script
populateAttendanceData();
