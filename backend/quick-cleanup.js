const mongoose = require('mongoose');
const Notification = require('./models/Notification');

async function quickCleanup() {
  try {
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('Connected to database');
    
    // Remove all problematic notifications
    const result = await Notification.deleteMany({
      type: { $in: ['lab_payment_required', 'PROCEDURE_PAYMENT', 'PATIENT_VITALS'] }
    });
    
    console.log(`Removed ${result.deletedCount} notifications`);
    console.log('Cleanup complete!');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.connection.close();
  }
}

quickCleanup();
