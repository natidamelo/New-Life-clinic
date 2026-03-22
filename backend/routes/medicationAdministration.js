const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const asyncHandler = require('../middleware/async');
const NurseTask = require('../models/NurseTask');
const Service = require('../models/Service');
const InventoryItem = require('../models/InventoryItem');
const atomicDeduction = require('../services/atomicInventoryDeduction');
const InventoryTransaction = require('../models/InventoryTransaction');
const { checkDoseAvailability, getCurrentEthiopianTime, formatEthiopianTime } = require('../utils/ethiopianTime');

// In-memory lock to prevent concurrent dose administrations
const administrationLocks = new Map();

// Helper function to create a unique lock key
const createLockKey = (taskId, day, timeSlot) => `${taskId}-${day}-${timeSlot}`;

// Helper function to standardize time slot format
const standardizeTimeSlot = (timeSlot) => {
  // Validate input
  if (!timeSlot || typeof timeSlot !== 'string') {
    console.error('❌ [TIME SLOT] Invalid timeSlot:', timeSlot);
    throw new Error('Invalid time slot format');
  }
  
  // Handle text-based time slots (Morning, Evening, etc.)
  const textTimeSlots = {
    'morning': '06:00',
    'afternoon': '12:00', 
    'evening': '18:00',
    'night': '22:00',
    'noon': '12:00',
    'midday': '12:00',
    'anytime': 'Anytime' // CRITICAL: Must match database format with capital A
  };
  
  const lowerTimeSlot = timeSlot.toLowerCase().trim();
  
  // Check if it's a text-based time slot
  if (textTimeSlots[lowerTimeSlot]) {
    console.log(`🔄 [TIME SLOT] Converting text time slot "${timeSlot}" to "${textTimeSlots[lowerTimeSlot]}"`);
    return textTimeSlots[lowerTimeSlot];
  }
  
  // Handle HH:MM format
  const parts = timeSlot.split(':');
  if (parts.length !== 2) {
    console.error('❌ [TIME SLOT] Invalid timeSlot format:', timeSlot);
    throw new Error('Time slot must be in HH:MM format or text format (Morning, Evening, etc.)');
  }
  
  const [h, m] = parts.map(s => s.trim());
  
  // Validate hours and minutes
  if (!h || !m || isNaN(parseInt(h)) || isNaN(parseInt(m))) {
    console.error('❌ [TIME SLOT] Invalid hours or minutes:', { h, m, timeSlot });
    throw new Error('Invalid hours or minutes in time slot');
  }
  
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
};

// GET /api/medication-administration/test-auth
// Test endpoint to verify authorization is working
router.get(
  '/test-auth',
  auth,
  authorize('nurse', 'admin', 'doctor'),
  asyncHandler(async (req, res) => {
    console.log(`🔐 [TEST AUTH] Route hit`);
    console.log(`🔐 [TEST AUTH] User info:`, req.user);
    console.log(`🔐 [TEST AUTH] User role:`, req.user?.role);
    console.log(`🔐 [TEST AUTH] User ID:`, req.user?.id || req.user?._id);
    
    res.json({
      success: true,
      message: 'Authorization test successful',
      user: {
        id: req.user?.id || req.user?._id,
        role: req.user?.role,
        email: req.user?.email
      }
    });
  })
);

