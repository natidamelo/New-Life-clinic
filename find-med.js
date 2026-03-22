const { MongoClient } = require('mongodb');
require('dotenv').config();

async function findMedication() {
    let client;
    try {
        console.log('🔍 Finding medication MED-1756050551565-2mvps...');
        
        client = new MongoClient(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 15000,
        });
        
        await client.connect();
        console.log('✅ Connected to MongoDB');
        
        const db = client.db('clinic-cms');
        const prescriptionsCollection = db.collection('prescriptions');
        
        // Find the prescription
        const prescription = await prescriptionsCollection.findOne({
            prescriptionNumber: 'MED-1756050551565-2mvps'
        });
        
        if (!prescription) {
            console.log('❌ Prescription MED-1756050551565-2mvps not found');
            
            // Let's check what prescriptions exist
            const allPrescriptions = await prescriptionsCollection.find({}).limit(5).toArray();
            console.log('\n📋 Available prescriptions (first 5):');
            allPrescriptions.forEach((pres, index) => {
                console.log(`   ${index + 1}. ${pres.prescriptionNumber} - ${pres.patientName || 'N/A'} - ${pres.medicationName || 'N/A'}`);
            });
            return;
        }
        
        console.log('\n📋 Prescription Found:');
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
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (client) {
            await client.close();
            console.log('\n✅ Database connection closed');
        }
    }
}

findMedication();
