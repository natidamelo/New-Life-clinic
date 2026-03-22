const { MongoClient } = require('mongodb');

async function fixDexamethasonePricing() {
  const client = new MongoClient('mongodb://127.0.0.1:27017/clinic-cms');
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('clinic-cms');
    
    // Find the notification for Kinfe Michael with Dexamethasone
    const notification = await db.collection('notifications').findOne({
      'data.patientName': { $regex: /kinfe/i },
      type: 'medication_payment_required',
      read: false
    });
    
    if (!notification) {
      console.log('❌ No active notification found for Kinfe Michael');
      return;
    }
    
    console.log('📋 Found notification:', notification._id);
    console.log('Patient:', notification.data.patientName);
    console.log('Current Total Amount:', notification.data.totalAmount);
    console.log('Current Message:', notification.message);
    
    // Check if this is a Dexamethasone notification
    const medications = notification.data.medications || [];
    const dexamethasoneMed = medications.find(med => 
      (med.name && med.name.toLowerCase().includes('dexamethasone')) ||
      (med.medication && med.medication.toLowerCase().includes('dexamethasone'))
    );
    
    if (!dexamethasoneMed) {
      console.log('❌ No Dexamethasone medication found in this notification');
      return;
    }
    
    console.log('💊 Found Dexamethasone medication:');
    console.log('   - Name:', dexamethasoneMed.name || dexamethasoneMed.medication);
    console.log('   - Current Price:', dexamethasoneMed.price || dexamethasoneMed.unitPrice);
    console.log('   - Current Total Price:', dexamethasoneMed.totalPrice);
    
    // Fix the pricing discrepancy
    // The notification shows ETB 1500 but payment amount is ETB 600
    // We need to make them consistent - use ETB 600 as the correct amount
    
    const correctAmount = 600;
    const correctPricePerDose = 200; // ETB 200 per dose for Dexamethasone
    
    // Calculate correct doses: 600 / 200 = 3 doses
    const totalDoses = 3;
    
    console.log('🧮 Fixing pricing:');
    console.log(`   - Correct amount: ETB ${correctAmount}`);
    console.log(`   - Price per dose: ETB ${correctPricePerDose}`);
    console.log(`   - Total doses: ${totalDoses}`);
    
    // Update the notification
    const result = await db.collection('notifications').updateOne(
      { _id: notification._id },
      {
        $set: {
          'data.totalAmount': correctAmount,
          'data.amount': correctAmount,
          'data.medications.0.price': correctPricePerDose,
          'data.medications.0.totalPrice': correctAmount,
          'data.medications.0.quantity': totalDoses,
          'data.medications.0.unitPrice': correctPricePerDose,
          message: `Medication payment required for ${notification.data.patientName}. Total amount: ETB ${correctAmount}.00`,
          timestamp: new Date()
        }
      }
    );
    
    if (result.modifiedCount > 0) {
      console.log('✅ Notification updated successfully!');
      console.log('Fixed pricing discrepancy - now both amounts show ETB 600');
    } else {
      console.log('❌ Failed to update notification');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

fixDexamethasonePricing();

