const mongoose = require('mongoose');
const Timesheet = require('./models/Timesheet');
const User = require('./models/User');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function showRealAttendanceData() {
  try {
    console.log('🔍 Showing Real Attendance Data...\n');

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log(`📅 Date: ${today.toLocaleDateString()}\n`);

    // Get all active staff members
    const allStaff = await User.find({ 
      role: { $in: ['doctor', 'nurse', 'lab', 'reception', 'admin', 'imaging'] },
      isActive: true 
    })
      .select('firstName lastName role email')
      .lean();

    console.log(`👥 Total Active Staff: ${allStaff.length}\n`);

    // Get today's timesheets
    const todayTimesheets = await Timesheet.find({
      date: { $gte: today, $lt: tomorrow }
    })
      .populate('userId', 'firstName lastName role email')
      .lean();

    console.log(`📋 Today's Timesheet Records: ${todayTimesheets.length}\n`);

    // Create attendance data for all staff
    const attendanceData = allStaff.map(staff => {
      const timesheet = todayTimesheets.find(t => 
        t.userId && t.userId._id.toString() === staff._id.toString()
      );
      
      if (!timesheet) {
        return {
          userId: staff._id,
          userName: `${staff.firstName} ${staff.lastName}`,
          userRole: staff.role,
          email: staff.email,
          clockInTime: null,
          clockOutTime: null,
          attendanceStatus: 'absent',
          dayAttendanceStatus: 'absent',
          minutesLate: 0,
          minutesEarly: 0,
          totalWorkHours: 0,
          ethiopianCheckInTime: null,
          ethiopianCheckOutTime: null
        };
      }

      return {
        userId: staff._id,
        userName: `${staff.firstName} ${staff.lastName}`,
        userRole: staff.role,
        email: staff.email,
        clockInTime: timesheet.clockIn?.time || null,
        clockOutTime: timesheet.clockOut?.time || null,
        attendanceStatus: timesheet.clockIn?.attendanceStatus || 'absent',
        dayAttendanceStatus: timesheet.dayAttendanceStatus || 'absent',
        minutesLate: timesheet.clockIn?.minutesLate || 0,
        minutesEarly: timesheet.clockOut?.minutesEarly || 0,
        totalWorkHours: timesheet.totalWorkHours || 0,
        ethiopianCheckInTime: timesheet.clockIn?.ethiopianTime || null,
        ethiopianCheckOutTime: timesheet.clockOut?.ethiopianTime || null
      };
    });

    // Calculate summary statistics
    const summary = {
      totalStaff: attendanceData.length,
      present: attendanceData.filter(a => a.dayAttendanceStatus === 'present').length,
      late: attendanceData.filter(a => a.dayAttendanceStatus === 'late').length,
      absent: attendanceData.filter(a => a.dayAttendanceStatus === 'absent').length,
      earlyLogout: attendanceData.filter(a => a.dayAttendanceStatus === 'early-logout').length,
      partial: attendanceData.filter(a => a.dayAttendanceStatus === 'partial').length,
      averageWorkHours: attendanceData.reduce((sum, a) => sum + a.totalWorkHours, 0) / attendanceData.length || 0
    };

    // Display summary
    console.log('📊 ATTENDANCE SUMMARY:');
    console.log(`   Total Staff: ${summary.totalStaff}`);
    console.log(`   Present: ${summary.present}`);
    console.log(`   Late: ${summary.late}`);
    console.log(`   Absent: ${summary.absent}`);
    console.log(`   Early Logout: ${summary.earlyLogout}`);
    console.log(`   Partial: ${summary.partial}`);
    console.log(`   Average Work Hours: ${summary.averageWorkHours.toFixed(2)}h\n`);

    // Display detailed attendance data
    console.log('📋 DETAILED ATTENDANCE DATA:');
    console.log('=' .repeat(80));
    
    attendanceData.forEach((staff, index) => {
      console.log(`\n${index + 1}. ${staff.userName} (${staff.userRole})`);
      console.log(`   Email: ${staff.email}`);
      console.log(`   Clock In: ${staff.clockInTime ? new Date(staff.clockInTime).toLocaleString() : 'N/A'}`);
      console.log(`   Clock Out: ${staff.clockOutTime ? new Date(staff.clockOutTime).toLocaleString() : 'N/A'}`);
      console.log(`   Status: ${staff.dayAttendanceStatus.toUpperCase()}`);
      
      if (staff.minutesLate > 0) {
        console.log(`   ⚠️  Late by: ${staff.minutesLate} minutes`);
      }
      if (staff.minutesEarly > 0) {
        console.log(`   ⚠️  Early by: ${staff.minutesEarly} minutes`);
      }
      
      console.log(`   Work Hours: ${staff.totalWorkHours.toFixed(2)}h`);
      
      // Ethiopian time if available
      if (staff.ethiopianCheckInTime) {
        console.log(`   Ethiopian Check In: ${new Date(staff.ethiopianCheckInTime).toLocaleString()}`);
      }
      if (staff.ethiopianCheckOutTime) {
        console.log(`   Ethiopian Check Out: ${new Date(staff.ethiopianCheckOutTime).toLocaleString()}`);
      }
    });

    // Show working hours configuration
    console.log('\n⏰ WORKING HOURS CONFIGURATION:');
    console.log('   Start Time: 8:00 AM');
    console.log('   End Time: 5:00 PM');
    console.log('   Grace Period: 15 minutes');
    console.log('   Early Check-out Threshold: 11:00 AM');

    // Show recent timesheet records (last 5)
    console.log('\n📋 RECENT TIMESHEET RECORDS (Last 5):');
    const recentTimesheets = await Timesheet.find()
      .populate('userId', 'firstName lastName role')
      .sort({ date: -1 })
      .limit(5)
      .lean();

    recentTimesheets.forEach((ts, index) => {
      if (ts.userId) {
        console.log(`\n${index + 1}. ${ts.userId.firstName} ${ts.userId.lastName} (${ts.userId.role})`);
        console.log(`   Date: ${new Date(ts.date).toLocaleDateString()}`);
        console.log(`   Clock In: ${ts.clockIn?.time ? new Date(ts.clockIn.time).toLocaleString() : 'N/A'}`);
        console.log(`   Clock Out: ${ts.clockOut?.time ? new Date(ts.clockOut.time).toLocaleString() : 'N/A'}`);
        console.log(`   Status: ${ts.dayAttendanceStatus || 'N/A'}`);
        console.log(`   Work Hours: ${ts.totalWorkHours || 0}h`);
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

showRealAttendanceData();
