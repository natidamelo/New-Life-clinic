const mongoose = require('mongoose');

/**
 * Validate medication task data before saving
 * @param {Object} task - The task object to validate
 * @returns {Object} Validation result with isValid and errors
 */
const validateMedicationTask = (task) => {
  const errors = [];

  // Check if task has required fields
  if (!task.taskType || task.taskType !== 'MEDICATION') {
    errors.push('Task type must be MEDICATION');
  }

  if (!task.patientId) {
    errors.push('Patient ID is required');
  }

  if (!task.patientName || task.patientName.trim() === '') {
    errors.push('Patient name is required');
  }

  if (!task.medicationDetails) {
    errors.push('Medication details are required');
  } else {
    const medDetails = task.medicationDetails;
    
    if (!medDetails.medicationName || medDetails.medicationName.trim() === '') {
      errors.push('Medication name is required');
    }
    
    if (!medDetails.dosage || medDetails.dosage.trim() === '') {
      errors.push('Medication dosage is required');
    }
    
    if (!medDetails.frequency || medDetails.frequency.trim() === '') {
      errors.push('Medication frequency is required');
    }
  }

  // Validate payment authorization consistency
  if (task.paymentAuthorization) {
    const paymentAuth = task.paymentAuthorization;
    
    // Check for valid payment status
    const validStatuses = ['unpaid', 'partial', 'paid'];
    if (!validStatuses.includes(paymentAuth.paymentStatus)) {
      errors.push(`Invalid payment status: ${paymentAuth.paymentStatus}`);
    }
    
    // Check for dose authorization consistency
    const totalDoses = task.medicationDetails?.doseRecords?.length || 0;
    const authorizedDoses = paymentAuth.authorizedDoses || 0;
    const unauthorizedDoses = paymentAuth.unauthorizedDoses || 0;
    
    if (authorizedDoses + unauthorizedDoses !== totalDoses) {
      errors.push(`Dose authorization mismatch: ${authorizedDoses} + ${unauthorizedDoses} ≠ ${totalDoses}`);
    }
    
    // Check for logical consistency
    if (paymentAuth.canAdminister && authorizedDoses === 0) {
      errors.push('Cannot administer medication with 0 authorized doses');
    }
    
    if (!paymentAuth.canAdminister && authorizedDoses > 0) {
      errors.push('Should be able to administer medication with authorized doses');
    }
  }

  // Validate dose records
  if (task.medicationDetails?.doseRecords) {
    const doseRecords = task.medicationDetails.doseRecords;
    
    // Check for duplicate dose records
    const doseKeys = doseRecords.map(dose => `${dose.day}-${dose.timeSlot}`);
    const uniqueKeys = new Set(doseKeys);
    
    if (doseKeys.length !== uniqueKeys.size) {
      errors.push('Duplicate dose records found');
    }
    
    // Check for valid day numbers
    const invalidDays = doseRecords.filter(dose => !dose.day || dose.day < 1);
    if (invalidDays.length > 0) {
      errors.push('Invalid day numbers in dose records');
    }
    
    // Check for valid time slots
    const invalidTimeSlots = doseRecords.filter(dose => !dose.timeSlot || dose.timeSlot.trim() === '');
    if (invalidTimeSlots.length > 0) {
      errors.push('Invalid time slots in dose records');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Middleware to validate medication task before saving
 */
const validateMedicationTaskMiddleware = (req, res, next) => {
  if (req.body.taskType === 'MEDICATION') {
    const validation = validateMedicationTask(req.body);
    
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Medication task validation failed',
        errors: validation.errors
      });
    }
  }
  
  next();
};

/**
 * Middleware to validate medication task updates
 */
const validateMedicationTaskUpdateMiddleware = (req, res, next) => {
  const updateData = req.body;
  
  // Check if payment authorization is being updated
  if (updateData.paymentAuthorization) {
    const paymentAuth = updateData.paymentAuthorization;
    
    // Validate payment status
    const validStatuses = ['unpaid', 'partial', 'paid'];
    if (paymentAuth.paymentStatus && !validStatuses.includes(paymentAuth.paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment status',
        error: `Payment status must be one of: ${validStatuses.join(', ')}`
      });
    }
    
    // Validate dose authorization consistency
    if (typeof paymentAuth.authorizedDoses === 'number' && 
        typeof paymentAuth.unauthorizedDoses === 'number') {
      
      // Get the current task to check total doses
      const NurseTask = require('../models/NurseTask');
      NurseTask.findById(req.params.id)
        .then(task => {
          if (task && task.medicationDetails?.doseRecords) {
            const totalDoses = task.medicationDetails.doseRecords.length;
            if (paymentAuth.authorizedDoses + paymentAuth.unauthorizedDoses !== totalDoses) {
              return res.status(400).json({
                success: false,
                message: 'Dose authorization mismatch',
                error: `Authorized (${paymentAuth.authorizedDoses}) + Unauthorized (${paymentAuth.unauthorizedDoses}) ≠ Total (${totalDoses})`
              });
            }
          }
          next();
        })
        .catch(error => {
          console.error('Error validating task update:', error);
          next();
        });
    } else {
      next();
    }
  } else {
    next();
  }
};

module.exports = {
  validateMedicationTask,
  validateMedicationTaskMiddleware,
  validateMedicationTaskUpdateMiddleware
};
