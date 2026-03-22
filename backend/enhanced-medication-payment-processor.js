/**
 * Enhanced Medication Payment Processor
 * 
 * Integrates with the existing payment system to handle partial payments
 * and medication administration authorization
 */

const MedicationPaymentManager = require('./medication-payment-manager');

class EnhancedMedicationPaymentProcessor {
  
  /**
   * Process medication payment with partial payment support
   * @param {Object} paymentRequest - The payment request data
   * @returns {Object} Enhanced payment result with authorization details
   */
  static async processPaymentWithAuthorization(paymentRequest) {
    const {
      prescriptionId,
      invoiceId,
      paymentMethod,
      amountPaid,
      notes,
      sendToNurse,
      prescription,
      invoice
    } = paymentRequest;

    // Extract prescription details for payment calculation
    const medicationDetails = await this.extractMedicationDetails(prescription);
    
    // Calculate how many days this payment covers
    const paidDays = this.calculatePaidDays(medicationDetails, amountPaid);
    
    // Create payment plan using our medication payment manager
    const paymentPlan = MedicationPaymentManager.calculateMedicationPayment(
      medicationDetails,
      paidDays,
      amountPaid
    );
    
    console.log(`💰 Payment Plan Total Cost: ETB ${paymentPlan.totalCost} (${paymentPlan.totalDoses} doses × ETB ${paymentPlan.costPerDose})`);
    
    // Create medication schedule with authorization
    const medicationSchedule = MedicationPaymentManager.createMedicationSchedule(paymentPlan);
    
    // Generate payment reminder if needed
    const paymentReminder = MedicationPaymentManager.generatePaymentReminder(paymentPlan);
    
    return {
      paymentPlan,
      medicationSchedule,
      paymentReminder,
      authorizationSummary: {
        totalDays: paymentPlan.totalDays,
        paidDays: paymentPlan.paidDays,
        unpaidDays: paymentPlan.unpaidDays,
        authorizedDoses: paymentPlan.paidDoses,
        unauthorizedDoses: paymentPlan.unpaidDoses,
        canAdminister: paidDays > 0,
        nextPaymentDue: paymentReminder.nextDueDate,
        outstandingAmount: paymentPlan.outstandingAmount,
        totalCost: paymentPlan.totalCost
      }
    };
  }
  
  /**
   * Extract medication details from prescription
   * @param {Object} prescription - The prescription object
   * @returns {Promise<Object>} Standardized medication details
   */
  static async extractMedicationDetails(prescription) {
    // Ensure we use the exact duration from the prescription
    const duration = prescription.duration || '7 days';
    const durationMatch = duration.match(/(\d+)\s*(day|days)/i);
    const totalDays = durationMatch ? parseInt(durationMatch[1]) : 7;
    
    // Parse frequency to get doses per day (handle all frequency types)
    const frequency = prescription.frequency || 'once daily';
    
    // Use centralized medication calculator
    const MedicationCalculator = require('./utils/medicationCalculator');
    
    // Use the centralized frequency parser
    const dosesPerDay = MedicationCalculator.parseFrequencyToDosesPerDay(frequency);

    console.log(`📊 Frequency parsing: "${frequency}" → ${dosesPerDay} doses/day`);
    
    const medicationName = prescription.medicationName || prescription.medications?.[0]?.medication;
    const calculation = await MedicationCalculator.calculateMedicationCost({
      name: medicationName,
      frequency: frequency,
      duration: duration
    });
    
    const costPerDose = calculation.costPerDose;
    const totalCost = calculation.totalCost;
    const totalDoses = calculation.totalDoses;
    
    console.log(`🔍 DETAILED Medication Details Calculation:`, {
      rawPrescription: prescription,
      medicationName: prescription.medicationName,
      originalDuration: prescription.duration,
      parsedDuration: calculation.duration,
      totalDays: calculation.days,
      frequency: prescription.frequency,
      parsedFrequency: calculation.frequency,
      dosesPerDay: calculation.dosesPerDay,
      totalDoses: calculation.totalDoses,
      costPerDose: calculation.costPerDose,
      totalCost: calculation.totalCost
    });
    
    return {
      medicationName: prescription.medicationName,
      frequency: calculation.frequency,
      totalDays: calculation.days,
      dosesPerDay: calculation.dosesPerDay,
      costPerDose: calculation.costPerDose,
      price: calculation.costPerDose,
      totalCost: calculation.totalCost,
      totalDoses: calculation.totalDoses,
      startDate: prescription.startDate || new Date()
    };
  }
  
  /**
   * Parse frequency string to doses per day
   * @param {string} frequency - Frequency string (e.g., "BID", "TID", "QID", "Once daily")
   * @returns {number} Number of doses per day
   */
  static parseFrequencyToDosesPerDay(frequency) {
    if (!frequency) return 1;
    
    const freq = frequency.toLowerCase();
    
    if (freq.includes('bid') || freq.includes('twice')) return 2;
    if (freq.includes('tid') || freq.includes('three')) return 3;
    if (freq.includes('qid') || freq.includes('four')) return 4;
    if (freq.includes('once') || freq.includes('daily') || freq.includes('od')) return 1;
    
    // Try to extract number from string (e.g., "2 times daily")
    const match = freq.match(/(\d+)\s*times?/);
    if (match) return parseInt(match[1]);
    
    return 1; // Default to once daily
  }
  
  /**
   * Parse duration string to days
   * @param {string} duration - Duration string (e.g., "7 days", "1 week", "2 weeks")
   * @returns {number} Number of days
   */
  static parseDurationToDays(duration) {
    if (!duration) return 7; // Default to 7 days if not specified
    
    const dur = duration.toLowerCase();
    
    // Extract number and unit with more precise matching
    const match = dur.match(/(\d+)\s*(day|days)/);
    if (match) {
      return parseInt(match[1]);
    }
    
    // Fallback to extracting any number if no unit is found
    const numberMatch = dur.match(/(\d+)/);
    if (numberMatch) {
      return parseInt(numberMatch[1]);
    }
    
    return 7; // Strict default to 7 days
  }
  
