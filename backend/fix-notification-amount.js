const mongoose = require('mongoose');
const Notification = require('./models/Notification');

async function fixNotificationAmount() {
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
    console.log('Current amount:', consolidatedNotification.data.amount);
    console.log('Current totalAmount:', consolidatedNotification.data.totalAmount);
    
    // Fix the amount to ETB 300 (100 + 200)
    const correctAmount = 300;
    
    const updatedNotification = await Notification.findByIdAndUpdate(
      consolidatedNotification._id,
      {
        'data.amount': correctAmount,
        'data.totalAmount': correctAmount,
        message: `Payment required for lab tests: Hemoglobin, Glucose, Fasting (Total: ETB ${correctAmount})`
      },
      { new: true }
    );
    
    console.log('\nUpdated notification:');
    console.log('- New amount:', updatedNotification.data.amount);
    console.log('- New totalAmount:', updatedNotification.data.totalAmount);
    console.log('- New message:', updatedNotification.message);
    
    // Verify the fix
    const verification = await Notification.findById(consolidatedNotification._id);
    console.log('\nVerification:');
    console.log('- Amount: ETB', verification.data.amount);
    console.log('- Total Amount: ETB', verification.data.totalAmount);
    console.log('- Tests:', verification.data.testNames?.join(', '));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

fixNotificationAmount(); 