// POST /api/medication-administration/administer-dose
// Clean, single-purpose endpoint for administering medication doses
router.post(
  '/administer-dose',
  auth,
  authorize('nurse', 'admin', 'doctor'), // Allow nurses, admins, and doctors to administer medications
  asyncHandler(async (req, res) => {
    console.log(`🚀 [DOSE ADMIN] Route hit with body:`, req.body);
    console.log(`🔐 [DOSE ADMIN] User info:`, req.user);
    console.log(`🔐 [DOSE ADMIN] User role:`, req.user?.role);
    console.log(`🔐 [DOSE ADMIN] User ID:`, req.user?.id || req.user?._id);
    console.log(`📋 [DOSE ADMIN] Headers:`, req.headers);
    console.log(`🔐 [DOSE ADMIN] Authorization header:`, req.headers.authorization);
    console.log(`🔐 [DOSE ADMIN] User role check:`, req.user?.role);
    console.log(`🔐 [DOSE ADMIN] Allowed roles: ['nurse', 'admin', 'doctor']`);
    console.log(`🔐 [DOSE ADMIN] Role match:`, ['nurse', 'admin', 'doctor'].includes(req.user?.role));
    const { taskId, day, timeSlot, notes = '' } = req.body;
    
    // Debug: Log the received values
    console.log('🔍 [DOSE ADMIN] Received values:', {
      taskId: taskId,
      day: day,
      timeSlot: timeSlot,
      notes: notes,
      taskIdType: typeof taskId,
      dayType: typeof day,
      timeSlotType: typeof timeSlot
    });
    
    // Input validation
    if (!taskId || !day || !timeSlot) {
      console.error('❌ [DOSE ADMIN] Missing required fields:', {
        taskId: taskId,
        day: day,
        timeSlot: timeSlot,
        taskIdPresent: !!taskId,
        dayPresent: !!day,
        timeSlotPresent: !!timeSlot
      });
      return res.status(400).json({
        success: false,
        error: 'MISSING_REQUIRED_FIELDS',
        message: 'Task ID, day, and time slot are required'
      });
    }

    // Standardize time slot format
    let standardizedTimeSlot;
    try {
      standardizedTimeSlot = standardizeTimeSlot(timeSlot);
    } catch (error) {
      console.error('❌ [DOSE ADMIN] Time slot validation failed:', error.message);
      return res.status(400).json({
        success: false,
        error: 'INVALID_TIME_SLOT',
        message: `Invalid time slot format: ${error.message}. Expected format: HH:MM (e.g., 09:00) or text (e.g., Morning, Evening)`
      });
    }
    
    const lockKey = createLockKey(taskId, day, standardizedTimeSlot);

    // Check if this dose is already being processed
    if (administrationLocks.has(lockKey)) {
      return res.status(409).json({
        success: false,
        error: 'DOSE_BEING_PROCESSED',
        message: 'This dose is currently being processed. Please wait.'
      });
    }

    // Acquire lock
    administrationLocks.set(lockKey, {
      userId: req.user._id || req.user.id,
      timestamp: new Date(),
      taskId,
      day,
      timeSlot: standardizedTimeSlot
    });

    try {
      console.log(`🔒 [DOSE ADMIN] Lock acquired for ${lockKey}`);

      // Find the nurse task
      const task = await NurseTask.findById(taskId);
      if (!task) {
        return res.status(404).json({
          success: false,
          error: 'TASK_NOT_FOUND',
          message: 'Nurse task not found'
        });
      }

      console.log(`📋 [DOSE ADMIN] Task found: ${task.description || 'No description'}`);
      console.log(`📋 [DOSE ADMIN] Task type: ${task.taskType}, Status: ${task.status}`);

      // Check if this is a medication or injection procedure task
      const isMedicationTask = task.taskType === 'MEDICATION';
      const isInjectionTask = task.taskType === 'PROCEDURE' && 
                             (task.description?.toLowerCase().includes('injection') || 
                              task.serviceName?.toLowerCase().includes('injection') ||
                              task.metadata?.serviceCategory === 'injection');
      
      if (!isMedicationTask && !isInjectionTask) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_TASK_TYPE',
          message: 'This endpoint only handles medication and injection tasks'
        });
      }
      
      console.log(`📋 [DOSE ADMIN] Task validation: isMedication=${isMedicationTask}, isInjection=${isInjectionTask}`);

      // ATOMIC LOCK: Try to mark the dose as administered atomically to prevent race conditions
      // This prevents multiple simultaneous calls from deducting inventory multiple times
      console.log(`🔒 [DOSE ADMIN] Attempting atomic dose marking...`);
      console.log(`🔍 [ATOMIC] Query parameters: taskId=${taskId}, day=${day}, timeSlot=${standardizedTimeSlot}`);
      
      // CRITICAL: First, let's check what's actually in the database RIGHT NOW
      const preCheckTask = await NurseTask.findById(taskId).lean();
      console.log(`📊 [PRE-CHECK] Task found: ${!!preCheckTask}`);
      if (preCheckTask && preCheckTask.medicationDetails) {
        console.log(`📊 [PRE-CHECK] Total dose records: ${preCheckTask.medicationDetails.doseRecords?.length || 0}`);
        
        // Log ALL dose records to see what's actually in the database
        console.log(`📊 [PRE-CHECK] ALL DOSE RECORDS:`);
        preCheckTask.medicationDetails.doseRecords?.forEach((record, index) => {
          console.log(`  [${index}] Day: ${record.day} (type: ${typeof record.day}), TimeSlot: "${record.timeSlot}" (type: ${typeof record.timeSlot}), Administered: ${record.administered}`);
        });
        
        console.log(`🔍 [PRE-CHECK] Searching for: Day ${day} (type: ${typeof day}), TimeSlot "${standardizedTimeSlot}"`);
        
        const targetDose = preCheckTask.medicationDetails.doseRecords?.find(
          r => r.day === day && r.timeSlot === standardizedTimeSlot
        );
        console.log(`📊 [PRE-CHECK] Target dose found: ${!!targetDose}`);
        if (targetDose) {
          console.log(`📊 [PRE-CHECK] Target dose administered status: ${targetDose.administered}`);
          console.log(`📊 [PRE-CHECK] Target dose full object:`, JSON.stringify(targetDose, null, 2));
        } else {
          console.log(`❌ [PRE-CHECK] NO MATCH FOUND! The dose record exists but day/timeSlot don't match.`);
        }
      }
      
      let atomicUpdate;
      if (isMedicationTask) {
        // For medication tasks, atomically set the specific dose record to administered
        atomicUpdate = await NurseTask.findOneAndUpdate(
          {
            _id: taskId,
            'medicationDetails.doseRecords': {
              $elemMatch: {
                day: day,
                timeSlot: standardizedTimeSlot,
                $or: [
                  { administered: { $ne: true } },
                  { administered: { $exists: false } }
                ]
              }
            }
          },
          {
            $set: {
              'medicationDetails.doseRecords.$.administered': true,
              'medicationDetails.doseRecords.$.administeredAt': new Date(),
              'medicationDetails.doseRecords.$.administeredBy': `${req.user.firstName || 'Unknown'} ${req.user.lastName || 'User'}`,
              'medicationDetails.doseRecords.$.processed': true,
              'medicationDetails.doseRecords.$.processedAt': new Date(),
              'medicationDetails.doseRecords.$.processedBy': req.user._id || req.user.id
            }
          },
          { new: true }
        );
        
        console.log(`🔍 [ATOMIC] Update result: ${atomicUpdate ? 'SUCCESS' : 'FAILED (null returned)'}`);
      } else if (isInjectionTask) {
        // For injection tasks, atomically set the task as completed
        atomicUpdate = await NurseTask.findOneAndUpdate(
          {
            _id: taskId,
            status: { $ne: 'COMPLETED' }
          },
          {
            $set: {
              status: 'COMPLETED',
              completedDate: new Date(),
              completedBy: req.user._id || req.user.id,
              completionNotes: notes || 'Injection administered successfully'
            }
          },
          { new: true }
        );
      }

      // If atomicUpdate is null, another process already administered this dose
      if (!atomicUpdate) {
        console.log(`⚠️  [DOSE ADMIN] ⏭️  SKIPPED - Dose already administered for Day ${day}, ${standardizedTimeSlot} (prevented race condition)`);
        return res.status(400).json({
          success: false,
          error: 'DOSE_ALREADY_ADMINISTERED',
          message: 'This dose has already been administered (race condition prevented)'
        });
      }

      console.log(`✅ [DOSE ADMIN] Atomic lock acquired - dose marked as administered`);
      
      // Update the task variable with the atomic update result
      // (atomicUpdate already contains the updated task)
      Object.assign(task, atomicUpdate.toObject());

      // NEW: Check prescription dependencies before allowing administration
      if (task.prescriptionDependencies?.dependsOn && task.prescriptionDependencies.dependsOn.length > 0) {
        console.log(`🔗 [DOSE ADMIN] Checking prescription dependencies for task ${task._id}`);
        
        for (const dependency of task.prescriptionDependencies.dependsOn) {
          try {
            // Find the dependent prescription's nurse task
            const dependentTask = await NurseTask.findOne({
              prescriptionId: dependency.prescriptionId,
              taskType: 'MEDICATION'
            });
            
            if (!dependentTask) {
              console.log(`⚠️ [DOSE ADMIN] Dependent prescription task not found for ${dependency.medicationName}`);
              continue;
            }
            
            // Check completion status based on requirement
            const dependentDoses = dependentTask.medicationDetails?.doseRecords || [];
            const totalDependentDoses = dependentDoses.length;
            const completedDependentDoses = dependentDoses.filter(d => d.administered).length;
            
            let isDependencyMet = false;
            
            if (dependency.requiredCompletion === 'fully_completed') {
              isDependencyMet = totalDependentDoses > 0 && completedDependentDoses === totalDependentDoses;
            } else if (dependency.requiredCompletion === 'partially_completed') {
              isDependencyMet = completedDependentDoses > 0;
            }
            
            if (!isDependencyMet) {
              const message = dependency.requiredCompletion === 'fully_completed' 
                ? `Cannot administer ${task.medicationDetails?.medicationName || 'medication'} until ${dependency.medicationName} is fully completed (${completedDependentDoses}/${totalDependentDoses} doses)`
                : `Cannot administer ${task.medicationDetails?.medicationName || 'medication'} until ${dependency.medicationName} has at least one completed dose`;
              
              console.log(`🚫 [DOSE ADMIN] Prescription dependency not met: ${message}`);
              
              // Update the task's blocked status
              task.prescriptionDependencies.isBlocked = true;
              task.prescriptionDependencies.blockReason = message;
              await task.save();
              
              return res.status(403).json({
                success: false,
                error: 'PRESCRIPTION_DEPENDENCY_NOT_MET',
                message: message,
                dependency: {
                  medicationName: dependency.medicationName,
                  requiredCompletion: dependency.requiredCompletion,
                  currentProgress: `${completedDependentDoses}/${totalDependentDoses}`,
                  isFullyCompleted: completedDependentDoses === totalDependentDoses
                }
              });
            }
          } catch (error) {
            console.error(`❌ [DOSE ADMIN] Error checking dependency ${dependency.medicationName}:`, error);
            // Continue checking other dependencies
          }
        }
        
        // If we get here, all dependencies are met
        console.log(`✅ [DOSE ADMIN] All prescription dependencies met for task ${task._id}`);
        
        // Clear blocked status if it was previously set
        if (task.prescriptionDependencies.isBlocked) {
          task.prescriptionDependencies.isBlocked = false;
          task.prescriptionDependencies.blockReason = '';
          await task.save();
        }
      }

      // Check Ethiopian time-based availability for the dose
      const medicationStartDate = task.medicationDetails?.startDate || task.createdAt;
      const availability = checkDoseAvailability(standardizedTimeSlot, medicationStartDate, day);
      
      console.log(`🕐 [DOSE ADMIN] Ethiopian time availability check:`, {
        timeSlot: standardizedTimeSlot,
        day: day,
        canAdminister: availability.canAdminister,
        isRightDay: availability.isRightDay,
        isRightTime: availability.isRightTime,
        isOverdue: availability.isOverdue,
        currentTime: availability.currentEthiopianTime,
        nextAvailable: availability.nextAvailable ? formatEthiopianTime(availability.nextAvailable) : null
      });

      // Prevent administration if it's not the right time (unless overdue)
      if (!availability.canAdminister && !availability.isOverdue) {
        const message = !availability.isRightDay 
          ? `This dose is scheduled for ${availability.targetDate}. Current Ethiopian time: ${availability.currentEthiopianTime}`
          : `This ${standardizedTimeSlot} dose is not available yet. Current Ethiopian time: ${availability.currentEthiopianTime}. Next available: ${formatEthiopianTime(availability.nextAvailable)}`;
        
        return res.status(400).json({
          success: false,
          error: 'DOSE_NOT_AVAILABLE_YET',
          message: message,
          availability: availability
        });
      }

      // Handle medication tasks vs injection tasks differently
      let doseRecord = null;
      
      if (isMedicationTask) {
        // Initialize dose records if they don't exist for medication tasks
        if (!task.medicationDetails) {
          task.medicationDetails = {};
        }
        if (!task.medicationDetails.doseRecords) {
          task.medicationDetails.doseRecords = [];
        }

        // Ensure required medicationDetails fields are present for validation
        if (!task.medicationDetails.medicationName) {
          // Fallback to task description if medicationName is not set
          task.medicationDetails.medicationName = task.description || 'Unknown Medication';
          console.warn(`⚠️ [DOSE ADMIN] medicationDetails.medicationName was missing, using task.description: ${task.medicationDetails.medicationName}`);
        }
        if (!task.medicationDetails.dosage) {
          // Provide a default or derive from task if possible
          task.medicationDetails.dosage = 'As prescribed'; // Default placeholder
          console.warn(`⚠️ [DOSE ADMIN] medicationDetails.dosage was missing, setting to default: ${task.medicationDetails.dosage}`);
        }
        if (!task.medicationDetails.frequency) {
          // Provide a default or derive from task if possible
          task.medicationDetails.frequency = 'Once daily'; // Default placeholder
          console.warn(`⚠️ [DOSE ADMIN] medicationDetails.frequency was missing, setting to default: ${task.medicationDetails.frequency}`);
        }

        // Find or create the dose record for medication tasks
        // Use case-insensitive matching for time slots to handle 'Anytime' vs 'anytime'
        doseRecord = task.medicationDetails.doseRecords.find(
          record => record.day === day && record.timeSlot?.toLowerCase() === standardizedTimeSlot?.toLowerCase()
        );

        if (!doseRecord) {
          doseRecord = {
            day: day,
            timeSlot: standardizedTimeSlot,
            administered: false,
            missed: false,
            overdue: false
          };
          task.medicationDetails.doseRecords.push(doseRecord);
        }
      } else if (isInjectionTask) {
        // For injection tasks, create a simple dose record structure
        doseRecord = {
          day: day,
          timeSlot: standardizedTimeSlot,
          administered: false,
          missed: false,
          overdue: false
        };
        
        // Initialize medicationDetails for injection tasks if not present
        if (!task.medicationDetails) {
          task.medicationDetails = {
            medicationName: task.serviceName || task.description || 'Unknown Injection',
            dosage: '1 injection',
            frequency: 'Single dose',
            route: 'Intramuscular',
            instructions: 'Administer injection as prescribed',
            doseRecords: [doseRecord]
          };
        } else {
          if (!task.medicationDetails.doseRecords) {
            task.medicationDetails.doseRecords = [];
          }
          task.medicationDetails.doseRecords.push(doseRecord);
        }
      }

      // ---------------- Payment Authorization Enforcement ----------------
      if (task.paymentAuthorization && task.paymentAuthorization.paymentStatus !== 'fully_paid') {
        const paymentAuth = task.paymentAuthorization;

        // Calculate cumulative doses that would be administered including this one
        const administeredCount = (task.medicationDetails?.doseRecords || []).filter(r => r.administered).length;
        const cumulativeDoseNumber = administeredCount + 1; // this dose

        // NEW LOGIC: Enable administration when at least one dose is paid for
        if (typeof paymentAuth.authorizedDoses === 'number') {
          const authorized = paymentAuth.authorizedDoses || 0;
          if (authorized < 1) {
            console.log(`🚫 [DOSE ADMIN] Payment required - no doses authorized yet. authorizedDoses: ${authorized}`);
            administrationLocks.delete(lockKey);
            return res.status(403).json({
              success: false,
              error: 'PAYMENT_REQUIRED',
              message: `Payment required - no doses authorized yet. Please collect payment before administering medication.`
            });
          }
          // If at least one dose is authorized, allow administration of any dose
          console.log(`✅ [DOSE ADMIN] Payment authorized - at least ${authorized} dose(s) paid for`);
        } else if (typeof paymentAuth.paidDays === 'number' && paymentAuth.paidDays < 1) {
          console.log(`🚫 [DOSE ADMIN] Payment required for Day ${day}. paidDays: ${paymentAuth.paidDays}`);
          administrationLocks.delete(lockKey);
          return res.status(403).json({
            success: false,
            error: 'PAYMENT_REQUIRED',
            message: `Payment required - no days paid for yet. Please collect payment before administering medication.`
          });
        }
      }

      // SIMPLIFIED: Use direct inventory lookup by medication name instead of service-linked inventory
      // This eliminates complexity and potential double deduction issues
      let inventoryDeducted = false;
      let inventoryDetails = null;

      // Get medication name from task and clean it up
      let medicationName = task.medicationDetails?.medicationName || task.description || 'Unknown Medication';

      // Clean up medication name for better matching and handle common variations
      const originalMedicationName = medicationName;

      // Remove "Administer" prefix if present
      medicationName = medicationName.replace(/^administer\s+/i, '').trim();

      if (medicationName.toLowerCase().includes('depo injection')) {
        medicationName = 'Depo';  // Use exact case "Depo" to match inventory
      } else if (medicationName.toLowerCase().includes('injection')) {
        // Extract the medication name before "injection"
        const match = medicationName.match(/^(.+?)\s+injection/i);
        if (match) {
          medicationName = match[1].trim();  // Keep original case for first word
        }
      }

      // Handle specific item name variations and typos for ALL inventory categories
      const itemNameVariations = {
        // IV Fluids - Comprehensive list
        'normal saline': ['normal saline', 'normal saline (0.9% nacl)', 'normal saline (0.9% nacl)', '0.9% normal saline', 'nacl 0.9%', 'saline solution', 'ns', 'normal salin', '0.9% nacl'],
        'saline': ['normal saline', 'saline solution', '0.9% saline', 'nacl'],
        'ns': ['normal saline', 'saline solution', '0.9% nacl'],
        'normal salin': ['normal saline', 'saline solution'],
        'ringer lactate': ['ringer lactate', 'ringer\'s lactate', 'hartmann solution', 'hartmann\'s solution', 'rl', 'lactated ringer', 'lactated ringers'],
        'rl': ['ringer lactate', 'ringer\'s lactate', 'hartmann solution'],
        'hartmann': ['ringer lactate', 'hartmann solution', 'hartmann\'s solution'],
        'dextrose': ['dextrose 5%', 'dextrose 10%', 'd5w', 'd10w', '5% dextrose', '10% dextrose', 'dextrose solution'],
        'dextrose 5%': ['dextrose 5%', 'd5w', '5% dextrose', 'dextrose 5% (d5w)'],
        'd5w': ['dextrose 5%', 'd5w', '5% dextrose'],
        'dextrose 10%': ['dextrose 10%', 'd10w', '10% dextrose', 'dextrose 10% (d10w)'],
        'd10w': ['dextrose 10%', 'd10w', '10% dextrose'],
        'dextrose 40%': ['dextrose 40%', 'd40w', '40% dextrose'],
        'dextrose 50%': ['dextrose 50%', 'd50w', '50% dextrose', 'dextrose 50% (d50w)'],
        'd50w': ['dextrose 50%', 'd50w', '50% dextrose'],
        'half normal saline': ['half normal saline', '0.45% nacl', '0.45% saline', 'half saline'],
        '3% saline': ['3% saline', 'hypertonic saline', '3% nacl'],
        'ringer lactate': ['ringer lactate', 'ringer\'s lactate', 'hartmann\'s solution', 'lactated ringer', 'rl', 'ringer lactate (hartmann\'s solution)'],
        'ringer\'s lactate': ['ringer lactate', 'ringer\'s lactate', 'hartmann\'s solution', 'lactated ringer', 'rl'],
        'hartmann\'s solution': ['ringer lactate', 'ringer\'s lactate', 'hartmann\'s solution', 'lactated ringer', 'rl'],
        'lactated ringer': ['ringer lactate', 'ringer\'s lactate', 'hartmann\'s solution', 'lactated ringer', 'rl'],
        'rl': ['ringer lactate', 'ringer\'s lactate', 'hartmann\'s solution', 'lactated ringer', 'rl'],
        'ns': ['normal saline', '0.9% nacl', '0.9% saline', 'ns', 'normal saline (0.9% nacl)'],
        '5% dextrose in normal saline': ['5% dextrose in normal saline', 'd5ns', 'dextrose 5% in normal saline'],
        'd5ns': ['5% dextrose in normal saline', 'd5ns'],
        'sodium bicarbonate': ['sodium bicarbonate', 'sodium bicarbonate 8.4%', 'nahco3', 'bicarbonate'],
        'potassium chloride': ['potassium chloride', 'kcl', 'potassium'],
        'calcium gluconate': ['calcium gluconate', 'calcium', 'ca gluconate'],
        'magnesium sulfate': ['magnesium sulfate', 'mgso4', 'magnesium'],
        'mannitol': ['mannitol', 'mannitol 20%', '20% mannitol'],
        'albumin': ['albumin', 'albumin 5%', 'albumin 25%', '5% albumin', '25% albumin'],

        // Common Medications
        'paracetamol': ['paracetamol', 'acetaminophen', 'tylenol', 'panadol'],
        'ibuprofen': ['ibuprofen', 'brufen', 'advil'],
        'amoxicillin': ['amoxicillin', 'amoxil'],
        'ceftriaxone': ['ceftriaxone', 'rocephin'],
        'metronidazole': ['metronidazole', 'flagyl'],
        'ciprofloxacin': ['ciprofloxacin', 'cipro'],
        'azithromycin': ['azithromycin', 'zithromax'],

        // Lab tests
        'glucose': ['glucose', 'glucose (fasting)', 'fasting glucose', 'fbs', 'fasting blood sugar', 'fasting blood glucose'],
        'hemoglobin': ['hemoglobin', 'hgb', 'hb', 'cbc', 'complete blood count'],
        'cbc': ['cbc', 'complete blood count', 'hemoglobin', 'hgb'],
        'urinalysis': ['urinalysis', 'urine analysis', 'complete urinalysis', 'urine test'],
        'urine': ['urinalysis', 'urine analysis', 'urine test'],

        // Services
        'consultation': ['consultation', 'doctor consultation', 'medical consultation'],
        'injection': ['injection', 'injection service', 'injection administration'],
        'blood pressure': ['blood pressure', 'bp check', 'vital signs'],
        'vital signs': ['vital signs', 'blood pressure', 'bp check'],
      };

      // Check if we have variations for this item name
      const variations = itemNameVariations[medicationName.toLowerCase()] || [medicationName];
      
      // Always add case variations to handle both "Depo" and "depo"
      const caseVariations = [
        medicationName, // as is
        medicationName.toLowerCase(), // all lowercase
        medicationName.charAt(0).toUpperCase() + medicationName.slice(1).toLowerCase(), // Title Case
        medicationName.toUpperCase() // ALL UPPERCASE
      ];
      
      // Combine and remove duplicates
      const allVariations = [...new Set([...variations, ...caseVariations])];

      console.log(`💊 [DOSE ADMIN] Medication name processing:`, {
        original: originalMedicationName,
        cleaned: medicationName,
        variations: allVariations
      });
      
      console.log(`💊 [DOSE ADMIN] Looking for medication in inventory: "${medicationName}"`);
      console.log(`📋 [DOSE ADMIN] Task details:`, {
        originalMedicationName: task.medicationDetails?.medicationName,
        originalDescription: task.description,
        cleanedMedicationName: medicationName,
        taskType: task.taskType,
        patientName: task.patientName
      });

      // Find item in inventory across ALL categories (case-insensitive and more flexible)
      console.log(`💊 [DOSE ADMIN] Looking for item in inventory: "${medicationName}"`);
      console.log(`📋 [DOSE ADMIN] Task type: ${task.taskType}, isInjection: ${isInjectionTask}`);

      // Get all inventory items for debugging - show all categories
      const allInventoryItems = await InventoryItem.find({}).select('name quantity category').sort({ category: 1, name: 1 });
      console.log(`📦 [DOSE ADMIN] All inventory items by category:`);
      const itemsByCategory = {};
      allInventoryItems.forEach(item => {
        if (!itemsByCategory[item.category]) itemsByCategory[item.category] = [];
        itemsByCategory[item.category].push(`${item.name} (${item.quantity})`);
      });
      Object.keys(itemsByCategory).forEach(category => {
        console.log(`  ${category}: [${itemsByCategory[category].join(', ')}]`);
      });

      // Try all variations of the item name across ALL categories
      // IMPROVED: Search without category restriction to support any category name (medication, IV Fluids, etc.)
      let medicationItem = null;

      for (const variation of allVariations) {
        console.log(`🔍 [DOSE ADMIN] Trying variation: "${variation}"`);

        // Create search terms for this variation
        const searchTerms = [
          new RegExp(`^${variation}$`, 'i'),  // Exact match
          new RegExp(variation, 'i'),         // Contains match
          new RegExp(variation.replace(/\s+/g, '\\s*'), 'i'), // Flexible spacing
        ];

        // For injection tasks, prioritize medication category first for dual inventory
        if (isInjectionTask) {
          // First try medication category to enable dual deduction
          for (const searchTerm of searchTerms) {
            medicationItem = await InventoryItem.findOne({
              name: searchTerm,
              category: 'medication',
              isActive: true
            });
            if (medicationItem) {
              console.log(`✅ [DOSE ADMIN] Found injection in medication category: ${medicationItem.name}`);
              break;
            }
          }
        }

        // If not found yet, search across ALL categories without restriction
        // This handles any category name: medication, IV Fluids, supplies, etc.
        if (!medicationItem) {
          for (const searchTerm of searchTerms) {
            medicationItem = await InventoryItem.findOne({
              name: searchTerm,
              quantity: { $gt: 0 },
              isActive: { $ne: false } // Exclude inactive items
            });
            if (medicationItem) {
              console.log(`✅ [DOSE ADMIN] Found in ${medicationItem.category} category: ${medicationItem.name}`);
              break;
            }
          }
        }

        if (medicationItem) break; // Found a match, exit the loop
      }

      // Log the search results
      if (medicationItem) {
        console.log(`✅ [DOSE ADMIN] Found medication in inventory: ${medicationItem.name} (Qty: ${medicationItem.quantity}, Category: ${medicationItem.category})`);
      } else {
        console.log(`❌ [DOSE ADMIN] Medication "${medicationName}" not found in inventory`);
        console.log(`🔍 [DOSE ADMIN] Tried variations:`, variations);
        console.log(`⚠️ [DOSE ADMIN] IMPORTANT: Add "${medicationName}" to inventory via Stock Management to enable automatic deduction`);
        console.log(`💡 [DOSE ADMIN] Tip: Use full medication name with concentration (e.g., "Dextrose 5% (D5W)" or "Normal Saline (0.9% NaCl)")`);
      }

      // NEW: Check if an inventory transaction already exists for this specific dose
      let existingTransaction = null;
      if (medicationItem) {
        // Check for existing transactions with more flexible matching
        existingTransaction = await InventoryTransaction.findOne({
          $or: [
            // Exact match
            {
              item: medicationItem._id,
              documentReference: taskId,
              reason: `${medicationName} dose administered - Day ${day}, ${standardizedTimeSlot}`
            },
            // More flexible reason matching
            {
              item: medicationItem._id,
              documentReference: taskId,
              reason: { $regex: new RegExp(`${medicationName}.*Day ${day}.*${standardizedTimeSlot}`, 'i') }
            }
          ],
          status: { $in: ['pending', 'completed'] }
        });
      }

      if (existingTransaction) {
        console.log(`⚠️  [DOSE ADMIN] Existing inventory transaction found, skipping deduction`);
        inventoryDeducted = true;
        inventoryDetails = {
          medicationName: medicationItem.name,
          itemsDeducted: [],
          totalItems: 0,
          warning: 'Inventory already deducted for this dose'
        };
      } else if (medicationItem) {
        console.log(`✅ [DOSE ADMIN] Found medication in inventory: ${medicationItem.name} (Qty: ${medicationItem.quantity})`);
        
        // Check if sufficient stock (all categories except services need stock)
        const requiresStock = medicationItem.category !== 'service';
        if (requiresStock && medicationItem.quantity < 1) {
          return res.status(400).json({
            success: false,
            error: 'INSUFFICIENT_STOCK',
            message: `Insufficient stock for ${medicationItem.name}. Available: ${medicationItem.quantity}, Required: 1`
          });
        }

        // Deduct 1 unit from inventory using atomic operations
        // Use atomic findOneAndUpdate to prevent race conditions
        // For services, don't require stock check; for others, require stock
        const updateCondition = requiresStock
          ? { _id: medicationItem._id, quantity: { $gte: 1 } }
          : { _id: medicationItem._id };

        // RE-ENABLED: Main medication inventory deduction with duplicate prevention
        console.log(`📦 [DEDUCTION] Attempting controlled inventory deduction for ${medicationName}`);
        console.log(`📦 [DEDUCTION] Update condition:`, updateCondition);
        console.log(`📦 [DEDUCTION] Requires stock: ${requiresStock}`);
        
        const updatedItem = await InventoryItem.findOneAndUpdate(
          updateCondition,
          {
            $inc: { quantity: -1 },
            $set: { updatedBy: req.user._id || req.user.id }
          },
          { new: true }
        );

        // Calculate previousQuantity from the update result (updatedItem.quantity + 1)
        // This ensures we have the correct value even if quantity changed between find and update
        const previousQuantity = updatedItem ? updatedItem.quantity + 1 : medicationItem.quantity;
        
        console.log(`📦 [DEDUCTION] Deduction result:`, {
          updatedItem: !!updatedItem,
          previousQuantity,
          newQuantity: updatedItem?.quantity,
          medicationName
        });
        
        // DISABLED: Skip inventory deduction but allow administration to proceed
        if (!updatedItem) {
          console.log(`⚠️ [DOSE ADMIN] Inventory deduction disabled - allowing administration without deduction`);
          console.log(`   Medication: ${medicationName}`);
          console.log(`   Current quantity: ${medicationItem.quantity}`);
        }

        // Check if deduction was successful
        if (!updatedItem && requiresStock) {
          return res.status(400).json({
            success: false,
            error: 'INSUFFICIENT_STOCK',
            message: `Insufficient stock for ${medicationItem.name}. Available: ${medicationItem.quantity}, Required: 1`
          });
        }

        // For services, if quantity goes negative, reset to 0 (services can be unlimited)
        if (medicationItem.category === 'service' && updatedItem && updatedItem.quantity < 0) {
          updatedItem.quantity = 0;
          await updatedItem.save();
          console.log(`⚠️ [DOSE ADMIN] Service quantity went negative, reset to 0: ${medicationItem.name}`);
        }

        // RE-ENABLED: Create inventory transaction record
        console.log(`📝 [TRANSACTION] Creating inventory transaction for ${medicationName}`);
        
        const transactionReason = `${medicationName} ${isInjectionTask ? 'injection' : 'dose'} administered - Day ${day}, ${standardizedTimeSlot}`;

        // Create transaction record
        const inventoryTransaction = new InventoryTransaction({
          item: medicationItem._id,
          transactionType: 'medical-use',
          quantity: -1,
          unitCost: medicationItem.costPrice || 0,
          totalCost: (medicationItem.costPrice || 0),
          previousQuantity: previousQuantity,
          newQuantity: updatedItem ? updatedItem.quantity : medicationItem.quantity,
          reason: transactionReason,
          documentReference: taskId,
          performedBy: new mongoose.Types.ObjectId(req.user._id || req.user.id),
          patient: new mongoose.Types.ObjectId(task.patientId),
          status: 'completed',
          _skipInventoryUpdate: true // ✅ FIX: Skip hook - inventory already updated manually above
        });

        await inventoryTransaction.save();

        // Mark as deducted with actual deduction
        inventoryDeducted = true;
        inventoryDetails = {
          medicationName: medicationItem.name,
          itemsDeducted: [{
            name: medicationItem.name,
            previousQuantity: previousQuantity,
            newQuantity: updatedItem ? updatedItem.quantity : medicationItem.quantity,
            quantityDeducted: 1 // Actual deduction performed
          }],
          totalItems: 1
        };

        console.log(`✅ [DOSE ADMIN] Deducted 1 unit of ${medicationItem.name} (${previousQuantity} → ${updatedItem ? updatedItem.quantity : medicationItem.quantity})`);
        
        // DUAL DEDUCTION DISABLED: Preventing duplicate deductions
        // This entire section is disabled to prevent duplicate inventory deductions
        // Only the main service deduction system will handle inventory
        console.log(`ℹ️ [DOSE ADMIN] Service inventory sync disabled to prevent duplicates`);
      } else {
        console.log(`⚠️  [DOSE ADMIN] Medication "${medicationName}" not found in inventory or out of stock - allowing administration without deduction`);
        
        // Allow administration but record that no inventory was deducted
        inventoryDetails = {
          medicationName: medicationName,
          itemsDeducted: [],
          totalItems: 0,
          warning: `Medication "${medicationName}" not found in inventory system`
        };
      }

      // Update additional dose record fields (notes and inventory details)
      // The basic administered fields were already set atomically above
      doseRecord.notes = notes;
      doseRecord.inventoryDeducted = inventoryDeducted;
      doseRecord.inventoryDetails = inventoryDetails;

      // Ensure Mongoose detects nested changes
      task.markModified('medicationDetails.doseRecords');

      // Save the task with inventory details
      await task.save();

      console.log(`✅ [DOSE ADMIN] Dose administration completed for Day ${day}, ${standardizedTimeSlot}`);

      res.json({
        success: true,
        message: 'Dose administered successfully',
        data: {
          taskId: task._id,
          patientName: task.patientName,
          medicationName: task.medicationDetails?.medicationName || task.description,
          day: day,
          timeSlot: standardizedTimeSlot,
          administeredAt: doseRecord.administeredAt,
          administeredBy: doseRecord.administeredBy,
          inventoryDeducted: inventoryDeducted,
          inventoryDetails: inventoryDetails,
          doseRecord: doseRecord
        }
      });

    } catch (error) {
      console.error(`❌ [DOSE ADMIN] Error administering dose:`, error);
      console.error(`❌ [DOSE ADMIN] Error stack:`, error.stack);
      console.error(`❌ [DOSE ADMIN] Error name:`, error.name);
      console.error(`❌ [DOSE ADMIN] Error message:`, error.message);
      
      res.status(500).json({
        success: false,
        error: 'ADMINISTRATION_FAILED',
        message: 'Failed to administer dose',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    } finally {
      // Always release the lock
      administrationLocks.delete(lockKey);
      console.log(`🔓 [DOSE ADMIN] Lock released for ${lockKey}`);
    }
  })
);

