/**
 * Payment Synchronization Monitor
 * 
 * This utility monitors payment synchronization failures and provides:
 * - Real-time failure tracking
 * - Automatic alerting
 * - Failure pattern analysis
 * - Recovery recommendations
 */

const mongoose = require('mongoose');

class PaymentSyncMonitor {
  constructor() {
    this.failureCounts = new Map(); // Track failures by invoice ID
    this.lastFailureTime = new Map(); // Track when failures occurred
    this.recoveryAttempts = new Map(); // Track recovery attempts
    this.alertThreshold = 3; // Alert after 3 failures
    this.recoveryThreshold = 5; // Attempt recovery after 5 failures
  }
  
  /**
   * Record a synchronization failure
   * @param {string} invoiceId - Invoice ID that failed to sync
   * @param {Error} error - The error that occurred
   * @param {Object} context - Additional context about the failure
   */
  recordFailure(invoiceId, error, context = {}) {
    const now = new Date();
    
    // Initialize tracking for this invoice if not exists
    if (!this.failureCounts.has(invoiceId)) {
      this.failureCounts.set(invoiceId, 0);
      this.lastFailureTime.set(invoiceId, now);
      this.recoveryAttempts.set(invoiceId, 0);
    }
    
    // Increment failure count
    const currentFailures = this.failureCounts.get(invoiceId) + 1;
    this.failureCounts.set(invoiceId, currentFailures);
    this.lastFailureTime.set(invoiceId, now);
    
    console.error(`🚨 [SYNC MONITOR] Failure #${currentFailures} for invoice ${invoiceId}:`, {
      error: error.message,
      stack: error.stack,
      context,
      timestamp: now.toISOString(),
      totalFailures: currentFailures
    });
    
    // Check if we should alert
    if (currentFailures >= this.alertThreshold) {
      this.triggerAlert(invoiceId, currentFailures, error, context);
    }
    
    // Check if we should attempt recovery
    if (currentFailures >= this.recoveryThreshold) {
      this.attemptRecovery(invoiceId);
    }
  }
  
  /**
   * Record a successful synchronization
   * @param {string} invoiceId - Invoice ID that synced successfully
   * @param {Object} result - Sync result
   */
  recordSuccess(invoiceId, result) {
    // Reset failure tracking for this invoice
    this.failureCounts.delete(invoiceId);
    this.lastFailureTime.delete(invoiceId);
    this.recoveryAttempts.delete(invoiceId);
    
    console.log(`✅ [SYNC MONITOR] Success for invoice ${invoiceId}, resetting failure tracking`);
  }
  
  /**
   * Trigger an alert for repeated failures
   * @param {string} invoiceId - Invoice ID with repeated failures
   * @param {number} failureCount - Number of failures
   * @param {Error} error - The error that occurred
   * @param {Object} context - Additional context
   */
  triggerAlert(invoiceId, failureCount, error, context) {
    const alertMessage = `🚨 PAYMENT SYNC ALERT: Invoice ${invoiceId} has failed ${failureCount} times`;
    const details = {
      invoiceId,
      failureCount,
      lastError: error.message,
      lastFailureTime: this.lastFailureTime.get(invoiceId).toISOString(),
      context,
      recommendations: this.getRecoveryRecommendations(failureCount)
    };
    
    // Log alert
    console.error(alertMessage);
    console.error('📊 Alert Details:', details);
    
    // TODO: Send to monitoring service (e.g., Sentry, LogRocket, etc.)
    // TODO: Send email/SMS alert to administrators
    // TODO: Create incident ticket
    
    // For now, log to console with clear formatting
    console.error('='.repeat(80));
    console.error('🚨 CRITICAL PAYMENT SYNCHRONIZATION FAILURE 🚨');
    console.error('='.repeat(80));
    console.error(`Invoice ID: ${invoiceId}`);
    console.error(`Failure Count: ${failureCount}`);
    console.error(`Last Error: ${error.message}`);
    console.error(`Last Failure: ${this.lastFailureTime.get(invoiceId).toISOString()}`);
    console.error(`Context: ${JSON.stringify(context, null, 2)}`);
    console.error('='.repeat(80));
  }
  
