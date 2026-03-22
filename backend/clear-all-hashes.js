const mongoose = require('mongoose');
const StaffHash = require('./models/StaffHash');
const User = require('./models/User');

async function clearAllHashes() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to database');
    
    console.log('🔍 Looking for all staff hashes...');
    const allHashes = await StaffHash.find({});
    console.log('Found', allHashes.length, 'total hashes');
    
    for (const hash of allHashes) {
      const user = await User.findById(hash.userId);
      console.log('User:', user ? user.firstName + ' ' + user.lastName : 'Unknown', 'Hash:', hash.uniqueHash.substring(0, 20) + '...', 'Type:', hash.hashType);
    }
    
    console.log('🗑️ Clearing ALL hashes to force fresh generation...');
    const result = await StaffHash.deleteMany({});
    console.log('✅ Deleted', result.deletedCount, 'hashes total');
    
    console.log('🎯 All hashes cleared. Next QR generation will use correct IP address.');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

clearAllHashes();