// GET /api/medication-administration/dose-status/:taskId/:day/:timeSlot
// Check if a specific dose has been administered
router.get(
  '/dose-status/:taskId/:day/:timeSlot',
  auth,
  authorize('nurse', 'admin', 'doctor'), // Allow nurses, admins, and doctors to check dose status
  asyncHandler(async (req, res) => {
  const { taskId, day, timeSlot } = req.params;
  const standardizedTimeSlot = standardizeTimeSlot(timeSlot);

  // CRITICAL: Force a fresh read from database, bypassing any mongoose cache
  // This prevents returning stale data when checking dose status
  const task = await NurseTask.findById(taskId).lean();
  if (!task) {
    return res.status(404).json({
      success: false,
      error: 'TASK_NOT_FOUND',
      message: 'Nurse task not found'
    });
  }

  console.log(`🔍 [DOSE STATUS CHECK] Task ${taskId}, Day ${day}, Time ${standardizedTimeSlot}`);
  console.log(`📊 [DOSE STATUS CHECK] Total dose records: ${task.medicationDetails?.doseRecords?.length || 0}`);
  
  // Log ALL dose records to see what's actually in the database
  console.log(`📊 [DOSE STATUS CHECK] ALL DOSE RECORDS:`);
  task.medicationDetails?.doseRecords?.forEach((record, index) => {
    console.log(`  [${index}] Day: ${record.day} (type: ${typeof record.day}), TimeSlot: "${record.timeSlot}" (type: ${typeof record.timeSlot}), Administered: ${record.administered}`);
  });
  
  console.log(`🔍 [DOSE STATUS CHECK] Searching for: Day ${parseInt(day)} (type: ${typeof parseInt(day)}), TimeSlot "${standardizedTimeSlot}"`);

  const doseRecord = task.medicationDetails?.doseRecords?.find(
    record => record.day === parseInt(day) && record.timeSlot === standardizedTimeSlot
  );

  console.log(`🔍 [DOSE STATUS CHECK] Dose record found:`, doseRecord ? 'YES' : 'NO');
  console.log(`🔍 [DOSE STATUS CHECK] Administered status: ${doseRecord?.administered || false}`);
  
  if (!doseRecord) {
    console.log(`❌ [DOSE STATUS CHECK] NO MATCH! The dose record exists but day/timeSlot don't match search criteria.`);
  }

  res.json({
    success: true,
    data: {
      administered: doseRecord?.administered || false,
      administeredAt: doseRecord?.administeredAt || null,
      administeredBy: doseRecord?.administeredBy || null,
      notes: doseRecord?.notes || '',
      inventoryDeducted: doseRecord?.inventoryDeducted || false,
      processed: doseRecord?.processed || false,
      doseRecord: doseRecord
    }
  });
}));

