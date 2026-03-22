const axios = require('axios');

async function fixNotificationsViaAPI() {
  try {
    console.log('🔧 Fixing notifications via API...');
    
    // First, let's check what notifications exist
    const response = await axios.get('http://localhost:5002/api/notifications');
    console.log('Current notifications:', response.data.length);
    
    // Clean up duplicates by calling the cleanup endpoint
    try {
      await axios.post('http://localhost:5002/api/notifications/cleanup');
      console.log('✅ Cleanup completed');
    } catch (cleanupError) {
      console.log('Cleanup endpoint not available, continuing...');
    }
    
    // Check notifications again
    const finalResponse = await axios.get('http://localhost:5002/api/notifications');
    console.log('Final notifications:', finalResponse.data.length);
    
    // Show the notifications
    finalResponse.data.forEach((notif, index) => {
      const amount = notif.data?.amount || notif.data?.totalAmount || 0;
      console.log(`${index + 1}. ${notif.type}: ${notif.data?.patientName || 'Unknown'} - ${amount} ETB`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

fixNotificationsViaAPI();
