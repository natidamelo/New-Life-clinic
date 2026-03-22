const axios = require('axios');

async function testAtoEliyasAPI() {
  try {
    console.log('🧪 Testing ato eliyas API directly...');
    
    // Test with the prescription IDs we saw in the logs
    const prescriptionIds = [
      '68b972a89274105ee1fe73cd', // Ceftriaxone
      '68b96cd49274105ee1fe535e', // Ceftriaxone 2nd
      '68b96af49274105ee1fe46e0', // Dexamethasone
      '68b96a029274105ee1fe41ec'  // Diclofenac
    ];
    
    const medications = ['Ceftriaxone', 'Dexamethasone', 'Diclofenac'];
    
    for (const prescriptionId of prescriptionIds) {
      for (const medication of medications) {
        try {
          console.log(`\n🔍 Testing: ${medication} with prescription ID: ${prescriptionId}`);
          
          const response = await axios.get(`http://localhost:5002/api/medication-payment-status/medication/${prescriptionId}/${medication}`, {
            headers: {
              'Authorization': 'Bearer test-token' // This will fail auth but we can see the response structure
            }
          });
          
          console.log(`✅ Response for ${medication}:`, response.data);
          
        } catch (error) {
          if (error.response) {
            console.log(`❌ Error for ${medication}: ${error.response.status} - ${error.response.data?.message || error.response.statusText}`);
          } else {
            console.log(`❌ Network error for ${medication}:`, error.message);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAtoEliyasAPI();
