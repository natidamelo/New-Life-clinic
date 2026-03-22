/**
 * Robust Nurse Task Creation Utility
 * 
 * This utility ensures that nurse tasks are ALWAYS created after payment
 * and handles all edge cases and error scenarios
 */

const mongoose = require('mongoose');
const NurseTask = require('../models/NurseTask');
const { createMedicationTaskWithDuplicatePrevention } = require('./taskDuplicatePrevention');

/**
 * Calculate dose records for a medication based on frequency and duration
 * @param {string} frequency - Medication frequency (QD, BID, TID, QID)
 * @param {number} duration - Number of days
 * @returns {Array} - Array of dose records
 */
function calculateDoseRecords(frequency, duration) {
  const freq = frequency.toLowerCase();
  let dosesPerDay = 1;
  let timeSlots = ['09:00'];
  
  // Determine doses per day and time slots based on frequency
  if (freq.includes('once') || freq.includes('qd')) {
    dosesPerDay = 1;
    timeSlots = ['09:00'];
  } else if (freq.includes('twice') || freq.includes('bid')) {
    dosesPerDay = 2;
    timeSlots = ['09:00', '21:00'];
  } else if (freq.includes('three') || freq.includes('tid')) {
    dosesPerDay = 3;
    timeSlots = ['08:00', '14:00', '20:00'];
  } else if (freq.includes('four') || freq.includes('qid')) {
    dosesPerDay = 4;
    timeSlots = ['06:00', '12:00', '18:00', '24:00'];
  }
  
  console.log(`📊 [DOSE CALC] ${frequency} → ${dosesPerDay} doses/day × ${duration} days = ${dosesPerDay * duration} total doses`);
  console.log(`📅 [DOSE CALC] Time slots: ${timeSlots.join(', ')}`);
  
  // Generate dose records for each day and time slot
  const doseRecords = [];
  for (let day = 1; day <= duration; day++) {
    for (const timeSlot of timeSlots) {
      doseRecords.push({
        day: day,
        timeSlot: timeSlot,
        administered: false,
        administeredAt: null,
        administeredBy: null,
        notes: '',
        period: 'active'
      });
    }
  }
  
  return doseRecords;
}

/**
 * Extract numeric duration from string format like "3 days" → 3
 * @param {string|number} durationStr - Duration string or number
 * @returns {number} - Numeric duration
 */
function extractNumericDuration(durationStr) {
  if (typeof durationStr === 'number') return Math.max(1, durationStr);
  if (!durationStr) return 1; // Default to 1 day instead of 7
  
  // Extract number from string like "3 days", "5", "1 week"
  const match = durationStr.toString().match(/(\d+)/);
  const days = match ? parseInt(match[1]) : 1;
  
  // Handle week and month conversions
  if (durationStr.toString().toLowerCase().includes('week')) {
    return Math.max(1, days * 7);
  } else if (durationStr.toString().toLowerCase().includes('month')) {
    return Math.max(1, days * 30);
  }
  
  return Math.max(1, days);
}

/**
 * Calculate doses per day based on frequency
 * @param {string} frequency - Medication frequency (QD, BID, TID, QID)
 * @returns {number} - Number of doses per day
 */
function calculateDosesPerDay(frequency) {
  const freq = frequency.toLowerCase();
  if (freq.includes('once') || freq.includes('qd')) {
    return 1;
  } else if (freq.includes('twice') || freq.includes('bid')) {
    return 2;
  } else if (freq.includes('three') || freq.includes('tid')) {
    return 3;
  } else if (freq.includes('four') || freq.includes('qid')) {
    return 4;
  }
  return 1; // Default to 1
}

/**
 * Create nurse task from prescription data with robust error handling
 * @param {Object} prescription - Prescription object
 * @param {Object} patient - Patient object (optional)
 * @returns {Promise<Object>} - Task creation result
 */
