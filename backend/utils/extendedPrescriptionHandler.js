/**
 * Extended Prescription Handler
 * 
 * This utility ensures that extended prescriptions always create
 * proper nurse tasks and appear in the nurse dashboard.
 */

const NurseTask = require('../models/NurseTask');
const User = require('../models/User');
const Patient = require('../models/Patient');

// Map frequency to simplified flexible time slots
function getFrequencyTimeSlots(frequency) {
  if (!frequency || typeof frequency !== 'string') return ['Anytime'];
  // Use simplified flexible time slots for easier administration
  const { getFlexibleTimeSlots } = require('./frequencyDetection');
  return getFlexibleTimeSlots(frequency);
}

/**
 * Create or update nurse task for extended prescription
 */
async function ensureExtendedPrescriptionNurseTask(prescription, session = null) {
  try {
    // Skip nurse task creation for non-inventory medications (extensions only apply to inventory meds shown to nurse)
    const hasInventoryItem = !!(
      prescription.medicationItem ||
      (Array.isArray(prescription.medications) && prescription.medications[0] && (prescription.medications[0].inventoryItem || prescription.medications[0].inventoryItemId))
    );
    if (!hasInventoryItem) {
      console.log('[ExtendedPrescriptionHandler] Skipping nurse task for non-inventory medication');
      return { success: true, skipped: true, reason: 'non_inventory_medication' };
    }

    console.log(`[ExtendedPrescriptionHandler] Ensuring nurse task for ${prescription.medicationName}`);
    
    // Prefer the patient's assigned nurse if available; otherwise pick any active nurse
    let assignedTo = null;
    let assignedToName = null;
    try {
      const patientDoc = await Patient.findById(prescription.patient).select('assignedNurseId firstName lastName');
      if (patientDoc?.assignedNurseId) {
        const nurseDoc = await User.findById(patientDoc.assignedNurseId).select('firstName lastName role isActive');
        if (nurseDoc && nurseDoc.role === 'nurse' && nurseDoc.isActive) {
          assignedTo = nurseDoc._id;
          assignedToName = `${nurseDoc.firstName || ''} ${nurseDoc.lastName || ''}`.trim();
        }
      }
    } catch {}

    if (!assignedTo) {
      const anyNurse = await User.findOne({ role: 'nurse', isActive: true }).select('firstName lastName');
      if (!anyNurse) {
        console.log('[ExtendedPrescriptionHandler] No active nurse found');
        return { success: false, error: 'No active nurse found' };
      }
      assignedTo = anyNurse._id;
      assignedToName = `${anyNurse.firstName || ''} ${anyNurse.lastName || ''}`.trim();
    }
    
    // Check if a nurse task already exists for this medication/prescription (ignore duration)
    let existingTask = await NurseTask.findOne({
      patientId: prescription.patient,
      taskType: 'MEDICATION',
      $or: [
        { 'medicationDetails.medicationName': { $regex: new RegExp(prescription.medicationName, 'i') } },
        { prescriptionId: prescription._id }
      ]
    });
    
    if (existingTask) {
      console.log(`[ExtendedPrescriptionHandler] Updating existing nurse task for ${prescription.medicationName}`);
      
      // Determine how many NEW days to add precisely
      const existingDoseRecords = Array.isArray(existingTask.medicationDetails?.doseRecords)
        ? existingTask.medicationDetails.doseRecords
        : [];
      const lastExistingDay = existingDoseRecords.length > 0
        ? Math.max(...existingDoseRecords.map(r => Number(r.day) || 0))
        : (Number(existingTask?.medicationDetails?.duration) || 0);

      const parsedTotalDays = (() => {
        const m = String(prescription.duration || '').match(/(\d+)/);
        return m ? parseInt(m[1], 10) : lastExistingDay;
      })();

      // Prefer explicit additionalDays or additionalDoses from extension details
      const explicitAdditionalDays = Number(prescription?.extensionDetails?.additionalDays) || 0;
      const explicitAdditionalDoses = Number(prescription?.extensionDetails?.additionalDoses) || 0;
      const computedAdditional = Math.max(0, parsedTotalDays - lastExistingDay);
      const daysToAdd = Math.max(explicitAdditionalDays, computedAdditional);

      const freqSlots = getFrequencyTimeSlots(prescription.frequency);
      const key = (d, s) => `${d}::${String(s).toLowerCase()}`;
      const existingKeys = new Set(existingDoseRecords.map(r => key(Number(r.day) || 0, r.timeSlot)));
      const doseRecords = existingDoseRecords.slice();

      if (explicitAdditionalDoses > 0 && daysToAdd === 0) {
        // Add exactly N doses sequentially continuing from last day/slot
        const linearOrder = ['06:00','08:00','09:00','12:00','14:00','16:00','18:00','20:00','21:00','00:00'];
        const indexOfSlot = (s) => linearOrder.indexOf(String(s).toLowerCase());
        let lastDay = lastExistingDay;
        let lastSlotIdx = -1;
        if (doseRecords.length > 0) {
          const last = doseRecords.reduce((a,b)=> (a.day> b.day || (a.day===b.day && indexOfSlot(a.timeSlot)>=indexOfSlot(b.timeSlot)))? a:b);
          lastDay = last.day;
          lastSlotIdx = Math.max(0, indexOfSlot(last.timeSlot));
        } else {
          // No existing records: treat last slot as the final slot of the last day
          lastSlotIdx = Math.max(0, freqSlots.length - 1);
        }
        for (let n=0; n<explicitAdditionalDoses; n++) {
          // advance slot/day
          let nextIdx = (lastSlotIdx + 1) % Math.max(1, freqSlots.length);
          let nextDay = lastDay + (nextIdx <= lastSlotIdx ? 1 : 0);
          const slot = (freqSlots[nextIdx] || 'morning');
          const k = key(nextDay, slot);
          if (!existingKeys.has(k)) {
            doseRecords.push({ day: nextDay, timeSlot: slot, administered: false, administeredAt: null, administeredBy: null, notes: '', period: 'extension1' });
            existingKeys.add(k);
          }
          lastDay = nextDay;
          lastSlotIdx = nextIdx;
        }
        // keep duration unchanged for dose-only extension
        existingTask.medicationDetails.duration = parsedTotalDays;
      } else {
        for (let offset = 1; offset <= daysToAdd; offset++) {
          const day = lastExistingDay + offset;
          for (const slot of freqSlots) {
            const k = key(day, slot);
            if (existingKeys.has(k)) continue; // avoid duplicates
            doseRecords.push({
              day,
              timeSlot: slot,
              administered: false,
              administeredAt: null,
              administeredBy: null,
              notes: '',
              period: 'extension1'
            });
            existingKeys.add(k);
          }
        }
        existingTask.medicationDetails.duration = parsedTotalDays;
      }

      existingTask.assignedTo = assignedTo;
      existingTask.assignedToName = assignedToName;
      existingTask.status = 'PENDING';
      existingTask.dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      existingTask.updatedAt = new Date();
      existingTask.medicationDetails = existingTask.medicationDetails || {};
      // Set duration to match total days represented by dose records if frequency is once daily,
      // otherwise keep total day count from prescription
      existingTask.medicationDetails.doseRecords = doseRecords;
      
      if (session) {
        await existingTask.save({ session });
      } else {
        await existingTask.save();
      }
      
      return { success: true, task: existingTask, action: 'updated' };
    } else {
      console.log(`[ExtendedPrescriptionHandler] Creating new nurse task for ${prescription.medicationName}`);
      
      // Create new nurse task (full total duration)
      const duration = (() => {
        const m = String(prescription.duration || '').match(/(\d+)/);
        return m ? parseInt(m[1], 10) : (prescription.extensionDetails?.additionalDays || 1);
      })();
      
      const doseRecords = [];
      const freqSlots = getFrequencyTimeSlots(prescription.frequency);
      for (let day = 1; day <= duration; day++) {
        for (const slot of freqSlots) {
          doseRecords.push({
            day,
            timeSlot: slot,
            administered: false,
            administeredAt: null,
            administeredBy: null,
            notes: '',
            period: 'active'
          });
        }
      }
      
      const newNurseTask = new NurseTask({
        patientId: prescription.patient,
        patientName: prescription.patientName || 'Unknown Patient',
        taskType: 'MEDICATION',
        status: 'PENDING',
        priority: 'MEDIUM',
        assignedTo,
        assignedToName,
        assignedBy: prescription.doctor,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        prescriptionId: prescription._id,
        medicationDetails: {
          medicationName: prescription.medicationName,
          dosage: prescription.dosage,
          frequency: prescription.frequency,
          duration: duration,
          route: prescription.route || 'Oral',
          instructions: prescription.instructions || '',
          doseRecords: doseRecords
        },
        description: `Administer extended ${prescription.medicationName} ${prescription.dosage} ${prescription.frequency} for ${duration} days`,
        notes: `Extended prescription created on ${prescription.createdAt || new Date()}`
      });
      
      if (session) {
        await newNurseTask.save({ session });
      } else {
        await newNurseTask.save();
      }
      
      return { success: true, task: newNurseTask, action: 'created' };
    }
  } catch (error) {
    console.error('[ExtendedPrescriptionHandler] Error ensuring nurse task:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Fix all existing extended prescriptions that don't have nurse tasks
 */
async function fixAllExtendedPrescriptions() {
  try {
    console.log('[ExtendedPrescriptionHandler] Fixing all extended prescriptions...');
    
    const Prescription = require('../models/Prescription');
    
    // Find all extended prescriptions
    const extendedPrescriptions = await Prescription.find({
      status: 'Extended'
    }).populate('patient', 'firstName lastName');
    
    console.log(`[ExtendedPrescriptionHandler] Found ${extendedPrescriptions.length} extended prescriptions`);
    
    let fixedCount = 0;
    let errorCount = 0;
    
    for (const prescription of extendedPrescriptions) {
      try {
        const result = await ensureExtendedPrescriptionNurseTask(prescription);
        if (result.success) {
          fixedCount++;
          console.log(`[ExtendedPrescriptionHandler] ✅ Fixed ${prescription.patient.firstName}'s ${prescription.medicationName}`);
        } else {
          errorCount++;
          console.log(`[ExtendedPrescriptionHandler] ❌ Failed to fix ${prescription.patient.firstName}'s ${prescription.medicationName}: ${result.error}`);
        }
      } catch (error) {
        errorCount++;
        console.log(`[ExtendedPrescriptionHandler] ❌ Error fixing ${prescription.patient.firstName}'s ${prescription.medicationName}: ${error.message}`);
      }
    }
    
    console.log(`[ExtendedPrescriptionHandler] Summary: ${fixedCount} fixed, ${errorCount} errors`);
    return { success: true, fixedCount, errorCount };
  } catch (error) {
    console.error('[ExtendedPrescriptionHandler] Error fixing extended prescriptions:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  ensureExtendedPrescriptionNurseTask,
  fixAllExtendedPrescriptions
};
