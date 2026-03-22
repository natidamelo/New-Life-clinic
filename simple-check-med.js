const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkMedication() {
    let client;
    try {
        console.log('🔍 Checking medication MED-1756050551565-2mvps...');
        
        // Connect directly to MongoDB without Mongoose
        client = new MongoClient(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 15000,
        });
        
        await client.connect();
        console.log('✅ Connected to MongoDB');
        
        const db = client.db('clinic-cms');
        const prescriptionsCollection = db.collection('prescriptions');
        const invoicesCollection = db.collection('medicalinvoices');
        
        // Find the prescription
        const prescription = await prescriptionsCollection.findOne({
            prescriptionNumber: 'MED-1756050551565-2mvps'
        });
        
        if (!prescription) {
            console.log('❌ Prescription MED-1756050551565-2mvps not found');
            return;
        }
        
        console.log('\n📋 Prescription Details:');
        console.log(`   Prescription Number: ${prescription.prescriptionNumber}`);
        console.log(`   Patient: ${prescription.patientName || 'N/A'}`);
        console.log(`   Medication: ${prescription.medicationName || 'N/A'}`);
        console.log(`   Frequency: ${prescription.frequency || 'N/A'}`);
        console.log(`   Duration: ${prescription.duration || 'N/A'}`);
        console.log(`   Dosage: ${prescription.dosage || 'N/A'}`);
        console.log(`   Quantity: ${prescription.quantity || 'N/A'}`);
        console.log(`   Total Cost: ${prescription.totalCost || 'N/A'}`);
        
        if (prescription.extensionDetails) {
            console.log('\n🔧 Extension Details:');
            console.log(`   Extension Type: ${prescription.extensionDetails.extensionType || 'N/A'}`);
            console.log(`   Additional Days: ${prescription.extensionDetails.additionalDays || 'N/A'}`);
            console.log(`   Additional Doses: ${prescription.extensionDetails.additionalDoses || 'N/A'}`);
            console.log(`   Total Doses: ${prescription.extensionDetails.totalDoses || 'N/A'}`);
            console.log(`   Doses Per Day: ${prescription.extensionDetails.dosesPerDay || 'N/A'}`);
            console.log(`   Frequency: ${prescription.extensionDetails.frequency || 'N/A'}`);
        }
        
        // Check for related invoices
        const invoices = await invoicesCollection.find({
            $or: [
                { prescriptionId: prescription._id },
                { "extensionDetails.originalPrescriptionId": prescription._id }
            ]
        }).toArray();
        
        if (invoices.length > 0) {
            console.log('\n💰 Related Invoices:');
            invoices.forEach((invoice, index) => {
                console.log(`\n   Invoice ${index + 1}:`);
                console.log(`     Invoice Number: ${invoice.invoiceNumber}`);
                console.log(`     Total: ${invoice.total} ETB`);
                console.log(`     Balance: ${invoice.balance} ETB`);
                console.log(`     Status: ${invoice.status}`);
                
                if (invoice.items && invoice.items.length > 0) {
                    invoice.items.forEach((item, itemIndex) => {
                        console.log(`     Item ${itemIndex + 1}:`);
                        console.log(`       Description: ${item.description}`);
                        console.log(`       Quantity: ${item.quantity}`);
                        console.log(`       Unit Price: ${item.unitPrice} ETB`);
                        console.log(`       Total: ${item.total} ETB`);
                        
                        if (item.metadata) {
                            console.log(`       Metadata:`);
                            console.log(`         Doses Per Day: ${item.metadata.dosesPerDay || 'N/A'}`);
                            console.log(`         Frequency: ${item.metadata.frequency || 'N/A'}`);
                            console.log(`         Additional Doses: ${item.metadata.additionalDoses || 'N/A'}`);
                            console.log(`         Total Doses: ${item.metadata.totalDoses || 'N/A'}`);
                        }
                    });
                }
            });
        } else {
            console.log('\n💰 No related invoices found');
        }
        
        // Simple frequency analysis
        console.log('\n🧮 Calculation Analysis:');
        const frequency = prescription.frequency || prescription.extensionDetails?.frequency || '';
        const duration = prescription.duration || prescription.extensionDetails?.additionalDays || '';
        
        console.log(`   Raw Frequency: "${frequency}"`);
        console.log(`   Raw Duration: "${duration}"`);
        
        // Simple frequency detection
        let dosesPerDay = 1;
        if (frequency.toUpperCase().includes('BID')) dosesPerDay = 2;
        else if (frequency.toUpperCase().includes('TID')) dosesPerDay = 3;
        else if (frequency.toUpperCase().includes('QID')) dosesPerDay = 4;
        else if (frequency.toUpperCase().includes('QD') || frequency.toUpperCase().includes('ONCE')) dosesPerDay = 1;
        
        console.log(`   Detected Doses Per Day: ${dosesPerDay}`);
        
        // Extract days from duration
        const daysMatch = duration.toString().match(/(\d+)/);
        const days = daysMatch ? parseInt(daysMatch[1]) : 0;
        console.log(`   Days: ${days}`);
        
        const expectedDoses = dosesPerDay * days;
        console.log(`   Expected Total Doses: ${expectedDoses} (${days} days × ${dosesPerDay} doses/day)`);
        
        // Check if there's a mismatch
        if (prescription.extensionDetails && prescription.extensionDetails.totalDoses) {
            const actualDoses = prescription.extensionDetails.totalDoses;
            console.log(`   Actual Total Doses: ${actualDoses}`);
            
            if (actualDoses !== expectedDoses) {
                console.log(`   ⚠️  MISMATCH DETECTED! Expected ${expectedDoses} but got ${actualDoses}`);
            } else {
                console.log(`   ✅ Calculation is correct`);
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (client) {
            await client.close();
            console.log('\n✅ Database connection closed');
        }
    }
}

checkMedication();
