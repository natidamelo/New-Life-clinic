#!/usr/bin/env node

/**
 * Test Hash Fix Script
 * This script tests the fixed hash verification for enhanced QR codes
 */

const mongoose = require('mongoose');
const StaffHash = require('./models/StaffHash');
const User = require('./models/User');

// Test configuration
const TEST_USER_ID = '6823301cdefc7776bf7537b3'; // DR Natan's ID from the image
const TEST_CHECKOUT_HASH = '0094b02a9bab5884a8f11664b9854831ac1a110aabd145e3885d6343c0e404d9'; // Checkout hash from the image

async function testHashFix() {
  try {
    console.log('🧪 Testing hash fix for enhanced QR codes...\n');
    
    // Connect to database
    await mongoose.connect('mongodb://localhost:27017/clinic', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to database');
    
    // Test 1: Check if user exists
    console.log('\n📋 Test 1: User verification');
    const user = await User.findById(TEST_USER_ID);
    if (user) {
      console.log(`✅ User found: ${user.firstName} ${user.lastName} (${user.role})`);
    } else {
      console.log('❌ User not found, creating test user...');
      const testUser = new User({
        _id: TEST_USER_ID,
        firstName: 'DR Natan',
        lastName: 'Test',
        username: 'drnatan',
        email: 'drnatan@test.com',
        role: 'doctor',
        specialization: 'General Medicine',
        password: 'test123'
      });
      await testUser.save();
      console.log('✅ Test user created');
    }
    
    // Test 2: Check for staff registration hash
    console.log('\n📋 Test 2: Staff registration hash check');
    let staffRegHash = await StaffHash.findOne({
      userId: TEST_USER_ID,
      hashType: 'staff-registration',
      isActive: true
    });
    
    if (staffRegHash) {
      console.log(`✅ Staff registration hash found: ${staffRegHash.uniqueHash.substring(0, 20)}...`);
    } else {
      console.log('❌ No staff registration hash found, creating one...');
      const crypto = require('crypto');
      const newHash = crypto.createHash('sha256')
        .update(`${TEST_USER_ID}-staff-registration-${Date.now()}`)
        .digest('hex');
      
      staffRegHash = new StaffHash({
        userId: TEST_USER_ID,
        uniqueHash: newHash,
        hashType: 'staff-registration',
        isActive: true,
        usageCount: 0,
        createdAt: new Date(),
        lastUsed: new Date()
      });
      
      await staffRegHash.save();
      console.log(`✅ Created staff registration hash: ${newHash.substring(0, 20)}...`);
    }
    
    // Test 3: Simulate enhanced QR code verification
    console.log('\n📋 Test 3: Enhanced QR code verification simulation');
    console.log(`🔍 Testing checkout hash: ${TEST_CHECKOUT_HASH.substring(0, 20)}...`);
    
    // This simulates what the fixed route handler does
    let foundHash = null;
    
    // First, try to find exact hash match (should fail for enhanced QR codes)
    foundHash = await StaffHash.findOne({
      userId: TEST_USER_ID,
      uniqueHash: TEST_CHECKOUT_HASH,
      hashType: 'checkout'
    });
    
    if (foundHash) {
      console.log('✅ Found exact hash match (unexpected for enhanced QR codes)');
    } else {
      console.log('ℹ️ No exact hash match found (expected for enhanced QR codes)');
      
      // Look for staff registration hash instead
      foundHash = await StaffHash.findOne({
        userId: TEST_USER_ID,
        hashType: 'staff-registration',
        isActive: true
      });
      
      if (foundHash) {
        console.log('✅ Found staff registration hash for enhanced QR code verification');
        console.log(`   - Registration hash: ${foundHash.uniqueHash.substring(0, 20)}...`);
        console.log(`   - Original URL hash: ${TEST_CHECKOUT_HASH.substring(0, 20)}...`);
        console.log('✅ Hash verification would succeed with the fix!');
      } else {
        console.log('❌ No staff registration hash found - this should not happen');
      }
    }
    
    // Test 4: Test API endpoint
    console.log('\n📋 Test 4: Testing API endpoint');
    const http = require('http');
    
    const testUrl = `http://192.168.165.90:5002/api/qr/verify?hash=${TEST_CHECKOUT_HASH}&type=checkout&userId=${TEST_USER_ID}`;
    console.log(`🔗 Testing URL: ${testUrl}`);
    
    const response = await new Promise((resolve, reject) => {
      const req = http.get(testUrl, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data }));
      });
      req.on('error', reject);
      req.setTimeout(5000, () => reject(new Error('Request timeout')));
    });
    
    if (response.status === 200) {
      console.log('✅ API endpoint test successful!');
      const result = JSON.parse(response.data);
      if (result.success) {
        console.log('✅ Hash verification successful!');
        console.log(`   - User: ${result.data.user.firstName} ${result.data.user.lastName}`);
        console.log(`   - Hash type: ${result.data.hash.type}`);
        console.log(`   - Enhanced QR: ${result.data.hash.isEnhancedQR}`);
        console.log(`   - Original hash: ${result.data.hash.originalHash.substring(0, 20)}...`);
      } else {
        console.log('❌ Hash verification failed:', result.message);
      }
    } else {
      console.log(`❌ API endpoint test failed with status: ${response.status}`);
      console.log('Response:', response.data);
    }
    
    console.log('\n🎉 Hash fix test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from database');
  }
}

// Run the test
testHashFix();
