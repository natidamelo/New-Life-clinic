const mongoose = require('mongoose');
const axios = require('axios');

// Connect to database
mongoose.connect('mongodb://localhost:27017/clinic-cms')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Get the latest lab payment notification
    const Notification = require('./models/Notification');
    const notification = await Notification.findOne({type: 'lab_payment_required'}).sort({createdAt: -1});
    
    if (!notification) {
      console.log('No lab payment notification found');
      process.exit(1);
    }
    
    console.log('Found notification:');
    console.log('- Invoice ID:', notification.data.invoiceId);
    console.log('- Lab Order IDs:', notification.data.labOrderIds);
    console.log('- Total Amount:', notification.data.totalAmount);
    
    // Test the payment endpoint
    const paymentData = {
      invoiceId: notification.data.invoiceId,
      labOrderIds: notification.data.labOrderIds,
      paymentMethod: 'cash',
      amountPaid: notification.data.totalAmount,
      notes: 'Test payment'
    };
    
    console.log('\nSending payment request:');
    console.log(JSON.stringify(paymentData, null, 2));
    
    try {
      const response = await axios.post('http://192.168.78.157:5002/api/billing/process-lab-payment', paymentData, {
        headers: {
          'Authorization': 'Bearer dummy-token-for-test'
        }
      });
      console.log('\n✅ Payment successful:', response.data);
    } catch (error) {
      console.log('\n❌ Payment failed:');
      if (error.response) {
        console.log('Status:', error.response.status);
        console.log('Data:', error.response.data);
      } else {
        console.log('Error:', error.message);
      }
    }
    
    process.exit();
  })
  .catch(error => {
    console.error('Database connection error:', error);
    process.exit(1);
  }); 