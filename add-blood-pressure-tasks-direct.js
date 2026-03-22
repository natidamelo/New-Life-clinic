const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms';

async function addBloodPressureTasks() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('🔍 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    const nurseTasksCollection = db.collection('nursetasks');
    
    console.log('🔍 Creating Blood Pressure Check tasks...');
    
    // Create tasks for known patients
    const tasksToCreate = [
      {
        patientId: '688f7f4aa354287d78558014', // Hana Dejene
        patientName: 'Hana Dejene',
        description: 'Blood Pressure Check',
        type: 'VITAL_SIGNS',
        taskType: 'VITAL_SIGNS',
        priority: 'normal',
        status: 'PENDING',
        notes: 'Blood pressure measurement required',
        location: 'Clinic',
        department: 'nurse',
        paymentAuthorization: {
          isAuthorized: true,
          paymentStatus: 'fully_paid',
          amount: 50,
          paidAmount: 50,
          remainingAmount: 0,
          paymentMethod: 'cash',
          paymentDate: new Date()
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        patientId: '688f7f4aa354287d78558015', // Game (assuming ID)
        patientName: 'Game',
        description: 'Blood Pressure Check',
        type: 'VITAL_SIGNS',
        taskType: 'VITAL_SIGNS',
        priority: 'normal',
        status: 'PENDING',
        notes: 'Blood pressure measurement required',
        location: 'Clinic',
        department: 'nurse',
        paymentAuthorization: {
          isAuthorized: true,
          paymentStatus: 'fully_paid',
          amount: 50,
          paidAmount: 50,
          remainingAmount: 0,
          paymentMethod: 'cash',
          paymentDate: new Date()
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const taskData of tasksToCreate) {
      console.log(`\n📋 Creating task for ${taskData.patientName}...`);
      
      // Check if task already exists
      const existingTask = await nurseTasksCollection.findOne({
        patientId: taskData.patientId,
        description: 'Blood Pressure Check',
        status: 'PENDING'
      });

      if (existingTask) {
        console.log(`⚠️  Task already exists for ${taskData.patientName}`);
        continue;
      }

      const result = await nurseTasksCollection.insertOne(taskData);
      console.log(`✅ Created Blood Pressure Check task for ${taskData.patientName}: ${result.insertedId}`);
    }

    console.log('\n🎉 Blood Pressure Check tasks created successfully!');
    
    // Show summary
    const allTasks = await nurseTasksCollection.find({
      description: 'Blood Pressure Check',
      status: 'PENDING'
    }).toArray();
    
    console.log(`\n📊 Summary: ${allTasks.length} pending Blood Pressure Check tasks`);
    for (const task of allTasks) {
      console.log(`  - ${task.patientName}: ${task.status}`);
    }

  } catch (error) {
    console.error('❌ Error creating tasks:', error);
  } finally {
    await client.close();
    console.log('🔌 MongoDB connection closed');
  }
}

addBloodPressureTasks(); 
 
 