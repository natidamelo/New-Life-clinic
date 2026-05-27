const cron = require('node-cron');
const PatientPackage = require('../models/PatientPackage');

class PackageExpiryService {
  constructor() {
    this.isRunning = false;
  }

  async start() {
    if (this.isRunning) {
      console.log('📦 Package expiry service already running');
      return;
    }

    console.log('📦 Starting package expiry service...');

    // Run nightly at midnight (00:00) in Africa/Addis_Ababa timezone
    cron.schedule('0 0 * * *', async () => {
      console.log('📦 Running nightly check for expired patient packages...');
      await this.expirePackages();
    }, {
      scheduled: true,
      timezone: "Africa/Addis_Ababa"
    });

    this.isRunning = true;
    console.log('✅ Package expiry service started - will run nightly at midnight');
  }

  async expirePackages() {
    try {
      const now = new Date();
      
      // Auto-expire packages where expiry_date has passed and status is still active
      const result = await PatientPackage.updateMany(
        {
          status: 'active',
          expiry_date: { $lt: now }
        },
        {
          $set: { status: 'expired' }
        }
      );
      
      console.log(`📦 Package Expiry: Updated ${result.modifiedCount} packages to 'expired' status.`);
    } catch (error) {
      console.error('❌ Error executing package expiry check:', error);
    }
  }

  async stop() {
    this.isRunning = false;
    console.log('🛑 Package expiry service stopped');
  }
}

module.exports = new PackageExpiryService();
