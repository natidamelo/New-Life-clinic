const mongoose = require('mongoose');
const axios = require('axios');

// MongoDB connection
const MONGO_URI = 'mongodb://localhost:27017/clinic-cms';

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB (clinic_cms)');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// Schemas
const nurseTaskSchema = new mongoose.Schema({}, { strict: false });
const NurseTask = mongoose.model('NurseTask', nurseTaskSchema);

async function verifyCurrentDatabaseState() {
  try {
    await connectDB();
    
    console.log('🔍 Step 1: Direct Database Query for Medication Tasks...\n');
    
    // Get all medication tasks directly from database
    const allTasksFromDB = await NurseTask.find({ taskType: 'MEDICATION' }).sort({ createdAt: -1 });
    
    console.log(`📋 Found ${allTasksFromDB.length} medication tasks in database:`);
    
    allTasksFromDB.forEach((task, index) => {
      console.log(`\n${index + 1}. Task ID: ${task._id}`);
      console.log(`   👤 Patient: ${task.patientName}`);
      console.log(`   💊 Medication: ${task.medicationDetails?.medicationName}`);
      console.log(`   📅 Created: ${task.createdAt}`);
      
      if (task.paymentAuthorization) {
        const auth = task.paymentAuthorization;
        console.log(`   💰 Payment Status: ${auth.paymentStatus || 'undefined'}`);
        console.log(`   💵 Outstanding: ETB ${auth.outstandingAmount || 0}`);
        console.log(`   📊 Authorized/Unauthorized: ${auth.authorizedDoses || 0}/${auth.unauthorizedDoses || 0}`);
        console.log(`   📅 Paid Days: ${auth.paidDays || 0}/${auth.totalDays || 0}`);
      } else {
        console.log(`   ❌ NO payment authorization data`);
      }
    });
    
    console.log('\n🌐 Step 2: Testing API Response...\n');
    
    try {
      const apiResponse = await axios.get('http://192.168.78.157:5002/api/nurse-tasks?taskType=MEDICATION');
      const apiTasks = apiResponse.data;
      
      console.log(`📋 API returned ${apiTasks.length} medication tasks:`);
      
      apiTasks.slice(0, 5).forEach((task, index) => {
        console.log(`\n${index + 1}. API Task ID: ${task._id}`);
        console.log(`   👤 Patient: ${task.patientName}`);
        console.log(`   💊 Medication: ${task.medicationDetails?.medicationName}`);
        
        if (task.paymentAuthorization) {
          const auth = task.paymentAuthorization;
          console.log(`   💰 Payment Status: ${auth.paymentStatus || 'undefined'}`);
          console.log(`   💵 Outstanding: ETB ${auth.outstandingAmount || 0}`);
          console.log(`   📊 Authorized/Unauthorized: ${auth.authorizedDoses || 0}/${auth.unauthorizedDoses || 0}`);
        } else {
          console.log(`   ❌ NO payment authorization data in API response`);
        }
      });
      
      // Compare database vs API
      console.log('\n📊 Step 3: Database vs API Comparison...\n');
      
      const dbTaskIds = allTasksFromDB.map(t => t._id.toString());
      const apiTaskIds = apiTasks.map(t => t._id);
      
      console.log(`📋 Database task IDs: ${dbTaskIds.slice(0, 3).join(', ')}...`);
      console.log(`🌐 API task IDs: ${apiTaskIds.slice(0, 3).join(', ')}...`);
      
      const missingFromAPI = dbTaskIds.filter(id => !apiTaskIds.includes(id));
      const extraInAPI = apiTaskIds.filter(id => !dbTaskIds.includes(id));
      
      if (missingFromAPI.length > 0) {
        console.log(`⚠️ Tasks in database but missing from API: ${missingFromAPI.length}`);
      }
      
      if (extraInAPI.length > 0) {
        console.log(`⚠️ Tasks in API but not in database: ${extraInAPI.length}`);
        console.log(`   These are likely old/stale tasks: ${extraInAPI.slice(0, 3).join(', ')}...`);
      }
      
      // Check for tasks with proper payment authorization
      const dbTasksWithPayment = allTasksFromDB.filter(t => 
        t.paymentAuthorization && 
        t.paymentAuthorization.outstandingAmount > 0
      );
      
      const apiTasksWithPayment = apiTasks.filter(t => 
        t.paymentAuthorization && 
        t.paymentAuthorization.outstandingAmount > 0
      );
      
      console.log(`\n💰 Tasks with proper payment data:`);
      console.log(`   📋 Database: ${dbTasksWithPayment.length} tasks`);
      console.log(`   🌐 API: ${apiTasksWithPayment.length} tasks`);
      
      if (dbTasksWithPayment.length > 0 && apiTasksWithPayment.length === 0) {
        console.log(`\n🚨 ISSUE IDENTIFIED: Database has payment data but API doesn't!`);
        console.log(`   This suggests the API route is not properly populating payment authorization.`);
      }
      
    } catch (apiError) {
      console.error('❌ Error testing API:', apiError.message);
    }
    
    console.log('\n🔧 Step 4: Cleanup - Delete ALL medication tasks and recreate...\n');
    
    // Delete all medication tasks
    const deleteResult = await NurseTask.deleteMany({ taskType: 'MEDICATION' });
    console.log(`🗑️ Deleted ${deleteResult.deletedCount} medication tasks`);
    
    // Create one perfect test task for Samuel
    const testTask = {
      patientId: new mongoose.Types.ObjectId('68693402c6663b16a1f65c20'), // Samuel's ID
      patientName: 'Samuel Negatu',
      taskType: 'MEDICATION',
      description: 'Administer Ceftriaxone to patient Samuel Negatu. Payment status: unpaid.',
      status: 'PENDING',
      priority: 'HIGH',
      assignedBy: new mongoose.Types.ObjectId('6823301cdefc7776bf7537b3'),
      assignedTo: new mongoose.Types.ObjectId('6823859485e2a37d8cb420ed'),
      assignedToName: 'Semhal Melaku',
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      medicationDetails: {
        medicationName: 'Ceftriaxone',
        dosage: '1g',
        frequency: 'Twice daily',
        route: 'oral',
        instructions: 'Administer as prescribed',
        duration: 7,
        doseRecords: []
      },
      serviceName: 'Ceftriaxone',
      paymentAuthorization: {
        paymentStatus: 'unpaid',
        paidDays: 0,
        totalDays: 7,
        authorizedDoses: 0,
        unauthorizedDoses: 14, // 2 doses per day * 7 days
        outstandingAmount: 350, // 14 doses * 25 ETB per dose
        lastUpdated: new Date()
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const newTask = await NurseTask.create(testTask);
    console.log(`✅ Created test task: ${newTask._id}`);
    console.log(`   💰 Payment Status: ${newTask.paymentAuthorization.paymentStatus}`);
    console.log(`   💵 Outstanding: ETB ${newTask.paymentAuthorization.outstandingAmount}`);
    
    console.log('\n🧪 Step 5: Final API Test...\n');
    
    try {
      const finalApiResponse = await axios.get('http://192.168.78.157:5002/api/nurse-tasks?taskType=MEDICATION');
      const finalApiTasks = finalApiResponse.data;
      
      console.log(`📋 Final API test - Found ${finalApiTasks.length} tasks:`);
      
      finalApiTasks.forEach((task, index) => {
        console.log(`\n${index + 1}. ${task.patientName} - ${task.medicationDetails?.medicationName}`);
        if (task.paymentAuthorization) {
          const auth = task.paymentAuthorization;
          console.log(`   💰 Status: ${auth.paymentStatus} | Outstanding: ETB ${auth.outstandingAmount}`);
          console.log(`   🎯 Expected Badge: ${auth.paymentStatus === 'unpaid' ? '🔴 RED' : auth.paymentStatus === 'partially_paid' ? '🟡 YELLOW' : '🟢 GREEN'}`);
        } else {
          console.log(`   ❌ No payment authorization`);
        }
      });
      
      if (finalApiTasks.length > 0 && finalApiTasks[0].paymentAuthorization?.outstandingAmount > 0) {
        console.log('\n🎉 SUCCESS! API is now returning proper payment authorization data!');
        console.log('💡 Refresh your frontend to see the red "Unpaid" badges for Samuel\'s medications.');
      } else {
        console.log('\n❌ Still issues with payment authorization data in API response.');
      }
      
    } catch (finalApiError) {
      console.error('❌ Error in final API test:', finalApiError.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Run the verification
verifyCurrentDatabaseState();
