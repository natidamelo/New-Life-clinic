const AutomaticOvertimeService = require('./automaticOvertimeService');
const { logger } = require('../middleware/errorHandler');

/**
 * Scheduled Overtime Job Service
 * 
 * This service automatically runs the overtime transition process at scheduled times.
 * It ensures staff who forgot to clock out are automatically handled when regular hours end.
 */
class ScheduledOvertimeJob {
  constructor() {
    this.jobInterval = null;
    this.isRunning = false;
    this.lastRunTime = null;
    this.nextRunTime = null;
  }

  /**
   * Start the scheduled overtime job
   */
  start() {
    if (this.isRunning) {
      logger.info('🔄 Scheduled overtime job is already running');
      return;
    }

    logger.info('🚀 Starting scheduled overtime job service...');
    this.isRunning = true;

    // Run immediately to check if it's already overtime
    this.runOvertimeTransition();

    // Schedule to run every minute to check for overtime transition
    this.jobInterval = setInterval(() => {
      this.runOvertimeTransition();
    }, 60000); // Every minute

    logger.info('✅ Scheduled overtime job started - checking every minute');
  }

  /**
   * Stop the scheduled overtime job
   */
  stop() {
    if (!this.isRunning) {
      logger.info('🔄 Scheduled overtime job is not running');
      return;
    }

    logger.info('🛑 Stopping scheduled overtime job...');
    this.isRunning = false;

    if (this.jobInterval) {
      clearInterval(this.jobInterval);
      this.jobInterval = null;
    }

    logger.info('✅ Scheduled overtime job stopped');
  }

  /**
   * Run the overtime transition process
   */
  async runOvertimeTransition() {
    try {
      // Check if it's time to run the overtime transition
      if (!this.shouldRunOvertimeTransition()) {
        return;
      }

      logger.info('🔄 Running scheduled overtime transition...');
      
      const result = await AutomaticOvertimeService.processAutomaticOvertimeTransition();
      
      if (result.success) {
        this.lastRunTime = new Date();
        this.calculateNextRunTime();
        
        logger.info(`✅ Scheduled overtime transition completed successfully`, {
          processedCount: result.processedCount,
          message: result.message,
          lastRunTime: this.lastRunTime,
          nextRunTime: this.nextRunTime
        });

        // Log detailed results for monitoring
        if (result.processedCount > 0) {
          logger.info(`📊 Overtime transition processed ${result.processedCount} staff members:`, {
            results: result.results.map(r => ({
              userId: r.userId,
              success: r.success,
              message: r.message,
              user: r.data?.user
            }))
          });
        }
      } else {
        logger.error('❌ Scheduled overtime transition failed:', {
          message: result.message,
          error: result.error
        });
      }

    } catch (error) {
      logger.error('❌ Error in scheduled overtime transition:', error);
    }
  }

  /**
   * Check if the overtime transition should run
   * @returns {boolean} True if should run
   */
  shouldRunOvertimeTransition() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Only run once per day when regular hours end (5:00 PM)
    // Check if it's between 5:00 PM and 5:01 PM to ensure we only run once
    if (currentHour === 17 && currentMinute === 0) { // 5:00 PM exactly
      // Check if we already ran today
      if (this.lastRunTime) {
        const lastRunDate = new Date(this.lastRunTime);
        const today = new Date();
        
        // If we already ran today, don't run again
        if (lastRunDate.getDate() === today.getDate() &&
            lastRunDate.getMonth() === today.getMonth() &&
            lastRunDate.getFullYear() === today.getFullYear()) {
          return false;
        }
      }
      
      return true;
    }
    
    return false;
  }

  /**
   * Calculate the next run time
   */
  calculateNextRunTime() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(17, 0, 0, 0); // 5:00 PM tomorrow
    
    this.nextRunTime = tomorrow;
  }

  /**
   * Get the current status of the scheduled job
   * @returns {Object} Job status information
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRunTime: this.lastRunTime,
      nextRunTime: this.nextRunTime,
      currentTime: new Date(),
      isOvertimeTime: AutomaticOvertimeService.isOvertimeTime(),
      hasRegularHoursEnded: AutomaticOvertimeService.hasRegularHoursEnded(),
      timeUntilOvertime: AutomaticOvertimeService.getTimeUntilOvertime()
    };
  }

  /**
   * Manually trigger the overtime transition (for admin use)
   * @returns {Promise<Object>} Result of the manual trigger
   */
  async manualTrigger() {
    try {
      logger.info('🔧 Manual overtime transition triggered by admin');
      
      const result = await AutomaticOvertimeService.processAutomaticOvertimeTransition();
      
      if (result.success) {
        this.lastRunTime = new Date();
        this.calculateNextRunTime();
        
        logger.info('✅ Manual overtime transition completed successfully', {
          processedCount: result.processedCount,
          message: result.message
        });
      }
      
      return result;
      
    } catch (error) {
      logger.error('❌ Error in manual overtime transition:', error);
      return {
        success: false,
        message: 'Failed to manually trigger overtime transition',
        error: error.message
      };
    }
  }

  /**
   * Get all automatic overtime transitions for today
   * @returns {Promise<Object>} List of transitions
   */
  async getTodayTransitions() {
    try {
      return await AutomaticOvertimeService.getAutomaticOvertimeTransitions();
    } catch (error) {
      logger.error('❌ Error getting today\'s transitions:', error);
      return {
        success: false,
        message: 'Failed to get today\'s transitions',
        error: error.message
      };
    }
  }
}

// Create a singleton instance
const scheduledOvertimeJob = new ScheduledOvertimeJob();

module.exports = scheduledOvertimeJob;
