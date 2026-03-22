const express = require('express');
const router = express.Router();
const { auth, checkPermission } = require('../middleware/auth');
const Prescription = require('../models/Prescription');
const MedicalRecord = require('../models/MedicalRecord');
const mongoose = require('mongoose');
const Visit = require('../models/Visit');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { checkDbConnection, testDbOperation } = require('../utils/dbDebugHelper');
const { safeQuery, executeWithTimeout } = require('../utils/queryOptimizer');
const EnhancedMedicationPaymentProcessor = require('../enhanced-medication-payment-processor');
const InventoryItem = require('../models/InventoryItem');
const Notification = require('../models/Notification');
const Patient = require('../models/Patient');
const { createPrescriptionWithValidation, cleanupDuplicatePrescriptions } = require('../utils/prescriptionValidation');
// Extension utilities removed - simplified prescription system
const MedicalInvoice = require('../models/MedicalInvoice');
const NurseTask = require('../models/NurseTask');
const MedicationPricingService = require('../utils/medicationPricingService');

// Helper function to generate dose records
function generateDoseRecords({ frequency, duration }) {
  const doseRecords = [];
  const freq = frequency?.toLowerCase() || 'once daily';
  let dosesPerDay = 1;
  
  // Determine doses per day based on frequency
  if (freq.includes('bid') || freq.includes('twice')) {
    dosesPerDay = 2;
  } else if (freq.includes('tid') || freq.includes('three')) {
    dosesPerDay = 3;
  } else if (freq.includes('qid') || freq.includes('four')) {
    dosesPerDay = 4;
  }
  
  // Generate time slots for each dose
  const getTimeSlots = (dosesPerDay) => {
    switch (dosesPerDay) {
      case 2: return ['09:00', '21:00'];
      case 3: return ['09:00', '15:00', '21:00'];
      case 4: return ['09:00', '13:00', '17:00', '21:00'];
      default: return ['09:00'];
    }
  };
  
  const timeSlots = getTimeSlots(dosesPerDay);
  
  // Create dose records for each day and time slot
  for (let day = 1; day <= duration; day++) {
    for (let doseIndex = 0; doseIndex < dosesPerDay; doseIndex++) {
      doseRecords.push({
        day: day,
        timeSlot: timeSlots[doseIndex],
        administered: false,
        administeredAt: null,
        administeredBy: null,
        notes: '',
        period: 'active'
      });
    }
  }
  
  return doseRecords;
}

// GET prescriptions by patient ID
router.get('/patient/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    
    console.log(`Fetching prescriptions for patient: ${patientId}`);
    
    const prescriptions = await Prescription.find({
      $or: [
        { patient: patientId },
        { patientId: patientId }
      ]
    })
    .populate('patient', 'firstName lastName patientId')
    .populate('doctor', 'firstName lastName')
    .sort({ datePrescribed: -1 })
    .lean();
    
    console.log(`Found ${prescriptions.length} prescriptions for patient ${patientId}`);
    
    res.json({
      success: true,
      data: prescriptions
    });
  } catch (error) {
    console.error('Error fetching prescriptions by patient:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching prescriptions',
      error: error.message
    });
  }
});

