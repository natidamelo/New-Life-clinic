/**
 * Payment Calculation Utility
 * 
 * Centralized payment calculation logic to ensure consistency
 * across nurse tasks, prescriptions, and billing.
 */

const mongoose = require('mongoose');

class PaymentCalculation {
  
  /**
   * Calculate medication cost based on frequency and duration
   * @param {string} frequency - Medication frequency (e.g., "BID", "TID", "Once daily")
   * @param {string|number} duration - Duration in days (can be "7 days" string or number)
   * @param {string} medicationName - Name of the medication (optional)
   * @param {number} costPerDose - Cost per dose in ETB (optional, will use real cost if medicationName provided)
   * @returns {Object} Cost breakdown
   */
  static calculateMedicationCost(frequency, duration, medicationName = null, costPerDose = null) {
    // Parse duration to numeric days (FIXED: handle string duration)
    const durationDays = this.parseDuration(duration);
    
    // Use real medication cost if medication name is provided
    if (medicationName && !costPerDose) {
      costPerDose = this.getMedicationCost(medicationName);
    } else if (!costPerDose) {
      costPerDose = 150; // Default cost
    }
    
    const dosesPerDay = this.getDosesPerDay(frequency);
    const totalDoses = dosesPerDay * durationDays;
    const totalCost = totalDoses * costPerDose;
    
    return {
      dosesPerDay,
      totalDoses,
      totalCost,
      costPerDose,
      durationDays
    };
  }
  
  /**
   * Get real medication cost based on medication name
   * @param {string} medicationName - Name of the medication
   * @returns {number} Cost per dose in ETB
   */
  static getMedicationCost(medicationName) {
    if (!medicationName) return 150; // Default cost
    
    // FIXED: More comprehensive medication cost database
    const medicationCosts = {
      'Diclofenac': 150,      // ETB 150 per dose
      'Dexamethasone': 200,   // ETB 200 per dose  
      'Ceftriaxone': 500,     // ETB 500 per dose
      'Amoxicillin': 120,     // ETB 120 per dose
      'Paracetamol': 50,      // ETB 50 per dose
      'Ibuprofen': 80,        // ETB 80 per dose
      'Omeprazole': 180,      // ETB 180 per dose
      'Metformin': 100,       // ETB 100 per dose
      'Amlodipine': 120,      // ETB 120 per dose
      'Lisinopril': 140,      // ETB 140 per dose
      'Aspirin': 30,          // ETB 30 per dose
      'Insulin': 300,         // ETB 300 per dose
      'Morphine': 400,        // ETB 400 per dose
      'Penicillin': 100,      // ETB 100 per dose
      'Warfarin': 80,         // ETB 80 per dose
      'Digoxin': 60,          // ETB 60 per dose
      'Furosemide': 40,       // ETB 40 per dose
      'Prednisolone': 120,    // ETB 120 per dose
      'Hydrocortisone': 150,  // ETB 150 per dose
      'Gentamicin': 200       // ETB 200 per dose
    };
    
    // FIXED: Case-insensitive matching
    const normalizedName = medicationName.toLowerCase().trim();
    for (const [name, cost] of Object.entries(medicationCosts)) {
      if (name.toLowerCase() === normalizedName) {
        return cost;
      }
    }
    
    // FIXED: Partial matching for common variations
    if (normalizedName.includes('diclofenac')) return 150;
    if (normalizedName.includes('dexamethasone')) return 200;
    if (normalizedName.includes('ceftriaxone')) return 500;
    if (normalizedName.includes('amoxicillin')) return 120;
    if (normalizedName.includes('paracetamol')) return 50;
    if (normalizedName.includes('ibuprofen')) return 80;
    
    return 150; // Default to ETB 150 if not found
  }

