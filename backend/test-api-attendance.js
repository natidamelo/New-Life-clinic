const axios = require('axios');

const API_BASE_URL = 'http://localhost:5002/api';

async function testAttendanceAPI() {
  try {
    console.log('🔍 Testing Attendance API Endpoints...\n');

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
      console.log(`   Average Work Hours: ${response.data.summary.averageWorkHours.toFixed(1)}h`);
      
      console.log('\n📋 Staff Details:');
      response.data.attendanceData.forEach(staff => {
        console.log(`   👤 ${staff.userName} (${staff.userRole}):`);
        console.log(`      Clock In: ${staff.clockInTime ? new Date(staff.clockInTime).toLocaleString() : 'N/A'}`);
        console.log(`      Clock Out: ${staff.clockOutTime ? new Date(staff.clockOutTime).toLocaleString() : 'N/A'}`);
        console.log(`      Status: ${staff.dayAttendanceStatus}`);
        console.log(`      Work Hours: ${staff.totalWorkHours}h`);
        if (staff.minutesLate > 0) {
          console.log(`      ⚠️  Late by: ${staff.minutesLate} minutes`);
        }
        if (staff.minutesEarly > 0) {
          console.log(`      ⚠️  Early by: ${staff.minutesEarly} minutes`);
        }
        console.log('');
      });
    } catch (error) {
      console.log('❌ Error getting attendance data:', error.response?.data || error.message);
    }

    // Test 2: Get specific staff member status
    console.log('👤 Testing GET /api/staff/my-status');
    try {
      const response = await axios.get(`${API_BASE_URL}/staff/my-status`);
      console.log('✅ Success! Current user status:');
      console.log(`   Status: ${response.data.status}`);
      console.log(`   Clock In: ${response.data.clockInTime ? new Date(response.data.clockInTime).toLocaleString() : 'N/A'}`);
      console.log(`   Clock Out: ${response.data.clockOutTime ? new Date(response.data.clockOutTime).toLocaleString() : 'N/A'}`);
      console.log(`   Attendance Status: ${response.data.attendanceStatus}`);
      console.log(`   Day Status: ${response.data.dayAttendanceStatus}`);
      console.log(`   Minutes Late: ${response.data.minutesLate}`);
      console.log(`   Minutes Early: ${response.data.minutesEarly}`);
    } catch (error) {
      console.log('❌ Error getting user status:', error.response?.data || error.message);
    }

    // Test 3: Test clock in (this will fail without authentication, but we can see the endpoint)
    console.log('\n⏰ Testing POST /api/staff/clock-in (without auth)');
    try {
      const response = await axios.post(`${API_BASE_URL}/staff/clock-in`, {
        location: 'Main Office',
        method: 'system'
      });
      console.log('✅ Clock in successful:', response.data);
    } catch (error) {
      console.log('❌ Clock in failed (expected without auth):', error.response?.data?.error || error.message);
    }

  } catch (error) {
    console.error('❌ General error:', error.message);
  }
}

testAttendanceAPI();
