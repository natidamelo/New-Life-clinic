/**
 * Auto Payment Sync Utility
 * 
 * Automatically synchronizes payment data with nurse tasks and medication authorizations
 * when payments are processed.
 */

const mongoose = require('mongoose');

class AutoPaymentSync {
  /**
   * Sync all nurse tasks with their corresponding prescription payment data
   */
  static async syncAllNurseTasks() {
    try {
      console.log('🔄 [AUTO PAYMENT SYNC] Starting automatic payment synchronization...');
      
      const NurseTask = require('../models/NurseTask');
      const Prescription = require('../models/Prescription');
      const MedicalInvoice = require('../models/MedicalInvoice');
      
      // Get all medication nurse tasks
      const nurseTasks = await NurseTask.find({ taskType: 'MEDICATION' });
      console.log(`📋 [AUTO PAYMENT SYNC] Found ${nurseTasks.length} medication nurse tasks`);
      
      let updatedCount = 0;
      let errorCount = 0;
      
      for (const task of nurseTasks) {
        try {
          // Get actual payment data for this task
          const paymentData = await this.getActualPaymentData(task);
          
          if (paymentData) {
            // Update task with actual payment data
            const success = await this.updateTaskWithActualPayment(task, paymentData);
            if (success) {
              updatedCount++;
            } else {
              errorCount++;
            }
          }
        } catch (error) {
          console.error(`❌ [AUTO PAYMENT SYNC] Error processing task ${task._id}:`, error.message);
          errorCount++;
        }
      }
      
      console.log(`✅ [AUTO PAYMENT SYNC] Synchronization complete:`);
      console.log(`   - Updated: ${updatedCount} tasks`);
      console.log(`   - Errors: ${errorCount} tasks`);
      
      return { updatedCount, errorCount };
      
    } catch (error) {
      console.error('❌ [AUTO PAYMENT SYNC] Error synchronizing nurse tasks:', error);
      throw error;
    }
  }

  /**
   * Get actual payment data for a nurse task
   */
  static async getActualPaymentData(task) {
    try {
      const Prescription = require('../models/Prescription');
      const MedicalInvoice = require('../models/MedicalInvoice');
      
      // PRIORITY 1: Try to get from invoice first (most accurate for current payments)
      const invoiceId = task.medicationDetails?.invoiceId || task.invoiceId;
      if (invoiceId) {
        const invoice = await MedicalInvoice.findById(invoiceId);
        if (invoice) {
          console.log(`📋 [AUTO PAYMENT SYNC] Found invoice data for task ${task._id}: ETB ${invoice.amountPaid}/${invoice.total}`);
          const pData = this.calculatePaymentFromInvoice(invoice, task);
          if (pData) return pData;
        }
      }
      
      // PRIORITY 2: Try to find invoice by patient and medication (for tasks without direct invoice link)
      const Patient = require('../models/Patient');
      const patient = await Patient.findById(task.patientId);
      const prescriptionId = task.prescriptionId || task.medicationDetails?.prescriptionId;
      
      if (patient) {
        const medName = task.medicationDetails?.medicationName || task.description || '';
        const searchConditions = [
          { 'items.medicationName': { $regex: new RegExp(medName, 'i') } },
          { 'items.metadata.medicationName': { $regex: new RegExp(medName, 'i') } },
          { 'items.description': { $regex: new RegExp(medName, 'i') } }
        ];
        if (prescriptionId) {
          searchConditions.push({ 'items.metadata.prescriptionId': prescriptionId });
        }

        const invoices = await MedicalInvoice.find({
          patient: patient._id,
          $or: searchConditions
        }).sort({ createdAt: -1 });
        
        if (invoices.length > 0) {
          const latestInvoice = invoices[0];
          console.log(`📋 [AUTO PAYMENT SYNC] Found invoice by patient search for task ${task._id}: ETB ${latestInvoice.amountPaid}/${latestInvoice.total}`);
          const pData = this.calculatePaymentFromInvoice(latestInvoice, task);
          if (pData) return pData;
        }
      }
      
      // PRIORITY 3: Try to get payment data from prescription (fallback)
      if (prescriptionId) {
        const prescription = await Prescription.findById(prescriptionId);
        if (prescription) {
          if (prescription.paymentAuthorization && (prescription.paymentAuthorization.canAdminister || prescription.paymentAuthorization.authorizedDoses > 0)) {
            console.log(`📋 [AUTO PAYMENT SYNC] Found prescription data for task ${task._id}`);
            return prescription.paymentAuthorization;
          }
          const pStatus = (prescription.paymentStatus || '').toLowerCase();
          if (pStatus === 'paid' || pStatus === 'fully_paid') {
            const totalDoses = (task.medicationDetails?.doseRecords || []).length || 1;
            const duration = task.medicationDetails?.duration || 1;
            return {
              paidDays: duration,
              totalDays: duration,
              paymentStatus: 'fully_paid',
              canAdminister: true,
              restrictionMessage: '',
              authorizedDoses: totalDoses,
              unauthorizedDoses: 0,
              outstandingAmount: 0,
              lastUpdated: new Date()
            };
          }
        }
      }
      
      console.log(`⚠️ [AUTO PAYMENT SYNC] No payment data found for task ${task._id}`);
      return null;
      
    } catch (error) {
      console.error('❌ Error getting actual payment data:', error);
      return null;
    }
  }
  
