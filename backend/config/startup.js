/**
 * Startup Configuration
 * 
 * This file handles automatic startup of critical services and monitors
 * to prevent issues like hardcoded medication pricing.
 */

const autoMedicationPricingMonitor = require('../scripts/auto-medication-pricing-monitor');

/**
 * Initialize all startup services
 */
async function initializeStartupServices() {
  try {
    console.log('🚀 [STARTUP] Initializing startup services...');
    
    // Start the automatic medication pricing monitor
    console.log('💰 [STARTUP] Starting medication pricing monitor...');
    await autoMedicationPricingMonitor.start();
    
    console.log('✅ [STARTUP] All startup services initialized successfully');
    
  } catch (error) {
    console.error('❌ [STARTUP] Failed to initialize startup services:', error);
    
    // Don't crash the application, but log the error
    console.log('⚠️ [STARTUP] Application will continue without automatic monitoring');
  }
}

/**
 * Graceful shutdown of all services
 */
async function shutdownStartupServices() {
  try {
    console.log('🛑 [STARTUP] Shutting down startup services...');
    
    // Stop the medication pricing monitor
    if (autoMedicationPricingMonitor.isRunning) {
      autoMedicationPricingMonitor.stop();
      console.log('✅ [STARTUP] Medication pricing monitor stopped');
    }
    
    console.log('✅ [STARTUP] All startup services shut down successfully');
    
  } catch (error) {
    console.error('❌ [STARTUP] Error during shutdown:', error);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 [STARTUP] Received SIGINT, shutting down gracefully...');
  await shutdownStartupServices();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 [STARTUP] Received SIGTERM, shutting down gracefully...');
  await shutdownStartupServices();
  process.exit(0);
});

module.exports = {
  initializeStartupServices,
  shutdownStartupServices,
  autoMedicationPricingMonitor
};

