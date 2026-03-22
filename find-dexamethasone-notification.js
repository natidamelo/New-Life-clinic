const { MongoClient } = require('mongodb');

async function findDexamethasoneNotifications() {
  const client = new MongoClient('mongodb://127.0.0.1:27017/clinic-cms');
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('clinic-cms');
    
    // Find all medication payment notifications
    const notifications = await db.collection('notifications').find({
      type: 'medication_payment_required'
    }).toArray();
    
    console.log(`Found ${notifications.length} medication payment notifications`);
    
    // Look for notifications with Dexamethasone
    const dexamethasoneNotifications = notifications.filter(notification => {
      const medications = notification.data?.medications || [];
      return medications.some(med => 
        (med.name && med.name.toLowerCase().includes('dexamethasone')) ||
        (med.medication && med.medication.toLowerCase().includes('dexamethasone'))
      );
    });
    
    console.log(`\nFound ${dexamethasoneNotifications.length} notifications with Dexamethasone:`);
    
    dexamethasoneNotifications.forEach((notification, index) => {
      console.log(`\n--- Notification ${index + 1} ---`);
      console.log('ID:', notification._id);
      console.log('Patient:', notification.data?.patientName);
      console.log('Total Amount:', notification.data?.totalAmount);
      console.log('Message:', notification.message);
      console.log('Read:', notification.read);
      console.log('Timestamp:', notification.timestamp);
      
      const medications = notification.data?.medications || [];
      medications.forEach((med, medIndex) => {
        if ((med.name && med.name.toLowerCase().includes('dexamethasone')) ||
            (med.medication && med.medication.toLowerCase().includes('dexamethasone'))) {
          console.log(`  💊 Dexamethasone:`);
          console.log(`     - Name: ${med.name || med.medication}`);
          console.log(`     - Price: ${med.price || med.unitPrice}`);
          console.log(`     - Total Price: ${med.totalPrice}`);
          console.log(`     - Quantity: ${med.quantity}`);
          console.log(`     - Frequency: ${med.frequency}`);
          console.log(`     - Duration: ${med.duration}`);
        }
      });
    });
    
    // Also check for any notifications with amount 1500 or 600
    console.log('\n🔍 Checking for notifications with amounts 1500 or 600:');
    const amountNotifications = notifications.filter(notification => 
      notification.data?.totalAmount === 1500 || notification.data?.totalAmount === 600
    );
    
    amountNotifications.forEach((notification, index) => {
      console.log(`\n--- Amount Notification ${index + 1} ---`);
      console.log('ID:', notification._id);
      console.log('Patient:', notification.data?.patientName);
      console.log('Total Amount:', notification.data?.totalAmount);
      console.log('Message:', notification.message);
      console.log('Read:', notification.read);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

findDexamethasoneNotifications();