  /**
   * Get doses per day from frequency string
   * @param {string} frequency - Frequency string (e.g., "qd", "bid", "tid", "qid", "3 days bid")
   * @returns {number} Doses per day
   */
  static getDosesPerDay(frequency) {
    if (!frequency) return 1;
    
    const freq = String(frequency).toLowerCase().trim();
    
    // Handle standard medical abbreviations
    if (freq === 'qd' || freq === 'q.d.' || freq === 'q day' || freq === 'once daily' || freq === 'once a day') {
      return 1;
    }
    
    if (freq === 'bid' || freq === 'b.i.d.' || freq === 'twice daily' || freq === 'twice a day' || freq === '2x daily') {
      return 2;
    }
    
    if (freq === 'tid' || freq === 't.i.d.' || freq === 'three times daily' || freq === 'three times a day' || freq === '3x daily') {
      return 3;
    }
    
    if (freq === 'qid' || freq === 'q.i.d.' || freq === 'four times daily' || freq === 'four times a day' || freq === '4x daily') {
      return 4;
    }
    
    if (freq === 'q6h' || freq === 'every 6 hours') {
      return 4; // 24/6 = 4 times per day
    }
    
    if (freq === 'q8h' || freq === 'every 8 hours') {
      return 3; // 24/8 = 3 times per day
    }
    
    if (freq === 'q12h' || freq === 'every 12 hours') {
      return 2; // 24/12 = 2 times per day
    }
    
    if (freq === 'q24h' || freq === 'every 24 hours') {
      return 1; // 24/24 = 1 time per day
    }
    
    // Handle "prn" or "as needed" - default to 1 dose per day
    if (freq.includes('prn') || freq.includes('as needed') || freq.includes('when needed')) {
      return 1;
    }
    
    // Handle complex formats like "3 days bid" or "bid for 3 days"
    const complexMatch = freq.match(/(\d+)\s*days?\s*(bid|tid|qid|qd|once|twice|three times|four times)/);
    if (complexMatch) {
      const frequencyPart = complexMatch[2];
      switch (frequencyPart) {
        case 'qd':
        case 'once':
          return 1;
        case 'bid':
        case 'twice':
          return 2;
        case 'tid':
        case 'three times':
          return 3;
        case 'qid':
        case 'four times':
          return 4;
        default:
          return 1;
      }
    }
    
    // Handle reverse format like "bid for 3 days"
    const reverseMatch = freq.match(/(bid|tid|qid|qd|once|twice|three times|four times)\s*for\s*(\d+)\s*days?/);
    if (reverseMatch) {
      const frequencyPart = reverseMatch[1];
      switch (frequencyPart) {
        case 'qd':
        case 'once':
          return 1;
        case 'bid':
        case 'twice':
          return 2;
        case 'tid':
        case 'three times':
          return 3;
        case 'qid':
        case 'four times':
          return 4;
        default:
          return 1;
      }
    }
    
    // Handle "every X hours" format
    const hourlyMatch = freq.match(/every\s*(\d+)\s*hours?/);
    if (hourlyMatch) {
      const hours = parseInt(hourlyMatch[1], 10);
      if (hours > 0) {
        return Math.floor(24 / hours);
      }
    }
    
    // Handle "X times daily" format
    const timesDailyMatch = freq.match(/(\d+)\s*times?\s*daily/);
    if (timesDailyMatch) {
      return parseInt(timesDailyMatch[1], 10);
    }
    
    // Handle "X times per day" format
    const timesPerDayMatch = freq.match(/(\d+)\s*times?\s*per\s*day/);
    if (timesPerDayMatch) {
      return parseInt(timesPerDayMatch[1], 10);
    }
    
    // Handle "X times a day" format
    const timesADayMatch = freq.match(/(\d+)\s*times?\s*a\s*day/);
    if (timesADayMatch) {
      return parseInt(timesADayMatch[1], 10);
    }
    
    // Handle simple number extraction
    const numberMatch = freq.match(/(\d+)\s*times?/);
    if (numberMatch) {
      return parseInt(numberMatch[1], 10);
    }
    
    // Handle common variations
    if (freq.includes('twice') || freq.includes('2x')) {
      return 2;
    } else if (freq.includes('three') || freq.includes('3x')) {
      return 3;
    } else if (freq.includes('four') || freq.includes('4x')) {
      return 4;
    } else if (freq.includes('once') || freq.includes('daily') || freq.includes('qd')) {
      return 1;
    }
    
    // Default fallback
    return 1;
  }
  
  /**
   * Parse duration string to numeric days
   * @param {string} duration - Duration string (e.g., "7 days", "2 weeks", "1 month", "3-5 days")
   * @returns {number} Duration in days
   */
  static parseDuration(duration) {
    if (typeof duration === 'number') return Math.max(1, duration);
    if (!duration) return 1;
    
    const durationStr = String(duration).toLowerCase().trim();
    
    // Handle range formats (e.g., "3-5 days", "1-2 weeks")
    const rangeMatch = durationStr.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*(day|week|month|year)s?/);
    if (rangeMatch) {
      const minValue = parseFloat(rangeMatch[1]);
      const maxValue = parseFloat(rangeMatch[2]);
      const unit = rangeMatch[3];
      const avgValue = (minValue + maxValue) / 2;
      
      switch (unit) {
        case 'day': return Math.max(1, Math.round(avgValue));
        case 'week': return Math.round(avgValue * 7);
        case 'month': return Math.round(avgValue * 30);
        case 'year': return Math.round(avgValue * 365);
        default: return Math.round(avgValue);
      }
    }
    
