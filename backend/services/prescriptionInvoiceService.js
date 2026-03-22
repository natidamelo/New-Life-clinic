const PaymentSynchronizationService = require('./paymentSynchronizationService');
const mongoose = require('mongoose');
const MedicalInvoice = require('../models/MedicalInvoice');
const Patient = require('../models/Patient');
const User = require('../models/User');

/**
 * Service to automatically create invoices for prescriptions
 * This prevents the issue where prescriptions exist but no invoices are created
 */
class PrescriptionInvoiceService {
  
  /**
   * Create an invoice for a prescription automatically
   * @param {Object} prescription - The prescription object
   * @param {Array} medications - Array of medication details
   * @param {Object} patient - Patient object
   * @param {Object} doctor - Doctor object
   * @returns {Promise<Object>} - Created invoice
   */
  static async createInvoiceForPrescription(prescription, medications, patient, doctor) {
    try {
      console.log('🔧 [PrescriptionInvoiceService] Creating invoice for prescription:', prescription._id);
      
      // Check if invoice already exists
      const existingInvoice = await MedicalInvoice.findOne({
        'items.metadata.prescriptionId': prescription._id
      });
      
      if (existingInvoice) {
        console.log('✅ [PrescriptionInvoiceService] Invoice already exists:', existingInvoice._id);
        return existingInvoice;
      }
      
      // Generate unique invoice number
      const invoiceNumber = `PRES-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      
      // Calculate total cost from medications
      let totalCost = 0;
      const calculatedMedications = [];
      
      for (const med of medications) {
        // Use centralized medication calculator for proper cost calculation
        const MedicationCalculator = require('../utils/medicationCalculator');
        
        // CRITICAL FIX: Ensure we use the doctor's prescribed duration
        // Prefer medication-specific duration; fallback to prescription-level duration
        const medicationDuration = med.duration || prescription.duration || '';
        console.log(`🔧 [CRITICAL FIX] Using duration "${medicationDuration}" for medication "${med.name}"`);
        
        // Calculate cost for this medication
        const calculation = await MedicationCalculator.calculateMedicationCost({
          name: med.name,
          frequency: med.frequency || 'Once daily',
          duration: medicationDuration, // Use individual medication duration
          inventoryItemId: med.inventoryItem || med.inventoryItemId
        });
        
        console.log(`📊 [PrescriptionInvoiceService] Medication cost calculation for ${med.name}:`, {
          frequency: med.frequency,
          duration: med.duration,
          costPerDose: calculation.costPerDose,
          totalDoses: calculation.totalDoses,
          totalCost: calculation.totalCost,
          originalMedData: med
        });
        
        // Store the calculated medication with correct pricing and duration
        calculatedMedications.push({
          ...med,
          duration: medicationDuration, // CRITICAL: Preserve individual duration
          totalPrice: calculation.totalCost,
          costPerDose: calculation.costPerDose,
          totalDoses: calculation.totalDoses == null ? undefined : calculation.totalDoses
        });
        
        totalCost += calculation.totalCost;
      }
      
      // Create invoice items using calculated costs with proper dose quantities
      const invoiceItems = calculatedMedications.map(med => {
        // CRITICAL FIX: Always use doctor's prescribed duration, no defaults
        const individualDuration = med.duration || prescription.duration || null; // Never fabricate duration
        const individualFrequency = med.frequency || 'Once daily';
        const individualDoses = (typeof med.totalDoses === 'number' && med.totalDoses > 0) ? med.totalDoses : undefined;
        
        console.log(`🔧 [CRITICAL FIX] Creating invoice item for ${med.name}: duration="${individualDuration}", frequency="${individualFrequency}", doses=${individualDoses}`);
        
        return {
          itemType: 'medication',
          category: 'medication',
          serviceName: med.name,
          description: (() => {
            const durationText = (() => {
              if (individualDuration == null) return 'doctor-specified duration';
              if (typeof individualDuration === 'number') return `${individualDuration} days`;
              const str = String(individualDuration).trim();
              return /(day|days|week|weeks|month|months)/i.test(str) ? str : `${str} days`;
            })();
            const dosesText = (individualDoses != null) ? `${individualDoses} doses` : 'doses per doctor order';
            return `Medication: ${med.name} (${dosesText} - ${individualFrequency} for ${durationText})`;
          })(),
          quantity: individualDoses ?? 1, // keep system operable; pricing still uses costPerDose
          unitPrice: med.costPerDose || 0,
          totalPrice: med.totalPrice || 0,
          total: med.totalPrice || 0,
          metadata: {
            prescriptionId: prescription._id,
            medicationName: med.name,
            dosage: med.dosage,
            frequency: individualFrequency,
            duration: individualDuration, // Store doctor's duration as-is when provided
            totalDoses: individualDoses,
            costPerDose: med.costPerDose,
            inventoryItemId: med.inventoryItem || med.inventoryItemId
          }
        };
      });
      
      // Use billing service to add prescription to daily consolidated invoice
      const billingService = require('./billingService');
      
      // Prepare all medication items as service data array
      const servicesData = invoiceItems.map(item => ({
        description: item.description,
        medicationName: item.metadata?.medicationName || 'Medication',
        totalPrice: item.total,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        dosage: item.metadata?.dosage,
        frequency: item.metadata?.frequency,
        duration: item.metadata?.duration,
        prescriptionId: prescription._id,
        metadata: {
          prescriptionId: prescription._id,
          medicationName: item.metadata?.medicationName,
          dosage: item.metadata?.dosage,
          frequency: item.metadata?.frequency,
          duration: item.metadata?.duration,
          totalDoses: item.metadata?.totalDoses,
          costPerDose: item.metadata?.costPerDose,
          inventoryItemId: item.inventoryItemId
        }
      }));
      
      // Add all medication items to the daily consolidated invoice in one operation
      // This ensures all items are in the same invoice
      const invoice = await billingService.addMultipleServicesToDailyInvoice(
        patient._id,
        'medication',
        servicesData,
        doctor._id
      );
      
      // If prescription is already paid, sync payment status
      if (prescription.paymentStatus === 'fully_paid' || prescription.paymentStatus === 'partial') {
        const paymentSync = new PaymentSynchronizationService();
        await paymentSync.syncPaymentStatus(invoice._id, 0); // 0 to recalculate existing
      }
      
      console.log('✅ [PrescriptionInvoiceService] Prescription added to daily consolidated invoice:', invoice._id);
      console.log('📋 Invoice Number:', invoice.invoiceNumber);
      console.log('💰 Total Amount:', totalCost);
      
      // Update the prescription with invoice reference
      prescription.invoiceId = invoice._id;
      await prescription.save();
      
      console.log('✅ [PrescriptionInvoiceService] Prescription updated with invoice reference');
      
      return invoice;
      
    } catch (error) {
      console.error('❌ [PrescriptionInvoiceService] Error creating invoice:', error);
      throw error;
    }
  }
  
  /**
   * Create invoices for multiple prescriptions
   * @param {Array} prescriptions - Array of prescription objects
   * @param {Array} medications - Array of medication details
   * @param {Object} patient - Patient object
   * @param {Object} doctor - Doctor object
   * @returns {Promise<Array>} - Array of created invoices
   */
  static async createInvoicesForPrescriptions(prescriptions, medications, patient, doctor) {
    try {
      console.log('🔧 [PrescriptionInvoiceService] Creating invoices for multiple prescriptions');
      
      const invoices = [];
      
      for (const prescription of prescriptions) {
        // Find medications for this specific prescription
        const prescriptionMedications = medications.filter(med => 
          med.prescriptionId && med.prescriptionId.toString() === prescription._id.toString()
        );
        
        if (prescriptionMedications.length > 0) {
          const invoice = await this.createInvoiceForPrescription(
            prescription, 
            prescriptionMedications, 
            patient, 
            doctor
          );
          invoices.push(invoice);
        }
      }
      
      return invoices;
      
    } catch (error) {
      console.error('❌ [PrescriptionInvoiceService] Error creating invoices:', error);
      throw error;
    }
  }
  
  /**
   * Ensure all prescriptions have invoices (fix missing invoices)
   * @param {string} patientId - Patient ID to check
   * @returns {Promise<Array>} - Array of created invoices
   */
  static async ensureAllPrescriptionsHaveInvoices(patientId) {
    try {
      console.log('🔧 [PrescriptionInvoiceService] Checking for prescriptions without invoices for patient:', patientId);
      
      const Prescription = require('../models/Prescription');
      
      // Find prescriptions without invoices
      const prescriptionsWithoutInvoices = await Prescription.find({
        patient: patientId,
        $or: [
          { invoiceId: { $exists: false } },
          { invoiceId: null }
        ]
      });
      
      if (prescriptionsWithoutInvoices.length === 0) {
        console.log('✅ [PrescriptionInvoiceService] All prescriptions already have invoices');
        return [];
      }
      
      console.log(`⚠️ [PrescriptionInvoiceService] Found ${prescriptionsWithoutInvoices.length} prescriptions without invoices`);
      
      const patient = await Patient.findById(patientId);
      if (!patient) {
        throw new Error('Patient not found');
      }
      
      const createdInvoices = [];
      
      for (const prescription of prescriptionsWithoutInvoices) {
        try {
          // Create basic medication data for invoice creation
          const medicationData = [{
            name: prescription.medicationName,
            dosage: prescription.dosage,
            frequency: prescription.frequency,
            duration: prescription.duration,
            totalPrice: prescription.totalCost || 0,
            inventoryItem: prescription.medicationItem,
            prescriptionId: prescription._id
          }];
          
          // Get doctor info
          const doctor = await User.findById(prescription.doctor);
          if (!doctor) {
            console.warn(`⚠️ [PrescriptionInvoiceService] Doctor not found for prescription ${prescription._id}`);
            continue;
          }
          
          const invoice = await this.createInvoiceForPrescription(
            prescription,
            medicationData,
            patient,
            doctor
          );
          
          createdInvoices.push(invoice);
          
        } catch (error) {
          console.error(`❌ [PrescriptionInvoiceService] Error creating invoice for prescription ${prescription._id}:`, error);
        }
      }
      
      console.log(`✅ [PrescriptionInvoiceService] Created ${createdInvoices.length} invoices for missing prescriptions`);
      return createdInvoices;
      
    } catch (error) {
      console.error('❌ [PrescriptionInvoiceService] Error ensuring invoices:', error);
      throw error;
    }
  }
  
  /**
   * Update notification with invoice reference
   * @param {string} notificationId - Notification ID
   * @param {string} invoiceId - Invoice ID
   * @returns {Promise<boolean>} - Success status
   */
  static async updateNotificationWithInvoice(notificationId, invoiceId) {
    try {
      const Notification = require('../models/Notification');
      
      await Notification.findByIdAndUpdate(notificationId, {
        $set: {
          'data.invoiceId': invoiceId
        }
      });
      
      console.log('✅ [PrescriptionInvoiceService] Notification updated with invoice reference');
      return true;
      
    } catch (error) {
      console.error('❌ [PrescriptionInvoiceService] Error updating notification:', error);
      return false;
    }
  }
}

module.exports = PrescriptionInvoiceService;
