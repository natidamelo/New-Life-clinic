const express = require('express');
const router = express.Router();
const labOrderController = require('../controllers/labOrderController');
const { auth, checkRole } = require('../middleware/auth');

// Get all lab orders - allow admin, lab, and doctor roles
router.get('/', auth, checkRole('admin', 'lab', 'doctor'), labOrderController.getLabOrders);

// GET pending lab orders for reception - MUST be before /:id route
router.get('/pending-for-reception', async (req, res) => {
  try {
    console.log('Fetching pending lab orders for reception');
    
    const LabOrder = require('../models/LabOrder');
    const Patient = require('../models/Patient');
    
    const pendingLabOrders = await LabOrder.find({
      $and: [
        // Must be pending payment
        {
          $or: [
            { paymentStatus: { $in: ['pending', 'unpaid'] } },
            { paymentStatus: { $exists: false } },
            { 
              $and: [
                { status: { $in: ['Pending Payment', 'Ordered'] } },
                { paymentStatus: { $ne: 'paid' } }
              ]
            }
          ]
        }
      ]
    })
    .populate('patientId', 'firstName lastName patientId') // Populate patientId field
    .populate('patient', 'firstName lastName patientId') // Populate patient field
    .populate('orderingDoctorId', 'firstName lastName')
    .sort({ createdAt: -1 })
    .limit(50);
    
    console.log(`Found ${pendingLabOrders.length} pending lab orders for reception`);
    
    // Transform the data to ensure consistent patient information
    const transformedOrders = await Promise.all(pendingLabOrders.map(async (order) => {
      let patientData = order.patientId || order.patient;
      
      // If populate didn't work, manually fetch patient data
      if (!patientData || !patientData.firstName) {
        const patientId = order.patient || order.patientId;
        if (patientId && typeof patientId === 'object' && patientId._id) {
          patientData = await Patient.findById(patientId._id).select('firstName lastName patientId');
        } else if (patientId && typeof patientId === 'string' && patientId.startsWith('P')) {
          // If it's a patient ID string, find by patientId
          patientData = await Patient.findOne({ patientId: patientId }).select('firstName lastName patientId');
        }
      }
      
      return {
        ...order.toObject(),
        patient: patientData, // Use whichever patient field has data
        patientId: patientData?._id || order.patientId // Ensure patientId is available
      };
    }));
    
    res.json(transformedOrders);
  } catch (error) {
    console.error('Error fetching pending lab orders:', error);
    res.status(500).json({ 
      message: 'Error fetching pending lab orders', 
      error: error.message 
    });
  }
});

// Create lab order(s) - handles both single and bulk creation
router.post('/', auth, checkRole('admin', 'doctor'), async (req, res) => {
  try {
    // Check if this is a bulk request (has tests array) or individual request
    if (req.body.tests && Array.isArray(req.body.tests)) {
      // Handle bulk lab order creation
      console.log('Processing bulk lab order request');
      return await labOrderController.createBulkLabOrders(req, res);
    } else {
      // Handle individual lab order creation
      console.log('Processing individual lab order request');
      return await labOrderController.createLabOrder(req, res);
    }
  } catch (error) {
    console.error('Error in lab order route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get a specific lab order by ID
router.get('/:id', auth, checkRole('admin', 'lab', 'doctor'), labOrderController.getLabOrderById);

// Update a lab order
router.put('/:id', auth, checkRole('admin', 'lab'), labOrderController.updateLabOrder);

// Delete a lab order
router.delete('/:id', auth, checkRole('admin', 'lab'), labOrderController.deleteLabOrder);

module.exports = router; 
