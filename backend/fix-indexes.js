const mongoose = require('mongoose');
const StaffHash = require('./models/StaffHash');

async function fixIndexes() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to MongoDB');
    
    // Check existing indexes
    console.log('🔍 Checking existing indexes...');
    const indexes = await StaffHash.collection.getIndexes();
    console.log('Current indexes:', JSON.stringify(indexes, null, 2));
    
    // Drop the problematic userId_1 index if it exists
    try {
      await StaffHash.collection.dropIndex('userId_1');
      console.log('✅ Dropped userId_1 index');
    } catch (error) {
      console.log('ℹ️ userId_1 index not found or already dropped:', error.message);
    }
    
    // Ensure the compound index exists
    try {
      await StaffHash.collection.createIndex({ userId: 1, hashType: 1 }, { unique: true });
      console.log('✅ Created compound unique index on { userId: 1, hashType: 1 }');
    } catch (error) {
      console.log('ℹ️ Compound index already exists or error:', error.message);
    }
    
    // Check final indexes
    console.log('🔍 Final indexes:');
    const finalIndexes = await StaffHash.collection.getIndexes();
    console.log(JSON.stringify(finalIndexes, null, 2));
    
    console.log('🎉 Index fix completed!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error fixing indexes:', error);
    process.exit(1);
  }
}

fixIndexes();
