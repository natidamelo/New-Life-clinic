const { MongoClient } = require('mongodb');
require('dotenv').config();

async function verifyNurseTasks() {
    let client;
    try {
        console.log('🔍 Verifying nurse tasks for Natan Kinfe...');
        
        client = new MongoClient(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 15000,
        });
        
        await client.connect();
        console.log('✅ Connected to MongoDB');
        
        const db = client.db('clinic-cms');
        const nurseTasksCollection = db.collection('nursetasks');
        
        // Find Natan's patient ID
        const natanPatient = await db.collection('patients').findOne({
            firstName: 'Natan',
            lastName: 'Kinfe'
        });
        
        if (!natanPatient) {
            console.log('❌ Natan Kinfe patient not found');
            return;
        }
        
        console.log(`📋 Found patient: ${natanPatient.firstName} ${natanPatient.lastName} (ID: ${natanPatient._id})`);
        
        // Find all nurse tasks for Natan
        const natanNurseTasks = await nurseTasksCollection.find({
            patientId: natanPatient._id,
            taskType: 'MEDICATION'
        }).toArray();
        
        console.log(`\n📋 Found ${natanNurseTasks.length} medication nurse tasks for Natan:`);
        
        if (natanNurseTasks.length === 0) {
            console.log('❌ No nurse tasks found! This is the problem.');
            console.log('🔧 Checking if nurse tasks need to be created...');
            
            // Check if there are prescriptions that should have nurse tasks
            const prescriptions = await db.collection('prescriptions').find({
                patient: natanPatient._id
            }).toArray();
            
            console.log(`📋 Found ${prescriptions.length} prescriptions for Natan`);
            
            prescriptions.forEach((prescription, index) => {
                console.log(`\n   Prescription ${index + 1}:`);
                console.log(`     ID: ${prescription._id}`);
                console.log(`     Medication: ${prescription.medicationName}`);
                console.log(`     Duration: ${prescription.duration} days`);
                console.log(`     Frequency: ${prescription.frequency}`);
                console.log(`     Extensions: ${prescription.extensions?.length || 0}`);
                
                if (prescription.extensions && prescription.extensions.length > 0) {
                    prescription.extensions.forEach((ext, extIndex) => {
                        console.log(`       Extension ${extIndex + 1}:`);
                        console.log(`         - Additional Days: ${ext.additionalDays}`);
                        console.log(`         - Additional Doses: ${ext.additionalDoses}`);
                        console.log(`         - Frequency: ${ext.frequency}`);
                    });
                }
            });
            
            console.log('\n🔧 SOLUTION: Nurse tasks need to be created for these prescriptions');
            console.log('   The ensureExtensionNurseTask function should be called for each extension');
            
        } else {
            natanNurseTasks.forEach((task, index) => {
                console.log(`\n   Task ${index + 1}:`);
                console.log(`     ID: ${task._id}`);
                console.log(`     Description: ${task.description}`);
                console.log(`     Medication: ${task.medicationDetails?.medicationName}`);
                console.log(`     Duration: ${task.medicationDetails?.duration} days`);
                console.log(`     Dose Records: ${task.medicationDetails?.doseRecords?.length || 0} doses`);
                console.log(`     Is Extension: ${task.medicationDetails?.isExtension || task.isExtension || false}`);
                console.log(`     Prescription ID: ${task.prescriptionId}`);
                console.log(`     Status: ${task.status}`);
                
                if (task.medicationDetails?.extensionDetails) {
                    console.log(`     Extension Details:`);
                    console.log(`       - Additional Days: ${task.medicationDetails.extensionDetails.additionalDays}`);
                    console.log(`       - Additional Doses: ${task.medicationDetails.extensionDetails.additionalDoses}`);
                    console.log(`       - Extension Type: ${task.medicationDetails.extensionDetails.extensionType}`);
                    console.log(`       - Frequency: ${task.medicationDetails.extensionDetails.frequency}`);
                }
            });
            
            // Check if tasks have proper dose records
            const tasksWithDoseRecords = natanNurseTasks.filter(task => 
                task.medicationDetails?.doseRecords && task.medicationDetails.doseRecords.length > 0
            );
            
            console.log(`\n📊 Task Analysis:`);
            console.log(`   Total Tasks: ${natanNurseTasks.length}`);
            console.log(`   Tasks with Dose Records: ${tasksWithDoseRecords.length}`);
            console.log(`   Tasks without Dose Records: ${natanNurseTasks.length - tasksWithDoseRecords.length}`);
            
            if (tasksWithDoseRecords.length < natanNurseTasks.length) {
                console.log(`\n⚠️  Some tasks are missing dose records!`);
                const tasksWithoutDoses = natanNurseTasks.filter(task => 
                    !task.medicationDetails?.doseRecords || task.medicationDetails.doseRecords.length === 0
                );
                tasksWithoutDoses.forEach(task => {
                    console.log(`   - Task ID: ${task._id} (${task.description})`);
                });
            }
        }
        
        console.log(`\n🎯 SUMMARY:`);
        if (natanNurseTasks.length === 0) {
            console.log(`   ❌ No nurse tasks found - this is why the frontend shows only 1 task`);
            console.log(`   🔧 Need to create nurse tasks for prescriptions and extensions`);
        } else {
            console.log(`   ✅ Found ${natanNurseTasks.length} nurse tasks`);
            console.log(`   🔧 Frontend should show ${natanNurseTasks.length} tasks after refresh`);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (client) {
            await client.close();
        }
    }
}

verifyNurseTasks();
