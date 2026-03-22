const axios = require('axios');

// Script to diagnose API connectivity issues
async function diagnosticTest() {
  console.log('Running frontend-backend connectivity diagnostic test');
  
  // Try connecting to the regular /api/patients endpoint
  try {
    console.log('Testing main API endpoint at http://192.168.78.157:5002/api/patients');
    const mainResponse = await axios.get('http://192.168.78.157:5002/api/patients');
    
    console.log('================== MAIN API ENDPOINT RESPONSE ==================');
    
    if (mainResponse.data && mainResponse.data.patients) {
      console.log(`Total patients returned: ${mainResponse.data.patients.length}`);
      console.log(`Total patients count: ${mainResponse.data.totalPatients}`);
      console.log(`Current page: ${mainResponse.data.currentPage}`);
      console.log(`Total pages: ${mainResponse.data.totalPages}`);
      
      // Analyze patient data
      if (mainResponse.data.patients.length > 0) {
        const statusCounts = {};
        mainResponse.data.patients.forEach(p => {
          const status = p.status || 'unknown';
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });
        
        console.log('Status counts in response data:', statusCounts);
        
        // Check waiting patients
        const waitingPatients = mainResponse.data.patients.filter(
          p => (p.status || '').toLowerCase().trim() === 'waiting'
        );
        
        console.log(`Waiting patients after frontend filter: ${waitingPatients.length}/${mainResponse.data.patients.length}`);
        
        // Sample of patient data
        console.log('Sample patient data:');
        const sample = mainResponse.data.patients.slice(0, 3).map(p => ({
          id: p.id || p._id,
          name: `${p.firstName} ${p.lastName}`,
          status: p.status,
          statusType: typeof p.status
        }));
        console.log(JSON.stringify(sample, null, 2));
        
        // If there are no waiting patients but API says there should be
        if (waitingPatients.length === 0 && Object.keys(statusCounts).some(s => s.includes('wait'))) {
          console.error('CRITICAL ERROR: API returns patients with status containing "wait" but frontend filter finds none');
          
          // Deep inspection of first few patients
          console.log('Detailed status analysis of first 3 patients:');
          mainResponse.data.patients.slice(0, 3).forEach(p => {
            console.log(`----- Patient ${p.id || p._id} -----`);
            console.log(`Raw status: "${p.status}"`);
            console.log(`Status type: ${typeof p.status}`);
            console.log(`Status length: ${p.status ? p.status.length : 'N/A'}`);
            console.log(`Status after trim: "${p.status ? p.status.trim() : ''}"`);
            console.log(`Status toLowerCase: "${p.status ? p.status.toLowerCase() : ''}"`);
            console.log(`Matches 'waiting'?: ${(p.status || '').toLowerCase().trim() === 'waiting'}`);
            console.log(`Status charCodes: ${p.status ? Array.from(p.status).map(c => c.charCodeAt(0)) : []}`);
          });
        }
      } else {
        console.error('API returned 0 patients in the data array');
      }
    } else {
      console.error('Unexpected API response format:', mainResponse.data);
    }
    
    return true;
  } catch (error) {
    console.error('Error connecting to API:');
    console.error(error.message);
    
    // Check for specific error types
    if (error.code === 'ECONNREFUSED') {
      console.error('Connection refused. Is the backend server running on port 5002?');
    } else if (error.response) {
      console.error(`API responded with status ${error.response.status}`);
      console.error('Response data:', error.response.data);
    }
    
    return false;
  }
}

// Run the test
diagnosticTest().then(success => {
  if (success) {
    console.log('Diagnostic test completed successfully');
  } else {
    console.error('Diagnostic test failed');
  }
}); 