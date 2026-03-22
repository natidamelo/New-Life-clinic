const { MongoClient } = require('mongodb');
require('dotenv').config();

async function createMissingMedications() {
    let client;
    try {
        console.log('🔧 Creating missing 5 active and 3 bid extended medications...');
        
        client = new MongoClient(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 15000,
        });
        
        await client.connect();
        console.log('✅ Connected to MongoDB');
        
        const db = client.db('clinic-cms');
        const prescriptionsCollection = db.collection('prescriptions');
        const nurseTasksCollection = db.collection('nursetasks');
        const patientsCollection = db.collection('patients');
        
        // Get Natan Kinfe's patient ID (we'll use this for all medications)
        const natanPatient = await patientsCollection.findOne({ name: 'Natan Kinfe' });
        if (!natanPatient) {
            console.log('❌ Natan Kinfe patient not found');
            return;
        }
        
        const patientId = natanPatient._id;
        console.log(`📋 Using patient: ${natanPatient.name} (ID: ${patientId})`);
        
        // Create 5 active medications (QD - once daily)
        const activeMedications = [
            { name: 'Amoxicillin', dosage: '500mg', frequency: 'Once daily (QD)', duration: '7 days' },
            { name: 'Paracetamol', dosage: '500mg', frequency: 'Once daily (QD)', duration: '5 days' },
            { name: 'Ibuprofen', dosage: '400mg', frequency: 'Once daily (QD)', duration: '5 days' },
            { name: 'Vitamin C', dosage: '1000mg', frequency: 'Once daily (QD)', duration: '10 days' },
            { name: 'Iron Supplement', dosage: '200mg', frequency: 'Once daily (QD)', duration: '14 days' }
        ];
        
        // Create 3 BID extended medications
        const bidExtendedMedications = [
            { name: 'Ceftriaxone', dosage: '1g', frequency: 'BID (twice daily)', duration: '5 days', extensionDays: 3 },
            { name: 'Azithromycin', dosage: '500mg', frequency: 'BID (twice daily)', duration: '5 days', extensionDays: 2 },
            { name: 'Doxycycline', dosage: '100mg', frequency: 'BID (twice daily)', duration: '7 days', extensionDays: 3 }
        ];
        
        let createdPrescriptions = 0;
        let createdTasks = 0;
        
        // Create active medications
        console.log('\n🔧 Creating 5 active medications (QD):');
        for (const med of activeMedications) {
            console.log(`\n   Creating: ${med.name}`);
            
            // Create prescription
            const prescription = {
                patientId: patientId,
                patientName: natanPatient.name,
                medicationName: med.name,
                dosage: med.dosage,
                frequency: med.frequency,
                duration: med.duration,
                route: 'Oral',
                startDate: new Date().toISOString(),
                prescribedBy: 'system',
                prescribedByName: 'System',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            const prescriptionResult = await prescriptionsCollection.insertOne(prescription);
            console.log(`   ✅ Created prescription: ${prescriptionResult.insertedId}`);
            createdPrescriptions++;
            
            // Create nurse task
            const nurseTask = {
                patientId: patientId,
                patientName: natanPatient.name,
                taskType: 'MEDICATION',
                description: `Administer ${med.name} to ${natanPatient.name}`,
                status: 'PENDING',
                priority: 'MEDIUM',
                assignedBy: 'system',
                assignedByName: 'System',
                dueDate: new Date().toISOString(),
                medicationDetails: {
                    medicationName: med.name,
                    dosage: med.dosage,
                    frequency: med.frequency,
                    route: 'Oral',
                    duration: med.duration,
                    startDate: new Date().toISOString(),
                    isExtension: false,
                    doseRecords: []
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            // Generate dose records for QD (1 dose per day)
            const duration = parseInt(med.duration);
            const doseRecords = [];
            for (let day = 1; day <= duration; day++) {
                doseRecords.push({
                    day: day,
                    timeSlot: '09:00',
                    administered: false,
                    administeredAt: null,
                    administeredBy: null,
                    notes: ''
                });
            }
            
            nurseTask.medicationDetails.doseRecords = doseRecords;
            
            const taskResult = await nurseTasksCollection.insertOne(nurseTask);
            console.log(`   ✅ Created nurse task: ${taskResult.insertedId} (${doseRecords.length} doses)`);
            createdTasks++;
        }
        
        // Create BID extended medications
        console.log('\n🔧 Creating 3 BID extended medications:');
        for (const med of bidExtendedMedications) {
            console.log(`\n   Creating: ${med.name} (BID + ${med.extensionDays} days extension)`);
            
            // Create prescription with extension details
            const prescription = {
                patientId: patientId,
                patientName: natanPatient.name,
                medicationName: med.name,
                dosage: med.dosage,
                frequency: med.frequency,
                duration: med.duration,
                route: 'Intramuscular',
                startDate: new Date().toISOString(),
                prescribedBy: 'system',
                prescribedByName: 'System',
                extensionDetails: {
                    originalDuration: parseInt(med.duration),
                    additionalDays: med.extensionDays,
                    additionalDoses: med.extensionDays * 2, // BID = 2 doses per day
                    extensionType: 'dose-based',
                    extensionFrequency: 'BID (twice daily)',
                    dosesPerDay: 2,
                    totalDoses: (parseInt(med.duration) + med.extensionDays) * 2
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            const prescriptionResult = await prescriptionsCollection.insertOne(prescription);
            console.log(`   ✅ Created prescription: ${prescriptionResult.insertedId}`);
            createdPrescriptions++;
            
            // Create nurse task
            const nurseTask = {
                patientId: patientId,
                patientName: natanPatient.name,
                taskType: 'MEDICATION',
                description: `Administer ${med.name} to ${natanPatient.name} (Extended)`,
                status: 'PENDING',
                priority: 'MEDIUM',
                assignedBy: 'system',
                assignedByName: 'System',
                dueDate: new Date().toISOString(),
                medicationDetails: {
                    medicationName: med.name,
                    dosage: med.dosage,
                    frequency: med.frequency,
                    route: 'Intramuscular',
                    duration: med.duration,
                    startDate: new Date().toISOString(),
                    isExtension: true,
                    extensionDetails: prescription.extensionDetails,
                    doseRecords: []
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            // Generate dose records for BID (2 doses per day) with extension
            const totalDays = parseInt(med.duration) + med.extensionDays;
            const doseRecords = [];
            for (let day = 1; day <= totalDays; day++) {
                // Morning dose
                doseRecords.push({
                    day: day,
                    timeSlot: '09:00',
                    administered: false,
                    administeredAt: null,
                    administeredBy: null,
                    notes: ''
                });
                // Evening dose
                doseRecords.push({
                    day: day,
                    timeSlot: '21:00',
                    administered: false,
                    administeredAt: null,
                    administeredBy: null,
                    notes: ''
                });
            }
            
            nurseTask.medicationDetails.doseRecords = doseRecords;
            
            const taskResult = await nurseTasksCollection.insertOne(nurseTask);
            console.log(`   ✅ Created nurse task: ${taskResult.insertedId} (${doseRecords.length} doses)`);
            createdTasks++;
        }
        
        console.log(`\n📊 Summary:`);
        console.log(`   Created ${createdPrescriptions} prescriptions`);
        console.log(`   Created ${createdTasks} nurse tasks`);
        console.log(`   Total: 5 active (QD) + 3 extended (BID) = 8 medications`);
        
        // Verify final counts
        const finalPrescriptionCount = await prescriptionsCollection.countDocuments({});
        const finalTaskCount = await nurseTasksCollection.countDocuments({ taskType: 'MEDICATION' });
        
        console.log(`\n✅ Final Database State:`);
        console.log(`   Prescriptions: ${finalPrescriptionCount}`);
        console.log(`   Nurse Tasks: ${finalTaskCount}`);
        
        console.log(`\n🎉 All medications created successfully!`);
        console.log(`   You should now see 8 medication tasks in the nurse interface:`);
        console.log(`   - 5 active QD medications`);
        console.log(`   - 3 extended BID medications`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (client) {
            await client.close();
            console.log('\n✅ Database connection closed');
        }
    }
}

createMissingMedications();
