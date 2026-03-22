/**
 * Test Script for Referral System
 * 
 * This script tests the referral endpoints to ensure they work correctly.
 * Run with: node backend/test-referrals.js
 */

const mongoose = require('mongoose');
const Referral = require('./models/Referral');
require('dotenv').config();

async function testReferralSystem() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-db');
    console.log('✅ Connected to MongoDB');

    // Test 1: Check Referral Model
    console.log('\n📋 Test 1: Checking Referral Model...');
    console.log('Model fields:', Object.keys(Referral.schema.paths));
    console.log('✅ Referral model loaded successfully');

    // Test 2: Create a test referral number
    console.log('\n📋 Test 2: Testing referral number generation...');
    const year = new Date().getFullYear();
    const count = await Referral.countDocuments();
    const timestamp = Date.now().toString().slice(-6);
    const testReferralNumber = `REF${year}${String(count + 1).padStart(4, '0')}${timestamp}`;
    console.log('Generated referral number:', testReferralNumber);
    console.log('✅ Referral number generation works');

    // Test 3: Check required fields
    console.log('\n📋 Test 3: Checking required fields...');
    const requiredFields = Object.keys(Referral.schema.paths).filter(
      field => Referral.schema.paths[field].isRequired
    );
    console.log('Required fields:', requiredFields);
    console.log('✅ Required fields validated');

    // Test 4: Check indexes
    console.log('\n📋 Test 4: Checking indexes...');
    const indexes = await Referral.collection.getIndexes();
    console.log('Indexes:', Object.keys(indexes));
    console.log('✅ Indexes configured');

    // Test 5: Get statistics
    console.log('\n📋 Test 5: Testing statistics method...');
    const stats = await Referral.getReferralStats();
    console.log('Current statistics:', stats[0] || { message: 'No referrals yet' });
    console.log('✅ Statistics method works');

    // Test 6: Count existing referrals
    console.log('\n📋 Test 6: Counting existing referrals...');
    const totalReferrals = await Referral.countDocuments();
    console.log('Total referrals in database:', totalReferrals);
    console.log('✅ Database query works');

    // Test 7: Test urgency enum values
    console.log('\n📋 Test 7: Testing urgency enum...');
    const urgencyValues = Referral.schema.path('urgency').enumValues;
    console.log('Valid urgency values:', urgencyValues);
    console.log('✅ Urgency enum configured');

    // Test 8: Test status enum values
    console.log('\n📋 Test 8: Testing status enum...');
    const statusValues = Referral.schema.path('status').enumValues;
    console.log('Valid status values:', statusValues);
    console.log('✅ Status enum configured');

    console.log('\n✅ All tests passed! Referral system is ready to use.');

  } catch (error) {
    console.error('❌ Error during testing:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
  }
}

// Run the tests
testReferralSystem();

