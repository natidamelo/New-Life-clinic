const mongoose = require('mongoose');
require('dotenv').config();

async function cleanupDuplicateRegistrations() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms');
    console.log('Connected to database');

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
    const DeviceRegistration = mongoose.model('DeviceRegistration', new mongoose.Schema({}, { strict: false }), 'deviceregistrations');

    console.log('\n🧹 CLEANING UP DUPLICATE DEVICE REGISTRATIONS...\n');

    // Find all active device registrations
    const allActiveRegs = await DeviceRegistration.find({ isActive: true });
    console.log(`Found ${allActiveRegs.length} active device registrations`);

    // Group by userId to find users with multiple active registrations
    const userRegs = {};
    allActiveRegs.forEach(reg => {
      if (!userRegs[reg.userId]) {
        userRegs[reg.userId] = [];
      }
      userRegs[reg.userId].push(reg);
    });

    let totalCleaned = 0;

    // Process each user
    for (const [userId, regs] of Object.entries(userRegs)) {
      if (regs.length > 1) {
        const user = await User.findById(userId).select('firstName lastName username');
        console.log(`\n⚠️  User ${user?.firstName} ${user?.lastName} has ${regs.length} active devices:`);

        // Sort by registration date (keep the most recent)
        regs.sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));

        // Keep the most recent registration, deactivate others
        for (let i = 1; i < regs.length; i++) {
          const reg = regs[i];
          console.log(`  ❌ Deactivating duplicate: ${reg.deviceFingerprint.substring(0, 12)}... (registered: ${reg.registeredAt})`);
          reg.isActive = false;
          await reg.save();
          totalCleaned++;
        }

        console.log(`  ✅ Keeping most recent: ${regs[0].deviceFingerprint.substring(0, 12)}... (registered: ${regs[0].registeredAt})`);
      }
    }

    // Check for device fingerprints used by multiple users (shouldn't happen with new logic)
    const fingerprintUsers = {};
    allActiveRegs.forEach(reg => {
      if (!fingerprintUsers[reg.deviceFingerprint]) {
        fingerprintUsers[reg.deviceFingerprint] = [];
      }
      fingerprintUsers[reg.deviceFingerprint].push(reg);
    });

    let conflictCleaned = 0;
    for (const [fingerprint, regs] of Object.entries(fingerprintUsers)) {
      if (regs.length > 1) {
        console.log(`\n🚨 CRITICAL: Device fingerprint used by multiple users: ${fingerprint.substring(0, 12)}...`);

        // Sort by registration date, keep the earliest (first registered)
        regs.sort((a, b) => new Date(a.registeredAt) - new Date(b.registeredAt));

        // Deactivate all but the first
        for (let i = 1; i < regs.length; i++) {
          const reg = regs[i];
          const user = await User.findById(reg.userId).select('firstName lastName');
          console.log(`  ❌ Deactivating conflict for ${user?.firstName} ${user?.lastName}: ${reg.registeredAt}`);
          reg.isActive = false;
          await reg.save();
          conflictCleaned++;
        }

        const firstUser = await User.findById(regs[0].userId).select('firstName lastName');
        console.log(`  ✅ Keeping for ${firstUser?.firstName} ${firstUser?.lastName}: ${regs[0].registeredAt}`);
      }
    }

    console.log(`\n🧹 CLEANUP COMPLETE:`);
    console.log(`  - Deactivated ${totalCleaned} duplicate user registrations`);
    console.log(`  - Resolved ${conflictCleaned} device conflicts`);
    console.log(`  - Total cleaned: ${totalCleaned + conflictCleaned}`);

    // Verify cleanup
    const remainingActive = await DeviceRegistration.find({ isActive: true });
    console.log(`\n✅ VERIFICATION: ${remainingActive.length} active registrations remain`);

    // Check for specific users mentioned
    const almazUsers = await User.find({
      firstName: { $regex: 'almaz', $options: 'i' },
      lastName: { $regex: 'girmaye', $options: 'i' }
    });

    const natanUsers = await User.find({
      firstName: { $regex: 'natan', $options: 'i' }
    });

    console.log(`\n📊 FINAL STATUS:`);
    console.log(`  - Almaz Girmaye users: ${almazUsers.length}`);
    console.log(`  - Natan users: ${natanUsers.length}`);

    for (const user of almazUsers) {
      const activeRegs = await DeviceRegistration.find({ userId: user._id, isActive: true });
      console.log(`  - Almaz ${user.firstName} ${user.lastName}: ${activeRegs.length} active device(s)`);
    }

    for (const user of natanUsers) {
      const activeRegs = await DeviceRegistration.find({ userId: user._id, isActive: true });
      console.log(`  - Natan ${user.firstName} ${user.lastName}: ${activeRegs.length} active device(s)`);
    }

  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await mongoose.connection.close();
  }
}

cleanupDuplicateRegistrations();