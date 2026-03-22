const mongoose = require('mongoose');
const LabOrder = require('../models/LabOrder');

async function checkLabOrderSources() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/clinic-cms', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Connected to MongoDB');
    
    // Get all lab orders
    const labOrders = await LabOrder.find({}).limit(20);
    
    console.log(`\n📊 Found ${labOrders.length} lab orders:`);
    
    labOrders.forEach((order, index) => {
      console.log(`\n${index + 1}. Order ID: ${order._id}`);
      console.log(`   Test Name: ${order.testName}`);
      console.log(`   Source: ${order.source || 'NOT SET'}`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Ordered By: ${order.orderingDoctorId}`);
      console.log(`   Patient ID: ${order.patientId}`);
    });
    
    // Check how many have source field
    const withSource = labOrders.filter(order => order.source);
    const withoutSource = labOrders.filter(order => !order.source);
    
    console.log(`\n📈 Summary:`);
    console.log(`   With source field: ${withSource.length}`);
    console.log(`   Without source field: ${withoutSource.length}`);
    
    if (withSource.length > 0) {
      console.log(`\n🔍 Source field values:`);
      const sourceCounts = {};
      withSource.forEach(order => {
        sourceCounts[order.source] = (sourceCounts[order.source] || 0) + 1;
      });
      Object.entries(sourceCounts).forEach(([source, count]) => {
        console.log(`   ${source}: ${count} orders`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkLabOrderSources();
