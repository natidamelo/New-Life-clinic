const Notification = require('../models/Notification');
const MedicalInvoice = require('../models/MedicalInvoice');

/**
 * Clean up notifications when payments are completed
 * This utility automatically removes payment notifications when invoices are fully paid
 */
class NotificationCleanup {
  
  /**
   * Remove payment notifications for a specific invoice when it's fully paid
   * OR update them for partial payments
   * @param {string} invoiceId - The invoice ID
   * @param {string} patientId - The patient ID
   */
  static async cleanupPaymentNotifications(invoiceId, patientId) {
    try {
      console.log(`🔧 [NOTIFICATION CLEANUP] Cleaning up notifications for invoice: ${invoiceId}`);
      const mongoose = require('mongoose');
      const toObjectId = (id) => {
        try { return new mongoose.Types.ObjectId(id); } catch { return null; }
      };
      
      // Find the invoice to check its payment status
      const invoice = await MedicalInvoice.findById(invoiceId);
      if (!invoice) {
        console.log(`⚠️ [NOTIFICATION CLEANUP] Invoice ${invoiceId} not found`);
        return;
      }

      // Check if invoice is fully paid
      const isFullyPaid = invoice.status === 'paid' && invoice.balance === 0;
      const isPartiallyPaid = invoice.status === 'partial' && invoice.balance > 0;
      
      if (isFullyPaid) {
        console.log(`✅ [NOTIFICATION CLEANUP] Invoice ${invoiceId} is fully paid, removing notifications`);
        
        // Build conditions matching both string and ObjectId forms
        const invObjId = toObjectId(invoiceId);
        const patObjId = toObjectId(patientId);
        const orConds = [
          { type: 'service_payment_required', 'data.invoiceId': invoiceId },
          { type: 'service_payment_required', 'data.patientId': patientId },
          { type: 'lab_payment_required', 'data.invoiceId': invoiceId },
          { type: 'lab_payment_required', 'data.patientId': patientId },
          { type: 'medication_payment_required', 'data.invoiceId': invoiceId },
          { type: 'medication_payment_required', 'data.patientId': patientId },
          { type: 'card_payment_required', 'data.invoiceId': invoiceId },
          { type: 'card_payment_required', 'data.patientId': patientId },
          { type: 'PROCEDURE_PAYMENT', 'data.invoiceId': invoiceId },
          { type: 'PROCEDURE_PAYMENT', 'data.patientId': patientId }
        ];
        if (invObjId) {
          orConds.push(
            { type: 'service_payment_required', 'data.invoiceId': invObjId },
            { type: 'lab_payment_required', 'data.invoiceId': invObjId },
            { type: 'medication_payment_required', 'data.invoiceId': invObjId },
            { type: 'card_payment_required', 'data.invoiceId': invObjId },
            { type: 'PROCEDURE_PAYMENT', 'data.invoiceId': invObjId }
          );
        }
        if (patObjId) {
          orConds.push(
            { type: 'service_payment_required', 'data.patientId': patObjId },
            { type: 'lab_payment_required', 'data.patientId': patObjId },
            { type: 'medication_payment_required', 'data.patientId': patObjId },
            { type: 'card_payment_required', 'data.patientId': patObjId },
            { type: 'PROCEDURE_PAYMENT', 'data.patientId': patObjId }
          );
        }
        const deleteResult = await Notification.deleteMany({ $or: orConds });

        console.log(`🗑️ [NOTIFICATION CLEANUP] Removed ${deleteResult.deletedCount} payment notifications`);
        
        if (deleteResult.deletedCount > 0) {
          console.log(`🎉 [NOTIFICATION CLEANUP] Successfully cleaned up notifications for invoice ${invoiceId}`);
        }
      } else if (isPartiallyPaid) {
        console.log(`💰 [NOTIFICATION CLEANUP] Invoice ${invoiceId} is partially paid, updating notifications`);
        
        // Update payment notifications to reflect partial payment status
        const updateResult = await Notification.updateMany(
          {
            $or: [
              // Service payment notifications
              { type: 'service_payment_required', 'data.invoiceId': invoiceId },
              { type: 'service_payment_required', 'data.patientId': patientId },
              // Lab payment notifications
              { type: 'lab_payment_required', 'data.invoiceId': invoiceId },
              { type: 'lab_payment_required', 'data.patientId': patientId },
              // Medication payment notifications
              { type: 'medication_payment_required', 'data.invoiceId': invoiceId },
              { type: 'medication_payment_required', 'data.patientId': patientId },
              // Card payment notifications
              { type: 'card_payment_required', 'data.invoiceId': invoiceId },
              { type: 'card_payment_required', 'data.patientId': patientId }
            ]
          },
          {
            $set: {
              'data.paymentStatus': 'partial',
              'data.amountPaid': invoice.amountPaid,
              'data.outstandingAmount': invoice.balance,
              'data.paidAt': new Date(),
              title: `Partial Payment - ${invoice.amountPaid} ETB paid, ${invoice.balance} ETB remaining`,
              message: `Partial payment received. ${invoice.amountPaid} ETB paid, ${invoice.balance} ETB remaining.`,
              updatedAt: new Date()
            }
          }
        );

        console.log(`📝 [NOTIFICATION CLEANUP] Updated ${updateResult.modifiedCount} payment notifications for partial payment`);
        
        if (updateResult.modifiedCount > 0) {
          console.log(`🎉 [NOTIFICATION CLEANUP] Successfully updated notifications for partial payment on invoice ${invoiceId}`);
        }
      } else {
        console.log(`ℹ️ [NOTIFICATION CLEANUP] Invoice ${invoiceId} is not paid (status: ${invoice.status}, balance: ${invoice.balance})`);
      }
      
    } catch (error) {
      console.error(`❌ [NOTIFICATION CLEANUP] Error cleaning up notifications for invoice ${invoiceId}:`, error);
    }
  }

