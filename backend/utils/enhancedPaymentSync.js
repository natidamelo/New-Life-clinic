/**
 * Enhanced Payment Synchronization Utility
 * 
 * Fixes synchronization issues between prescriptions, invoices, and nurse tasks
 * Ensures atomic operations and proper error handling
 */

const mongoose = require('mongoose');

class EnhancedPaymentSync {
  
  /**
   * Synchronize payment authorization across all related entities
   * @param {string} prescriptionId - Prescription ID
   * @param {Object} paymentData - Payment data
   * @param {Object} session - MongoDB session (optional)
   * @returns {Object} Synchronization result
   */
  static async syncPaymentAuthorization(prescriptionId, paymentData, session = null) {
    try {
      console.log(`🔄 [ENHANCED SYNC] Starting payment sync for prescription ${prescriptionId}`);
      
      const Prescription = require('../models/Prescription');
      const NurseTask = require('../models/NurseTask');
      const MedicalInvoice = require('../models/MedicalInvoice');
      const PaymentCalculation = require('./paymentCalculation');
      
      // Get prescription with related data
      const prescription = await Prescription.findById(prescriptionId)
        .populate('patient')
        .populate('doctor');
      
      if (!prescription) {
        throw new Error(`Prescription ${prescriptionId} not found`);
      }
      
      // Get invoice data
      let invoice = null;
      if (prescription.invoiceId) {
        invoice = await MedicalInvoice.findById(prescription.invoiceId);
      }
      
      // Calculate correct payment authorization
      const medicationDetails = {
        frequency: prescription.frequency,
        duration: prescription.duration,
        medicationName: prescription.medicationName
      };
      
      const amountPaid = invoice ? (invoice.amountPaid || 0) : (paymentData.amountPaid || 0);
      const totalCost = invoice ? (invoice.total || 0) : (prescription.totalCost || 0);
      
      const paymentAuth = PaymentCalculation.calculatePaymentAuthorization(
        medicationDetails,
        amountPaid,
        totalCost
      );
      
      // Normalize payment status for consistency
      const normalizedStatus = PaymentCalculation.normalizePaymentStatus(
        prescription.paymentStatus
      );
      
      // Update prescription with corrected data
      prescription.paymentAuthorization = paymentAuth;
      prescription.paymentStatus = normalizedStatus;
      
      if (session) {
        await prescription.save({ session });
      } else {
        await prescription.save();
      }
      
      console.log(`✅ [ENHANCED SYNC] Updated prescription ${prescriptionId}`);
      
      // Find and update all related nurse tasks
      const nurseTasks = await NurseTask.find({
        $or: [
          { 'medicationDetails.prescriptionId': prescriptionId },
          { patientId: prescription.patient._id, taskType: 'MEDICATION' }
        ]
      });
      
      let updatedTasks = 0;
      for (const task of nurseTasks) {
        try {
          // Update task payment authorization
          task.paymentAuthorization = paymentAuth;
          
          // Ensure invoice link exists for future sync
          if (invoice && !task.medicationDetails.invoiceId) {
            task.medicationDetails.invoiceId = invoice._id;
          }
          
          // Update dose records authorization
          if (task.medicationDetails?.doseRecords) {
            task.medicationDetails.doseRecords.forEach((dose, index) => {
              dose.paymentAuthorized = index < paymentAuth.authorizedDoses;
              dose.paymentStatus = index < paymentAuth.authorizedDoses ? 'authorized' : 'unauthorized';
            });
          }
          
          if (session) {
            await task.save({ session });
          } else {
            await task.save();
          }
          
          updatedTasks++;
          console.log(`✅ [ENHANCED SYNC] Updated nurse task ${task._id}`);
          
        } catch (error) {
          console.error(`❌ [ENHANCED SYNC] Error updating nurse task ${task._id}:`, error.message);
        }
      }
      
      console.log(`✅ [ENHANCED SYNC] Updated ${updatedTasks} nurse tasks`);
      
      return {
        success: true,
        prescriptionId,
        updatedTasks,
        paymentAuth,
        normalizedStatus
      };
      
    } catch (error) {
      console.error(`❌ [ENHANCED SYNC] Error syncing payment authorization:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Synchronize all existing payment authorizations
   * @returns {Object} Synchronization result
   */
  static async syncAllPaymentAuthorizations() {
    try {
      console.log('🔄 [ENHANCED SYNC] Starting full payment authorization sync...');
      
      const Prescription = require('../models/Prescription');
      const prescriptions = await Prescription.find({
        $or: [
          { paymentAuthorization: { $exists: true } },
          { paymentStatus: { $exists: true } }
        ]
      });
      
      let totalSynced = 0;
      let totalErrors = 0;
      
      for (const prescription of prescriptions) {
        try {
          const result = await this.syncPaymentAuthorization(prescription._id, {});
          if (result.success) {
            totalSynced++;
          } else {
            totalErrors++;
          }
        } catch (error) {
          console.error(`❌ [ENHANCED SYNC] Error syncing prescription ${prescription._id}:`, error.message);
          totalErrors++;
        }
      }
      
      console.log(`✅ [ENHANCED SYNC] Full sync completed: ${totalSynced} synced, ${totalErrors} errors`);
      
      return {
        success: true,
        totalSynced,
        totalErrors
      };
      
    } catch (error) {
      console.error('❌ [ENHANCED SYNC] Error in full sync:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Validate payment authorization consistency
   * @param {string} prescriptionId - Prescription ID (optional)
   * @returns {Object} Validation result
   */
  static async validatePaymentConsistency(prescriptionId = null) {
    try {
      const Prescription = require('../models/Prescription');
      const NurseTask = require('../models/NurseTask');
      const PaymentCalculation = require('./paymentCalculation');
      
      const query = prescriptionId ? { _id: prescriptionId } : {};
      const prescriptions = await Prescription.find(query);
      
      const results = {
        total: prescriptions.length,
        consistent: 0,
        inconsistent: 0,
        issues: []
      };
      
      for (const prescription of prescriptions) {
        const issues = [];
        
        // Check prescription consistency
        if (prescription.paymentAuthorization && prescription.paymentStatus) {
          const normalizedTopLevel = PaymentCalculation.normalizePaymentStatus(prescription.paymentStatus);
          const normalizedAuth = PaymentCalculation.normalizePaymentStatus(prescription.paymentAuthorization.paymentStatus);
          
          if (normalizedTopLevel !== normalizedAuth) {
            issues.push(`Payment status mismatch: top-level="${prescription.paymentStatus}" vs auth="${prescription.paymentAuthorization.paymentStatus}"`);
          }
        }
        
        // Check nurse task consistency
        const nurseTasks = await NurseTask.find({
          'medicationDetails.prescriptionId': prescription._id
        });
        
        for (const task of nurseTasks) {
          if (task.paymentAuthorization) {
            const authorizedDoses = task.paymentAuthorization.authorizedDoses || 0;
            const canAdminister = task.paymentAuthorization.canAdminister;
            
            if (canAdminister && authorizedDoses === 0) {
              issues.push(`Nurse task ${task._id}: canAdminister=true but authorizedDoses=0`);
            }
            
            if (!canAdminister && authorizedDoses > 0) {
              issues.push(`Nurse task ${task._id}: canAdminister=false but authorizedDoses=${authorizedDoses}`);
            }
          }
        }
        
        if (issues.length === 0) {
          results.consistent++;
        } else {
          results.inconsistent++;
          results.issues.push({
            prescriptionId: prescription._id,
            medicationName: prescription.medicationName,
            issues
          });
        }
      }
      
      return results;
      
    } catch (error) {
      console.error('❌ [ENHANCED SYNC] Error validating payment consistency:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Fix payment authorization for a specific prescription
   * @param {string} prescriptionId - Prescription ID
   * @returns {Object} Fix result
   */
  static async fixPrescriptionPaymentAuth(prescriptionId) {
    try {
      console.log(`🔧 [ENHANCED SYNC] Fixing payment authorization for prescription ${prescriptionId}`);
      
      const result = await this.syncPaymentAuthorization(prescriptionId, {});
      
      if (result.success) {
        console.log(`✅ [ENHANCED SYNC] Successfully fixed prescription ${prescriptionId}`);
      } else {
        console.error(`❌ [ENHANCED SYNC] Failed to fix prescription ${prescriptionId}:`, result.error);
      }
      
      return result;
      
    } catch (error) {
      console.error(`❌ [ENHANCED SYNC] Error fixing prescription ${prescriptionId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = EnhancedPaymentSync;
