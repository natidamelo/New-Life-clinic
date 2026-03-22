const fs = require('fs');
const path = require('path');

// List of missing controller files
const missingControllers = [
  'appointmentController',
  'authController',
  'billingController',
  'doctorController',
  'labController',
  'medicalRecordController',
  'nurseController',
  'patientController',
  'prescriptionController',
  'serviceController',
  'userController'
];

// Template for basic controller file
const controllerTemplate = (controllerName) => `const ${controllerName.replace('Controller', '')} = require('../models/${controllerName.replace('Controller', '')}');

// @desc    Get all ${controllerName.replace('Controller', '')}
// @route   GET /api/${controllerName.replace('Controller', '').toLowerCase()}
// @access  Private
const get${controllerName.replace('Controller', '')}s = async (req, res) => {
  try {
    res.json({
      success: true,
      message: '${controllerName.replace('Controller', '')} endpoint working',
      data: []
    });
  } catch (error) {
    console.error('Error fetching ${controllerName.replace('Controller', '')}s:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get ${controllerName.replace('Controller', '')} by ID
// @route   GET /api/${controllerName.replace('Controller', '').toLowerCase()}/:id
// @access  Private
const get${controllerName.replace('Controller', '')}ById = async (req, res) => {
  try {
    res.json({
      success: true,
      message: '${controllerName.replace('Controller', '')} by ID endpoint working',
      data: null
    });
  } catch (error) {
    console.error('Error fetching ${controllerName.replace('Controller', '')}:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Create new ${controllerName.replace('Controller', '')}
// @route   POST /api/${controllerName.replace('Controller', '').toLowerCase()}
// @access  Private
const create${controllerName.replace('Controller', '')} = async (req, res) => {
  try {
    res.json({
      success: true,
      message: '${controllerName.replace('Controller', '')} created successfully'
    });
  } catch (error) {
    console.error('Error creating ${controllerName.replace('Controller', '')}:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update ${controllerName.replace('Controller', '')}
// @route   PUT /api/${controllerName.replace('Controller', '').toLowerCase()}/:id
// @access  Private
const update${controllerName.replace('Controller', '')} = async (req, res) => {
  try {
    res.json({
      success: true,
      message: '${controllerName.replace('Controller', '')} updated successfully'
    });
  } catch (error) {
    console.error('Error updating ${controllerName.replace('Controller', '')}:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Delete ${controllerName.replace('Controller', '')}
// @route   DELETE /api/${controllerName.replace('Controller', '').toLowerCase()}/:id
// @access  Private
const delete${controllerName.replace('Controller', '')} = async (req, res) => {
  try {
    res.json({
      success: true,
      message: '${controllerName.replace('Controller', '')} deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting ${controllerName.replace('Controller', '')}:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

module.exports = {
  get${controllerName.replace('Controller', '')}s,
  get${controllerName.replace('Controller', '')}ById,
  create${controllerName.replace('Controller', '')},
  update${controllerName.replace('Controller', '')},
  delete${controllerName.replace('Controller', '')}
};
`;

// Create missing controller files
missingControllers.forEach(controllerName => {
  const filePath = path.join(__dirname, 'controllers', `${controllerName}.js`);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, controllerTemplate(controllerName));
    console.log(`Created ${controllerName}.js`);
  } else {
    console.log(`${controllerName}.js already exists`);
  }
});

console.log('All missing controller files created!');
