const { MongoClient } = require('mongodb');
require('dotenv').config();

async function quickFixHebron() {
    let client;
    try {
        console.log('🔧 Quick fix for Hebron Dawit\'s notification/payment discrepancy...');
        
        // Connect directly to MongoDB
        client = new MongoClient(process.env.MONGODB_URI);
        await client.connect();
        console.log('✅ Connected to MongoDB');
        
        const db = client.db();
        
        // Fix all notifications for Hebron Dawit
        console.log('\n🔔 Fixing notifications...');
        
        const notificationResult = await db.collection('notifications').updateMany(
            {
                'data.patientName': { $regex: /hebron/i },
                type: 'medication_payment_required'
            },
            {
                $set: {
                    'data.totalAmount': 500,
                    'data.amount': 500,
                    'data.extensionCost': 500,
                    'data.extensionDetails.additionalDays': 0,
                    'data.extensionDetails.additionalDoses': 2,
                    'data.billingUnits': 2,
                    'data.medications.0.totalDoses': 2,
                    'data.medications.0.additionalDoses': 2,
                    'data.medications.0.totalPrice': 500
                }
            }
        );
        
        console.log(`✅ Fixed ${notificationResult.modifiedCount} notifications`);
        
        // Fix all invoices for Hebron Dawit
        console.log('\n📄 Fixing invoices...');
        
        // First find Hebron's patient ID
        const hebron = await db.collection('patients').findOne({
            firstName: { $regex: /hebron/i }
        });
        
        if (hebron) {
            console.log(`✅ Found Hebron Dawit: ${hebron.firstName} ${hebron.lastName}`);
            
            const invoiceResult = await db.collection('medicalinvoices').updateMany(
                {
                    'patientId': hebron._id,
                    'items.metadata.extension': true
                },
                [
                    {
                        $set: {
                            'items': {
                                $map: {
                                    input: '$items',
                                    as: 'item',
                                    in: {
                                        $cond: {
                                            if: { $eq: ['$$item.metadata.extension', true] },
                                            then: {
                                                $mergeObjects: [
                                                    '$$item',
                                                    {
                                                        'description': 'Medication Extension - Ceftriaxone (+2 doses)',
                                                        'quantity': 2,
                                                        'total': 500,
                                                        'metadata.additionalDays': 0,
                                                        'metadata.additionalDoses': 2,
                                                        'metadata.totalDoses': 2
                                                    }
                                                ]
                                            },
                                            else: '$$item'
                                        }
                                    }
                                }
                            }
                        }
                    },
                    {
                        $set: {
                            'subtotal': { $sum: '$items.total' },
                            'total': { $sum: '$items.total' },
                            'balance': { $subtract: [{ $sum: '$items.total' }, { $ifNull: ['$amountPaid', 0] }] }
                        }
                    }
                ]
            );
            
            console.log(`✅ Fixed ${invoiceResult.modifiedCount} invoices`);
        } else {
            console.log('❌ Hebron Dawit not found in patients collection');
        }
        
        console.log('\n🎉 Quick fix completed!');
        console.log('\n📋 Summary:');
        console.log('   - Fixed notifications to show ETB 500 for 2 doses');
        console.log('   - Fixed invoices to show ETB 500 for 2 doses');
        console.log('   - Both notification and payment dialog should now show the same amount');
        console.log('\n🔄 Please refresh your browser to see the changes');
        
    } catch (error) {
        console.error('❌ Error during quick fix:', error);
    } finally {
        if (client) {
            await client.close();
            console.log('🔌 Disconnected from MongoDB');
        }
    }
}

quickFixHebron();