  /**
   * Calculate payment authorization from invoice data
   */
  static calculatePaymentFromInvoice(invoice, task) {
    try {
      const totalAmount = invoice.total || 0;
      const amountPaid = invoice.amountPaid || 0;
      const balance = invoice.balance != null ? invoice.balance : (totalAmount - amountPaid);
      
      // Get medication details from task
      const medicationName = task.medicationDetails?.medicationName;
      const frequency = task.medicationDetails?.frequency || 'once daily';
      const duration = task.medicationDetails?.duration || 1;
      
      // Calculate total doses
      const dosesPerDay = this.getDosesPerDay(frequency);
      const totalDoses = dosesPerDay * duration;
      const totalDays = duration;
      
      // Determine if fully paid:
      // 1. Invoice status explicitly says 'paid'
      // 2. Invoice paymentStatus.current is 'fully_paid'
      // 3. Balance is 0 or negative
      // 4. amountPaid covers total
      const invoiceStatus = (invoice.status || '').toLowerCase();
      const invoicePaymentCurrent = (invoice.paymentStatus?.current || '').toLowerCase();
      const isFullyPaid = invoiceStatus === 'paid' ||
                          invoicePaymentCurrent === 'fully_paid' ||
                          balance <= 0 ||
                          amountPaid >= totalAmount ||
                          Math.abs(balance) < 1;
      
      // Try to find the medication-specific cost from invoice items
      let medicationItemCost = 0;
      let medicationItemPaid = false;
      if (invoice.items && medicationName) {
        const medItem = invoice.items.find(item => {
          const desc = (item.description || '').toLowerCase();
          const metaMed = (item.metadata?.medicationName || '').toLowerCase();
          const medLower = medicationName.toLowerCase();
          return desc.includes(medLower) || metaMed.includes(medLower);
        });
        if (medItem) {
          medicationItemCost = medItem.total || (medItem.unitPrice * (medItem.quantity || 1));
          // If invoice is fully paid, the medication item is fully paid too
          medicationItemPaid = isFullyPaid;
        }
      }
      
      // Calculate payment coverage
      let paidDoses = 0;
      let paidDays = 0;
      
      if (isFullyPaid) {
        // Fully paid - all doses authorized
        paidDoses = totalDoses;
        paidDays = totalDays;
      } else if (amountPaid > 0) {
        // Partially paid - calculate based on medication cost if available
        const relevantTotal = medicationItemCost > 0 ? medicationItemCost : totalAmount;
        const relevantPaid = medicationItemCost > 0
          ? Math.min(amountPaid, medicationItemCost)  // cap at medication cost
          : amountPaid;
        const paymentRatio = relevantPaid / relevantTotal;
        paidDoses = Math.floor(paymentRatio * totalDoses);
        paidDays = Math.ceil(paidDoses / dosesPerDay);
        
        if (paidDoses === 0 && amountPaid > 0) {
          const costPerDose = relevantTotal / totalDoses;
          const minDoses = Math.floor(relevantPaid / costPerDose);
          paidDoses = Math.max(1, minDoses);
          paidDays = Math.ceil(paidDoses / dosesPerDay);
        }
        
        if (paidDoses === 0 && amountPaid > 0) {
          const costPerDose = relevantTotal / totalDoses;
          if (relevantPaid >= costPerDose) {
            paidDoses = 1;
            paidDays = 1;
          }
        }
      }
      
      const unpaidDoses = totalDoses - paidDoses;
      const outstandingAmount = isFullyPaid ? 0 : balance;
      
      return {
        paidDays,
        totalDays,
        paymentStatus: isFullyPaid ? 'fully_paid' : 'partial',
        canAdminister: paidDoses > 0 || isFullyPaid,
        restrictionMessage: this.getRestrictionMessage({
          paidDays,
          totalDays,
          paidDoses,
          totalDoses,
          outstandingAmount
        }),
        authorizedDoses: isFullyPaid ? totalDoses : paidDoses,
        unauthorizedDoses: isFullyPaid ? 0 : unpaidDoses,
        outstandingAmount,
        lastUpdated: new Date()
      };
      
    } catch (error) {
      console.error('❌ Error calculating payment from invoice:', error);
      return null;
    }
  }
  
