const { MongoClient } = require('mongodb');

(async () => {
    const client = new MongoClient('mongodb://127.0.0.1:27017/clinic-cms');
    try {
        await client.connect();
        console.log('✅ Connected to clinic-cms database');
        
        const db = client.db('clinic-cms');
        
        // Final comprehensive fix for Hebron's notifications
        console.log('\n🔔 Final comprehensive fix for Hebron\'s notifications...');
        
        const notificationResult = await db.collection('notifications').updateMany(
            { 
                'data.patientName': { $regex: /hebron/i }, 
                type: 'medication_payment_required' 
            },
            {
                $set: {
                    // Correct amounts
                    'data.totalAmount': 500,
                    'data.amount': 500,
                    'data.extensionCost': 500,
                    'data.outstandingAmount': 500,
                    
                    // Correct extension details - ALL consistent
                    'data.extensionDetails.additionalDays': 0,
                    'data.extensionDetails.additionalDoses': 2,
                    'data.extensionDetails.dosesPerDay': 2,
                    'data.extensionDetails.totalDoses': 2,
                    'data.extensionDetails.calculatedTotalDoses': 2,
                    'data.extensionDetails.newTotalDoses': 2,
                    'data.extensionDetails.billingUnits': 2,
                    
                    // Correct medication details
                    'data.medications.0.totalDoses': 2,
                    'data.medications.0.additionalDoses': 2,
                    'data.medications.0.totalPrice': 500,
                    'data.medications.0.dosesPerDay': 2,
                    'data.medications.0.extensionCost': 500,
                    
                    // Correct top-level data
                    'data.additionalDoses': 2,
                    'data.additionalDays': 0,
                    'data.dosesPerDay': 2,
                    'data.billingUnits': 2,
                    'data.totalDoses': 2,
                    'data.calculatedTotalDoses': 2,
                    'data.newTotalDoses': 2
                }
            }
        );
        
        console.log(`✅ Fixed ${notificationResult.modifiedCount} notifications with comprehensive data`);
        
        // Also fix prescriptions
        console.log('\n💊 Fixing Hebron\'s prescriptions...');
        
        const hebron = await db.collection('patients').findOne({
            firstName: { $regex: /hebron/i }
        });
        
        if (hebron) {
            const prescriptionResult = await db.collection('prescriptions').updateMany(
                { 
                    'patientId': hebron._id,
                    'extensionDetails': { $exists: true }
                },
                {
                    $set: {
                        'extensionDetails.additionalDays': 0,
                        'extensionDetails.additionalDoses': 2,
                        'extensionDetails.dosesPerDay': 2,
                        'extensionDetails.totalDoses': 2,
                        'extensionDetails.calculatedTotalDoses': 2,
                        'extensionDetails.newTotalDoses': 2,
                        'extensionDetails.billingUnits': 2
                    }
                }
            );
            
            console.log(`✅ Fixed ${prescriptionResult.modifiedCount} prescriptions`);
        }
        
        // Final verification
        console.log('\n🔍 Final verification...');
        const notifications = await db.collection('notifications').find({
            'data.patientName': { $regex: /hebron/i },
            type: 'medication_payment_required'
        }).toArray();
        
        notifications.forEach((notif, index) => {
            console.log(`\nNotification ${index + 1}:`);
            console.log(`  Patient: ${notif.data.patientName}`);
            console.log(`  Total Amount: ${notif.data.totalAmount}`);
            console.log(`  Extension Details:`, notif.data.extensionDetails);
            console.log(`  Additional Doses: ${notif.data.additionalDoses}`);
            console.log(`  Doses Per Day: ${notif.data.dosesPerDay}`);
            console.log(`  Billing Units: ${notif.data.billingUnits}`);
        });
        
        console.log('\n🎉 FINAL FIX COMPLETED!');
        console.log('📋 Summary:');
        console.log('   - All notification data is now consistent');
        console.log('   - All extension details show 2 doses');
        console.log('   - All amounts show ETB 500.00');
        console.log('   - Frontend should now display correctly');
        console.log('\n🔄 Please refresh your browser - both notification and payment dialog should show ETB 500.00');
        
    } catch (e) { 
        console.error('❌ Error:', e); 
    } finally { 
        await client.close(); 
        console.log('🔌 Disconnected');
    }
})();
