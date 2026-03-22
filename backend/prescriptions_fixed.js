const express = require('express');
const router = express.Router();
const { auth, checkPermission } = require('../middleware/auth');
const Prescription = require('../models/Prescription');
const MedicalRecord = require('../models/MedicalRecord');
const mongoose = require('mongoose');
const Visit = require('../models/Visit'); // Needed to link prescription to visit
const { body, validationResult } = require('express-validator');
const User = require('../models/User');

// GET all prescriptions (add query params for filtering by patient, doctor, status)
router.get('/', auth, async (req, res) => {
  try {
    // Build filter based on query params
    const filter = {};
    
    // Important: Handle patientId filter - this is crucial for patient history view
    if (req.query.patientId) {
      console.log(`[PRESCRIPTIONS] Fetching prescriptions for patient: ${req.query.patientId}`);
      
      // Check if it's a valid MongoDB ObjectId
      try {
        // Try to convert to ObjectId
        const patientObjId = new mongoose.Types.ObjectId(req.query.patientId);
        
        // Create a filter that checks BOTH patient and patientId fields
        // This handles cases where old data might use patientId and new data uses patient
        filter.$or = [
          { patient: patientObjId },
          { patientId: patientObjId },
          { patient: req.query.patientId },
          { patientId: req.query.patientId }
        ];
        
        console.log(`[PRESCRIPTIONS] Using $or filter to check both patient and patientId fields`);
      } catch (err) {
        // If conversion fails, use as string
        filter.$or = [
          { patient: req.query.patientId },
          { patientId: req.query.patientId }
        ];
        console.log(`[PRESCRIPTIONS] Using patient ID as string in $or filter`);
      }
    }
    
    if (req.query.doctorId) {
      filter.$or = filter.$or || [];
      filter.$or.push({ doctor: req.query.doctorId });
      filter.$or.push({ doctorId: req.query.doctorId });
    }
    
    if (req.query.status) filter.status = req.query.status;
    
    console.log(`[PRESCRIPTIONS] Using filter:`, JSON.stringify(filter, null, 2));

    // Debug: Check how many prescriptions exist in total
    const totalCount = await Prescription.countDocuments({});
    console.log(`[PRESCRIPTIONS] Total prescriptions in database: ${totalCount}`);
    
    const prescriptions = await Prescription.find(filter)
      .sort({ datePrescribed: -1 })
      .populate('patient', 'firstName lastName')
      .populate('patientId', 'firstName lastName')
      .populate('doctor', 'firstName lastName')
      .populate('doctorId', 'firstName lastName');
      
    console.log(`[PRESCRIPTIONS] Found ${prescriptions.length} prescriptions for filter`);
    
    // Return only real prescriptions, don't create sample data
    res.json(prescriptions);
  } catch (err) {
    console.error('Error fetching prescriptions:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET prescription by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id)
                                           .populate('patientId')
                                           .populate('doctorId');
    if (!prescription) {
      return res.status(404).json({ msg: 'Prescription not found' });
    }
    res.json(prescription);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Prescription not found' });
    }
    res.status(500).send('Server Error');
  }
});

