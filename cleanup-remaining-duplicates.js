const axios = require('axios');

async function cleanupRemainingDuplicates() {
  try {
    console.log('🔍 Processing remaining duplicate lab orders...');
    
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODI0NjFiNThhMmJmYjBhNzUzOTk4NGMiLCJyb2xlIjoicmVjZXB0aW9uIiwiaWF0IjoxNzUzMTIwNzgxLCJleHAiOjE3NTMyMDcxODF9.btBYrfdcL8YA2oVqHoXF3khUTHA5tehhCc_-ZvuFdB8';
    
    // Remaining lab orders to process (the duplicates that are still showing)
    const remainingOrders = [
      {
        labOrderIds: ['687e7470a4f2fcca560e589b'], // Ruth Gebere duplicate
        patientName: 'Ruth Gebere (Duplicate 1)',
        amountPaid: 200
      },
      {
        labOrderIds: ['687e73dd2f28fe59772de360'], // Ruth Gebere duplicate
        patientName: 'Ruth Gebere (Duplicate 2)',
        amountPaid: 200
      },
      {
        labOrderIds: ['687e6dd3b98bf09715cc9e81'], // Anteneh Ejeu duplicate
        patientName: 'Anteneh Ejeu (Duplicate 1)',
        amountPaid: 200
      },
      {
        labOrderIds: ['687e6d2cd2f83acac05583ce'], // Anteneh Ejeu duplicate
        patientName: 'Anteneh Ejeu (Duplicate 2)',
        amountPaid: 200
      },
      {
        labOrderIds: ['687e6d07d2f83acac0558294'], // Anteneh Ejeu duplicate
        patientName: 'Anteneh Ejeu (Duplicate 3)',
        amountPaid: 200
      },
      {
        labOrderIds: ['687e493155fee741ca46ed06'], // Anteneh Ejeu duplicate
        patientName: 'Anteneh Ejeu (Duplicate 4)',
        amountPaid: 200
      },
      {
        labOrderIds: ['687e479b55fee741ca46eade'], // Anteneh Ejeu duplicate
        patientName: 'Anteneh Ejeu (Duplicate 5)',
        amountPaid: 200
      },
      {
        labOrderIds: ['687e16cb2677c42fcdf2c5f1'], // Mussie Eyob duplicate
        patientName: 'Mussie Eyob (Duplicate 1)',
        amountPaid: 200
      },
      {
        labOrderIds: ['687d24468024bb89d3e41e27'], // Mussie Eyob duplicate
        patientName: 'Mussie Eyob (Duplicate 2)',
        amountPaid: 200
      }
    ];
    
    for (const order of remainingOrders) {
      try {
        console.log(`\n💰 Processing payment for ${order.patientName}...`);
        
        const paymentData = {
          labOrderIds: order.labOrderIds,
          amountPaid: order.amountPaid,
          paymentMethod: 'cash',
          notes: 'Payment processed to clean up duplicate orders'
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
    
    console.log('\n✅ Remaining duplicate cleanup completed!');
    console.log('📋 Check your frontend to see if all notifications have been removed.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

cleanupRemainingDuplicates(); 