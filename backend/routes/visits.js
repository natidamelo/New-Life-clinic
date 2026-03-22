const express = require('express');
const router = express.Router();
const Visit = require('../models/Visit');
const { auth, checkRole } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// GET all visits (add query params for filtering by date, patient, doctor, status)
router.get('/', auth, async (req, res) => {
  try {
    // TODO: Implement filtering based on req.query
    const filter = {}; 
    const visits = await Visit.find(filter)
                                .populate('patientId', 'firstName lastName')
                                .populate('doctorId', 'firstName lastName')
                                .populate('nurseId', 'firstName lastName');
    res.json(visits);
  } catch (err) {
    console.error('Error fetching visits:', err);
    res.status(500).send('Server Error');
  }
});

// GET visit by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const visitId = req.params.id;
    
    const visit = await Visit.findById(visitId)
                             .populate('patientId')
                             .populate('doctorId')
                             .populate('nurseId')
                             .populate('prescriptionIds') // Populate linked documents
                             .populate('labOrderIds')
                             .populate('imagingOrderIds');
    if (!visit) {
      return res.status(404).json({ msg: 'Visit not found' });
    }
    res.json(visit);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Visit not found' });
    }
    res.status(500).send('Server Error');
  }
});

// GET LATEST ACTIVE visit for a specific patient
router.get('/patient/:patientId/latest-active', auth, async (req, res) => {
  try {
    const patientId = req.params.patientId;
    
    // Validate the patient ID format
    if (!patientId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ msg: 'Invalid Patient ID format' });
    }
    
    const latestVisit = await Visit.findOne({
      patientId: patientId,
      status: 'Active' // Ensure the visit is currently active
    })
    .sort({ visitStartDateTime: -1 }); // Get the most recent one

    if (!latestVisit) {
      return res.status(404).json({ msg: 'No active visit found for this patient' });
    }
    res.json(latestVisit);
  } catch (err) {
    console.error('Error fetching latest active visit:', err);
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ msg: 'Invalid Patient ID format' });
    }
    res.status(500).send('Server Error');
  }
});

// POST create new visit (e.g., when patient checks in or visit starts)
router.post('/', [auth,
  checkRole('admin', 'reception', 'nurse'), // Roles that can initiate a visit
  body('patientId', 'Patient ID is required').not().isEmpty().isMongoId(),
  body('doctorId', 'Doctor ID is required').not().isEmpty().isMongoId(), // Or assign later?
  body('department', 'Department is required').not().isEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const newVisit = new Visit({
      patientId: req.body.patientId,
      appointmentId: req.body.appointmentId, // Optional
      doctorId: req.body.doctorId,
      nurseId: req.body.nurseId, // Optional, maybe assigned during intake
      visitStartDateTime: req.body.visitStartDateTime || Date.now(),
      department: req.body.department,
      chiefComplaint: req.body.chiefComplaint,
      status: 'Active' // Initial status
      // Vitals and notes will be added via separate endpoints/updates
    });

    const visit = await newVisit.save();
    res.status(201).json(visit);
  } catch (err) {
    console.error('Error creating visit:', err);
    res.status(500).send('Server Error');
  }
});

// PUT update visit details (e.g., add diagnosis, end time, change status)
router.put('/:id', [auth,
  checkRole('admin', 'nurse', 'doctor'),
  // Add specific validations for updatable fields
  body('status').optional().isIn(['Active', 'Discharged', 'Pending Billing', 'Cancelled']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Exclude arrays like vitals, notes, orders from direct $set
    const { vitals, notes, prescriptionIds, labOrderIds, imagingOrderIds, ...updateFields } = req.body;
    
    const visit = await Visit.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!visit) {
      return res.status(404).json({ msg: 'Visit not found' });
    }

    res.json(visit);
  } catch (err) {
    console.error('Error updating visit:', err);
    res.status(500).send('Server Error');
  }
});

// POST add vital signs to a visit
router.post('/:id/vitals', [auth,
          checkRole('nurse', 'doctor'), // Only clinical staff can add vitals
    // TODO: Add validation for vital signs fields
], async (req, res) => {
    try {
        const visitId = req.params.id;
        
        // Validate the visit ID format
        if (!visitId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ msg: 'Invalid Visit ID format' });
        }
        
        // Find the visit by ID
        const visit = await Visit.findById(visitId);
        if (!visit) {
            return res.status(404).json({ msg: 'Visit not found' });
        }
        
        const newVitals = { ...req.body, timestamp: Date.now() }; // Add timestamp
        visit.vitals.push(newVitals);
        
        // Explicitly mark the array as modified
        visit.markModified('vitals');
        
        // Log the save result
        console.log('Attempting to save visit with updated vitals...');
        const saveResult = await visit.save(); 
        console.log('Visit save result:', saveResult ? 'Save successful' : 'Save failed or returned null');

        // Check the vitals array after save confirmation
        const savedVisit = await Visit.findById(visitId); // Re-fetch to be sure
        console.log('Vitals array content after re-fetch:', savedVisit ? savedVisit.vitals : 'Could not re-fetch visit');
        
        // Send back the vitals array from the saved document
        res.status(201).json(savedVisit ? savedVisit.vitals : []); 

    } catch (err) {
        console.error('Error adding vitals:', err);
        res.status(500).send('Server Error');
    }
});

// POST add a note to a visit
router.post('/:id/notes', [auth,
          checkRole('nurse', 'doctor'),  
    body('noteType', 'Note type is required').not().isEmpty(),
    body('text', 'Note text is required').not().isEmpty(),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    try {
        const visit = await Visit.findById(req.params.id);
        if (!visit) {
            return res.status(404).json({ msg: 'Visit not found' });
        }
        
        const newNote = {
            authorId: req.user.id, // Get logged-in user ID from auth middleware
            noteType: req.body.noteType,
            text: req.body.text,
            timestamp: Date.now()
        };
        visit.notes.push(newNote);
        await visit.save();
        res.status(201).json(visit.notes);
    } catch (err) {
        console.error('Error adding note:', err);
        res.status(500).send('Server Error');
    }
});

// DELETE visit (use with caution)
router.delete('/:id', auth, checkRole('admin'), async (req, res) => {
  try {
    const visit = await Visit.findByIdAndDelete(req.params.id);
    if (!visit) {
      return res.status(404).json({ msg: 'Visit not found' });
    }
    res.json({ msg: 'Visit removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router; 