// Admin endpoint to force-authorize a nurse task for medication administration
router.post('/admin/force-authorize-task/:nurseTaskId', auth, authorize('admin'), asyncHandler(async (req, res) => {
  const { nurseTaskId } = req.params;
  
  try {
    const nurseTask = await NurseTask.findById(nurseTaskId);
    
    if (!nurseTask) {
      return res.status(404).json({ success: false, message: 'Nurse task not found' });
    }

    // Get total doses from the task's medication details
    const totalDoses = nurseTask.medicationDetails?.doseRecords?.length || 1;

    nurseTask.paymentAuthorization = {
      paidDays: nurseTask.medicationDetails?.duration || 1, // Assume all days paid
      totalDays: nurseTask.medicationDetails?.duration || 1,
      paymentStatus: 'fully_paid',
      canAdminister: true,
      restrictionMessage: '',
      authorizedDoses: totalDoses, // Authorize all doses
      unauthorizedDoses: 0,
      outstandingAmount: 0,
      lastUpdated: new Date()
    };
    
    await nurseTask.save();
    
    console.log(`✅ [ADMIN] Force authorized nurse task ${nurseTaskId}. Total doses: ${totalDoses}`);
    
    res.json({
      success: true,
      message: `Nurse task ${nurseTaskId} force authorized for administration.`,
      nurseTask: nurseTask
    });
  } catch (error) {
    console.error(`❌ [ADMIN] Error force authorizing nurse task ${nurseTaskId}:`, error);
    res.status(500).json({ success: false, message: 'Failed to force authorize nurse task', error: error.message });
  }
}));