    // Handle standard formats with units - FIXED for single day calculation
    const match = durationStr.match(/(\d+(?:\.\d+)?)\s*(day|week|month|year|d|w|m|y)s?/);
    if (match) {
      const value = parseFloat(match[1]);
      const unit = match[2];
      
      switch (unit) {
        case 'day':
        case 'd':
          console.log(`📅 [PAYMENT CALC] "${duration}" → ${value} days`);
          return Math.max(1, Math.round(value));
        case 'week':
        case 'w':
          const weekDays = Math.round(value * 7);
          console.log(`📅 [PAYMENT CALC] "${duration}" → ${value} weeks = ${weekDays} days`);
          return Math.max(1, weekDays);
        case 'month':
        case 'm':
          const monthDays = Math.round(value * 30);
          console.log(`📅 [PAYMENT CALC] "${duration}" → ${value} months = ${monthDays} days`);
          return Math.max(1, monthDays);
        case 'year':
        case 'y':
          const yearDays = Math.round(value * 365);
          console.log(`📅 [PAYMENT CALC] "${duration}" → ${value} years = ${yearDays} days`);
          return Math.max(1, yearDays);
        default:
          return Math.max(1, Math.round(value));
      }
    }
    
    // Handle "as needed" or "prn" - default to 1 day
    if (durationStr.includes('as needed') || durationStr.includes('prn') || durationStr.includes('when needed')) {
      return 1;
    }
    
    // Handle "until finished" or "complete course" - default to 7 days
    if (durationStr.includes('until finished') || durationStr.includes('complete course') || 
        durationStr.includes('until symptoms resolve') || durationStr.includes('as directed')) {
      return 7;
    }
    
    // Handle "twice daily for 5 days" format
    const complexMatch = durationStr.match(/(\d+(?:\.\d+)?)\s*(day|week|month|year)s?/);
    if (complexMatch) {
      const value = parseFloat(complexMatch[1]);
      const unit = complexMatch[2];
      
      switch (unit) {
        case 'day': return Math.round(value);
        case 'week': return Math.round(value * 7);
        case 'month': return Math.round(value * 30);
        case 'year': return Math.round(value * 365);
        default: return Math.round(value);
      }
    }
    
    // Handle "5 days" without explicit unit (assume days)
    const daysOnlyMatch = durationStr.match(/(\d+(?:\.\d+)?)\s*days?/);
    if (daysOnlyMatch) {
      return parseFloat(daysOnlyMatch[1]);
    }
    
    // Handle just numbers (assume days)
    const numberMatch = durationStr.match(/(\d+(?:\.\d+)?)/);
    if (numberMatch) {
      const num = parseFloat(numberMatch[1]);
      // If it's a reasonable number for days (1-365), assume days
      if (num >= 1 && num <= 365) {
        return num;
      }
      // If it's larger, might be hours, so convert to days
      if (num > 365) {
        return Math.round(num / 24); // Convert hours to days
      }
      return num;
    }
    
    // Handle special cases
    if (durationStr.includes('single') || durationStr.includes('one time') || durationStr.includes('once')) {
      return 1;
    }
    
    if (durationStr.includes('short term') || durationStr.includes('brief')) {
      return 3;
    }
    
    if (durationStr.includes('long term') || durationStr.includes('chronic')) {
      return 30;
    }
    
