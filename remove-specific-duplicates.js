const mongoose = require('mongoose');
require('dotenv').config();

async function removeSpecificDuplicates() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to MongoDB');
    
    const LabOrder = require('./backend/models/LabOrder');
    
    // Specific duplicate IDs to remove (keeping the oldest ones)
    const duplicatesToRemove = [
      // Ruth Gebere duplicates (keep 687e6e43b98bf09715cca0a4, remove others)
      '687e7470a4f2fcca560e589b',
      '687e73dd2f28fe59772de360',
      
      // Anteneh Ejeu duplicates (keep 687e44bb1ead184135c9618b, remove others)
      '687e6dd3b98bf09715cc9e81',
      '687e6d2cd2f83acac05583ce',
      '687e6d07d2f83acac0558294',
      '687e493155fee741ca46ed06',
      '687e479b55fee741ca46eade',
      
      // Mussie Eyob duplicates (keep 687d24278024bb89d3e41d2d, remove others)
      '687e16cb2677c42fcdf2c5f1',
      '687d24468024bb89d3e41e27'
    ];
    
    console.log(`🗑️  Removing ${duplicatesToRemove.length} duplicate lab orders...`);
    
    let removedCount = 0;
    for (const orderId of duplicatesToRemove) {
      try {
        const result = await LabOrder.findByIdAndDelete(orderId);
        if (result) {
          console.log(`✅ Removed duplicate order: ${orderId}`);
          removedCount++;
        } else {
          console.log(`⚠️  Order not found: ${orderId}`);
        }
      } catch (error) {
        console.log(`❌ Error removing ${orderId}:`, error.message);
      }
    }
    
    console.log(`\n✅ Cleanup completed!`);
    console.log(`   Removed ${removedCount} duplicate orders`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

removeSpecificDuplicates(); 