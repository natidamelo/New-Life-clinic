const mongoose = require('mongoose');
const LabOrder = require('../models/LabOrder');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/clinic', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function checkLabOrders() {
  try {
    console.log('🔍 Checking lab orders...');
    
    // Find all lab orders with glucose in the name
    const glucoseLabOrders = await LabOrder.find({ 
      testName: { $regex: /glucose/i }
    }).sort({ createdAt: -1 }).limit(10);
    
    console.log(`\n📊 Found ${glucoseLabOrders.length} glucose lab orders:`);
    
    glucoseLabOrders.forEach((order, index) => {
      console.log(`\n${index + 1}. ${order.testName}`);
      console.log(`   ID: ${order._id}`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Created: ${order.createdAt}`);
      console.log(`   Inventory deducted: ${order.inventoryDeducted}`);
      if (order.inventoryDeducted) {
        console.log(`   Deducted at: ${order.inventoryDeductedAt}`);
        console.log(`   Deducted by: ${order.inventoryDeductedBy}`);
      }
    });
    
    // Check for any lab orders created today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayLabOrders = await LabOrder.find({
      createdAt: { $gte: today }
    }).sort({ createdAt: -1 });
    
    console.log(`\n📅 Lab orders created today: ${todayLabOrders.length}`);
    
    todayLabOrders.forEach((order, index) => {
      console.log(`\n${index + 1}. ${order.testName}`);
      console.log(`   ID: ${order._id}`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Created: ${order.createdAt}`);
      console.log(`   Inventory deducted: ${order.inventoryDeducted}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkLabOrders();
