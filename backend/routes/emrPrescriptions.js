const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const emrService = require('../services/emrService');
const prescriptionPrintService = require('../services/prescriptionPrintService');
const Prescription = require('../models/Prescription');
const Patient = require('../models/Patient');
const { body, validationResult } = require('express-validator');

// Enhanced search endpoint with EMR features
router.get('/search', auth, async (req, res) => {
  try {
    const {
      query,
      patientId,
      doctorId,
      medicationName,
      status,
      dateFrom,
      dateTo,
      limit,
      page
    } = req.query;

    const searchParams = {
      query,
      patientId,
      doctorId,
      medicationName,
      status,
      dateFrom,
      dateTo,
      limit: parseInt(limit) || 50,
      page: parseInt(page) || 1
    };

    const results = await emrService.searchPrescriptions(searchParams);

    res.json({
      success: true,
      data: results.prescriptions,
      pagination: results.pagination
    });
  } catch (error) {
    console.error('Error searching prescriptions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search prescriptions'
    });
  }
});

// Drug interaction checking endpoint
router.post('/check-interactions', auth, async (req, res) => {
  try {
    const { medications } = req.body;

    if (!medications || !Array.isArray(medications)) {
      return res.status(400).json({
        success: false,
        error: 'Medications array is required'
      });
    }

    const interactions = await emrService.checkDrugInteractions(medications);
    
    res.json({
      success: true,
      data: {
        interactions,
        hasInteractions: interactions.length > 0,
        count: interactions.length
      }
    });
  } catch (error) {
    console.error('Error checking drug interactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check drug interactions'
    });
  }
});

// Allergy alert checking endpoint
router.post('/check-allergies', auth, async (req, res) => {
  try {
    const { patientId, medications } = req.body;

    if (!patientId || !medications) {
      return res.status(400).json({
        success: false,
        error: 'Patient ID and medications are required'
      });
    }

    const alerts = await emrService.checkAllergyAlerts(patientId, medications);
    
    res.json({
      success: true,
      data: {
        alerts,
        hasAlerts: alerts.length > 0,
        count: alerts.length
      }
    });
  } catch (error) {
    console.error('Error checking allergy alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check allergy alerts'
    });
  }
});

// Drug information lookup endpoint
router.get('/drug-info/:drugName', auth, async (req, res) => {
  try {
    const { drugName } = req.params;
    const drugInfo = await emrService.getDrugInformation(drugName);
    
    res.json({
      success: true,
      data: drugInfo
    });
  } catch (error) {
    console.error('Error getting drug information:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get drug information'
    });
  }
});

// Print prescription endpoint
router.post('/print/:prescriptionId', auth, async (req, res) => {
  try {
    const { prescriptionId } = req.params;
    const { printType, copies, printerName } = req.body;

    const printOptions = {
      userId: req.user.id,
      printType: printType || 'prescription',
      copies: copies || 1,
      printerName
    };

    const result = await prescriptionPrintService.generatePrescriptionPDF(
      prescriptionId, 
      printOptions
    );

    if (result.success) {
      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
      
      // Stream the PDF file
      const fs = require('fs');
      const fileStream = fs.createReadStream(result.filePath);
      fileStream.pipe(res);

      // Clean up file after streaming
      fileStream.on('end', () => {
        fs.unlinkSync(result.filePath);
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to generate prescription PDF'
      });
    }
  } catch (error) {
    console.error('Error printing prescription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to print prescription'
    });
  }
});

// Generate medication label endpoint
router.post('/label/:prescriptionId', auth, async (req, res) => {
  try {
    const { prescriptionId } = req.params;
    const { medicationIndex } = req.body;

    const result = await prescriptionPrintService.generateMedicationLabel(
      prescriptionId, 
      medicationIndex || 0
    );

    if (result.success) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
      
      const fs = require('fs');
      const fileStream = fs.createReadStream(result.filePath);
      fileStream.pipe(res);

      fileStream.on('end', () => {
        fs.unlinkSync(result.filePath);
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to generate medication label'
      });
    }
  } catch (error) {
    console.error('Error generating medication label:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate medication label'
    });
  }
});

