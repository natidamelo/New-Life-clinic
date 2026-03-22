const { MongoClient } = require('mongodb');

(async () => {
    const client = new MongoClient('mongodb://127.0.0.1:27017/clinic-cms');
    try {
        await client.connect();
        console.log('✅ Connected to clinic-cms database');
        
        const db = client.db('clinic-cms');
        
        // Force complete refresh of Hebron's notification data
        console.log('\n🔔 Force refreshing Hebron\'s notification data...');
        
        // First, let's see what's currently in the database
        const currentNotifications = await db.collection('notifications').find({
            'data.patientName': { $regex: /hebron/i },
            type: 'medication_payment_required'
        }).toArray();
        
        console.log('\n📋 Current notification data:');
        currentNotifications.forEach((notif, index) => {
            console.log(`\nNotification ${index + 1}:`);
            console.log(`  ID: ${notif._id}`);
            console.log(`  Patient: ${notif.data.patientName}`);
            console.log(`  Total Amount: ${notif.data.totalAmount}`);
            console.log(`  Extension Details:`, notif.data.extensionDetails);
        });
        
        // Force update with correct data - COMPLETE OVERWRITE
        console.log('\n🔧 Force updating notification with correct data...');
        
        const updateResult = await db.collection('notifications').updateMany(
            { 
                'data.patientName': { $regex: /hebron/i }, 
                type: 'medication_payment_required' 
            },
            {
                $set: {
                    // Force correct amounts
                    'data.totalAmount': 500,
                    'data.amount': 500,
                    'data.extensionCost': 500,
                    'data.outstandingAmount': 500,
                    
                    // Force correct extension details - OVERWRITE EVERYTHING
                    'data.extensionDetails': {
                        additionalDays: 0,
                        additionalDoses: 2,
                        dosesPerDay: 2,
                        totalDoses: 2,
                        calculatedTotalDoses: 2,
                        newTotalDoses: 2,
                        billingUnits: 2
                    },
                    
                    // Force correct medication details
                    'data.medications': [{
                        totalDoses: 2,
                        additionalDoses: 2,
                        totalPrice: 500,
                        dosesPerDay: 2,
                        extensionCost: 500
                    }],
                    
                    // Force correct top-level data
                    'data.additionalDoses': 2,
                    'data.additionalDays': 0,
                    'data.dosesPerDay': 2,
                    'data.billingUnits': 2,
                    'data.totalDoses': 2,
                    'data.calculatedTotalDoses': 2,
                    'data.newTotalDoses': 2,
                    
                    // Force correct description
                    'data.description': 'Payment required for 2 additional doses of medication treatment.'
                }
            }
        );
        
        console.log(`✅ Force updated ${updateResult.modifiedCount} notifications`);
        
        // Verify the fix
        console.log('\n🔍 Verifying the force update...');
        const updatedNotifications = await db.collection('notifications').find({
            'data.patientName': { $regex: /hebron/i },
            type: 'medication_payment_required'
        }).toArray();
        
        updatedNotifications.forEach((notif, index) => {
            console.log(`\nUpdated Notification ${index + 1}:`);
            console.log(`  Patient: ${notif.data.patientName}`);
            console.log(`  Total Amount: ${notif.data.totalAmount}`);
            console.log(`  Extension Details:`, notif.data.extensionDetails);
            console.log(`  Description: ${notif.data.description}`);
        });
        
        console.log('\n🎉 FORCE REFRESH COMPLETED!');
        console.log('📋 Summary:');
        console.log('   - Completely overwrote notification data');
        console.log('   - Forced all amounts to ETB 500.00');
        console.log('   - Forced all doses to 2');
        console.log('   - Updated description to show "2 additional doses"');
        console.log('\n🔄 Please refresh your browser completely (Ctrl+F5) - payment dialog should now show ETB 500.00 for 2 doses');
        
    } catch (e) { 
        console.error('❌ Error:', e); 
    } finally { 
        await client.close(); 
        console.log('🔌 Disconnected');
    }
})();
