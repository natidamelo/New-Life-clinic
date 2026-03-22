const mongoose = require('mongoose');
const Notification = require('./models/Notification');
const InventoryItem = require('./models/InventoryItem');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/clinic-cms')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    try {
      // Clean up existing test notifications
      await Notification.deleteMany({ 
        'data.patientName': 'Test Patient Debug'
      });
      console.log('✅ Cleaned up existing test notifications');
      
      // Test the notification creation logic manually
      console.log('🔍 Testing notification creation logic...');
      
      // Simulate the medications array from a prescription
      const testMedications = [
        {
          name: 'Ceftriaxone',
          dosage: '1g',
          frequency: 'Twice daily (BID)',
          duration: '5 days',
          inventoryItem: '687a4be015d7e2d365b903d0'
        },
        {
          name: 'Dexamethasone',
          dosage: '8mg',
          frequency: 'Twice daily (BID)',
          duration: '5 days',
          inventoryItem: '6885f689a11723c4c941f891'
        }
      ];
      
      // Process medications for notification (same logic as in prescriptions.js)
      const notificationMedications = await Promise.all(testMedications.map(async (med) => {
        let estimatedCost = 0;
        let sellingPrice = 0;
        let totalDoses = 1;

        console.log(`🔍 [NOTIFICATION DEBUG] Processing medication: ${med.name}`);
        if (med.inventoryItem) {
          const inventoryDoc = await InventoryItem.findById(med.inventoryItem);
          if (inventoryDoc && inventoryDoc.sellingPrice) {
            sellingPrice = inventoryDoc.sellingPrice;
            
            // Calculate total doses based on frequency and duration
            let dosesPerDay = 1;
            const frequency = med.frequency || 'once daily';
            if (frequency.toLowerCase().includes('twice') || frequency.toLowerCase().includes('bid')) dosesPerDay = 2;
            if (frequency.toLowerCase().includes('three') || frequency.toLowerCase().includes('tid')) dosesPerDay = 3;

            // Parse duration to get total days
            let totalDays = 1; // Default
            const duration = med.duration || '1 day';
            const durationMatch = duration.match(/(\d+)/);
            if (durationMatch) totalDays = parseInt(durationMatch[1]);

            totalDoses = dosesPerDay * totalDays; // Total doses calculation
            estimatedCost = totalDoses * sellingPrice; // Total cost calculation
            
            console.log(`💊 Notification cost calculation for ${med.name}:`);
            console.log(`   - Frequency: ${frequency} (${dosesPerDay} doses/day)`);
            console.log(`   - Duration: ${duration} (${totalDays} days)`);
            console.log(`   - Total doses: ${totalDoses}`);
            console.log(`   - Price per dose: ${sellingPrice} ETB`);
            console.log(`   - Total cost: ${estimatedCost} ETB`);
          } else {
            console.log(`⚠️ [NOTIFICATION DEBUG] Inventory item not found or no selling price for ${med.name}`);
          }
        } else {
          console.log(`⚠️ [NOTIFICATION DEBUG] No inventory item ID for ${med.name}`);
        }

        // Return the medication details for the notification
        return {
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          duration: med.duration,
          totalPrice: estimatedCost,
          inventoryItemId: med.inventoryItem,
          prescriptionId: new mongoose.Types.ObjectId() // Test prescription ID
        };
      }));

      console.log(`🔍 [NOTIFICATION DEBUG] Medications for notification:`, notificationMedications);

      const overallTotalAmount = notificationMedications.reduce((acc, med) => acc + med.totalPrice, 0);
      console.log(`🔍 [NOTIFICATION DEBUG] Overall total amount: ${overallTotalAmount}`);

      // Only create payment notification if there's actually an amount to pay
      if (overallTotalAmount > 0) {
        const receptionNotification = new Notification({
          senderId: new mongoose.Types.ObjectId(),
          senderRole: 'doctor',
          recipientRole: 'reception',
          type: 'medication_payment_required',
          title: 'Medication Payment Required',
          message: `Medication payment required for Test Patient Debug. Total amount: ${overallTotalAmount}`,
          data: {
            prescriptionId: new mongoose.Types.ObjectId(),
            patientId: new mongoose.Types.ObjectId(),
            patientName: 'Test Patient Debug',
            totalAmount: overallTotalAmount,
            medications: notificationMedications // This array holds all medication details
          },
        });
        await receptionNotification.save();
        console.log(`✅ Notification created successfully with ${notificationMedications.length} medications.`);
        
        // Verify the notification was created correctly
        const savedNotification = await Notification.findById(receptionNotification._id);
        console.log('🔍 Saved notification data:', {
          patientName: savedNotification.data.patientName,
          totalAmount: savedNotification.data.totalAmount,
          medicationsCount: savedNotification.data.medications.length,
          medications: savedNotification.data.medications.map(m => ({
            name: m.name,
            totalPrice: m.totalPrice
          }))
        });
      } else {
        console.log('No payment notification created - medications are free (totalAmount = 0)');
      }
      
    } catch (error) {
      console.error('❌ Error during test execution:', error);
    } finally {
      mongoose.connection.close();
    }
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
  }); 