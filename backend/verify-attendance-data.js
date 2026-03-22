const mongoose = require('mongoose');
const StaffAttendance = require('./models/StaffAttendance');
const User = require('./models/User');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const verifyAttendanceData = async () => {
  try {
    console.log('🔍 Verifying Attendance Data in clinic-cms database...\n');
    
    // Check staff members
    const staffMembers = await User.find({ 
      role: { $nin: ['admin'] },
      isActive: true 
    });
    console.log(`📋 Staff Members Found: ${staffMembers.length}`);
    staffMembers.forEach(staff => {
      console.log(`   - ${staff.firstName} ${staff.lastName} (${staff.role}) - ${staff.department || 'No department'}`);
    });
    
    console.log('\n📊 Attendance Records:');
    const totalRecords = await StaffAttendance.countDocuments();
    const todayRecords = await StaffAttendance.countDocuments({
      checkInTime: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lt: new Date(new Date().setHours(23, 59, 59, 999))
      }
    });
    
    console.log(`   Total records: ${totalRecords}`);
    console.log(`   Today's records: ${todayRecords}`);
    
    // Get today's attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayAttendance = await StaffAttendance.find({
      checkInTime: { $gte: today, $lt: tomorrow }
    }).populate('userId', 'firstName lastName role department');
    
    console.log('\n📝 Today\'s Attendance:');
    todayAttendance.forEach((record, index) => {
      console.log(`   ${index + 1}. ${record.userId.firstName} ${record.userId.lastName} (${record.userId.role})`);
      console.log(`      Check-in: ${record.checkInTime.toLocaleTimeString()}`);
      console.log(`      Check-out: ${record.checkOutTime ? record.checkOutTime.toLocaleTimeString() : 'Still working'}`);
      console.log(`      Hours: ${record.totalHours} | Status: ${record.status}`);
    });
    
    // Check by department
    console.log('\n🏥 Attendance by Department:');
    const deptStats = {};
    todayAttendance.forEach(record => {
      const dept = record.userId.department || 'General';
      if (!deptStats[dept]) {
        deptStats[dept] = { total: 0, present: 0, absent: 0 };
      }
      deptStats[dept].total++;
      deptStats[dept].present++;
    });
    
    // Add absent staff
    staffMembers.forEach(staff => {
      const dept = staff.department || 'General';
      if (!deptStats[dept]) {
        deptStats[dept] = { total: 0, present: 0, absent: 0 };
      }
      deptStats[dept].total++;
      
      const hasAttendance = todayAttendance.some(record => 
        record.userId._id.toString() === staff._id.toString()
      );
      
      if (!hasAttendance) {
        deptStats[dept].absent++;
      }
    });
    
    Object.keys(deptStats).forEach(dept => {
      console.log(`   ${dept}: ${deptStats[dept].total} total (${deptStats[dept].present} present, ${deptStats[dept].absent} absent)`);
    });
    
    // Test API-like queries
    console.log('\n🧪 Testing API-like Queries:');
    
    // Test staff overview query
    const allStaff = await User.find({ 
      role: { $nin: ['admin'] },
      isActive: true 
    });
    
    const presentToday = todayAttendance.length;
    const absentToday = allStaff.length - presentToday;
    
    console.log(`   Staff Overview:`);
    console.log(`     Total Staff: ${allStaff.length}`);
    console.log(`     Present Today: ${presentToday}`);
    console.log(`     Absent Today: ${absentToday}`);
    
    // Test attendance data query
    const attendanceData = allStaff.map(staff => {
      const attendance = todayAttendance.find(record => 
        record.userId._id.toString() === staff._id.toString()
      );
      
      if (attendance) {
        return {
          userId: staff._id.toString(),
          userName: `${staff.firstName} ${staff.lastName}`,
          department: staff.department || 'General',
          clockInTime: attendance.checkInTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          }),
          clockOutTime: attendance.checkOutTime ? 
            attendance.checkOutTime.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false
            }) : null,
          dayAttendanceStatus: attendance.checkOutTime ? 'present' : 'present',
          totalHours: attendance.totalHours || 0,
          isOvertime: (attendance.totalHours || 0) > 8
        };
      } else {
        return {
          userId: staff._id.toString(),
          userName: `${staff.firstName} ${staff.lastName}`,
          department: staff.department || 'General',
          clockInTime: null,
          clockOutTime: null,
          dayAttendanceStatus: 'absent',
          totalHours: 0,
          isOvertime: false
        };
      }
    });
    
    console.log(`   Attendance Data:`);
    console.log(`     Total records: ${attendanceData.length}`);
    console.log(`     Present: ${attendanceData.filter(staff => staff.dayAttendanceStatus === 'present').length}`);
    console.log(`     Absent: ${attendanceData.filter(staff => staff.dayAttendanceStatus === 'absent').length}`);
    console.log(`     Overtime: ${attendanceData.filter(staff => staff.isOvertime).length}`);
    
    console.log('\n✅ Attendance data verification completed successfully!');
    console.log('🎉 Your clinic-cms database now contains real attendance data.');
    console.log('\n💡 Next steps:');
    console.log('   1. Start your backend server: npm start');
    console.log('   2. Access the frontend: http://localhost:5175/app/staff-attendance-control');
    console.log('   3. Navigate to Staff Attendance Control to see the real data');
    
  } catch (error) {
    console.error('❌ Error verifying attendance data:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
};

// Run the verification
verifyAttendanceData();
