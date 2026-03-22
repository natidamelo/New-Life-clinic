#!/usr/bin/env node

/**
 * Check Users Script
 * This script lists all users in the database
 */

const mongoose = require('mongoose');
const User = require('./models/User');

async function checkUsers() {
  try {
    console.log('👥 Checking users in database...\n');
    
    // Connect to database
    await mongoose.connect('mongodb://localhost:27017/clinic', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to database');
    
    // Get all users
    const users = await User.find({}).select('_id firstName lastName username role email');
    
    console.log(`\n📋 Found ${users.length} users:`);
    users.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.firstName} ${user.lastName}`);
      console.log(`      - ID: ${user._id}`);
      console.log(`      - Username: ${user.username}`);
      console.log(`      - Role: ${user.role}`);
      console.log(`      - Email: ${user.email || 'N/A'}`);
      console.log('');
    });
    
    // Look for users with "natan" in the name
    const natanUsers = users.filter(user => 
      user.firstName.toLowerCase().includes('natan') || 
      user.lastName.toLowerCase().includes('natan') ||
      user.username.toLowerCase().includes('natan')
    );
    
    if (natanUsers.length > 0) {
      console.log('🔍 Users with "natan" in name:');
      natanUsers.forEach(user => {
        console.log(`   - ${user.firstName} ${user.lastName} (${user._id})`);
      });
    } else {
      console.log('❌ No users found with "natan" in name');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from database');
  }
}

// Run the check
checkUsers().catch(console.error);
