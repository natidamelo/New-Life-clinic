const axios = require('axios');

/**
 * Call the API to fix Samuel Kinfe's BID extension issue
 */
async function callSamuelFixAPI() {
  try {
    console.log('🔧 Calling API to fix Samuel Kinfe\'s Ceftriaxone BID extension...');
    
    // Get admin token (you may need to adjust this based on your auth system)
    const baseURL = 'http://localhost:5002';
    
    // Call the fix API endpoint
    const response = await axios.post(`${baseURL}/api/fix-samuel-kinfe-bid`, {}, {
      headers: {
        'Content-Type': 'application/json',
        // Add auth headers if needed
        // 'Authorization': 'Bearer YOUR_TOKEN_HERE'
      }
    });
    
    if (response.data.success) {
      console.log('✅ SUCCESS: Samuel Kinfe\'s BID extension has been fixed!');
      console.log('\n📋 Fix Details:');
      console.log(`   Patient: ${response.data.data.patientName}`);
      console.log(`   Additional Days: ${response.data.data.additionalDays}`);
      console.log(`   Doses Corrected: ${response.data.data.dosesCorrected.before} → ${response.data.data.dosesCorrected.after}`);
      console.log(`   Dose Records Generated: ${response.data.data.doseRecordsGenerated}`);
      console.log(`   Nurse Task Updated: ${response.data.data.nurseTaskUpdated ? 'Yes' : 'No'}`);
      console.log(`   Invoice Updated: ${response.data.data.invoiceUpdated ? 'Yes' : 'No'}`);
      
      console.log('\n🎯 Expected Result:');
      console.log(`   Total Tabs: ${response.data.data.expectedResult.totalTabs}`);
      console.log(`   Morning Doses: ${response.data.data.expectedResult.morningDoses}`);
      console.log(`   Evening Doses: ${response.data.data.expectedResult.eveningDoses}`);
      console.log(`   Frequency: ${response.data.data.expectedResult.frequency}`);
      
      console.log('\n🔍 What to check:');
      console.log('   1. Go to Ward Dashboard → Administer Meds');
      console.log('   2. Look for Samuel Kinfe\'s Ceftriaxone medication');
      console.log('   3. You should now see 6 tabs instead of 3');
      console.log('   4. Each day should have morning (09:00) and evening (21:00) doses');
    } else {
      console.log('❌ FAILED:', response.data.message);
    }
    
  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', error.response.data);
    } else if (error.request) {
      console.error('❌ Network Error: Could not connect to server');
      console.error('   Make sure the backend server is running on http://localhost:5002');
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

// Run the fix
callSamuelFixAPI();