  /**
   * Clean up all stale payment notifications
   * This method checks all payment notifications and removes them if the corresponding invoice is paid
   */
  static async cleanupAllStaleNotifications() {
    try {
      console.log(`🔧 [NOTIFICATION CLEANUP] Starting cleanup of all stale payment notifications`);
      
      // Find all unread payment notifications
      const paymentNotifications = await Notification.find({
        type: { $in: ['service_payment_required', 'lab_payment_required', 'medication_payment_required', 'card_payment_required', 'PROCEDURE_PAYMENT'] },
        read: false
      });

      console.log(`📋 [NOTIFICATION CLEANUP] Found ${paymentNotifications.length} unread payment notifications`);

      let removedCount = 0;
      let updatedCount = 0;

      for (const notification of paymentNotifications) {
        try {
          const invoiceId = notification.data?.invoiceId;
          const patientId = notification.data?.patientId;
          const prescriptionId = notification.data?.prescriptionId;

          if (invoiceId) {
            // Check if this specific invoice is paid or partially paid
            const invoice = await MedicalInvoice.findById(invoiceId);
            if (invoice) {
              if (invoice.status === 'paid' && invoice.balance === 0) {
                // Fully paid - remove notification
                await Notification.findByIdAndDelete(notification._id);
                removedCount++;
                console.log(`🗑️ [NOTIFICATION CLEANUP] Removed notification for paid invoice: ${invoiceId}`);
              } else if (invoice.status === 'partial' && invoice.amountPaid > 0) {
                // Partially paid - update notification instead of removing
                await Notification.findByIdAndUpdate(notification._id, {
                  $set: {
                    'data.paymentStatus': 'partial',
                    'data.amountPaid': invoice.amountPaid,
                    'data.outstandingAmount': invoice.balance,
                    'data.paidAt': new Date(),
                    title: `Partial Payment - ${invoice.amountPaid} ETB paid, ${invoice.balance} ETB remaining`,
                    message: `Partial payment received. ${invoice.amountPaid} ETB paid, ${invoice.balance} ETB remaining.`,
                    updatedAt: new Date()
                  }
                });
                updatedCount++;
                console.log(`📝 [NOTIFICATION CLEANUP] Updated notification for partial payment on invoice: ${invoiceId}`);
              }
            }
          } else if (notification.type === 'medication_payment_required' && prescriptionId) {
            // Check prescription payment status directly
            try {
              const Prescription = require('../models/Prescription');
              const prescription = await Prescription.findById(prescriptionId);
              if (prescription) {
                const isFullyPaid = prescription.paymentStatus === 'paid' || prescription.paymentAuthorization?.paymentStatus === 'fully_paid';
                const isPartiallyPaid = prescription.paymentStatus === 'partially_paid' || prescription.paymentAuthorization?.paymentStatus === 'partially_paid';
                
                if (isFullyPaid) {
                  await Notification.findByIdAndDelete(notification._id);
                  removedCount++;
                  console.log(`🗑️ [NOTIFICATION CLEANUP] Removed medication notification for paid prescription: ${prescriptionId}`);
                } else if (isPartiallyPaid) {
                  // Update notification for partial payment
                  const paidAmount = prescription.paymentAuthorization?.totalPaidAmount || 0;
                  const outstandingAmount = prescription.paymentAuthorization?.outstandingAmount || prescription.totalCost;
                  
                  await Notification.findByIdAndUpdate(notification._id, {
                    $set: {
                      'data.paymentStatus': 'partial',
                      'data.amountPaid': paidAmount,
                      'data.outstandingAmount': outstandingAmount,
                      'data.paidAt': new Date(),
                      title: `Partial Payment - ${paidAmount} ETB paid, ${outstandingAmount} ETB remaining`,
                      message: `Partial payment received for medication. ${paidAmount} ETB paid, ${outstandingAmount} ETB remaining.`,
                      updatedAt: new Date()
                    }
                  });
                  updatedCount++;
                  console.log(`📝 [NOTIFICATION CLEANUP] Updated medication notification for partial payment: ${prescriptionId}`);
                }
              }
            } catch (e) {
              console.warn(`[NOTIFICATION CLEANUP] Could not check prescription ${prescriptionId}:`, e.message);
            }
          } else if (notification.type === 'lab_payment_required' && notification.data?.labOrderIds) {
            // Check lab order payment status directly
            try {
              const LabOrder = require('../models/LabOrder');
              const labOrders = await LabOrder.find({
                _id: { $in: notification.data.labOrderIds }
              });

              if (labOrders.length > 0) {
                const allPaid = labOrders.every(order => order.paymentStatus === 'paid');
                const anyPaymentActivity = labOrders.some(order => 
                  order.paymentStatus === 'paid' || order.paymentStatus === 'partially_paid'
                );

                if (allPaid) {
                  await Notification.findByIdAndDelete(notification._id);
                  removedCount++;
                  console.log(`🗑️ [NOTIFICATION CLEANUP] Removed lab notification for fully paid orders`);
                } else if (anyPaymentActivity) {
                  // Calculate total paid and outstanding amounts
                  const totalPaid = labOrders.reduce((sum, order) => sum + (order.amountPaid || 0), 0);
                  const totalAmount = labOrders.reduce((sum, order) => sum + (order.price || 0), 0);
                  const outstanding = totalAmount - totalPaid;
                  
                  if (outstanding > 0) {
                    await Notification.findByIdAndUpdate(notification._id, {
                      $set: {
                        'data.paymentStatus': 'partial',
                        'data.amountPaid': totalPaid,
                        'data.outstandingAmount': outstanding,
                        'data.paidAt': new Date(),
                        title: `Partial Payment - ${totalPaid} ETB paid, ${outstanding} ETB remaining`,
                        message: `Partial payment received for lab tests. ${totalPaid} ETB paid, ${outstanding} ETB remaining.`,
                        updatedAt: new Date()
                      }
                    });
                    updatedCount++;
                    console.log(`📝 [NOTIFICATION CLEANUP] Updated lab notification for partial payment`);
                  }
                }
              }
            } catch (e) {
              console.warn(`[NOTIFICATION CLEANUP] Could not check lab orders:`, e.message);
            }
          } else if (patientId) {
            // Check if patient has any unpaid invoices
            const unpaidInvoices = await MedicalInvoice.find({
              patient: patientId,
              status: { $ne: 'paid' },
              balance: { $gt: 0 }
            });

            if (unpaidInvoices.length === 0) {
              // All invoices for this patient are paid, remove the notification
              await Notification.findByIdAndDelete(notification._id);
              removedCount++;
              console.log(`🗑️ [NOTIFICATION CLEANUP] Removed notification for patient with all paid invoices: ${patientId}`);
            }
          }
        } catch (error) {
          console.error(`❌ [NOTIFICATION CLEANUP] Error processing notification ${notification._id}:`, error);
        }
      }

      console.log(`✅ [NOTIFICATION CLEANUP] Cleanup completed. Removed ${removedCount} stale notifications, updated ${updatedCount} partial payment notifications`);
      
    } catch (error) {
      console.error(`❌ [NOTIFICATION CLEANUP] Error during cleanup:`, error);
    }
  }

