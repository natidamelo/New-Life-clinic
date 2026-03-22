/**
 * Medication Payment Status Service
 * 
 * This service provides accurate payment status information to prevent
 * frontend calculation errors and ensure correct display of payment status.
 */

const MedicalInvoice = require('../models/MedicalInvoice');
const Patient = require('../models/Patient');

class MedicationPaymentStatusService {
  /**
   * Get accurate payment status for a patient's medications
   * @param {string} patientId - Patient ID
   * @returns {Promise<Object>} Accurate payment status data
   */
  static async getPatientMedicationPaymentStatus(patientId) {
    try {
      // Find all invoices for the patient
      const invoices = await MedicalInvoice.find({
        patient: patientId
      });

      if (!invoices || invoices.length === 0) {
        return {
          hasInvoices: false,
          paymentStatus: 'no_invoices',
          totalOutstanding: 0,
          totalPaid: 0,
          totalInvoiced: 0,
          invoices: []
        };
      }

      // Calculate accurate totals
      let totalInvoiced = 0;
      let totalPaid = 0;
      let totalBalance = 0;
      let activeMedicationInvoices = [];
      let extensionInvoices = [];
      let otherInvoices = [];

      for (const invoice of invoices) {
        const invoiceTotal = invoice.total || 0;
        const invoicePaid = invoice.amountPaid || 0;
        const invoiceBalance = invoice.balance || 0;

        totalInvoiced += invoiceTotal;
        totalPaid += invoicePaid;
        totalBalance += invoiceBalance;

        // Categorize invoices
        const invoiceData = {
          invoiceNumber: invoice.invoiceNumber,
          description: invoice.items?.[0]?.description || 'N/A',
          total: invoiceTotal,
          paid: invoicePaid,
          balance: invoiceBalance,
          status: invoice.status,
          dueDate: invoice.dueDate,
          isExtension: invoice.isExtension || false
        };

        if (invoice.items?.[0]?.description?.includes('Medication Extension')) {
          extensionInvoices.push(invoiceData);
        } else if (invoice.items?.[0]?.description?.includes('Dexamethasone') || 
                   invoice.items?.[0]?.description?.includes('Medication:')) {
          activeMedicationInvoices.push(invoiceData);
        } else {
          otherInvoices.push(invoiceData);
        }
      }

      // Determine accurate payment status
      let paymentStatus;
      let statusDescription;

      if (totalBalance === 0) {
        paymentStatus = 'fully_paid';
        statusDescription = 'All invoices are fully paid';
      } else if (totalPaid > 0) {
        paymentStatus = 'partially_paid';
        statusDescription = `Partially paid with ETB ${totalBalance} outstanding`;
      } else {
        paymentStatus = 'unpaid';
        statusDescription = `No payments made, ETB ${totalBalance} due`;
      }

      // Calculate payment percentage
      const paymentPercentage = totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 0;

      return {
        hasInvoices: true,
        paymentStatus,
        statusDescription,
        totalOutstanding: totalBalance,
        totalPaid,
        totalInvoiced,
        paymentPercentage,
        activeMedicationInvoices,
        extensionInvoices,
        otherInvoices,
        summary: {
          totalInvoices: invoices.length,
          activeMedicationCount: activeMedicationInvoices.length,
          extensionCount: extensionInvoices.length,
          otherCount: otherInvoices.length
        }
      };

    } catch (error) {
      console.error('❌ [MedicationPaymentStatusService] Error getting payment status:', error);
      throw new Error(`Failed to get payment status: ${error.message}`);
    }
  }

  /**
   * Get payment status for a specific medication task
   * @param {string} patientId - Patient ID
   * @param {string} medicationName - Medication name
   * @returns {Promise<Object>} Medication-specific payment status
   */
  static async getMedicationTaskPaymentStatus(patientId, medicationName) {
    try {
      const fullStatus = await this.getPatientMedicationPaymentStatus(patientId);
      
      if (!fullStatus.hasInvoices) {
        return {
          paymentStatus: 'no_invoices',
          statusDescription: 'No invoices found for this patient',
          totalOutstanding: 0,
          totalPaid: 0,
          isFullyPaid: false
        };
      }

      // Filter for medication-specific invoices
      const medicationInvoices = [
        ...fullStatus.activeMedicationInvoices,
        ...fullStatus.extensionInvoices
      ].filter(invoice => 
        invoice.description.toLowerCase().includes(medicationName.toLowerCase())
      );

      if (medicationInvoices.length === 0) {
        return {
          paymentStatus: 'no_medication_invoices',
          statusDescription: `No invoices found for ${medicationName}`,
          totalOutstanding: 0,
          totalPaid: 0,
          isFullyPaid: false
        };
      }

      // Calculate medication-specific totals
      const medicationTotal = medicationInvoices.reduce((sum, inv) => sum + inv.total, 0);
      const medicationPaid = medicationInvoices.reduce((sum, inv) => sum + inv.paid, 0);
      const medicationBalance = medicationInvoices.reduce((sum, inv) => sum + inv.balance, 0);

      // Determine if this specific medication is fully paid
      const isFullyPaid = medicationBalance === 0;
      const paymentStatus = isFullyPaid ? 'fully_paid' : 'partially_paid';
      const statusDescription = isFullyPaid 
        ? `${medicationName} is fully paid`
        : `${medicationName} has ETB ${medicationBalance} outstanding`;

      return {
        paymentStatus,
        statusDescription,
        totalOutstanding: medicationBalance,
        totalPaid: medicationPaid,
        totalInvoiced: medicationTotal,
        isFullyPaid,
        medicationInvoices
      };

    } catch (error) {
      console.error('❌ [MedicationPaymentStatusService] Error getting medication task status:', error);
      throw new Error(`Failed to get medication task status: ${error.message}`);
    }
  }

  /**
   * Validate payment status data to prevent frontend errors
   * @param {Object} paymentData - Payment data to validate
   * @returns {Object} Validated and corrected payment data
   */
  static validatePaymentData(paymentData) {
    const validated = { ...paymentData };

    // Ensure all numeric fields are valid numbers
    validated.totalOutstanding = Number(paymentData.totalOutstanding) || 0;
    validated.totalPaid = Number(paymentData.totalPaid) || 0;
    validated.totalInvoiced = Number(paymentData.totalInvoiced) || 0;

    // Validate payment status logic
    if (validated.totalOutstanding === 0 && validated.totalInvoiced > 0) {
      validated.paymentStatus = 'fully_paid';
      validated.statusDescription = 'All invoices are fully paid';
    } else if (validated.totalOutstanding > 0) {
      validated.paymentStatus = 'partially_paid';
      validated.statusDescription = `Partially paid with ETB ${validated.totalOutstanding} outstanding`;
    } else {
      validated.paymentStatus = 'unpaid';
      validated.statusDescription = 'No payments made';
    }

    // Calculate accurate payment percentage
    validated.paymentPercentage = validated.totalInvoiced > 0 
      ? Math.round((validated.totalPaid / validated.totalInvoiced) * 100) 
      : 0;

    return validated;
  }
}

module.exports = MedicationPaymentStatusService;

