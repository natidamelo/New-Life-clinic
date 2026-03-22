const mongoose = require('mongoose');
const MedicalCertificate = require('../models/MedicalCertificate');
const Patient = require('../models/Patient');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const { logger } = require('../middleware/errorHandler');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for signature uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/signatures';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'signature-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for signatures'), false);
    }
  }
});

/**
 * Create a new medical certificate
 */
const createMedicalCertificate = async (req, res) => {
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
      patientDisplayId,
      patientName,
      patientAge,
      patientGender,
      patientAddress,
      patientPhone,
      diagnosis,
      symptoms,
      treatment,
      prescription,
      recommendations,
      followUpDate,
      restPeriod,
      workRestriction,
      certificateType,
      validFrom,
      validUntil,
      clinicName,
      clinicAddress,
      clinicPhone,
      clinicLicense,
      notes
    } = req.body;

    // Handle digital signature file upload
    let digitalSignatureData = null;
    if (req.file) {
      digitalSignatureData = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        uploadedAt: new Date()
      };
    }

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

    // Generate certificate number
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    const count = await MedicalCertificate.countDocuments();
    const certificateNumber = `MC${year}${String(count + 1).padStart(4, '0')}${timestamp}`;

    // Create medical certificate
    const medicalCertificate = new MedicalCertificate({
      certificateNumber,
      patientId,
      patientDisplayId: patientDisplayId || patient.patientId,
      patientName: patientName || `${patient.firstName} ${patient.lastName}`,
      patientAge: patientAge || patient.age,
      patientGender: patientGender || (patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1).toLowerCase() : 'Other'),
      patientAddress: patientAddress || patient.address,
      patientPhone: patientPhone || patient.contactNumber,
      doctorId: req.user._id,
      doctorName: `${doctor.firstName} ${doctor.lastName}`,
      doctorLicenseNumber: doctor.licenseNumber || 'N/A',
      doctorSpecialization: doctor.specialization || 'General Practice',
      diagnosis,
      symptoms,
      treatment,
      prescription,
      recommendations,
      followUpDate: followUpDate ? new Date(followUpDate) : null,
      restPeriod,
      workRestriction,
      certificateType: certificateType || 'Medical Certificate',
      validFrom: validFrom ? new Date(validFrom) : new Date(),
      validUntil: validUntil ? new Date(validUntil) : null,
      clinicName: clinicName || 'New Life Medium Clinic PLC',
      clinicAddress: clinicAddress || 'Lafto, beside Kebron Guest House, Addis Ababa, Ethiopia',
      clinicPhone: clinicPhone || '+251925959219',
      clinicLicense: clinicLicense || 'CL-001',
      notes,
      digitalSignature: digitalSignatureData,
      createdBy: req.user._id,
      status: 'Issued'
    });

    await medicalCertificate.save();

    logger.info(`Medical certificate created: ${medicalCertificate.certificateNumber} for patient: ${patientName}`);

    res.status(201).json({
      success: true,
      message: 'Medical certificate created successfully',
      data: medicalCertificate
    });

  } catch (error) {
    logger.error('Error creating medical certificate:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get all medical certificates with pagination and filtering
 */
const getMedicalCertificates = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      patientId,
      doctorId,
      status,
      certificateType,
      startDate,
      endDate,
      search
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (patientId) filter.patientId = patientId;
    if (doctorId) filter.doctorId = doctorId;
    if (status) filter.status = status;
    if (certificateType) filter.certificateType = certificateType;
    
    if (startDate || endDate) {
      filter.dateIssued = {};
      if (startDate) filter.dateIssued.$gte = new Date(startDate);
      if (endDate) filter.dateIssued.$lte = new Date(endDate);
    }

    if (search) {
      filter.$or = [
        { patientName: { $regex: search, $options: 'i' } },
        { doctorName: { $regex: search, $options: 'i' } },
        { certificateNumber: { $regex: search, $options: 'i' } },
        { diagnosis: { $regex: search, $options: 'i' } }
      ];
    }

    // Normalize pagination values
    const pageNum = parseInt(page) || 1;
    let perPage = parseInt(limit);
    if (isNaN(perPage) || perPage < 0) {
      perPage = 10;
    }

    // Calculate pagination (when perPage is 0, we return all records)
    const skip = perPage === 0 ? 0 : (pageNum - 1) * perPage;

    // Build base query
    let query = MedicalCertificate.find(filter)
      .populate('patientId', 'name age gender phone')
      .populate('doctorId', 'name specialization licenseNumber')
      .populate('createdBy', 'name')
      .sort({ dateIssued: -1 });

    // Apply pagination only when perPage is not zero
    if (perPage !== 0) {
      query = query.skip(skip).limit(perPage);
    }

    const certificates = await query;

    const total = await MedicalCertificate.countDocuments(filter);

    res.json({
      success: true,
      data: certificates,
      pagination: {
        current: pageNum,
        pages: perPage === 0 ? 1 : Math.ceil(total / perPage),
        total,
        limit: perPage
      }
    });

  } catch (error) {
    logger.error('Error fetching medical certificates:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get a single medical certificate by ID
 */
const getMedicalCertificateById = async (req, res) => {
  try {
    const { id } = req.params;

    const certificate = await MedicalCertificate.findById(id)
      .populate('patientId', 'name age gender phone address')
      .populate('doctorId', 'name specialization licenseNumber')
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name');

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Medical certificate not found'
      });
    }

    res.json({
      success: true,
      data: certificate
    });

  } catch (error) {
    logger.error('Error fetching medical certificate:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Allowed fields for update (whitelist to avoid overwriting certificateNumber, dateIssued, etc.)
 */
const UPDATABLE_FIELDS = [
  'patientId', 'patientDisplayId', 'patientName', 'patientAge', 'patientGender',
  'patientAddress', 'patientPhone', 'diagnosis', 'symptoms', 'treatment', 'prescription',
  'recommendations', 'followUpDate', 'restPeriod', 'workRestriction', 'certificateType',
  'validFrom', 'validUntil', 'clinicName', 'clinicAddress', 'clinicPhone', 'clinicLicense', 'notes'
];

/**
 * Update a medical certificate (atomic update so changes persist correctly)
 */
const updateMedicalCertificate = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const existing = await MedicalCertificate.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Medical certificate not found'
      });
    }

    // Build $set with only whitelisted fields from body
    const updateData = {};
    for (const key of UPDATABLE_FIELDS) {
      if (body[key] !== undefined && body[key] !== null && body[key] !== '') {
        updateData[key] = body[key];
      }
    }
    // Always apply notes when present in body (including empty string) so Additional Notes edits persist
    if (Object.prototype.hasOwnProperty.call(body, 'notes')) {
      updateData.notes = body.notes == null ? '' : String(body.notes).trim();
    }

    // Normalize dates and types for MongoDB
    if (updateData.validFrom) updateData.validFrom = new Date(updateData.validFrom);
    if (updateData.validUntil) updateData.validUntil = new Date(updateData.validUntil);
    if (updateData.followUpDate) updateData.followUpDate = new Date(updateData.followUpDate);
    if (updateData.patientAge !== undefined) updateData.patientAge = Number(updateData.patientAge);
    if (updateData.patientId && typeof updateData.patientId === 'string') {
      updateData.patientId = new mongoose.Types.ObjectId(updateData.patientId);
    }

    updateData.updatedBy = req.user._id;

    const certificate = await MedicalCertificate.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    logger.info(`Medical certificate updated: ${certificate.certificateNumber}`);

    res.json({
      success: true,
      message: 'Medical certificate updated successfully',
      data: certificate
    });

  } catch (error) {
    logger.error('Error updating medical certificate:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Delete a medical certificate (soft delete by changing status)
 */
const deleteMedicalCertificate = async (req, res) => {
  try {
    const { id } = req.params;

    const certificate = await MedicalCertificate.findById(id);
    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Medical certificate not found'
      });
    }

    // Soft delete by changing status
    certificate.status = 'Cancelled';
    certificate.updatedBy = req.user._id;
    await certificate.save();

    logger.info(`Medical certificate cancelled: ${certificate.certificateNumber}`);

    res.json({
      success: true,
      message: 'Medical certificate cancelled successfully'
    });

  } catch (error) {
    logger.error('Error deleting medical certificate:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get medical certificates for a specific patient
 */
const getPatientCertificates = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { status, limit = 10 } = req.query;

    const filter = { patientId };
    if (status) filter.status = status;

    const certificates = await MedicalCertificate.find(filter)
      .populate('doctorId', 'name specialization')
      .sort({ dateIssued: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: certificates
    });

  } catch (error) {
    logger.error('Error fetching patient certificates:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get medical certificates by doctor
 */
const getDoctorCertificates = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { status, startDate, endDate, limit = 10 } = req.query;

    const filter = { doctorId };
    if (status) filter.status = status;
    
    if (startDate || endDate) {
      filter.dateIssued = {};
      if (startDate) filter.dateIssued.$gte = new Date(startDate);
      if (endDate) filter.dateIssued.$lte = new Date(endDate);
    }

    const certificates = await MedicalCertificate.find(filter)
      .populate('patientId', 'name age gender')
      .sort({ dateIssued: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: certificates
    });

  } catch (error) {
    logger.error('Error fetching doctor certificates:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get certificate statistics
 */
const getCertificateStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const filter = {};
    if (startDate || endDate) {
      filter.dateIssued = {};
      if (startDate) filter.dateIssued.$gte = new Date(startDate);
      if (endDate) filter.dateIssued.$lte = new Date(endDate);
    }

    const stats = await MedicalCertificate.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          issued: {
            $sum: { $cond: [{ $eq: ['$status', 'Issued'] }, 1, 0] }
          },
          draft: {
            $sum: { $cond: [{ $eq: ['$status', 'Draft'] }, 1, 0] }
          },
          cancelled: {
            $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] }
          },
          expired: {
            $sum: { $cond: [{ $eq: ['$status', 'Expired'] }, 1, 0] }
          }
        }
      }
    ]);

    const certificateTypeStats = await MedicalCertificate.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$certificateType',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: stats[0] || { total: 0, issued: 0, draft: 0, cancelled: 0, expired: 0 },
        byType: certificateTypeStats
      }
    });

  } catch (error) {
    logger.error('Error fetching certificate stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Generate printable certificate data
 */
const generatePrintableCertificate = async (req, res) => {
  try {
    const { id } = req.params;

    const certificate = await MedicalCertificate.findById(id)
      .populate('patientId', 'name age gender phone address')
      .populate('doctorId', 'name specialization licenseNumber')
      .populate('createdBy', 'name');

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Medical certificate not found'
      });
    }

    // Format the certificate data for printing
    const printableData = {
      certificateNumber: certificate.certificateNumber,
      dateIssued: certificate.dateIssued.toLocaleDateString(),
      validFrom: certificate.validFrom.toLocaleDateString(),
      validUntil: certificate.validUntil.toLocaleDateString(),
      patient: {
        name: certificate.patientName,
        id: certificate.patientDisplayId,
        age: certificate.patientAge,
        gender: certificate.patientGender,
        address: certificate.patientAddress,
        phone: certificate.patientPhone
      },
      doctor: {
        name: certificate.doctorName,
        licenseNumber: certificate.doctorLicenseNumber,
        specialization: certificate.doctorSpecialization
      },
      clinic: {
        name: certificate.clinicName,
        address: certificate.clinicAddress,
        phone: certificate.clinicPhone,
        license: certificate.clinicLicense
      },
      medical: {
        diagnosis: certificate.diagnosis,
        symptoms: certificate.symptoms,
        treatment: certificate.treatment,
        prescription: certificate.prescription,
        recommendations: certificate.recommendations,
        followUpDate: certificate.followUpDate ? certificate.followUpDate.toLocaleDateString() : null,
        restPeriod: certificate.restPeriod,
        workRestriction: certificate.workRestriction
      },
      notes: certificate.notes,
      certificateType: certificate.certificateType,
      digitalSignature: certificate.digitalSignature
    };

    res.json({
      success: true,
      data: printableData
    });

  } catch (error) {
    logger.error('Error generating printable certificate:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  createMedicalCertificate,
  getMedicalCertificates,
  getMedicalCertificateById,
  updateMedicalCertificate,
  deleteMedicalCertificate,
  getPatientCertificates,
  getDoctorCertificates,
  getCertificateStats,
  generatePrintableCertificate
};