  /**
   * Attempt automatic recovery for failed synchronizations
   * @param {string} invoiceId - Invoice ID to attempt recovery for
   */
  async attemptRecovery(invoiceId) {
    const recoveryCount = this.recoveryAttempts.get(invoiceId) || 0;
    const maxRecoveryAttempts = 3;
    
    if (recoveryCount >= maxRecoveryAttempts) {
      console.error(`💥 [SYNC MONITOR] Max recovery attempts (${maxRecoveryAttempts}) reached for invoice ${invoiceId}`);
      this.triggerAlert(invoiceId, this.failureCounts.get(invoiceId), 
        new Error('Max recovery attempts reached'), { recoveryCount });
      return;
    }
    
    this.recoveryAttempts.set(invoiceId, recoveryCount + 1);
    
    console.log(`🔄 [SYNC MONITOR] Attempting recovery #${recoveryCount + 1} for invoice ${invoiceId}`);
    
    try {
      // Use the robust payment service for recovery
      const RobustPaymentService = require('../services/robustPaymentService');
      const recoveryResult = await RobustPaymentService.emergencySyncPrescriptions(invoiceId);
      
      if (recoveryResult.success) {
        console.log(`✅ [SYNC MONITOR] Recovery successful for invoice ${invoiceId}`);
        this.recordSuccess(invoiceId, recoveryResult);
      } else {
        console.error(`❌ [SYNC MONITOR] Recovery failed for invoice ${invoiceId}:`, recoveryResult.error);
        this.recordFailure(invoiceId, new Error(recoveryResult.error), { 
          recoveryAttempt: recoveryCount + 1,
          recoveryResult 
        });
      }
    } catch (recoveryError) {
      console.error(`💥 [SYNC MONITOR] Recovery attempt failed for invoice ${invoiceId}:`, recoveryError);
      this.recordFailure(invoiceId, recoveryError, { 
        recoveryAttempt: recoveryCount + 1,
        recoveryError: recoveryError.message 
      });
    }
  }
  
  /**
   * Get recovery recommendations based on failure count
   * @param {number} failureCount - Number of failures
   * @returns {Array} - Array of recovery recommendations
   */
  getRecoveryRecommendations(failureCount) {
    const recommendations = [];
    
    if (failureCount >= 3) {
      recommendations.push('Check database connectivity and performance');
      recommendations.push('Verify prescription and invoice data integrity');
      recommendations.push('Review application logs for detailed error information');
    }
    
    if (failureCount >= 5) {
      recommendations.push('Attempt manual recovery using emergency sync');
      recommendations.push('Check for database locks or transaction conflicts');
      recommendations.push('Verify MongoDB session management');
    }
    
    if (failureCount >= 10) {
      recommendations.push('CRITICAL: Manual intervention required');
      recommendations.push('Check system resources and database health');
      recommendations.push('Consider restarting the application service');
    }
    
    return recommendations;
  }
  
  /**
   * Get current failure statistics
   * @returns {Object} - Failure statistics
   */
  getFailureStats() {
    const stats = {
      totalInvoicesWithFailures: this.failureCounts.size,
      totalFailures: Array.from(this.failureCounts.values()).reduce((sum, count) => sum + count, 0),
      invoicesNeedingRecovery: 0,
      invoicesAtAlertThreshold: 0,
      recentFailures: []
    };
    
    for (const [invoiceId, failureCount] of this.failureCounts) {
      if (failureCount >= this.recoveryThreshold) {
        stats.invoicesNeedingRecovery++;
      }
      if (failureCount >= this.alertThreshold) {
        stats.invoicesAtAlertThreshold++;
      }
      
      // Add recent failure info
      stats.recentFailures.push({
        invoiceId,
        failureCount,
        lastFailureTime: this.lastFailureTime.get(invoiceId).toISOString(),
        recoveryAttempts: this.recoveryAttempts.get(invoiceId) || 0
      });
    }
    
    return stats;
  }
  
  /**
   * Reset failure tracking for a specific invoice
   * @param {string} invoiceId - Invoice ID to reset
   */
  resetInvoiceTracking(invoiceId) {
    this.failureCounts.delete(invoiceId);
    this.lastFailureTime.delete(invoiceId);
    this.recoveryAttempts.delete(invoiceId);
    console.log(`🔄 [SYNC MONITOR] Reset failure tracking for invoice ${invoiceId}`);
  }
  
  /**
   * Reset all failure tracking
   */
  resetAllTracking() {
    this.failureCounts.clear();
    this.lastFailureTime.clear();
    this.recoveryAttempts.clear();
    console.log(`🔄 [SYNC MONITOR] Reset all failure tracking`);
  }
}

// Create singleton instance
const paymentSyncMonitor = new PaymentSyncMonitor();

module.exports = paymentSyncMonitor;