  /**
   * Clean up notifications for a specific patient
   * @param {string} patientId - The patient ID
   */
  static async cleanupPatientNotifications(patientId) {
    try {
      console.log(`🔧 [NOTIFICATION CLEANUP] Cleaning up notifications for patient: ${patientId}`);
      
      // Check if patient has any unpaid invoices
      const unpaidInvoices = await MedicalInvoice.find({
        patient: patientId,
        status: { $ne: 'paid' },
        balance: { $gt: 0 }
      });

      if (unpaidInvoices.length === 0) {
        // All invoices are paid, remove all payment notifications for this patient
        const deleteResult = await Notification.deleteMany({
          type: { $in: ['service_payment_required', 'lab_payment_required', 'medication_payment_required', 'card_payment_required', 'PROCEDURE_PAYMENT'] },
          'data.patientId': patientId
        });

        console.log(`🗑️ [NOTIFICATION CLEANUP] Removed ${deleteResult.deletedCount} notifications for patient ${patientId}`);
      } else {
        console.log(`ℹ️ [NOTIFICATION CLEANUP] Patient ${patientId} still has ${unpaidInvoices.length} unpaid invoices`);
      }
      
    } catch (error) {
      console.error(`❌ [NOTIFICATION CLEANUP] Error cleaning up notifications for patient ${patientId}:`, error);
    }
  }

