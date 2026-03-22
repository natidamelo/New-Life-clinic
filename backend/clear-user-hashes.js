const mongoose = require('mongoose');
const StaffHash = require('./models/StaffHash');

async function clearUserHashes() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to database');
    
    console.log('🔍 Looking for existing hashes for user 6823301cdefc7776bf7537b3...');
    const hashes = await StaffHash.find({ userId: '6823301cdefc7776bf7537b3' });
    console.log('Found', hashes.length, 'existing hashes');
    
    for (const hash of hashes) {
      console.log('Hash:', hash.hashType, 'Active:', hash.isActive, 'Hash:', hash.uniqueHash.substring(0, 20) + '...');
    }
    
    console.log('🗑️ Deleting all hashes for this user to force fresh generation...');
    const result = await StaffHash.deleteMany({ userId: '6823301cdefc7776bf7537b3' });
    console.log('✅ Deleted', result.deletedCount, 'hashes');
    
    console.log('🎯 User hashes cleared. Next QR generation will use correct IP address.');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

clearUserHashes();
