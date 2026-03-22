const { MongoClient } = require('mongodb');
require('dotenv').config();

async function listPrescriptions() {
    let client;
    try {
        console.log('📋 Listing available prescriptions...');
        
        client = new MongoClient(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 15000,
        });
        
        await client.connect();
        console.log('✅ Connected to MongoDB');
        
        const db = client.db('clinic-cms');
        const prescriptionsCollection = db.collection('prescriptions');
        
        // Get all prescriptions
        const prescriptions = await prescriptionsCollection.find({}).limit(20).toArray();
        
        console.log(`\n📋 Found ${prescriptions.length} prescriptions:`);
        prescriptions.forEach((pres, index) => {
            console.log(`\n   ${index + 1}. Prescription Number: ${pres.prescriptionNumber}`);
            console.log(`      Patient: ${pres.patientName || 'N/A'}`);
            console.log(`      Medication: ${pres.medicationName || 'N/A'}`);
            console.log(`      Frequency: ${pres.frequency || 'N/A'}`);
            console.log(`      Duration: ${pres.duration || 'N/A'}`);
            console.log(`      Quantity: ${pres.quantity || 'N/A'}`);
            console.log(`      Total Cost: ${pres.totalCost || 'N/A'}`);
            
            if (pres.extensionDetails) {
                console.log(`      Extension: ${pres.extensionDetails.extensionType || 'N/A'}`);
                console.log(`      Additional Doses: ${pres.extensionDetails.additionalDoses || 'N/A'}`);
                console.log(`      Total Doses: ${pres.extensionDetails.totalDoses || 'N/A'}`);
            }
        });
        
        // Also check for prescriptions with similar numbers
        console.log('\n🔍 Searching for similar prescription numbers...');
        const similarPrescriptions = await prescriptionsCollection.find({
            prescriptionNumber: { $regex: '1756050551565', $options: 'i' }
        }).toArray();
        
        if (similarPrescriptions.length > 0) {
            console.log(`\n📋 Found ${similarPrescriptions.length} similar prescriptions:`);
            similarPrescriptions.forEach((pres, index) => {
                console.log(`   ${index + 1}. ${pres.prescriptionNumber} - ${pres.patientName || 'N/A'}`);
            });
        } else {
            console.log('   No similar prescription numbers found');
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

listPrescriptions();