    // Default fallback
    return 1;
  }

  /**
   * Calculate payment authorization based on amount paid
   * @param {Object} medicationDetails - Medication details
   * @param {number} amountPaid - Amount paid in ETB
   * @param {number} totalCost - Total cost of medication
   * @returns {Object} Payment authorization details
   */
  static calculatePaymentAuthorization(medicationDetails, amountPaid, totalCost) {
    const { frequency, duration, medicationName } = medicationDetails;
    
    // Parse duration to numeric days (fix for string duration issue)
    const durationDays = this.parseDuration(duration);
    const costBreakdown = this.calculateMedicationCost(frequency, durationDays, medicationName);
    
    // FIXED: Use actual total cost from invoice if provided, otherwise use calculated cost
    const actualTotalCost = totalCost > 0 ? totalCost : costBreakdown.totalCost;
    
    // Calculate paid days with improved logic
    const costPerDay = costBreakdown.dosesPerDay * costBreakdown.costPerDose;
    let paidDays = 0;
    let authorizedDoses = 0;
    
    if (amountPaid > 0) {
      if (amountPaid >= actualTotalCost) {
        // Fully paid - authorize all doses
        paidDays = durationDays;
        authorizedDoses = costBreakdown.totalDoses;
      } else {
        // FIXED: Partial payment - calculate proportion based on actual cost
        const paymentRatio = amountPaid / actualTotalCost;
        authorizedDoses = Math.floor(paymentRatio * costBreakdown.totalDoses);
        paidDays = Math.ceil(authorizedDoses / costBreakdown.dosesPerDay);
        
        // FIXED: Ensure at least 1 dose if any payment was made, but respect the actual payment ratio
        if (authorizedDoses === 0 && amountPaid > 0) {
          // Calculate minimum authorized doses based on cost per dose
          const minDoses = Math.floor(amountPaid / costBreakdown.costPerDose);
          authorizedDoses = Math.max(1, minDoses);
          paidDays = Math.ceil(authorizedDoses / costBreakdown.dosesPerDay);
        }
      }
    }
    const unauthorizedDoses = Math.max(0, costBreakdown.totalDoses - authorizedDoses);
    
    // Calculate outstanding amount based on actual cost
    const outstandingAmount = Math.max(0, actualTotalCost - amountPaid);
    
    // Determine payment status with consistent values
    let paymentStatus;
    if (amountPaid === 0) {
      paymentStatus = 'unpaid';
    } else if (amountPaid >= actualTotalCost) {
      paymentStatus = 'fully_paid';
    } else {
      paymentStatus = 'partial';
    }
    
    return {
      paidDays,
      totalDays: durationDays,
      paymentStatus,
      canAdminister: authorizedDoses > 0,
      restrictionMessage: authorizedDoses < costBreakdown.totalDoses 
        ? `Payment covers only ${authorizedDoses} of ${costBreakdown.totalDoses} doses (${paidDays} of ${durationDays} days). Complete payment for remaining ${unauthorizedDoses} doses.`
        : 'Fully paid - no restrictions',
      authorizedDoses,
      unauthorizedDoses,
      outstandingAmount,
      lastUpdated: new Date()
    };
  }
  
  /**
   * Calculate payment authorization for multiple medications
   * @param {Array} medications - Array of medication objects
   * @param {number} totalAmountPaid - Total amount paid
   * @param {Object} paymentBreakdown - Optional specific breakdown per medication
   * @returns {Object} Payment authorization for each medication
   */
  static calculateMultiMedicationPayment(medications, totalAmountPaid, paymentBreakdown = null) {
    const results = [];
    let totalCost = 0;
    
    // Calculate total cost and individual medication costs
    const medicationCosts = medications.map(med => {
      const cost = this.calculateMedicationCost(med.frequency, med.duration, med.costPerDose);
      totalCost += cost.totalCost;
      return {
        ...med,
        costBreakdown: cost
      };
    });
    
    // If specific breakdown provided, use it
    if (paymentBreakdown && Array.isArray(paymentBreakdown)) {
      for (const med of medicationCosts) {
        const breakdown = paymentBreakdown.find(b => b.medicationName === med.name);
        const amountPaid = breakdown ? breakdown.amountPaid : 0;
        
        const auth = this.calculatePaymentAuthorization(med, amountPaid, med.costBreakdown.totalCost);
        results.push({
          medicationName: med.name,
          ...auth,
          amountPaid
        });
      }
    } else {
      // Distribute payment proportionally
      for (const med of medicationCosts) {
        const proportion = med.costBreakdown.totalCost / totalCost;
        const amountPaid = Math.round(totalAmountPaid * proportion * 100) / 100; // Round to 2 decimal places
        
        const auth = this.calculatePaymentAuthorization(med, amountPaid, med.costBreakdown.totalCost);
        results.push({
          medicationName: med.name,
          ...auth,
          amountPaid
        });
      }
    }
    
    return {
      medications: results,
      totalCost,
      totalAmountPaid,
      outstandingAmount: Math.max(0, totalCost - totalAmountPaid)
    };
  }
  
  /**
   * Validate payment authorization data
   * @param {Object} paymentAuth - Payment authorization object
   * @param {Object} medicationDetails - Medication details for validation
   * @returns {Object} Validation result
   */
  static validatePaymentAuthorization(paymentAuth, medicationDetails) {
    const errors = [];
    
    if (!paymentAuth) {
      errors.push('Payment authorization is required');
      return { isValid: false, errors };
    }
    
    // Validate required fields
    const requiredFields = ['paidDays', 'totalDays', 'paymentStatus', 'authorizedDoses', 'unauthorizedDoses', 'outstandingAmount'];
    for (const field of requiredFields) {
      if (typeof paymentAuth[field] === 'undefined' || paymentAuth[field] === null) {
        errors.push(`${field} is required`);
      }
    }
    
    // Validate payment status enum
    const validStatuses = ['unpaid', 'partial', 'fully_paid'];
    if (!validStatuses.includes(paymentAuth.paymentStatus)) {
      errors.push(`Invalid payment status: ${paymentAuth.paymentStatus}. Must be one of: ${validStatuses.join(', ')}`);
    }
    
    // Validate numeric fields
    const numericFields = ['paidDays', 'totalDays', 'authorizedDoses', 'unauthorizedDoses', 'outstandingAmount'];
    for (const field of numericFields) {
      if (typeof paymentAuth[field] !== 'number' || paymentAuth[field] < 0) {
        errors.push(`${field} must be a non-negative number`);
      }
    }
    
    // Validate logical consistency
    if (paymentAuth.paidDays > paymentAuth.totalDays) {
      errors.push('Paid days cannot exceed total days');
    }
    
    // Calculate expected total doses based on medication details
    if (medicationDetails) {
      const dosesPerDay = this.getDosesPerDay(medicationDetails.frequency || 'once daily');
      const expectedTotalDoses = dosesPerDay * paymentAuth.totalDays;
      const actualTotalDoses = paymentAuth.authorizedDoses + paymentAuth.unauthorizedDoses;
      
      // Allow for small discrepancies (within 1 dose) due to rounding
      if (Math.abs(actualTotalDoses - expectedTotalDoses) > 1) {
        errors.push(`Dose counts are inconsistent. Expected ${expectedTotalDoses} total doses, got ${actualTotalDoses}`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Normalize payment status values for consistency
   * @param {string} status - Payment status
   * @returns {string} Normalized status
   */
  static normalizePaymentStatus(status) {
    if (!status) return 'unpaid';
    
    const statusMap = {
      'pending': 'unpaid',
      'paid': 'fully_paid',
      'partial': 'partial',
      'partially_paid': 'partial',
      'fully_paid': 'fully_paid',
      'unpaid': 'unpaid',
      'refunded': 'unpaid'
    };
    
    return statusMap[status.toLowerCase()] || 'unpaid';
  }

  /**
   * Fix payment authorization data to ensure consistency
   * @param {Object} paymentAuth - Payment authorization object to fix
   * @param {Object} medicationDetails - Medication details for recalculation
   * @returns {Object} Fixed payment authorization
   */
  static fixPaymentAuthorization(paymentAuth, medicationDetails) {
    if (!paymentAuth || !medicationDetails) {
      return this.calculatePaymentAuthorization(medicationDetails, 0, 0);
    }
    
    // Calculate cost breakdown
    const costBreakdown = this.calculateMedicationCost(
      medicationDetails.frequency, 
      medicationDetails.duration,
      medicationDetails.medicationName
    );
    
    // Preserve the existing payment information instead of recalculating
    // Calculate amount paid based on authorized doses
    const dosesPerDay = this.getDosesPerDay(medicationDetails.frequency);
    const costPerDose = costBreakdown.costPerDose;
    const amountPaid = paymentAuth.authorizedDoses * costPerDose;
    
    // Ensure the payment authorization is consistent
    const totalDoses = dosesPerDay * medicationDetails.duration;
    const unpaidDoses = totalDoses - paymentAuth.authorizedDoses;
    const outstandingAmount = unpaidDoses * costPerDose;
    
    // Determine payment status
    let paymentStatus;
    if (paymentAuth.authorizedDoses === 0) {
      paymentStatus = 'unpaid';
    } else if (paymentAuth.authorizedDoses === totalDoses) {
      paymentStatus = 'fully_paid';
    } else {
      paymentStatus = 'partial';
    }
    
    return {
      paidDays: Math.ceil(paymentAuth.authorizedDoses / dosesPerDay),
      totalDays: medicationDetails.duration,
      paymentStatus,
      canAdminister: paymentAuth.authorizedDoses > 0,
      restrictionMessage: paymentAuth.authorizedDoses < totalDoses 
        ? `Payment covers ${paymentAuth.authorizedDoses} of ${totalDoses} doses`
        : 'Fully paid - no restrictions',
      authorizedDoses: paymentAuth.authorizedDoses,
      unauthorizedDoses: unpaidDoses,
      outstandingAmount: Math.max(0, outstandingAmount),
      lastUpdated: new Date()
    };
  }
}

module.exports = PaymentCalculation; 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