async function createNurseTaskFromPrescription(prescription, patient = null) {
  try {
    console.log(`🏥 [NURSE TASK] Creating task for prescription: ${prescription._id}`);
    console.log(`💊 [NURSE TASK] Medication: ${prescription.medicationName} - ${prescription.frequency}`);
    
    // Extract prescription data
    const medicationName = prescription.medicationName;
    const frequency = prescription.frequency;
    const dosage = prescription.dosage;
    const route = prescription.route || 'Oral';
    const duration = extractNumericDuration(prescription.duration);
    const patientId = prescription.patient || prescription.patientId;
    
    // Get patient name
    let patientName = 'Unknown Patient';
    if (patient) {
      patientName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
    } else if (prescription.patientName) {
      patientName = prescription.patientName;
    } else {
      // Try to fetch patient by ID
      try {
        const Patient = require('../models/Patient');
        const patientDoc = await Patient.findById(patientId);
        if (patientDoc) {
          patientName = `${patientDoc.firstName || ''} ${patientDoc.lastName || ''}`.trim();
        }
      } catch (error) {
        console.warn(`⚠️ [NURSE TASK] Could not fetch patient ${patientId}: ${error.message}`);
      }
    }
    
    // Calculate dose records
    const doseRecords = calculateDoseRecords(frequency, duration);
    
    // Determine instance order for same patient + medication
    let instanceOrder = 1;
    let instanceLabel = '1st';
    try {
      const NurseTaskModel = require('../models/NurseTask');
      const existingSameMedCount = await NurseTaskModel.countDocuments({
        patientId: patientId,
        'medicationDetails.medicationName': medicationName
      });
      instanceOrder = existingSameMedCount + 1;
      const suffix = (n) => {
        if (n % 10 === 1 && n % 100 !== 11) return 'st';
        if (n % 10 === 2 && n % 100 !== 12) return 'nd';
        if (n % 10 === 3 && n % 100 !== 13) return 'rd';
        return 'th';
      };
      instanceLabel = `${instanceOrder}${suffix(instanceOrder)}`;
    } catch (e) {
      console.warn('⚠️  [NURSE TASK] Unable to compute instance order:', e.message);
    }

    // Get doctor information for assignedBy
    let assignedByUser = null;
    let assignedByName = 'System';
    try {
      const User = require('../models/User');
      const doctorId = prescription.doctor || prescription.doctorId || (patient && patient.assignedDoctorId) || null;
      if (doctorId) {
        assignedByUser = await User.findById(doctorId);
      }
      if (assignedByUser) {
        assignedByName = `${assignedByUser.firstName || ''} ${assignedByUser.lastName || ''}`.trim();
      }
    } catch (error) {
      console.warn(`⚠️ [NURSE TASK] Could not resolve assignedBy user: ${error.message}`);
    }
    
    // Create comprehensive task data with ALWAYS complete paymentAuthorization
    const inferredPayment = (prescription.paymentStatus || '').toLowerCase();
    const isPaid = inferredPayment === 'paid' || inferredPayment === 'fully_paid' || inferredPayment === 'partial' || inferredPayment === 'partially_paid';
    const totalDoses = doseRecords.length;
    
    // ALWAYS set complete paymentAuthorization for paid prescriptions
    const paymentAuthorization = {
      paidDays: isPaid ? duration : 0,
      totalDays: duration,
      paymentStatus: isPaid ? 'fully_paid' : 'unpaid',
      canAdminister: isPaid,
      restrictionMessage: isPaid ? '' : 'Payment required before administration',
      authorizedDoses: isPaid ? totalDoses : 0,
      unauthorizedDoses: isPaid ? 0 : totalDoses,
      outstandingAmount: isPaid ? 0 : (prescription.totalCost || 0),
      lastUpdated: new Date(),
      // Preserve any existing payment data
      ...(prescription.paymentAuthorization || {})
    };

    const taskData = {
      patientId: patientId,
      patientName: patientName,
      taskType: 'MEDICATION',
      status: 'PENDING',
      priority: 'MEDIUM',
      description: `Administer ${medicationName} - ${dosage} - ${frequency}`,
      // Ensure a valid ObjectId for required field assignedBy
      assignedBy: (assignedByUser && assignedByUser._id) || prescription.doctor || prescription.doctorId || (patient && patient.assignedDoctorId) || new mongoose.Types.ObjectId(),
      assignedByName: assignedByName,
      prescriptionId: prescription._id, // root-level for unique index
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Due tomorrow
      paymentAuthorization: paymentAuthorization,
      medicationDetails: {
        medicationName: medicationName,
        dosage: dosage,
        route: route,
        frequency: frequency,
        duration: duration,
        instanceOrder: instanceOrder,
        instanceLabel: instanceLabel,
        prescriptionId: prescription._id, // ALWAYS link to prescription
        doseRecords: doseRecords,
        paymentAuthorization: paymentAuthorization
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log(`✅ [NURSE TASK] Task data prepared - ${doseRecords.length} doses over ${duration} days`);
    
    // Create task with duplicate prevention
    const result = await createMedicationTaskWithDuplicatePrevention(
      taskData,
      patientId,
      medicationName,
      prescription._id.toString(),
      null // serviceId
    );
    
    if (result.created) {
      console.log(`🎉 [NURSE TASK] Successfully created nurse task: ${result.task._id}`);
      console.log(`📋 [NURSE TASK] Patient: ${patientName}, Medication: ${medicationName}, Frequency: ${frequency}`);
    } else {
      console.log(`⚠️ [NURSE TASK] Task not created: ${result.reason}`);
    }
    
    return result;
    
  } catch (error) {
    console.error(`❌ [NURSE TASK] Error creating task for prescription ${prescription._id}:`, error);
    throw error;
  }
}

/**
 * Process payment and create nurse tasks with comprehensive error handling
 * @param {Object} prescription - Prescription object
 * @param {Object} patient - Patient object (optional)
 * @param {number} retries - Number of retry attempts (default: 3)
 * @returns {Promise<Object>} - Processing result
 */
async function processPaymentAndCreateNurseTasks(prescription, patient = null, retries = 3) {
  const results = {
    success: false,
    tasksCreated: 0,
    tasksSkipped: 0,
    errors: [],
    tasks: []
  };
  
  try {
    console.log(`💰 [PAYMENT PROCESSING] Processing prescription: ${prescription._id}`);
    console.log(`💊 [PAYMENT PROCESSING] Medication: ${prescription.medicationName} - ${prescription.frequency}`);
    
    // Handle single medication (most common case)
    if (prescription.medicationName) {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          console.log(`🔄 [RETRY] Attempt ${attempt}/${retries} for ${prescription.medicationName}`);
          
          const result = await createNurseTaskFromPrescription(prescription, patient);
          
          if (result.created) {
            results.tasksCreated++;
            results.tasks.push(result.task);
            console.log(`✅ [PAYMENT PROCESSING] Task created successfully on attempt ${attempt}`);
            break; // Success, no need to retry
          } else {
            results.tasksSkipped++;
            console.log(`⚠️ [PAYMENT PROCESSING] Task skipped: ${result.reason}`);
            break; // Skipped is not an error, no need to retry
          }
          
        } catch (error) {
          console.error(`❌ [RETRY] Attempt ${attempt}/${retries} failed:`, error.message);
          results.errors.push(`Attempt ${attempt}: ${error.message}`);
          
          if (attempt === retries) {
            // Final attempt failed
            console.error(`💥 [PAYMENT PROCESSING] All ${retries} attempts failed for ${prescription.medicationName}`);
          } else {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
      }
    }
    
    // Handle multiple medications (if prescription has medications array)
    if (prescription.medications && Array.isArray(prescription.medications)) {
      console.log(`📋 [PAYMENT PROCESSING] Processing ${prescription.medications.length} medications`);
      
      for (const medication of prescription.medications) {
        // Create a prescription-like object for each medication
        const medicationPrescription = {
          _id: prescription._id,
          medicationName: medication.name,
          frequency: medication.frequency,
          duration: medication.duration,
          dosage: medication.dosage,
          route: medication.route,
          patient: prescription.patient || prescription.patientId,
          patientName: prescription.patientName
        };
        
        for (let attempt = 1; attempt <= retries; attempt++) {
          try {
            console.log(`🔄 [RETRY] Attempt ${attempt}/${retries} for ${medication.name}`);
            
            const result = await createNurseTaskFromPrescription(medicationPrescription, patient);
            
            if (result.created) {
              results.tasksCreated++;
              results.tasks.push(result.task);
              console.log(`✅ [PAYMENT PROCESSING] Task created successfully on attempt ${attempt}`);
              break;
            } else {
              results.tasksSkipped++;
              console.log(`⚠️ [PAYMENT PROCESSING] Task skipped: ${result.reason}`);
              break;
            }
            
          } catch (error) {
            console.error(`❌ [RETRY] Attempt ${attempt}/${retries} failed:`, error.message);
            results.errors.push(`${medication.name} attempt ${attempt}: ${error.message}`);
            
            if (attempt < retries) {
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
          }
        }
      }
    }
    
    // Determine overall success
    results.success = results.tasksCreated > 0 || (results.tasksSkipped > 0 && results.errors.length === 0);
    
    console.log(`📊 [PAYMENT PROCESSING] Final results:`, {
      success: results.success,
      tasksCreated: results.tasksCreated,
      tasksSkipped: results.tasksSkipped,
      errorsCount: results.errors.length
    });
    
    return results;
    
  } catch (error) {
    console.error(`❌ [PAYMENT PROCESSING] Fatal error processing prescription ${prescription._id}:`, error);
    results.errors.push(`Fatal error: ${error.message}`);
    return results;
  }
}

module.exports = {
  calculateDoseRecords,
  extractNumericDuration,
  createNurseTaskFromPrescription,
  processPaymentAndCreateNurseTasks
};
