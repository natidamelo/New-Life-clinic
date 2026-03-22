const Referral = require('../models/Referral');
const Patient = require('../models/Patient');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const { logger } = require('../middleware/errorHandler');

/**
 * Create a new referral
 */
const createReferral = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      patientId,
      patientName,
      patientAge,
      patientGender,
      patientAddress,
      patientPhone,
      medicalRecordNumber,
      referredToDoctorName,
      referredToClinic,
      referredToPhone,
      referredToEmail,
      referredToAddress,
      referralDate,
      referralTime,
      urgency,
      chiefComplaint,
      historyOfPresentIllness,
      pastMedicalHistory,
      medications,
      allergies,
      physicalExamination,
      diagnosis,
      reasonForReferral,
      requestedInvestigations,
      requestedTreatments,
      followUpInstructions,
      additionalNotes,
      status
    } = req.body;

    // Get doctor information from authenticated user
    const doctor = await User.findById(req.user._id);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    // Verify patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Generate referral number
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    const count = await Referral.countDocuments();
    const referralNumber = `REF${year}${String(count + 1).padStart(4, '0')}${timestamp}`;

    // Create referral
    const referral = new Referral({
      referralNumber,
      patientId,
      patientName: patientName || `${patient.firstName} ${patient.lastName}`,
      patientDisplayId: patient.patientId,
      patientAge: patientAge || patient.age,
      patientGender: patientGender || (patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1).toLowerCase() : 'Other'),
      patientAddress: patientAddress || patient.address,
      patientPhone: patientPhone || patient.contactNumber,
      medicalRecordNumber: medicalRecordNumber || patient.medicalRecordNumber || patient.patientId,
      referringDoctorId: req.user._id,
      referringDoctorName: `Dr. ${doctor.firstName} ${doctor.lastName}`,
      referringClinicName: 'New Life Medium Clinic',
      referringClinicPhone: '215925959219',
      referringClinicEmail: 'newlifemediumclinic@gmail.com',
      referringClinicAddress: 'Lafto, Beside Kebron guest house',
      referredToDoctorName,
      referredToClinic,
      referredToPhone,
      referredToEmail,
      referredToAddress,
      referralDate: referralDate ? new Date(referralDate) : new Date(),
      referralTime: referralTime || new Date().toLocaleTimeString(),
      urgency: urgency || 'routine',
      chiefComplaint,
      historyOfPresentIllness,
      pastMedicalHistory,
      medications,
      allergies,
      physicalExamination,
      diagnosis,
      reasonForReferral,
      requestedInvestigations,
      requestedTreatments,
      followUpInstructions,
      additionalNotes,
      status: status || 'Sent',
      createdBy: req.user._id
    });

    await referral.save();

    logger.info(`Referral created: ${referral.referralNumber} for patient: ${patientName}`);

    res.status(201).json({
      success: true,
      message: 'Referral created successfully',
      data: referral
    });

  } catch (error) {
    logger.error('Error creating referral:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get all referrals with pagination and filtering
 */
const getReferrals = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      patientId,
      doctorId,
      status,
      urgency,
      startDate,
      endDate,
      search
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (patientId) filter.patientId = patientId;
    if (doctorId) filter.referringDoctorId = doctorId;
    if (status) filter.status = status;
    if (urgency) filter.urgency = urgency;
    
    if (startDate || endDate) {
      filter.referralDate = {};
      if (startDate) filter.referralDate.$gte = new Date(startDate);
      if (endDate) filter.referralDate.$lte = new Date(endDate);
    }

    if (search) {
      filter.$or = [
        { patientName: { $regex: search, $options: 'i' } },
        { referringDoctorName: { $regex: search, $options: 'i' } },
        { referredToDoctorName: { $regex: search, $options: 'i' } },
        { referredToClinic: { $regex: search, $options: 'i' } },
        { referralNumber: { $regex: search, $options: 'i' } },
        { diagnosis: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query with pagination
    const referrals = await Referral.find(filter)
      .populate('patientId', 'firstName lastName age gender contactNumber')
      .populate('referringDoctorId', 'firstName lastName specialization')
      .populate('createdBy', 'firstName lastName')
      .sort({ referralDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Referral.countDocuments(filter);

    res.json({
      success: true,
      data: referrals,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    logger.error('Error fetching referrals:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get a single referral by ID
 */
const getReferralById = async (req, res) => {
  try {
    const { id } = req.params;

    const referral = await Referral.findById(id)
      .populate('patientId', 'firstName lastName age gender contactNumber address')
      .populate('referringDoctorId', 'firstName lastName specialization')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    if (!referral) {
      return res.status(404).json({
        success: false,
        message: 'Referral not found'
      });
    }

    res.json({
      success: true,
      data: referral
    });

  } catch (error) {
    logger.error('Error fetching referral:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Update a referral
 */
const updateReferral = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const referral = await Referral.findById(id);
    if (!referral) {
      return res.status(404).json({
        success: false,
        message: 'Referral not found'
      });
    }

    // Update the referral
    Object.assign(referral, updateData);
    referral.updatedBy = req.user._id;

    await referral.save();

    logger.info(`Referral updated: ${referral.referralNumber}`);

    res.json({
      success: true,
      message: 'Referral updated successfully',
      data: referral
    });

  } catch (error) {
    logger.error('Error updating referral:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Delete a referral (soft delete by changing status)
 */
const deleteReferral = async (req, res) => {
  try {
    const { id } = req.params;

    const referral = await Referral.findById(id);
    if (!referral) {
      return res.status(404).json({
        success: false,
        message: 'Referral not found'
      });
    }

    // Soft delete by changing status
    referral.status = 'Cancelled';
    referral.updatedBy = req.user._id;
    await referral.save();

    logger.info(`Referral cancelled: ${referral.referralNumber}`);

    res.json({
      success: true,
      message: 'Referral cancelled successfully'
    });

  } catch (error) {
    logger.error('Error deleting referral:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get referrals for a specific patient
 */
const getPatientReferrals = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { status, limit = 10 } = req.query;

    const filter = { patientId };
    if (status) filter.status = status;

    const referrals = await Referral.find(filter)
      .populate('referringDoctorId', 'firstName lastName specialization')
      .sort({ referralDate: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: referrals
    });

  } catch (error) {
    logger.error('Error fetching patient referrals:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get referrals by doctor
 */
const getDoctorReferrals = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { status, urgency, startDate, endDate, limit = 10 } = req.query;

    const filter = { referringDoctorId: doctorId };
    if (status) filter.status = status;
    if (urgency) filter.urgency = urgency;
    
    if (startDate || endDate) {
      filter.referralDate = {};
      if (startDate) filter.referralDate.$gte = new Date(startDate);
      if (endDate) filter.referralDate.$lte = new Date(endDate);
    }

    const referrals = await Referral.find(filter)
      .populate('patientId', 'firstName lastName age gender')
      .sort({ referralDate: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: referrals
    });

  } catch (error) {
    logger.error('Error fetching doctor referrals:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get referral statistics
 */
const getReferralStats = async (req, res) => {
  try {
    const { startDate, endDate, doctorId } = req.query;

    const filter = {};
    if (doctorId) filter.referringDoctorId = doctorId;
    
    if (startDate || endDate) {
      filter.referralDate = {};
      if (startDate) filter.referralDate.$gte = new Date(startDate);
      if (endDate) filter.referralDate.$lte = new Date(endDate);
    }

    const stats = await Referral.getReferralStats(filter);

    const topReferredToClinics = await Referral.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$referredToClinic',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        overview: stats[0] || { 
          total: 0, 
          sent: 0, 
          received: 0, 
          completed: 0, 
          cancelled: 0,
          routine: 0,
          urgent: 0,
          emergency: 0
        },
        topReferredToClinics
      }
    });

  } catch (error) {
    logger.error('Error fetching referral stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Generate printable referral data
 */
const generatePrintableReferral = async (req, res) => {
  try {
    const { id } = req.params;

    const referral = await Referral.findById(id)
      .populate('patientId', 'firstName lastName age gender contactNumber address')
      .populate('referringDoctorId', 'firstName lastName specialization')
      .populate('createdBy', 'firstName lastName');

    if (!referral) {
      return res.status(404).json({
        success: false,
        message: 'Referral not found'
      });
    }

    // Format the referral data for printing
    const printableData = {
      referralNumber: referral.referralNumber,
      referralDate: referral.referralDate.toLocaleDateString(),
      referralTime: referral.referralTime,
      urgency: referral.urgency,
      patient: {
        name: referral.patientName,
        id: referral.patientDisplayId,
        age: referral.patientAge,
        gender: referral.patientGender,
        address: referral.patientAddress,
        phone: referral.patientPhone,
        medicalRecordNumber: referral.medicalRecordNumber
      },
      referringDoctor: {
        name: referral.referringDoctorName,
        clinic: referral.referringClinicName,
        phone: referral.referringClinicPhone,
        email: referral.referringClinicEmail,
        address: referral.referringClinicAddress
      },
      referredTo: {
        doctor: referral.referredToDoctorName,
        clinic: referral.referredToClinic,
        phone: referral.referredToPhone,
        email: referral.referredToEmail,
        address: referral.referredToAddress
      },
      medical: {
        chiefComplaint: referral.chiefComplaint,
        historyOfPresentIllness: referral.historyOfPresentIllness,
        pastMedicalHistory: referral.pastMedicalHistory,
        medications: referral.medications,
        allergies: referral.allergies,
        physicalExamination: referral.physicalExamination,
        diagnosis: referral.diagnosis,
        reasonForReferral: referral.reasonForReferral,
        requestedInvestigations: referral.requestedInvestigations,
        requestedTreatments: referral.requestedTreatments,
        followUpInstructions: referral.followUpInstructions
      },
      additionalNotes: referral.additionalNotes,
      status: referral.status
    };

    res.json({
      success: true,
      data: printableData
    });

  } catch (error) {
    logger.error('Error generating printable referral:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  createReferral,
  getReferrals,
  getReferralById,
  updateReferral,
  deleteReferral,
  getPatientReferrals,
  getDoctorReferrals,
  getReferralStats,
  generatePrintableReferral
};

