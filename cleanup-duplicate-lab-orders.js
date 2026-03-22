const mongoose = require('mongoose');
const LabOrder = require('./backend/models/LabOrder');
require('dotenv').config();

async function cleanupDuplicateLabOrders() {
  try {
    console.log('🔍 Starting cleanup of duplicate lab orders...');
    
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to MongoDB');
    
    // Find all lab orders
    const allLabOrders = await LabOrder.find({}).populate('patient', 'firstName lastName patientId');
    console.log(`📋 Found ${allLabOrders.length} total lab orders`);
    
    // Group by patient and test
    const groupedOrders = {};
    
    allLabOrders.forEach(order => {
      const key = `${order.patientId}-${order.testName}`;
      if (!groupedOrders[key]) {
        groupedOrders[key] = [];
      }
      groupedOrders[key].push(order);
    });
    
    // Find duplicates
    const duplicates = [];
    let totalDuplicates = 0;
    
    Object.keys(groupedOrders).forEach(key => {
      const orders = groupedOrders[key];
      if (orders.length > 1) {
        console.log(`🔍 Found ${orders.length} duplicate orders for ${key}`);
        console.log(`   Patient: ${orders[0].patient?.firstName} ${orders[0].patient?.lastName}`);
        console.log(`   Test: ${orders[0].testName}`);
        console.log(`   Amount: ETB ${orders[0].totalPrice}`);
        
        // Keep the oldest order, mark others as duplicates
        const sortedOrders = orders.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        const keepOrder = sortedOrders[0];
        const duplicateOrders = sortedOrders.slice(1);
        
        duplicates.push({
          key,
          keepOrder,
          duplicateOrders,
          patientName: `${orders[0].patient?.firstName} ${orders[0].patient?.lastName}`,
          testName: orders[0].testName,
          amount: orders[0].totalPrice
        });
        
        totalDuplicates += duplicateOrders.length;
      }
    });
    
    console.log(`\n📊 Summary:`);
    console.log(`   Total duplicate orders to remove: ${totalDuplicates}`);
    console.log(`   Unique patient-test combinations with duplicates: ${duplicates.length}`);
    
    if (duplicates.length === 0) {
      console.log('✅ No duplicate lab orders found!');
      return;
    }
    
    console.log('\n🗑️  Removing duplicate orders...');
    
    let removedCount = 0;
    for (const duplicate of duplicates) {
      console.log(`\n🔍 Processing duplicates for ${duplicate.patientName} - ${duplicate.testName}`);
      console.log(`   Keeping order: ${duplicate.keepOrder._id} (created: ${duplicate.keepOrder.createdAt})`);
      
      for (const duplicateOrder of duplicate.duplicateOrders) {
        console.log(`   Removing duplicate: ${duplicateOrder._id} (created: ${duplicateOrder.createdAt})`);
        await LabOrder.findByIdAndDelete(duplicateOrder._id);
        removedCount++;
      }
    }
    
    console.log(`\n✅ Cleanup completed!`);
    console.log(`   Removed ${removedCount} duplicate lab orders`);
    console.log(`   Kept ${duplicates.length} original orders`);
    
    // Verify cleanup
    const remainingOrders = await LabOrder.find({}).populate('patient', 'firstName lastName patientId');
    console.log(`\n📋 Remaining lab orders: ${remainingOrders.length}`);
    
    // Check for any remaining duplicates
    const remainingGrouped = {};
    remainingOrders.forEach(order => {
      const key = `${order.patientId}-${order.testName}`;
      if (!remainingGrouped[key]) {
        remainingGrouped[key] = [];
      }
      remainingGrouped[key].push(order);
    });
    
    const stillDuplicates = Object.keys(remainingGrouped).filter(key => remainingGrouped[key].length > 1);
    if (stillDuplicates.length > 0) {
      console.log(`⚠️  Warning: ${stillDuplicates.length} patient-test combinations still have duplicates`);
    } else {
      console.log('✅ No remaining duplicates found!');
    }
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

cleanupDuplicateLabOrders(); 