const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { validateMedicationTaskMiddleware, validateMedicationTaskUpdateMiddleware } = require('../middleware/validateMedicationTask');
const { syncPaymentStatusFields } = require('../middleware/paymentStatusSync');

// @route   GET /api/nurse-tasks
// @desc    Get all nurse tasks with optional filtering (with pagination support)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const NurseTask = require('../models/NurseTask');
    
    // Build query based on parameters
    const query = {};
    
    if (req.query.assignedTo) {
      query.assignedTo = req.query.assignedTo;
    }
    
    if (req.query.status) {
      query.status = req.query.status;
    }
    
    if (req.query.taskType) {
      // Support comma-separated task types (e.g., "MEDICATION,PROCEDURE")
      if (req.query.taskType.includes(',')) {
        query.taskType = { $in: req.query.taskType.split(',').map(type => type.trim()) };
      } else {
        query.taskType = req.query.taskType;
      }
    }
    
    if (req.query.patientId) {
      query.patientId = req.query.patientId;
    }
    
    if (req.query.description) {
      query.description = { $regex: req.query.description, $options: 'i' };
    }
    
    console.log('Nurse tasks query:', query);
    
    // Pagination — allow larger pages for medication dashboard (clamped for safety)
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const rawLimit = parseInt(req.query.limit, 10);
    const limit = Math.min(Math.max(Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 100, 1), 3000);
    const skip = (page - 1) * limit;
    
    // Projection: for list views exclude the heavy nested arrays unless a single patient is requested
    const projection = req.query.patientId
      ? {} // full data when fetching for one patient
      : {
          _id: 1, patientId: 1, patientName: 1, taskType: 1, status: 1, priority: 1,
          description: 1, prescriptionId: 1, assignedTo: 1, assignedBy: 1,
          dueDate: 1, createdAt: 1, updatedAt: 1, isExtension: 1,
          paymentAuthorization: 1,
          'medicationDetails.medicationName': 1,
          'medicationDetails.dosage': 1,
          'medicationDetails.frequency': 1,
          'medicationDetails.route': 1,
          'medicationDetails.duration': 1,
          'medicationDetails.prescriptionId': 1,
          'medicationDetails.extensionDetails': 1,
          'medicationDetails.doseRecords': 1,
          'medicationDetails.administrationSchedule': 1,
          prescriptionDependencies: 1,
        };

    // Execute query with pagination
    const [tasks, totalCount] = await Promise.all([
      NurseTask.find(query, projection)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      NurseTask.countDocuments(query).exec()
    ]);
    
    console.log(`Found ${tasks.length} nurse tasks (page ${page} of ${Math.ceil(totalCount / limit)})`);
    
    // Return response - check if pagination was requested
    if (req.query.page || req.query.paginated === 'true') {
      // Return with pagination metadata for paginated requests
      res.json({
        success: true,
        data: tasks,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasMore: skip + tasks.length < totalCount
        }
      });
    } else {
      // Maintain backward compatibility - return tasks array directly for non-paginated requests
      res.json(tasks);
    }
  } catch (error) {
    console.error('Error fetching nurse tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/nurse-tasks
// @desc    Create new nurse task
// @access  Private
router.post('/', auth, validateMedicationTaskMiddleware, async (req, res) => {
  try {
    const NurseTask = require('../models/NurseTask');
    
    // Check if an active task already exists to prevent duplicates
    // Only block if an identical task is still PENDING or IN_PROGRESS.
    // A COMPLETED or CANCELLED task must never prevent a new prescription
    // for the same medication (e.g. a second course of Dexamethasone).
    if (req.body.taskType === 'MEDICATION' && req.body.medicationDetails?.medicationName) {
      const duplicateQuery = {
        patientId: req.body.patientId,
        'medicationDetails.medicationName': req.body.medicationDetails.medicationName,
        taskType: 'MEDICATION',
        status: { $in: ['PENDING', 'IN_PROGRESS'] }
      };

      // If both the incoming request and the DB record share the same
      // prescriptionId, that is a definitive duplicate.  If the request
      // carries no prescriptionId we fall back to the name-based check
      // above, but still only block active tasks.
      if (req.body.prescriptionId) {
        duplicateQuery.prescriptionId = req.body.prescriptionId;
      }

      const existingTask = await NurseTask.findOne(duplicateQuery);

      if (existingTask) {
        console.log(`⚠️ Duplicate nurse task prevented for ${req.body.medicationDetails.medicationName} - patient ${req.body.patientName}`);
        return res.status(409).json({
          success: false,
          message: 'A nurse task for this medication already exists for this patient',
          existingTaskId: existingTask._id
        });
      }
    }
    
    const task = new NurseTask(req.body);
    await task.save();
    
    console.log(`✅ Created new nurse task for ${req.body.medicationDetails?.medicationName || 'unknown medication'} - patient ${req.body.patientName}`);
    
    res.status(201).json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Error creating nurse task:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/nurse-tasks/create-for-paid-medications
// @desc    Create nurse tasks for paid medications (emergency fix endpoint)
// @access  Private
router.post('/create-for-paid-medications', auth, async (req, res) => {
  try {
    const { patientId, medications } = req.body;
    
    if (!patientId || !medications || !Array.isArray(medications)) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID and medications array are required'
      });
    }

    const NurseTask = require('../models/NurseTask');
    const User = require('../models/User');
    
    // Find a nurse to assign
    const nurse = await User.findOne({ role: 'nurse', isActive: true });
    if (!nurse) {
      return res.status(404).json({
        success: false,
        message: 'No active nurse found'
      });
    }

    const createdTasks = [];
    
    for (const med of medications) {
      // Check if task already exists
      const existingTask = await NurseTask.findOne({
        patientId: patientId,
        'medicationDetails.medicationName': { $regex: new RegExp(med.name, 'i') },
        taskType: 'MEDICATION'
      });

      if (existingTask) {
        console.log(`Task for ${med.name} already exists`);
        continue;
      }

      // Generate dose records based on frequency
      const dosesPerDay = med.frequency?.includes('Twice') || med.frequency?.includes('BID') ? 2 :
                         med.frequency?.includes('Three') || med.frequency?.includes('TID') ? 3 :
                         med.frequency?.includes('Four') || med.frequency?.includes('QID') ? 4 : 1;
      
      const timeSlots = dosesPerDay === 4 ? ['06:00', '12:00', '18:00', '24:00'] :
                       dosesPerDay === 3 ? ['08:00', '14:00', '20:00'] :
                       dosesPerDay === 2 ? ['09:00', '21:00'] : ['09:00'];

      const doseRecords = [];
      const duration = med.duration || 5;
      
      for (let day = 1; day <= duration; day++) {
        for (const timeSlot of timeSlots) {
          doseRecords.push({
            day: day,
            timeSlot: timeSlot,
            administered: false,
            administeredAt: null,
            administeredBy: null,
            notes: ''
          });
        }
      }

      // Create nurse task
      const newTask = new NurseTask({
        patientId: patientId,
        patientName: med.patientName || 'Unknown Patient',
        taskType: 'MEDICATION',
        status: 'PENDING',
        priority: 'MEDIUM',
        assignedNurse: nurse._id,
        assignedBy: req.user._id,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        medicationDetails: {
          medicationName: med.name,
          dosage: med.dosage || 'As prescribed',
          frequency: med.frequency || 'Once daily (QD)',
          duration: duration,
          route: med.route || 'Oral',
          instructions: 'Administer as prescribed',
          doseRecords: doseRecords
        },
        description: `Administer ${med.name} ${med.dosage || ''} ${med.frequency || 'QD'} for ${duration} days`,
        notes: `Created for paid medication via emergency endpoint`
      });

      await newTask.save();
      createdTasks.push(newTask);
      
      console.log(`✅ Created nurse task for ${med.name}`);
    }

    res.json({
      success: true,
      message: `Created ${createdTasks.length} nurse tasks`,
      data: {
        tasksCreated: createdTasks.length,
        tasks: createdTasks.map(t => ({
          id: t._id,
          medication: t.medicationDetails.medicationName,
          frequency: t.medicationDetails.frequency,
          totalDoses: t.medicationDetails.doseRecords.length
        }))
      }
    });

  } catch (error) {
    console.error('Error creating nurse tasks for paid medications:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/nurse-tasks/cleanup-duplicates
// @desc    Clean up duplicate nurse tasks (admin only)
// @access  Private (admin)
router.post('/cleanup-duplicates', auth, async (req, res) => {
  try {
    // Check if user is admin or doctor
    if (req.user.role !== 'admin' && req.user.role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin or Doctor role required.'
      });
    }

    const NurseTask = require('../models/NurseTask');
    const { patientId, medicationName } = req.body; // Optional filters
    
    // Build query - filter by patient/medication if provided
    const query = { taskType: 'MEDICATION', status: { $in: ['PENDING', 'IN_PROGRESS'] } };
    if (patientId) query.patientId = patientId;
    if (medicationName) query['medicationDetails.medicationName'] = { $regex: new RegExp(medicationName, 'i') };
    
    // Find all medication tasks (only active ones)
    const allTasks = await NurseTask.find(query).sort({ createdAt: -1 });
    
    const duplicateGroups = {};
    const tasksToKeep = [];
    const tasksToDelete = [];
    
    // Group tasks by patient + medication + prescription ID
    // This ensures we only remove duplicates from the SAME prescription
    allTasks.forEach(task => {
      const prescriptionId = task.medicationDetails?.prescriptionId || task.prescriptionId || 'no-prescription';
      const key = `${task.patientId}-${task.medicationDetails?.medicationName || 'unknown'}-${prescriptionId}`;
      if (!duplicateGroups[key]) {
        duplicateGroups[key] = [];
      }
      duplicateGroups[key].push(task);
    });
    
    // For each group, keep the most recent task and mark others for deletion
    Object.entries(duplicateGroups).forEach(([key, tasks]) => {
      if (tasks.length > 1) {
        // Sort by creation date (most recent first)
        const sortedTasks = tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        // Keep the most recent task
        tasksToKeep.push(sortedTasks[0]);
        
        // Mark older tasks for deletion
        tasksToDelete.push(...sortedTasks.slice(1));
        
        console.log(`🔍 Found ${tasks.length} duplicate tasks for ${key}, keeping most recent (${sortedTasks[0]._id})`);
      } else {
        // Single task, keep it
        tasksToKeep.push(tasks[0]);
      }
    });
    
    // Delete duplicate tasks
    let deletedCount = 0;
    if (tasksToDelete.length > 0) {
      const deleteResult = await NurseTask.deleteMany({
        _id: { $in: tasksToDelete.map(t => t._id) }
      });
      
      deletedCount = deleteResult.deletedCount;
      console.log(`🗑️ Deleted ${deletedCount} duplicate nurse tasks`);
    }
    
    res.json({
      success: true,
      message: `Cleanup completed. Kept ${tasksToKeep.length} tasks, deleted ${deletedCount} duplicates.`,
      keptTasks: tasksToKeep.length,
      deletedTasks: deletedCount,
      details: {
        totalTasksScanned: allTasks.length,
        duplicateGroupsFound: Object.keys(duplicateGroups).filter(key => duplicateGroups[key].length > 1).length
      }
    });
    
  } catch (error) {
    console.error('Error cleaning up duplicate nurse tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during cleanup',
      error: error.message
    });
  }
});

// @route   GET /api/nurse-tasks/:id
// @desc    Get nurse task by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const NurseTask = require('../models/NurseTask');
    const task = await NurseTask.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Nurse task not found'
      });
    }
    
    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Error fetching nurse task:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/nurse-tasks/:id
