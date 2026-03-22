const { MongoClient } = require('mongodb');

/**
 * Payment Synchronization Service
 * Automatically syncs payment status between invoices and prescriptions
 * This prevents the "invoice paid but prescription pending" issue
 */
class PaymentSynchronizationService {
  constructor() {
    this.db = null;
  }

  async connect() {
    if (!this.db) {
      const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017');
      await client.connect();
      this.db = client.db('clinic-cms');
    }
  }

  /**
   * Sync payment status when invoice payment is processed
   */
  async syncPaymentStatus(invoiceId, paymentAmount, paymentMethod = 'Cash') {
    try {
      await this.connect();
      
      // Find the invoice
      const invoice = await this.db.collection('medicalinvoices').findOne({ _id: invoiceId });
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      console.log(`🔄 Syncing payment for invoice: ${invoice.invoiceNumber}`);
      
      // Find the corresponding prescription
      const prescription = await this.db.collection('prescriptions').findOne({
        invoiceId: invoiceId
      });

      if (!prescription) {
        console.log('⚠️ No prescription found for this invoice');
        return { success: false, message: 'No prescription linked to invoice' };
      }

      // Calculate new payment status
      const currentPaid = invoice.amountPaid || 0;
      const newPaid = currentPaid + paymentAmount;
      const totalAmount = invoice.total || invoice.totalAmount || 0;
      const newBalance = Math.max(0, totalAmount - newPaid);
      
      let newPaymentStatus = 'pending';
      if (newBalance === 0) {
        newPaymentStatus = 'fully_paid';
      } else if (newPaid > 0) {
        newPaymentStatus = 'partial';
      }

      // Update invoice payment status
      const invoiceUpdate = await this.db.collection('medicalinvoices').updateOne(
        { _id: invoiceId },
        {
          $set: {
            amountPaid: newPaid,
            balance: newBalance,
            status: newPaymentStatus,
            lastPaymentDate: new Date(),
            lastPaymentMethod: paymentMethod
          }
        }
      );

      // Normalize to schema values and update prescription payment status
      const normalizedPrescriptionStatus = newPaymentStatus === 'fully_paid' ? 'paid' : (newPaymentStatus === 'partially_paid' ? 'partial' : newPaymentStatus);
      const prescriptionUpdate = await this.db.collection('prescriptions').updateOne(
        { _id: prescription._id },
        {
          $set: {
            paymentStatus: normalizedPrescriptionStatus,
            totalCost: totalAmount,
            balance: newBalance,
            amountPaid: newPaid
          }
        }
      );

      // Update nurse task payment authorization
      const nurseTask = await this.db.collection('nursetasks').findOne({
        patientId: prescription.patient.toString(),
        prescriptionId: prescription._id
      });

      if (nurseTask) {
        // Calculate total doses from prescription (assuming medicationDetails.doseRecords is present)
        const totalDoses = prescription.medicationDetails?.doseRecords?.length || 0;
        const dosesPerDay = calculateDosesPerDay(prescription.frequency);
        const duration = extractNumericDuration(prescription.duration);

        // FIXED: Calculate authorized doses based on the proportion of payment received
        let authorizedDoses = 0;
        if (totalAmount > 0) {
          const paymentRatio = newPaid / totalAmount;
          authorizedDoses = Math.floor(paymentRatio * totalDoses);
          
          // FIXED: Ensure at least one dose is authorized if any payment was made, but respect actual payment ratio
          if (newPaid > 0 && authorizedDoses === 0 && totalDoses > 0) {
            // Calculate minimum authorized doses based on cost per dose
            const costPerDose = totalAmount / totalDoses;
            const minDoses = Math.floor(newPaid / costPerDose);
            authorizedDoses = Math.max(1, minDoses);
            console.warn(`⚠️ [PAYMENT SYNC DEBUG] Authorized ${authorizedDoses} doses due to partial payment (ETB ${newPaid}/${totalAmount}).`);
          }
        }

        // Debugging: Log calculated authorizedDoses
        console.log(`🔍 [PAYMENT SYNC DEBUG] Calculated authorizedDoses:`, {
          newPaid,
          totalAmount,
          totalDoses,
          calculatedAuthorizedDoses: authorizedDoses,
          prescriptionFrequency: prescription.frequency,
          prescriptionDuration: prescription.duration,
          dosesPerDay: dosesPerDay
        });

        const taskUpdate = await this.db.collection('nursetasks').updateOne(
          { _id: nurseTask._id },
          {
            $set: {
              'paymentAuthorization.paymentStatus': newPaymentStatus,
              'paymentAuthorization.canAdminister': newPaymentStatus === 'fully_paid' || newPaymentStatus === 'partial' || newPaymentStatus === 'partially_paid',
              'paymentAuthorization.paidDays': Math.floor(duration * (newPaid / totalAmount)),
              'paymentAuthorization.authorizedDoses': authorizedDoses,
              'paymentAuthorization.unauthorizedDoses': Math.max(0, totalDoses - authorizedDoses),
              'paymentAuthorization.outstandingAmount': newBalance,
              'paymentAuthorization.lastUpdated': new Date()
            }
          }
        );

        console.log(`✅ Nurse task updated: ${authorizedDoses} doses authorized`);
      }

      console.log(`✅ Payment synchronized successfully!`);
      console.log(`💰 Invoice: ${newPaymentStatus} (paid: ${newPaid}, balance: ${newBalance})`);
      console.log(`📋 Prescription: ${newPaymentStatus}`);
      
      return {
        success: true,
        invoiceStatus: newPaymentStatus,
        prescriptionStatus: newPaymentStatus,
        amountPaid: newPaid,
        balance: newBalance
      };

    } catch (error) {
      console.error('❌ Error syncing payment status:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync all existing payments to fix current inconsistencies
   */
  async syncAllExistingPayments() {
    try {
      await this.connect();
      
      console.log('🔄 Syncing all existing payments...');
      
      const paidInvoices = await this.db.collection('medicalinvoices').find({
        amountPaid: { $gt: 0 }
      }).toArray();

      let syncedCount = 0;
      
      for (const invoice of paidInvoices) {
        const result = await this.syncPaymentStatus(invoice._id, 0); // 0 to recalculate existing
        if (result.success) {
          syncedCount++;
        }
      }

      console.log(`✅ Synced ${syncedCount} out of ${paidInvoices.length} invoices`);
      return { success: true, syncedCount };

    } catch (error) {
      console.error('❌ Error syncing existing payments:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = PaymentSynchronizationService;
