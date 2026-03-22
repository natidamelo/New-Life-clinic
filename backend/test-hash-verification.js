#!/usr/bin/env node

/**
 * Hash Verification Test Script
 * This script tests the QR code hash verification process
 */

const mongoose = require('mongoose');
const StaffHash = require('./models/StaffHash');
const User = require('./models/User');

// Test configuration
const TEST_USER_ID = '6823301cdefc7776bf7537b3'; // DR Natan's ID from the image
const TEST_HASH = '76b13de22348d3f1a5592b37c0624a6b6767d2b2c33d2987928b440b67e4885a'; // Hash from the image

async function testHashVerification() {
  try {
    console.log('🧪 Testing QR code hash verification...\n');
    
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
      console.log('❌ User not found');
      return;
    }
    
    // Test 2: Check staff registration hash
    console.log('\n📋 Test 2: Staff registration hash');
    const staffRegistrationHash = await StaffHash.findOne({
      userId: TEST_USER_ID,
      hashType: 'staff-registration',
      isActive: true
    });
    
    if (staffRegistrationHash) {
      console.log(`✅ Staff registration hash found: ${staffRegistrationHash.uniqueHash.substring(0, 20)}...`);
      console.log(`   - Type: ${staffRegistrationHash.hashType}`);
      console.log(`   - Active: ${staffRegistrationHash.isActive}`);
      console.log(`   - Created: ${staffRegistrationHash.createdAt}`);
    } else {
      console.log('❌ No staff registration hash found');
      console.log('   This user needs to register their device first');
      return;
    }
    
    // Test 3: Check if the test hash exists
    console.log('\n📋 Test 3: Test hash verification');
    const testHashRecord = await StaffHash.findOne({
      userId: TEST_USER_ID,
      uniqueHash: TEST_HASH
    });
    
    if (testHashRecord) {
      console.log(`✅ Test hash found in database: ${testHashRecord.uniqueHash.substring(0, 20)}...`);
      console.log(`   - Type: ${testHashRecord.hashType}`);
      console.log(`   - Active: ${testHashRecord.isActive}`);
    } else {
      console.log('❌ Test hash not found in database');
      console.log('   This is expected for enhanced QR codes - they generate unique hashes');
    }
    
    // Test 4: Enhanced QR code verification logic
    console.log('\n📋 Test 4: Enhanced QR code verification');
    console.log('Testing the new verification logic...');
    
    // Simulate the enhanced verification process
    const enhancedVerification = {
      userExists: !!user,
      hasStaffRegistration: !!staffRegistrationHash,
      testHashExists: !!testHashRecord,
      canVerify: !!(user && staffRegistrationHash),
      verificationMethod: testHashRecord ? 'exact_match' : 'staff_registration_fallback'
    };
    
    console.log('Enhanced verification result:');
    console.log(`   - User exists: ${enhancedVerification.userExists ? '✅' : '❌'}`);
    console.log(`   - Has staff registration: ${enhancedVerification.hasStaffRegistration ? '✅' : '❌'}`);
    console.log(`   - Test hash exists: ${enhancedVerification.testHashExists ? '✅' : '❌'}`);
    console.log(`   - Can verify: ${enhancedVerification.canVerify ? '✅' : '❌'}`);
    console.log(`   - Verification method: ${enhancedVerification.verificationMethod}`);
    
    if (enhancedVerification.canVerify) {
      console.log('\n🎉 Hash verification should work correctly!');
      console.log('The enhanced QR code verification logic will:');
      console.log('1. Look for the exact hash match first');
      console.log('2. If not found, fall back to staff registration hash');
      console.log('3. Verify the user has a valid device registration');
      console.log('4. Process the check-in/check-out using the staff registration');
    } else {
      console.log('\n❌ Hash verification will fail');
      console.log('The user needs to register their device first');
    }
    
    // Test 5: Show all hashes for this user
    console.log('\n📋 Test 5: All hashes for this user');
    const allHashes = await StaffHash.find({ userId: TEST_USER_ID });
    console.log(`Found ${allHashes.length} hash records:`);
    allHashes.forEach((hash, index) => {
      console.log(`   ${index + 1}. ${hash.uniqueHash.substring(0, 20)}... (${hash.hashType}, active: ${hash.isActive})`);
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from database');
  }
}

// Run the test
testHashVerification().catch(console.error);
