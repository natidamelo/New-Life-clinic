/**
 * Script to build database indexes for optimal performance
 * Run this script after updating models to ensure indexes are created
 * 
 * Usage: node scripts/buildIndexes.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models that have indexes defined
const NurseTask = require('../models/NurseTask');
const User = require('../models/User');
const Patient = require('../models/Patient');

const buildIndexes = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    
    // Connect to MongoDB using connection string from environment
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/clinic-cms';
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Connected to MongoDB');
    console.log(`📊 Building indexes for database: ${mongoose.connection.db.databaseName}`);
    
    // Build indexes for each model with error handling
    let successCount = 0;
    let failCount = 0;
    
    console.log('\n📋 Building NurseTask indexes...');
    try {
      await NurseTask.createIndexes();
      console.log('✅ NurseTask indexes created');
      successCount++;
    } catch (error) {
      console.error('❌ Failed to create NurseTask indexes:', error.message);
      failCount++;
    }
    
    console.log('\n👤 Building User indexes...');
    try {
      await User.createIndexes();
      console.log('✅ User indexes created');
      successCount++;
    } catch (error) {
      console.error('❌ Failed to create User indexes:', error.message);
      console.log('⚠️  This may be due to existing duplicate data in the collection');
      failCount++;
    }
    
    console.log('\n🏥 Building Patient indexes...');
    try {
      await Patient.createIndexes();
      console.log('✅ Patient indexes created');
      successCount++;
    } catch (error) {
      console.error('❌ Failed to create Patient indexes:', error.message);
      failCount++;
    }
    
    // List all indexes for verification
    console.log('\n📊 Current NurseTask indexes:');
    try {
      const nurseTaskIndexes = await NurseTask.collection.getIndexes();
      Object.entries(nurseTaskIndexes).forEach(([name, index]) => {
        console.log(`  - ${name}:`, JSON.stringify(index.key));
      });
    } catch (error) {
      console.error('❌ Failed to list indexes:', error.message);
    }
    
    console.log(`\n📊 Summary: ${successCount} successful, ${failCount} failed`);
    
    if (successCount > 0) {
      console.log('\n🎉 Indexes built successfully!');
      console.log('\n💡 Performance improvements:');
      console.log('  - Faster medication task queries');
      console.log('  - Optimized filtered searches');
      console.log('  - Reduced database load');
    }
    
    process.exit(failCount === 0 ? 0 : 1);
  } catch (error) {
    console.error('❌ Error building indexes:', error);
    process.exit(1);
  }
};

// Run the script
buildIndexes();