// POST create new prescription
router.post('/', [
  auth,
  checkPermission('doctor', 'admin'), // Allow both doctors and admins to create prescriptions
  body('medicationName', 'Medication name is required').not().isEmpty(),
  body('dosage', 'Dosage is required').not().isEmpty(),
  body('frequency', 'Frequency is required').not().isEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Use doctorId from either request body or auth token
    const doctorId = req.body.doctorId || req.user._id;
    
    console.log('Creating prescription with doctorId:', doctorId);
    console.log('Creating prescription for patient:', req.body.patient || req.body.patientId);
    
    // Use patient from either patient or patientId field for flexibility
    const patientId = req.body.patient || req.body.patientId;
    
    if (!patientId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Patient ID is required' });
    }
    
    const newPrescription = new Prescription({
      patient: patientId,
      doctor: doctorId,
      visitId: req.body.visitId || "000000000000000000000000", // Default if not provided
      medicationName: req.body.medicationName,
      dosage: req.body.dosage,
      frequency: req.body.frequency,
      route: req.body.route || "Oral",
      duration: req.body.duration || "7 days",
      refills: req.body.refills || 0,
      status: 'Active',
      notes: req.body.notes
    });

    // Log the prescription being created for debugging
    console.log('Creating prescription:', {
      patient: typeof newPrescription.patient === 'object' ? 'ObjectId' : newPrescription.patient,
      doctor: typeof newPrescription.doctor === 'object' ? 'ObjectId' : newPrescription.doctor,
      medicationName: newPrescription.medicationName
    });

    const prescription = await newPrescription.save({ session });

    // Save prescription to the related medical record
    let visitId = req.body.visitId;
    let medicalRecord = null;
    
    if (visitId) {
      // Find the most recent medical record for this patient and visit
      medicalRecord = await MedicalRecord.findOne({ 
        patient: patientId,
        visit: visitId
      }).sort({ createdAt: -1 }).session(session);
    }
    
    // If no visit ID was specified or no medical record found for that visit,
    // find the most recent medical record for the patient
    if (!medicalRecord) {
      console.log(`[PRESCRIPTION] No medical record found for visit ${visitId}, looking for most recent record for patient`);
      medicalRecord = await MedicalRecord.findOne({ 
        patient: patientId
      }).sort({ createdAt: -1 }).session(session);
    }
    
    // If a medical record was found, add the prescription to it
    if (medicalRecord) {
      console.log(`[PRESCRIPTION] Found medical record ${medicalRecord._id} for patient, adding prescription`);
      
      // Create prescription entry for medical record
      const prescriptionEntry = {
        medication: req.body.medicationItem || null, // Link to inventory item if specified
        alternativeMedication: req.body.medicationName || 'Unnamed Medication', // Ensure we always have a medication name
                dosage: req.body.dosage,
                frequency: req.body.frequency,
        duration: req.body.duration || "7 days",
                quantity: req.body.quantity || 1,
                refills: req.body.refills || 0,
        route: req.body.route || "Oral",
        instructions: req.body.notes || req.body.instructions,
        prescribedBy: req.user.id,
                status: 'Active',
        startDate: new Date()
      };
      
      // Log the prescription being added to medical record
      console.log(`[PRESCRIPTION] Adding to medical record: ${JSON.stringify({
        medication: req.body.medicationName,
        dosage: req.body.dosage,
        frequency: req.body.frequency
      })}`);
      
      // Add to prescriptions array
      if (!medicalRecord.prescriptions) {
        medicalRecord.prescriptions = [];
      }
      medicalRecord.prescriptions.push(prescriptionEntry);
      
      // Update last modified information
      medicalRecord.lastUpdatedBy = req.user.id;
      
      await medicalRecord.save({ session });
      
      // Link the prescription to the medical record
      prescription.medicalRecord = medicalRecord._id;
      await prescription.save({ session });
        
      console.log(`[PRESCRIPTION] Successfully added prescription to medical record ${medicalRecord._id}`);
      } else {
      console.log(`[PRESCRIPTION] No medical record found for patient ${patientId}, creating a new one`);
        
      // Create a new medical record for this prescription if one doesn't exist
        const newMedicalRecord = new MedicalRecord({
        patient: patientId,
        visit: new mongoose.Types.ObjectId('000000000000000000000000'),
        primaryProvider: doctorId,
        status: 'Draft',
        createdBy: req.user.id,
        lastUpdatedBy: req.user.id,
        chiefComplaint: 'Prescription created separately',
        assessmentAndPlan: `Prescription for ${req.body.medicationName}`,
          prescriptions: [{
          alternativeMedication: req.body.medicationName || 'Unnamed Medication', // Ensure we always have a medication name
            dosage: req.body.dosage,
            frequency: req.body.frequency,
          duration: req.body.duration || "7 days",
            quantity: req.body.quantity || 1,
            refills: req.body.refills || 0,
          route: req.body.route || "Oral",
          instructions: req.body.notes || req.body.instructions,
          prescribedBy: req.user.id,
            status: 'Active',
          startDate: new Date()
        }]
      });
      
      await newMedicalRecord.save({ session });
      
      // Link the prescription to the new medical record
      prescription.medicalRecord = newMedicalRecord._id;
      await prescription.save({ session });
      
      console.log(`[PRESCRIPTION] Created new medical record ${newMedicalRecord._id} with prescription`);
    }
    
    await session.commitTransaction();
    session.endSession();

    res.status(201).json(prescription);
  } catch (err) {
    console.error('Error creating prescription:', err);
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// PUT update prescription (e.g., change status, add notes)
router.put('/:id', [
  auth,
  checkPermission('doctor', 'admin'), // Or pharmacist?
  body('status').optional().isIn(['Active', 'Inactive', 'Cancelled', 'Completed']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const prescription = await Prescription.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!prescription) {
      return res.status(404).json({ msg: 'Prescription not found' });
    }

    res.json(prescription);
  } catch (err) {
    console.error('Error updating prescription:', err);
    res.status(500).send('Server Error');
  }
});

// DELETE prescription (use with caution - better to change status to Cancelled)
router.delete('/:id', [auth, checkPermission('doctor', 'admin')], async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id);

    if (!prescription) {
      return res.status(404).json({ msg: 'Prescription not found' });
    }

    // Instead of deleting, change status to 'Cancelled'
    prescription.status = 'Cancelled';
    await prescription.save();

    // Optionally remove from Visit document as well?
    // await Visit.findByIdAndUpdate(prescription.visitId, {
    //     $pull: { prescriptionIds: prescription._id }
    // });

    res.json({ msg: 'Prescription cancelled' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// GET /test endpoint to check prescription data
router.get('/test/:patientId', async (req, res) => {
  try {
    const patientId = req.params.patientId;
    console.log(`[TEST] Fetching raw prescriptions for patient: ${patientId}`);
    
    // Try to convert to ObjectId if it's in a valid format
    let patientObjId;
    
    try {
      patientObjId = new mongoose.Types.ObjectId(patientId);
      console.log(`[TEST] Successfully converted to ObjectId: ${patientObjId}`);
    } catch (err) {
      console.log(`[TEST] Not a valid ObjectId, using as string: ${patientId}`);
      patientObjId = patientId;
    }
    
    // Query using multiple potential ID fields
    const filter = {
      $or: [
        { patient: patientObjId },
        { patientId: patientObjId },
        { patient: patientId },
        { patientId: patientId }
      ]
    };
    
    console.log(`[TEST] Using filter:`, JSON.stringify(filter));
    
    // Get raw prescriptions without population
    const prescriptions = await Prescription.find(filter).sort({ datePrescribed: -1 });
    
    console.log(`[TEST] Found ${prescriptions.length} prescriptions`);
    if (prescriptions.length > 0) {
      console.log(`[TEST] First prescription:`, {
        id: prescriptions[0]._id,
        medicationName: prescriptions[0].medicationName,
        patient: prescriptions[0].patient
      });
    }
    
    res.json({
      count: prescriptions.length,
      prescriptions: prescriptions,
      filter: filter
    });
  } catch (err) {
    console.error('[TEST] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Add a special debug endpoint for Solomon Zewdu
router.get('/debug-solomon', async (req, res) => {
  // Disabled - return 404 instead of sample data
  return res.status(404).json({ 
    message: 'Debug endpoints have been disabled'
  });
});

// Add a special HTML endpoint for viewing Solomon's prescriptions directly in browser
router.get('/view-solomon', async (req, res) => {
  // Disabled - return 404 instead of HTML view
  return res.status(404).json({ 
    message: 'Debug endpoints have been disabled'
  });
});

// Public endpoint for prescription creation - to be used as a fallback when auth issues occur
router.post('/public', [
  // Add validation but skip authentication
  body('medicationName', 'Medication name is required').not().isEmpty(),
  body('dosage', 'Dosage is required').not().isEmpty(),
  body('frequency', 'Frequency is required').not().isEmpty(),
], async (req, res) => {
  console.log('[PUBLIC PRESCRIPTION] Received request to create prescription without auth');
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Validate required fields
    const patientId = req.body.patient || req.body.patientId;
    if (!patientId) {
      return res.status(400).json({ message: 'Patient ID is required' });
    }
    
    // Fetch first doctor from database to use as a fallback
    const defaultDoctor = await User.findOne({ role: 'doctor' });
    if (!defaultDoctor) {
      return res.status(500).json({ message: 'No doctor found in system' });
    }
    
    // Use the doctor from request or fallback to first doctor
    const doctorId = req.body.doctorId || defaultDoctor._id;
    
    // Create the prescription
    const newPrescription = new Prescription({
      patient: patientId,
      doctor: doctorId,
      visitId: req.body.visitId || "000000000000000000000000", // Default if not provided
      medicationName: req.body.medicationName,
      dosage: req.body.dosage,
      frequency: req.body.frequency,
      route: req.body.route || "Oral",
      duration: req.body.duration || "7 days",
      refills: req.body.refills || 0,
      status: 'Active',
      notes: req.body.notes
    });
    
    const prescription = await newPrescription.save();
    
    // Save to medical record as well, similar to the authenticated endpoint
    try {
      const session = await mongoose.startSession();
      session.startTransaction();
      
      let visitId = req.body.visitId;
      let medicalRecord = null;
      
      if (visitId) {
        // Find the most recent medical record for this patient and visit
        medicalRecord = await MedicalRecord.findOne({ 
          patient: patientId,
          visit: visitId
        }).sort({ createdAt: -1 }).session(session);
      }
      
      // If no visit ID was specified or no medical record found for that visit,
      // find the most recent medical record for the patient
      if (!medicalRecord) {
        console.log(`[PUBLIC PRESCRIPTION] No medical record found for visit ${visitId}, looking for most recent record for patient`);
        medicalRecord = await MedicalRecord.findOne({ 
          patient: patientId
        }).sort({ createdAt: -1 }).session(session);
      }
      
      // If a medical record was found, add the prescription to it
      if (medicalRecord) {
        console.log(`[PUBLIC PRESCRIPTION] Found medical record ${medicalRecord._id} for patient, adding prescription`);
        
        // Create prescription entry for medical record
        const prescriptionEntry = {
          medication: req.body.medicationItem || null, // Link to inventory item if specified
          alternativeMedication: req.body.medicationName || 'Unnamed Medication', // Ensure we always have a medication name
          dosage: req.body.dosage,
          frequency: req.body.frequency,
          duration: req.body.duration || "7 days",
          quantity: req.body.quantity || 1,
          refills: req.body.refills || 0,
          route: req.body.route || "Oral",
          instructions: req.body.notes || req.body.instructions,
          prescribedBy: doctorId,
        status: 'Active',
          startDate: new Date()
        };
        
        // Add to prescriptions array
        if (!medicalRecord.prescriptions) {
          medicalRecord.prescriptions = [];
        }
        medicalRecord.prescriptions.push(prescriptionEntry);
        
        // Update last modified information
        medicalRecord.lastUpdatedBy = doctorId;
        
        await medicalRecord.save({ session });
        
        // Link the prescription to the medical record
        prescription.medicalRecord = medicalRecord._id;
        await prescription.save({ session });
        
        console.log(`[PUBLIC PRESCRIPTION] Successfully added prescription to medical record ${medicalRecord._id}`);
      } else {
        console.log(`[PUBLIC PRESCRIPTION] No medical record found for patient ${patientId}, creating a new one`);
        
        // Create a new medical record for this prescription if one doesn't exist
        const newMedicalRecord = new MedicalRecord({
          patient: patientId,
          visit: new mongoose.Types.ObjectId('000000000000000000000000'),
          primaryProvider: doctorId,
          status: 'Draft',
          createdBy: doctorId,
          lastUpdatedBy: doctorId,
          chiefComplaint: {
            description: 'Prescription created separately'
          },
          treatmentPlan: `Prescription for ${req.body.medicationName}`,
          prescriptions: [{
            alternativeMedication: req.body.medicationName || 'Unnamed Medication', // Ensure we always have a medication name
            dosage: req.body.dosage,
            frequency: req.body.frequency,
            duration: req.body.duration || "7 days",
            quantity: req.body.quantity || 1,
            refills: req.body.refills || 0,
            route: req.body.route || "Oral",
            instructions: req.body.notes || req.body.instructions,
            prescribedBy: doctorId,
            status: 'Active',
            startDate: new Date()
          }]
        });
        
        await newMedicalRecord.save({ session });
        
        // Link the prescription to the medical record
        prescription.medicalRecord = newMedicalRecord._id;
        await prescription.save({ session });
        
        console.log(`[PUBLIC PRESCRIPTION] Created new medical record ${newMedicalRecord._id} with the prescription`);
      }
      
      await session.commitTransaction();
      session.endSession();
    } catch (medicalRecordError) {
      console.error('[PUBLIC PRESCRIPTION] Error saving to medical record:', medicalRecordError);
      // We still return success since the prescription itself was saved
    }
    
    res.status(201).json(prescription);
  } catch (err) {
    console.error('Error creating prescription via public endpoint:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST endpoint to sync prescriptions with medical records for a patient
router.post('/sync-with-medical-records/:patientId', async (req, res) => {
  try {
    const patientId = req.params.patientId;
    console.log(`[SYNC] Manual sync requested for patient: ${patientId}`);
    
    // Need mongoose for creating ObjectId
    const mongoose = require('mongoose');
    
    // Find all prescriptions for this patient
    const prescriptions = await Prescription.find({
      $or: [
        { patient: patientId },
        { patientId: patientId }
      ]
    });
    
    console.log(`[SYNC] Found ${prescriptions.length} prescriptions for patient`);
    
    if (prescriptions.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No prescriptions found for this patient' 
      });
    }
    
    // Find the most recent medical record for this patient
    let medicalRecord = await MedicalRecord.findOne({ patient: patientId })
      .sort({ createdAt: -1 });
    
    // If no medical record exists, create one
    if (!medicalRecord) {
      console.log(`[SYNC] No medical record found for patient ${patientId}, creating a new one`);
    
      // Try to find a doctor associated with this patient's prescriptions
      let doctorId = null;
      for (const prescription of prescriptions) {
        if (prescription.doctor || prescription.doctorId) {
          doctorId = prescription.doctor || prescription.doctorId;
          break;
        }
      }
      
      // If no doctor found, try to find one in the system
      if (!doctorId) {
        const User = require('../models/User');
        const doctor = await User.findOne({ role: 'doctor' });
        if (doctor) {
          doctorId = doctor._id;
        }
      }
      
      if (!doctorId) {
        return res.status(400).json({
          success: false,
          message: 'Unable to create medical record - no doctor found'
        });
      }
      
      // Create a new medical record
      medicalRecord = new MedicalRecord({
        patient: patientId,
        primaryProvider: doctorId,
        createdBy: doctorId,
        lastUpdatedBy: doctorId,
        status: 'Draft',
        visit: new mongoose.Types.ObjectId('000000000000000000000000'),
        chiefComplaint: {
          description: 'Created by prescription sync'
        },
        prescriptions: []
      });
    } else {
      console.log(`[SYNC] Found medical record ${medicalRecord._id}`);
    }
    
    // Ensure prescriptions array exists
    if (!medicalRecord.prescriptions) {
      medicalRecord.prescriptions = [];
    }
    
    // Track which prescriptions are already in the medical record to avoid duplicates
    const existingMedications = new Set();
    medicalRecord.prescriptions.forEach(p => {
      const key = `${p.alternativeMedication}-${p.dosage}-${p.frequency}`;
      existingMedications.add(key);
    });
    
    let addedCount = 0;
    
    // Add each prescription to the medical record if it's not already there
    for (const prescription of prescriptions) {
      const key = `${prescription.medicationName}-${prescription.dosage}-${prescription.frequency}`;
      
      if (!existingMedications.has(key)) {
        // Add the prescription to the medical record
        medicalRecord.prescriptions.push({
          alternativeMedication: prescription.medicationName,
          dosage: prescription.dosage || "As directed",
          frequency: prescription.frequency || "As needed",
          duration: prescription.duration || "7 days",
          route: prescription.route || "Oral",
          quantity: prescription.quantity || 1,
          refills: prescription.refills || 0,
          instructions: prescription.notes || prescription.instructions,
          prescribedBy: prescription.doctor || prescription.doctorId,
          status: prescription.status || 'Active',
          startDate: prescription.createdAt || new Date()
        });
        
        addedCount++;
        existingMedications.add(key);
      }
    }
    
    if (addedCount > 0) {
      // Save the updated medical record
      await medicalRecord.save();
      console.log(`[SYNC] Added ${addedCount} prescriptions to medical record`);
    } else {
      console.log(`[SYNC] No new prescriptions to add`);
    }
    
    return res.json({
      success: true,
      message: `Synced ${addedCount} prescriptions with medical record`,
      medicalRecordId: medicalRecord._id,
      addedCount,
      totalPrescriptions: prescriptions.length
    });
    
  } catch (error) {
    console.error('[SYNC] Error syncing prescriptions with medical records:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router; 
