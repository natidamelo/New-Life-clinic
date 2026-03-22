const patient = require('../models/patient');

// @desc    Get all patient
// @route   GET /api/patient
// @access  Private
const getpatients = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'patient endpoint working',
      data: []
    });
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get patient by ID
// @route   GET /api/patient/:id
// @access  Private
const getpatientById = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'patient by ID endpoint working',
      data: null
    });
  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Create new patient
// @route   POST /api/patient
// @access  Private
const createpatient = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'patient created successfully'
    });
  } catch (error) {
    console.error('Error creating patient:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update patient
// @route   PUT /api/patient/:id
// @access  Private
const updatepatient = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'patient updated successfully'
    });
  } catch (error) {
    console.error('Error updating patient:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Delete patient
// @route   DELETE /api/patient/:id
// @access  Private
const deletepatient = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'patient deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting patient:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

module.exports = {
  getpatients,
  getpatientById,
  createpatient,
  updatepatient,
  deletepatient
};
