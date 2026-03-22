const NotificationCleanup = require('./notificationCleanup');

/**
 * Scheduled notification cleanup task
 * This runs automatically to prevent stale notifications from accumulating
 */
class ScheduledNotificationCleanup {
  
  constructor() {
    this.isRunning = false;
    this.interval = null;
  }

  /**
   * Start the scheduled cleanup (runs every hour)
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️ [SCHEDULED CLEANUP] Already running');
      return;
    }

    console.log('🚀 [SCHEDULED CLEANUP] Starting scheduled notification cleanup (every hour)');
    
    this.isRunning = true;
    
    // Run cleanup immediately
    this.runCleanup();
    
    // Then schedule to run every hour
    this.interval = setInterval(() => {
      this.runCleanup();
    }, 60 * 60 * 1000); // 1 hour
  }

  /**
   * Stop the scheduled cleanup
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isRunning = false;
    console.log('🛑 [SCHEDULED CLEANUP] Stopped scheduled notification cleanup');
  }

  /**
   * Run the cleanup process
   */
  async runCleanup() {
    try {
      console.log('🧹 [SCHEDULED CLEANUP] Running scheduled notification cleanup...');
      
      const startTime = Date.now();
      
      // Clean up all stale notifications
      await NotificationCleanup.cleanupAllStaleNotifications();
      
      const duration = Date.now() - startTime;
      console.log(`✅ [SCHEDULED CLEANUP] Cleanup completed in ${duration}ms`);
      
    } catch (error) {
      console.error('❌ [SCHEDULED CLEANUP] Error during scheduled cleanup:', error);
    }
  }

  /**
   * Get the status of the scheduled cleanup
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      hasInterval: this.interval !== null,
      nextRun: this.interval ? 'Every hour' : 'Not scheduled'
    };
  }
}

// Create a singleton instance
const scheduledCleanup = new ScheduledNotificationCleanup();

module.exports = scheduledCleanup; 