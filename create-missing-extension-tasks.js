const { MongoClient } = require('mongodb');
require('dotenv').config();

async function createMissingExtensionTasks() {
    let client;
    try {
        console.log('🔧 Creating missing nurse tasks for extended prescriptions...');
        
        client = new MongoClient(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 15000,
        });
        
        await client.connect();
        console.log('✅ Connected to MongoDB');
        
        const db = client.db('clinic-cms');
        const prescriptionsCollection = db.collection('prescriptions');
        const nurseTasksCollection = db.collection('nursetasks');
        
        // Get all prescriptions
        const prescriptions = await prescriptionsCollection.find({}).toArray();
        console.log(`📋 Found ${prescriptions.length} total prescriptions`);
        
        // Get all nurse tasks
        const nurseTasks = await nurseTasksCollection.find({
            taskType: 'MEDICATION'
        }).toArray();
        console.log(`📋 Found ${nurseTasks.length} nurse tasks`);
        
        // Find extended prescriptions
        const extendedPrescriptions = prescriptions.filter(p => p.extensionDetails);
        console.log(`📋 Found ${extendedPrescriptions.length} extended prescriptions`);
        
        let createdTasks = 0;
        
        for (const prescription of extendedPrescriptions) {
            console.log(`\n🔍 Processing: ${prescription.medicationName} (${prescription.patientName})`);
            
            // Check if nurse task exists
            const existingTask = await nurseTasksCollection.findOne({
                patientId: prescription.patientId,
                'medicationDetails.medicationName': prescription.medicationName
            });
            
            if (!existingTask) {
                console.log(`   ❌ No nurse task found - creating one...`);
                
                const extensionDetails = prescription.extensionDetails;
                const totalDays = (extensionDetails.originalDuration || 5) + (extensionDetails.additionalDays || 0);
                
                // Generate dose records
                const frequency = prescription.frequency?.toLowerCase() || 'once daily';
                let dosesPerDay = 1;
                if (frequency.includes('bid') || frequency.includes('twice')) {
                    dosesPerDay = 2;
                }
                
                const doseRecords = [];
                const timeSlots = dosesPerDay === 1 ? ['09:00'] : ['09:00', '21:00'];
                
                for (let day = 1; day <= totalDays; day++) {
                    for (let dose = 0; dose < dosesPerDay; dose++) {
                        doseRecords.push({
                            day: day,
                            timeSlot: timeSlots[dose],
                            administered: false,
                            administeredAt: null,
                            administeredBy: null,
                            notes: ''
                        });
                    }
                }
                
                const newNurseTask = {
                    patientId: prescription.patientId,
                    patientName: prescription.patientName,
                    taskType: 'MEDICATION',
                    description: `Administer ${prescription.medicationName} to ${prescription.patientName} (Extended)`,
                    status: 'PENDING',
                    priority: 'MEDIUM',
                    assignedBy: prescription.prescribedBy || 'system',
                    assignedByName: prescription.prescribedByName || 'System',
                    prescriptionId: prescription._id,
                    dueDate: new Date().toISOString(),
                    medicationDetails: {
                        medicationName: prescription.medicationName,
                        dosage: prescription.dosage,
                        frequency: prescription.frequency,
                        route: prescription.route || 'Oral',
                        duration: totalDays,
                        startDate: prescription.startDate || new Date().toISOString(),
                        isExtension: true,
                        extensionDetails: extensionDetails,
                        doseRecords: doseRecords
                    },
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                
                const result = await nurseTasksCollection.insertOne(newNurseTask);
                console.log(`   ✅ Created nurse task: ${result.insertedId} with ${doseRecords.length} doses`);
                createdTasks++;
            } else {
                console.log(`   ✅ Nurse task already exists`);
            }
        }
        
        // Final count
        const finalTaskCount = await nurseTasksCollection.countDocuments({
            taskType: 'MEDICATION'
        });
        console.log(`\n📊 Summary:`);
        console.log(`   Created: ${createdTasks} new nurse tasks`);
        console.log(`   Final nurse task count: ${finalTaskCount}`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (client) {
            await client.close();
            console.log('\n✅ Database connection closed');
        }
    }
}

createMissingExtensionTasks();
