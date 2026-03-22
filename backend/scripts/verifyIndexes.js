/**
 * Script to verify that indexes are properly created and working
 * 
 * Usage: node scripts/verifyIndexes.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const NurseTask = require('../models/NurseTask');

const verifyIndexes = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/clinic-cms';
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Connected to MongoDB');
    console.log(`📊 Database: ${mongoose.connection.db.databaseName}\n`);
    
    // Get all indexes
    const indexes = await NurseTask.collection.getIndexes();
    
    console.log('📋 Current NurseTask Indexes:\n');
    
    const requiredIndexes = [
      { name: 'taskType_1_status_1_createdAt_-1', key: { taskType: 1, status: 1, createdAt: -1 } },
      { name: 'taskType_1_assignedTo_1_status_1', key: { taskType: 1, assignedTo: 1, status: 1 } },
      { name: 'patientId_1_taskType_1', key: { patientId: 1, taskType: 1 } }
    ];
    
    let allPresent = true;
    
    for (const required of requiredIndexes) {
      const exists = indexes[required.name];
      if (exists) {
        console.log(`✅ ${required.name}`);
        console.log(`   Keys: ${JSON.stringify(required.key)}`);
      } else {
        console.log(`❌ MISSING: ${required.name}`);
        console.log(`   Expected keys: ${JSON.stringify(required.key)}`);
        allPresent = false;
      }
    }
    
    console.log('\n📊 All Indexes Present:');
    Object.entries(indexes).forEach(([name, index]) => {
      console.log(`  - ${name}: ${JSON.stringify(index.key)}`);
    });
    
    // Test query performance
    console.log('\n🔍 Testing Query Performance...');
    
    const startTime = Date.now();
    const tasks = await NurseTask.find({ taskType: 'MEDICATION', status: 'PENDING' })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()
      .exec();
    const endTime = Date.now();
    
    console.log(`✅ Query completed in ${endTime - startTime}ms`);
    console.log(`📋 Found ${tasks.length} tasks`);
    
    if (endTime - startTime < 100) {
      console.log('🎉 Query performance is EXCELLENT (< 100ms)');
    } else if (endTime - startTime < 500) {
      console.log('✅ Query performance is GOOD (< 500ms)');
    } else if (endTime - startTime < 1000) {
      console.log('⚠️  Query performance is OK (< 1s) - consider further optimization');
    } else {
      console.log('❌ Query performance is SLOW (> 1s) - needs investigation');
    }
    
    console.log('\n' + (allPresent ? '🎉 All required indexes are present!' : '⚠️  Some indexes are missing!'));
    
    process.exit(allPresent ? 0 : 1);
  } catch (error) {
    console.error('❌ Error verifying indexes:', error);
    process.exit(1);
  }
};

verifyIndexes();

