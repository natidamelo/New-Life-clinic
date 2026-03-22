#!/usr/bin/env node

/**
 * Check Staff Hashes Script
 * This script lists all staff hash records in the database
 */

const mongoose = require('mongoose');
const StaffHash = require('./models/StaffHash');

async function checkStaffHashes() {
  try {
    console.log('🔑 Checking staff hash records...\n');
    
    // Connect to database
    await mongoose.connect('mongodb://localhost:27017/clinic', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to database');
    
    // Get all staff hashes
    const staffHashes = await StaffHash.find({});
    
    console.log(`\n📋 Found ${staffHashes.length} staff hash records:`);
    staffHashes.forEach((hash, index) => {
      console.log(`   ${index + 1}. Hash: ${hash.uniqueHash.substring(0, 20)}...`);
      console.log(`      - User ID: ${hash.userId}`);
      console.log(`      - Type: ${hash.hashType}`);
      console.log(`      - Active: ${hash.isActive}`);
      console.log(`      - Created: ${hash.createdAt}`);
      console.log(`      - Last Used: ${hash.lastUsed || 'Never'}`);
      console.log(`      - Usage Count: ${hash.usageCount || 0}`);
      console.log('');
    });
    
    // Look for the specific hash from the image
    const testHash = '76b13de22348d3f1a5592b37c0624a6b6767d2b2c33d2987928b440b67e4885a';
    const testHashRecord = staffHashes.find(hash => hash.uniqueHash === testHash);
    
    if (testHashRecord) {
      console.log('🎯 Found the test hash from the image:');
      console.log(`   - Hash: ${testHashRecord.uniqueHash}`);
      console.log(`   - User ID: ${testHashRecord.userId}`);
      console.log(`   - Type: ${testHashRecord.hashType}`);
      console.log(`   - Active: ${testHashRecord.isActive}`);
    } else {
      console.log('❌ Test hash from image not found in database');
    }
    
    // Group by user ID
    const hashesByUser = {};
    staffHashes.forEach(hash => {
      if (!hashesByUser[hash.userId]) {
        hashesByUser[hash.userId] = [];
      }
      hashesByUser[hash.userId].push(hash);
    });
    
    console.log('\n👥 Hashes grouped by user:');
    Object.keys(hashesByUser).forEach(userId => {
      console.log(`   User ${userId}:`);
      hashesByUser[userId].forEach(hash => {
        console.log(`     - ${hash.hashType}: ${hash.uniqueHash.substring(0, 20)}... (active: ${hash.isActive})`);
      });
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from database');
  }
}

// Run the check
checkStaffHashes().catch(console.error);
