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
  authorize('nurse', 'admin', 'doctor', 'mch'),
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
// Clean, single-purpose endpoint for administering medication doses with STRICT STOCK CHECK
router.post(
  '/administer-dose',
  auth,
  authorize('nurse', 'admin', 'doctor', 'mch'),
  asyncHandler(async (req, res) => {
    console.log(`🚀 [DOSE ADMIN] Route hit with body:`, req.body);
    const { taskId, day, timeSlot, notes = '' } = req.body;
    
    // Input validation
    if (!taskId || !day || !timeSlot) {
      console.error('❌ [DOSE ADMIN] Missing required fields:', { taskId, day, timeSlot });
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

    // Acquire in-memory lock
    administrationLocks.set(lockKey, {
      userId: req.user._id || req.user.id,
      timestamp: new Date(),
      taskId,
      day,
      timeSlot: standardizedTimeSlot
    });

    try {
      console.log(`🔒 [DOSE ADMIN] Lock acquired for ${lockKey}`);

      // 1. Find the nurse task
      const task = await NurseTask.findById(taskId);
      if (!task) {
        return res.status(404).json({
          success: false,
          error: 'TASK_NOT_FOUND',
          message: 'Nurse task not found'
        });
      }

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

      // 2. Pre-check: Resolve target dose record & check if ALREADY ADMINISTERED
      let dbTimeSlot = standardizedTimeSlot;
      const preCheckDoseRecords = task.medicationDetails?.doseRecords || [];
      const numDay = parseInt(day, 10);
      
      let targetDose = preCheckDoseRecords.find(
        r => parseInt(r.day, 10) === numDay && r.timeSlot === standardizedTimeSlot
      );
      
      if (!targetDose) {
        targetDose = preCheckDoseRecords.find(
          r => parseInt(r.day, 10) === numDay && r.timeSlot?.toLowerCase() === standardizedTimeSlot?.toLowerCase()
        );
      }
      
      if (!targetDose) {
        const numericToText = {
          '06:00': ['morning'], '08:00': ['morning'], '09:00': ['morning', 'anytime'],
          '12:00': ['afternoon', 'noon', 'midday'], '14:00': ['afternoon'],
          '18:00': ['evening'], '20:00': ['evening'], '21:00': ['evening', 'night'],
          '22:00': ['night'], '24:00': ['night']
        };
        const textToNumeric = {
          'morning': ['06:00', '08:00', '09:00'], 'afternoon': ['12:00', '14:00'],
          'evening': ['18:00', '20:00', '21:00'], 'night': ['22:00', '24:00', '21:00'],
          'noon': ['12:00'], 'midday': ['12:00'], 'anytime': ['09:00', 'Anytime']
        };
        const lowerStandardized = standardizedTimeSlot?.toLowerCase();
        const textAlternatives = numericToText[standardizedTimeSlot] || [];
        const numericAlternatives = textToNumeric[lowerStandardized] || [];
        const allAlternatives = [...textAlternatives, ...numericAlternatives];
        
        targetDose = preCheckDoseRecords.find(
          r => parseInt(r.day, 10) === numDay && allAlternatives.some(alt => r.timeSlot?.toLowerCase() === alt.toLowerCase())
        );
      }
      
      if (!targetDose) {
        const dayRecords = preCheckDoseRecords.filter(r => parseInt(r.day, 10) === numDay);
        if (dayRecords.length === 1) {
          targetDose = dayRecords[0];
        }
      }
      
      if (targetDose) {
        dbTimeSlot = targetDose.timeSlot;
      }

      // If dose is already administered in database, return idempotent success!
      if (targetDose && targetDose.administered === true) {
        console.log(`✅ [DOSE ADMIN] Dose already administered — returning idempotent success`);
        return res.json({
          success: true,
          alreadyAdministered: true,
          message: 'This dose was already administered successfully.',
          data: {
            taskId: task._id,
            patientName: task.patientName,
            medicationName: task.medicationDetails?.medicationName || task.description,
            day: numDay,
            timeSlot: dbTimeSlot,
            administeredAt: targetDose.administeredAt,
            administeredBy: targetDose.administeredBy,
            inventoryDeducted: targetDose.inventoryDeducted || false,
            inventoryDetails: targetDose.inventoryDetails || null,
            doseRecord: targetDose
          }
        });
      }

      // If injection task is already completed
      if (isInjectionTask && task.status === 'COMPLETED') {
        console.log(`✅ [DOSE ADMIN] Injection task already completed — returning idempotent success`);
        return res.json({
          success: true,
          alreadyAdministered: true,
          message: 'This injection was already administered successfully.',
          data: {
            taskId: task._id,
            patientName: task.patientName,
            medicationName: task.serviceName || task.description,
            day: numDay,
            timeSlot: dbTimeSlot,
            administeredAt: task.completedDate || new Date()
          }
        });
      }

      // 3. Check prescription dependencies
      if (task.prescriptionDependencies?.dependsOn && task.prescriptionDependencies.dependsOn.length > 0) {
        for (const dependency of task.prescriptionDependencies.dependsOn) {
          try {
            const dependentTask = await NurseTask.findOne({
              prescriptionId: dependency.prescriptionId,
              taskType: 'MEDICATION'
            });
            if (!dependentTask) continue;
            
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
              const msg = dependency.requiredCompletion === 'fully_completed' 
                ? `Cannot administer ${task.medicationDetails?.medicationName || 'medication'} until ${dependency.medicationName} is fully completed (${completedDependentDoses}/${totalDependentDoses} doses)`
                : `Cannot administer ${task.medicationDetails?.medicationName || 'medication'} until ${dependency.medicationName} has at least one completed dose`;
              
              task.prescriptionDependencies.isBlocked = true;
              task.prescriptionDependencies.blockReason = msg;
              await task.save();
              
              return res.status(403).json({
                success: false,
                error: 'PRESCRIPTION_DEPENDENCY_NOT_MET',
                message: msg
              });
            }
          } catch (e) {
            console.error('Error checking dependency:', e);
          }
        }
      }

      // 4. Check Ethiopian time-based availability
      const medicationStartDate = task.medicationDetails?.startDate || task.createdAt;
      const availability = checkDoseAvailability(standardizedTimeSlot, medicationStartDate, numDay);
      if (!availability.canAdminister && !availability.isOverdue) {
        const msg = !availability.isRightDay 
          ? `This dose is scheduled for ${availability.targetDate}. Current Ethiopian time: ${availability.currentEthiopianTime}`
          : `This ${standardizedTimeSlot} dose is not available yet. Current Ethiopian time: ${availability.currentEthiopianTime}. Next available: ${formatEthiopianTime(availability.nextAvailable)}`;
        
        return res.status(400).json({
          success: false,
          error: 'DOSE_NOT_AVAILABLE_YET',
          message: msg,
          availability: availability
        });
      }

      // 5. Check payment authorization
      if (task.paymentAuthorization && task.paymentAuthorization.paymentStatus !== 'fully_paid') {
        const paymentAuth = task.paymentAuthorization;
        if (typeof paymentAuth.authorizedDoses === 'number' && paymentAuth.authorizedDoses < 1) {
          return res.status(403).json({
            success: false,
            error: 'PAYMENT_REQUIRED',
            message: 'Payment required - no doses authorized yet. Please collect payment before administering medication.'
          });
        }
      }

      // 6. STRICT INVENTORY STOCK CHECK & DEDUCTION (BEFORE MARKING DOSE ADMINISTERED)
      let medicationName = task.medicationDetails?.medicationName || task.description || 'Unknown Medication';
      medicationName = medicationName.replace(/^administer\s+/i, '').trim();

      if (medicationName.toLowerCase().includes('depo injection')) {
        medicationName = 'Depo';
      } else if (medicationName.toLowerCase().includes('injection')) {
        const m = medicationName.match(/^(.+?)\s+injection/i);
        if (m) medicationName = m[1].trim();
      }

      const itemNameVariations = {
        'normal saline': ['normal saline', 'normal saline (0.9% nacl)', '0.9% normal saline', 'nacl 0.9%', 'saline solution', 'ns', 'normal salin', '0.9% nacl'],
        'saline': ['normal saline', 'saline solution', '0.9% saline', 'nacl'],
        'ns': ['normal saline', 'saline solution', '0.9% nacl'],
        'ringer lactate': ['ringer lactate', 'ringer\'s lactate', 'hartmann solution', 'hartmann\'s solution', 'rl', 'lactated ringer'],
        'rl': ['ringer lactate', 'ringer\'s lactate', 'hartmann solution'],
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
        'paracetamol': ['paracetamol', 'acetaminophen', 'tylenol', 'panadol'],
        'ibuprofen': ['ibuprofen', 'brufen', 'advil'],
        'amoxicillin': ['amoxicillin', 'amoxil'],
        'ceftriaxone': ['ceftriaxone', 'rocephin'],
        'metronidazole': ['metronidazole', 'flagyl'],
        'ciprofloxacin': ['ciprofloxacin', 'cipro'],
        'azithromycin': ['azithromycin', 'zithromax'],
        'diclofenac': ['diclofenac', 'voltaren', 'diclofenac sodium'],
        'dexamethasone': ['dexamethasone', 'dexa'],
        'tramadol': ['tramadol', 'ultram'],
        'depo': ['depo', 'depo-provera', 'medroxyprogesterone']
      };

      const variations = itemNameVariations[medicationName.toLowerCase()] || [medicationName];
      const caseVariations = [
        medicationName,
        medicationName.toLowerCase(),
        medicationName.charAt(0).toUpperCase() + medicationName.slice(1).toLowerCase(),
        medicationName.toUpperCase()
      ];
      const allVariations = [...new Set([...variations, ...caseVariations])];

      let medicationItem = null;
      for (const variation of allVariations) {
        const searchTerms = [
          new RegExp(`^${variation}$`, 'i'),
          new RegExp(variation, 'i'),
          new RegExp(variation.replace(/\s+/g, '\\s*'), 'i')
        ];

        for (const searchTerm of searchTerms) {
          medicationItem = await InventoryItem.findOne({
            name: searchTerm,
            isActive: { $ne: false }
          });
          if (medicationItem) break;
        }
        if (medicationItem) break;
      }

      // STRICT STOCK ENFORCEMENT:
      // If the medication is NOT registered in inventory at all, block administration
      if (!medicationItem) {
        console.log(`❌ [DOSE ADMIN] Strict stock check failed: "${medicationName}" not found in inventory`);
        return res.status(400).json({
          success: false,
          error: 'INSUFFICIENT_STOCK',
          message: `Medication "${medicationName}" is not registered in inventory. Please add it to inventory before administering.`
        });
      }

      const requiresStock = medicationItem.category !== 'service';

      // Check if stock is 0 or less
      if (requiresStock && medicationItem.quantity < 1) {
        console.log(`❌ [DOSE ADMIN] Strict stock check failed: "${medicationItem.name}" has ${medicationItem.quantity} units (0 stock)`);
        return res.status(400).json({
          success: false,
          error: 'INSUFFICIENT_STOCK',
          message: `Insufficient stock for ${medicationItem.name}. Available: ${medicationItem.quantity}, Required: 1. Please refill inventory before administering.`
        });
      }

      // Atomically deduct 1 unit from inventory
      let inventoryDeducted = false;
      let inventoryDetails = null;
      let previousQuantity = medicationItem.quantity;
      let updatedItem = null;

      if (requiresStock) {
        updatedItem = await InventoryItem.findOneAndUpdate(
          { _id: medicationItem._id, quantity: { $gte: 1 } },
          {
            $inc: { quantity: -1 },
            $set: { updatedBy: req.user._id || req.user.id }
          },
          { new: true }
        );

        if (!updatedItem) {
          console.log(`❌ [DOSE ADMIN] Atomic deduction failed: stock depleted concurrently for ${medicationItem.name}`);
          return res.status(400).json({
            success: false,
            error: 'INSUFFICIENT_STOCK',
            message: `Insufficient stock for ${medicationItem.name}. Stock was depleted by another session.`
          });
        }

        previousQuantity = updatedItem.quantity + 1;
        inventoryDeducted = true;
        inventoryDetails = {
          medicationName: medicationItem.name,
          itemsDeducted: [{
            name: medicationItem.name,
            previousQuantity: previousQuantity,
            newQuantity: updatedItem.quantity,
            quantityDeducted: 1
          }],
          totalItems: 1
        };
      } else {
        inventoryDeducted = true;
        inventoryDetails = {
          medicationName: medicationItem.name,
          itemsDeducted: [],
          totalItems: 0,
          info: 'Service item - physical stock deduction skipped'
        };
      }

      // 7. ATOMICALLY MARK THE DOSE AS ADMINISTERED IN NURSETASK
      const adminName = `${req.user.firstName || 'Unknown'} ${req.user.lastName || 'User'}`.trim();
      let atomicUpdate = null;

      if (isMedicationTask) {
        // Query condition: match exact dose record if found, or day & dbTimeSlot
        const elemCondition = targetDose?._id
          ? { _id: targetDose._id }
          : { day: numDay, timeSlot: dbTimeSlot };

        atomicUpdate = await NurseTask.findOneAndUpdate(
          {
            _id: taskId,
            'medicationDetails.doseRecords': {
              $elemMatch: {
                ...elemCondition,
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
              'medicationDetails.doseRecords.$.administeredBy': adminName,
              'medicationDetails.doseRecords.$.processed': true,
              'medicationDetails.doseRecords.$.processedAt': new Date(),
              'medicationDetails.doseRecords.$.processedBy': req.user._id || req.user.id,
              'medicationDetails.doseRecords.$.notes': notes,
              'medicationDetails.doseRecords.$.inventoryDeducted': inventoryDeducted,
              'medicationDetails.doseRecords.$.inventoryDetails': inventoryDetails
            }
          },
          { new: true }
        );

        // If doseRecord was not found in array (e.g. dynamic dose sequence), push it
        if (!atomicUpdate && !targetDose) {
          const newDoseRecord = {
            day: numDay,
            timeSlot: dbTimeSlot,
            doseSequence: numDay,
            doseLabel: `${numDay}th`,
            administered: true,
            administeredAt: new Date(),
            administeredBy: adminName,
            processed: true,
            processedAt: new Date(),
            processedBy: req.user._id || req.user.id,
            notes: notes,
            inventoryDeducted: inventoryDeducted,
            inventoryDetails: inventoryDetails
          };

          atomicUpdate = await NurseTask.findOneAndUpdate(
            { _id: taskId },
            { $push: { 'medicationDetails.doseRecords': newDoseRecord } },
            { new: true }
          );
        }

        // If atomicUpdate is STILL null, another process administered this exact dose concurrently
        if (!atomicUpdate) {
          console.log(`⚠️ [DOSE ADMIN] Concurrent administration collision detected for Day ${numDay}, ${dbTimeSlot}. Rolling back inventory.`);
          // Rollback the inventory deduction
          if (requiresStock && medicationItem) {
            await InventoryItem.findByIdAndUpdate(medicationItem._id, { $inc: { quantity: 1 } });
          }
          return res.json({
            success: true,
            alreadyAdministered: true,
            message: 'This dose was already administered by another session.',
            data: {
              taskId: task._id,
              day: numDay,
              timeSlot: dbTimeSlot
            }
          });
        }
      } else if (isInjectionTask) {
        atomicUpdate = await NurseTask.findOneAndUpdate(
          { _id: taskId, status: { $ne: 'COMPLETED' } },
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

        if (!atomicUpdate) {
          // Rollback inventory
          if (requiresStock && medicationItem) {
            await InventoryItem.findByIdAndUpdate(medicationItem._id, { $inc: { quantity: 1 } });
          }
          return res.json({
            success: true,
            alreadyAdministered: true,
            message: 'This injection was already administered.'
          });
        }
      }

      // 8. Create inventory transaction record
      if (requiresStock && updatedItem) {
        try {
          const transactionReason = `${medicationName} ${isInjectionTask ? 'injection' : 'dose'} administered - Day ${numDay}, ${dbTimeSlot}`;
          const inventoryTransaction = new InventoryTransaction({
            item: medicationItem._id,
            transactionType: 'medical-use',
            quantity: -1,
            unitCost: medicationItem.costPrice || 0,
            totalCost: medicationItem.costPrice || 0,
            previousQuantity: previousQuantity,
            newQuantity: updatedItem.quantity,
            reason: transactionReason,
            documentReference: taskId,
            performedBy: new mongoose.Types.ObjectId(req.user._id || req.user.id),
            patient: new mongoose.Types.ObjectId(task.patientId),
            status: 'completed',
            _skipInventoryUpdate: true
          });
          await inventoryTransaction.save();
        } catch (txErr) {
          console.error('Error saving inventory transaction:', txErr);
        }
      }

      // 9. If all dose records in medicationDetails are administered, mark task as COMPLETED
      try {
        const refreshedDoses = atomicUpdate?.medicationDetails?.doseRecords || [];
        if (refreshedDoses.length > 0 && refreshedDoses.every(d => d.administered)) {
          await NurseTask.findByIdAndUpdate(taskId, {
            $set: { status: 'COMPLETED', completedDate: new Date(), completedBy: req.user._id || req.user.id }
          });
          console.log(`🎉 [DOSE ADMIN] All doses completed! Task ${taskId} marked as COMPLETED.`);
        }
      } catch (_) {}

      console.log(`✅ [DOSE ADMIN] Successfully administered Day ${numDay}, ${dbTimeSlot}. Inventory deducted: ${inventoryDeducted}`);

      const savedDose = (atomicUpdate?.medicationDetails?.doseRecords || []).find(
        r => parseInt(r.day, 10) === numDay && (r.timeSlot === dbTimeSlot || r.timeSlot === standardizedTimeSlot)
      ) || targetDose;

      res.json({
        success: true,
        message: 'Dose administered successfully',
        data: {
          taskId: task._id,
          patientName: task.patientName,
          medicationName: task.medicationDetails?.medicationName || task.description,
          day: numDay,
          timeSlot: dbTimeSlot,
          administeredAt: savedDose?.administeredAt || new Date(),
          administeredBy: adminName,
          inventoryDeducted: inventoryDeducted,
          inventoryDetails: inventoryDetails,
          doseRecord: savedDose
        }
      });

    } catch (error) {
      console.error(`❌ [DOSE ADMIN] Error administering dose:`, error);
      res.status(500).json({
        success: false,
        error: 'ADMINISTRATION_FAILED',
        message: 'Failed to administer dose',
        details: error.message
      });
    } finally {
      administrationLocks.delete(lockKey);
      console.log(`🔓 [DOSE ADMIN] Lock released for ${lockKey}`);
    }
  })
);

// GET /api/medication-administration/check-stock/:medicationName
// Endpoint for nurses to check live stock before administering
router.get(
  '/check-stock/:medicationName',
  auth,
  authorize('nurse', 'admin', 'doctor', 'mch'),
  asyncHandler(async (req, res) => {
    let { medicationName } = req.params;
    if (!medicationName) {
      return res.status(400).json({ success: false, message: 'Medication name required' });
    }

    medicationName = decodeURIComponent(medicationName).replace(/^administer\s+/i, '').trim();
    if (medicationName.toLowerCase().includes('depo injection')) {
      medicationName = 'Depo';
    } else if (medicationName.toLowerCase().includes('injection')) {
      const m = medicationName.match(/^(.+?)\s+injection/i);
      if (m) medicationName = m[1].trim();
    }

    const itemNameVariations = {
      'normal saline': ['normal saline', 'normal saline (0.9% nacl)', '0.9% normal saline', 'nacl 0.9%', 'saline solution', 'ns', 'normal salin', '0.9% nacl'],
      'saline': ['normal saline', 'saline solution', '0.9% saline', 'nacl'],
      'ns': ['normal saline', 'saline solution', '0.9% nacl'],
      'ringer lactate': ['ringer lactate', 'ringer\'s lactate', 'hartmann solution', 'hartmann\'s solution', 'rl', 'lactated ringer'],
      'rl': ['ringer lactate', 'ringer\'s lactate', 'hartmann solution'],
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
      'paracetamol': ['paracetamol', 'acetaminophen', 'tylenol', 'panadol'],
      'ibuprofen': ['ibuprofen', 'brufen', 'advil'],
      'amoxicillin': ['amoxicillin', 'amoxil'],
      'ceftriaxone': ['ceftriaxone', 'rocephin'],
      'metronidazole': ['metronidazole', 'flagyl'],
      'ciprofloxacin': ['ciprofloxacin', 'cipro'],
      'azithromycin': ['azithromycin', 'zithromax'],
      'diclofenac': ['diclofenac', 'voltaren', 'diclofenac sodium'],
      'dexamethasone': ['dexamethasone', 'dexa'],
      'tramadol': ['tramadol', 'ultram'],
      'depo': ['depo', 'depo-provera', 'medroxyprogesterone']
    };

    const variations = itemNameVariations[medicationName.toLowerCase()] || [medicationName];
    const caseVariations = [
      medicationName,
      medicationName.toLowerCase(),
      medicationName.charAt(0).toUpperCase() + medicationName.slice(1).toLowerCase(),
      medicationName.toUpperCase()
    ];
    const allVariations = [...new Set([...variations, ...caseVariations])];

    let item = null;
    for (const variation of allVariations) {
      const searchTerms = [
        new RegExp(`^${variation}$`, 'i'),
        new RegExp(variation, 'i'),
        new RegExp(variation.replace(/\s+/g, '\\s*'), 'i')
      ];

      for (const searchTerm of searchTerms) {
        item = await InventoryItem.findOne({
          name: searchTerm,
          isActive: { $ne: false }
        });
        if (item) break;
      }
      if (item) break;
    }

    if (!item) {
      return res.json({
        success: true,
        medicationName,
        found: false,
        inStock: false,
        quantity: 0,
        message: `Medication "${medicationName}" is not registered in inventory`
      });
    }

    const isService = item.category === 'service';
    const inStock = isService || item.quantity > 0;

    res.json({
      success: true,
      medicationName,
      found: true,
      inStock,
      quantity: item.quantity,
      category: item.category,
      itemName: item.name
    });
  })
);

// GET /api/medication-administration/dose-status/:taskId/:day/:timeSlot
// Check if a specific dose has been administered
router.get(
  '/dose-status/:taskId/:day/:timeSlot',
  auth,
  authorize('nurse', 'admin', 'doctor', 'mch'), // Allow nurses, admins, and doctors to check dose status
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
