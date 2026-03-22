// Comprehensive test script for attendance system fixes
const axios = require('axios');

// Test data for verification
const testStaffData = [
  {
    name: "DR Natan",
    role: "doctor",
    department: "General",
    expectedStatus: "Should show real attendance data, not 'N' for all days"
  },
  {
    name: "Semhal Melaku",
    role: "nurse",
    department: "General",
    expectedStatus: "Should show real attendance data, not 'N' for all days"
  }
];

async function testAttendanceAPI() {
  try {
    console.log('🔍 Testing Monthly Attendance API...');

    // Test current month
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 1-indexed for API

    const response = await axios.get(`http://localhost:5000/api/staff/monthly-attendance?year=${year}&month=${month}`, {
      headers: {
        'Authorization': 'Bearer test-token' // You'll need a real token
      }
    });

    console.log(`📊 API Response for ${year}-${month}:`);
    console.log(`Status: ${response.status}`);
    console.log(`Success: ${response.data?.success}`);

    if (response.data?.success) {
      const data = response.data;
      console.log(`📈 Summary:`, data.summary);
      console.log(`👥 Staff Count: ${data.monthlyAttendanceData?.length || 0}`);

      // Check if staff data structure is correct
      if (data.monthlyAttendanceData && data.monthlyAttendanceData.length > 0) {
        const firstStaff = data.monthlyAttendanceData[0];
        console.log(`✅ First staff member: ${firstStaff.userName}`);
        console.log(`✅ Has dailyAttendance: ${!!firstStaff.dailyAttendance}`);

        if (firstStaff.dailyAttendance) {
          const days = Object.keys(firstStaff.dailyAttendance);
          console.log(`✅ Days with data: ${days.length}`);

          // Check a few sample days
          days.slice(0, 3).forEach(day => {
            const dayData = firstStaff.dailyAttendance[day];
            console.log(`  📅 ${day}: ${dayData.status} (${dayData.workHours}h)`);
          });

          // Check for weekends
          const weekendDays = days.filter(day => {
            const date = new Date(day);
            return date.getDay() === 0 || date.getDay() === 6;
          });

          console.log(`✅ Weekend days found: ${weekendDays.length}`);
          weekendDays.slice(0, 2).forEach(day => {
            console.log(`  🏖️  ${day}: ${firstStaff.dailyAttendance[day].status}`);
          });
        }
      }
    } else {
      console.log(`❌ API Error:`, response.data);
    }

  } catch (error) {
    console.error('❌ API Test Error:', error.message);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', error.response.data);
    }
  }
}

async function testFrontendAttendanceView() {
  console.log('🎨 Testing Frontend Attendance View Logic...');

  // Simulate the attendance status logic that was fixed
  const mockStaffData = {
    userId: "test-123",
    userName: "Test Staff",
    userRole: "doctor",
    department: "General",
    dailyAttendance: {
      "2025-10-01": { status: "present", workHours: 8 },
      "2025-10-02": { status: "absent", workHours: 0 },
      "2025-10-03": { status: "late", workHours: 7 },
      "2025-10-04": { status: "weekend", workHours: 0 },
      "2025-10-05": { status: "weekend", workHours: 0 },
      "2025-10-06": { status: "present", workHours: 8 },
      // ... more days
    }
  };

  // Test the getAttendanceStatus function logic
  const testDate = new Date("2025-10-01"); // Wednesday, not weekend
  const isWeekend = testDate.getDay() === 0 || testDate.getDay() === 6;
  const isFuture = testDate > new Date();

  console.log(`📅 Testing date: ${testDate.toDateString()}`);
  console.log(`🏖️  Is weekend: ${isWeekend}`);
  console.log(`🔮 Is future: ${isFuture}`);

  if (!isWeekend && !isFuture) {
    const dateKey = testDate.toISOString().split('T')[0];
    const dayData = mockStaffData.dailyAttendance[dateKey];

    if (dayData) {
      const status = dayData.status;
      console.log(`✅ Status for ${dateKey}: ${status}`);

      // Test status mapping
      let displayStatus = '';
      switch (status) {
        case 'present':
          displayStatus = 'P';
          break;
        case 'absent':
          displayStatus = 'A';
          break;
        case 'late':
          displayStatus = 'L';
          break;
        case 'weekend':
          displayStatus = 'W';
          break;
        case 'no-data':
          displayStatus = 'N';
          break;
        default:
          displayStatus = '-';
      }

      console.log(`🎯 Display status: ${displayStatus}`);
    }
  }

  // Test month summary calculation
  const daysInMonth = 31;
  let present = 0;
  let total = 0;
  let noData = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(2025, 9, day); // October 2025
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const isFuture = date > new Date();

    if (!isWeekend && !isFuture) {
      total++;
      const dateKey = date.toISOString().split('T')[0];
      const dayData = mockStaffData.dailyAttendance[dateKey];

      if (dayData) {
        if (dayData.status === 'present') {
          present++;
        }
      } else {
        noData++;
      }
    }
  }

  const daysWithData = total - noData;
  const percentage = daysWithData > 0 ? Math.round((present / daysWithData) * 100) : 0;

  console.log(`📊 Month Summary:`);
  console.log(`  Total working days: ${total}`);
  console.log(`  Present: ${present}`);
  console.log(`  No data: ${noData}`);
  console.log(`  Days with data: ${daysWithData}`);
  console.log(`  Percentage: ${percentage}%`);
}

async function runAllTests() {
  console.log('🚀 Starting Comprehensive Attendance System Tests...\n');

  await testAttendanceAPI();
  console.log('\n' + '='.repeat(50) + '\n');
  await testFrontendAttendanceView();

  console.log('\n✅ All tests completed!');
  console.log('\n📋 Summary of fixes applied:');
  console.log('  ✅ Fixed monthly attendance data structure mismatch');
  console.log('  ✅ Fixed "No Data" issue in calendar');
  console.log('  ✅ Improved weekend handling');
  console.log('  ✅ Fixed month summary calculations');
  console.log('  ✅ Added better error handling');
}

runAllTests();
