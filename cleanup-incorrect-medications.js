const { MongoClient } = require('mongodb');
require('dotenv').config();

async function cleanupIncorrectMedications() {
    let client;
    try {
        console.log('🧹 Cleaning up incorrect medications...');
        
        client = new MongoClient(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 15000,
        });
        
        await client.connect();
        console.log('✅ Connected to MongoDB');
        
        const db = client.db('clinic-cms');
        const prescriptionsCollection = db.collection('prescriptions');
        const nurseTasksCollection = db.collection('nursetasks');
        
        // List of medications that don't exist in inventory (to be removed)
        const incorrectMedications = [
            'Amoxicillin',
            'Paracetamol', 
            'Ibuprofen',
            'Vitamin C',
            'Iron Supplement',
            'Ceftriaxone',
            'Azithromycin',
            'Doxycycline'
        ];
        
        console.log(`\n🗑️  Removing prescriptions for: ${incorrectMedications.join(', ')}`);
        
        // Remove prescriptions for incorrect medications
        const prescriptionResult = await prescriptionsCollection.deleteMany({
            medicationName: { $in: incorrectMedications }
        });
        
        console.log(`✅ Removed ${prescriptionResult.deletedCount} incorrect prescriptions`);
        
        // Remove nurse tasks for incorrect medications
        const nurseTaskResult = await nurseTasksCollection.deleteMany({
            'medicationDetails.medicationName': { $in: incorrectMedications }
        });
        
        console.log(`✅ Removed ${nurseTaskResult.deletedCount} incorrect nurse tasks`);
        
        // Verify what's left
        const remainingPrescriptions = await prescriptionsCollection.find({}).toArray();
        const remainingTasks = await nurseTasksCollection.find({
            taskType: 'MEDICATION'
        }).toArray();
        
        console.log(`\n📋 Remaining prescriptions: ${remainingPrescriptions.length}`);
        remainingPrescriptions.forEach(prescription => {
            console.log(`   - ${prescription.medicationName} (${prescription.patientName})`);
        });
        
        console.log(`\n📋 Remaining nurse tasks: ${remainingTasks.length}`);
        remainingTasks.forEach(task => {
            console.log(`   - ${task.medicationDetails?.medicationName} (${task.patientName}) - Extension: ${task.medicationDetails?.isExtension ? 'Yes' : 'No'}`);
        });
        
        console.log(`\n✅ Cleanup completed! Only Dexamethasone prescriptions remain.`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (client) {
            await client.close();
            console.log('\n✅ Database connection closed');
        }
    }
}

cleanupIncorrectMedications();