// GET /api/medication-administration/locks
// Debug endpoint to check current locks (remove in production)
router.get(
  '/locks',
  auth,
  authorize('admin', 'nurse'), // Only admins and nurses can view locks
  asyncHandler(async (req, res) => {
  const locks = Array.from(administrationLocks.entries()).map(([key, value]) => ({
    lockKey: key,
    ...value,
    age: Date.now() - value.timestamp.getTime()
  }));

  res.json({
    success: true,
    data: {
      activeLocks: locks.length,
      locks: locks
    }
  });
}));

module.exports = router;

// Helper function to generate dose records with proper sequence numbers
function generateDoseRecords(frequency, duration, startDate) {
  const doseRecords = [];
  let sequenceCounter = 1;
  
  // Define time slots based on frequency
  const timeSlots = {
    'QD': ['09:00'],
    'BID': ['09:00', '21:00'],
    'TID': ['09:00', '14:00', '21:00'],
    'QID': ['06:00', '12:00', '18:00', '22:00']
  };
  
  const slots = timeSlots[frequency] || ['09:00'];
  
  for (let day = 1; day <= duration; day++) {
    for (let timeSlot of slots) {
      doseRecords.push({
        day: day,
        timeSlot: timeSlot,
        doseSequence: sequenceCounter++,
        doseLabel: getDoseLabel(sequenceCounter - 1),
        administered: false
      });
    }
  }
  
  return doseRecords;
}

// Helper function to get proper dose label
function getDoseLabel(sequence) {
  if (sequence === 1) return '1st';
  if (sequence === 2) return '2nd';
  if (sequence === 3) return '3rd';
  if (sequence === 4) return '4th';
  if (sequence === 5) return '5th';
  if (sequence === 6) return '6th';
  if (sequence === 7) return '7th';
  if (sequence === 8) return '8th';
  if (sequence === 9) return '9th';
  if (sequence === 10) return '10th';
  if (sequence === 11) return '11th';
  if (sequence === 12) return '12th';
  return `${sequence}th`;
} 
