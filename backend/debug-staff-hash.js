const mongoose = require('mongoose');
require('dotenv').config();

// StaffHash Schema
const staffHashSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  uniqueHash: { type: String, required: true },
  hashType: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  isPermanent: { type: Boolean, default: false },
  registeredAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
  usageCount: { type: Number, default: 0 },
  lastUsed: { type: Date }
}, { timestamps: true });

const StaffHash = mongoose.model('StaffHash', staffHashSchema);

async function debugStaffHash() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to MongoDB');

    const userId = '6823301cdefc7776bf7537b3';
    
    console.log('🔍 Checking for staff hashes for user:', userId);
    
    // Check all hashes for this user
    const allHashes = await StaffHash.find({ userId: new mongoose.Types.ObjectId(userId) });
    console.log('📋 All hashes found:', allHashes.length);
    
    allHashes.forEach((hash, index) => {
      console.log(`  Hash ${index + 1}:`, {
        id: hash._id,
        hashType: hash.hashType,
        uniqueHash: hash.uniqueHash?.substring(0, 20) + '...',
        isActive: hash.isActive,
        isPermanent: hash.isPermanent,
        registeredAt: hash.registeredAt
      });
    });
    
    // Check specifically for staff-registration hash
    const staffRegHash = await StaffHash.findOne({ 
      userId: new mongoose.Types.ObjectId(userId), 
      hashType: 'staff-registration',
      isActive: true
    });
    
    if (staffRegHash) {
      console.log('✅ Found staff-registration hash:', {
        id: staffRegHash._id,
        uniqueHash: staffRegHash.uniqueHash?.substring(0, 20) + '...',
        isActive: staffRegHash.isActive
      });
    } else {
      console.log('❌ No staff-registration hash found');
      
      // Check if there are any inactive ones
      const inactiveHash = await StaffHash.findOne({ 
        userId: new mongoose.Types.ObjectId(userId), 
        hashType: 'staff-registration'
      });
      
      if (inactiveHash) {
        console.log('⚠️ Found inactive staff-registration hash:', {
          id: inactiveHash._id,
          uniqueHash: inactiveHash.uniqueHash?.substring(0, 20) + '...',
          isActive: inactiveHash.isActive
        });
      }
    }
    
    // Check the collection indexes
    const indexes = await StaffHash.collection.indexes();
    console.log('🔍 Collection indexes:', indexes.map(idx => ({
      name: idx.name,
      key: idx.key,
      unique: idx.unique
    })));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

debugStaffHash();
