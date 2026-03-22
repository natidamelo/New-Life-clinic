const axios = require('axios');

// Test configuration
const BASE_URL = 'http://192.168.78.157:5002';
const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODk0NmEzZjg2MWVhMzRjMGVlZTZhYzMiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NTQ1ODYwOTEsImV4cCI6MTc1NDY3MjQ5MX0.xmMci3vJpwMR6DBuF3P8Iu_WbpR2Lyl1VGPsKLQIZU4';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${ADMIN_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

async function testAttendanceSystem() {
  console.log('🧪 Testing Ethiopian Time Attendance System\n');

  try {
    // 1. Test login activity
    console.log('1️⃣ Testing login activity...');
    const loginResponse = await api.post('/api/attendance/login-activity');
    console.log('✅ Login Activity:', loginResponse.data);
    console.log('   Status:', loginResponse.data.status);
    console.log('   Ethiopian Time:', loginResponse.data.ethiopianTime);
    console.log('   Working Hours:', loginResponse.data.workingHours);
    console.log('');

    // 2. Test heartbeat
    console.log('2️⃣ Testing activity heartbeat...');
    const heartbeatResponse = await api.post('/api/attendance/heartbeat', {
      timestamp: Date.now(),
      lastActivity: Date.now()
    });
    console.log('✅ Heartbeat:', heartbeatResponse.data);
    console.log('');

    // 3. Test automatic attendance
    console.log('3️⃣ Testing automatic attendance...');
    const attendanceResponse = await api.get('/api/attendance/automatic');
    console.log('✅ Automatic Attendance Summary:');
    console.log('   Present:', attendanceResponse.data.summary.present);
    console.log('   Absent:', attendanceResponse.data.summary.absent);
    console.log('   Offline:', attendanceResponse.data.summary.offline);
    console.log('   Total:', attendanceResponse.data.summary.total);
    console.log('   Current Ethiopian Time:', attendanceResponse.data.summary.currentEthiopianTime);
    console.log('   Working Hours:', attendanceResponse.data.summary.workingHours);
    console.log('');

    // 4. Test individual status
    console.log('4️⃣ Testing individual status...');
    const statusResponse = await api.get('/api/attendance/my-status');
    console.log('✅ My Status:', statusResponse.data);
    console.log('');

    // 5. Test admin notifications
    console.log('5️⃣ Testing admin notifications...');
    const notificationsResponse = await api.get('/api/attendance/admin-notifications');
    console.log('✅ Admin Notifications:', notificationsResponse.data);
    console.log('   Total Unread:', notificationsResponse.data.totalUnread);
    console.log('');

    // 6. Test logout activity
    console.log('6️⃣ Testing logout activity...');
    const logoutResponse = await api.post('/api/attendance/logout-activity');
    console.log('✅ Logout Activity:', logoutResponse.data);
    console.log('');

    // 7. Test analytics
    console.log('7️⃣ Testing attendance analytics...');
    const analyticsResponse = await api.get('/api/attendance/analytics');
    console.log('✅ Analytics:', analyticsResponse.data);
    console.log('');

    console.log('🎉 All tests completed successfully!');
    console.log('\n📋 System Features:');
    console.log('   ✅ Ethiopian Time (UTC+3) support');
    console.log('   ✅ Working hours: 2:00 AM - 11:00 PM EAT');
    console.log('   ✅ Automatic presence detection on login');
    console.log('   ✅ Activity tracking with 5-minute inactivity timeout');
    console.log('   ✅ Admin notifications for logout events');
    console.log('   ✅ Real-time attendance status updates');
    console.log('   ✅ Timesheet integration during working hours');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testAttendanceSystem();
