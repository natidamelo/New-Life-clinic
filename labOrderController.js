const asyncHandler = require('express-async-handler');
const LabOrder = require('../models/LabOrder');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all lab orders
// @route   GET /api/lab-orders
// @access  Admin/Lab
exports.getLabOrders = asyncHandler(async (req, res) => {
  try {
    const labOrders = await LabOrder.find({})
      .populate('patientId', 'firstName lastName')
      .populate('orderingDoctorId', 'firstName lastName')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: labOrders.length,
      data: labOrders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving lab orders',
      error: error.message
    });
  }
});

// @desc    Create new lab order
// @route   POST /api/lab-orders
// @access  Admin/Doctor
exports.createLabOrder = asyncHandler(async (req, res) => {
  try {
    const labOrder = await LabOrder.create({
      ...req.body,
      orderingDoctorId: req.user._id
    });
    
    res.status(201).json({
      success: true,
      data: labOrder
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating lab order',
      error: error.message
    });
  }
});

// @desc    Update lab order
// @route   PUT /api/lab-orders/:id
// @access  Admin/Lab
exports.updateLabOrder = asyncHandler(async (req, res) => {
  try {
    const labOrder = await LabOrder.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!labOrder) {
      return res.status(404).json({
        success: false,
        message: 'Lab order not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: labOrder
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating lab order',
      error: error.message
    });
  }
});

// @desc    Delete lab order
// @route   DELETE /api/lab-orders/:id
// @access  Admin
exports.deleteLabOrder = asyncHandler(async (req, res) => {
  try {
    const labOrder = await LabOrder.findByIdAndDelete(req.params.id);
    
    if (!labOrder) {
      return res.status(404).json({
        success: false,
        message: 'Lab order not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Lab order deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting lab order',
      error: error.message
    });
  }
}); 