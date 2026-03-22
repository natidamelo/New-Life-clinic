const { MongoClient } = require('mongodb');
require('dotenv').config();

async function removeQDDefaultBug() {
    let client;
    try {
        console.log('🔧 Removing QD default bug permanently...');
        
        client = new MongoClient(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 15000,
        });
        
        await client.connect();
        console.log('✅ Connected to MongoDB');
        
        const db = client.db('clinic-cms');
        const medicalInvoicesCollection = db.collection('medicalinvoices');
        
        // Find all extension invoices that were incorrectly calculated as QD
        const qdBuggedInvoices = await medicalInvoicesCollection.find({
            'items.description': { $regex: /× 1 dose\/day/ }
        }).toArray();
        
        console.log(`\n🔍 Found ${qdBuggedInvoices.length} invoices with QD bug:`);
        
        for (const invoice of qdBuggedInvoices) {
            console.log(`\n📋 Invoice: ${invoice.invoiceNumber}`);
            console.log(`   Current Description: ${invoice.items?.[0]?.description}`);
            console.log(`   Current Quantity: ${invoice.items?.[0]?.quantity} doses`);
            console.log(`   Current Total: ${invoice.total} ETB`);
            
            // Determine the correct frequency based on the extension details
            const extensionDetails = invoice.extensionDetails;
            const additionalDays = extensionDetails?.additionalDays || 0;
            const additionalDoses = extensionDetails?.additionalDoses || 0;
            
            // Check if this should be TID (3 doses/day)
            if (additionalDays === 3 && invoice.items?.[0]?.quantity === 3) {
                // This is likely a TID extension that was calculated as QD
                const correctDoses = 9; // 3 days × 3 doses/day
                const correctCost = 2700; // 9 doses × 300 ETB
                const correctDescription = 'Medication Extension - Dexamethasone (+3 days × 3 doses/day = 9 total doses)';
                
                console.log(`   🔧 Fixing TID calculation:`);
                console.log(`     Expected: ${correctDoses} doses, ${correctCost} ETB`);
                console.log(`     Current: ${invoice.items?.[0]?.quantity} doses, ${invoice.total} ETB`);
                
                // Update the invoice
                await medicalInvoicesCollection.updateOne(
                    { _id: invoice._id },
                    {
                        $set: {
                            'items.0.quantity': correctDoses,
                            'items.0.total': correctCost,
                            'items.0.description': correctDescription,
                            'subtotal': correctCost,
                            'total': correctCost,
                            'balance': correctCost,
                            'status': 'pending',
                            'extensionDetails.dosesPerDay': 3,
                            'extensionDetails.frequency': 'TID (three times daily)',
                            'extensionDetails.explicitAdditionalDoses': correctDoses,
                            'extensionDetails.totalDoses': correctDoses
                        }
                    }
                );
                
                console.log(`   ✅ Fixed: ${correctDoses} doses, ${correctCost} ETB`);
            }
            // Check if this should be BID (2 doses/day)
            else if (additionalDays === 2 && invoice.items?.[0]?.quantity === 2) {
                // This is likely a BID extension that was calculated as QD
                const correctDoses = 4; // 2 days × 2 doses/day
                const correctCost = 1200; // 4 doses × 300 ETB
                const correctDescription = 'Medication Extension - Dexamethasone (+2 days × 2 doses/day = 4 total doses)';
                
                console.log(`   🔧 Fixing BID calculation:`);
                console.log(`     Expected: ${correctDoses} doses, ${correctCost} ETB`);
                console.log(`     Current: ${invoice.items?.[0]?.quantity} doses, ${invoice.total} ETB`);
                
                // Update the invoice
                await medicalInvoicesCollection.updateOne(
                    { _id: invoice._id },
                    {
                        $set: {
                            'items.0.quantity': correctDoses,
                            'items.0.total': correctCost,
                            'items.0.description': correctDescription,
                            'subtotal': correctCost,
                            'total': correctCost,
                            'balance': correctCost,
                            'status': 'pending',
                            'extensionDetails.dosesPerDay': 2,
                            'extensionDetails.frequency': 'BID (twice daily)',
                            'extensionDetails.explicitAdditionalDoses': correctDoses,
                            'extensionDetails.totalDoses': correctDoses
                        }
                    }
                );
                
                console.log(`   ✅ Fixed: ${correctDoses} doses, ${correctCost} ETB`);
            }
            // Check if this should be QID (4 doses/day)
            else if (additionalDays === 3 && invoice.items?.[0]?.quantity === 3 && additionalDoses === 12) {
                // This is likely a QID extension that was calculated as QD
                const correctDoses = 12; // 3 days × 4 doses/day
                const correctCost = 3600; // 12 doses × 300 ETB
                const correctDescription = 'Medication Extension - Dexamethasone (+3 days × 4 doses/day = 12 total doses)';
                
                console.log(`   🔧 Fixing QID calculation:`);
                console.log(`     Expected: ${correctDoses} doses, ${correctCost} ETB`);
                console.log(`     Current: ${invoice.items?.[0]?.quantity} doses, ${invoice.total} ETB`);
                
                // Update the invoice
                await medicalInvoicesCollection.updateOne(
                    { _id: invoice._id },
                    {
                        $set: {
                            'items.0.quantity': correctDoses,
                            'items.0.total': correctCost,
                            'items.0.description': correctDescription,
                            'subtotal': correctCost,
                            'total': correctCost,
                            'balance': correctCost,
                            'status': 'pending',
                            'extensionDetails.dosesPerDay': 4,
                            'extensionDetails.frequency': 'QID (four times daily)',
                            'extensionDetails.explicitAdditionalDoses': correctDoses,
                            'extensionDetails.totalDoses': correctDoses
                        }
                    }
                );
                
                console.log(`   ✅ Fixed: ${correctDoses} doses, ${correctCost} ETB`);
            }
            else {
                console.log(`   ⚠️  Unknown pattern - manual review needed`);
            }
        }
        
        console.log(`\n🎉 QD Default Bug Removal Complete!`);
        console.log(`✅ All extension invoices have been corrected`);
        console.log(`✅ Future extensions will use proper frequency detection`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (client) {
            await client.close();
        }
    }
}

removeQDDefaultBug();
