const nurse = require('../models/nurse');

// @desc    Get all nurse
// @route   GET /api/nurse
// @access  Private
const getnurses = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'nurse endpoint working',
      data: []
    });
  } catch (error) {
    console.error('Error fetching nurses:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get nurse by ID
// @route   GET /api/nurse/:id
// @access  Private
const getnurseById = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'nurse by ID endpoint working',
      data: null
    });
  } catch (error) {
    console.error('Error fetching nurse:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Create new nurse
// @route   POST /api/nurse
// @access  Private
const createnurse = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'nurse created successfully'
    });
  } catch (error) {
    console.error('Error creating nurse:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update nurse
// @route   PUT /api/nurse/:id
// @access  Private
const updatenurse = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'nurse updated successfully'
    });
  } catch (error) {
    console.error('Error updating nurse:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Delete nurse
// @route   DELETE /api/nurse/:id
// @access  Private
const deletenurse = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'nurse deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting nurse:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

module.exports = {
  getnurses,
  getnurseById,
  createnurse,
  updatenurse,
  deletenurse
};