  /**
   * Calculate how many days the payment covers
   * @param {Object} medicationDetails - Medication details
   * @param {number} amountPaid - Amount paid
   * @returns {number} Number of days covered
   */
  static calculatePaidDays(medicationDetails, amountPaid) {
    const { totalDays, dosesPerDay, costPerDose } = medicationDetails;
    const costPerDay = dosesPerDay * costPerDose;
    
    // Calculate exact number of days paid
    const paidDays = Math.min(
      Math.floor(amountPaid / costPerDay),
      totalDays
    );
    
    // If partial payment, ensure at least 1 day is covered
    return Math.max(1, paidDays);
  }
  
  /**
   * Create nurse task with authorization restrictions
   * @param {Object} taskData - Task creation data
   * @param {Object} paymentPlan - Payment plan with authorization
   * @returns {Object} Enhanced nurse task
   */
  static createAuthorizedNurseTask(taskData, paymentPlan) {
    const baseTask = { ...taskData };
    
    // Add payment authorization to the task
    baseTask.paymentAuthorization = {
      paidDays: paymentPlan.paidDays,
      totalDays: paymentPlan.totalDays,
      paymentStatus: paymentPlan.paymentStatus,
      canAdminister: paymentPlan.paidDays > 0,
      restrictionMessage: paymentPlan.paidDays < paymentPlan.totalDays 
        ? `Payment covers only ${paymentPlan.paidDays} of ${paymentPlan.totalDays} days`
        : 'Fully paid - no restrictions'
    };
    
    // Add dose-by-dose authorization
    baseTask.medicationDetails.doseRecords = paymentPlan.schedule?.map(dose => ({
      day: dose.day,
      timeSlot: dose.timeSlot,
      canAdminister: dose.canAdminister,
      paymentStatus: dose.paymentStatus,
      restrictionReason: dose.restrictionReason,
      administered: false
    }));
    
    return baseTask;
  }
  
  /**
   * Check if a specific dose can be administered
   * @param {number} day - Day number
   * @param {string} timeSlot - Time slot (e.g., "09:00")
   * @param {Object} paymentPlan - Current payment plan
   * @returns {Object} Authorization result
   */
  static checkDoseAuthorization(day, timeSlot, paymentPlan) {
    return MedicationPaymentManager.authorizeAdministration(
      { day, timeSlot },
      paymentPlan
    );
  }
  
  /**
   * Process additional payment and update authorization
   * @param {string} prescriptionId - Prescription ID
   * @param {number} additionalAmount - Additional payment amount
   * @param {Object} currentPaymentPlan - Current payment plan
   * @returns {Object} Updated authorization
   */
  static async processAdditionalPayment(prescriptionId, additionalAmount, currentPaymentPlan) {
    // Calculate additional days covered
    const { dosesPerDay, costPerDose } = currentPaymentPlan;
    const costPerDay = dosesPerDay * costPerDose;
    const additionalDays = Math.floor(additionalAmount / costPerDay);
    
    // Update payment plan
    const updatedPaymentPlan = MedicationPaymentManager.processAdditionalPayment(
      currentPaymentPlan,
      additionalDays
    );
    
    // Update medication schedule
    const updatedSchedule = MedicationPaymentManager.createMedicationSchedule(updatedPaymentPlan);
    
    return {
      updatedPaymentPlan,
      updatedSchedule,
      additionalDaysUnlocked: additionalDays,
      newAuthorizationStatus: updatedPaymentPlan.paymentStatus
    };
  }
}

// Example integration with existing payment endpoint
function enhancePaymentEndpoint() {
  return `
  // Enhanced medication payment processing
  router.post('/process-medication-payment', [
    auth(),
    body('prescriptionId').notEmpty().withMessage('Prescription ID is required'),
    body('invoiceId').notEmpty().withMessage('Invoice ID is required'),
    body('paymentMethod').isIn(['cash', 'credit_card', 'debit_card', 'insurance', 'bank_transfer']).withMessage('Invalid payment method'),
    body('amountPaid').isFloat({ min: 0 }).withMessage('Amount paid must be a positive number'),
    body('sendToNurse').isBoolean().withMessage('Invalid sendToNurse format')
  ], async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const { prescriptionId, invoiceId, paymentMethod, amountPaid, notes, sendToNurse } = req.body;

      // Get prescription and invoice
      const prescription = await Prescription.findById(prescriptionId).session(session);
      const invoice = await MedicalInvoice.findById(invoiceId).session(session);
      
      if (!prescription || !invoice) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ message: 'Prescription or invoice not found' });
      }

      // Process payment with authorization
      const enhancedResult = await EnhancedMedicationPaymentProcessor.processPaymentWithAuthorization({
        prescriptionId,
        invoiceId,
        paymentMethod,
        amountPaid,
        notes,
        sendToNurse,
        prescription,
        invoice
      });

      // Continue with existing payment processing...
      // [existing payment logic here]

      // Add authorization details to response
      res.json({
        success: true,
        message: 'Payment processed successfully',
        data: {
          invoice,
          prescription,
          paymentAuthorization: enhancedResult.authorizationSummary,
          medicationSchedule: enhancedResult.medicationSchedule,
          paymentReminder: enhancedResult.paymentReminder
        }
      });

    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      res.status(500).json({ message: 'Payment processing failed', error: error.message });
    } finally {
      session.endSession();
    }
  });
  `;
}

module.exports = EnhancedMedicationPaymentProcessor; 

