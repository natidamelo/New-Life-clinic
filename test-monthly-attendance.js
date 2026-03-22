const axios = require('axios');

// Test the monthly attendance API endpoint
async function testMonthlyAttendance() {
  try {
    const year = 2025;
    const month = 10; // October

    console.log(`Testing monthly attendance API for ${year}-${month}...`);

    const response = await axios.get(`http://localhost:5000/api/staff/monthly-attendance?year=${year}&month=${month}`, {
      headers: {
        'Authorization': 'Bearer test-token' // You'll need a real token for authenticated requests
      }
    });

    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));

    if (response.data && response.data.success) {
      console.log('✅ API returned success');
      console.log('Number of staff:', response.data.monthlyAttendanceData?.length || 0);

      if (response.data.monthlyAttendanceData && response.data.monthlyAttendanceData.length > 0) {
        const firstStaff = response.data.monthlyAttendanceData[0];
        console.log('First staff member:', firstStaff.userName);
        console.log('Has dailyAttendance:', !!firstStaff.dailyAttendance);

        if (firstStaff.dailyAttendance) {
          const firstDay = Object.keys(firstStaff.dailyAttendance)[0];
          console.log('First day data:', firstStaff.dailyAttendance[firstDay]);
        }
      }
    } else {
      console.log('❌ API returned error:', response.data);
    }

  } catch (error) {
    console.error('❌ Error testing monthly attendance API:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testMonthlyAttendance();
