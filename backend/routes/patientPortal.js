const express = require('express');
const router = express.Router();
const Patient = require('../models/Patient');
const VitalSigns = require('../models/VitalSigns');
const LabOrder = require('../models/LabOrder');
const MedicalRecord = require('../models/MedicalRecord');
const User = require('../models/User');
const { logger } = require('../middleware/errorHandler');

/**
 * Middleware to verify that the logged-in user is a patient and has a linked patient record
 */
const verifyPatient = (req, res, next) => {
  if (req.user.role !== 'patient' || !req.user.patient) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Only patients with linked clinical records can access this portal.'
    });
  }
  next();
};

router.use(verifyPatient);

/**
 * @route   GET /api/patient-portal/profile
 * @desc    Get patient profile and linked user details
 * @access  Private (Patient only)
 */
router.get('/profile', async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.user.patient);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Clinical patient record not found.'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: req.user._id,
          username: req.user.username,
          email: req.user.email,
          firstName: req.user.firstName,
          lastName: req.user.lastName
        },
        patient
      }
    });
  } catch (error) {
    logger.error('Failed to fetch patient portal profile', { error: error.message });
    next(error);
  }
});

/**
 * @route   GET /api/patient-portal/vitals
 * @desc    Get patient vital signs measurement history
 * @access  Private (Patient only)
 */
router.get('/vitals', async (req, res, next) => {
  try {
    const vitalsList = await VitalSigns.find({
      patientId: req.user.patient,
      isActive: true
    }).sort({ measurementDate: -1 });

    res.status(200).json({
      success: true,
      data: vitalsList
    });
  } catch (error) {
    logger.error('Failed to fetch patient portal vitals', { error: error.message });
    next(error);
  }
});

/**
 * @route   GET /api/patient-portal/lab-results
 * @desc    Get patient lab test orders and results
 * @access  Private (Patient only)
 */
router.get('/lab-results', async (req, res, next) => {
  try {
    const labOrders = await LabOrder.find({
      patient: req.user.patient
    }).populate('orderingDoctorId', 'firstName lastName specialization')
      .sort({ orderDateTime: -1 });

    res.status(200).json({
      success: true,
      data: labOrders
    });
  } catch (error) {
    logger.error('Failed to fetch patient portal lab results', { error: error.message });
    next(error);
  }
});

/**
 * @route   GET /api/patient-portal/records
 * @desc    Get patient medical records, consultation notes, and recommendations
 * @access  Private (Patient only)
 */
router.get('/records', async (req, res, next) => {
  try {
    const medicalRecords = await MedicalRecord.find({
      patient: req.user.patient,
      status: 'Finalized',
      isDeleted: false
    }).populate('doctorId', 'firstName lastName specialization')
      .sort({ visitDate: -1 });

    res.status(200).json({
      success: true,
      data: medicalRecords
    });
  } catch (error) {
    logger.error('Failed to fetch patient portal medical records', { error: error.message });
    next(error);
  }
});

/**
 * @route   PUT /api/patient-portal/profile
 * @desc    Update patient contact information
 * @access  Private (Patient only)
 */
router.put('/profile', async (req, res, next) => {
  try {
    const { contactNumber, email, address } = req.body;

    const patient = await Patient.findById(req.user.patient);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Clinical patient record not found.'
      });
    }

    if (contactNumber) patient.contactNumber = contactNumber;
    if (email) patient.email = email.toLowerCase();
    if (address) patient.address = address;

    await patient.save();

    // Also update email in User record if changed
    if (email && email.toLowerCase() !== req.user.email) {
      const user = await User.findById(req.user._id);
      if (user) {
        user.email = email.toLowerCase();
        await user.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: patient
    });
  } catch (error) {
    logger.error('Failed to update patient portal profile', { error: error.message });
    next(error);
  }
});

module.exports = router;