// @desc    Update nurse task
// @access  Private
router.put('/:id', auth, validateMedicationTaskUpdateMiddleware, async (req, res) => {
  try {
    const NurseTask = require('../models/NurseTask');
    const task = await NurseTask.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Nurse task not found'
      });
    }
    
    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Error updating nurse task:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/nurse-tasks/:id/complete
// @desc    Complete a nurse task
// @access  Private
router.put('/:id/complete', auth, async (req, res) => {
  try {
    const NurseTask = require('../models/NurseTask');
    const InventoryUpdateService = require('../services/inventoryUpdateService');
    const { notes } = req.body;
    
    const task = await NurseTask.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Nurse task not found'
      });
    }
    
    // Update task status to completed
    task.status = 'COMPLETED';
    task.completedDate = new Date();
    task.completedBy = req.user.id;
    task.completionNotes = notes || '';
    
    await task.save();
    
    console.log(`✅ Task ${req.params.id} completed by ${req.user.email}`);
    
    // Update inventory if this is a medication task
    let inventoryUpdateResult = null;
    if (task.taskType === 'MEDICATION' && task.medicationDetails?.medicationName) {
      console.log(`🔄 [TASK COMPLETION] Updating inventory for medication: ${task.medicationDetails.medicationName}`);
      
      inventoryUpdateResult = await InventoryUpdateService.updateInventoryOnMedicationAdministration(
        task, 
        req.user.id
      );
      
      if (inventoryUpdateResult.success) {
        console.log(`✅ [TASK COMPLETION] Inventory updated successfully`);
      } else {
        console.log(`⚠️ [TASK COMPLETION] Inventory update failed: ${inventoryUpdateResult.message}`);
      }
    }
    
    res.json({
      success: true,
      message: 'Task completed successfully',
      data: {
        task: task,
        inventoryUpdate: inventoryUpdateResult
      }
    });
  } catch (error) {
    console.error('Error completing nurse task:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/nurse-tasks/:id/fix-doses
// @desc    Rebuild dose records for a task from its prescription duration
// @access  Private
router.post('/:id/fix-doses', auth, async (req, res) => {
  try {
    const NurseTask = require('../models/NurseTask');
    const Prescription = require('../models/Prescription');

    const task = await NurseTask.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Nurse task not found' });
    }

    const frequency = task.medicationDetails?.frequency || 'Once daily (QD)';
    let numericDuration = task.medicationDetails?.duration;

    // Try to get duration from linked prescription if not set or seems wrong
    const prescriptionId = task.medicationDetails?.prescriptionId || task.prescriptionId;
    if (prescriptionId) {
      const prescription = await Prescription.findById(prescriptionId);
      if (prescription) {
        const rawDuration = prescription.duration;
        if (typeof rawDuration === 'number') {
          numericDuration = rawDuration;
        } else if (typeof rawDuration === 'string') {
          const match = rawDuration.match(/(\d+)/);
          if (match) numericDuration = parseInt(match[1], 10);
        }
      }
    }

    if (!numericDuration || numericDuration < 1) {
      return res.status(400).json({ success: false, message: 'Could not determine valid duration for this task' });
    }

    // Determine doses per day from frequency
    const freq = frequency.toLowerCase();
    let dosesPerDay = 1;
    let timeSlots = ['09:00'];
    if (freq.includes('four') || freq.includes('qid')) { dosesPerDay = 4; timeSlots = ['09:00', '13:00', '17:00', '21:00']; }
    else if (freq.includes('three') || freq.includes('tid')) { dosesPerDay = 3; timeSlots = ['09:00', '15:00', '21:00']; }
    else if (freq.includes('twice') || freq.includes('bid')) { dosesPerDay = 2; timeSlots = ['09:00', '21:00']; }

    const correctTotalDoses = dosesPerDay * numericDuration;
    const existingRecords = task.medicationDetails?.doseRecords || [];
    const currentCount = existingRecords.length;

    if (currentCount === correctTotalDoses) {
      return res.json({
        success: true,
        message: `Dose records already correct (${correctTotalDoses} doses)`,
        changed: false,
        totalDoses: correctTotalDoses
      });
    }

    // Build new dose records, preserving administered status for matching records
    const newDoseRecords = [];
    for (let day = 1; day <= numericDuration; day++) {
      for (let slotIndex = 0; slotIndex < dosesPerDay; slotIndex++) {
        const timeSlot = timeSlots[slotIndex];
        const existing = existingRecords.find(r => r.day === day && r.timeSlot === timeSlot);
        newDoseRecords.push({
          day,
          timeSlot,
          administered: existing?.administered || false,
          administeredAt: existing?.administeredAt || null,
          administeredBy: existing?.administeredBy || null,
          notes: existing?.notes || '',
          period: 'active'
        });
      }
    }

    await NurseTask.updateOne(
      { _id: task._id },
      {
        $set: {
          'medicationDetails.doseRecords': newDoseRecords,
          'medicationDetails.duration': numericDuration
        }
      }
    );

    console.log(`✅ [FIX DOSES] Task ${task._id}: ${currentCount} → ${correctTotalDoses} doses (${numericDuration} days × ${dosesPerDay}/day)`);

    res.json({
      success: true,
      message: `Fixed dose records: ${currentCount} → ${correctTotalDoses} doses`,
      changed: true,
      oldDoses: currentCount,
      newDoses: correctTotalDoses,
      duration: numericDuration,
      frequency
    });
  } catch (error) {
    console.error('Error fixing task doses:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/nurse-tasks/:id
// @desc    Delete nurse task
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const NurseTask = require('../models/NurseTask');
    const task = await NurseTask.findByIdAndDelete(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Nurse task not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Nurse task deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting nurse task:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
