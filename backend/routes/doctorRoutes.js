const express = require('express');
const router = express.Router();
const path = require('path');
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const VitalSigns = require('../models/VitalSigns');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const LabOrder = require('../models/LabOrder');
const asyncHandler = require('../middleware/async');

// @route   GET /api/doctor/all
// @desc    Get all doctors
// @access  Public
router.get('/all', asyncHandler(async (req, res) => {
  try {
    const doctors = await User.find({ 
      role: 'doctor'
    }).select('firstName lastName email username role specialization');
    
    const formattedDoctors = doctors.map(doctor => ({
      id: doctor._id,
      firstName: doctor.firstName || '',
      lastName: doctor.lastName || '',
      role: doctor.role,
      specialization: doctor.specialization || '',
      email: doctor.email,
      username: doctor.username,
      name: `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim()
    }));
    
    console.log(`[/api/doctor/all] Found ${formattedDoctors.length} doctors`);
    
    res.json(formattedDoctors);
  } catch (error) {
    console.error('[/api/doctor/all] Error fetching doctors:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch doctors', 
      error: error.message 
    });
  }
}));

// @route   GET /api/doctorRoutes
// @desc    Get all doctorRoutes
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'doctorRoutes endpoint working',
      data: []
    });
  } catch (error) {
    console.error('Error fetching doctorRoutes:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/doctorRoutes
// @desc    Create new doctorRoutes
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'doctorRoutes created successfully'
    });
  } catch (error) {
    console.error('Error creating doctorRoutes:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/doctor/vitals/latest/:patientId
// @desc    Get latest vital signs for a specific patient (Doctor view)
// @access  Private
router.get('/vitals/latest/:patientId', auth, async (req, res) => {
  try {
    const { patientId } = req.params;
    
    // First check if patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }
    
    // Get the latest vital signs for this patient
    const latestVitals = await VitalSigns.findOne({
      patientId: patientId,
      isActive: true
    })
    .sort({ measurementDate: -1 })
    .populate('measuredBy', 'firstName lastName');
    
    if (!latestVitals) {
      return res.json({
        success: true,
        data: null,
        message: 'No vital signs found for this patient'
      });
    }
    
    res.json({
      success: true,
      data: latestVitals
    });
  } catch (error) {
    console.error('Error fetching latest vital signs for doctor:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/doctor/medical-certificates
// @desc    Serve medical certificate form for doctors
// @access  Private (Doctor)
router.get('/medical-certificates', auth, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/medical-certificates/certificate-form.html'));
});

// @route   GET /api/doctor/patients/active
// @desc    Get active patients (excluding completed ones) for doctor dashboard. Patients remain in active area until a medical record is written and finalized; sending lab order or medication alone does not remove them.
// @access  Private (Doctor)
router.get('/patients/active', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '' } = req.query;
    const hasSearch = search && search.trim().length > 0;
    // When searching, allow higher limit so we can search across all patients
    const effectiveLimit = Math.min(parseInt(limit, 10) || 50, hasSearch ? 500 : 100);
    const skip = (page - 1) * effectiveLimit;

    // Get the current doctor ID from the authenticated user
    const currentDoctorId = req.user._id;
    console.log(`[Doctor Active Patients] Fetching patients for doctor: ${currentDoctorId}, search: "${search || 'none'}", limit: ${effectiveLimit}`);

    // Handle DB-down mode gracefully
    const mongoose = require('mongoose');
    const dbConnected = mongoose.connection && mongoose.connection.readyState === 1;
    if (!dbConnected) {
      return res.json({
        success: true,
        data: [],
        pagination: {
          currentPage: parseInt(page),
          totalPages: 1,
          totalPatients: 0,
          hasNextPage: false,
          hasPrevPage: false
        }
      });
    }

    // Build query: when searching, include ALL patients (any status, any assignment, any isActive)
    const query = {};

    if (hasSearch) {
      const searchTrim = search.trim();
      // Escape regex special chars so plain search like "sultan" or "john (smith)" works
      const escaped = searchTrim.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escaped, 'i');
      query.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { patientId: searchRegex },
        { contactNumber: searchRegex },
        { email: searchRegex }
      ];
      // When searching: no status, no assignedDoctorId, no isActive filter - search entire clinic
    } else {
      query.isActive = true;
      query.status = { $ne: 'completed' };
      query.assignedDoctorId = currentDoctorId;
    }

    // Get patients with pagination
    const patients = await Patient.find(query)
      .select('firstName lastName patientId age gender contactNumber status assignedDoctorId assignedNurseId lastUpdated vitals cardType cardStatus')
      .populate('assignedDoctorId', 'firstName lastName')
      .populate('assignedNurseId', 'firstName lastName')
      .populate('cardType')
      .sort({ lastUpdated: -1, createdAt: -1 })
      .skip(skip)
      .limit(effectiveLimit);

    // Get total count for pagination
    const totalPatients = await Patient.countDocuments(query);

    // Format response
    const formattedPatients = patients.map(patient => ({
      _id: patient._id,
      patientId: patient.patientId,
      firstName: patient.firstName,
      lastName: patient.lastName,
      fullName: `${patient.firstName} ${patient.lastName}`,
      age: patient.age,
      gender: patient.gender,
      contactNumber: patient.contactNumber,
      status: patient.status,
      assignedDoctor: patient.assignedDoctorId ? {
        id: patient.assignedDoctorId._id.toString(),
        name: `${patient.assignedDoctorId.firstName} ${patient.assignedDoctorId.lastName}`
      } : null,
      assignedNurse: patient.assignedNurseId ? {
        id: patient.assignedNurseId._id.toString(),
        name: `${patient.assignedNurseId.firstName} ${patient.assignedNurseId.lastName}`
      } : null,
      lastUpdated: patient.lastUpdated,
      hasVitals: !!(patient.vitals && Object.keys(patient.vitals).length > 0),
      vitals: patient.vitals,
      cardType: patient.cardType,
      cardStatus: patient.cardStatus,
      assignedDoctorId: patient.assignedDoctorId ? patient.assignedDoctorId._id.toString() : null
    }));
    
    res.json({
      success: true,
      data: formattedPatients,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalPatients / effectiveLimit),
        totalPatients,
        hasNextPage: page < Math.ceil(totalPatients / effectiveLimit),
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching active patients for doctor:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/doctor/patients/completed
// @desc    Get completed patients/reports for doctor dashboard
// @access  Private (Doctor)
router.get('/patients/completed', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', dateFrom, dateTo } = req.query;
    const skip = (page - 1) * limit;
    
    // Get the current doctor ID from the authenticated user
    const currentDoctorId = req.user._id;
    console.log(`[Doctor Completed Patients] Fetching completed patients for doctor: ${currentDoctorId}`);
    
    // Build query for completed patients assigned to this doctor only
    const query = {
      status: 'completed',
      isActive: true,
      assignedDoctorId: currentDoctorId
    };
    
    // Add date range filter if provided
    if (dateFrom || dateTo) {
      query.lastUpdated = {};
      if (dateFrom) {
        query.lastUpdated.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        query.lastUpdated.$lte = new Date(dateTo);
      }
    }
    
    // Add search functionality
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { patientId: searchRegex },
        { contactNumber: searchRegex }
      ];
    }
    
    // Get completed patients with pagination
    const patients = await Patient.find(query)
      .select('firstName lastName patientId age gender contactNumber status assignedDoctorId assignedNurseId lastUpdated vitals completedAt')
      .populate('assignedDoctorId', 'firstName lastName')
      .populate('assignedNurseId', 'firstName lastName')
      .sort({ lastUpdated: -1, completedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const totalPatients = await Patient.countDocuments(query);
    
    // Format response
    const formattedPatients = patients.map(patient => ({
      _id: patient._id,
      patientId: patient.patientId,
      firstName: patient.firstName,
      lastName: patient.lastName,
      fullName: `${patient.firstName} ${patient.lastName}`,
      age: patient.age,
      gender: patient.gender,
      contactNumber: patient.contactNumber,
      status: patient.status,
      assignedDoctor: patient.assignedDoctorId ? {
        id: patient.assignedDoctorId._id.toString(),
        name: `${patient.assignedDoctorId.firstName} ${patient.assignedDoctorId.lastName}`
      } : null,
      assignedNurse: patient.assignedNurseId ? {
        id: patient.assignedNurseId._id.toString(),
        name: `${patient.assignedNurseId.firstName} ${patient.assignedNurseId.lastName}`
      } : null,
      lastUpdated: patient.lastUpdated,
      completedAt: patient.completedAt || patient.lastUpdated,
      hasVitals: !!(patient.vitals && Object.keys(patient.vitals).length > 0),
      vitals: patient.vitals
    }));
    
    res.json({
      success: true,
      data: formattedPatients,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalPatients / limit),
        totalPatients,
        hasNextPage: page < Math.ceil(totalPatients / limit),
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching completed patients for doctor:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/doctor/dashboard/stats
// @desc    Get doctor dashboard statistics with completed reports separated
// @access  Private (Doctor)
router.get('/dashboard/stats', auth, async (req, res) => {
  try {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    // Get statistics in parallel
    const [
      totalPatients,
      activePatients,
      completedPatients,
      patientsWithVitals,
      completedAppointments,
      pendingReports,
      labResults
    ] = await Promise.all([
      // Total patients
      Patient.countDocuments({ isActive: true }),
      
      // Active patients (excluding completed)
      Patient.countDocuments({ 
        status: { $ne: 'completed' },
        isActive: true 
      }),
      
      // Completed patients
      Patient.countDocuments({ 
        status: 'completed',
        isActive: true 
      }),
      
      // Patients with vitals
      Patient.countDocuments({
        'vitals.temperature': { $exists: true, $ne: null },
        status: { $ne: 'completed' },
        isActive: true
      }),
      
      // Completed appointments
      Appointment.countDocuments({ 
        status: 'completed',
        appointmentDate: { $gte: startOfToday, $lte: endOfToday }
      }),
      
      // Pending reports (active patients without completed status)
      Patient.countDocuments({
        status: { $nin: ['completed', 'discharged'] },
        isActive: true
      }),
      
      // Lab results (completed lab tests)
      LabOrder.countDocuments({ status: 'completed' })
    ]);
    
    res.json({
      success: true,
      data: {
        totalPatients,
        activePatients,
        completedPatients,
        patientsWithVitals,
        completedAppointments,
        pendingReports,
        labResults
      }
    });
  } catch (error) {
    console.error('Error fetching doctor dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/doctor/patients/:id/complete
// @desc    Mark a patient report as completed. Patient must have a finalized medical record (stays in active area until doctor writes medical record; lab order or medication alone does not complete).
// @access  Private (Doctor)
router.put('/patients/:id/complete', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, completionReason } = req.body;
    const MedicalRecord = require('../models/MedicalRecord');
    
    console.log(`[Complete Patient] Attempting to complete patient ${id}`);
    console.log(`[Complete Patient] Request body:`, { notes, completionReason });
    console.log(`[Complete Patient] User ID:`, req.user._id);
    
    // Find the patient
    const patient = await Patient.findById(id);
    if (!patient) {
      console.log(`[Complete Patient] Patient ${id} not found`);
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }
    
    console.log(`[Complete Patient] Found patient: ${patient.firstName} ${patient.lastName}`);
    console.log(`[Complete Patient] Current status: ${patient.status}`);
    
    // Patient may only be marked completed when they have at least one finalized medical record (not after lab order or medication alone)
    const FINALIZED = ['Finalized', 'finalized', 'Completed', 'completed', 'Closed', 'closed', 'Archived', 'archived'];
    const hasFinalized = await MedicalRecord.countDocuments({
      $or: [{ patient: id }, { patientId: id }],
      status: { $in: FINALIZED }
    }) > 0;
    if (!hasFinalized) {
      return res.status(400).json({
        success: false,
        message: 'Patient cannot be marked completed until a medical record has been written and finalized. The patient will remain in the active area until you write and finalize the medical record. Sending lab order or medication alone does not complete the visit.'
      });
    }
    
    // Update patient status to completed
    const updateData = {
      status: 'completed',
      completedAt: new Date(),
      lastUpdated: new Date()
    };
    
    // Only add optional fields if they exist
    if (notes) updateData.completionNotes = notes;
    if (completionReason) updateData.completionReason = completionReason;
    if (req.user._id) updateData.completedBy = req.user._id;
    
    console.log(`[Complete Patient] Update data:`, updateData);
    
    const updatedPatient = await Patient.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    // Create a notification about the completion
    const Notification = require('../models/Notification');
    const notification = new Notification({
      type: 'PATIENT_COMPLETED',
      title: 'Patient Report Completed',
      message: `Patient ${patient.firstName} ${patient.lastName} report has been completed`,
      recipientId: patient.assignedNurseId || req.user._id,
      recipientRole: 'nurse',
      senderId: req.user._id,
      senderRole: req.user.role,
      data: {
        patientId: patient._id,
        patientName: `${patient.firstName} ${patient.lastName}`,
        completedBy: `${req.user.firstName} ${req.user.lastName}`,
        completionNotes: notes
      },
      priority: 'medium',
      category: 'patient'
    });
    
    await notification.save();
    
    res.json({
      success: true,
      message: 'Patient report marked as completed',
      data: {
        patientId: updatedPatient._id,
        patientName: `${updatedPatient.firstName} ${updatedPatient.lastName}`,
        status: updatedPatient.status,
        completedAt: updatedPatient.completedAt,
        completedBy: `${req.user.firstName} ${req.user.lastName}`
      }
    });
  } catch (error) {
    console.error(`[Complete Patient] Error completing patient ${req.params.id}:`, error);
    console.error(`[Complete Patient] Error details:`, {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to complete patient',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// @route   PUT /api/doctor/patients/:id/reopen
// @desc    Reopen a completed patient report (move back to active)
// @access  Private (Doctor)
router.put('/patients/:id/reopen', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, newStatus = 'scheduled' } = req.body;
    
    // Find the patient
    const patient = await Patient.findById(id);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }
    
    if (patient.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Patient is not in completed status'
      });
    }
    
    // Update patient status back to active
    const updatedPatient = await Patient.findByIdAndUpdate(
      id,
      {
        status: newStatus,
        reopenedAt: new Date(),
        lastUpdated: new Date(),
        reopenReason: reason,
        reopenedBy: req.user._id,
        $unset: { completedAt: 1, completionNotes: 1, completionReason: 1, completedBy: 1 }
      },
      { new: true, runValidators: true }
    );
    
    // Create a notification about the reopening
    const Notification = require('../models/Notification');
    const notification = new Notification({
      type: 'PATIENT_REOPENED',
      title: 'Patient Report Reopened',
      message: `Patient ${patient.firstName} ${patient.lastName} report has been reopened`,
      recipientId: patient.assignedNurseId || req.user._id,
      recipientRole: 'nurse',
      senderId: req.user._id,
      senderRole: req.user.role,
      data: {
        patientId: patient._id,
        patientName: `${patient.firstName} ${patient.lastName}`,
        reopenedBy: `${req.user.firstName} ${req.user.lastName}`,
        newStatus: newStatus,
        reopenReason: reason
      },
      priority: 'medium',
      category: 'patient'
    });
    
    await notification.save();
    
    res.json({
      success: true,
      message: 'Patient report reopened successfully',
      data: {
        patientId: updatedPatient._id,
        patientName: `${updatedPatient.firstName} ${updatedPatient.lastName}`,
        status: updatedPatient.status,
        reopenedAt: updatedPatient.reopenedAt,
        reopenedBy: `${req.user.firstName} ${req.user.lastName}`
      }
    });
  } catch (error) {
    console.error('Error reopening patient report:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
