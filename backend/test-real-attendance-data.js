const axios = require('axios');

const API_BASE_URL = 'http://localhost:5002/api';

async function testRealAttendanceData() {
  try {
    console.log('🔍 Testing Real Attendance Data...\n');

    // Wait a moment for server to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 1: Get attendance data for today
    console.log('📊 Testing GET /api/staff/attendance-data');
    try {
      const response = await axios.get(`${API_BASE_URL}/staff/attendance-data?date=2025-08-19&department=all`);
      console.log('✅ Success! Attendance data retrieved:');
      console.log(`   Total Staff: ${response.data.summary.totalStaff}`);
      console.log(`   Present: ${response.data.summary.present}`);
      console.log(`   Late: ${response.data.summary.late}`);
      console.log(`   Absent: ${response.data.summary.absent}`);
      console.log(`   Early Logout: ${response.data.summary.earlyLogout}`);
      console.log(`   Partial: ${response.data.summary.partial}`);
      console.log(`   Average Work Hours: ${response.data.summary.averageWorkHours.toFixed(2)}h\n`);

      console.log('📋 Detailed Attendance Data:');
      response.data.attendanceData.forEach((staff, index) => {
        console.log(`   ${index + 1}. ${staff.userName} (${staff.userRole})`);
        console.log(`      Department: ${staff.department}`);
        console.log(`      Clock In: ${staff.clockInTime ? new Date(staff.clockInTime).toLocaleString() : 'N/A'}`);
        console.log(`      Clock Out: ${staff.clockOutTime ? new Date(staff.clockOutTime).toLocaleString() : 'N/A'}`);
        console.log(`      Status: ${staff.dayAttendanceStatus}`);
        if (staff.minutesLate > 0) {
          console.log(`      ⚠️  Late by: ${staff.minutesLate} minutes`);
        }
        if (staff.minutesEarly > 0) {
          console.log(`      ⚠️  Early by: ${staff.minutesEarly} minutes`);
        }
        console.log(`      Work Hours: ${staff.totalWorkHours.toFixed(2)}h`);
        console.log('');
      });

    } catch (error) {
      console.log('❌ Error fetching attendance data:', error.response?.data || error.message);
    }

    // Test 2: Get staff overview
    console.log('📊 Testing GET /api/staff/overview');
    try {
      const response = await axios.get(`${API_BASE_URL}/staff/overview`);
      console.log('✅ Success! Staff overview retrieved:');
      console.log(`   Total Staff: ${response.data.totalStaff}`);
      console.log(`   Online Staff: ${response.data.onlineStaff}`);
      console.log('   Role Statistics:');
      Object.entries(response.data.roleStats).forEach(([role, stats]) => {
        console.log(`      ${role}: ${stats.total} total, ${stats.online} online, ${stats.offline} offline`);
      });
    } catch (error) {
      console.log('❌ Error fetching staff overview:', error.response?.data || error.message);
    }

    // Test 3: Get my status (for current user)
    console.log('\n📊 Testing GET /api/staff/my-status');
    try {
      const response = await axios.get(`${API_BASE_URL}/staff/my-status`);
      console.log('✅ Success! My status retrieved:');
      console.log(`   Status: ${response.data.status}`);
      console.log(`   Clock In: ${response.data.clockInTime || 'N/A'}`);
      console.log(`   Clock Out: ${response.data.clockOutTime || 'N/A'}`);
      console.log(`   Attendance Status: ${response.data.attendanceStatus}`);
      console.log(`   Day Status: ${response.data.dayAttendanceStatus}`);
      console.log(`   Minutes Late: ${response.data.minutesLate || 0}`);
      console.log(`   Minutes Early: ${response.data.minutesEarly || 0}`);
    } catch (error) {
      console.log('❌ Error fetching my status:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testRealAttendanceData();
