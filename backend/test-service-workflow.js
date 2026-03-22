const mongoose = require('mongoose');
const ServiceRequest = require('./models/ServiceRequest');
const Service = require('./models/Service');
const Patient = require('./models/Patient');
const User = require('./models/User');
const NurseTask = require('./models/NurseTask');
const LabOrder = require('./models/LabOrder');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/clinic-cms', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function testServiceWorkflow() {
  try {
    console.log('🧪 Testing Service Workflow...\n');

    // Test data
    const testPatientId = '686108b50997e12925f535a8'; // Natan Kinfe
    const receptionUserId = '507f1f77bcf86cd799439011'; // Admin user
    const nurseId = '6823859485e2a37d8cb420ed'; // Semhal Melaku

    console.log('📋 Test Setup:');
    console.log(`  Patient ID: ${testPatientId}`);
    console.log(`  Reception User: ${receptionUserId}`);
    console.log(`  Nurse ID: ${nurseId}\n`);

    // 1. Test DEPO injection (should create nurse task)
    console.log('💉 Testing DEPO injection service...');
    
    const depoService = await Service.findOne({ name: /DEPO injection/i });
    if (depoService) {
      console.log(`Found DEPO service: ${depoService.name} (${depoService.category})`);
      
      // Check if there are existing nurse tasks for this service
      const existingDEPOTasks = await NurseTask.find({
        patientId: testPatientId,
        serviceName: depoService.name,
        assignedTo: nurseId
      });
      console.log(`Existing DEPO tasks: ${existingDEPOTasks.length}`);
      
      for (const task of existingDEPOTasks) {
        console.log(`  - Task ID: ${task._id}, Status: ${task.status}, Type: ${task.taskType}`);
      }
    } else {
      console.log('❌ DEPO service not found');
    }

    console.log('\n🩸 Testing Blood Sugar Test service...');
    
    const bloodSugarService = await Service.findOne({ name: /Blood Sugar Test/i });
    if (bloodSugarService) {
      console.log(`Found Blood Sugar service: ${bloodSugarService.name} (${bloodSugarService.category})`);
      
      // Check if there are existing lab orders for this service
      const existingLabOrders = await LabOrder.find({
        patientId: testPatientId,
        testName: bloodSugarService.name
      });
      console.log(`Existing lab orders: ${existingLabOrders.length}`);
      
      for (const order of existingLabOrders) {
        console.log(`  - Order ID: ${order._id}, Status: ${order.status}, Test: ${order.testName}`);
      }
    } else {
      console.log('❌ Blood Sugar service not found');
    }

    console.log('\n📊 Summary of Current Tasks and Orders:');
    
    // Count nurse tasks for the test patient
    const totalNurseTasks = await NurseTask.countDocuments({ patientId: testPatientId });
    const pendingNurseTasks = await NurseTask.countDocuments({ 
      patientId: testPatientId, 
      status: 'PENDING' 
    });
    const medicationTasks = await NurseTask.countDocuments({ 
      patientId: testPatientId, 
      taskType: 'MEDICATION' 
    });
    
    console.log(`  Nurse Tasks for patient: ${totalNurseTasks}`);
    console.log(`  Pending Nurse Tasks: ${pendingNurseTasks}`);
    console.log(`  Medication Tasks: ${medicationTasks}`);
    
    // Count lab orders for the test patient
    const totalLabOrders = await LabOrder.countDocuments({ patientId: testPatientId });
    const pendingLabOrders = await LabOrder.countDocuments({ 
      patientId: testPatientId, 
      status: { $in: ['Ordered', 'Scheduled', 'Collected', 'Processing'] }
    });
    
    console.log(`  Lab Orders for patient: ${totalLabOrders}`);
    console.log(`  Pending Lab Orders: ${pendingLabOrders}`);

    console.log('\n🔍 Service Categorization Test:');
    
    // Test service categorization logic
    const testServices = [
      { name: 'DEPO injection', category: 'Procedure' },
      { name: 'Blood Sugar Test', category: 'Lab' },
      { name: 'Complete Blood Count (CBC)', category: 'Lab' },
      { name: 'X-Ray Chest', category: 'Imaging' },
      { name: 'Blood Pressure Check', category: 'Vital Signs' }
    ];
    
    const categorizeService = (service) => {
      const category = service.category?.toLowerCase() || '';
      const name = service.name?.toLowerCase() || '';
      
      if (category.includes('injection') || name.includes('injection') || name.includes('depo')) {
        return { taskType: 'MEDICATION', department: 'nurse' };
      }
      if (category.includes('lab') || name.includes('blood') || name.includes('test')) {
        return { taskType: 'PROCEDURE', department: 'lab' };
      }
      if (category.includes('imaging') || name.includes('x-ray')) {
        return { taskType: 'PROCEDURE', department: 'imaging' };
      }
      if (category.includes('vital') || name.includes('pressure')) {
        return { taskType: 'VITAL_SIGNS', department: 'nurse' };
      }
      return { taskType: 'PROCEDURE', department: 'nurse' };
    };
    
    for (const service of testServices) {
      const result = categorizeService(service);
      console.log(`  ${service.name} → ${result.taskType} (${result.department})`);
    }

    console.log('\n✅ Service workflow test completed!');

  } catch (error) {
    console.error('❌ Error testing service workflow:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the test
testServiceWorkflow(); 
