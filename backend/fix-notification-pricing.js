const mongoose = require('mongoose');

async function fixNotificationPricing() {
  try {
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('Connected to clinic-cms database');
    
    // Get all medication payment notifications
    const notificationsCollection = mongoose.connection.db.collection('notifications');
    const notifications = await notificationsCollection.find({
      type: 'medication_payment_required'
    }).toArray();
    
    console.log(`Found ${notifications.length} medication payment notifications`);
    
    // Get inventory items for price lookup
    const inventoryCollection = mongoose.connection.db.collection('inventoryitems');
    const inventoryItems = await inventoryCollection.find({}).toArray();
    const inventoryMap = {};
    inventoryItems.forEach(item => {
      inventoryMap[item._id.toString()] = item;
    });
    
    console.log(`Loaded ${inventoryItems.length} inventory items`);
    
    let updated = 0;
    
    for (const notification of notifications) {
      try {
        const medications = notification.data?.medications || [];
        let hasChanges = false;
        let newTotalAmount = 0;
        
        const updatedMedications = medications.map(med => {
          const inventoryItem = inventoryMap[med.inventoryItemId?.toString()];
          
          if (inventoryItem && inventoryItem.sellingPrice) {
            // Calculate correct total doses and cost
            let dosesPerDay = 1;
            const frequency = med.frequency || 'once daily';
            if (frequency.toLowerCase().includes('twice') || frequency.toLowerCase().includes('bid')) dosesPerDay = 2;
            if (frequency.toLowerCase().includes('three') || frequency.toLowerCase().includes('tid')) dosesPerDay = 3;
            if (frequency.toLowerCase().includes('four') || frequency.toLowerCase().includes('qid')) dosesPerDay = 4;
            
            // Parse duration
            let totalDays = 7;
            const duration = med.duration || '7 days';
            const durationMatch = duration.match(/(\d+)/);
            if (durationMatch) totalDays = parseInt(durationMatch[1]);
            
            const totalDoses = totalDays * dosesPerDay;
            const correctTotalPrice = totalDoses * inventoryItem.sellingPrice;
            
            console.log(`📋 Fixing ${med.name}:`);
            console.log(`   Old: ${med.price} ETB/dose, ${med.quantity} qty, ${med.totalPrice} ETB total`);
            console.log(`   New: ${inventoryItem.sellingPrice} ETB/dose, ${totalDoses} doses, ${correctTotalPrice} ETB total`);
            
            if (med.price !== inventoryItem.sellingPrice || med.quantity !== totalDoses || med.totalPrice !== correctTotalPrice) {
              hasChanges = true;
            }
            
            newTotalAmount += correctTotalPrice;
            
            return {
              ...med,
              price: inventoryItem.sellingPrice,
              quantity: totalDoses,
              totalPrice: correctTotalPrice
            };
          }
          
          newTotalAmount += med.totalPrice || 0;
          return med;
        });
        
        if (hasChanges || notification.data.totalAmount !== newTotalAmount) {
          const updateData = {
            ...notification.data,
            medications: updatedMedications,
            totalAmount: newTotalAmount
          };
          
          await notificationsCollection.updateOne(
            { _id: notification._id },
            { 
              $set: { 
                data: updateData,
                message: `Medication payment required for ${notification.data.patientName}. Total amount: ${newTotalAmount}`
              }
            }
          );
          
          console.log(`✅ Updated notification ${notification._id}: ${notification.data.totalAmount} → ${newTotalAmount} ETB`);
          updated++;
        }
        
      } catch (error) {
        console.error(`❌ Error updating notification ${notification._id}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Updated ${updated} notifications with correct pricing`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixNotificationPricing(); 
