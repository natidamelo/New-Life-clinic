const axios = require('axios');

// Test the batch unpaid invoices endpoint
async function testBatchEndpoint() {
  try {
    console.log('Testing batch unpaid invoices endpoint...');
    
    // First, get some patient IDs
    const patientsResponse = await axios.get('http://192.168.78.157:5002/api/patients');
    const patients = patientsResponse.data.patients || patientsResponse.data;
    
    if (!patients || patients.length === 0) {
      console.log('No patients found to test with');
      return;
    }
    
    // Take first 3 patients for testing
    const testPatientIds = patients.slice(0, 3).map(p => p._id || p.id);
    console.log('Testing with patient IDs:', testPatientIds);
    
    // Test the batch endpoint
    const batchResponse = await axios.get(`http://192.168.78.157:5002/api/billing/unpaid-invoices-batch?patientIds=${testPatientIds.join(',')}`);
    
    console.log('Batch endpoint response:', JSON.stringify(batchResponse.data, null, 2));
    
    // Test individual endpoint for comparison
    console.log('\nTesting individual endpoint for first patient...');
    const individualResponse = await axios.get(`http://192.168.78.157:5002/api/billing/unpaid-invoices?patientId=${testPatientIds[0]}`);
    console.log('Individual endpoint response:', JSON.stringify(individualResponse.data, null, 2));
    
  } catch (error) {
    console.error('Error testing batch endpoint:', error.response?.data || error.message);
  }
}

// Run the test
testBatchEndpoint(); 
