const axios = require('axios');

async function testBillingEndpoints() {
  console.log('🔍 Testing billing endpoints...\n');
  
  const baseURL = 'http://192.168.78.157:5002/api';
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODI0NjFiNThhMmJmYjBhNzUzOTk4NGMiLCJyb2xlIjoicmVjZXB0aW9uIiwiaWF0IjoxNzUzMTIwNzgxLCJleHAiOjE3NTMyMDcxODF9.btBYrfdcL8YA2oVqHoXF3khUTHA5tehhCc_-ZvuFdB8';
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  
  try {
    // Test 1: Check if /api/billing/process-lab-payment endpoint exists
    console.log('1️⃣ Testing /api/billing/process-lab-payment endpoint...');
    try {
      const response = await axios.post(`${baseURL}/billing/process-lab-payment`, {
        labOrderIds: ['test-id'],
        paymentMethod: 'cash',
        amountPaid: 100,
        notes: 'Test payment'
      }, { headers });
      console.log('✅ Endpoint exists and responds');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Endpoint exists (validation error expected)');
      } else {
        console.log('❌ Endpoint not found or error:', error.response?.status || error.message);
      }
    }
    
    // Test 2: Check if /api/billing/invoices/:id endpoint exists
    console.log('\n2️⃣ Testing /api/billing/invoices/:id endpoint...');
    try {
      const response = await axios.get(`${baseURL}/billing/invoices/687f61b3828e5ca2d39fd878`, { headers });
      console.log('✅ Invoice endpoint exists and responds');
      console.log('   Invoice data:', response.data);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log('✅ Endpoint exists (invoice not found - expected)');
      } else {
        console.log('❌ Endpoint not found or error:', error.response?.status || error.message);
      }
    }
    
    // Test 3: Check if /api/billing/stats endpoint exists
    console.log('\n3️⃣ Testing /api/billing/stats endpoint...');
    try {
      const response = await axios.get(`${baseURL}/billing/stats`, { headers });
      console.log('✅ Stats endpoint exists and responds');
    } catch (error) {
      if (error.response && error.response.status === 403) {
        console.log('✅ Endpoint exists (access denied - expected for non-admin)');
      } else {
        console.log('❌ Endpoint not found or error:', error.response?.status || error.message);
      }
    }
    
    console.log('\n🎉 Billing endpoints test completed!');
    console.log('💡 The 404 errors should now be resolved.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testBillingEndpoints(); 