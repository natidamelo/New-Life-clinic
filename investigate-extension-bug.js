const { MongoClient } = require('mongodb');
require('dotenv').config();

async function investigateExtensionBug() {
    let client;
    try {
        console.log('🔍 Investigating the root cause of BID extension bug...');
        
        client = new MongoClient(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 15000,
        });
        
        await client.connect();
        console.log('✅ Connected to MongoDB');
        
        const db = client.db('clinic-cms');
        const medicalInvoicesCollection = db.collection('medicalinvoices');
        const prescriptionsCollection = db.collection('prescriptions');
        const patientsCollection = db.collection('patients');
        
        // Find Natan Kinfe patient
        const natanPatient = await patientsCollection.findOne({
            firstName: 'Natan',
            lastName: 'Kinfe'
        });
        
        if (!natanPatient) {
            console.log('❌ Natan Kinfe patient not found');
            return;
        }
        
        console.log(`📋 Found patient: ${natanPatient.firstName} ${natanPatient.lastName} (ID: ${natanPatient._id})`);
        
        // Get Natan's prescription
        const natanPrescription = await prescriptionsCollection.findOne({
            patientName: 'Natan Kinfe'
        });
        
        if (!natanPrescription) {
            console.log('❌ Natan prescription not found');
            return;
        }
        
        console.log(`\n🔍 Natan's Prescription:`);
        console.log(`   Medication: ${natanPrescription.medicationName}`);
        console.log(`   Frequency: ${natanPrescription.frequency}`);
        console.log(`   Duration: ${natanPrescription.duration}`);
        console.log(`   Status: ${natanPrescription.status}`);
        
        if (natanPrescription.extensionDetails) {
            console.log(`\n📋 Extension Details:`);
            console.log(`   Original Duration: ${natanPrescription.extensionDetails.originalDuration}`);
            console.log(`   Additional Days: ${natanPrescription.extensionDetails.additionalDays}`);
            console.log(`   Additional Doses: ${natanPrescription.extensionDetails.additionalDoses}`);
            console.log(`   New Total Days: ${natanPrescription.extensionDetails.newTotalDays}`);
            console.log(`   New Total Doses: ${natanPrescription.extensionDetails.newTotalDoses}`);
            console.log(`   Extension Date: ${natanPrescription.extensionDetails.extensionDate}`);
            console.log(`   Reason: ${natanPrescription.extensionDetails.reason}`);
            
            if (natanPrescription.extensionDetails.calculationDetails) {
                console.log(`\n🧮 Calculation Details:`);
                console.log(`   Original Frequency: ${natanPrescription.extensionDetails.calculationDetails.originalFrequency}`);
                console.log(`   Extension Frequency: ${natanPrescription.extensionDetails.calculationDetails.extensionFrequency}`);
                console.log(`   Doses Per Day: ${natanPrescription.extensionDetails.calculationDetails.dosesPerDay}`);
                console.log(`   Extension Type: ${natanPrescription.extensionDetails.calculationDetails.extensionType}`);
                console.log(`   Calculation Method: ${natanPrescription.extensionDetails.calculationDetails.calculationMethod}`);
                console.log(`   Frequency Changed: ${natanPrescription.extensionDetails.calculationDetails.frequencyChanged}`);
            }
        }
        
        // Get all extension invoices for Natan, sorted by creation date
        const extensionInvoices = await medicalInvoicesCollection.find({
            patientName: 'Natan Kinfe',
            invoiceNumber: { $regex: /EXT/ }
        }).sort({ createdAt: -1 }).toArray();
        
        console.log(`\n📋 Found ${extensionInvoices.length} extension invoices (newest first):`);
        
        extensionInvoices.forEach((invoice, index) => {
            console.log(`\n   Extension Invoice ${index + 1} (${invoice.createdAt ? new Date(invoice.createdAt).toLocaleString() : 'No date'}):`);
            console.log(`   Invoice Number: ${invoice.invoiceNumber}`);
            console.log(`   Status: ${invoice.status}`);
            console.log(`   Total: ${invoice.total} ETB`);
            console.log(`   Balance: ${invoice.balance} ETB`);
            
            if (invoice.items && invoice.items.length > 0) {
                invoice.items.forEach((item, itemIndex) => {
                    console.log(`     Item ${itemIndex + 1}: ${item.description}`);
                    console.log(`       Quantity: ${item.quantity}`);
                    console.log(`       Unit Price: ${item.unitPrice} ETB`);
                    console.log(`       Total: ${item.total} ETB`);
                    
                    if (item.metadata) {
                        console.log(`       Metadata:`, item.metadata);
                    }
                });
            }
            
            if (invoice.extensionDetails) {
                console.log(`   Extension Details:`, invoice.extensionDetails);
            }
        });
        
        // Analyze the latest extension invoice to find the bug
        const latestInvoice = extensionInvoices[0];
        if (latestInvoice) {
            console.log(`\n🔍 BUG ANALYSIS - Latest Extension Invoice:`);
            console.log(`   Invoice: ${latestInvoice.invoiceNumber}`);
            console.log(`   Description: ${latestInvoice.items?.[0]?.description || 'No description'}`);
            console.log(`   Quantity: ${latestInvoice.items?.[0]?.quantity || 0} doses`);
            console.log(`   Total: ${latestInvoice.total || 0} ETB`);
            
            // Check if this was supposed to be BID but was calculated as QD
            const description = latestInvoice.items?.[0]?.description || '';
            const quantity = latestInvoice.items?.[0]?.quantity || 0;
            const total = latestInvoice.total || 0;
            
            // Expected BID calculation: 2 days × 2 doses/day = 4 doses = 1200 ETB
            const expectedBIDDoses = 4;
            const expectedBIDCost = 1200;
            
            // Actual calculation: 2 days × 1 dose/day = 2 doses = 600 ETB
            const actualDoses = quantity;
            const actualCost = total;
            
            console.log(`\n🧮 BUG IDENTIFICATION:`);
            console.log(`   Expected BID (2 days × 2 doses/day): ${expectedBIDDoses} doses, ${expectedBIDCost} ETB`);
            console.log(`   Actual calculation: ${actualDoses} doses, ${actualCost} ETB`);
            
            if (actualDoses === 2 && actualCost === 600) {
                console.log(`   ❌ BUG CONFIRMED: 2-day BID extension was calculated as QD (2 doses instead of 4)`);
                console.log(`   🔍 Root cause: Frequency was interpreted as QD instead of BID`);
            } else if (actualDoses === 4 && actualCost === 1200) {
                console.log(`   ✅ CORRECT: 2-day BID extension was calculated correctly (4 doses, 1200 ETB)`);
            } else {
                console.log(`   ⚠️ UNEXPECTED: Extension calculation doesn't match expected patterns`);
            }
            
            // Check the extension details in the invoice
            if (latestInvoice.extensionDetails) {
                console.log(`\n📋 Invoice Extension Details:`);
                console.log(`   Additional Days: ${latestInvoice.extensionDetails.additionalDays}`);
                console.log(`   Additional Doses: ${latestInvoice.extensionDetails.additionalDoses}`);
                console.log(`   Doses Per Day: ${latestInvoice.extensionDetails.dosesPerDay}`);
                console.log(`   Frequency: ${latestInvoice.extensionDetails.frequency}`);
                console.log(`   Extension Type: ${latestInvoice.extensionDetails.extensionType}`);
            }
        }
        
        // Check the prescription extension details
        if (natanPrescription.extensionDetails) {
            console.log(`\n📋 Prescription Extension Details:`);
            console.log(`   Additional Days: ${natanPrescription.extensionDetails.additionalDays}`);
            console.log(`   Additional Doses: ${natanPrescription.extensionDetails.additionalDoses}`);
            console.log(`   Frequency: ${natanPrescription.extensionDetails.frequency}`);
            
            if (natanPrescription.extensionDetails.calculationDetails) {
                console.log(`   Extension Frequency: ${natanPrescription.extensionDetails.calculationDetails.extensionFrequency}`);
                console.log(`   Doses Per Day: ${natanPrescription.extensionDetails.calculationDetails.dosesPerDay}`);
            }
        }
        
        console.log(`\n🔍 ROOT CAUSE ANALYSIS:`);
        console.log(`   1. Frontend sends extension request with frequency information`);
        console.log(`   2. Backend processes extension and stores frequency in prescription`);
        console.log(`   3. Invoice creation reads frequency from prescription or extension details`);
        console.log(`   4. If frequency is lost or misinterpreted, QD (1 dose/day) is used as default`);
        console.log(`   5. This causes BID extensions to be calculated as QD (2 days × 1 dose/day = 2 doses)`);
        
        console.log(`\n💡 POTENTIAL FIXES:`);
        console.log(`   1. Ensure frequency is properly passed through the entire extension chain`);
        console.log(`   2. Add frequency validation in invoice creation`);
        console.log(`   3. Use explicit frequency from extension request instead of prescription frequency`);
        console.log(`   4. Add logging to track frequency through each step`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (client) {
            await client.close();
            console.log('\n✅ Database connection closed');
        }
    }
}

investigateExtensionBug();
