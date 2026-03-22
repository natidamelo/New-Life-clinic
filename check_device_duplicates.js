const mongoose = require('mongoose');
require('dotenv').config();

async function checkDeviceDuplicates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms');
    console.log('Connected to database');

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
    const DeviceRegistration = mongoose.model('DeviceRegistration', new mongoose.Schema({}, { strict: false }), 'deviceregistrations');
    const StaffHash = mongoose.model('StaffHash', new mongoose.Schema({}, { strict: false }), 'staffhashes');

    // Check for Almaz Girmaye
    const almazUsers = await User.find({
      firstName: { $regex: 'almaz', $options: 'i' },
      lastName: { $regex: 'girmaye', $options: 'i' }
    });

    console.log('\n=== ALMAZ GIRMATE DEVICE REGISTRATIONS ===');
    for (const user of almazUsers) {
      console.log(`\nUser: ${user.firstName} ${user.lastName} (ID: ${user._id})`);

      // Check DeviceRegistration records
      const deviceRegs = await DeviceRegistration.find({ userId: user._id });
      console.log(`  DeviceRegistration records: ${deviceRegs.length}`);
      deviceRegs.forEach((reg, index) => {
        console.log(`    ${index + 1}. ID: ${reg._id}`);
        console.log(`       DeviceHash: ${reg.deviceHash?.substring(0, 12)}...`);
        console.log(`       DeviceFingerprint: ${reg.deviceFingerprint?.substring(0, 12)}...`);
        console.log(`       IsActive: ${reg.isActive}`);
        console.log(`       RegisteredAt: ${reg.registeredAt}`);
        console.log(`       LastUsed: ${reg.lastUsed}`);
        console.log('');
      });

      // Check StaffHash records
      const staffHashes = await StaffHash.find({ userId: user._id });
      console.log(`  StaffHash records: ${staffHashes.length}`);
      staffHashes.forEach((hash, index) => {
        console.log(`    ${index + 1}. ID: ${hash._id}`);
        console.log(`       Hash: ${hash.uniqueHash?.substring(0, 12)}...`);
        console.log(`       Type: ${hash.hashType}`);
        console.log(`       IsActive: ${hash.isActive}`);
        console.log(`       UsageCount: ${hash.usageCount || 0}`);
        console.log(`       CreatedAt: ${hash.createdAt}`);
        console.log(`       LastUsed: ${hash.lastUsed}`);
        console.log('');
      });
    }

    // Check for Natan
    const natanUsers = await User.find({
      firstName: { $regex: 'natan', $options: 'i' }
    });

    console.log('\n=== NATAN DEVICE REGISTRATIONS ===');
    for (const user of natanUsers) {
      console.log(`\nUser: ${user.firstName} ${user.lastName} (ID: ${user._id})`);

      // Check DeviceRegistration records
      const deviceRegs = await DeviceRegistration.find({ userId: user._id });
      console.log(`  DeviceRegistration records: ${deviceRegs.length}`);
      deviceRegs.forEach((reg, index) => {
        console.log(`    ${index + 1}. ID: ${reg._id}`);
        console.log(`       DeviceHash: ${reg.deviceHash?.substring(0, 12)}...`);
        console.log(`       DeviceFingerprint: ${reg.deviceFingerprint?.substring(0, 12)}...`);
        console.log(`       IsActive: ${reg.isActive}`);
        console.log(`       RegisteredAt: ${reg.registeredAt}`);
        console.log(`       LastUsed: ${reg.lastUsed}`);
        console.log('');
      });

      // Check StaffHash records
      const staffHashes = await StaffHash.find({ userId: user._id });
      console.log(`  StaffHash records: ${staffHashes.length}`);
      staffHashes.forEach((hash, index) => {
        console.log(`    ${index + 1}. ID: ${hash._id}`);
        console.log(`       Hash: ${hash.uniqueHash?.substring(0, 12)}...`);
        console.log(`       Type: ${hash.hashType}`);
        console.log(`       IsActive: ${hash.isActive}`);
        console.log(`       UsageCount: ${hash.usageCount || 0}`);
        console.log(`       CreatedAt: ${hash.createdAt}`);
        console.log(`       LastUsed: ${hash.lastUsed}`);
        console.log('');
      });
    }

    // Check for duplicate device fingerprints across all users
    console.log('\n=== CHECKING FOR DUPLICATE DEVICE FINGERPRINTS ===');
    const allDeviceRegs = await DeviceRegistration.find({ isActive: true });
    const fingerprintMap = {};

    allDeviceRegs.forEach(reg => {
      if (!fingerprintMap[reg.deviceFingerprint]) {
        fingerprintMap[reg.deviceFingerprint] = [];
      }
      fingerprintMap[reg.deviceFingerprint].push(reg);
    });

    let duplicatesFound = 0;
    for (const [fingerprint, regs] of Object.entries(fingerprintMap)) {
      if (regs.length > 1) {
        duplicatesFound++;
        console.log(`\n❌ DUPLICATE FINGERPRINT: ${fingerprint.substring(0, 12)}... (${regs.length} registrations)`);
        regs.forEach((reg, index) => {
          console.log(`  ${index + 1}. UserID: ${reg.userId}, Registered: ${reg.registeredAt}`);
        });
      }
    }

    if (duplicatesFound === 0) {
      console.log('✅ No duplicate device fingerprints found');
    } else {
      console.log(`\n🚨 Found ${duplicatesFound} duplicate device fingerprints`);
    }

    // Check for users with multiple active device registrations
    console.log('\n=== CHECKING FOR USERS WITH MULTIPLE ACTIVE DEVICES ===');
    const activeRegsByUser = {};
    allDeviceRegs.forEach(reg => {
      if (!activeRegsByUser[reg.userId]) {
        activeRegsByUser[reg.userId] = [];
      }
      activeRegsByUser[reg.userId].push(reg);
    });

    let multiDeviceUsers = 0;
    for (const [userId, regs] of Object.entries(activeRegsByUser)) {
      if (regs.length > 1) {
        multiDeviceUsers++;
        const user = await User.findById(userId).select('firstName lastName');
        console.log(`\n⚠️  USER WITH MULTIPLE DEVICES: ${user?.firstName} ${user?.lastName} (${regs.length} devices)`);
        regs.forEach((reg, index) => {
          console.log(`  ${index + 1}. Fingerprint: ${reg.deviceFingerprint?.substring(0, 12)}..., Registered: ${reg.registeredAt}`);
        });
      }
    }

    if (multiDeviceUsers === 0) {
      console.log('✅ No users with multiple active device registrations');
    } else {
      console.log(`\n🚨 Found ${multiDeviceUsers} users with multiple active device registrations`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

checkDeviceDuplicates();