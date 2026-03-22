const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Procedure = require('../models/Procedure');
const Patient = require('../models/Patient');
const User = require('../models/User');
const { corsMiddleware } = require('../middleware/corsMiddleware');

// Apply CORS headers to all routes in this router
router.use(corsMiddleware);

// Log when this router is entered
router.use((req, res, next) => {
    console.log(`[ProceduresRoutes] Handling request: ${req.method} ${req.originalUrl}`);
    next();
});

// Clear all procedures data (development only) - NO AUTH REQUIRED
router.delete('/clear-all', async (req, res) => {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Clearing data not allowed in production'
      });
    }
    
    console.log('[PROCEDURES CLEAR] Starting to clear all procedures...');
    
    const result = await Procedure.deleteMany({});
    
    console.log(`[PROCEDURES CLEAR] Successfully deleted ${result.deletedCount} procedures`);
    
    res.json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} procedures`,
      deletedCount: result.deletedCount
    });
    
  } catch (error) {
    console.error('[PROCEDURES CLEAR] Error clearing procedures:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear procedures',
      error: error.message
    });
  }
});

// Get all procedures (with optional filters)
router.get('/', auth, async (req, res) => {
  try {
    const { status, procedureType, nurseId, patientId, date } = req.query;
    let filter = {};

    // Add filters if provided
    if (status) filter.status = status;
    if (procedureType) filter.procedureType = procedureType;
    if (nurseId) filter.assignedNurse = nurseId;
    if (patientId) filter.patientId = patientId;
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      filter.scheduledTime = { $gte: startDate, $lt: endDate };
    }

    const procedures = await Procedure.find(filter)
      .populate('patientId', 'firstName lastName dateOfBirth')
      .populate('assignedNurse', 'firstName lastName')
      .populate('createdBy', 'firstName lastName')
      .sort({ scheduledTime: 1 });

    res.json(procedures);
  } catch (error) {
    console.error('Error fetching procedures:', error);
    res.status(500).json({ error: 'Failed to fetch procedures', details: error.message });
  }
});

// Get procedures for current nurse
router.get('/my-procedures', auth, async (req, res) => {
  try {
    const { status } = req.query;
    
    // Log user information for debugging
    console.log('[MY-PROCEDURES] User requesting procedures:', {
      userId: req.user.id,
      username: req.user.username,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      role: req.user.role
    });
    
    let filter = { assignedNurse: req.user.id };
    
    if (status) filter.status = status;

    console.log('[MY-PROCEDURES] Filter:', JSON.stringify(filter));

    const procedures = await Procedure.find(filter)
      .populate('patientId', 'firstName lastName dateOfBirth')
      .populate('createdBy', 'firstName lastName')
      .populate('assignedNurse', 'firstName lastName username')
      .sort({ scheduledTime: 1 });

    console.log(`[MY-PROCEDURES] Found ${procedures.length} procedures for user ${req.user.id}`);

    res.json(procedures);
  } catch (error) {
    console.error('Error fetching nurse procedures:', error);
    res.status(500).json({ error: 'Failed to fetch procedures', details: error.message });
  }
});

// Get procedure by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const procedure = await Procedure.findById(req.params.id)
      .populate('patientId', 'firstName lastName dateOfBirth')
      .populate('assignedNurse', 'firstName lastName')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    if (!procedure) {
      return res.status(404).json({ error: 'Procedure not found' });
    }

    res.json(procedure);
  } catch (error) {
    console.error('Error fetching procedure:', error);
    res.status(500).json({ error: 'Failed to fetch procedure', details: error.message });
  }
});

// Create new procedure
router.post('/', auth, async (req, res) => {
  try {
    const {
      patientId,
      procedureType,
      procedureName,
      description,
      priority,
      scheduledTime,
      duration,
      location,
      roomNumber,
      bedNumber,
      supplies,
      instructions,
      preProcedureNotes,
      followUpRequired,
      followUpDate,
      visitId,
      appointmentId
    } = req.body;

    // Validate required fields
    if (!patientId || !procedureType || !procedureName || !description || !scheduledTime) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get patient name
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const patientName = `${patient.firstName} ${patient.lastName}`;

    const procedure = new Procedure({
      patientId,
      patientName,
      procedureType,
      procedureName,
      description,
      priority: priority || 'normal',
      scheduledTime: new Date(scheduledTime),
      duration: duration || 30,
      assignedNurse: req.user.id,
      assignedNurseName: `${req.user.firstName} ${req.user.lastName}`,
      location: location || 'Ward',
      roomNumber,
      bedNumber,
      supplies: supplies || [],
      instructions,
      preProcedureNotes,
      followUpRequired: followUpRequired || false,
      followUpDate: followUpDate ? new Date(followUpDate) : null,
      visitId,
      appointmentId,
      createdBy: req.user.id
    });

    const savedProcedure = await procedure.save();
    
    const populatedProcedure = await Procedure.findById(savedProcedure._id)
      .populate('patientId', 'firstName lastName dateOfBirth')
      .populate('assignedNurse', 'firstName lastName')
      .populate('createdBy', 'firstName lastName');

    // 📱 Send Telegram notification for procedure creation
    try {
      const notificationService = require('../services/notificationService');
      const telegramService = require('../services/telegramService');

      // Initialize telegram service
      await telegramService.initialize();

      if (telegramService.isInitialized) {
        console.log('📱 Sending procedure notification...');

        const procedureNotification = await notificationService.sendNotification(
          'procedure',
          {
            patientId: patient.patientId || patient._id,
            patientName: `${patient.firstName} ${patient.lastName}`,
            age: patient.age,
            gender: patient.gender,
            procedureName: procedureName,
            procedureDate: scheduledTime,
            procedureTime: scheduledTime,
            notes: description || 'No notes provided'
          }
        );

        if (procedureNotification.success) {
          console.log('📱 Procedure notification sent successfully');
        } else {
          console.log('❌ Procedure notification failed:', procedureNotification.message);
        }
      } else {
        console.log('📱 Telegram bot not initialized, skipping procedure notification');
      }
    } catch (telegramError) {
      console.error('❌ Error sending procedure notification:', telegramError);
      // Don't fail procedure creation if notification fails
    }

    res.status(201).json(populatedProcedure);
  } catch (error) {
    console.error('Error creating procedure:', error);
    res.status(500).json({ error: 'Failed to create procedure', details: error.message });
  }
});

// Update procedure
router.put('/:id', auth, async (req, res) => {
  try {
    const procedure = await Procedure.findById(req.params.id);
    
    if (!procedure) {
      return res.status(404).json({ error: 'Procedure not found' });
    }

    // Check if user is authorized to update this procedure
    if (procedure.assignedNurse.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to update this procedure' });
    }

    const updateData = { ...req.body, updatedBy: req.user.id };
    
    // Convert date strings to Date objects
    if (updateData.scheduledTime) {
      updateData.scheduledTime = new Date(updateData.scheduledTime);
    }
    if (updateData.followUpDate) {
      updateData.followUpDate = new Date(updateData.followUpDate);
    }

    const updatedProcedure = await Procedure.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('patientId', 'firstName lastName dateOfBirth')
    .populate('assignedNurse', 'firstName lastName')
    .populate('createdBy', 'firstName lastName')
    .populate('updatedBy', 'firstName lastName');

    res.json(updatedProcedure);
  } catch (error) {
    console.error('Error updating procedure:', error);
    res.status(500).json({ error: 'Failed to update procedure', details: error.message });
  }
});

// Update procedure status
router.patch('/:id/status', auth, async (req, res) => {
  try {
    console.log('🔍 [BACKEND] Received status update request:', {
      procedureId: req.params.id,
      body: req.body
    });

    const { 
      status, 
      postProcedureNotes, 
      complications, 
      amount,
      woundDetails,
      woundAssessment,
      woundCareSupplies,
      treatmentPlan,
      earIrrigationDetails,
      earIrrigationAssessment,
      earIrrigationSupplies,
      earIrrigationPlan
    } = req.body;
    
    const procedure = await Procedure.findById(req.params.id);
    
    if (!procedure) {
      return res.status(404).json({ error: 'Procedure not found' });
    }

    // Check if user is authorized to update this procedure
    if (procedure.assignedNurse.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to update this procedure' });
    }

    const updateData = { status, updatedBy: req.user.id };
    
    // Handle wound assessment data
    if (woundDetails) {
      updateData.woundDetails = woundDetails;
      console.log('🔍 [BACKEND] Adding woundDetails to update:', woundDetails);
    }
    if (woundAssessment) {
      updateData.woundAssessment = woundAssessment;
      console.log('🔍 [BACKEND] Adding woundAssessment to update:', woundAssessment);
    }
    if (woundCareSupplies) {
      updateData.woundCareSupplies = woundCareSupplies;
      console.log('🔍 [BACKEND] Adding woundCareSupplies to update:', woundCareSupplies);
    }
    if (treatmentPlan) {
      updateData.treatmentPlan = treatmentPlan;
      console.log('🔍 [BACKEND] Adding treatmentPlan to update:', treatmentPlan);
    }

    // Handle ear irrigation assessment data
    if (earIrrigationDetails) {
      updateData.earIrrigationDetails = earIrrigationDetails;
      console.log('🔍 [BACKEND] Adding earIrrigationDetails to update:', earIrrigationDetails);
    }
    if (earIrrigationAssessment) {
      updateData.earIrrigationAssessment = earIrrigationAssessment;
      console.log('🔍 [BACKEND] Adding earIrrigationAssessment to update:', earIrrigationAssessment);
    }
    if (earIrrigationSupplies) {
      updateData.earIrrigationSupplies = earIrrigationSupplies;
      console.log('🔍 [BACKEND] Adding earIrrigationSupplies to update:', earIrrigationSupplies);
    }
    if (earIrrigationPlan) {
      updateData.earIrrigationPlan = earIrrigationPlan;
      console.log('🔍 [BACKEND] Adding earIrrigationPlan to update:', earIrrigationPlan);
    }

    console.log('🔍 [BACKEND] Final updateData:', updateData);
    
    console.log('🔍 [BACKEND] About to update procedure with ID:', req.params.id);
    
    if (status === 'completed') {
      updateData.completedTime = new Date();
      if (postProcedureNotes) updateData.postProcedureNotes = postProcedureNotes;
      if (complications) updateData.complications = complications;
      
      // Handle billing information
      let finalAmount = procedure.amount || 0; // Use existing amount from service price
      
      // Only allow admin/reception to override the amount, not nurses
      if (amount && amount > 0 && (req.user.role === 'admin' || req.user.role === 'reception')) {
        finalAmount = amount;
        console.log('🔍 [BACKEND] Admin/Reception overriding amount to:', finalAmount);
      } else if (amount && amount > 0 && req.user.role === 'nurse') {
        console.log('🔍 [BACKEND] Nurse attempted to set amount, but using service price instead');
        // Keep the existing amount from service price
      }
      
      // Set billing status and create notification if there's an amount
      if (finalAmount > 0) {
        updateData.amount = finalAmount;
        updateData.billingStatus = 'pending';
        
        // Create notification for reception about payment
        const Notification = require('../models/Notification');
        try {
          const notification = new Notification({
            type: 'PROCEDURE_PAYMENT',
            title: 'Procedure Payment Required',
            message: `Payment required for ${procedure.procedureName} - Patient: ${procedure.patientName}`,
            // Required sender fields
            senderId: String(req.user._id),
            senderRole: req.user.role,
            // Target reception role
            recipientRole: 'reception',
            recipientId: null, // broadcast to reception
            data: {
              procedureId: procedure._id,
              patientId: procedure.patientId,
              patientName: procedure.patientName,
              procedureName: procedure.procedureName,
              amount: finalAmount,
              currency: 'ETB'
            },
            // Conform to schema enum
            priority: 'medium'
          });
          const savedNotification = await notification.save();
          updateData.paymentNotificationId = savedNotification._id;
          console.log('🔍 [BACKEND] Created payment notification for amount:', finalAmount);
        } catch (notifErr) {
          console.warn('⚠️ [BACKEND] Failed to create payment notification. Proceeding without it:', notifErr.message);
        }
      }
      
      // ✅ DEDUCT INVENTORY for supplies used in the procedure
      if (procedure.supplies && procedure.supplies.length > 0) {
        console.log(`📦 [PROCEDURE] Deducting inventory for ${procedure.supplies.length} supply items`);
        
        const InventoryItem = require('../models/InventoryItem');
        const InventoryTransaction = require('../models/InventoryTransaction');
        
        for (const supply of procedure.supplies) {
          try {
            // Find inventory item by name (case insensitive)
            const inventoryItem = await InventoryItem.findOne({
              name: { $regex: new RegExp(`^${supply.itemName}$`, 'i') },
              isActive: true
            });
            
            if (!inventoryItem) {
              console.log(`⚠️ [PROCEDURE] Inventory item not found: ${supply.itemName}`);
              continue;
            }
            
            const quantityToDeduct = supply.quantity || 1;
            
            // Check if there's enough stock
            if (inventoryItem.quantity < quantityToDeduct) {
              console.log(`⚠️ [PROCEDURE] Insufficient stock for ${supply.itemName}. Available: ${inventoryItem.quantity}, Required: ${quantityToDeduct}`);
              continue;
            }
            
            // Use atomic operation to deduct inventory
            const updatedItem = await InventoryItem.findOneAndUpdate(
              { 
                _id: inventoryItem._id, 
                quantity: { $gte: quantityToDeduct },
                isActive: true
              },
              {
                $inc: { quantity: -quantityToDeduct },
                $set: { updatedBy: req.user.id }
              },
              { new: true }
            );
            
            if (!updatedItem) {
              console.log(`⚠️ [PROCEDURE] Failed to deduct inventory for ${supply.itemName} - concurrent modification or insufficient stock`);
              continue;
            }
            
            const previousQuantity = updatedItem.quantity + quantityToDeduct;
            
            // Create inventory transaction record
            const transaction = new InventoryTransaction({
              transactionType: 'medical-use',
              item: inventoryItem._id,
              quantity: -quantityToDeduct,
              unitCost: inventoryItem.costPrice || 0,
              totalCost: (inventoryItem.costPrice || 0) * quantityToDeduct,
              reason: `Used in procedure: ${procedure.procedureName}`,
              documentReference: procedure._id,
              performedBy: req.user.id,
              patient: procedure.patientId,
              previousQuantity: previousQuantity,
              newQuantity: updatedItem.quantity,
              status: 'completed',
              _skipInventoryUpdate: true // Skip hook - inventory already updated manually
            });
            
            await transaction.save();
            
            console.log(`✅ [PROCEDURE] Deducted ${quantityToDeduct} ${supply.unit || 'units'} of ${supply.itemName}. New quantity: ${updatedItem.quantity}`);
            
          } catch (supplyError) {
            console.error(`❌ [PROCEDURE] Error deducting inventory for ${supply.itemName}:`, supplyError.message);
            // Continue with other supplies even if one fails
          }
        }
      }
      
      // Deduct inventory for wound care supplies if present
      if (woundCareSupplies && woundCareSupplies.additionalSupplies && woundCareSupplies.additionalSupplies.length > 0) {
        console.log(`📦 [PROCEDURE] Deducting inventory for wound care supplies`);
        
        const InventoryItem = require('../models/InventoryItem');
        const InventoryTransaction = require('../models/InventoryTransaction');
        
        for (const supply of woundCareSupplies.additionalSupplies) {
          try {
            const inventoryItem = await InventoryItem.findOne({
              name: { $regex: new RegExp(`^${supply.item}$`, 'i') },
              isActive: true
            });
            
            if (inventoryItem && inventoryItem.quantity >= supply.quantity) {
              const updatedItem = await InventoryItem.findOneAndUpdate(
                { 
                  _id: inventoryItem._id, 
                  quantity: { $gte: supply.quantity },
                  isActive: true
                },
                {
                  $inc: { quantity: -supply.quantity },
                  $set: { updatedBy: req.user.id }
                },
                { new: true }
              );
              
              if (updatedItem) {
                const previousQuantity = updatedItem.quantity + supply.quantity;
                const transaction = new InventoryTransaction({
                  transactionType: 'medical-use',
                  item: inventoryItem._id,
                  quantity: -supply.quantity,
                  unitCost: inventoryItem.costPrice || 0,
                  totalCost: (inventoryItem.costPrice || 0) * supply.quantity,
                  reason: `Used in wound care: ${procedure.procedureName}`,
                  documentReference: procedure._id,
                  performedBy: req.user.id,
                  patient: procedure.patientId,
                  previousQuantity: previousQuantity,
                  newQuantity: updatedItem.quantity,
                  status: 'completed',
                  _skipInventoryUpdate: true
                });
                await transaction.save();
                console.log(`✅ [PROCEDURE] Deducted ${supply.quantity} ${supply.unit || 'units'} of ${supply.item} for wound care`);
              }
            } else {
              console.log(`⚠️ [PROCEDURE] Cannot deduct ${supply.item} - not found or insufficient stock`);
            }
          } catch (supplyError) {
            console.error(`❌ [PROCEDURE] Error deducting wound care supply ${supply.item}:`, supplyError.message);
          }
        }
      }
    }

    const updatedProcedure = await Procedure.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('patientId', 'firstName lastName dateOfBirth')
    .populate('assignedNurse', 'firstName lastName')
    .populate('createdBy', 'firstName lastName')
    .populate('updatedBy', 'firstName lastName');

    res.json(updatedProcedure);
  } catch (error) {
    console.error('🔍 [BACKEND] Error updating procedure status:', error);
    console.error('🔍 [BACKEND] Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ error: 'Failed to update procedure status', details: error.message });
  }
});

// Update billing status
router.patch('/:id/billing', auth, async (req, res) => {
  try {
    const { billingStatus } = req.body;
    
    const procedure = await Procedure.findById(req.params.id);
    
    if (!procedure) {
      return res.status(404).json({ error: 'Procedure not found' });
    }

    // Only reception and admin can update billing status
    if (req.user.role !== 'reception' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to update billing status' });
    }

    const updateData = { billingStatus, updatedBy: req.user.id };

    const updatedProcedure = await Procedure.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('patientId', 'firstName lastName dateOfBirth')
    .populate('assignedNurse', 'firstName lastName')
    .populate('createdBy', 'firstName lastName')
    .populate('updatedBy', 'firstName lastName');

    res.json(updatedProcedure);
  } catch (error) {
    console.error('Error updating billing status:', error);
    res.status(500).json({ error: 'Failed to update billing status', details: error.message });
  }
});

// Delete procedure
router.delete('/:id', auth, async (req, res) => {
  try {
    const procedure = await Procedure.findById(req.params.id);
    
    if (!procedure) {
      return res.status(404).json({ error: 'Procedure not found' });
    }

    // Check if user is authorized to delete this procedure
    if (procedure.assignedNurse.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this procedure' });
    }

    await Procedure.findByIdAndDelete(req.params.id);
    res.json({ message: 'Procedure deleted successfully' });
  } catch (error) {
    console.error('Error deleting procedure:', error);
    res.status(500).json({ error: 'Failed to delete procedure', details: error.message });
  }
});

// Get procedure statistics
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let dateFilter = {};
    
    if (startDate && endDate) {
      dateFilter = {
        scheduledTime: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }

    const stats = await Procedure.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const typeStats = await Procedure.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$procedureType',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      statusStats: stats,
      typeStats: typeStats
    });
  } catch (error) {
    console.error('Error fetching procedure stats:', error);
    res.status(500).json({ error: 'Failed to fetch procedure statistics', details: error.message });
  }
});

// Get patient visit history for wound care progress tracking
router.get('/patient/:patientId/history', auth, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { procedureType = 'wound_care' } = req.query;

    // Get all procedures for this patient of the specified type
    const procedures = await Procedure.find({
      patientId: patientId,
      procedureType: procedureType
    })
    .populate('assignedNurse', 'firstName lastName')
    .populate('createdBy', 'firstName lastName')
    .sort({ scheduledTime: 1 });

    // Group by visit and add visit numbers
    const visitHistory = procedures.map((procedure, index) => ({
      ...procedure.toObject(),
      visitNumber: index + 1,
      isLatest: index === procedures.length - 1
    }));

    // Calculate progress indicators
    const progressData = {
      totalVisits: procedures.length,
      firstVisit: procedures[0] ? procedures[0].scheduledTime : null,
      lastVisit: procedures[procedures.length - 1] ? procedures[procedures.length - 1].scheduledTime : null,
      averageInterval: procedures.length > 1 ? 
        (new Date(procedures[procedures.length - 1].scheduledTime) - new Date(procedures[0].scheduledTime)) / (procedures.length - 1) / (1000 * 60 * 60 * 24) : 0, // days
      improvementTrend: procedures.length > 1 ? 
        procedures.map(p => p.improvementStatus).filter(status => status && status !== 'stable') : [],
      woundTypeProgression: procedures.map(p => ({
        visitNumber: procedures.indexOf(p) + 1,
        woundType: p.woundDetails?.woundType,
        woundStage: p.woundDetails?.woundStage,
        painLevel: p.woundAssessment?.painLevel,
        improvementStatus: p.improvementStatus
      }))
    };

    res.json({
      visitHistory,
      progressData,
      patientName: procedures[0]?.patientName || 'Unknown'
    });
  } catch (error) {
    console.error('Error fetching patient visit history:', error);
    res.status(500).json({ error: 'Failed to fetch patient visit history', details: error.message });
  }
});


// Create follow-up procedures based on wound care frequency
router.post('/:procedureId/create-followup', auth, async (req, res) => {
  try {
    const { procedureId } = req.params;
    const { frequency, duration, startDate } = req.body;

    // Find the original procedure
    const originalProcedure = await Procedure.findById(procedureId);
    if (!originalProcedure) {
      return res.status(404).json({ error: 'Original procedure not found' });
    }

    // Validate frequency
    const validFrequencies = ['daily', 'twice_daily', 'every_other_day', 'weekly', 'as_needed'];
    if (!validFrequencies.includes(frequency)) {
      return res.status(400).json({ error: 'Invalid frequency specified' });
    }

    const followUpProcedures = [];
    const start = new Date(startDate || originalProcedure.scheduledTime);
    const endDate = new Date(start);
    endDate.setDate(endDate.getDate() + (duration || 7));

    let currentDate = new Date(start);
    let sessionNumber = 1;

    // Generate follow-up procedures based on frequency
    while (currentDate <= endDate && sessionNumber <= 100) { // Safety limit
      let sessionsPerDay = 1;
      let daysBetween = 1;

      switch (frequency) {
        case 'twice_daily':
          sessionsPerDay = 2;
          daysBetween = 1;
          break;
        case 'every_other_day':
          sessionsPerDay = 1;
          daysBetween = 2;
          break;
        case 'daily':
          sessionsPerDay = 1;
          daysBetween = 1;
          break;
        case 'weekly':
          sessionsPerDay = 1;
          daysBetween = 7;
          break;
        case 'as_needed':
          sessionsPerDay = 1;
          daysBetween = duration || 7;
          break;
      }

      // Create sessions for the current day
      for (let i = 0; i < sessionsPerDay; i++) {
        const sessionTime = new Date(currentDate);
        
        if (frequency === 'twice_daily') {
          // Morning session at 8:00 AM, Evening session at 8:00 PM
          sessionTime.setHours(i === 0 ? 8 : 20, 0, 0, 0);
        } else {
          // Single session at appropriate time
          sessionTime.setHours(frequency === 'weekly' ? 9 : 14, 0, 0, 0);
        }

        const followUpProcedure = new Procedure({
          patientId: originalProcedure.patientId,
          patientName: originalProcedure.patientName,
          procedureType: originalProcedure.procedureType,
          procedureName: `${originalProcedure.procedureName} - Session ${sessionNumber}`,
          description: `Follow-up wound care session ${sessionNumber} of ${frequency.replace('_', ' ')} treatment`,
          status: 'scheduled',
          priority: originalProcedure.priority,
          scheduledTime: sessionTime,
          duration: originalProcedure.duration,
          assignedNurse: originalProcedure.assignedNurse,
          assignedNurseName: originalProcedure.assignedNurseName,
          location: originalProcedure.location,
          roomNumber: originalProcedure.roomNumber,
          bedNumber: originalProcedure.bedNumber,
          instructions: originalProcedure.instructions,
          preProcedureNotes: `Follow-up session ${sessionNumber} - ${frequency.replace('_', ' ')} wound care`,
          visitId: originalProcedure.visitId,
          appointmentId: originalProcedure.appointmentId,
          visitNumber: sessionNumber,
          previousVisitId: originalProcedure._id,
          createdBy: req.user.id,
          // Copy wound care details from original procedure
          woundDetails: originalProcedure.woundDetails,
          woundAssessment: originalProcedure.woundAssessment,
          woundCareSupplies: originalProcedure.woundCareSupplies,
          treatmentPlan: originalProcedure.treatmentPlan
        });

        const savedProcedure = await followUpProcedure.save();
        followUpProcedures.push(savedProcedure);
        sessionNumber++;
      }

      // Move to next scheduled date
      currentDate.setDate(currentDate.getDate() + daysBetween);
    }

    // Populate the saved procedures
    const populatedProcedures = await Procedure.find({
      _id: { $in: followUpProcedures.map(p => p._id) }
    })
    .populate('patientId', 'firstName lastName dateOfBirth')
    .populate('assignedNurse', 'firstName lastName')
    .populate('createdBy', 'firstName lastName');

    res.status(201).json({
      message: `Created ${followUpProcedures.length} follow-up procedures`,
      procedures: populatedProcedures,
      schedule: {
        frequency,
        duration,
        startDate: start,
        endDate,
        totalSessions: followUpProcedures.length
      }
    });

  } catch (error) {
    console.error('Error creating follow-up procedures:', error);
    res.status(500).json({ 
      error: 'Failed to create follow-up procedures', 
      details: error.message 
    });
  }
});

// Update session status with notes
router.patch('/:procedureId/session/:sessionId/status', auth, async (req, res) => {
  try {
    const { procedureId, sessionId } = req.params;
    const { status, notes, completedBy } = req.body;

    // Validate status
    const validStatuses = ['scheduled', 'completed', 'missed', 'rescheduled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Find and update the procedure
    const procedure = await Procedure.findById(sessionId);
    if (!procedure) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Update the procedure status and notes
    procedure.status = status;
    if (notes) procedure.postProcedureNotes = notes;
    if (completedBy) procedure.completedBy = completedBy;
    if (status === 'completed') procedure.completedAt = new Date();

    await procedure.save();

    res.json({
      message: `Session ${status} successfully`,
      procedure
    });

  } catch (error) {
    console.error('Error updating session status:', error);
    res.status(500).json({ error: 'Failed to update session status', details: error.message });
  }
});

// Reschedule a session
router.patch('/:procedureId/session/:sessionId/reschedule', auth, async (req, res) => {
  try {
    const { procedureId, sessionId } = req.params;
    const { newDate, newTime, reason } = req.body;

    // Find the session
    const procedure = await Procedure.findById(sessionId);
    if (!procedure) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Store the original date for history
    const originalDate = procedure.scheduledTime;
    
    // Create new date from newDate and newTime
    const [hours, minutes] = newTime.split(':');
    const rescheduledTime = new Date(newDate);
    rescheduledTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    // Update the procedure
    procedure.scheduledTime = rescheduledTime;
    procedure.status = 'scheduled';
    procedure.preProcedureNotes = `${procedure.preProcedureNotes || ''}\n\nRescheduled from ${originalDate.toLocaleString()} to ${rescheduledTime.toLocaleString()}${reason ? `. Reason: ${reason}` : ''}`;

    await procedure.save();

    res.json({
      message: 'Session rescheduled successfully',
      procedure,
      originalDate,
      newDate: rescheduledTime
    });

  } catch (error) {
    console.error('Error rescheduling session:', error);
    res.status(500).json({ error: 'Failed to reschedule session', details: error.message });
  }
});

// Get schedule for a procedure
router.get('/:procedureId/schedule', auth, async (req, res) => {
  try {
    const { procedureId } = req.params;

    // Find the main procedure
    const mainProcedure = await Procedure.findById(procedureId)
      .populate('patientId', 'firstName lastName');

    if (!mainProcedure) {
      return res.status(404).json({ error: 'Procedure not found' });
    }

    // Find all related sessions (including follow-ups)
    const allSessions = await Procedure.find({
      $or: [
        { _id: procedureId },
        { previousVisitId: procedureId }
      ]
    }).sort({ scheduledTime: 1 });

    // Transform to schedule format
    const schedule = {
      id: procedureId,
      patientName: `${mainProcedure.patientId.firstName} ${mainProcedure.patientId.lastName}`,
      frequency: mainProcedure.treatmentPlan?.frequency || 'daily',
      duration: mainProcedure.treatmentPlan?.duration || 7,
      startDate: mainProcedure.scheduledTime,
      sessions: allSessions.map((session, index) => ({
        id: session._id,
        date: session.scheduledTime,
        time: session.scheduledTime.toTimeString().slice(0, 5),
        type: getSessionType(session.scheduledTime),
        status: session.status,
        sessionNumber: index + 1,
        notes: session.postProcedureNotes,
        completedBy: session.completedBy,
        completedAt: session.completedAt,
        priority: session.priority || 'normal'
      })),
      totalSessions: allSessions.length,
      completedSessions: allSessions.filter(s => s.status === 'completed').length,
      missedSessions: allSessions.filter(s => s.status === 'missed').length
    };

    // Calculate progress
    schedule.progress = schedule.totalSessions > 0 
      ? Math.round((schedule.completedSessions / schedule.totalSessions) * 100) 
      : 0;

    // Find next session
    schedule.nextSession = schedule.sessions.find(s => 
      s.status === 'scheduled' && new Date(s.date) >= new Date()
    );

    // Get upcoming sessions
    schedule.upcomingSessions = schedule.sessions
      .filter(s => s.status === 'scheduled' && new Date(s.date) >= new Date())
      .slice(0, 10);

    res.json(schedule);

  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({ error: 'Failed to fetch schedule', details: error.message });
  }
});

// Helper function to determine session type based on time
function getSessionType(date) {
  const hour = date.getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

// Clean up duplicate procedures - keep only the original one
router.delete('/cleanup-duplicates', auth, async (req, res) => {
  try {
    console.log('[PROCEDURES CLEANUP] Starting duplicate cleanup...');
    
    // Find all procedures
    const allProcedures = await Procedure.find({}).sort({ createdAt: 1 });
    console.log(`[PROCEDURES CLEANUP] Found ${allProcedures.length} total procedures`);
    
    // Group procedures by patient name and procedure type
    const procedureGroups = {};
    allProcedures.forEach(procedure => {
      const key = `${procedure.patientName}-${procedure.procedureType}-${procedure.procedureName}`;
      if (!procedureGroups[key]) {
        procedureGroups[key] = [];
      }
      procedureGroups[key].push(procedure);
    });
    
    let duplicatesRemoved = 0;
    const duplicatesToRemove = [];
    
    // Identify duplicates (keep the first one, remove the rest)
    Object.values(procedureGroups).forEach(group => {
      if (group.length > 1) {
        console.log(`[PROCEDURES CLEANUP] Found ${group.length} duplicates for: ${group[0].patientName} - ${group[0].procedureName}`);
        
        // Keep the first one (oldest), mark the rest for removal
        const toRemove = group.slice(1);
        duplicatesToRemove.push(...toRemove);
        duplicatesRemoved += toRemove.length;
      }
    });
    
    // Remove duplicates
    if (duplicatesToRemove.length > 0) {
      const idsToRemove = duplicatesToRemove.map(p => p._id);
      await Procedure.deleteMany({ _id: { $in: idsToRemove } });
      console.log(`[PROCEDURES CLEANUP] Removed ${duplicatesRemoved} duplicate procedures`);
    }
    
    res.json({
      success: true,
      message: `Cleanup completed. Removed ${duplicatesRemoved} duplicate procedures.`,
      duplicatesRemoved,
      totalProcedures: allProcedures.length,
      remainingProcedures: allProcedures.length - duplicatesRemoved
    });
    
  } catch (error) {
    console.error('Error cleaning up duplicates:', error);
    res.status(500).json({ 
      error: 'Failed to cleanup duplicates', 
      details: error.message 
    });
  }
});

// Get duplicate procedures info (without removing them)
router.get('/duplicates-info', auth, async (req, res) => {
  try {
    const allProcedures = await Procedure.find({}).sort({ createdAt: 1 });
    
    // Group procedures by patient name and procedure type
    const procedureGroups = {};
    allProcedures.forEach(procedure => {
      const key = `${procedure.patientName}-${procedure.procedureType}-${procedure.procedureName}`;
      if (!procedureGroups[key]) {
        procedureGroups[key] = [];
      }
      procedureGroups[key].push(procedure);
    });
    
    const duplicates = [];
    Object.values(procedureGroups).forEach(group => {
      if (group.length > 1) {
        duplicates.push({
          patientName: group[0].patientName,
          procedureName: group[0].procedureName,
          procedureType: group[0].procedureType,
          count: group.length,
          procedures: group.map(p => ({
            id: p._id,
            createdAt: p.createdAt,
            status: p.status,
            scheduledTime: p.scheduledTime
          }))
        });
      }
    });
    
    res.json({
      success: true,
      duplicates,
      totalDuplicates: duplicates.reduce((sum, dup) => sum + dup.count - 1, 0)
    });
    
  } catch (error) {
    console.error('Error getting duplicates info:', error);
    res.status(500).json({ 
      error: 'Failed to get duplicates info', 
      details: error.message 
    });
  }
});

// Create procedures from existing paid service requests
router.post('/create-from-service-requests', auth, async (req, res) => {
  try {
    const { createProceduresFromPaidServiceRequests, createProcedureForPatient } = require('../utils/createProceduresFromServiceRequests');
    
    const { patientName } = req.body;
    
    let result;
    if (patientName) {
      // Create procedures for a specific patient
      result = await createProcedureForPatient(patientName);
    } else {
      // Create procedures for all patients with paid wound care services
      result = await createProceduresFromPaidServiceRequests();
    }
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
    
  } catch (error) {
    console.error('Error creating procedures from service requests:', error);
    res.status(500).json({ 
      error: 'Failed to create procedures from service requests', 
      details: error.message 
    });
  }
});


module.exports = router; 