// GET all prescriptions
router.get('/', async (req, res) => {
  try {
    const filter = {};
    
    if (req.query.patientId) {
      try {
        const patientObjId = new mongoose.Types.ObjectId(req.query.patientId);
        filter.$or = [
          { patient: patientObjId },
          { patientId: patientObjId }
        ];
      } catch (err) {
        filter.$or = [
          { patient: req.query.patientId },
          { patientId: req.query.patientId }
        ];
      }
    }
    
    if (req.query.doctorId) {
      filter.$or = filter.$or || [];
      filter.$or.push({ doctor: req.query.doctorId });
      filter.$or.push({ doctorId: req.query.doctorId });
    }
    
    if (req.query.status) filter.status = req.query.status;
    
    console.log('Starting prescription query with filter:', filter);
    
    const prescriptions = await Prescription.find(filter)
      .sort({ datePrescribed: -1 })
      .limit(1000)
      .maxTimeMS(10000)
      .populate('patient', 'firstName lastName')
      .populate('patientId', 'firstName lastName')
      .populate('doctor', 'firstName lastName')
      .populate('doctorId', 'firstName lastName')
      .lean();
    
    console.log(`Found ${prescriptions.length} prescriptions`);
      
    res.json(prescriptions);
  } catch (err) {
    console.error('Error fetching prescriptions:', err);
    if (err.message.includes('timeout') || err.message.includes('timed out')) {
      return res.status(408).json({ message: 'Database query timed out - please try again' });
    }
    if (err.message.includes('connection')) {
      return res.status(503).json({ message: 'Database connection error - please try again' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// GET pending prescriptions for reception
router.get('/pending-for-reception', async (req, res) => {
  try {
    console.log('Fetching pending prescriptions for reception (inventory medications only)');
    const pendingPrescriptions = await Prescription.find({
      $and: [
        { medicationItem: { $exists: true, $ne: null } },
        {
          $or: [
            { paymentStatus: { $in: ['pending', 'unpaid'] } },
            { paymentStatus: { $exists: false } },
            { 
              $and: [
                { status: { $in: ['PENDING', 'Pending', 'Active'] } },
                { paymentStatus: { $ne: 'paid' } }
              ]
            }
          ]
        }
      ]
    })
    .populate('patient', 'firstName lastName')
    .populate('doctor', 'firstName lastName')
    .populate('medicationItem', 'name price')
    .sort({ createdAt: -1 })
    .limit(50);
    
    console.log(`Found ${pendingPrescriptions.length} pending prescriptions for inventory medications`);
    
    const validPrescriptions = pendingPrescriptions.filter(prescription => 
      prescription.medicationItem && prescription.medicationItem._id
    );
    
    console.log(`${validPrescriptions.length} prescriptions have valid inventory items`);
    res.json(validPrescriptions);
  } catch (error) {
    console.error('Error fetching pending prescriptions:', error);
    res.status(500).json({ 
      message: 'Error fetching prescription', 
      error: error.message 
    });
  }
});

// POST quick medication order
router.post('/quick-order', auth, async (req, res) => {
  try {
    const {
      patientId,
      doctorId,
      medicationName,
      dosage,
      frequency,
      durationDays,
      route: medRoute,
      notes,
      inventoryItemId,
      sendToNurse = true
    } = req.body || {};

    if (!patientId || !doctorId || !medicationName || !dosage || !frequency) {
      return res.status(400).json({
        success: false,
        message: 'patientId, doctorId, medicationName, dosage, and frequency are required'
      });
    }

    // Helper to map frequency to doses per day
    const getDosesPerDay = (freq) => {
      if (!freq) return 1;
      const { parseFrequencyToDosesPerDay } = require('../utils/frequencyDetection');
      const frequencyResult = parseFrequencyToDosesPerDay(freq);
      return frequencyResult.dosesPerDay;
    };

    // Resolve inventory price
    let costPerDose = null;
    try {
      if (inventoryItemId) {
        const inv = await InventoryItem.findById(inventoryItemId);
        if (inv) costPerDose = inv.sellingPrice || inv.unitPrice || costPerDose;
      } else {
        const invByName = await InventoryItem.findOne({ name: { $regex: new RegExp(medicationName, 'i') } });
        if (invByName) costPerDose = invByName.sellingPrice || invByName.unitPrice || costPerDose;
      }
    } catch {}

    const dosesPerDay = getDosesPerDay(frequency);
    const totalDoses = (Number(durationDays) || 1) * dosesPerDay;
    const totalCost = totalDoses * costPerDose;

    const newPrescription = new Prescription({
      patient: patientId,
      doctor: doctorId,
      doctorId: doctorId, // Ensure both doctor and doctorId fields are set
      medicationName,
      dosage,
      frequency,
      route: medRoute || 'Oral',
      duration: `${Number(durationDays) || 1} days`,
      status: 'Pending',
      notes: notes || '',
      medicationItem: inventoryItemId || undefined,
      medications: [{
        inventoryItem: inventoryItemId || undefined,
        name: medicationName,
        dosage,
        frequency,
        duration: `${Number(durationDays) || 1} days`,
        route: medRoute || 'Oral',
        notes: notes || '',
        sendToNurse
      }],
      paymentStatus: 'pending',
      totalCost
    });
    await newPrescription.save();

    // Create reception payment notification
    try {
      const patientDoc = await Patient.findById(patientId).select('firstName lastName');
      const senderId = doctorId;
      await Notification.create({
        senderId,
        senderRole: 'doctor',
        recipientRole: 'reception',
        type: 'medication_payment_required',
        title: 'Medication Payment Required',
        message: `Medication payment required for ${patientDoc?.firstName || ''} ${patientDoc?.lastName || ''}. Total amount: ${totalCost}`,
        data: {
          prescriptionId: newPrescription._id,
          patientId,
          patientName: `${patientDoc?.firstName || ''} ${patientDoc?.lastName || ''}`.trim(),
          totalAmount: totalCost,
          amount: totalCost,
          medications: [{
            name: medicationName,
            dosage,
            frequency,
            duration: `${Number(durationDays) || 1} days`,
            totalPrice: totalCost,
            inventoryItemId
          }],
          isExtension: false
        }
      });
    } catch (notifyErr) {
      console.warn('⚠️ Failed to create reception payment notification:', notifyErr?.message || notifyErr);
    }

    return res.status(201).json({
      success: true,
      message: 'Prescription created. Payment required before nurse tasks are created.',
      data: {
        prescriptionId: newPrescription._id,
        requiredAmount: totalCost,
        paymentRequired: true,
        paymentEndpoint: `/api/prescriptions/process-payment/${newPrescription._id}`,
        sendToNurseAfterPayment: sendToNurse
      }
    });

  } catch (error) {
    console.error('Error in quick-order:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

// GET prescription by ID
router.get('/:id', async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id)
      .maxTimeMS(5000)
      .populate('patientId')
      .populate('doctorId');
    if (!prescription) {
      return res.status(404).json({ msg: 'Prescription not found' });
    }
    res.json(prescription);
  } catch (err) {
    console.error(err.message);
    if (err.message.includes('timeout')) {
      return res.status(408).json({ message: 'Database query timed out - please try again' });
    }
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Prescription not found' });
    }
    res.status(500).send('Server Error');
  }
});

// POST create new prescription
router.post('/', async (req, res) => {
  try {
    const {
      patientId,
      patient,
      doctorId,
      medications,
      duration,
      notes,
      status,
      sendToNurse,
      instructions
    } = req.body;

    const effectivePatientId = patientId || patient;

    if (!effectivePatientId || !doctorId) {
      return res.status(400).json({
        success: false,
        error: 'Patient ID and Doctor ID are required'
      });
    }

    if (!medications || !Array.isArray(medications) || medications.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one medication is required'
      });
    }

    // Create prescription data
    const prescriptionData = {
      patient: effectivePatientId,
      doctor: doctorId,
      medicationName: medications[0].medication,
      dosage: medications[0].dosage,
      frequency: medications[0].frequency,
      route: medications[0].route || 'Oral',
      quantity: medications[0].quantity || 1,
      notes: medications[0].nurseInstructions || notes,
      duration: duration || '1 day',
      status: status || 'Pending',
      sendToNurse: medications[0].sendToNurse !== undefined ? medications[0].sendToNurse : true,
      medicationItem: medications[0].inventoryItemId,
      datePrescribed: new Date(),
      instructions: instructions || '',
      medications: medications.map(med => ({
        inventoryItem: med.inventoryItemId || null,
        name: med.medication,
        dosage: med.dosage,
        frequency: med.frequency,
        duration: duration || '1 day',
        route: med.route || 'Oral',
        notes: med.nurseInstructions || '',
        sendToNurse: med.sendToNurse !== undefined ? med.sendToNurse : true,
        assignedNurseId: med.assignedNurseId || null
      }))
    };

    console.log("Creating prescription with medications array:", JSON.stringify(prescriptionData, null, 2));
    
    // Use validation utility to create prescription
    const validationResult = await createPrescriptionWithValidation(prescriptionData, medications[0].assignedNurseId);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Prescription creation failed',
        details: validationResult.errors,
        warnings: validationResult.warnings
      });
    }
    
    const prescription = validationResult.prescription;
    const createdPrescriptions = [prescription];
    
    // Create notification and invoice
    if (createdPrescriptions.length > 0) {
      try {
        const patientData = await Patient.findById(effectivePatientId);
        if (!patientData) {
          console.error('❌ Patient not found for notification creation');
          return;
        }
        
        // Calculate costs for each medication
        const notificationMedications = await Promise.all(createdPrescriptions[0].medications.map(async (med) => {
          let estimatedCost = 0;
          
          if (med.inventoryItem) {
            try {
              const inventoryDoc = await InventoryItem.findById(med.inventoryItem);
              if (inventoryDoc && inventoryDoc.sellingPrice) {
                const MedicationCalculator = require('../utils/medicationCalculator');
                const calculation = await MedicationCalculator.calculateMedicationCost({
                  name: med.name,
                  frequency: med.frequency,
                  duration: med.duration || '5 days',
                  inventoryItemId: med.inventoryItem
                });
                estimatedCost = calculation.totalCost;
              }
            } catch (inventoryError) {
              console.error(`❌ Error finding inventory item for ${med.name}:`, inventoryError);
            }
          }

          return {
            name: med.name,
            dosage: med.dosage,
            frequency: med.frequency,
            duration: med.duration,
            totalPrice: estimatedCost,
            inventoryItemId: med.inventoryItem,
            prescriptionId: createdPrescriptions[0]._id
          };
        }));

        const overallTotalAmount = notificationMedications.reduce((acc, med) => acc + med.totalPrice, 0);

        if (overallTotalAmount > 0) {
          const senderId = req.user?._id || new mongoose.Types.ObjectId();
          
          const receptionNotification = new Notification({
            senderId: senderId,
            senderRole: 'doctor',
            recipientRole: 'reception',
            type: 'medication_payment_required',
            title: 'Medication Payment Required',
            message: `Medication payment required for ${patientData.firstName} ${patientData.lastName}. Total amount: ${overallTotalAmount}`,
            data: {
              prescriptionId: createdPrescriptions[0]._id,
              patientId: patientData._id,
              patientName: `${patientData.firstName} ${patientData.lastName}`,
              totalAmount: overallTotalAmount,
              medications: notificationMedications
            },
          });
          
          await receptionNotification.save();
          
          // Create invoice automatically
          try {
            const PrescriptionInvoiceService = require('../services/prescriptionInvoiceService');
            const doctor = await User.findById(doctorId);
            
            if (doctor) {
              const invoice = await PrescriptionInvoiceService.createInvoiceForPrescription(
                createdPrescriptions[0],
                notificationMedications,
                patientData,
                doctor
              );
              
              await PrescriptionInvoiceService.updateNotificationWithInvoice(
                receptionNotification._id,
                invoice._id
              );
              
              console.log(`✅ Invoice created automatically: ${invoice._id}`);
            }
          } catch (invoiceError) {
            console.error('❌ Error creating invoice automatically:', invoiceError);
          }
        }
      } catch (notificationError) {
        console.error('❌ Error creating notification:', notificationError);
      }
    }
    
    // Create nurse tasks for medications with inventory items
    for (const prescription of createdPrescriptions) {
      try {
        const hasInventoryItem = !!(
          prescription.medicationItem ||
          (Array.isArray(prescription.medications) && prescription.medications[0] && prescription.medications[0].inventoryItem)
        );
        
        if (!hasInventoryItem) {
          console.log('Skipping nurse task for non-inventory medication:', prescription.medicationName);
          continue;
        }

        const { createMedicationTaskWithDuplicatePrevention } = require('../utils/taskDuplicatePrevention');

        const patientDoc = await mongoose.model('Patient').findById(prescription.patient);
        const patientName = patientDoc ? `${patientDoc.firstName || ''} ${patientDoc.lastName || ''}`.trim() : 'Unknown Patient';
        const doctorDoc = await User.findById(prescription.doctor);
        const doctorName = doctorDoc ? `${doctorDoc.firstName || ''} ${doctorDoc.lastName || ''}`.trim() : 'Unknown Doctor';
      
        let assignedNurseId = null;
        let assignedNurseName = null;
        if (patientDoc && patientDoc.assignedNurseId) {
          const nurseDoc = await User.findById(patientDoc.assignedNurseId);
          if (nurseDoc && nurseDoc.role === 'nurse') {
            assignedNurseId = nurseDoc._id;
            assignedNurseName = `${nurseDoc.firstName || ''} ${nurseDoc.lastName || ''}`.trim();
          }
        }
      
        const extractNumericDuration = (durationStr) => {
          if (!durationStr) return null;
          if (typeof durationStr === 'number') return durationStr;
          const match = durationStr.toString().match(/(\d+)/);
          return match ? parseInt(match[1]) : null;
        };
      
        const numericDuration = extractNumericDuration(prescription.duration);
        
        const PaymentCalculation = require('../utils/paymentCalculation');
        const costBreakdown = PaymentCalculation.calculateMedicationCost(
          prescription.frequency,
          numericDuration || 7
        );
        
        const paymentAuth = PaymentCalculation.calculatePaymentAuthorization(
          {
            frequency: prescription.frequency,
            duration: numericDuration || 7
          },
          0,
          costBreakdown.totalCost
        );
        
        const taskData = {
          patientId: prescription.patient,
          patientName: patientName,
          description: `Administer ${prescription.medicationName} - ${prescription.dosage} - ${prescription.frequency}`,
          taskType: 'MEDICATION',
          status: 'PENDING',
          priority: 'MEDIUM',
          assignedBy: prescription.doctor,
          assignedByName: doctorName,
          assignedTo: assignedNurseId,
          assignedToName: assignedNurseName,
          notes: prescription.notes || prescription.instructions || '',
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          medicationDetails: {
            medicationName: prescription.medicationName,
            dosage: prescription.dosage,
            frequency: prescription.frequency,
            route: prescription.route || 'Oral',
            instructions: prescription.notes || prescription.instructions || '',
            duration: numericDuration,
            startDate: prescription.datePrescribed || prescription.createdAt || new Date(),
            prescriptionId: prescription._id,
            doseRecords: generateDoseRecords({
              frequency: prescription.frequency,
              duration: numericDuration
            })
          },
          paymentAuthorization: paymentAuth
        };

        const result = await createMedicationTaskWithDuplicatePrevention(
          taskData,
          prescription.patient,
          prescription.medicationName,
          prescription._id,
          null,
          null
        );
        
        if (result.created) {
          console.log('✅ Nurse task created for medication:', prescription.medicationName);
        } else {
          console.log('⚠️ Duplicate task found, skipped creation for:', prescription.medicationName);
        }
      
      } catch (nurseTaskError) {
        console.error('Error creating nurse task for medication:', prescription.medicationName, nurseTaskError);
      }
    }

    res.status(201).json({ success: true, data: createdPrescriptions });
  } catch (err) {
    console.error('Error creating prescription:', err);
    res.status(500).json({ success: false, error: 'Server Error', details: err.message });
  }
});

// PUT update prescription
router.put('/:id', [auth, checkPermission('doctor', 'admin'), body('status').optional().isIn(['Active', 'Inactive', 'Cancelled', 'Completed'])], async (req, res) => {
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

// DELETE prescription
router.delete('/:id', [auth, checkPermission('doctor', 'admin')], async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id);

    if (!prescription) {
      return res.status(404).json({ msg: 'Prescription not found' });
    }

    prescription.status = 'Cancelled';
    await prescription.save();

    res.json({ msg: 'Prescription cancelled' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Export the router
module.exports = router;
