/**
 * Medication Payment Management System
 * 
 * Handles scenarios where patients pay for only part of their medication schedule
 * Example: 7-day prescription but patient only pays for 3 days
 */

const mongoose = require('mongoose');

class MedicationPaymentManager {
  
  /**
   * Calculate medication costs and create payment plan
   * @param {Object} prescription - The prescription details
   * @param {number} paidDays - Number of days patient has paid for
   * @param {number} amountPaid - Amount of money patient has paid
   * @returns {Object} Payment plan details
   */
  static calculateMedicationPayment(prescription, paidDays = 0, amountPaid = 0) {
    const {
      medicationName,
      totalDays,
      dosesPerDay, // e.g., BID = 2, TID = 3, QID = 4
      costPerDose: originalCostPerDose,
      price, // inventory sellingPrice
      startDate
    } = prescription;

    const totalDoses = totalDays * dosesPerDay;

    // Use inventory price as cost per dose
    const costPerDose = price || originalCostPerDose;
    const totalCost = costPerDose * totalDoses;

    // Enhanced dose-level payment calculation
    let paidDoses;

    if (paidDays > 0) {
      // If paidDays is provided, calculate doses from days
      paidDoses = paidDays * dosesPerDay;
    } else if (amountPaid > 0) {
      // If only amount is provided, calculate how many individual doses can be covered
      paidDoses = Math.min(Math.floor(amountPaid / costPerDose), totalDoses);
    } else {
      // No payment made
      paidDoses = 0;
    }

    // Re-derive paidDays from the dose count to keep the two in sync
    // For partial dose payments (e.g., 1 dose when 2 doses per day), paidDays will be 0
    paidDays = Math.floor(paidDoses / dosesPerDay);

    const unpaidDoses = totalDoses - paidDoses;
    
    const paidAmount = paidDoses * costPerDose;
    const outstandingAmount = unpaidDoses * costPerDose;

    // Calculate which days are covered (for partial doses, this might be 0)
    const paidEndDate = new Date(startDate);
    if (paidDays > 0) {
      paidEndDate.setDate(paidEndDate.getDate() + paidDays - 1);
    }

    // Enhanced payment status logic
    let paymentStatus;
    if (paidDoses >= totalDoses) {
      paymentStatus = 'fully_paid';
    } else if (paidDoses > 0) {
      paymentStatus = 'partial';
    } else {
      paymentStatus = 'unpaid';
    }

    return {
      medicationName,
      totalDays,
      paidDays,
      unpaidDays: totalDays - paidDays,
      dosesPerDay,
      totalDoses,
      paidDoses,
      unpaidDoses,
      costPerDose,
      totalCost,
      paidAmount,
      outstandingAmount,
      startDate,
      paidEndDate,
      paymentStatus,
      // Add dose-level authorization details for frontend
      authorizedDoses: paidDoses,
      unauthorizedDoses: unpaidDoses,
      canAdminister: paidDoses > 0
    };
  }

  /**
   * Create medication administration schedule with payment restrictions
   * @param {Object} paymentPlan - From calculateMedicationPayment
   * @returns {Array} Array of dose records with payment status
   */
  static createMedicationSchedule(paymentPlan) {
    const schedule = [];
    const { 
      totalDays, 
      paidDays, 
      dosesPerDay, 
      startDate, 
      medicationName 
    } = paymentPlan;

    // Define time slots based on doses per day
    const timeSlots = {
      1: ['09:00'], // Once daily
      2: ['09:00', '21:00'], // BID (twice daily)
      3: ['09:00', '13:00', '21:00'], // TID (three times daily)
      4: ['09:00', '13:00', '17:00', '21:00'] // QID (four times daily)
    };

    const slots = timeSlots[dosesPerDay] || timeSlots[1];

    for (let day = 1; day <= totalDays; day++) {
      const dayDate = new Date(startDate);
      dayDate.setDate(dayDate.getDate() + day - 1);
      
      const isPaid = day <= paidDays;
      const canAdminister = isPaid;

      for (let slotIndex = 0; slotIndex < dosesPerDay; slotIndex++) {
        const timeSlot = slots[slotIndex];
        
        schedule.push({
          day,
          date: dayDate.toISOString().split('T')[0],
          timeSlot,
          medicationName,
          administered: false,
          administeredAt: null,
          administeredBy: null,
          canAdminister, // Only allow administration if paid
          paymentStatus: isPaid ? 'paid' : 'unpaid',
          restrictionReason: isPaid ? null : `Payment required for Day ${day}`,
          inventoryDeducted: false
        });
      }
    }

    return schedule;
  }

