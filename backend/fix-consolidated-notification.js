const mongoose = require('mongoose');
const Notification = require('./models/Notification');

async function fixConsolidatedNotification() {
  try {
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('Connected to MongoDB');
    
    // Find the consolidated notification for melody Natan
    const consolidatedNotification = await Notification.findOne({
      'data.patientName': 'melody Natan',
      'data.consolidated': true
    });
    
    if (!consolidatedNotification) {
      console.log('No consolidated notification found for melody Natan');
      return;
    }
    
    console.log('Found consolidated notification:', consolidatedNotification._id);
    console.log('Current data:', JSON.stringify(consolidatedNotification.data, null, 2));
    
    // Update the notification with proper fields
    const updatedNotification = await Notification.findByIdAndUpdate(
      consolidatedNotification._id,
      {
        recipientRole: 'reception',
        senderRole: 'reception',
        senderId: '682461b58a2bfb0a7539984c', // Default reception user ID
        read: false,
        priority: 'medium',
        'data.consolidated': true,
        'data.paymentStatus': 'unpaid'
      },
      { new: true }
    );
    
    console.log('Updated consolidated notification:', updatedNotification._id);
    console.log('Updated data:', JSON.stringify(updatedNotification.data, null, 2));
    
    // Verify the notification is now properly configured
    const verification = await Notification.findById(updatedNotification._id);
    console.log('\nVerification:');
    console.log('- recipientRole:', verification.recipientRole);
    console.log('- senderRole:', verification.senderRole);
    console.log('- read:', verification.read);
    console.log('- data.consolidated:', verification.data.consolidated);
    console.log('- data.paymentStatus:', verification.data.paymentStatus);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

fixConsolidatedNotification(); 