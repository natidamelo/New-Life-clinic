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

async function cleanupDuplicateHash() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to MongoDB');

    const userId = '6823301cdefc7776bf7537b3';
    
    console.log('🔍 Cleaning up duplicate hashes for user:', userId);
    
    // Find the qr-checkin hash that shouldn't exist
    const qrCheckinHash = await StaffHash.findOne({ 
      userId: new mongoose.Types.ObjectId(userId), 
      hashType: 'qr-checkin'
    });
    
    if (qrCheckinHash) {
      console.log('🗑️ Found qr-checkin hash that should be removed:', {
        id: qrCheckinHash._id,
        uniqueHash: qrCheckinHash.uniqueHash?.substring(0, 20) + '...',
        registeredAt: qrCheckinHash.registeredAt
      });
      
      // Remove the qr-checkin hash
      await StaffHash.findByIdAndDelete(qrCheckinHash._id);
      console.log('✅ Removed qr-checkin hash');
    } else {
      console.log('✅ No qr-checkin hash found to remove');
    }
    
    // Reactivate the staff-registration hash
    const staffRegHash = await StaffHash.findOne({ 
      userId: new mongoose.Types.ObjectId(userId), 
      hashType: 'staff-registration'
    });
    
    if (staffRegHash && !staffRegHash.isActive) {
      console.log('🔧 Reactivating staff-registration hash...');
      staffRegHash.isActive = true;
      await staffRegHash.save();
      console.log('✅ Reactivated staff-registration hash');
    }
    
    // Show final state
    const finalHashes = await StaffHash.find({ userId: new mongoose.Types.ObjectId(userId) });
    console.log('📋 Final hashes after cleanup:', finalHashes.length);
    
    finalHashes.forEach((hash, index) => {
      console.log(`  Hash ${index + 1}:`, {
        id: hash._id,
        hashType: hash.hashType,
        uniqueHash: hash.uniqueHash?.substring(0, 20) + '...',
        isActive: hash.isActive,
        isPermanent: hash.isPermanent
      });
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

cleanupDuplicateHash();