  /**
   * Check if a dose can be administered based on payment status
   * @param {Object} doseRecord - The dose to check
   * @param {Object} paymentPlan - Current payment status
   * @returns {Object} Authorization result
   */
  static authorizeAdministration(doseRecord, paymentPlan) {
    const { day } = doseRecord;
    const { paidDays } = paymentPlan;

    if (day <= paidDays) {
      return {
        authorized: true,
        reason: 'Payment confirmed for this day'
      };
    }

    return {
      authorized: false,
      reason: `Payment required for Day ${day}. Patient has only paid for ${paidDays} days.`,
      suggestedAction: 'Request payment or contact billing department'
    };
  }

  /**
   * Process additional payment and update schedule
   * @param {Object} paymentPlan - Current payment plan
   * @param {number} additionalDays - Additional days being paid for
   * @returns {Object} Updated payment plan
   */
  static processAdditionalPayment(paymentPlan, additionalDays) {
    const newPaidDays = Math.min(
      paymentPlan.paidDays + additionalDays,
      paymentPlan.totalDays
    );

    return this.calculateMedicationPayment({
      medicationName: paymentPlan.medicationName,
      totalDays: paymentPlan.totalDays,
      dosesPerDay: paymentPlan.dosesPerDay,
      costPerDose: paymentPlan.costPerDose,
      startDate: paymentPlan.startDate
    }, newPaidDays);
  }

  /**
   * Generate payment reminder for unpaid days
   * @param {Object} paymentPlan - Current payment plan
   * @returns {Object} Reminder details
   */
  static generatePaymentReminder(paymentPlan) {
    if (paymentPlan.paymentStatus === 'fully_paid') {
      return { reminderNeeded: false };
    }

    const { 
      medicationName, 
      unpaidDays, 
      outstandingAmount, 
      paidEndDate 
    } = paymentPlan;

    const nextDueDate = new Date(paidEndDate);
    nextDueDate.setDate(nextDueDate.getDate() + 1);

    return {
      reminderNeeded: true,
      medicationName,
      unpaidDays,
      outstandingAmount,
      nextDueDate: nextDueDate.toISOString().split('T')[0],
      message: `Payment required for remaining ${unpaidDays} days of ${medicationName}. Amount due: $${outstandingAmount.toFixed(2)}`
    };
  }
}

// Example usage:
function demonstrateUsage() {
  console.log('🏥 Medication Payment Management Demo\n');

  // Example: 7-day Ceftriaxone prescription, BID (twice daily), but patient only paid for 3 days
  const prescription = {
    medicationName: 'Ceftriaxone',
    totalDays: 7,
    dosesPerDay: 2, // BID
    costPerDose: 30, // $30 per dose
    startDate: new Date('2025-07-03')
  };

  const paidDays = 3; // Patient only paid for 3 days

  // Calculate payment plan
  const paymentPlan = MedicationPaymentManager.calculateMedicationPayment(prescription, paidDays);
  console.log('💰 Payment Plan:', paymentPlan);

  // Create medication schedule
  const schedule = MedicationPaymentManager.createMedicationSchedule(paymentPlan);
  console.log('\n📅 Medication Schedule:');
  schedule.forEach(dose => {
    console.log(`Day ${dose.day} ${dose.timeSlot}: ${dose.canAdminister ? '✅ Can administer' : '❌ Payment required'}`);
  });

  // Check authorization for Day 5 (unpaid)
  const day5Dose = schedule.find(dose => dose.day === 5);
  const authorization = MedicationPaymentManager.authorizeAdministration(day5Dose, paymentPlan);
  console.log('\n🔒 Day 5 Authorization:', authorization);

  // Generate payment reminder
  const reminder = MedicationPaymentManager.generatePaymentReminder(paymentPlan);
  console.log('\n📢 Payment Reminder:', reminder);
}

module.exports = MedicationPaymentManager;

// Run demo if called directly
if (require.main === module) {
  demonstrateUsage();
}
