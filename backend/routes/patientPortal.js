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
    // 1. Fetch from standalone VitalSigns collection
    const standaloneVitals = await VitalSigns.find({
      patientId: req.user.patient,
      isActive: true
    }).sort({ measurementDate: -1 });

    const formattedStandalone = standaloneVitals.map(v => ({
      systolic: v.systolic,
      diastolic: v.diastolic,
      pulse: v.pulse,
      temperature: v.temperature,
      weight: v.weight,
      height: v.height,
      bmi: v.bmi,
      spo2: v.spo2,
      respiratoryRate: v.respiratoryRate,
      bloodSugar: v.bloodSugar,
      notes: v.notes,
      measuredByName: v.measuredByName || 'Clinical Nurse',
      measurementDate: v.measurementDate
    }));

    // 2. Fetch from MedicalRecord consult vital signs
    const medicalRecords = await MedicalRecord.find({
      patient: req.user.patient
    }).populate('doctorId', 'firstName lastName').sort({ visitDate: -1 });

    const recordVitals = [];
    for (const record of medicalRecords) {
      if (record.vitalSigns && (record.vitalSigns.bloodPressure || record.vitalSigns.temperature || record.vitalSigns.heartRate)) {
        // Parse BP (e.g. "120/80")
        let systolic = undefined;
        let diastolic = undefined;
        if (record.vitalSigns.bloodPressure) {
          const parts = record.vitalSigns.bloodPressure.split('/');
          if (parts.length === 2) {
            systolic = parseFloat(parts[0]);
            diastolic = parseFloat(parts[1]);
          }
        }

        // Parse temperature (convert Fahrenheit > 45 to Celsius)
        let temp = record.vitalSigns.temperature ? parseFloat(record.vitalSigns.temperature) : undefined;
        if (temp && temp > 45) {
          temp = Math.round(((temp - 32) * 5 / 9) * 10) / 10;
        }

        recordVitals.push({
          systolic,
          diastolic,
          pulse: record.vitalSigns.heartRate ? parseFloat(record.vitalSigns.heartRate) : undefined,
          temperature: temp,
          weight: record.vitalSigns.weight ? parseFloat(record.vitalSigns.weight) : undefined,
          height: record.vitalSigns.height ? parseFloat(record.vitalSigns.height) : undefined,
          bmi: record.vitalSigns.bmi ? parseFloat(record.vitalSigns.bmi) : undefined,
          spo2: record.vitalSigns.oxygenSaturation ? parseFloat(record.vitalSigns.oxygenSaturation) : undefined,
          respiratoryRate: record.vitalSigns.respiratoryRate ? parseFloat(record.vitalSigns.respiratoryRate) : undefined,
          measuredByName: record.doctorName || (record.doctorId ? `Dr. ${record.doctorId.lastName}` : 'Consulting Physician'),
          measurementDate: record.visitDate,
          notes: record.notes || 'Recorded during consultation'
        });
      }
    }

    // 3. Merge both lists and sort by date descending
    const allVitals = [...formattedStandalone, ...recordVitals].sort((a, b) => 
      new Date(b.measurementDate).getTime() - new Date(a.measurementDate).getTime()
    );

    res.status(200).json({
      success: true,
      data: allVitals
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
 * @route   GET /api/patient-portal/treatments
 * @desc    Get patient clinic medications and injections (Nurse Tasks)
 * @access  Private (Patient only)
 */
router.get('/treatments', async (req, res, next) => {
  try {
    const NurseTask = require('../models/NurseTask');
    const tasks = await NurseTask.find({
      patientId: req.user.patient
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: tasks
    });
  } catch (error) {
    logger.error('Failed to fetch patient portal clinic treatments', { error: error.message });
    next(error);
  }
});

/**
 * @route   GET /api/patient-portal/prescriptions
 * @desc    Get patient prescriptions
 * @access  Private (Patient only)
 */
router.get('/prescriptions', async (req, res, next) => {
  try {
    const Prescription = require('../models/Prescription');
    const User = require('../models/User'); // Required so schema registers
    const prescriptions = await Prescription.find({
      patient: req.user.patient
    }).populate('doctor', 'firstName lastName specialization')
      .sort({ datePrescribed: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      data: prescriptions
    });
  } catch (error) {
    logger.error('Failed to fetch patient portal prescriptions', { error: error.message });
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
