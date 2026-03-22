const axios = require('axios');

async function processLabPayments() {
  try {
    console.log('🔍 Processing lab payments to resolve duplicate issues...');
    
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODI0NjFiNThhMmJmYjBhNzUzOTk4NGMiLCJyb2xlIjoicmVjZXB0aW9uIiwiaWF0IjoxNzUzMTIwNzgxLCJleHAiOjE3NTMyMDcxODF9.btBYrfdcL8YA2oVqHoXF3khUTHA5tehhCc_-ZvuFdB8';
    
    // Lab orders to process (keeping one per patient)
    const labOrdersToProcess = [
      {
        labOrderIds: ['687e6e43b98bf09715cca0a4'], // Ruth Gebere - keep this one
        patientName: 'Ruth Gebere',
        amountPaid: 200
      },
      {
        labOrderIds: ['687e44bb1ead184135c9618b'], // Anteneh Ejeu - keep this one
        patientName: 'Anteneh Ejeu',
        amountPaid: 200
      },
      {
        labOrderIds: ['687d24278024bb89d3e41d2d'], // Mussie Eyob - keep this one
        patientName: 'Mussie Eyob',
        amountPaid: 200
      }
    ];
    
    for (const order of labOrdersToProcess) {
      try {
        console.log(`\n💰 Processing payment for ${order.patientName}...`);
        
        const paymentData = {
          labOrderIds: order.labOrderIds,
          amountPaid: order.amountPaid,
          paymentMethod: 'cash',
          notes: 'Payment processed to resolve duplicate orders'
        };
        
        const response = await axios.post('http://192.168.78.157:5002/api/billing/process-lab-payment', paymentData, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log(`✅ Payment processed successfully for ${order.patientName}`);
        console.log(`   Response:`, response.data);
        
      } catch (error) {
        console.log(`❌ Error processing payment for ${order.patientName}:`, error.response?.data || error.message);
      }
    }
    
    console.log('\n✅ Lab payment processing completed!');
    console.log('📋 Check your frontend to see if the notifications have been removed.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

processLabPayments(); 