// Enhanced prescription creation with EMR features
router.post('/create-enhanced', 
  auth,
  [
    body('patientId').notEmpty().withMessage('Patient ID is required'),
    body('medications').isArray().withMessage('Medications must be an array'),
    body('medications.*.name').notEmpty().withMessage('Medication name is required'),
    body('medications.*.dosage').notEmpty().withMessage('Dosage is required'),
    body('medications.*.frequency').notEmpty().withMessage('Frequency is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { patientId, medications, diagnosis, instructions } = req.body;
      const doctorId = req.user.id;

      // Check for drug interactions
      const interactions = await emrService.checkDrugInteractions(medications);
      
      // Check for allergy alerts
      const allergyAlerts = await emrService.checkAllergyAlerts(patientId, medications);

      // Create prescription with EMR enhancements
      const prescriptionData = {
        patient: patientId,
        doctor: doctorId,
        doctorId: doctorId, // Ensure both doctor and doctorId fields are set
        medicationName: medications[0].name,
        dosage: medications[0].dosage,
        frequency: medications[0].frequency,
        duration: medications[0].duration || '7 days',
        route: medications[0].route || 'Oral',
        instructions,
        medications: medications.map(med => ({
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          duration: med.duration || '7 days',
          route: med.route || 'Oral',
          notes: med.notes
        })),
        drugInteractions: interactions.map(interaction => ({
          drugName: interaction.drug2,
          interactionType: interaction.severity === 'severe' ? 'major' : 'moderate',
          description: interaction.description,
          severity: interaction.severity,
          checked: false
        })),
        allergyAlerts: allergyAlerts.map(alert => ({
          allergen: alert.allergen,
          alertType: alert.alertType,
          severity: alert.severity,
          description: alert.description,
          checked: false
        })),
        clinicalAlerts: [],
        prescriptionHistory: [{
          action: 'created',
          performedBy: doctorId,
          performedAt: new Date(),
          reason: 'Initial prescription creation'
        }]
      };

      // Add clinical alerts based on interactions and allergies
      if (interactions.length > 0) {
        prescriptionData.clinicalAlerts.push({
          alertType: 'contraindication',
          message: `${interactions.length} potential drug interaction(s) detected`,
          severity: interactions.some(i => i.severity === 'severe') ? 'critical' : 'warning',
          source: 'EMR System',
          acknowledged: false
        });
      }

      if (allergyAlerts.length > 0) {
        prescriptionData.clinicalAlerts.push({
          alertType: 'contraindication',
          message: `${allergyAlerts.length} potential allergy alert(s) detected`,
          severity: 'critical',
          source: 'EMR System',
          acknowledged: false
        });
      }

      const prescription = new Prescription(prescriptionData);
      await prescription.save();

      res.json({
        success: true,
        data: {
          prescription,
          alerts: {
            interactions,
            allergyAlerts,
            hasAlerts: interactions.length > 0 || allergyAlerts.length > 0
          }
        }
      });
    } catch (error) {
      console.error('Error creating enhanced prescription:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create prescription'
      });
    }
  }
);

// Get prescription analytics
router.get('/analytics', auth, async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const doctorId = req.user.role === 'doctor' ? req.user.id : null;

    const dateRange = {
      start: dateFrom,
      end: dateTo
    };

    const analytics = await emrService.getPrescriptionAnalytics(doctorId, dateRange);
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error getting prescription analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get prescription analytics'
    });
  }
});

// Update prescription with EMR tracking
router.put('/:prescriptionId', auth, async (req, res) => {
  try {
    const { prescriptionId } = req.params;
    const updates = req.body;
    const userId = req.user.id;

    const prescription = await Prescription.findById(prescriptionId);
    if (!prescription) {
      return res.status(404).json({
        success: false,
        error: 'Prescription not found'
      });
    }

    // Track changes
    const changes = {};
    Object.keys(updates).forEach(key => {
      if (prescription[key] !== updates[key]) {
        changes[key] = {
          from: prescription[key],
          to: updates[key]
        };
      }
    });

    // Add to prescription history
    if (Object.keys(changes).length > 0) {
      prescription.prescriptionHistory.push({
        action: 'modified',
        performedBy: userId,
        performedAt: new Date(),
        changes,
        reason: updates.updateReason || 'Prescription updated'
      });
    }

    // Update prescription
    Object.assign(prescription, updates);
    await prescription.save();

    res.json({
      success: true,
      data: prescription
    });
  } catch (error) {
    console.error('Error updating prescription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update prescription'
    });
  }
});

// Acknowledge clinical alerts
router.post('/:prescriptionId/acknowledge-alerts', auth, async (req, res) => {
  try {
    const { prescriptionId } = req.params;
    const { alertIds, reason } = req.body;
    const userId = req.user.id;

    const prescription = await Prescription.findById(prescriptionId);
    if (!prescription) {
      return res.status(404).json({
        success: false,
        error: 'Prescription not found'
      });
    }

    // Acknowledge specified alerts
    prescription.clinicalAlerts.forEach(alert => {
      if (alertIds.includes(alert._id.toString())) {
        alert.acknowledged = true;
        alert.acknowledgedBy = userId;
        alert.acknowledgedAt = new Date();
      }
    });

    // Add to prescription history
    prescription.prescriptionHistory.push({
      action: 'modified',
      performedBy: userId,
      performedAt: new Date(),
      reason: `Clinical alerts acknowledged: ${reason || 'No reason provided'}`
    });

    await prescription.save();

    res.json({
      success: true,
      message: 'Alerts acknowledged successfully'
    });
  } catch (error) {
    console.error('Error acknowledging alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to acknowledge alerts'
    });
  }
});

// Get prescription history and audit trail
router.get('/:prescriptionId/history', auth, async (req, res) => {
  try {
    const { prescriptionId } = req.params;

    const prescription = await Prescription.findById(prescriptionId)
      .populate('prescriptionHistory.performedBy', 'firstName lastName')
      .select('prescriptionHistory printHistory');

    if (!prescription) {
      return res.status(404).json({
        success: false,
        error: 'Prescription not found'
      });
    }

    res.json({
      success: true,
      data: {
        prescriptionHistory: prescription.prescriptionHistory,
        printHistory: prescription.printHistory
      }
    });
  } catch (error) {
    console.error('Error getting prescription history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get prescription history'
    });
  }
});

module.exports = router;
