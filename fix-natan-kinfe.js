const { MongoClient } = require('mongodb');
require('dotenv').config();

async function fixNatanKinfe() {
    let client;
    try {
        console.log('🔧 Fixing Natan Kinfe medication configuration...');
        
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
        
        // Get all prescriptions
        const prescriptions = await prescriptionsCollection.find({}).toArray();
        console.log(`📋 Found ${prescriptions.length} prescriptions`);
        
        // Get all nurse tasks
        const nurseTasks = await nurseTasksCollection.find({
            taskType: 'MEDICATION'
        }).toArray();
        console.log(`📋 Found ${nurseTasks.length} nurse tasks`);
        
        // Find Natan's prescription
        const natanPrescription = prescriptions.find(p => 
            p.patientName === 'Natan Kinfe' || 
            p.patientId === natanPatient._id.toString()
        );
        
        if (natanPrescription) {
            console.log(`\n🔍 Natan's prescription found:`);
            console.log(`   Medication: ${natanPrescription.medicationName}`);
            console.log(`   Frequency: ${natanPrescription.frequency}`);
            console.log(`   Duration: ${natanPrescription.duration}`);
            console.log(`   Status: ${natanPrescription.status}`);
            console.log(`   Is Extended: ${natanPrescription.extensionDetails ? 'Yes' : 'No'}`);
            
            if (natanPrescription.extensionDetails) {
                console.log(`   Extension Details:`, natanPrescription.extensionDetails);
            }
        } else {
            console.log('❌ No prescription found for Natan Kinfe');
        }
        
        // Find Natan's nurse tasks
        const natanNurseTasks = nurseTasks.filter(task => 
            task.patientName === 'Natan Kinfe' || 
            task.patientId === natanPatient._id.toString()
        );
        
        console.log(`\n📋 Found ${natanNurseTasks.length} nurse tasks for Natan Kinfe`);
        
        natanNurseTasks.forEach((task, index) => {
            console.log(`\n   Task ${index + 1}:`);
            console.log(`   ID: ${task._id}`);
            console.log(`   Medication: ${task.medicationDetails?.medicationName}`);
            console.log(`   Is Extension: ${task.medicationDetails?.isExtension ? 'Yes' : 'No'}`);
            console.log(`   Duration: ${task.medicationDetails?.duration} days`);
            console.log(`   Dose Records: ${task.medicationDetails?.doseRecords?.length || 0} doses`);
            console.log(`   Status: ${task.status}`);
        });
        
        // Based on the image, Natan should have:
        // - Dexamethasone 8mg, Intramuscular, Once daily (QD), 5 days
        // - Active prescription (not extended)
        // - 5 doses total
        
        if (natanPrescription) {
            console.log(`\n🔧 Updating Natan's prescription to match the image...`);
            
            // Update prescription to match the image
            await prescriptionsCollection.updateOne(
                { _id: natanPrescription._id },
                {
                    $set: {
                        medicationName: 'Dexamethasone',
                        dosage: '8mg',
                        frequency: 'Once daily (QD)',
                        duration: '5 days',
                        route: 'Intramuscular',
                        status: 'Active',
                        patientName: 'Natan Kinfe',
                        patientId: natanPatient._id ? natanPatient._id.toString() : null,
                        // Remove any extension details to make it active
                        extensionDetails: null
                    }
                }
            );
            
            console.log(`✅ Updated Natan's prescription`);
        }
        
        // Update or create nurse task for Natan
        const natanNurseTask = natanNurseTasks.find(task => 
            task.medicationDetails?.medicationName === 'Dexamethasone'
        );
        
        if (natanNurseTask) {
            console.log(`\n🔧 Updating Natan's nurse task...`);
            
            // Generate dose records for 5 days QD
            const doseRecords = [];
            for (let day = 1; day <= 5; day++) {
                doseRecords.push({
                    day: day,
                    timeSlot: '09:00',
                    administered: false,
                    administeredAt: null,
                    administeredBy: null,
                    notes: ''
                });
            }
            
            await nurseTasksCollection.updateOne(
                { _id: natanNurseTask._id },
                {
                    $set: {
                        patientId: natanPatient._id ? natanPatient._id.toString() : null,
                        patientName: 'Natan Kinfe',
                        status: 'PENDING',
                        'medicationDetails.medicationName': 'Dexamethasone',
                        'medicationDetails.dosage': '8mg',
                        'medicationDetails.frequency': 'Once daily (QD)',
                        'medicationDetails.route': 'Intramuscular',
                        'medicationDetails.duration': 5,
                        'medicationDetails.isExtension': false,
                        'medicationDetails.extensionDetails': null,
                        'medicationDetails.doseRecords': doseRecords,
                        updatedAt: new Date()
                    }
                }
            );
            
            console.log(`✅ Updated Natan's nurse task with 5 doses`);
        } else {
            console.log(`\n🔧 Creating new nurse task for Natan...`);
            
            // Generate dose records for 5 days QD
            const doseRecords = [];
            for (let day = 1; day <= 5; day++) {
                doseRecords.push({
                    day: day,
                    timeSlot: '09:00',
                    administered: false,
                    administeredAt: null,
                    administeredBy: null,
                    notes: ''
                });
            }
            
            const newNurseTask = {
                patientId: natanPatient._id ? natanPatient._id.toString() : null,
                patientName: 'Natan Kinfe',
                taskType: 'MEDICATION',
                description: 'Administer Dexamethasone to Natan Kinfe',
                status: 'PENDING',
                priority: 'MEDIUM',
                assignedBy: 'system',
                assignedByName: 'System',
                dueDate: new Date().toISOString(),
                medicationDetails: {
                    medicationName: 'Dexamethasone',
                    dosage: '8mg',
                    frequency: 'Once daily (QD)',
                    route: 'Intramuscular',
                    duration: 5,
                    startDate: new Date().toISOString(),
                    isExtension: false,
                    extensionDetails: null,
                    doseRecords: doseRecords
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            const result = await nurseTasksCollection.insertOne(newNurseTask);
            console.log(`✅ Created new nurse task: ${result.insertedId} with 5 doses`);
        }
        
        // Remove any duplicate or incorrect nurse tasks
        const duplicateTasks = nurseTasks.filter(task => 
            task.patientName === 'Unknown Patient' || 
            (task.medicationDetails?.medicationName === 'Dexamethasone' && 
             task.patientName !== 'Natan Kinfe')
        );
        
        if (duplicateTasks.length > 0) {
            console.log(`\n🗑️  Removing ${duplicateTasks.length} duplicate/incorrect nurse tasks...`);
            
            for (const task of duplicateTasks) {
                await nurseTasksCollection.deleteOne({ _id: task._id });
                console.log(`   ✅ Removed task: ${task._id}`);
            }
        }
        
        // Final verification
        const finalPrescriptions = await prescriptionsCollection.find({}).toArray();
        const finalNurseTasks = await nurseTasksCollection.find({
            taskType: 'MEDICATION'
        }).toArray();
        
        console.log(`\n📊 Final Summary:`);
        console.log(`   Prescriptions: ${finalPrescriptions.length}`);
        console.log(`   Nurse Tasks: ${finalNurseTasks.length}`);
        
        const natanFinalTasks = finalNurseTasks.filter(task => 
            task.patientName === 'Natan Kinfe'
        );
        
        console.log(`   Natan's Nurse Tasks: ${natanFinalTasks.length}`);
        
        if (natanFinalTasks.length > 0) {
            const task = natanFinalTasks[0];
            console.log(`   - ${task.medicationDetails?.medicationName} ${task.medicationDetails?.dosage}`);
            console.log(`   - ${task.medicationDetails?.frequency} for ${task.medicationDetails?.duration} days`);
            console.log(`   - ${task.medicationDetails?.doseRecords?.length || 0} doses configured`);
            console.log(`   - Is Extension: ${task.medicationDetails?.isExtension ? 'Yes' : 'No'}`);
        }
        
        console.log(`\n✅ Natan Kinfe configuration completed!`);
        console.log(`🔧 His Dexamethasone prescription is now properly configured as an active prescription.`);
        console.log(`🔧 The nurse task area should now show the correct 5-day schedule.`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (client) {
            await client.close();
            console.log('\n✅ Database connection closed');
        }
    }
}

fixNatanKinfe();
