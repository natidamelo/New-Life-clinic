const mongoose = require('mongoose');
const Notification = require('./models/Notification');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/clinic-cms')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    try {
      // Clean up existing test notifications
      await Notification.deleteMany({ 
        'data.patientName': { $in: ['James Natan', 'Yohannes Sami', 'Ruth Mekonnen'] }
      });
      console.log('✅ Cleaned up existing test notifications');
      
      // Create multiple test notifications with different medication counts
      const testNotifications = [
        {
          patientName: 'James Natan',
          medications: [
            { name: 'Amoxicillin', dosage: '500mg', frequency: '3x daily', duration: '7 days', price: 250, totalPrice: 2500 },
            { name: 'Paracetamol', dosage: '500mg', frequency: '2x daily', duration: '5 days', price: 100, totalPrice: 1000 },
            { name: 'Ibuprofen', dosage: '400mg', frequency: '2x daily', duration: '5 days', price: 200, totalPrice: 2000 },
            { name: 'Vitamin C', dosage: '1000mg', frequency: '1x daily', duration: '10 days', price: 200, totalPrice: 2000 }
          ]
        },
        {
          patientName: 'Yohannes Sami',
          medications: [
            { name: 'Diclofenac', dosage: '50mg', frequency: '2x daily', duration: '7 days', price: 300, totalPrice: 4200 },
            { name: 'Omeprazole', dosage: '20mg', frequency: '1x daily', duration: '14 days', price: 150, totalPrice: 2100 }
          ]
        },
        {
          patientName: 'Ruth Mekonnen',
          medications: [
            { name: 'Metformin', dosage: '500mg', frequency: '2x daily', duration: '30 days', price: 100, totalPrice: 6000 },
            { name: 'Gliclazide', dosage: '80mg', frequency: '1x daily', duration: '30 days', price: 200, totalPrice: 6000 },
            { name: 'Atorvastatin', dosage: '20mg', frequency: '1x daily', duration: '30 days', price: 300, totalPrice: 9000 }
          ]
        }
      ];
      
      // Create notifications
      for (const testData of testNotifications) {
        const totalAmount = testData.medications.reduce((sum, med) => sum + med.totalPrice, 0);
        
        const notification = new Notification({
          title: 'Medication Payment Required',
          message: `Medication payment required for ${testData.patientName}. Total amount: ${totalAmount}`,
          type: 'medication_payment_required',
          senderId: 'test-doctor',
          senderRole: 'doctor',
          recipientRole: 'reception',
          priority: 'high',
          data: {
            prescriptionId: `test-prescription-${Date.now()}-${Math.random()}`,
            patientId: `test-patient-${Date.now()}-${Math.random()}`,
            patientName: testData.patientName,
            totalAmount: totalAmount,
            medications: testData.medications.map((med, index) => ({
              ...med,
              quantity: 1,
              inventoryItemId: `inventory-${index + 1}`,
              prescriptionId: `test-prescription-${Date.now()}-${Math.random()}`
            }))
          },
          read: false
        });
        
        await notification.save();
        console.log(`✅ Created notification for ${testData.patientName} with ${testData.medications.length} medications (ETB ${totalAmount})`);
      }
      
      // Verify all notifications were created correctly
      console.log('\n📋 Verifying all notifications...');
      const allNotifications = await Notification.find({ 
        'data.patientName': { $in: ['James Natan', 'Yohannes Sami', 'Ruth Mekonnen'] }
      }).sort({ timestamp: -1 });
      
      console.log(`Found ${allNotifications.length} test notifications:\n`);
      
      allNotifications.forEach((notification, index) => {
        console.log(`${index + 1}. ${notification.data.patientName}`);
        console.log(`   Total Amount: ETB ${notification.data.totalAmount}`);
        console.log(`   Medications: ${notification.data.medications.length}`);
        notification.data.medications.forEach((med, medIndex) => {
          console.log(`     ${medIndex + 1}. ${med.name}: ETB ${med.totalPrice}`);
        });
        console.log('');
      });
      
      console.log('✅ Multi-medication notification test completed successfully!');
      console.log('💡 The frontend should now display individual medications in the notification list.');
      
    } catch (error) {
      console.error('❌ Error:', error);
    } finally {
      mongoose.connection.close();
    }
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
  }); 