  /**
   * Update task with actual payment data
   */
  static async updateTaskWithActualPayment(task, paymentData) {
    try {
      const isPaid = paymentData.paymentStatus === 'fully_paid' || paymentData.paymentStatus === 'paid';
      const isPartial = paymentData.paymentStatus === 'partial' || paymentData.paymentStatus === 'partially_paid';
      const canAdminister = paymentData.canAdminister === true || paymentData.authorizedDoses > 0 || isPaid || isPartial;

      const newPaymentAuth = {
        paidDays: paymentData.paidDays,
        totalDays: paymentData.totalDays,
        paymentStatus: paymentData.paymentStatus,
        canAdminister: canAdminister,
        restrictionMessage: this.getRestrictionMessage(paymentData),
        authorizedDoses: paymentData.authorizedDoses,
        unauthorizedDoses: paymentData.unauthorizedDoses,
        outstandingAmount: paymentData.outstandingAmount,
        lastUpdated: new Date()
      };
      
      // Update the task payment authorization
      task.paymentAuthorization = newPaymentAuth;
      // Also update top-level paymentStatus to ensure paymentGate doesn't block
      task.paymentStatus = isPaid ? 'paid' : (isPartial ? 'partial' : 'unpaid');
      
      if (task.medicationDetails) {
        task.medicationDetails.paymentAuthorization = newPaymentAuth;
        task.medicationDetails.paymentStatus = task.paymentStatus;
      }

      task.updatedAt = new Date();
      await task.save();
      
      return true;
    } catch (error) {
      console.error('❌ Error updating task with actual payment:', error);
      return false;
    }
  }
  
  /**
   * Calculate total doses based on frequency and duration
   */
  static calculateTotalDoses(frequency, duration) {
    const dosesPerDay = this.getDosesPerDay(frequency);
    return dosesPerDay * duration;
  }
  
  /**
   * Get doses per day based on frequency
   */
  static getDosesPerDay(frequency) {
    const frequencyMap = {
      'once daily': 1,
      'twice daily': 2,
      'three times daily': 3,
      'four times daily': 4,
      'bid': 2,
      'tid': 3,
      'qid': 4,
      'qd': 1,
      'qod': 0.5,
      'prn': 1 // as needed, default to 1
    };
    
    const lowerFreq = frequency.toLowerCase();
    return frequencyMap[lowerFreq] || 1;
  }
  
  /**
   * Get restriction message based on payment data
   */
  static getRestrictionMessage(paymentData) {
    const { paidDays, totalDays, paidDoses, totalDoses, outstandingAmount } = paymentData;
    
    if (outstandingAmount === 0) {
      return 'Fully paid - no restrictions';
    } else if (paidDoses > 0) {
      return `Payment covers only ${paidDoses} of ${totalDoses} doses (${paidDays} of ${totalDays} days)`;
    } else {
      return 'No payment received - medication administration not authorized';
    }
  }
  
  /**
   * Trigger automatic sync when payment is processed
   */
  static async triggerSyncOnPayment(prescriptionId, patientId) {
    try {
      console.log(`🔄 [AUTO PAYMENT SYNC] Triggering sync for prescription ${prescriptionId}`);
      
      const NurseTask = require('../models/NurseTask');
      
      // Find all nurse tasks for this prescription/patient
      const tasks = await NurseTask.find({
        $or: [
          { 'medicationDetails.prescriptionId': prescriptionId },
          { patientId: patientId, taskType: 'MEDICATION' }
        ]
      });
      
      console.log(`📋 [AUTO PAYMENT SYNC] Found ${tasks.length} tasks to sync`);
      
      let updatedCount = 0;
      
      for (const task of tasks) {
        const paymentData = await this.getActualPaymentData(task);
        if (paymentData) {
          const success = await this.updateTaskWithActualPayment(task, paymentData);
          if (success) {
            updatedCount++;
          }
        }
      }
      
      console.log(`✅ [AUTO PAYMENT SYNC] Updated ${updatedCount} tasks after payment`);
      return updatedCount;
      
    } catch (error) {
      console.error('❌ [AUTO PAYMENT SYNC] Error triggering sync on payment:', error);
      return 0;
    }
  }
}

module.exports = AutoPaymentSync; 