  /**
   * Prevent duplicate notifications by checking for existing ones before creating
   * @param {Object} notificationData - The notification data to check
   * @returns {Promise<boolean>} - True if duplicate exists, false otherwise
   */
  static async preventDuplicateNotification(notificationData) {
    try {
      const { type, data } = notificationData;
      
      // Build query to check for existing notifications
      const query = {
        type: type,
        read: false
      };

      // Add specific matching criteria based on notification type
      if (type === 'medication_payment_required' && data?.prescriptionId) {
        query['data.prescriptionId'] = data.prescriptionId;
      } else if (type === 'lab_payment_required' && data?.labOrderIds) {
        query['data.labOrderIds'] = { $in: data.labOrderIds };
      } else if (type === 'service_payment_required' && data?.invoiceId) {
        query['data.invoiceId'] = data.invoiceId;
      } else if (data?.patientId) {
        query['data.patientId'] = data.patientId;
      }

      const existingNotification = await Notification.findOne(query);
      
      if (existingNotification) {
        console.log(`⚠️ [DUPLICATE PREVENTION] Found existing notification of type ${type} for patient ${data?.patientName || data?.patientId}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`❌ [DUPLICATE PREVENTION] Error checking for duplicate notifications:`, error);
      return false; // Allow creation if check fails
    }
  }

  /**
   * Create notification with duplicate prevention
   * @param {Object} notificationData - The notification data
   * @returns {Promise<Object|null>} - Created notification or null if duplicate
   */
  static async createNotificationSafely(notificationData) {
    try {
      // Check for duplicates first
      const isDuplicate = await this.preventDuplicateNotification(notificationData);
      
      if (isDuplicate) {
        console.log(`🚫 [SAFE CREATION] Prevented duplicate notification creation for ${notificationData.type}`);
        return null;
      }

      // Create the notification
      const notification = new Notification(notificationData);
      await notification.save();
      
      console.log(`✅ [SAFE CREATION] Created notification: ${notification._id}`);
      return notification;
    } catch (error) {
      console.error(`❌ [SAFE CREATION] Error creating notification safely:`, error);
      throw error;
    }
  }
}

module.exports = NotificationCleanup; 