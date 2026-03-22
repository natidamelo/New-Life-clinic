const express = require('express');
const router = express.Router();
const Consultation = require('../models/Consultation');
const Patient = require('../models/Patient');
const ServiceRequest = require('../models/ServiceRequest');
const { auth } = require('../middleware/authMiddleware');

// Get all consultations for a doctor
router.get('/doctor/:doctorId', auth(), async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { status } = req.query;
    
    const consultations = await Consultation.getByDoctor(doctorId, status);
    
    res.json({
      success: true,
      data: consultations,
      count: consultations.length
    });
  } catch (error) {
    console.error('Error fetching consultations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch consultations',
      error: error.message
    });
  }
});

// Get consultations by patient
router.get('/patient/:patientId', auth(), async (req, res) => {
  try {
    const { patientId } = req.params;
    
    const consultations = await Consultation.getByPatient(patientId);
    
    res.json({
      success: true,
      data: consultations,
      count: consultations.length
    });
  } catch (error) {
    console.error('Error fetching patient consultations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch patient consultations',
      error: error.message
    });
  }
});

// Get consultations by status
router.get('/status/:status', auth(), async (req, res) => {
  try {
    const { status } = req.params;
    
    const consultations = await Consultation.getByStatus(status);
    
    res.json({
      success: true,
      data: consultations,
      count: consultations.length
    });
  } catch (error) {
    console.error('Error fetching consultations by status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch consultations by status',
      error: error.message
    });
  }
});

// Create a new consultation
router.post('/', auth(), async (req, res) => {
  try {
    const consultationData = req.body;
    
    // Validate required fields
    if (!consultationData.patientId || !consultationData.doctorId || !consultationData.serviceRequestId) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID, Doctor ID, and Service Request ID are required'
      });
    }
    
    const consultation = new Consultation(consultationData);
    await consultation.save();
    
    res.status(201).json({
      success: true,
      data: consultation,
      message: 'Consultation created successfully'
    });
  } catch (error) {
    console.error('Error creating consultation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create consultation',
      error: error.message
    });
  }
});

// Update consultation status
router.put('/:consultationId/status', auth(), async (req, res) => {
  try {
    const { consultationId } = req.params;
    const { status, notes, diagnosis, treatmentPlan } = req.body;
    
    const consultation = await Consultation.findById(consultationId);
    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Consultation not found'
      });
    }
    
    if (status === 'completed') {
      await consultation.completeConsultation(notes, diagnosis, treatmentPlan);
    } else {
      consultation.status = status;
      if (notes) consultation.consultationNotes = notes;
      await consultation.save();
    }
    
    res.json({
      success: true,
      data: consultation,
      message: 'Consultation status updated successfully'
    });
  } catch (error) {
    console.error('Error updating consultation status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update consultation status',
      error: error.message
    });
  }
});

// Schedule follow-up
router.put('/:consultationId/follow-up', auth(), async (req, res) => {
  try {
    const { consultationId } = req.params;
    const { followUpDate, notes } = req.body;
    
    const consultation = await Consultation.findById(consultationId);
    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Consultation not found'
      });
    }
    
    await consultation.scheduleFollowUp(followUpDate, notes);
    
    res.json({
      success: true,
      data: consultation,
      message: 'Follow-up scheduled successfully'
    });
  } catch (error) {
    console.error('Error scheduling follow-up:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to schedule follow-up',
      error: error.message
    });
  }
});

// Get consultation statistics
router.get('/stats/doctor/:doctorId', auth(), async (req, res) => {
  try {
    const { doctorId } = req.params;
    
    const stats = await Consultation.aggregate([
      { $match: { doctorId: new require('mongoose').Types.ObjectId(doctorId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const totalConsultations = await Consultation.countDocuments({ doctorId });
    
    res.json({
      success: true,
      data: {
        total: totalConsultations,
        byStatus: stats
      }
    });
  } catch (error) {
    console.error('Error fetching consultation stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch consultation statistics',
      error: error.message
    });
  }
});

module.exports = router;
