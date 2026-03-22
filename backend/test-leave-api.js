const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:5000/api';
const TEST_TOKEN = 'your-test-token-here'; // You'll need to get a real token

// Test functions
const testLeaveAPI = async () => {
  console.log('🧪 Testing Leave Management API Endpoints...\n');

  try {
    // Test 1: Get leave requests
    console.log('1️⃣ Testing GET /api/leave (leave requests)...');
    try {
      const response = await axios.get(`${BASE_URL}/leave`);
      console.log('✅ Leave requests endpoint working');
      console.log(`   Found ${response.data.leaves?.length || 0} leave requests`);
      console.log(`   Pagination: ${response.data.pagination?.totalRecords || 0} total records\n`);
    } catch (error) {
      console.log('❌ Leave requests endpoint failed:', error.response?.data?.message || error.message);
    }

    // Test 2: Get notification count
    console.log('2️⃣ Testing GET /api/leave/notifications/count...');
    try {
      const response = await axios.get(`${BASE_URL}/leave/notifications/count`);
      console.log('✅ Notification count endpoint working');
      console.log(`   Pending notifications: ${response.data.count || 0}\n`);
    } catch (error) {
      console.log('❌ Notification count endpoint failed:', error.response?.data?.message || error.message);
    }

    // Test 3: Get leave balances
    console.log('3️⃣ Testing GET /api/leave/all-balances...');
    try {
      const response = await axios.get(`${BASE_URL}/leave/all-balances?year=2025`);
      console.log('✅ Leave balances endpoint working');
      console.log(`   Found ${response.data.data?.length || 0} staff members with leave balances\n`);
    } catch (error) {
      console.log('❌ Leave balances endpoint failed:', error.response?.data?.message || error.message);
    }

    // Test 4: Get statistics
    console.log('4️⃣ Testing GET /api/leave/statistics...');
    try {
      const response = await axios.get(`${BASE_URL}/leave/statistics?year=2025`);
      console.log('✅ Statistics endpoint working');
      console.log(`   Status stats: ${response.data.data?.statusStats?.length || 0} categories`);
      console.log(`   Leave type stats: ${response.data.data?.leaveTypeStats?.length || 0} types`);
      console.log(`   Department stats: ${response.data.data?.departmentStats?.length || 0} departments\n`);
    } catch (error) {
      console.log('❌ Statistics endpoint failed:', error.response?.data?.message || error.message);
    }

    // Test 5: Test with filters
    console.log('5️⃣ Testing GET /api/leave with filters...');
    try {
      const response = await axios.get(`${BASE_URL}/leave?status=pending review&limit=5`);
      console.log('✅ Filtered leave requests endpoint working');
      console.log(`   Found ${response.data.leaves?.length || 0} pending requests\n`);
    } catch (error) {
      console.log('❌ Filtered leave requests endpoint failed:', error.response?.data?.message || error.message);
    }

    console.log('🎉 API testing completed!');
    console.log('\n📝 Note: Some endpoints may require authentication.');
    console.log('   To test with real authentication, update the TEST_TOKEN variable.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

// Run the test
testLeaveAPI();
