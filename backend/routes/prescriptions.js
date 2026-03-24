const express = require('express');
const router = express.Router();
const { auth, checkPermission } = require('../middleware/auth');
const { syncPaymentData } = require('../middleware/paymentSyncMiddleware');
const Prescription = require('../models/Prescription');
const MedicalRecord = require('../models/MedicalRecord');
const mongoose = require('mongoose');
const Visit = require('../models/Visit');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { checkDbConnection, testDbOperation } = require('../utils/dbDebugHelper');
const { safeQuery, executeWithTimeout } = require('../utils/queryOptimizer');
const EnhancedMedicationPaymentProcessor = require('../enhanced-medication-payment-processor');
const InventoryItem = require('../models/InventoryItem'); // Ensure this path is correct
const Notification = require('../models/Notification'); // Add Notification model import
const Patient = require('../models/Patient'); // Add Patient model import
const { createPrescriptionWithValidation, cleanupDuplicatePrescriptions } = require('../utils/prescriptionValidation');
// Extension utilities removed - simplified prescription system
// Multiple extension handler removed
const MedicalInvoice = require('../models/MedicalInvoice'); // Add MedicalInvoice model import
const NurseTask = require('../models/NurseTask'); // Add NurseTask model import
const MedicationPricingService = require('../utils/medicationPricingService');
const telegramService = require('../services/telegramService');

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
    .populate('patient', 'firstName lastName patientId age gender address phoneNumber')
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

// POST /api/prescriptions/backfill-patient-snapshots
// Backfill: populate patientSnapshot for prescriptions missing it.
// For prescriptions where patient=null, looks up via NurseTask (which stores patientId + patientName).
router.post('/backfill-patient-snapshots', async (req, res) => {
  try {
    const PatientModel = require('../models/Patient');
    const NurseTask = require('../models/NurseTask');

    // Process up to 100 at a time to avoid timeout
    const missing = await Prescription.find({ 'patientSnapshot.firstName': { $exists: false } })
      .select('_id patient patientId invoiceId')
      .limit(100)
      .lean();

    console.log(`[BACKFILL] Processing ${missing.length} prescriptions without patientSnapshot`);

    // Collect unique patient IDs from prescriptions that have them
    const prescriptionIds = missing.map(p => p._id);
    const patientIds = [...new Set(
      missing.map(p => (p.patient || p.patientId)?.toString()).filter(Boolean)
    )];

    // Fetch patients by direct ID
    const patients = await PatientModel.find({ _id: { $in: patientIds } })
      .select('firstName lastName patientId age gender address phoneNumber contactNumber')
      .lean();
    const patientMap = new Map(patients.map(p => [p._id.toString(), p]));

    // For prescriptions with null patient, look up via NurseTask and MedicalInvoice
    const nullPatientPrescIds = missing
      .filter(p => !p.patient && !p.patientId)
      .map(p => p._id);

    // NurseTask lookup
    const nurseTasks = nullPatientPrescIds.length > 0
      ? await NurseTask.find({ prescriptionId: { $in: nullPatientPrescIds } })
          .select('prescriptionId patientId patientName')
          .lean()
      : [];

    const nurseTaskPatientMap = new Map();
    for (const nt of nurseTasks) {
      if (nt.prescriptionId) {
        nurseTaskPatientMap.set(nt.prescriptionId.toString(), {
          patientId: nt.patientId?.toString(),
          patientName: nt.patientName
        });
      }
    }

    // MedicalInvoice lookup for prescriptions with invoiceId
    const MedicalInvoice = require('../models/MedicalInvoice');
    const invoiceIds = missing.map(p => p.invoiceId).filter(Boolean);
    const invoices = invoiceIds.length > 0
      ? await MedicalInvoice.find({ _id: { $in: invoiceIds } })
          .select('_id patientName patientId patient')
          .lean()
      : [];
    const invoiceMap = new Map(invoices.map(inv => [inv._id.toString(), inv]));

    // Fetch patients found via nurse tasks
    const nurseTaskPatientIds = [...new Set(
      [...nurseTaskPatientMap.values()].map(v => v.patientId).filter(Boolean)
    )];
    if (nurseTaskPatientIds.length > 0) {
      const nursePatients = await PatientModel.find({ _id: { $in: nurseTaskPatientIds } })
        .select('firstName lastName patientId age gender address phoneNumber contactNumber')
        .lean();
      for (const p of nursePatients) patientMap.set(p._id.toString(), p);
    }

    // Also try to find patients by patientId string from invoices
    const invoicePatientIdStrings = [...new Set(invoices.map(inv => inv.patientId).filter(Boolean))];
    if (invoicePatientIdStrings.length > 0) {
      const invPatients = await PatientModel.find({ patientId: { $in: invoicePatientIdStrings } })
        .select('firstName lastName patientId age gender address phoneNumber contactNumber')
        .lean();
      for (const p of invPatients) {
        patientMap.set(p._id.toString(), p);
        if (p.patientId) patientMap.set(p.patientId, p);
      }
    }

    let updated = 0;
    await Promise.all(missing.map(async (p) => {
      let patientDoc = null;
      let nameOverride = null;

      // 1. Try direct patient ObjectId
      const directId = (p.patient || p.patientId)?.toString();
      if (directId) patientDoc = patientMap.get(directId) || null;

      // 2. Try nurse task lookup
      if (!patientDoc) {
        const ntInfo = nurseTaskPatientMap.get(p._id.toString());
        if (ntInfo) {
          if (ntInfo.patientId) patientDoc = patientMap.get(ntInfo.patientId) || null;
          if (!patientDoc && ntInfo.patientName) nameOverride = ntInfo.patientName;
        }
      }

      // 3. Try invoice lookup
      if (!patientDoc && !nameOverride && p.invoiceId) {
        const inv = invoiceMap.get(p.invoiceId.toString());
        if (inv) {
          if (inv.patient) patientDoc = patientMap.get(inv.patient.toString()) || null;
          if (!patientDoc && inv.patientId) patientDoc = patientMap.get(inv.patientId) || null;
          if (!patientDoc && inv.patientName) nameOverride = inv.patientName;
        }
      }

      if (!patientDoc && !nameOverride) return;

      try {
        let firstName = '', lastName = '';
        if (patientDoc) {
          firstName = patientDoc.firstName || '';
          lastName = patientDoc.lastName || '';
        } else if (nameOverride) {
          const parts = nameOverride.trim().split(' ');
          firstName = parts[0] || nameOverride;
          lastName = parts.slice(1).join(' ') || '';
        }

        const update = {
          patientSnapshot: {
            firstName,
            lastName,
            patientId: patientDoc?.patientId || '',
            age: patientDoc?.age,
            gender: patientDoc?.gender || '',
            address: patientDoc?.address || '',
            phoneNumber: patientDoc?.phoneNumber || patientDoc?.contactNumber || ''
          }
        };
        if (patientDoc?._id) update.patient = patientDoc._id;
        await Prescription.findByIdAndUpdate(p._id, update);
        updated++;
      } catch {}
    }));

    const remaining = await Prescription.countDocuments({ 'patientSnapshot.firstName': { $exists: false } });
    res.json({ success: true, total: missing.length, updated, remaining });
  } catch (err) {
    console.error('[BACKFILL] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/prescriptions/fix-dose-counts - Fix prescriptions with incorrect dose counts
router.post('/fix-dose-counts', async (req, res) => {
  try {
    console.log('🔧 [DOSE FIX] Starting prescription dose count fixes...');

    // Find all prescriptions that might have incorrect dose counts
    const prescriptions = await Prescription.find({
      $or: [
        { frequency: { $regex: 'twice|bid', $options: 'i' } },
        { frequency: { $exists: false } }
      ]
    }).limit(100);

    console.log(`🔧 [DOSE FIX] Found ${prescriptions.length} prescriptions to check`);

    let fixedCount = 0;
    let errors = [];

    // Identify which prescriptions need fixing before any DB calls
    const singleDosePrescriptions = prescriptions.filter(p =>
      (p.dosage?.includes('1') || p.medicationName?.includes('1') || p.quantity === 1) &&
      p.frequency?.toLowerCase().includes('twice')
    );

    // Batch-fetch all related nurse tasks in one query
    const prescriptionIds = singleDosePrescriptions.map(p => p._id);
    const allNurseTasks = prescriptionIds.length > 0
      ? await NurseTask.find({ prescriptionId: { $in: prescriptionIds } })
      : [];

    // Group nurse tasks by prescriptionId for O(1) lookup
    const nurseTasksByPrescription = {};
    for (const task of allNurseTasks) {
      const key = task.prescriptionId?.toString();
      if (key) {
        if (!nurseTasksByPrescription[key]) nurseTasksByPrescription[key] = [];
        nurseTasksByPrescription[key].push(task);
      }
    }

    for (const prescription of singleDosePrescriptions) {
      try {
        console.log(`🔧 [DOSE FIX] Fixing single dose prescription: ${prescription.medicationName}`);

        prescription.frequency = 'Once daily (QD)';
        await prescription.save();
        fixedCount++;

        const nurseTasks = nurseTasksByPrescription[prescription._id.toString()] || [];
        for (const task of nurseTasks) {
          if (task.medicationDetails.frequency?.toLowerCase().includes('twice')) {
            task.medicationDetails.frequency = 'Once daily (QD)';
            if (task.medicationDetails.doseRecords && task.medicationDetails.doseRecords.length > 1) {
              task.medicationDetails.doseRecords = [task.medicationDetails.doseRecords[0]];
              task.medicationDetails.duration = 1;
            }
            await task.save();
            console.log(`🔧 [DOSE FIX] Fixed nurse task: ${task._id}`);
          }
        }
      } catch (error) {
        console.error(`❌ [DOSE FIX] Error fixing prescription ${prescription._id}:`, error);
        errors.push({ prescriptionId: prescription._id, error: error.message });
      }
    }

    res.json({
      success: true,
      message: `Fixed ${fixedCount} prescriptions`,
      errors: errors
    });

  } catch (error) {
    console.error('❌ [DOSE FIX] Error in fix-dose-counts endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Error fixing dose counts',
      error: error.message
    });
  }
});

// GET /api/prescriptions/raw-sample - returns first 3 prescriptions without populate for debugging
router.get('/raw-sample', async (req, res) => {
  try {
    const samples = await Prescription.find({}).limit(3).select('_id patient patientId doctor doctorId medicationName createdAt').lean();
    res.json(samples);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all prescriptions
router.get('/', async (req, res) => {
  try {
    const andClauses = [];

    if (req.query.patientId) {
      try {
        const patientObjId = new mongoose.Types.ObjectId(req.query.patientId);
        andClauses.push({ $or: [{ patient: patientObjId }, { patientId: patientObjId }] });
      } catch (err) {
        andClauses.push({ $or: [{ patient: req.query.patientId }, { patientId: req.query.patientId }] });
      }
    }

    if (req.query.doctorId) {
      try {
        const doctorObjId = new mongoose.Types.ObjectId(req.query.doctorId);
        andClauses.push({ $or: [{ doctor: doctorObjId }, { doctorId: doctorObjId }] });
      } catch (err) {
        andClauses.push({ $or: [{ doctor: req.query.doctorId }, { doctorId: req.query.doctorId }] });
      }
    }

    if (req.query.status) andClauses.push({ status: req.query.status });

    const filter = andClauses.length > 0 ? { $and: andClauses } : {};

    console.log('Starting prescription query with filter:', JSON.stringify(filter));

    const prescriptions = await Prescription.find(filter)
      .sort({ datePrescribed: -1 })
      .limit(1000)
      .maxTimeMS(10000)
      .populate('patient', 'firstName lastName patientId age gender address phoneNumber')
      .populate('patientId', 'firstName lastName patientId age gender address phoneNumber')
      .populate('doctor', 'firstName lastName')
      .populate('doctorId', 'firstName lastName')
      .lean();

    console.log(`Found ${prescriptions.length} prescriptions`);

    // Ensure patient data is always present — use patientId populate or patientSnapshot as fallback
    const enriched = prescriptions.map(p => {
      let patient = p.patient;

      if ((!patient || typeof patient !== 'object' || !patient.firstName) &&
          p.patientId && typeof p.patientId === 'object' && p.patientId.firstName) {
        patient = p.patientId;
      }

      if ((!patient || typeof patient !== 'object' || !patient.firstName) &&
          p.patientSnapshot && p.patientSnapshot.firstName) {
        patient = p.patientSnapshot;
      }

      return { ...p, patient };
    });

    res.json(enriched);
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

// GET pending prescriptions for reception - MUST be before /:id route
// Only returns prescriptions for medications that are available in inventory
router.get('/pending-for-reception', async (req, res) => {
  try {
    console.log('Fetching pending prescriptions for reception (inventory medications only)');
    const pendingPrescriptions = await Prescription.find({
      $and: [
        // Must have inventory item (clinic has this medication in stock)
        { medicationItem: { $exists: true, $ne: null } },
        // Must be pending payment
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
    .populate('medicationItem', 'name price') // Also populate inventory item details
    .sort({ createdAt: -1 })
    .limit(50);
    
    console.log(`Found ${pendingPrescriptions.length} pending prescriptions for inventory medications`);
    
    // Filter out any prescriptions where the inventory item doesn't exist anymore
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

// Quick Medication Order: create or extend a medication with payment-before-task gating
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
      allowMerge = true,
      additionalDoses = 0,
      sendToNurse = true
    } = req.body || {};

    if (!patientId || !doctorId || !medicationName || !dosage || !frequency) {
      return res.status(400).json({
        success: false,
        message: 'patientId, doctorId, medicationName, dosage, and frequency are required'
      });
    }

    const days = Number(durationDays) || 0;
    const addDoses = Number(additionalDoses) || 0;

    // Helper to map frequency to doses per day - ROOT CAUSE FIX: Use centralized frequency detection
    const getDosesPerDay = (freq) => {
      if (!freq) return 1;
      const { parseFrequencyToDosesPerDay } = require('../utils/frequencyDetection');
      const frequencyResult = parseFrequencyToDosesPerDay(freq);
      return frequencyResult.dosesPerDay;
    };

    // Extension logic removed - create new prescription instead of extending

    // Create a brand new prescription in Pending (no nurse task yet). Nurse task will be created after payment
    // Resolve inventory price and block if out of stock
    let costPerDose = null;
    try {
      if (inventoryItemId) {
        const inv = await InventoryItem.findById(inventoryItemId);
        if (inv) {
          costPerDose = inv.sellingPrice || inv.unitPrice || costPerDose;
          if (inv.quantity != null && Number(inv.quantity) <= 0) {
            return res.status(400).json({
              success: false,
              error: `${inv.name || medicationName} is out of stock. Cannot prescribe.`
            });
          }
        }
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

    // ALWAYS create nurse task for new prescriptions (even if unpaid)
    if (sendToNurse !== false) {
      try {
        const { createNurseTaskFromPrescription } = require('../utils/nurseTaskCreation');
        const Patient = require('../models/Patient');
        const patient = await Patient.findById(patientId);
        const taskResult = await createNurseTaskFromPrescription(newPrescription, patient);
        
        if (taskResult.created) {
          console.log(`✅ [PRESCRIPTION] Nurse task created for ${medicationName}: ${taskResult.task._id}`);
        } else {
          console.log(`⚠️ [PRESCRIPTION] Nurse task not created: ${taskResult.reason}`);
        }
      } catch (taskError) {
        console.error(`❌ [PRESCRIPTION] Failed to create nurse task for ${medicationName}:`, taskError);
      }
    }

    // Add prescription to daily consolidated invoice
    try {
      const billingService = require('../services/billingService');
      
      // Add medication to daily consolidated invoice
      const invoice = await billingService.addServiceToDailyInvoice(
        patientId,
        'medication',
        {
          description: `Medication: ${medicationName} (${totalDoses} doses)`,
          medicationName: medicationName,
          totalPrice: totalCost,
          unitPrice: costPerDose,
          quantity: totalDoses,
          dosage: dosage || 'Standard',
          frequency: frequency || 'Once daily',
          duration: duration || '',
          prescriptionId: newPrescription._id,
          metadata: {
            prescriptionId: newPrescription._id,
            medicationName: medicationName,
            totalDoses: totalDoses,
            costPerDose: costPerDose
          }
        },
        doctorId
      );
      
      // If prescription is marked as paid, process payment on the consolidated invoice
      if (newPrescription.paymentStatus === 'paid') {
        // Update invoice payment status
        invoice.amountPaid = (invoice.amountPaid || 0) + totalCost;
        invoice.balance = Math.max(0, (invoice.total || 0) - invoice.amountPaid);
        invoice.status = invoice.balance === 0 ? 'paid' : 'partial';
        
        // Add payment record
        invoice.payments.push({
          amount: totalCost,
          method: 'system_generated',
          date: new Date(),
          reference: `AUTO-PAY-${newPrescription._id}`,
          notes: 'Auto-generated payment for paid prescription',
          processedBy: doctorId
        });
        
        await invoice.save();
      }
      
      // Link prescription to invoice
      newPrescription.invoiceId = invoice._id;
      await newPrescription.save();
      
      console.log(`✅ Added prescription to daily consolidated invoice ${invoice.invoiceNumber}`);
    } catch (invoiceErr) {
      console.warn('⚠️ Failed to add prescription to daily consolidated invoice:', invoiceErr?.message || invoiceErr);
    }

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

// GET external prescriptions (medications not in inventory) for printing
// These prescriptions are for medications the patient needs to buy outside
router.get('/external-for-printing', auth, async (req, res) => {
  try {
    console.log('Fetching external prescriptions for printing (non-inventory medications)');
    const externalPrescriptions = await Prescription.find({
      $and: [
        // Must NOT have inventory item (clinic doesn't have this medication)
        { 
          $or: [
            { medicationItem: { $exists: false } },
            { medicationItem: null }
          ]
        },
        // Must be active/pending (not cancelled)
        { status: { $in: ['PENDING', 'Pending', 'Active'] } }
      ]
    })
    .populate('patient', 'firstName lastName')
    .populate('doctor', 'firstName lastName')
    .sort({ createdAt: -1 })
    .limit(50);
    
    console.log(`Found ${externalPrescriptions.length} external prescriptions for printing`);
    res.json(externalPrescriptions);
  } catch (error) {
    console.error('Error fetching external prescriptions:', error);
    res.status(500).json({ 
      message: 'Error fetching external prescriptions', 
      error: error.message 
    });
  }
});

// GET prescription by ID (temporarily without auth to fix timeout issues)
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
router.post('/', auth, async (req, res) => {
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
    const effectiveDoctorId = doctorId || req.user.id;

    if (!effectivePatientId) {
      return res.status(400).json({
        success: false,
        error: 'Patient ID is required'
      });
    }

    if (!effectiveDoctorId) {
      return res.status(400).json({
        success: false,
        error: 'Doctor ID is required'
      });
    }

    if (!medications || !Array.isArray(medications) || medications.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one medication is required'
      });
    }

    // Create a single prescription with all medications in the medications array
    const prescriptionData = {
      patient: effectivePatientId,
      doctor: effectiveDoctorId,
      doctorId: effectiveDoctorId, // Ensure both doctor and doctorId fields are set
      medicationName: medications[0].medication, // Primary medication name
      dosage: medications[0].dosage,
      frequency: medications[0].frequency,
      route: medications[0].route || 'Oral',
      quantity: medications[0].quantity || 1,
      notes: medications[0].nurseInstructions || notes,
      duration: medications[0].duration || duration, // Use first medication's duration, no default fallback
      status: status || 'Pending',
      sendToNurse: medications[0].sendToNurse !== undefined ? medications[0].sendToNurse : true,
      medicationItem: medications[0].inventoryItemId,
      datePrescribed: new Date(),
      instructions: instructions || '',
      // Add all medications to the medications array
      // CRITICAL: Ensure inventoryItemId is properly saved for all medications selected from inventory
      medications: medications.map(med => {
        const inventoryItemId = med.inventoryItemId || med.inventoryItem || null;
        console.log(`📦 [PRESCRIPTION] Saving medication: ${med.medication}, inventoryItemId: ${inventoryItemId}`);
        return {
          inventoryItem: inventoryItemId, // Save as inventoryItem (ObjectId reference)
          inventoryItemId: inventoryItemId, // Also save as inventoryItemId for compatibility
          name: med.medication,
          dosage: med.dosage,
          frequency: med.frequency,
          duration: med.duration, // CRITICAL: Always use doctor's prescribed duration, no defaults
          route: med.route || 'Oral',
          notes: med.nurseInstructions || '',
          sendToNurse: med.sendToNurse !== undefined ? med.sendToNurse : true,
          assignedNurseId: med.assignedNurseId || null
        };
      })
    };

    console.log("Creating prescription with medications array:", JSON.stringify(prescriptionData, null, 2));
    console.log("🔍 [PRESCRIPTION DEBUG] Original medications from frontend:", JSON.stringify(medications, null, 2));
    
    // Duplicate prescription check removed - multiple prescriptions allowed

    // Use the new validation utility to create prescription with proper validation
    const validationResult = await createPrescriptionWithValidation(prescriptionData, medications[0].assignedNurseId);
    
    if (!validationResult.success) {
      const errMsg = validationResult.errors && validationResult.errors.length > 0
        ? validationResult.errors[0]
        : 'Prescription creation failed';
      return res.status(400).json({
        success: false,
        error: errMsg,
        details: validationResult.errors,
        warnings: validationResult.warnings
      });
    }
    
    const prescription = validationResult.prescription;

    // Send Telegram notification for medication order (doctor dashboard)
    try {
      const PatientModel = require('../models/Patient');
      const UserModel = require('../models/User');
      const patientDoc = await PatientModel.findById(effectivePatientId).lean();
      const doctorDoc = await UserModel.findById(effectiveDoctorId).lean();

      // Save patient snapshot to prescription so it's always available without populate
      if (patientDoc) {
        await prescription.constructor.findByIdAndUpdate(prescription._id, {
          patientSnapshot: {
            firstName: patientDoc.firstName || '',
            lastName: patientDoc.lastName || '',
            patientId: patientDoc.patientId || '',
            age: patientDoc.age,
            gender: patientDoc.gender || '',
            address: patientDoc.address || '',
            phoneNumber: patientDoc.phoneNumber || patientDoc.contactNumber || ''
          }
        });
      }

      const patientName = patientDoc
        ? `${patientDoc.firstName || ''} ${patientDoc.lastName || ''}`.trim()
        : effectivePatientId;
      const patientCode = patientDoc?.patientId || effectivePatientId;
      const doctorName = doctorDoc
        ? `${doctorDoc.firstName || ''} ${doctorDoc.lastName || ''}`.trim()
        : 'Unknown Doctor';

      const medsList = (prescriptionData.medications || [])
        .map((m, idx) => `${idx + 1}. ${m.name || m.medication || 'Medication'} — ${m.dosage || ''}, ${m.frequency || ''}, ${m.duration || ''}`)
        .join('\n');

      const msg = [
        '💊 <b>New Medication Order</b>',
        '',
        `👤 <b>Patient:</b> ${patientName}`,
        `🆔 <b>Patient ID:</b> ${patientCode}`,
        `👨‍⚕️ <b>Doctor:</b> ${doctorName}`,
        '',
        '<b>Medications:</b>',
        medsList || 'No medications listed',
        '',
        `🕒 <b>Date:</b> ${new Date().toLocaleString('en-GB', { timeZone: 'Africa/Addis_Ababa' })}`
      ].join('\n');

      await telegramService.sendMessage(msg);
    } catch (notifyErr) {
      console.error('❌ Error sending Telegram notification for prescription:', notifyErr);
    }
    
    // ENSURE nurse task is created if validation didn't create one
    if (!validationResult.taskCreated && prescription.sendToNurse !== false) {
      try {
        const { createNurseTaskFromPrescription } = require('../utils/nurseTaskCreation');
        const Patient = require('../models/Patient');
        const patient = await Patient.findById(effectivePatientId);
        const taskResult = await createNurseTaskFromPrescription(prescription, patient);
        
        if (taskResult.created) {
          console.log(`✅ [PRESCRIPTION] Nurse task created after validation: ${taskResult.task._id}`);
          validationResult.taskCreated = true;
        }
      } catch (taskError) {
        console.error(`❌ [PRESCRIPTION] Failed to create nurse task after validation:`, taskError);
      }
    }
    
    console.log("Prescription saved with validation:", {
      id: prescription._id,
      medicationsCount: prescription.medications ? prescription.medications.length : 0,
      medications: prescription.medications,
      nurseTaskCreated: validationResult.taskCreated,
      nurseTaskUpdated: validationResult.taskUpdated
    });
    
    const createdPrescriptions = [prescription];

    // FIXED: Only sync payment status for prescriptions that are actually linked to invoices
    // This prevents the bug where all prescriptions show as "paid" if patient has any paid invoices
    try {
      // Only sync if this prescription has an invoiceId or was created very recently
      const shouldSync = prescription.invoiceId || 
        (Date.now() - new Date(prescription.createdAt).getTime()) < 5 * 60 * 1000; // Within 5 minutes
      
      if (shouldSync) {
        const { manualSyncAllPrescriptions } = require('../utils/prescriptionStatusSync');
        await manualSyncAllPrescriptions(prescription.patient);
        console.log('✅ [PAYMENT SYNC] Post-creation payment sync completed');
      } else {
        console.log('⚠️ [PAYMENT SYNC] Skipping sync - prescription not linked to recent invoice');
      }
    } catch (syncErr) {
      console.warn('⚠️ [PAYMENT SYNC] Post-creation sync failed:', syncErr?.message || syncErr);
    }
    
    // After all individual prescriptions are created, create a single comprehensive notification
    if (createdPrescriptions.length > 0) {
        console.log(`🔍 [PRESCRIPTION DEBUG] About to create notification. Created prescriptions: ${createdPrescriptions.length}`);
        try {
            console.log(`🔍 [PRESCRIPTION DEBUG] Starting notification creation process...`);
            
            // Fetch patient data for notification
            const patientData = await Patient.findById(effectivePatientId);
            if (!patientData) {
                console.error('❌ [NOTIFICATION ERROR] Patient not found for notification creation');
                return;
            }
            
            // Prepare medication details for the notification
            const notificationMedications = await Promise.all(createdPrescriptions[0].medications.map(async (med) => {
                let estimatedCost = 0;
                let sellingPrice = 0;
                let totalDoses = 1;

                // Log the medication being processed
                console.log(`🔍 [NOTIFICATION DEBUG] Processing medication: ${med.name}`);
                console.log(`🔍 [NOTIFICATION DEBUG] Inventory item ID: ${med.inventoryItem}`);
                if (med.inventoryItem) {
                    try {
                        const inventoryDoc = await InventoryItem.findById(med.inventoryItem);
                        console.log(`🔍 [NOTIFICATION DEBUG] Inventory doc found: ${!!inventoryDoc}`);
                                                if (inventoryDoc && inventoryDoc.sellingPrice) {
                            sellingPrice = inventoryDoc.sellingPrice;
                            // Calculate total doses based on frequency and duration
                            let dosesPerDay = 1;
                            const frequency = med.frequency || 'once daily';
                            const freq = frequency.toLowerCase();
                            
                            // Handle all frequency types correctly
                            if (freq.includes('once') || freq.includes('daily')) {
                              dosesPerDay = 1;
                            } else if (freq.includes('twice') || freq.includes('bid')) {
                              dosesPerDay = 2;
                            } else if (freq.includes('three') || freq.includes('tid') || freq.includes('thrice')) {
                              dosesPerDay = 3;
                            } else if (freq.includes('four') || freq.includes('qid')) {
                              dosesPerDay = 4;
                            }

                            // Use centralized medication calculator
                            const MedicationCalculator = require('../utils/medicationCalculator');
                            
                            const calculation = await MedicationCalculator.calculateMedicationCost({
                                name: med.name,
                                frequency: frequency,
                                duration: med.duration, // CRITICAL: Always use doctor's prescribed duration, no defaults
                                inventoryItemId: med.inventoryItem
                            });
                            
                            totalDoses = calculation.totalDoses;
                            estimatedCost = calculation.totalCost;
                            
                            console.log(`📋 [NOTIFICATION DEBUG] Dose calculation for ${med.name}: ${calculation.days} days × ${calculation.dosesPerDay} doses/day = ${calculation.totalDoses} total doses`);
                            console.log(`💰 [NOTIFICATION DEBUG] Cost calculation: ${calculation.totalDoses} doses × ETB ${calculation.costPerDose} = ETB ${calculation.totalCost}`);
                        } else {
                            console.log(`⚠️ [NOTIFICATION DEBUG] Inventory item not found or no selling price for ${med.name}`);
                        }
                    } catch (inventoryError) {
                        console.error(`❌ [NOTIFICATION ERROR] Error finding inventory item for ${med.name}:`, inventoryError);
                    }
                } else {
                    console.log(`⚠️ [NOTIFICATION DEBUG] No inventory item ID for ${med.name}`);
                }

                // Return the medication details for the notification
                const notificationMed = {
                    name: med.name,
                    dosage: med.dosage,
                    frequency: med.frequency,
                    duration: med.duration, // CRITICAL: Use individual medication duration
                    totalPrice: estimatedCost,
                    inventoryItemId: med.inventoryItem,
                    prescriptionId: createdPrescriptions[0]._id // Link to the prescription
                };
                
                // CRITICAL FIX: Ensure duration is preserved
                if (!notificationMed.duration) {
                    console.error(`❌ [CRITICAL] Medication ${med.name} has no duration! Using fallback.`);
                    notificationMed.duration = '5 days'; // Fallback
                }
                
                console.log(`🔍 [NOTIFICATION DEBUG] Created notification medication for ${med.name}:`, {
                    duration: notificationMed.duration,
                    frequency: notificationMed.frequency,
                    totalDoses: totalDoses,
                    originalMedDuration: med.duration
                });
                
                return notificationMed;
            }));

            // After preparing notificationMedications
            console.log(`🔍 [NOTIFICATION DEBUG] Medications for notification:`, notificationMedications);

            // Calculate overall total amount
            const overallTotalAmount = notificationMedications.reduce((acc, med) => acc + med.totalPrice, 0);
            console.log(`🔍 [NOTIFICATION DEBUG] Overall total amount: ${overallTotalAmount}`);

            // Only create payment notification if there's actually an amount to pay
            if (overallTotalAmount > 0) {
                // Use a default sender ID if req.user._id is not available
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
                        medications: notificationMedications // This array holds all medication details
                    },
                });
                
                try {
                    await receptionNotification.save();
                    console.log(`✅ Notification created successfully with ${notificationMedications.length} medications.`);
                    console.log(`✅ Notification ID: ${receptionNotification._id}`);
                    console.log(`✅ Patient: ${patientData.firstName} ${patientData.lastName}`);
                    console.log(`✅ Total Amount: ${overallTotalAmount}`);
                    
                    // 🔧 AUTOMATICALLY CREATE INVOICE FOR PRESCRIPTION
                    try {
                        const PrescriptionInvoiceService = require('../services/prescriptionInvoiceService');
                        
                        // Get doctor info
                        const doctor = await User.findById(doctorId);
                        if (!doctor) {
                            console.warn('⚠️ [INVOICE CREATION] Doctor not found, skipping invoice creation');
                        } else {
                            // Create invoice for the prescription
                            const invoice = await PrescriptionInvoiceService.createInvoiceForPrescription(
                                createdPrescriptions[0],
                                notificationMedications,
                                patientData,
                                doctor
                            );
                            
                            // Update notification with invoice reference
                            await PrescriptionInvoiceService.updateNotificationWithInvoice(
                                receptionNotification._id,
                                invoice._id
                            );
                            
                            console.log(`✅ [INVOICE CREATION] Invoice created automatically: ${invoice._id}`);
                            console.log(`✅ [INVOICE CREATION] Invoice Number: ${invoice.invoiceNumber}`);
                            console.log(`✅ [INVOICE CREATION] Total Amount: ${invoice.total}`);
                        }
                    } catch (invoiceError) {
                        console.error('❌ [INVOICE CREATION] Error creating invoice automatically:', invoiceError);
                        // Don't fail the prescription creation if invoice creation fails
                        // The invoice can be created manually later
                    }
                    
                } catch (saveError) {
                    console.error('❌ [NOTIFICATION SAVE ERROR] Error saving notification:', saveError);
                    console.error('❌ [NOTIFICATION SAVE ERROR] Error stack:', saveError.stack);
                }
            } else {
                console.log('No payment notification created - medications are free (totalAmount = 0)');
            }
        } catch (notificationError) {
            console.error('❌ [NOTIFICATION ERROR] Error creating comprehensive notification:', notificationError);
            console.error('❌ [NOTIFICATION ERROR] Error stack:', notificationError.stack);
        }
    }
    
    // IMPORTANT: Do NOT create nurse tasks here - they should only be created AFTER payment is processed
    // Tasks will be created in the payment processing endpoint (/api/prescriptions/process-payment/:prescriptionId)
    // This ensures medications go to reception for payment first, then to nurse after payment
    console.log(`ℹ️ [PRESCRIPTION] Prescription created. Nurse tasks will be created after payment is processed.`);
    
    // Only create tasks if prescription is already paid (edge case - should rarely happen)
    for (const prescription of createdPrescriptions) {
      // Skip task creation - wait for payment processing
      if (prescription.paymentStatus === 'paid') {
        console.log(`⚠️ [PRESCRIPTION] Prescription ${prescription._id} is already paid, but tasks should be created via payment endpoint`);
        // Don't create tasks here - let payment processing handle it
      }
      
      // REMOVED: Task creation logic moved to payment processing endpoint
      /*
      try {
        const NurseTask = require('../models/NurseTask');
        const User = require('../models/User'); // Ensure User model is available
        const { createMedicationTaskWithDuplicatePrevention, updatePaymentAuthorizationForExistingTasks } = require('../utils/taskDuplicatePrevention');

        // Get patient and doctor names for the task
        const patientDoc = await mongoose.model('Patient').findById(prescription.patient);
        const patientName = patientDoc ? `${patientDoc.firstName || ''} ${patientDoc.lastName || ''}`.trim() : 'Unknown Patient';
        const doctorDoc = await User.findById(prescription.doctor);
        const doctorName = doctorDoc ? `${doctorDoc.firstName || ''} ${doctorDoc.lastName || ''}`.trim() : 'Unknown Doctor';
      
        // Try to find the patient's assigned nurse
        let assignedNurseId = null;
        let assignedNurseName = null;
        if (patientDoc && patientDoc.assignedNurseId) {
          const nurseDoc = await User.findById(patientDoc.assignedNurseId);
          if (nurseDoc && nurseDoc.role === 'nurse') { // Ensure it's actually a nurse
            assignedNurseId = nurseDoc._id;
            assignedNurseName = `${nurseDoc.firstName || ''} ${nurseDoc.lastName || ''}`.trim();
          }
        }
      
        // Extract numeric duration from string like "3 days" -> 3
        const extractNumericDuration = (durationStr) => {
          if (!durationStr) return null;
          if (typeof durationStr === 'number') return durationStr;
          const match = durationStr.toString().match(/(\d+)/);
          return match ? parseInt(match[1]) : null;
        };

        // Handle multiple medications - CREATE SEPARATE TASK FOR EACH MEDICATION ENTRY
        // This allows the same medication to be prescribed multiple times and each creates a separate task
        const medicationsToProcess = prescription.medications && prescription.medications.length > 0 
          ? prescription.medications 
          : [{
              name: prescription.medicationName,
              dosage: prescription.dosage,
              frequency: prescription.frequency,
              route: prescription.route || 'Oral',
              duration: prescription.duration,
              assignedNurseId: prescription.assignedNurseId,
              inventoryItem: prescription.medicationItem,
              inventoryItemId: prescription.medicationItem
            }];

        console.log(`🔧 [NURSE TASK] Processing ${medicationsToProcess.length} medication entries for nurse tasks from prescription ${prescription._id}`);

        // Create a separate task for EACH medication entry (even if same medication name)
        // This allows doctors to prescribe the same medication multiple times and each creates a separate task
        for (let index = 0; index < medicationsToProcess.length; index++) {
          const medication = medicationsToProcess[index];
          
          try {
            // Create nurse tasks for EVERY prescribed medication (root cause fix: Dexamethasone etc. must appear in Administer Meds)
            // Inventory-linked meds can deduct stock; others still need administration tracking
            const hasInventoryItem = !!(medication.inventoryItem || medication.inventoryItemId);
            if (!hasInventoryItem) {
              console.log(`ℹ️ [NURSE TASK] Creating task for medication without inventory link: ${medication.name || medication.medication} (administration tracking only)`);
            }

            const medicationName = medication.name || medication.medication;
            console.log(`🔧 [NURSE TASK] Creating task ${index + 1}/${medicationsToProcess.length} for medication: ${medicationName} from prescription ${prescription._id}`);
            
            // Count how many entries of this medication we have in the current prescription
            const sameMedicationEntries = medicationsToProcess.filter(m => (m.name || m.medication) === medicationName);
            const totalEntriesForThisMed = sameMedicationEntries.length;
            
            // Count how many tasks already exist for this medication in this prescription
            const existingTasksCount = await NurseTask.countDocuments({
              patientId: prescription.patient,
              'medicationDetails.medicationName': medicationName,
              'medicationDetails.prescriptionId': prescription._id,
              taskType: 'MEDICATION',
              status: { $in: ['PENDING', 'IN_PROGRESS'] }
            });

            // Find which entry index this is for this medication (0-based within same medication entries)
            const entryIndexForThisMed = medicationsToProcess.slice(0, index + 1).filter(m => (m.name || m.medication) === medicationName).length - 1;

            // Only create if we haven't created enough tasks yet for this medication
            // We need to create one task per entry, so if existingTasksCount < totalEntriesForThisMed, create it
            // But also check if we've already created tasks for previous entries in this loop
            if (existingTasksCount >= totalEntriesForThisMed) {
              console.log(`⚠️ [NURSE TASK] All ${totalEntriesForThisMed} tasks for ${medicationName} already exist in prescription ${prescription._id}, skipping creation`);
              continue;
            }
            
            // Check if we've already created a task for this specific entry index in this loop
            // This prevents creating duplicates when the same medication appears multiple times
            if (existingTasksCount > entryIndexForThisMed) {
              console.log(`⚠️ [NURSE TASK] Task for ${medicationName} entry ${entryIndexForThisMed + 1} already exists, skipping creation`);
              continue;
            }
            
            // Use this medication's details
            const primaryMedication = medication;
            
            const numericDuration = extractNumericDuration(primaryMedication.duration || prescription.duration);
            
            // Prepare task data with enhanced payment authorization using centralized calculation
            const PaymentCalculation = require('../utils/paymentCalculation');
            
            const costBreakdown = PaymentCalculation.calculateMedicationCost(
              primaryMedication.frequency || prescription.frequency,
              numericDuration || 7
            );
            
            const paymentAuth = PaymentCalculation.calculatePaymentAuthorization(
              {
                frequency: primaryMedication.frequency || prescription.frequency,
                duration: numericDuration || 7
              },
              0, // amountPaid - unpaid initially
              costBreakdown.totalCost
            );
            
            // Create a unique description that includes prescription date to distinguish multiple prescriptions
            const prescriptionDate = prescription.datePrescribed || prescription.createdAt || new Date();
            const dateStr = new Date(prescriptionDate).toLocaleDateString();
            const description = medicationsToProcess.length > 1 && medicationsToProcess.filter(m => (m.name || m.medication) === medicationName).length > 1
              ? `Administer ${medicationName} - ${primaryMedication.dosage || prescription.dosage} - ${primaryMedication.frequency || prescription.frequency} (Prescribed ${dateStr})`
              : `Administer ${medicationName} - ${primaryMedication.dosage || prescription.dosage} - ${primaryMedication.frequency || prescription.frequency}`;

            const taskData = {
              patientId: prescription.patient,
              patientName: patientName,
              description: description,
              taskType: 'MEDICATION',
              status: 'PENDING',
              priority: 'MEDIUM',
              assignedBy: prescription.doctor,
              assignedByName: doctorName,
              assignedTo: assignedNurseId, // Optional: if patient has an assigned nurse
              assignedToName: assignedNurseName, // Optional: if patient has an assigned nurse
              notes: prescription.notes || prescription.instructions || '',
              dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Due in 24 hours
              medicationDetails: {
                medicationName: medicationName,
                dosage: primaryMedication.dosage || prescription.dosage,
                frequency: primaryMedication.frequency || prescription.frequency,
                route: primaryMedication.route || prescription.route || 'Oral',
                instructions: prescription.notes || prescription.instructions || '',
                duration: numericDuration,
                startDate: prescriptionDate,
                prescriptionId: prescription._id,
                prescriptionDate: prescriptionDate, // Store prescription date to help distinguish multiple prescriptions
                // Generate proper dose records based on frequency
                doseRecords: (() => {
                  const doseRecords = [];
                  const frequency = (primaryMedication.frequency || prescription.frequency)?.toLowerCase() || 'once daily';
                  let dosesPerDay = 1;
                  
                  // Determine doses per day based on frequency
                  if (frequency.includes('bid') || frequency.includes('twice')) {
                    dosesPerDay = 2;
                  } else if (frequency.includes('tid') || frequency.includes('three')) {
                    dosesPerDay = 3;
                  } else if (frequency.includes('qid') || frequency.includes('four')) {
                    dosesPerDay = 4;
                  }
                  
                  // Generate time slots for each dose
                  const getTimeSlots = (dosesPerDay) => {
                    switch (dosesPerDay) {
                      case 2: return ['09:00', '21:00']; // Morning, Evening
                      case 3: return ['09:00', '15:00', '21:00']; // Morning, Afternoon, Evening
                      case 4: return ['09:00', '13:00', '17:00', '21:00']; // Morning, Noon, Afternoon, Evening
                      default: return ['09:00']; // Once daily
                    }
                  };
                  
                  const timeSlots = getTimeSlots(dosesPerDay);
                  
                  // Create dose records for each day and time slot
                  if (!numericDuration) {
                    console.error(`❌ [DOSE RECORDS] No valid duration found for medication ${medicationName}`);
                    return [];
                  }
                  
                  for (let day = 1; day <= numericDuration; day++) {
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
                })()
              },
              paymentAuthorization: paymentAuth
            };

            // Create task with duplicate prevention
            const result = await createMedicationTaskWithDuplicatePrevention(
              taskData,
              prescription.patient,
              medicationName,
              prescription._id,
              null, // serviceId
              null  // session
            );
            
            // If duplicate was found, update payment authorization for all existing tasks
            if (result.reason === 'duplicate_found') {
              console.log(`🔄 Duplicate found for ${medicationName}, updating payment authorization for existing tasks`);
              await updatePaymentAuthorizationForExistingTasks(
                prescription.patient,
                medicationName,
                paymentAuth,
                null // session
              );
            }

            if (result.created) {
              console.log(`✅ Nurse task created for medication: ${medicationName}`);
            } else {
              console.log(`⚠️ Duplicate task found, skipped creation for: ${medicationName}`);
            }
          } catch (medicationTaskError) {
            console.error(`Error creating nurse task for medication ${medicationName}:`, medicationTaskError);
            // Continue with next medication even if one fails
          }
        }
      
      } catch (nurseTaskError) {
        console.error('Error creating nurse tasks for prescription:', prescription._id, nurseTaskError);
        // Continue execution even if nurse task creation fails, but log it
      }
      */
    }

    res.status(201).json({ success: true, data: createdPrescriptions });
  } catch (err) {
    console.error('Error creating prescription:', err);
    res.status(500).json({ success: false, error: 'Server Error', details: err.message });
  }
});

// PUT update prescription
router.put('/:id', [auth,
  checkPermission('doctor', 'admin'),
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

// Create nurse tasks for prescriptions that don't have them
router.post('/create-missing-nurse-tasks', async (req, res) => {
  try {
    console.log('Creating nurse tasks for prescriptions that are missing them...');
    
    // Find all active prescriptions
    const prescriptions = await Prescription.find({ 
      status: { $in: ['Active', 'ACTIVE'] }
    }).populate('patient doctor');
    
    console.log(`Found ${prescriptions.length} active prescriptions`);
    
    let tasksCreated = 0;
    let tasksSkipped = 0;
    let errors = 0;

    // Batch-fetch all existing nurse tasks for these patients in one query
    const patientIds = prescriptions.map(p => p.patient?._id || p.patient).filter(Boolean);
    const existingNurseTasks = patientIds.length > 0
      ? await NurseTask.find({
          patientId: { $in: patientIds },
          taskType: 'MEDICATION',
          $or: [
            { status: { $in: ['PENDING', 'IN_PROGRESS'] } },
            { status: { $exists: false } }
          ]
        }).lean()
      : [];

    // Build a Set of "patientId|medicationName" keys for O(1) lookup
    const existingTaskKeys = new Set(
      existingNurseTasks.map(t => `${t.patientId?.toString()}|${t.medicationDetails?.medicationName}`)
    );
    
    for (const prescription of prescriptions) {
      try {
        const patientId = (prescription.patient?._id || prescription.patient)?.toString();
        const taskKey = `${patientId}|${prescription.medicationName}`;

        if (existingTaskKeys.has(taskKey)) {
          tasksSkipped++;
          continue;
        }
        
        // Get patient and doctor info
        const patient = prescription.patient;
        const doctor = prescription.doctor;
        
        const patientName = patient ? 
          `${patient.firstName || ''} ${patient.lastName || ''}`.trim() : 
          'Unknown Patient';
        const doctorName = doctor ? 
          `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim() : 
          'Unknown Doctor';
        
        // Create nurse task
        const taskDescription = `${prescription.medicationName} - ${prescription.dosage || 'No dosage'} - ${prescription.frequency || 'No frequency'} - ${prescription.duration || 'No duration'}`;
        
        // Extract numeric duration from string like "3 days" -> 3
        const extractNumericDuration = (durationStr) => {
          if (!durationStr) return null;
          if (typeof durationStr === 'number') return durationStr;
          
          // Try to extract number from string like "3 days", "7", "1 week"
          const match = durationStr.toString().match(/(\d+)/);
          return match ? parseInt(match[1]) : null;
        };
        
        const numericDuration = extractNumericDuration(prescription.duration);
        
        const nurseTask = new NurseTask({
          patientId: patient._id || patient,
          patientName: patientName,
          description: taskDescription,
          taskType: 'MEDICATION',
          status: 'PENDING',
          priority: 'MEDIUM',
          assignedBy: doctor._id || doctor,
          assignedByName: doctorName,
          assignedTo: null, // Not assigned to specific nurse initially
          assignedToName: null,
          notes: `Prescription created by Dr. ${doctorName} for ${patientName}. ${prescription.notes || prescription.instructions || ''}`,
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          medicationDetails: {
            medicationName: prescription.medicationName,
            dosage: prescription.dosage || 'As prescribed',
            frequency: prescription.frequency || 'As directed',
            frequencyLabel: prescription.frequency,
            route: prescription.route || 'Oral',
            instructions: prescription.instructions || prescription.notes || '',
            duration: numericDuration,
            startDate: prescription.datePrescribed || prescription.createdAt || new Date(),
            // Generate proper dose records based on frequency
            doseRecords: (() => {
              const doseRecords = [];
              const frequency = prescription.frequency?.toLowerCase() || 'once daily';
              let dosesPerDay = 1;
              
              // Determine doses per day based on frequency
              if (frequency.includes('bid') || frequency.includes('twice')) {
                dosesPerDay = 2;
              } else if (frequency.includes('tid') || frequency.includes('three')) {
                dosesPerDay = 3;
              } else if (frequency.includes('qid') || frequency.includes('four')) {
                dosesPerDay = 4;
              }
              
              // Generate time slots for each dose
              const getTimeSlots = (dosesPerDay) => {
                switch (dosesPerDay) {
                  case 2: return ['09:00', '21:00']; // Morning, Evening
                  case 3: return ['09:00', '15:00', '21:00']; // Morning, Afternoon, Evening
                  case 4: return ['09:00', '13:00', '17:00', '21:00']; // Morning, Noon, Afternoon, Evening
                  default: return ['09:00']; // Once daily
                }
              };
              
              const timeSlots = getTimeSlots(dosesPerDay);
              
              // Create dose records for each day and time slot
              for (let day = 1; day <= numericDuration; day++) {
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
            })()
          }
        });
        
        await nurseTask.save();
        tasksCreated++;
        console.log(`Created nurse task for prescription ${prescription._id}: ${nurseTask._id}`);
        
      } catch (taskError) {
        console.error(`Error creating nurse task for prescription ${prescription._id}:`, taskError);
        errors++;
      }
    }
    
    console.log(`Nurse task creation completed: ${tasksCreated} created, ${tasksSkipped} skipped, ${errors} errors`);
    
    res.json({
      success: true,
      message: `Created ${tasksCreated} nurse tasks, skipped ${tasksSkipped} existing, ${errors} errors`,
      tasksCreated,
      tasksSkipped,
      errors
    });
    
  } catch (error) {
    console.error('Error in create-missing-nurse-tasks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create nurse tasks',
      details: error.message
    });
  }
});

// Sync prescriptions with medical records
router.post('/sync-with-medical-records/:patientId', async (req, res) => {
  try {
    const patientId = req.params.patientId;
    console.log(`Syncing prescriptions with medical records for patient ${patientId}`);
    
    // Validate patient ID
    if (!patientId || !mongoose.Types.ObjectId.isValid(patientId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid patient ID format' 
      });
    }
    
    // Find the most recent medical record for this patient
    const medicalRecord = await MedicalRecord.findOne({
      patient: patientId
    }).sort({ createdAt: -1 });
    
    if (!medicalRecord) {
      console.log(`No medical record found for patient ${patientId}, creating one...`);
      
      // Try to find a doctor to associate with the record
      let doctorId = req.user && req.user.role === 'doctor' ? req.user.id : null;
      
      if (!doctorId) {
        // Find any doctor in the system
        const User = require('../models/User');
        const doctor = await User.findOne({ role: 'doctor' });
        doctorId = doctor ? doctor._id : new mongoose.Types.ObjectId('000000000000000000000000');
      }
      
      // Create a basic medical record with all required fields
      const newMedicalRecord = new MedicalRecord({
        patient: patientId,
        doctor: doctorId,  // This is required
        primaryProvider: doctorId,
        createdBy: doctorId,
        lastUpdatedBy: doctorId,
        status: 'Draft',
        chiefComplaint: 'Created from prescription sync',
        prescriptions: []
      });
      
      try {
        await newMedicalRecord.save();
        console.log(`Created new medical record ${newMedicalRecord._id} for patient ${patientId}`);
        
        // Continue with the newly created record
        return await syncPrescriptionsWithRecord(req, res, patientId, newMedicalRecord);
      } catch (createError) {
        console.error('Error creating medical record:', createError);
        return res.status(500).json({ 
          success: false,
          message: 'Failed to create medical record', 
          error: createError.message 
        });
      }
    }
    
    // If we have a medical record, continue with sync
    return await syncPrescriptionsWithRecord(req, res, patientId, medicalRecord);
    
  } catch (err) {
    console.error('Error in sync prescriptions endpoint:', err);
    return res.status(500).json({ 
      success: false,
      message: 'Server Error', 
      error: err.message 
    });
  }
});

// Helper function to sync prescriptions with a medical record
async function syncPrescriptionsWithRecord(req, res, patientId, medicalRecord) {
  try {
    // Find all prescriptions for this patient
    const prescriptions = await Prescription.find({
      $or: [
        { patient: patientId },
        { patientId: patientId }
      ]
    }).sort({ createdAt: -1 });
    
    if (!prescriptions || prescriptions.length === 0) {
      return res.status(200).json({ 
        success: true,
        message: 'No prescriptions found for this patient' 
      });
    }
    
    // Update the medical record with prescription references if needed
    if (!medicalRecord.prescriptions) {
      medicalRecord.prescriptions = [];
    }
    
    // Create a map of existing prescriptions to avoid duplicates
    const existingPrescriptionMap = new Map();
    medicalRecord.prescriptions.forEach(p => {
      if (p.alternativeMedication && p.dosage && p.frequency) {
        const key = `${p.alternativeMedication}-${p.dosage}-${p.frequency}`;
        existingPrescriptionMap.set(key, true);
      }
    });
    
    // Add new prescriptions to the medical record
    let addedCount = 0;
    for (const prescription of prescriptions) {
      // Create a unique key for this prescription
      const key = `${prescription.medicationName || ''}-${prescription.dosage || ''}-${prescription.frequency || ''}`;
      
      // Skip if this prescription is already in the medical record
      if (existingPrescriptionMap.has(key)) {
        continue;
      }
      
      try {
        // Add prescription reference (ObjectId) to the medical record
        if (prescription._id) {
          medicalRecord.prescriptions.push(prescription._id);
        }
        
        // Update the prescription with a reference to the medical record
        prescription.medicalRecord = medicalRecord._id;
        await prescription.save();
        
        addedCount++;
        existingPrescriptionMap.set(key, true);
      } catch (prescError) {
        console.error(`Error processing prescription ${prescription._id}:`, prescError);
        // Continue with other prescriptions even if one fails
      }
    }
    
    // Save the medical record if prescriptions were added
    if (addedCount > 0) {
      try {
        medicalRecord.lastUpdatedBy = req.user ? req.user.id : medicalRecord.lastUpdatedBy;
        await medicalRecord.save();
      } catch (saveError) {
        console.error('Error saving medical record:', saveError);
        return res.status(500).json({ 
          success: false,
          message: 'Failed to save medical record', 
          error: saveError.message 
        });
      }
    }
    
    return res.status(200).json({
      success: true,
      message: `Successfully synced prescriptions with medical record`,
      addedCount,
      medicalRecordId: medicalRecord._id
    });
  } catch (err) {
    console.error('Error in syncPrescriptionsWithRecord:', err);
    return res.status(500).json({ 
      success: false,
      message: 'Server Error', 
      error: err.message 
    });
  }
}

// PATCH update prescription (partial update)
router.patch('/:id', [auth], async (req, res) => {
  try {
    console.log(`PATCH /api/prescriptions/${req.params.id}`, req.body);
    
    const prescription = await Prescription.findById(req.params.id);
    
    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found' });
    }
    
    // Only update fields that are provided in the request body
    for (const [key, value] of Object.entries(req.body)) {
      if (prescription.schema.path(key)) {
        prescription[key] = value;
      }
    }
    
    await prescription.save();
    
    res.status(200).json(prescription);
  } catch (err) {
    console.error('Error patching prescription:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// Process prescription payment endpoint (with old payment authorization logic)
router.post('/process-payment/:prescriptionId', auth, syncPaymentData, async (req, res) => {
  try {
    const { prescriptionId } = req.params;
    const { paymentMethod, amountPaid, notes, sendToNurse } = req.body;

    // Debugging: Log incoming request for payment processing
    console.log(`🔍 [PROCESS PAYMENT] Incoming request for prescription ${prescriptionId}:`, {
      params: req.params,
      body: req.body,
      user: req.user ? { id: req.user.id, role: req.user.role } : 'N/A'
    });

    // Normalize amount to a Number early to avoid string math issues
    const amountPaidNum = Number(amountPaid) || 0;

    if (!paymentMethod || !amountPaidNum) {
      return res.status(400).json({
        success: false,
        message: 'Payment method and amount are required'
      });
    }
    // Normalize accepted payment methods (support bank transfer)
    const allowedMethods = ['cash', 'credit_card', 'debit_card', 'insurance', 'bank_transfer', 'card', 'bank'];
    if (!allowedMethods.includes(String(paymentMethod).toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment method',
      });
    }

    // Find the prescription
    const prescription = await Prescription.findById(prescriptionId)
      .populate('patient', 'firstName lastName patientId')
      .populate('doctor', 'firstName lastName');

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found'
      });
    }

    // Ensure we have a usable doctor ObjectId for audit fields
    const doctorId = (prescription.doctor && prescription.doctor._id)
      ? prescription.doctor._id
      : prescription.doctor;

    // Use the old payment authorization logic
    // If prescription.medications is not populated, create it from the single medication fields
    let medications = prescription.medications;
    if (!medications || medications.length === 0) {
      medications = [{
        name: prescription.medicationName,
        dosage: prescription.dosage,
        frequency: prescription.frequency,
        duration: prescription.duration,
        quantity: prescription.quantity,
        price: prescription.price,
        // Calculate totalPrice based on frequency and duration
        totalPrice: (() => {
          if (!prescription.frequency || !prescription.duration) return 0;
          
          const freq = prescription.frequency.toLowerCase();
          let dosesPerDay = 1;
          if (freq.includes('once') || freq.includes('daily')) dosesPerDay = 1;
          else if (freq.includes('twice') || freq.includes('bid')) dosesPerDay = 2;
          else if (freq.includes('three') || freq.includes('tid') || freq.includes('thrice')) dosesPerDay = 3;
          else if (freq.includes('four') || freq.includes('qid')) dosesPerDay = 4;
          
          const durationMatch = prescription.duration.match(/(\d+)\s*(day|days)/i);
          const days = durationMatch ? parseInt(durationMatch[1]) : 5;
          const totalDoses = dosesPerDay * days;
          
          return totalDoses * (prescription.price || 0);
        })()
      }];
    }
    // Always fetch the latest sellingPrice from inventory for each medication
    for (let med of medications) {
      if (!med.inventoryItemId && prescription.medicationItem) {
        med.inventoryItemId = prescription.medicationItem;
      }
      if (med.inventoryItemId) {
        const InventoryItem = require('../models/InventoryItem');
        const inventoryItem = await InventoryItem.findById(med.inventoryItemId);
        if (inventoryItem) {
          med.price = inventoryItem.sellingPrice;
          
          // Calculate totalPrice based on frequency and duration
          let totalPrice = 0;
          if (med.frequency && med.duration) {
            const freq = med.frequency.toLowerCase();
            let dosesPerDay = 1;
            if (freq.includes('once') || freq.includes('daily')) dosesPerDay = 1;
            else if (freq.includes('twice') || freq.includes('bid')) dosesPerDay = 2;
            else if (freq.includes('three') || freq.includes('tid') || freq.includes('thrice')) dosesPerDay = 3;
            else if (freq.includes('four') || freq.includes('qid')) dosesPerDay = 4;
            
            const durationMatch = med.duration.match(/(\d+)\s*(day|days)/i);
            const days = durationMatch ? parseInt(durationMatch[1]) : 5;
            const totalDoses = dosesPerDay * days;
            
            totalPrice = totalDoses * inventoryItem.sellingPrice;
          } else {
            // Fallback to quantity-based calculation if frequency/duration not available
            totalPrice = (med.quantity || 1) * inventoryItem.sellingPrice;
          }
          
          med.totalPrice = totalPrice;
          console.log(`✅ Updated medication ${med.name} with price: ${med.price} ETB, totalPrice: ${totalPrice} ETB`);
        } else {
          console.log(`❌ Inventory item not found for ${med.name}`);
        }
      } else {
        console.log(`❌ No inventory item ID for ${med.name}`);
      }
    }
    prescription.medications = medications;

    // Also update the prescription price field directly from inventory
    if (prescription.medicationItem) {
      const InventoryItem = require('../models/InventoryItem');
      const inventoryItem = await InventoryItem.findById(prescription.medicationItem);
      if (inventoryItem) {
        prescription.price = inventoryItem.sellingPrice;
        console.log(`✅ Updated prescription price to: ${prescription.price} ETB from inventory`);
      }
    }

    console.log('🔍 Prescription medications after price update:', JSON.stringify(medications, null, 2));

    // Use the enhanced processor to get payment summary
    const enhancedResult = await EnhancedMedicationPaymentProcessor.processPaymentWithAuthorization({
      prescriptionId,
      paymentMethod,
      amountPaid: amountPaidNum,
      notes,
      sendToNurse,
      prescription
    });

    console.log('🔍 Enhanced result:', JSON.stringify(enhancedResult, null, 2));

    // Calculate explicit costPerDose and totalCost from the payment plan
    const costPerDose = enhancedResult.paymentPlan.costPerDose;
    const totalCost = enhancedResult.paymentPlan.totalCost;
    const totalDoses = enhancedResult.paymentPlan.totalDoses;

    // Fallback calculation if enhanced processor didn't work correctly
    let finalCostPerDose = costPerDose;
    let finalTotalCost = totalCost;
    let finalTotalDoses = totalDoses;

    if (!finalCostPerDose || !finalTotalCost || finalCostPerDose < 1) {
      console.log('⚠️ Enhanced processor returned invalid values, using fallback calculation');
      
      // Get the medication with inventory price or use medication-specific defaults
      const primaryMedication = medications[0];
      if (primaryMedication && primaryMedication.price) {
        finalCostPerDose = primaryMedication.price;
      } else {
        // Get real medication cost from inventory
        try {
          const InventoryItem = require('../models/InventoryItem');
          const inventoryItem = await InventoryItem.findOne({
            name: { $regex: new RegExp(prescription.medicationName || '', 'i') }
          });
          
          if (inventoryItem) {
            // Use sellingPrice if available, otherwise use unitPrice, fallback to default
            finalCostPerDose = inventoryItem.sellingPrice || inventoryItem.unitPrice;
            console.log(`💰 Using inventory price for ${prescription.medicationName}: ETB ${finalCostPerDose} (sellingPrice: ${inventoryItem.sellingPrice}, unitPrice: ${inventoryItem.unitPrice})`);
          } else {
            // Try to get price from BillableItem if not found in inventory
        const BillableItem = require('../models/BillableItem');
        const billable = await BillableItem.findOne({ 
            name: prescription.medicationName,
            type: 'medication'
        });
        finalCostPerDose = billable?.unitPrice || 0;
        
        if (!finalCostPerDose) {
            console.error(`❌ [PRESCRIPTION] No pricing found for medication: ${prescription.medicationName}`);
            throw new Error(`No pricing found for medication: ${prescription.medicationName}`);
        }
            console.log(`⚠️ ${prescription.medicationName} not found in inventory, using default: ETB ${finalCostPerDose}`);
          }
        } catch (error) {
          console.error(`❌ Error getting inventory price for ${prescription.medicationName}:`, error);
          finalCostPerDose = null; // No cost available - should be handled by BillableItem lookup
        }
      }
      
      // Parse frequency to get doses per day (handle all frequency types)
      const frequency = prescription.frequency || 'once daily';
      let dosesPerDay = 1; // Default for "once daily"
      const freq = frequency.toLowerCase();
      
      // Handle all frequency types correctly
      if (freq.includes('once') || freq.includes('daily')) {
        dosesPerDay = 1;
      } else if (freq.includes('twice') || freq.includes('bid')) {
        dosesPerDay = 2;
      } else if (freq.includes('three') || freq.includes('tid') || freq.includes('thrice')) {
        dosesPerDay = 3;
      } else if (freq.includes('four') || freq.includes('qid')) {
        dosesPerDay = 4;
      }
      
      console.log(`📊 Fallback frequency parsing: "${frequency}" → ${dosesPerDay} doses/day`);
      
      // CRITICAL: Use the exact duration from the prescription
      const duration = prescription.duration || '7 days';
      const durationMatch = duration.match(/(\d+)\s*(day|days)/i);
      let totalDays = 7; // Default to 7 days
      if (durationMatch) {
        totalDays = parseInt(durationMatch[1]);
      }
      
      finalTotalDoses = totalDays * dosesPerDay;
      finalTotalCost = finalCostPerDose * finalTotalDoses;
      
      console.log(`📊 Fallback calculation: ${finalCostPerDose} ETB × ${finalTotalDoses} doses = ${finalTotalCost} ETB`);
      console.log(`📊 Calculation details: Duration=${totalDays} days, Frequency=${dosesPerDay} doses/day, Medication=${prescription.medicationName}`);
    }

    console.log(`Payment calculation: costPerDose=${finalCostPerDose}, totalDoses=${finalTotalDoses}, totalCost=${finalTotalCost}`);

    // Update prescription payment status
    prescription.paymentStatus = enhancedResult.authorizationSummary.paidDays >= enhancedResult.authorizationSummary.totalDays ? 'paid' : 'partial';
    prescription.paidAt = new Date();
    prescription.paymentMethod = paymentMethod;
    prescription.paymentNotes = notes || '';
    prescription.paymentAuthorization = enhancedResult.authorizationSummary;
    await prescription.save();

    // Create invoice with correct total cost
    // Generate a unique invoice number with a random suffix to avoid duplicate key errors
    const generateInvoiceNumber = () => {
      const randomSuffix = Math.floor(100 + Math.random() * 900); // 3-digit random
      return `PRES-${Date.now()}-${randomSuffix}`;
    };

        // Create invoice items for each medication
        const invoiceItems = [];
        let totalInvoiceAmount = 0;
        
        console.log('🔍 Creating invoice items for prescription medications:', JSON.stringify(prescription.medications, null, 2));
        console.log('🔍 Prescription ID:', prescription._id);
        console.log('🔍 Prescription global duration:', prescription.duration);
        console.log('🔍 [INVOICE DEBUG] Starting invoice generation for prescription:', prescription._id);
        
        // If prescription has multiple medications, create items for each
        if (prescription.medications && prescription.medications.length > 0) {
          for (const medication of prescription.medications) {
        // Get real medication cost from inventory and calculate correct doses
        let medCostPerDose = 0; // Initialize to 0
        let medTotalDoses = 0;

        try {
          const medicationName = medication.name || medication.medication;

          // Fetch medication price using the centralized service
          const priceResult = await MedicationPricingService.getMedicationPrice(medicationName);
          if (priceResult.price) {
            medCostPerDose = priceResult.price;
            console.log(`💰 [PRICING] Found price for ${medicationName}: ETB ${medCostPerDose} (${priceResult.source})`);
          } else {
            console.error(`❌ [PRICING] No valid price found for ${medicationName}: ${priceResult.error}`);
            // medCostPerDose remains 0 if no price found or error
          }
          
          // CRITICAL FIX: Always use doctor's prescribed duration, robust parsing (no hardcoded 1 day)
          const rawDuration = medication.duration ?? prescription.duration ?? null;
          let durationDays = null;
          if (typeof rawDuration === 'number') {
            durationDays = Math.max(1, parseInt(rawDuration));
          } else if (typeof rawDuration === 'string') {
            const dur = rawDuration.toLowerCase().trim();
            // 3 days, 1 day
            let m = dur.match(/(\d+)\s*days?/);
            if (m) {
              durationDays = Math.max(1, parseInt(m[1]));
            } else if ((m = dur.match(/(\d+)\s*weeks?/))) {
              durationDays = Math.max(1, parseInt(m[1]) * 7);
            } else if ((m = dur.match(/(\d+)\s*months?/))) {
              durationDays = Math.max(1, parseInt(m[1]) * 30);
            } else if ((m = dur.match(/(\d+)/))) {
              // bare number
              durationDays = Math.max(1, parseInt(m[1]));
            } else {
              // leave as null to indicate unparsable; do not force 1 day
              durationDays = null;
            }
          }
          
          console.log(`🔧 [CRITICAL FIX] Processing medication ${medicationName}: duration="${duration}", durationDays=${durationDays}, frequency="${medication.frequency}"`);
          console.log(`🔍 [INVOICE DEBUG] Medication data:`, {
            name: medicationName,
            originalDuration: medication.duration,
            parsedDuration: duration,
            frequency: medication.frequency,
            prescriptionId: prescription._id
          });

          const freq = (medication.frequency || '').toLowerCase();
          let frequencyPerDay = 1;
          // Check specific multi-dose patterns BEFORE the generic 'daily' match
          if (freq.includes('four') || freq.includes('qid') || freq.includes('4x')) frequencyPerDay = 4;
          else if (freq.includes('three times') || freq.includes('thrice') || freq.includes('tid') || freq.includes('3x')) frequencyPerDay = 3;
          else if (freq.includes('twice') || freq.includes('bid') || freq.includes('2x')) frequencyPerDay = 2;
          else if (freq.includes('once') || freq.includes('daily') || freq.includes('qd') || freq.includes('1x')) frequencyPerDay = 1;

          // Calculate total doses; if duration is unknown, fall back to provided totalDoses or skip 1-day assumption
          if (durationDays != null) {
            medTotalDoses = durationDays * frequencyPerDay;
          } else if (typeof medication.totalDoses === 'number' && medication.totalDoses > 0) {
            medTotalDoses = medication.totalDoses;
          } else {
            // last resort: use frequencyPerDay (represents 1 scheduling cycle) without implying days
            medTotalDoses = frequencyPerDay;
          }
          
          console.log(`📋 Dose calculation for ${medicationName}: ${durationDays} days × ${frequencyPerDay} doses/day = ${medTotalDoses} total doses`);
          console.log(`📋 Creating invoice item for ${medicationName}: ${medCostPerDose} ETB × ${medTotalDoses} doses = ${medCostPerDose * medTotalDoses} ETB`);
        } catch (error) {
          console.error(`❌ Error getting inventory price for ${medication.name || medication.medication}:`, error);
          medCostPerDose = finalCostPerDose;
          medTotalDoses = finalTotalDoses;
        }
        
        // Multiply by quantity if provided (e.g., multiple units per dose)
        const quantityFactor = Number(medication.quantity) && Number(medication.quantity) > 0 ? Number(medication.quantity) : 1;
        const medTotalCost = medCostPerDose * medTotalDoses * quantityFactor;
            
            // CRITICAL FIX: Generate detailed description with individual frequency and duration
            const frequencyDisplay = medication.frequency || 'Once daily (QD)';
            const durationDisplay = (() => {
              const d = medication.duration ?? prescription.duration;
              if (!d) return 'doctor-specified duration';
              if (typeof d === 'number') return `${d} days`;
              const str = String(d).trim();
              // If it already includes a unit, keep as is; otherwise append days
              return /(day|days|week|weeks|month|months)/i.test(str) ? str : `${str} days`;
            })();
            const detailedDescription = `Medication: ${medication.name || medication.medication} (${medTotalDoses} doses - ${frequencyDisplay} for ${durationDisplay})`;
            
            console.log(`🔧 [CRITICAL FIX] Creating invoice item with individual duration: ${medication.name || medication.medication} - ${durationDisplay}`);
            
            invoiceItems.push({
              itemType: 'medication',
              category: 'medication',
              description: detailedDescription,
              quantity: medTotalDoses * quantityFactor,
              unitPrice: medCostPerDose,
              total: medTotalCost
            });
            
            totalInvoiceAmount += medTotalCost;
          }
        } else {
          // Fallback to single medication (original logic)
          console.log(`📋 Creating single invoice item for ${prescription.medicationName}: ${finalCostPerDose} ETB × ${finalTotalDoses} doses = ${finalTotalCost} ETB`);
          
          // CRITICAL FIX: Generate detailed description with individual frequency and duration for single medication
          const frequencyDisplay = prescription.frequency || 'Once daily (QD)';
          const durationDisplay = prescription.duration || '1 day';
          const detailedDescription = `Medication: ${prescription.medicationName} (${finalTotalDoses} doses - ${frequencyDisplay} for ${durationDisplay})`;
          
          console.log(`🔧 [CRITICAL FIX] Creating fallback invoice item with duration: ${prescription.medicationName} - ${durationDisplay}`);
          
          invoiceItems.push({
            itemType: 'medication',
            category: 'medication',
            description: detailedDescription,
            quantity: finalTotalDoses,
            unitPrice: finalCostPerDose,
            total: finalTotalCost
          });
          totalInvoiceAmount = finalTotalCost;
        }

        // Safety: ensure we never create a zero-total invoice when we have a valid computed total
        if (!totalInvoiceAmount || totalInvoiceAmount <= 0) {
          totalInvoiceAmount = finalTotalCost || 0;
        }
        
        console.log(`💰 Total invoice amount: ${totalInvoiceAmount} ETB`);
        console.log(`📋 Invoice items created: ${invoiceItems.length} items`);
        console.log(`💳 Payment amount: ${amountPaidNum} ETB`);
        console.log(`💳 Expected balance: ${Math.max(0, totalInvoiceAmount - amountPaidNum)} ETB`);

    let invoice;
    // Reuse existing invoice for this prescription if available to prevent duplicates
    try {
      if (prescription.invoiceId) {
        const existing = await MedicalInvoice.findById(prescription.invoiceId);
        if (existing) {
          // If we computed fresh invoice items (e.g., after fixing frequency/quantity), update the invoice items first
          try {
            if (Array.isArray(invoiceItems) && invoiceItems.length > 0) {
              existing.items = invoiceItems;
            }
          } catch (itemsErr) {
            console.warn('Warning: failed to update existing invoice items:', itemsErr?.message || itemsErr);
          }

          // Recompute items total for accurate outstanding balance BEFORE validation
          const recomputedItemsTotal = (existing.items || []).reduce((sum, it) => sum + (it.total || (it.quantity * it.unitPrice || 0)), 0);
          const currentPaid = existing.amountPaid || 0;
          const outstandingBeforeThisPayment = Math.max(0, recomputedItemsTotal - currentPaid);

          // Validate partial amount does not exceed remaining balance
          if (amountPaidNum > outstandingBeforeThisPayment) {
            return res.status(400).json({
              success: false,
              message: 'Payment amount exceeds outstanding balance for this prescription invoice',
              data: {
                outstanding: outstandingBeforeThisPayment,
                attempted: amountPaidNum,
                total: recomputedItemsTotal,
                alreadyPaid: currentPaid
              }
            });
          }
          // Append payment and update totals
          existing.payments = existing.payments || [];
          existing.payments.push({
            amount: amountPaidNum,
            method: paymentMethod,
            date: new Date(),
            reference: `PRES-PAY-${Date.now()}`,
            notes: notes || 'Prescription payment',
            processedBy: doctorId
          });
          // Update base totals explicitly to avoid relying solely on pre-save hooks
          existing.subtotal = recomputedItemsTotal;
          existing.total = recomputedItemsTotal;
          // Let pre-save hook compute totals/analytics from items and payments; ensure amountPaid/balance are consistent
          existing.amountPaid = (existing.amountPaid || 0) + amountPaidNum;
          existing.balance = Math.max(0, recomputedItemsTotal - existing.amountPaid);
          existing.status = existing.balance === 0 ? 'paid' : 'partial';
          await existing.save();
          invoice = existing;
        }
      }
    } catch (reuseErr) {
      console.warn('Failed to reuse existing prescription invoice, will create new one:', reuseErr?.message || reuseErr);
    }

    let attempts = 0;
    while (!invoice && attempts < 5) {
      try {
        // Build patient identification strings using standardized patient IDs
        let patientName = '';
        let patientIdStr = '';
        
        try {
          const Patient = require('../models/Patient');
          
          // Use the patient ID standardization utilities
          let patient;
          if (prescription.patient && prescription.patient.firstName) {
            // Patient is already populated
            patient = prescription.patient;
          } else {
            // Patient is an ObjectId reference, fetch the full patient
            patient = await Patient.findById(prescription.patient).select('firstName lastName patientId');
          }
          
          if (patient) {
            patientName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
            // Always use the standardized patientId, fallback to ObjectId only if patientId doesn't exist
            patientIdStr = patient.patientId || patient._id.toString();
            
            console.log(`🔍 Patient ID standardization: Using ${patient.patientId ? 'standardized' : 'ObjectId'} patient ID: ${patientIdStr}`);
          }
        } catch (e) {
          console.warn('Error fetching patient details:', e.message);
          // Final safeguard: ensure we have non-empty identifiers
          if (prescription.patient) {
            patientIdStr = typeof prescription.patient === 'string' ? prescription.patient : prescription.patient.toString();
          }
        }

        // Fallbacks to satisfy schema requirements in edge cases
        const createdByUserId = doctorId || (req.user && (req.user._id || req.user.id));
        const safePatientName = patientName && String(patientName).trim().length > 0 ? patientName : 'Unknown Patient';
        const safePatientIdStr = patientIdStr && String(patientIdStr).trim().length > 0
          ? String(patientIdStr)
          : (prescription.patient && prescription.patient.toString ? prescription.patient.toString() : 'UNKNOWN');

        invoice = new MedicalInvoice({
          patient: prescription.patient,
          patientId: safePatientIdStr,
          patientName: safePatientName,
          createdBy: createdByUserId,
          dueDate: new Date(Date.now() + 7*24*60*60*1000),
          invoiceNumber: generateInvoiceNumber(),
          items: invoiceItems,
          subtotal: totalInvoiceAmount,
          total: totalInvoiceAmount,
          amountPaid: amountPaidNum,
          balance: Math.max(0, totalInvoiceAmount - amountPaidNum),
          status: amountPaidNum >= totalInvoiceAmount ? 'paid' : 'partial',
          paymentMethod: paymentMethod,
          paidDate: new Date(),
          payments: [{
            amount: amountPaidNum,
            method: paymentMethod,
            date: new Date(),
            reference: `PRES-PAY-${Date.now()}`,
            notes: notes || 'Prescription payment',
            processedBy: doctorId
          }]
        });
        await invoice.save();
        // Link the invoice to the prescription to prevent duplicates on subsequent payments
        try {
          prescription.invoiceId = invoice._id;
          // Reflect payment status on prescription based on invoice balance
          const isFullyPaid = (invoice.balance || 0) === 0;
          prescription.paymentStatus = isFullyPaid ? 'paid' : 'partial';
          if (prescription.paymentAuthorization) {
            prescription.paymentAuthorization.paymentStatus = isFullyPaid ? 'fully_paid' : 'partial';
          }
          await prescription.save();
        } catch (linkErr) {
          console.warn('Warning: failed to link invoice to prescription:', linkErr?.message || linkErr);
        }
        
        console.log(`✅ Invoice created successfully:`);
        console.log(`   Invoice #: ${invoice.invoiceNumber}`);
        console.log(`   Total: ${invoice.total} ETB`);
        console.log(`   Amount Paid: ${invoice.amountPaid} ETB`);
        console.log(`   Balance: ${invoice.balance} ETB`);
        console.log(`   Status: ${invoice.status}`);
      } catch (err) {
        if (err.code === 11000 && err.keyPattern && err.keyPattern.invoiceNumber) {
          // Duplicate invoiceNumber, generate a new one and retry
          console.warn('Duplicate invoiceNumber detected, regenerating...');
          invoice = null;
          attempts++;
        } else {
          throw err;
        }
      }
    }
    if (!invoice) {
      throw new Error('Failed to create unique invoice after multiple attempts');
    }

    // Update or remove payment notifications; for full payments, remove, for partial, update
    if (prescription.paymentStatus === 'paid' || prescription.paymentStatus === 'partial') {
      console.log(`🔔 Updating notification for ${prescription.paymentStatus} payment`);
      
      const Notification = require('../models/Notification');
      if (prescription.paymentStatus === 'paid') {
        // Remove all medication payment notifications for this prescription/patient
        await Notification.deleteMany({
          type: 'medication_payment_required',
          'data.prescriptionId': prescriptionId
        });
      } else {
        // Partial: update notifications with current balance
        await Notification.updateMany(
          {
            type: 'medication_payment_required',
            'data.prescriptionId': prescriptionId,
            read: false
          },
          {
            $set: {
              'data.paymentStatus': 'partial',
              'data.amountPaid': invoice.amountPaid,
              'data.outstandingAmount': invoice.balance,
              updatedAt: new Date()
            }
          }
        );
        
        // Also update individual medication amounts to reflect the current amount due
        // This ensures consistency between the main amount and medication breakdown
        const notifications = await Notification.find({
          type: 'medication_payment_required',
          'data.prescriptionId': prescriptionId,
          read: false
        });
        
        for (const notification of notifications) {
          if (notification.data?.medications && notification.data.medications.length > 0) {
            const totalOriginalAmount = notification.data.medications.reduce((sum, med) => sum + (med.totalPrice || 0), 0);
            const remainingAmount = invoice.balance;
            
            if (totalOriginalAmount > 0 && remainingAmount !== totalOriginalAmount) {
              // Calculate proportional amounts for each medication
              const updatedMedications = notification.data.medications.map(med => {
                const originalPrice = med.totalPrice || med.price || 0;
                const proportion = totalOriginalAmount > 0 ? originalPrice / totalOriginalAmount : 0;
                const currentAmount = remainingAmount * proportion;
                
                return {
                  ...med,
                  totalPrice: currentAmount,
                  price: currentAmount
                };
              });
              
              // Update the notification with corrected medication amounts
              await Notification.findByIdAndUpdate(notification._id, {
                $set: {
                  'data.medications': updatedMedications
                }
              });
            }
          }
        }
      }
      
      console.log(`✅ Notification updated for ${prescription.paymentStatus} payment`);
    }

    // ROOT CAUSE FIX: ROBUST NURSE TASK CREATION AFTER PAYMENT
    console.log(`🔧 [PRESCRIPTION PAYMENT] Creating nurse tasks after payment (sendToNurse: ${sendToNurse})`);
    
    // Use robust payment processing to guarantee task creation
    const { processPaymentWithGuaranteedTasks } = require('../utils/robustPaymentProcessing');
    
    try {
      const paymentResult = await processPaymentWithGuaranteedTasks(prescription, prescription.patient, {
        amountPaid: amountPaid,
        paymentMethod: paymentMethod,
        notes: notes
      });
      
      if (paymentResult.taskCreationSuccess) {
        console.log(`🎉 [ROOT CAUSE FIX] SUCCESS: ${paymentResult.tasksCreated} nurse tasks created for prescription ${prescription._id}`);
      } else if (paymentResult.criticalError) {
        console.error(`🚨 [ROOT CAUSE FIX] CRITICAL: Prescription ${prescription._id} paid but NO nurse tasks created!`);
        console.error(`🚨 [ROOT CAUSE FIX] This prescription will NOT appear in nurse area!`);
        console.error(`🚨 [ROOT CAUSE FIX] Errors:`, paymentResult.errors);
      }
    } catch (robustPaymentError) {
      console.error(`💥 [ROOT CAUSE FIX] Robust payment processing failed:`, robustPaymentError);
    }
    
          // Always create nurse tasks after payment - payment means medication is ready for administration
      if (true) { // Always create tasks for paid prescriptions
        const NurseTask = require('../models/NurseTask');
        const User = require('../models/User');
        
        // Handle multiple medications - CREATE SEPARATE TASK FOR EACH MEDICATION ENTRY
        // This allows the same medication to be prescribed multiple times and each creates a separate task
        const medicationsToProcess = prescription.medications && prescription.medications.length > 0 
          ? prescription.medications 
          : [{
              name: prescription.medicationName,
              dosage: prescription.dosage,
              frequency: prescription.frequency,
              route: prescription.route || 'Oral',
              duration: prescription.duration,
              assignedNurseId: prescription.assignedNurseId,
              inventoryItem: prescription.medicationItem,
              inventoryItemId: prescription.medicationItem
            }];

        // Get patient and doctor names for the task
        const patientDoc = prescription.patient && prescription.patient._id 
          ? prescription.patient 
          : await mongoose.model('Patient').findById(prescription.patient);
        const patientName = patientDoc ? `${patientDoc.firstName || ''} ${patientDoc.lastName || ''}`.trim() : 'Unknown Patient';
        
        const doctorDoc = prescription.doctor && prescription.doctor._id
          ? prescription.doctor
          : await User.findById(prescription.doctor);
        const doctorName = doctorDoc ? `${doctorDoc.firstName || ''} ${doctorDoc.lastName || ''}`.trim() : 'Unknown Doctor';

        // Try to find the patient's assigned nurse
        let assignedNurseId = null;
        let assignedNurseName = null;
        if (patientDoc && patientDoc.assignedNurseId) {
          const nurseDoc = await User.findById(patientDoc.assignedNurseId);
          if (nurseDoc && nurseDoc.role === 'nurse') {
            assignedNurseId = nurseDoc._id;
            assignedNurseName = `${nurseDoc.firstName || ''} ${nurseDoc.lastName || ''}`.trim();
          }
        }

        // Extract numeric duration from string like "3 days" -> 3
        const extractNumericDuration = (durationStr) => {
          if (!durationStr) return null;
          if (typeof durationStr === 'number') return durationStr;
          const match = durationStr.toString().match(/(\d+)/);
          return match ? parseInt(match[1]) : null;
        };

        // Determine an assigner (doctor preferred, fallback to current user)
        const fallbackAssignerId = (prescription.doctor && prescription.doctor._id) || prescription.doctor || (req.user && (req.user._id || req.user.id));
        const fallbackAssignerName = doctorName || (req.user && (req.user.firstName || req.user.lastName))
          ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim()
          : 'System';

        console.log(`🔧 [NURSE TASK] Processing ${medicationsToProcess.length} medication entries for nurse tasks from prescription ${prescription._id}`);

        // Create a separate task for EACH medication entry (even if same medication name)
        // This allows doctors to prescribe the same medication multiple times and each creates a separate task
        for (let index = 0; index < medicationsToProcess.length; index++) {
          const medication = medicationsToProcess[index];
          
          try {
            // Create nurse tasks for EVERY prescribed medication (root cause: all meds must appear in Administer Meds)
            const inventoryItemId = medication.inventoryItem || medication.inventoryItemId || medication.medicationItem || null;
            const hasInventoryItem = !!inventoryItemId;
            if (!hasInventoryItem) {
              console.log(`ℹ️ [NURSE TASK] Creating task for medication without inventory link: ${medication.name || medication.medication} (administration tracking only)`);
            }

            const medicationName = medication.name || medication.medication;
            console.log(`🔧 [NURSE TASK] Creating task ${index + 1}/${medicationsToProcess.length} for medication: ${medicationName} from prescription ${prescription._id}`);
            
            // Count how many entries of this medication we have in the current prescription
            const sameMedicationEntries = medicationsToProcess.filter(m => (m.name || m.medication) === medicationName);
            const totalEntriesForThisMed = sameMedicationEntries.length;
            
            // Count how many tasks already exist for this medication in this prescription
            const existingTasksCount = await NurseTask.countDocuments({
              patientId: prescription.patient._id || prescription.patient,
              'medicationDetails.medicationName': medicationName,
              'medicationDetails.prescriptionId': prescription._id,
              taskType: 'MEDICATION',
              status: { $in: ['PENDING', 'IN_PROGRESS'] }
            });

            // Find which entry index this is for this medication (0-based within same medication entries)
            const entryIndexForThisMed = medicationsToProcess.slice(0, index + 1).filter(m => (m.name || m.medication) === medicationName).length - 1;

            // Only create if we haven't created enough tasks yet for this medication
            if (existingTasksCount >= totalEntriesForThisMed) {
              console.log(`⚠️ [NURSE TASK] All ${totalEntriesForThisMed} tasks for ${medicationName} already exist in prescription ${prescription._id}, skipping creation`);
              continue;
            }
            
            // Check if we've already created a task for this specific entry index
            if (existingTasksCount > entryIndexForThisMed) {
              console.log(`⚠️ [NURSE TASK] Task for ${medicationName} entry ${entryIndexForThisMed + 1} already exists, skipping creation`);
              continue;
            }
            
            // Use this medication's details
            const primaryMedication = medication;
            
            // CRITICAL: Use the medication's own duration, not the prescription's duration
            // Each medication entry can have its own duration (e.g., "3 days", "1 day")
            const medicationDuration = primaryMedication.duration || null;
            const numericDuration = extractNumericDuration(medicationDuration);
            
            // Log duration extraction for debugging
            console.log(`📅 [DURATION] Medication: ${medicationName}, Entry ${index + 1}/${medicationsToProcess.length}, Duration string: "${medicationDuration}", Extracted: ${numericDuration}`);
            
            if (!numericDuration) {
              console.error(`❌ [DURATION] No valid duration found for ${medicationName} entry ${index + 1}. Medication duration: "${medicationDuration}", Prescription duration: "${prescription.duration}"`);
              console.error(`❌ [DURATION] Medication object:`, JSON.stringify(primaryMedication, null, 2));
            }
            
            // Prepare task data with enhanced payment authorization using centralized calculation
            const PaymentCalculation = require('../utils/paymentCalculation');
            
            const costBreakdown = PaymentCalculation.calculateMedicationCost(
              primaryMedication.frequency || prescription.frequency,
              numericDuration || 7
            );
            
            const paymentAuth = PaymentCalculation.calculatePaymentAuthorization(
              {
                frequency: primaryMedication.frequency || prescription.frequency,
                duration: numericDuration || 7
              },
              prescription.totalCost || 0, // amountPaid - use total cost since payment is processed
              costBreakdown.totalCost
            );

            // Create a unique description that includes prescription date to distinguish multiple prescriptions
            const prescriptionDate = prescription.datePrescribed || prescription.createdAt || new Date();
            const dateStr = new Date(prescriptionDate).toLocaleDateString();
            const description = medicationsToProcess.length > 1 && medicationsToProcess.filter(m => (m.name || m.medication) === medicationName).length > 1
              ? `Administer ${medicationName} - ${primaryMedication.dosage || prescription.dosage} - ${primaryMedication.frequency || prescription.frequency} (Prescribed ${dateStr})`
              : `Administer ${medicationName} - ${primaryMedication.dosage || prescription.dosage} - ${primaryMedication.frequency || prescription.frequency}`;

            // Use the same duplicate prevention logic as in prescription creation
            const { createMedicationTaskWithDuplicatePrevention } = require('../utils/taskDuplicatePrevention');
            
            const taskData = {
              patientId: prescription.patient._id || prescription.patient,
              patientName: patientName,
              description: description,
              taskType: 'MEDICATION',
              status: 'PENDING',
              priority: 'MEDIUM',
              assignedBy: fallbackAssignerId,
              assignedByName: fallbackAssignerName,
              assignedTo: assignedNurseId, // Optional: if patient has an assigned nurse
              assignedToName: assignedNurseName, // Optional: if patient has an assigned nurse
              notes: prescription.notes || prescription.instructions || 'Payment completed. Ready for administration.',
              dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Due in 24 hours
              medicationDetails: {
                medicationName: medicationName,
                dosage: primaryMedication.dosage || prescription.dosage,
                frequency: primaryMedication.frequency || prescription.frequency,
                route: primaryMedication.route || prescription.route || 'Oral',
                instructions: prescription.notes || prescription.instructions || '',
                duration: numericDuration,
                startDate: prescriptionDate,
                prescriptionId: prescription._id,
                prescriptionDate: prescriptionDate, // Store prescription date to help distinguish multiple prescriptions
                // Generate proper dose records based on frequency
                doseRecords: (() => {
                  const doseRecords = [];
                  const frequency = primaryMedication.frequency?.toLowerCase() || 'once daily';
                  let dosesPerDay = 1;
                  
                  // Determine doses per day based on frequency
                  if (frequency.includes('bid') || frequency.includes('twice')) {
                    dosesPerDay = 2;
                  } else if (frequency.includes('tid') || frequency.includes('three')) {
                    dosesPerDay = 3;
                  } else if (frequency.includes('qid') || frequency.includes('four')) {
                    dosesPerDay = 4;
                  }
                  
                  // Generate time slots for each dose
                  const getTimeSlots = (dosesPerDay) => {
                    switch (dosesPerDay) {
                      case 2: return ['09:00', '21:00']; // Morning, Evening
                      case 3: return ['09:00', '15:00', '21:00']; // Morning, Afternoon, Evening
                      case 4: return ['09:00', '13:00', '17:00', '21:00']; // Morning, Noon, Afternoon, Evening
                      default: return ['09:00']; // Once daily
                    }
                  };
                  
                  const timeSlots = getTimeSlots(dosesPerDay);
                  
                  // Create dose records for each day and time slot
                  // CRITICAL: Use the medication's duration, not prescription duration
                  if (!numericDuration) {
                    console.error(`❌ [DOSE RECORDS] No valid duration found for medication ${medicationName} entry ${index + 1} in prescription ${prescription._id}`);
                    console.error(`❌ [DOSE RECORDS] Medication duration: ${medicationDuration}, Prescription duration: ${prescription.duration}`);
                    return [];
                  }
                  
                  for (let day = 1; day <= numericDuration; day++) {
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
                })()
              },
              paymentAuthorization: paymentAuth
            };
            
            // Create task with duplicate prevention
            const result = await createMedicationTaskWithDuplicatePrevention(
              taskData,
              prescription.patient._id || prescription.patient,
              medicationName,
              prescription._id,
              null, // serviceId
              null  // session
            );
            
            // If duplicate was found, update payment authorization for all existing tasks
            if (result.reason === 'duplicate_found') {
              console.log(`🔄 Duplicate found for ${medicationName}, updating payment authorization for existing tasks`);
              const { updatePaymentAuthorizationForExistingTasks } = require('../utils/taskDuplicatePrevention');
              await updatePaymentAuthorizationForExistingTasks(
                prescription.patient._id || prescription.patient,
                medicationName,
                paymentAuth,
                null // session
              );
            }
            
            if (result.created) {
              console.log(`✅ [NURSE TASK] Successfully created nurse task: ${result.task._id} for ${medicationName}`);
              console.log(`✅ [NURSE TASK] Task details: Patient ${result.task.patientName}, Duration ${numericDuration} days`);
            } else {
              console.log(`⚠️ [NURSE TASK] Task already exists for ${medicationName}: ${result.reason}`);
            }
          } catch (taskError) {
            // Do not fail the entire payment flow if a nurse task cannot be created
            console.error('⚠️ [NURSE TASK] Failed to create nurse task for medication payment:', taskError?.message || taskError);
            console.error('⚠️ [NURSE TASK] Medication details:', {
              name: medicationName,
              patientId: prescription.patient._id,
              patientName: `${prescription.patient.firstName} ${prescription.patient.lastName}`
            });
          }
        }
      
      // Also push a nurse-facing notification with the paid amount
      try {
        const patientName = (prescription.patient && prescription.patient.firstName)
          ? `${prescription.patient.firstName} ${prescription.patient.lastName}`
          : (invoice.patientName || 'Unknown Patient');
        await Notification.create({
          title: prescription.paymentStatus === 'paid' ? 'Medication Payment Completed' : 'Medication Payment Received',
          message: prescription.paymentStatus === 'paid'
            ? `${patientName} paid ETB ${amountPaidNum}. Prescription is fully paid.`
            : `${patientName} paid ETB ${amountPaidNum}. Remaining balance: ETB ${invoice.balance}.`,
          type: 'medication_payment_info',
          senderId: req.user?._id || null,
          senderRole: 'reception',
          recipientRole: 'nurse',
          priority: 'medium',
          read: false,
          data: {
            patientId: invoice.patient?.toString?.() || prescription.patient?.toString?.(),
            patientName,
            invoiceId: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            amountPaid: amountPaidNum,
            outstandingAmount: invoice.balance,
            paymentStatus: prescription.paymentStatus
          },
          timestamp: new Date()
        });
      } catch (notifyErr) {
        console.warn('Failed to create nurse payment notification (non-fatal):', notifyErr?.message || notifyErr);
      }
    }

    // After saving invoice and optional nurse tasks, remove payment notifications for this prescription
    try {
      const Notification = require('../models/Notification');
      const mongoose = require('mongoose');
      const variants = [prescriptionId];
      if (mongoose.Types.ObjectId.isValid(prescriptionId)) {
        variants.push(new mongoose.Types.ObjectId(prescriptionId));
      }
      await Notification.updateMany(
        {
          type: 'medication_payment_required',
          $or: [
            { 'data.prescriptionId': { $in: variants } },
            { 'data.invoiceId': invoice?._id }
          ],
          read: false
        },
        {
          read: true,
          'data.paymentStatus': invoice.balance <= 0 ? 'paid' : 'partially_paid',
          'data.paidAt': new Date(),
          'data.invoiceId': invoice?._id
        }
      );
      
      // If this is a partial payment, also update individual medication amounts
      if (invoice.balance > 0) {
        const notifications = await Notification.find({
          type: 'medication_payment_required',
          $or: [
            { 'data.prescriptionId': { $in: variants } },
            { 'data.invoiceId': invoice?._id }
          ],
          read: false
        });
        
        for (const notification of notifications) {
          if (notification.data?.medications && notification.data.medications.length > 0) {
            const totalOriginalAmount = notification.data.medications.reduce((sum, med) => sum + (med.totalPrice || 0), 0);
            const remainingAmount = invoice.balance;
            
            if (totalOriginalAmount > 0 && remainingAmount !== totalOriginalAmount) {
              // Calculate proportional amounts for each medication
              const updatedMedications = notification.data.medications.map(med => {
                const originalPrice = med.totalPrice || med.price || 0;
                const proportion = totalOriginalAmount > 0 ? originalPrice / totalOriginalAmount : 0;
                const currentAmount = remainingAmount * proportion;
                
                return {
                  ...med,
                  totalPrice: currentAmount,
                  price: currentAmount
                };
              });
              
              // Update the notification with corrected medication amounts
              await Notification.findByIdAndUpdate(notification._id, {
                $set: {
                  'data.medications': updatedMedications
                }
              });
            }
          }
        }
      }
    } catch (nErr) {
      console.warn('⚠️ Failed to mark medication notifications as read:', nErr?.message || nErr);
    }

    res.json({
      success: true,
      message: 'Prescription payment processed successfully',
      data: {
        prescription,
        invoice,
        costPerDose: finalCostPerDose,
        totalCost: invoice.total,
        totalDoses: finalTotalDoses,
        paymentAuthorization: enhancedResult.authorizationSummary,
        paymentPlan: enhancedResult.paymentPlan,
        medicationSchedule: enhancedResult.medicationSchedule,
        paymentReminder: enhancedResult.paymentReminder,
        paymentSummary: {
          amountPaid: amountPaid,
          totalCost: invoice.total,
          remainingBalance: invoice.balance,
          isFullyPaid: amountPaid >= invoice.total,
          costPerDose: finalCostPerDose,
          totalDoses: finalTotalDoses
        }
      }
    });
  } catch (error) {
    console.error('Error processing prescription payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process prescription payment',
      error: error.message
    });
  }
});

// Emergency nurse task recovery endpoint - ROOT CAUSE FIX
router.post('/emergency-task-recovery/:prescriptionId', auth, async (req, res) => {
  try {
    console.log(`🚨 [EMERGENCY] Emergency task recovery requested for prescription ${req.params.prescriptionId}`);
    
    const Prescription = require('../models/Prescription');
    const NurseTask = require('../models/NurseTask');
    const Patient = require('../models/Patient');
    const mongoose = require('mongoose');
    
    // Find the prescription
    const prescription = await Prescription.findById(req.params.prescriptionId).populate('patient');
    
    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: `Prescription ${req.params.prescriptionId} not found`
      });
    }
    
    if (prescription.paymentStatus !== 'paid') {
      return res.status(400).json({
        success: false,
        message: `Prescription ${req.params.prescriptionId} is not paid (status: ${prescription.paymentStatus})`
      });
    }
    
    console.log(`🔍 [EMERGENCY] Found prescription: ${prescription.medicationName} - ${prescription.frequency}`);
    
    // Check if task already exists
    const existingTask = await NurseTask.findOne({
      'medicationDetails.prescriptionId': prescription._id.toString()
    });
    
    if (existingTask) {
      console.log(`✅ [EMERGENCY] Task already exists for prescription ${prescription._id}: ${existingTask._id}`);
      return res.json({
        success: true,
        message: 'Task already exists',
        tasksCreated: 0,
        existingTaskId: existingTask._id
      });
    }
    
    // Get patient data
    const patient = prescription.patient;
    const patientName = patient ? `${patient.firstName || ''} ${patient.lastName || ''}`.trim() : 'Unknown Patient';
    
    // Calculate dose records
    const frequency = prescription.frequency.toLowerCase();
    let dosesPerDay = 1;
    let timeSlots = ['Morning'];
    
    if (frequency.includes('tid') || frequency.includes('three')) {
      dosesPerDay = 3;
      timeSlots = ['Morning', 'Afternoon', 'Evening'];
    } else if (frequency.includes('bid') || frequency.includes('twice')) {
      dosesPerDay = 2;
      timeSlots = ['Morning', 'Evening'];
    } else if (frequency.includes('qid') || frequency.includes('four')) {
      dosesPerDay = 4;
      timeSlots = ['Morning', 'Afternoon', 'Evening', 'Night'];
    }
    
    // Extract duration
    const durationStr = prescription.duration || '5 days';
    const durationMatch = durationStr.toString().match(/(\d+)/);
    const duration = durationMatch ? parseInt(durationMatch[1]) : 5;
    
    // Generate dose records
    const doseRecords = [];
    for (let day = 1; day <= duration; day++) {
      for (const timeSlot of timeSlots) {
        doseRecords.push({
          day: day,
          timeSlot: timeSlot,
          administered: false,
          administeredAt: null,
          administeredBy: null,
          notes: ''
        });
      }
    }
    
    // Create nurse task
    const nurseTask = new NurseTask({
      patientId: prescription.patient || prescription.patientId,
      patientName: patientName,
      description: `Administer ${prescription.medicationName} - ${prescription.dosage} - ${prescription.frequency}`,
      taskType: 'MEDICATION',
      status: 'PENDING',
      priority: 'MEDIUM',
      assignedBy: prescription.doctor || req.user._id,
      assignedByName: 'Doctor',
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Due tomorrow
      notes: `Emergency task recovery for prescription ${prescription._id}`,
      prescriptionId: prescription._id,
      medicationDetails: {
        medicationName: prescription.medicationName,
        dosage: prescription.dosage || 'As prescribed',
        frequency: prescription.frequency,
        frequencyLabel: prescription.frequency,
        route: prescription.route || 'Oral',
        instructions: prescription.instructions || prescription.notes || '',
        duration: duration,
        startDate: new Date(),
        doseRecords: doseRecords,
        prescriptionId: prescription._id
      }
    });
    
    await nurseTask.save();
    
    console.log(`✅ [EMERGENCY] Successfully created nurse task: ${nurseTask._id}`);
    console.log(`📋 [EMERGENCY] Task details: ${prescription.medicationName} - ${prescription.frequency} - ${duration} days`);
    console.log(`💊 [EMERGENCY] Dose records: ${doseRecords.length} doses created`);
    
    res.json({
      success: true,
      message: `Successfully created nurse task for prescription ${prescription._id}`,
      tasksCreated: 1,
      taskId: nurseTask._id,
      taskDetails: {
        medicationName: prescription.medicationName,
        frequency: prescription.frequency,
        duration: duration,
        doseCount: doseRecords.length
      }
    });
    
  } catch (error) {
    console.error(`💥 [EMERGENCY] Emergency recovery error:`, error);
    res.status(500).json({
      success: false,
      message: 'Emergency recovery failed',
      error: error.message,
      stack: error.stack
    });
  }
});

// Automatic prescription status sync - ROOT CAUSE FIX
router.post('/sync-payment-status', auth, async (req, res) => {
  try {
    console.log(`🔄 [SYNC API] Manual prescription status sync requested`);
    
    const { manualSyncAllPrescriptions } = require('../utils/prescriptionStatusSync');
    const { patientId } = req.body;
    
    const result = await manualSyncAllPrescriptions(patientId);
    
    console.log(`✅ [SYNC API] Sync completed:`, result);
    
    res.json({
      success: true,
      message: `Sync completed: ${result.prescriptionsUpdated} prescriptions updated, ${result.tasksCreated} tasks created`,
      results: result
    });
    
  } catch (error) {
    console.error(`❌ [SYNC API] Sync failed:`, error);
    res.status(500).json({
      success: false,
      message: 'Prescription status sync failed',
      error: error.message
    });
  }
});

// Comprehensive fix for missing nurse tasks - ROOT CAUSE FIX  
router.post('/fix-all-missing-tasks', auth, async (req, res) => {
  try {
    console.log(`🔧 [FIX ALL] Comprehensive fix for all missing nurse tasks requested`);
    
    const Prescription = require('../models/Prescription');
    const NurseTask = require('../models/NurseTask');
    
    // Find all paid prescriptions
    const paidPrescriptions = await Prescription.find({
      paymentStatus: 'paid'
    }).populate('patient');
    
    console.log(`📋 [FIX ALL] Found ${paidPrescriptions.length} paid prescriptions`);
    
    const results = {
      totalPrescriptions: paidPrescriptions.length,
      prescriptionsWithTasks: 0,
      prescriptionsFixed: 0,
      errors: []
    };
    
    // Batch-fetch all existing nurse tasks for these prescriptions in one query
    const paidPrescriptionIds = paidPrescriptions.map(p => p._id.toString());
    const existingTasksForPaid = paidPrescriptionIds.length > 0
      ? await NurseTask.find({
          'medicationDetails.prescriptionId': { $in: paidPrescriptionIds }
        }).lean()
      : [];

    const prescriptionsWithExistingTasks = new Set(
      existingTasksForPaid.map(t => t.medicationDetails?.prescriptionId?.toString())
    );

    const { emergencyTaskRecovery } = require('../utils/robustPaymentProcessing');

    for (const prescription of paidPrescriptions) {
      try {
        if (prescriptionsWithExistingTasks.has(prescription._id.toString())) {
          results.prescriptionsWithTasks++;
          console.log(`✅ [FIX ALL] Prescription ${prescription._id} already has task`);
        } else {
          console.log(`🔧 [FIX ALL] Fixing prescription ${prescription._id}: ${prescription.medicationName}`);
          
          const recoveryResult = await emergencyTaskRecovery(prescription._id);
          
          if (recoveryResult.success) {
            results.prescriptionsFixed++;
            console.log(`✅ [FIX ALL] Fixed prescription ${prescription._id}: ${recoveryResult.tasksCreated} tasks created`);
          } else {
            results.errors.push(`${prescription._id}: ${recoveryResult.message}`);
            console.error(`❌ [FIX ALL] Failed to fix prescription ${prescription._id}`);
          }
        }
      } catch (error) {
        results.errors.push(`${prescription._id}: ${error.message}`);
        console.error(`❌ [FIX ALL] Error processing prescription ${prescription._id}:`, error);
      }
    }
    
    console.log(`📊 [FIX ALL] Results:`, results);
    
    res.json({
      success: true,
      message: `Fix completed: ${results.prescriptionsFixed} prescriptions fixed, ${results.prescriptionsWithTasks} already had tasks`,
      results: results
    });
    
  } catch (error) {
    console.error(`💥 [FIX ALL] Comprehensive fix error:`, error);
    res.status(500).json({
      success: false,
      message: 'Comprehensive fix failed',
      error: error.message
    });
  }
});

router.post('/check-extension-notifications', auth, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }
        
        const { checkExtensionNotification } = require('../scripts/checkExtensionNotification');
        await checkExtensionNotification();
        
        res.json({
            success: true,
            message: 'Extension notification check completed - check console logs'
        });
    } catch (error) {
        console.error('❌ Error during check:', error);
        res.status(500).json({
            success: false,
            message: 'Error during check',
            error: error.message
        });
    }
});

// Create missing extension invoices (admin only)
router.post('/create-missing-extension-invoices', auth, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }
        
        const { createMissingExtensionInvoices } = require('../utils/extensionInvoiceSystem');
        const createdCount = await createMissingExtensionInvoices();
        
        res.json({
            success: true,
            message: `Created ${createdCount} missing extension invoices`,
            createdCount
        });
    } catch (error) {
        console.error('❌ Error creating missing extension invoices:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating missing extension invoices',
            error: error.message
        });
    }
});

// Cleanup invalid extensions (admin only)
router.post('/cleanup-invalid-extensions', auth, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }
        
        const { cleanupInvalidExtensions } = require('../scripts/cleanupInvalidExtensions');
        await cleanupInvalidExtensions();
        
        res.json({
            success: true,
            message: 'Invalid extensions cleanup completed'
        });
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        res.status(500).json({
            success: false,
            message: 'Error during cleanup',
            error: error.message
        });
    }
});

// Extend existing medication prescription
router.post('/extend/:prescriptionId', auth, async (req, res) => {
  try {
    console.log(`🔧 [EXTENSION ROUTE] Extension request received for prescription: ${req.params.prescriptionId}`);
    console.log(`🔧 [EXTENSION ROUTE] Request method: ${req.method}`);
    console.log(`🔧 [EXTENSION ROUTE] Request URL: ${req.url}`);
    console.log(`🔧 [EXTENSION ROUTE] Request headers:`, req.headers);
    
    const { prescriptionId } = req.params;
    const { additionalDays, additionalDoses, reason, frequency } = req.body;

    console.log(`🔧 Extension request: ${prescriptionId}`);
    console.log(`   - Additional Days: ${additionalDays || 'Not specified'} (type: ${typeof additionalDays})`);
    console.log(`   - Additional Doses: ${additionalDoses || 'Not specified'} (type: ${typeof additionalDoses})`);
    console.log(`   - Frequency: ${frequency || 'Not specified'} (type: ${typeof frequency})`);
    console.log(`   - Reason: ${reason || 'Not specified'} (type: ${typeof reason})`);
    console.log(`   - Raw req.body:`, JSON.stringify(req.body, null, 2));
    console.log(`   - req.body.additionalDays:`, req.body.additionalDays, `(type: ${typeof req.body.additionalDays})`);
    console.log(`   - req.body.additionalDays === 0:`, req.body.additionalDays === 0);
    console.log(`   - req.body.additionalDays > 0:`, req.body.additionalDays > 0);

    // Validate input - prioritize doses over days
    console.log(`🔧 [VALIDATION] additionalDays: ${additionalDays}, additionalDoses: ${additionalDoses}`);
    console.log(`🔧 [VALIDATION] additionalDays <= 0: ${additionalDays <= 0}, additionalDoses <= 0: ${additionalDoses <= 0}`);
    
    if ((!additionalDays || additionalDays <= 0) && (!additionalDoses || additionalDoses <= 0)) {
      console.log(`🔧 [VALIDATION] Validation failed - both additionalDays and additionalDoses are invalid`);
      return res.status(400).json({
        success: false,
        message: 'Provide additionalDays (>0) or additionalDoses (>0)'
      });
    }
    
    console.log(`🔧 [VALIDATION] Validation passed`);

        // ROOT CAUSE FIX: Enhanced frequency handling for extensions
    let payload;
    let finalFrequency = frequency; // Create a mutable variable for frequency
    
    console.log(`🔧 [EXTENSION] Initial frequency parameter:`, frequency, `(type: ${typeof frequency})`);
    
    // Validate frequency parameter
    if (!finalFrequency) {
        console.warn(`⚠️ [EXTENSION] No frequency provided in request. Attempting to infer from prescription...`);
        
        // Get the prescription to check its frequency
        const prescription = await Prescription.findById(prescriptionId);
        if (prescription) {
            const inferredFrequency = prescription.frequency || 'QD (once daily)';
            console.log(`🔧 [EXTENSION] Using inferred frequency from prescription: ${inferredFrequency}`);
            finalFrequency = inferredFrequency;
        } else {
            console.error(`❌ [EXTENSION] Prescription not found for frequency inference`);
            return res.status(400).json({
                success: false,
                message: 'Frequency is required for extension calculation'
            });
        }
    }
    
    console.log(`🔧 [EXTENSION] Final frequency after inference:`, finalFrequency, `(type: ${typeof finalFrequency})`);
    
    // Validate frequency format and normalize it
    let frequencyResult;
    let normalizedFrequency;
    
    try {
        const { parseFrequencyToDosesPerDay } = require('../utils/frequencyDetection');
        console.log(`🔧 [EXTENSION] parseFrequencyToDosesPerDay function:`, typeof parseFrequencyToDosesPerDay);
        
        frequencyResult = parseFrequencyToDosesPerDay(finalFrequency);
        console.log(`🔧 [EXTENSION] parseFrequencyToDosesPerDay result:`, frequencyResult);
        
        normalizedFrequency = frequencyResult.normalizedFrequency;
        
        // Validate frequencyResult structure
        if (!frequencyResult || typeof frequencyResult !== 'object' || !frequencyResult.dosesPerDay) {
            console.error(`❌ [EXTENSION] Invalid frequencyResult structure:`, frequencyResult);
            return res.status(500).json({
                success: false,
                message: 'Invalid frequency result structure',
                error: 'Frequency parsing failed'
            });
        }
        
        // Validate normalizedFrequency
        if (!normalizedFrequency) {
            console.error(`❌ [EXTENSION] normalizedFrequency is undefined:`, normalizedFrequency);
            return res.status(500).json({
                success: false,
                message: 'Normalized frequency is undefined',
                error: 'Frequency normalization failed'
            });
        }
    } catch (error) {
        console.error(`❌ [EXTENSION] Error parsing frequency:`, error);
        return res.status(500).json({
            success: false,
            message: 'Error processing frequency',
            error: error.message
        });
    }
    
    console.log(`🔧 [EXTENSION] Frequency validation:`);
    console.log(`   - Input: "${finalFrequency}"`);
    console.log(`   - Normalized: "${normalizedFrequency}"`);
    console.log(`   - Doses per day: ${frequencyResult.dosesPerDay}`);
    
    // PRIORITY: If additionalDoses is specified, use dose-based extension
    console.log(`🔧 [PAYLOAD] Creating payload with additionalDays: ${additionalDays}, additionalDoses: ${additionalDoses}`);
    
    if (additionalDoses && additionalDoses > 0) {
      payload = { 
        additionalDoses: Number(additionalDoses),
        frequency: normalizedFrequency // Use normalized frequency
      };
      console.log(`🔧 [EXTENSION] Using DOSE-BASED extension: +${additionalDoses} doses with frequency: ${normalizedFrequency}`);
    } else if (additionalDays && additionalDays > 0) {
      payload = { 
        additionalDays: Number(additionalDays),
        frequency: normalizedFrequency // Use normalized frequency
      };
      console.log(`🔧 [EXTENSION] Using DAY-BASED extension: +${additionalDays} days with frequency: ${normalizedFrequency}`);
    } else {
      console.log(`🔧 [PAYLOAD] Both additionalDays and additionalDoses are invalid`);
      return res.status(400).json({
        success: false,
        message: 'Invalid extension parameters'
      });
    }
    
    console.log(`🔧 [PAYLOAD] Final payload:`, payload);

    // ROOT CAUSE FIX: Check if this is a multiple extension scenario
    const prescription = await Prescription.findById(prescriptionId);
    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found'
      });
    }

    // Check if prescription already has extensions (multiple extension scenario)
    const hasExistingExtensions = prescription.extensionDetails && 
                                 (prescription.extensionDetails.additionalDays > 0 || 
                                  prescription.extensionDetails.additionalDoses > 0);
    
    // ROOT CAUSE FIX: Clean up any invalid extensions before processing
    if (prescription.extensionDetails && prescription.extensionDetails.multipleExtensions) {
        const invalidExtensions = prescription.extensionDetails.multipleExtensions.filter(ext => 
            !ext.days || ext.days <= 0 || !ext.frequency
        );
        
        if (invalidExtensions.length > 0) {
            console.log(`🔧 [EXTENSION] Found ${invalidExtensions.length} invalid extensions, cleaning up...`);
            try {
                const validExtensions = prescription.extensionDetails.multipleExtensions.filter(ext => 
                    ext.days && ext.days > 0 && ext.frequency
                );
                
                await Prescription.findByIdAndUpdate(prescriptionId, {
                    $set: {
                        'extensionDetails.multipleExtensions': validExtensions
                    }
                });
                
                console.log(`✅ [EXTENSION] Cleaned up invalid extensions`);
                
                // Refresh prescription data
                const refreshedPrescription = await Prescription.findById(prescriptionId);
                if (refreshedPrescription) {
                    prescription = refreshedPrescription;
                }
            } catch (cleanupError) {
                console.error(`❌ [EXTENSION] Error cleaning up invalid extensions:`, cleanupError);
            }
        }
    }

    // ROOT CAUSE FIX: Re-check hasExistingExtensions after cleanup
    const hasValidExistingExtensions = prescription.extensionDetails && 
                                      (prescription.extensionDetails.additionalDays > 0 || 
                                       prescription.extensionDetails.additionalDoses > 0);

    if (hasValidExistingExtensions) {
      console.log(`🔧 [MULTIPLE EXTENSIONS] Detected existing extensions, using multiple extension handler`);
      
      // Use multiple extension handler for subsequent extensions
      const { handleMultipleExtensions } = require('../utils/multipleExtensionHandler');
      
      // Create extension object for the new extension
      // ROOT CAUSE FIX: Ensure additionalDays is always positive before creating extension object
      console.log(`🔧 [MULTIPLE EXTENSIONS] Creating extension object with additionalDays: ${additionalDays}, additionalDoses: ${additionalDoses}`);
      console.log(`🔧 [MULTIPLE EXTENSIONS] additionalDays type: ${typeof additionalDays}, additionalDays === 0: ${additionalDays === 0}`);
      
      console.log(`🔧 [MULTIPLE EXTENSIONS] frequencyResult:`, frequencyResult);
      console.log(`🔧 [MULTIPLE EXTENSIONS] frequencyResult.dosesPerDay:`, frequencyResult.dosesPerDay);
      
      const fallbackDays = Math.ceil(additionalDoses / frequencyResult.dosesPerDay);
      console.log(`🔧 [MULTIPLE EXTENSIONS] Fallback calculation: Math.ceil(${additionalDoses} / ${frequencyResult.dosesPerDay}) = ${fallbackDays}`);
      
      const extensionDays = additionalDays && additionalDays > 0 ? additionalDays : fallbackDays;
      console.log(`🔧 [MULTIPLE EXTENSIONS] Calculated extensionDays: ${extensionDays}`);
      console.log(`🔧 [MULTIPLE EXTENSIONS] extensionDays type: ${typeof extensionDays}, isNaN(extensionDays): ${isNaN(extensionDays)}`);
      
      if (!extensionDays || extensionDays <= 0 || isNaN(extensionDays)) {
        console.log(`🔧 [MULTIPLE EXTENSIONS] Extension days validation failed: ${extensionDays}`);
        return res.status(400).json({
          success: false,
          message: 'Invalid extension: additionalDays must be greater than 0',
          error: 'Invalid extension parameters'
        });
      }
      
      const newExtension = {
        days: extensionDays,
        frequency: normalizedFrequency,
        reason: reason || 'Additional extension'
      };
      
      console.log(`🔧 [MULTIPLE EXTENSIONS] Created extension object:`, newExtension);
      console.log(`🔧 [MULTIPLE EXTENSIONS] Extension days: ${extensionDays}, type: ${typeof extensionDays}`);
      
      // Get existing extensions from prescription
      const existingExtensions = prescription.extensionDetails.multipleExtensions || [];
      
      // ROOT CAUSE FIX: Filter out invalid extensions before processing
      const validExistingExtensions = existingExtensions.filter(ext => {
        const isValid = ext.days && ext.days > 0 && ext.frequency;
        if (!isValid) {
          console.log(`🔧 [MULTIPLE EXTENSIONS] Filtering out invalid extension:`, ext);
        }
        return isValid;
      });
      
      // Add the new extension to the list
      const allExtensions = [...validExistingExtensions, newExtension];
      
      console.log(`🔧 [MULTIPLE EXTENSIONS] Processing ${allExtensions.length} extensions (filtered from ${existingExtensions.length}):`, allExtensions);
      console.log(`🔧 [MULTIPLE EXTENSIONS] Calling handleMultipleExtensions with:`, {
        prescriptionId,
        allExtensions,
        reason: 'Multiple sequential extensions'
      });
      
      const result = await handleMultipleExtensions(prescriptionId, allExtensions, 'Multiple sequential extensions');
      
      if (result.success) {
        // ROOT CAUSE FIX: Clean up invalid extensions from the database
        if (validExistingExtensions.length < existingExtensions.length) {
          console.log(`🔧 [MULTIPLE EXTENSIONS] Cleaning up invalid extensions from database...`);
          try {
            await Prescription.findByIdAndUpdate(prescriptionId, {
              $set: {
                'extensionDetails.multipleExtensions': validExistingExtensions
              }
            });
            console.log(`✅ [MULTIPLE EXTENSIONS] Cleaned up invalid extensions`);
          } catch (cleanupError) {
            console.error(`❌ [MULTIPLE EXTENSIONS] Error cleaning up invalid extensions:`, cleanupError);
          }
        }
        
        // Calculate cost for the new extension only
        const { calculateExtensionCost } = require('../utils/extendedPrescriptionPaymentHandler');
        const updatedPrescription = await Prescription.findById(prescriptionId);
        
        const costCalculation = await calculateExtensionCost(
          updatedPrescription, 
          additionalDoses ? 0 : Number(additionalDays) || 0,
          additionalDoses ? Number(additionalDoses) : 0,
          normalizedFrequency
        );
        
        console.log(`💰 [MULTIPLE EXTENSIONS] Cost calculation:`, costCalculation);
        
        res.json({
          success: true,
          message: result.message,
          data: {
            ...result.data,
            costCalculation,
            paymentRequired: true,
            requiredAmount: costCalculation.totalExtensionCost,
            extensionType: 'multiple-sequential',
            totalExtensions: allExtensions.length
          },
          paymentRequired: true,
          requiredAmount: costCalculation.totalExtensionCost
        });
      } else {
        res.status(500).json({
          success: false,
          message: result.message,
          error: result.error
        });
      }
    } else {
      // Use the simplified extension function for first extension
      console.log(`🔧 [EXTENSION] First extension, using single extension handler`);
      const { extendMedicationPrescription } = require('../utils/medicationExtension');
      const result = await extendMedicationPrescription(prescriptionId, payload, reason);

    if (result.success) {
      // Calculate cost for the extension
      const { calculateExtensionCost } = require('../utils/extendedPrescriptionPaymentHandler');
      const prescription = await Prescription.findById(prescriptionId);
      
      // For dose-based extensions, pass the correct additional doses and frequency
      const costCalculation = await calculateExtensionCost(
        prescription, 
        additionalDoses ? 0 : Number(additionalDays) || 0, // Pass 0 days for dose-based
        additionalDoses ? Number(additionalDoses) : 0, // Pass additional doses
        normalizedFrequency // ROOT CAUSE FIX: Pass the normalized extension frequency
      );
      
      console.log(`💰 [EXTENSION] Cost calculation:`, costCalculation);
      
      // Return extension details with payment information
      res.json({
        success: true,
        message: result.message,
        data: {
          ...result.data,
          costCalculation,
          paymentRequired: true,
          requiredAmount: costCalculation.totalExtensionCost,
          extensionType: additionalDoses ? 'dose-based' : 'day-based'
        },
        paymentRequired: true,
        requiredAmount: costCalculation.totalExtensionCost
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
    } // Close the else block for single extension handler

  } catch (error) {
    console.error('Error extending prescription:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error extending prescription',
      error: error.message 
    });
  }
});

// Process payment for extended prescription
router.post('/extend/:prescriptionId/payment', auth, async (req, res) => {
  try {
    const { prescriptionId } = req.params;
    const { paymentMethod, amountPaid, notes } = req.body;

    console.log(`💳 [EXTENSION PAYMENT] Processing payment for prescription: ${prescriptionId}`);

    if (!paymentMethod || !amountPaid) {
      return res.status(400).json({
        success: false,
        message: 'Payment method and amount are required'
      });
    }

    const { processExtensionPayment } = require('../utils/extendedPrescriptionPaymentHandler');
    const result = await processExtensionPayment(prescriptionId, {
      paymentMethod,
      amountPaid: Number(amountPaid),
      notes
    });

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        data: result.data
      });
    }

  } catch (error) {
    console.error('Error processing extension payment:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error processing extension payment',
      error: error.message 
    });
  }
});

// Get extension payment details
router.get('/extend/:prescriptionId/payment-details', auth, async (req, res) => {
  try {
    const { prescriptionId } = req.params;

    const { getExtensionPaymentDetails } = require('../utils/extendedPrescriptionPaymentHandler');
    const result = await getExtensionPaymentDetails(prescriptionId);

    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }

  } catch (error) {
    console.error('Error getting extension payment details:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error getting extension payment details',
      error: error.message 
    });
  }
});

// Handle multiple extensions with different frequencies
router.post('/multiple-extend/:prescriptionId', auth, async (req, res) => {
  try {
    const { prescriptionId } = req.params;
    const { extensions, reason } = req.body;

    console.log(`🔧 Multiple extension request: ${prescriptionId}`);
    console.log(`   - Extensions:`, extensions);
    console.log(`   - Reason: ${reason || 'Not specified'}`);

    // Validate extensions array
    if (!Array.isArray(extensions) || extensions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Extensions array is required and must not be empty'
      });
    }

    // Validate each extension
    for (let i = 0; i < extensions.length; i++) {
      const extension = extensions[i];
      if (!extension.days || !extension.frequency) {
        return res.status(400).json({
          success: false,
          message: `Extension ${i + 1} is missing required fields (days, frequency)`
        });
      }
    }

    // Use the multiple extension handler
    const result = await handleMultipleExtensions(prescriptionId, extensions, reason);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }

  } catch (error) {
    console.error('Error processing multiple extensions:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error processing multiple extensions',
      error: error.message 
    });
  }
});

// Sync prescription with billing data
router.post('/sync-billing/:prescriptionId', auth, async (req, res) => {
  try {
    const { prescriptionId } = req.params;
    const { billingData } = req.body;

    console.log(`🔧 Billing sync request: ${prescriptionId}`);
    console.log(`   - Billing data:`, billingData);

    // Validate billing data
    if (!Array.isArray(billingData) || billingData.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Billing data array is required and must not be empty'
      });
    }

    // Use the billing sync handler
    const result = await syncPrescriptionWithBilling(prescriptionId, billingData);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }

  } catch (error) {
    console.error('Error syncing with billing data:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error syncing with billing data',
      error: error.message 
    });
  }
});

// Check extension eligibility - patient-specific only
router.get('/extension-eligibility/:patientId/:medicationName', auth, async (req, res) => {
  try {
    const { patientId, medicationName } = req.params;

    console.log(`🔍 Checking extension eligibility for patient ${patientId}, medication: ${medicationName}`);

    // Find extendable prescriptions ONLY for this specific patient
    // Include paid "Pending" prescriptions as they should be treated as Active
    // Handle both ObjectId and string patientId formats
    const Patient = require('../models/Patient');
    
    // First try to find the patient to get the correct ObjectId
    let patientObjectId = patientId;
    try {
      const patient = await Patient.findOne({
        $or: [
          { _id: patientId },
          { patientId: patientId }
        ]
      });
      
      if (patient) {
        patientObjectId = patient._id;
        console.log(`🔍 Found patient: ${patient.firstName} ${patient.lastName} (${patient.patientId}) with ObjectId: ${patientObjectId}`);
      } else {
        console.log(`❌ Patient not found for ID: ${patientId}`);
        return res.json({
          success: true,
          eligible: false,
          message: 'Patient not found. Extension not available.'
        });
      }
    } catch (error) {
      console.log(`⚠️ Error finding patient: ${error.message}`);
    }
    
    const activePrescriptions = await Prescription.find({
      patient: patientObjectId,
      medicationName: { $regex: new RegExp(medicationName, 'i') },
      $or: [
        { status: { $in: ['Active', 'Extended', 'active', 'extended', 'Pending', 'pending'] } },
        { status: 'Pending', paymentStatus: { $in: ['paid', 'partially_paid', 'partial'] } },
        { paymentStatus: { $in: ['paid', 'partially_paid', 'partial'] } }
      ]
    }).populate('patient', 'firstName lastName').sort({ createdAt: -1 });

    console.log(`🔍 Found ${activePrescriptions.length} prescriptions for ${medicationName}:`);
    activePrescriptions.forEach((prescription, index) => {
      console.log(`   ${index + 1}. ID: ${prescription._id}`);
      console.log(`      Status: ${prescription.status}`);
      console.log(`      Payment Status: ${prescription.paymentStatus}`);
      console.log(`      Medication: ${prescription.medicationName}`);
      console.log(`      Duration: ${prescription.duration}`);
    });

    if (!activePrescriptions || activePrescriptions.length === 0) {
      console.log(`❌ No extendable prescriptions found for this patient and medication`);
      return res.json({
        success: true,
        eligible: false,
        message: 'No existing prescriptions found for this patient and medication. Extension not available for first-time prescriptions.'
      });
    }

    const latestPrescription = activePrescriptions[0];
    const match = String(latestPrescription.duration || '').match(/(\d+)/);
    const currentDuration = match ? parseInt(match[1], 10) : 0;

    const patientName = latestPrescription.patient ? 
      `${latestPrescription.patient.firstName} ${latestPrescription.patient.lastName}` : 
      'Unknown Patient';

    console.log(`✅ Found extendable prescription for ${patientName}: ${latestPrescription._id}`);

    res.json({
      success: true,
      eligible: true,
      data: {
        prescriptionId: latestPrescription._id,
        currentDuration: currentDuration,
        medicationName: latestPrescription.medicationName,
        dosage: latestPrescription.dosage,
        frequency: latestPrescription.frequency,
        status: latestPrescription.status,
        createdDate: latestPrescription.createdAt,
        patientId: latestPrescription.patient._id,
        patientName: patientName
      },
      message: `Found extendable prescription for ${patientName}. You can extend this prescription.`
    });

  } catch (error) {
    console.error('Error checking extension eligibility:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error checking extension eligibility',
      error: error.message 
    });
  }
});

// Process extended prescription payment
router.post('/process-extension-payment/:prescriptionId', auth, async (req, res) => {
    try {
        const { prescriptionId } = req.params;
        const { paymentMethod, amountPaid, notes, sendToNurse, extensionCost, additionalDays } = req.body;

        console.log('🔧 Processing extended prescription payment:', {
            prescriptionId,
            paymentMethod,
            amountPaid,
            extensionCost,
            additionalDays,
            additionalDoses: req.body.additionalDoses
        });

        // Find the prescription
        const prescription = await Prescription.findById(prescriptionId);
        if (!prescription) {
            return res.status(404).json({
                success: false,
                error: 'Prescription not found'
            });
        }

        console.log('📋 Prescription found:', {
            medicationName: prescription.medicationName,
            frequency: prescription.frequency,
            extensionDetails: prescription.extensionDetails,
            lastExtension: prescription.lastExtension
        });

        // Find the invoice
        const invoice = await MedicalInvoice.findById(prescription.invoiceId);
        if (!invoice) {
            console.log('⚠️ No invoice found for prescription, creating payment without invoice');
            // For extended prescriptions without invoices, we can still process the payment
            // The prescription will be updated directly
        }

        // Resolve expected extension amount more robustly - ROOT CAUSE FIX: Use centralized frequency detection
        const getDosesPerDay = (frequency) => {
            const { parseFrequencyToDosesPerDay } = require('../utils/frequencyDetection');
            const frequencyResult = parseFrequencyToDosesPerDay(frequency || 'once daily');
            return frequencyResult.dosesPerDay;
        };
        const dosesPerDay = getDosesPerDay(prescription.frequency || 'once daily');
        // Align with base prescription: if no explicit additionalDoses, multiply additionalDays by dosesPerDay
        const explicitAdditionalDoses = Number(req.body.additionalDoses || 0);
        const additionalDoses = explicitAdditionalDoses > 0 ? explicitAdditionalDoses : Number(additionalDays || 0) * dosesPerDay;

        let expectedAmount = Number(extensionCost || 0);
        if (!expectedAmount) {
            try {
                const InventoryItem = require('../models/InventoryItem');
                let pricePerDose = 0;
                if (prescription.medications?.[0]?.inventoryItem) {
                    const item = await InventoryItem.findById(prescription.medications[0].inventoryItem);
                    pricePerDose = item?.sellingPrice || item?.unitPrice || 0;
                }
                if (!pricePerDose && prescription.medicationItem) {
                    const item = await InventoryItem.findById(prescription.medicationItem);
                    pricePerDose = item?.sellingPrice || item?.unitPrice || 0;
                }
                if (!pricePerDose) {
                    try {
                        const BillableItem = require('../models/BillableItem');
                        const billable = await BillableItem.findOne({ name: { $regex: new RegExp(prescription.medicationName || '', 'i') } });
                        pricePerDose = billable?.unitPrice;
                    } catch (_) {
                        pricePerDose = null; // No price found - should be handled by BillableItem lookup
                    }
                }
                expectedAmount = Math.max(0, additionalDoses * pricePerDose);
            } catch (_) {
                expectedAmount = Math.max(0, additionalDoses * (pricePerDose || 0));
            }
        }

        // Validate payment amount
        // FIXED: For extensions, allow partial payments up to the outstanding amount
        const isExtension = prescription.extensionDetails || prescription.lastExtension;
        console.log('🔍 Extension validation:', {
            isExtension,
            expectedAmount,
            additionalDoses,
            amountPaid
        });
        
        if (isExtension) {
            // For extensions, check if payment covers at least one dose
            const costPerDose = expectedAmount / additionalDoses;
            const minPaymentRequired = costPerDose; // At least one dose worth
            
            console.log('💰 Extension payment calculation:', {
                costPerDose,
                minPaymentRequired,
                dosesCovered: Math.floor(amountPaid / costPerDose)
            });
            
            if (amountPaid < minPaymentRequired) {
                return res.status(400).json({
                    success: false,
                    error: 'Payment amount is insufficient for at least one dose',
                    details: {
                        required: minPaymentRequired,
                        provided: amountPaid,
                        costPerDose,
                        additionalDoses
                    }
                });
            }
            
            console.log(`✅ Extension payment validated: ${amountPaid} ETB covers ${Math.floor(amountPaid / costPerDose)} doses`);
        } else {
            // For regular prescriptions, require full amount
            if (amountPaid < expectedAmount) {
                return res.status(400).json({
                    success: false,
                    error: 'Payment amount is insufficient for the prescription',
                    details: {
                        required: expectedAmount,
                        provided: amountPaid
                    }
                });
            }
        }

        // Ensure an invoice item exists for the extension cost so totals/balance remain consistent
        try {
            if (invoice) {
                const hasExtensionItem = (invoice.items || []).some((it) => {
                    const md = it.metadata || {};
                    return md.extension === true && String(md.extensionForPrescriptionId || '') === String(prescription._id);
                });
                
                if (!hasExtensionItem) {
                    // Add new extension item if it doesn't exist
                    invoice.items.push({
                        itemType: 'medication',
                        category: 'medication',
                        // ROOT CAUSE FIX: Include frequency and total doses in description
                        description: `Medication Extension - ${prescription.medicationName} (+${additionalDays} day${Number(additionalDays) === 1 ? '' : 's'} × ${dosesPerDay} dose${dosesPerDay === 1 ? '' : 's'}/day = ${additionalDoses} total doses)`,
                        quantity: additionalDoses,
                        unitPrice: expectedAmount / additionalDoses, // Calculate unit price based on actual doses
                        total: expectedAmount,
                        discount: 0,
                        tax: 0,
                        metadata: {
                            extension: true,
                            extensionForPrescriptionId: prescription._id,
                            additionalDays: Number(additionalDays || 0),
                            additionalDoses,
                            billingUnits: additionalDoses
                        },
                        addedAt: new Date(),
                        addedBy: req.user.id
                    });
                }
            } else {
                console.log('⚠️ No invoice to update, skipping invoice item creation');
            }
        } catch (e) {
            console.warn('⚠️ Failed to append extension item to invoice:', e?.message || e);
        }

        // Prepare payment record and compute new financials
        const payment = {
            amount: amountPaid,
            method: paymentMethod,
            date: new Date(),
            reference: `Extension payment - ${additionalDays} additional days`,
            notes: notes || `Extension payment for ${additionalDays} additional days`,
            processedBy: (req.user && (req.user._id || req.user.id)) ? (req.user._id || req.user.id) : new mongoose.Types.ObjectId('000000000000000000000000')
        };

        // FIXED: Calculate totals correctly for extension payments
        // For extensions, we need to consider the existing invoice structure
        let existingTotal = 0;
        let existingAmountPaid = 0;
        let existingBalance = 0;
        
        if (invoice) {
            existingTotal = Number(invoice.total || 0);
            existingAmountPaid = Number(invoice.amountPaid || 0);
            existingBalance = Number(invoice.balance || 0);
        }
        
        // If this is an extension payment, the expectedAmount should already be in the invoice
        // We just need to add the payment amount
        const newAmountPaid = existingAmountPaid + Number(amountPaid || 0);
        const newBalance = Math.max(0, existingTotal - newAmountPaid);
        const newStatus = newBalance <= 0 ? 'paid' : (newAmountPaid > 0 ? 'partial' : 'pending');
        const newPaymentStatus = {
            current: newBalance <= 0 ? 'fully_paid' : (newAmountPaid > 0 ? 'partially_paid' : 'unpaid'),
            percentage: existingTotal > 0 ? Math.round((newAmountPaid / existingTotal) * 100) : 0,
            lastUpdated: new Date()
        };
        
        console.log('💰 Extension payment calculation:', {
            existingTotal,
            existingAmountPaid,
            existingBalance,
            amountPaid,
            newAmountPaid,
            newBalance,
            newStatus,
            newPaymentStatus
        });

        // Build extension item (reuse object created earlier if any)
        // ROOT CAUSE FIX: Generate correct description for BID medications
        let extensionDescription;
        if (additionalDoses && additionalDoses > 0) {
            // Dose-based extension: show actual doses
            extensionDescription = `Medication Extension - ${prescription.medicationName} (+${additionalDoses} dose${additionalDoses === 1 ? '' : 's'})`;
        } else if (additionalDays && additionalDays > 0) {
            // Day-based extension: calculate and show doses based on frequency
            const totalExtensionDoses = additionalDays * dosesPerDay;
            if (dosesPerDay > 1) {
                extensionDescription = `Medication Extension - ${prescription.medicationName} (+${additionalDays} day${additionalDays === 1 ? '' : 's'} × ${dosesPerDay} doses/day = ${totalExtensionDoses} total doses)`;
            } else {
                extensionDescription = `Medication Extension - ${prescription.medicationName} (+${additionalDays} day${additionalDays === 1 ? '' : 's'})`;
            }
        } else {
            extensionDescription = `Extended Prescription - ${prescription.medicationName}`;
        }
        
        const extensionItem = {
            itemType: 'medication',
            category: 'medication',
            description: extensionDescription,
            quantity: additionalDoses || (additionalDays * dosesPerDay) || 1,
            unitPrice: expectedAmount / (additionalDoses || (additionalDays * dosesPerDay) || 1),
            total: expectedAmount,
            discount: 0,
            tax: 0,
            metadata: {
                extension: true,
                extensionForPrescriptionId: prescription._id,
                additionalDays: Number(additionalDays || 0),
                additionalDoses: additionalDoses || (additionalDays * dosesPerDay),
                totalDoses: additionalDoses || (additionalDays * dosesPerDay),
                dosesPerDay: dosesPerDay,
                frequency: prescription.frequency
            },
            addedAt: new Date(),
            addedBy: req.user.id
        };

        let updatedInvoice = null;
        let hasExtensionItem = false;
        
        if (invoice) {
            // Check if extension item already exists
            hasExtensionItem = (invoice.items || []).some((it) => {
                const md = it.metadata || {};
                return md.extension === true && String(md.extensionForPrescriptionId || '') === String(prescription._id);
            });
            
            // Apply atomic update without validators to avoid legacy item validation failures
            // FIXED: For extensions, only add payment and update totals, don't duplicate items
            const updateData = {
                $push: { payments: payment },
                $set: {
                    amountPaid: newAmountPaid,
                    balance: newBalance,
                    status: newStatus,
                    paymentStatus: newPaymentStatus,
                    lastUpdated: new Date()
                }
            };
            
            // Only add extension item if it doesn't already exist
            if (!hasExtensionItem) {
                updateData.$push.items = extensionItem;
            }
            
            console.log('🔄 Updating invoice with data:', updateData);
            
            await MedicalInvoice.updateOne(
                { _id: invoice._id },
                updateData,
                { runValidators: false }
            );

            // Refresh invoice document for downstream logic
            updatedInvoice = await MedicalInvoice.findById(invoice._id);
        } else {
            console.log('⚠️ No invoice to update, skipping invoice update');
        }

        // Map invoice payment status to prescription allowed values
        const mapInvoiceToPrescription = (s) => (s === 'fully_paid' ? 'paid' : s === 'partially_paid' ? 'partial' : 'pending');
        prescription.paymentStatus = mapInvoiceToPrescription(updatedInvoice?.paymentStatus?.current || 'unpaid');
        await prescription.save();

        // Update nurse task paymentAuthorization for both partial and full cases
        const nurseTask = await NurseTask.findOne({
            prescriptionId: prescriptionId,
            taskType: 'MEDICATION'
        });
        if (nurseTask) {
            nurseTask.paymentAuthorization = nurseTask.paymentAuthorization || {};
            // Compute totals from the actual schedule so UI numbers are consistent
            const scheduleCount = Array.isArray(nurseTask.medicationDetails?.doseRecords)
              ? nurseTask.medicationDetails.doseRecords.length
              : 0;
            const dosesPerDayForTask = (() => {
              const f = String(nurseTask.medicationDetails?.frequency || prescription.frequency || '').toLowerCase();
              if (f.includes('four') || f.includes('qid') || f.includes('4x')) return 4;
              if (f.includes('three') || f.includes('tid') || f.includes('thrice') || f.includes('3x')) return 3;
              if (f.includes('twice') || f.includes('bid') || f.includes('2x')) return 2;
              return 1;
            })();
            const totalDaysForTask = Math.max(1, Math.ceil(scheduleCount / dosesPerDayForTask));

            if ((updatedInvoice?.balance || 0) <= 0) {
                nurseTask.paymentAuthorization.paymentStatus = 'fully_paid';
                nurseTask.paymentAuthorization.canAdminister = true;
                nurseTask.paymentAuthorization.outstandingAmount = 0;
                // Critical: reflect full authorization in doses/days so UI shows X paid of X
                nurseTask.paymentAuthorization.authorizedDoses = scheduleCount;
                nurseTask.paymentAuthorization.unauthorizedDoses = 0;
                nurseTask.paymentAuthorization.paidDays = totalDaysForTask;
                nurseTask.paymentAuthorization.totalDays = totalDaysForTask;
            } else {
                nurseTask.paymentAuthorization.paymentStatus = 'partial';
                nurseTask.paymentAuthorization.canAdminister = false;
                nurseTask.paymentAuthorization.outstandingAmount = updatedInvoice?.balance || newBalance;
                const totalDoses = scheduleCount;
                const originalDoses = Math.max(0, totalDoses - additionalDoses);
                nurseTask.paymentAuthorization.authorizedDoses = originalDoses;
                nurseTask.paymentAuthorization.unauthorizedDoses = additionalDoses;
                nurseTask.paymentAuthorization.paidDays = Math.max(0, Math.ceil(originalDoses / dosesPerDayForTask));
                nurseTask.paymentAuthorization.totalDays = totalDaysForTask;
            }
            nurseTask.paymentAuthorization.lastUpdated = new Date();
            await nurseTask.save();
        }

        // Create success notification
        const successNotification = new Notification({
            type: 'info',
            title: 'Extension Payment Successful',
            message: `Payment of ETB ${amountPaid} received for ${additionalDays} additional days of ${prescription.medicationName} treatment.`,
            recipientId: prescription.patientId,
            recipientRole: 'patient',
            senderId: req.user.id,
            senderRole: req.user.role,
            priority: 'medium',
            data: {
                prescriptionId: prescriptionId,
                invoiceId: invoice._id,
                amountPaid: amountPaid,
                additionalDays: additionalDays,
                medicationName: prescription.medicationName
            },
            read: false
        });

        await successNotification.save();

        // Update reception notification state based on remaining balance
        try {
            if ((updatedInvoice?.balance || 0) <= 0) {
                await Notification.updateMany(
                    { type: 'medication_payment_required', 'data.prescriptionId': prescription._id, recipientRole: 'reception', read: false },
                    { $set: { read: true, 'data.paymentStatus': 'paid', 'data.paidAt': new Date() } }
                );
            } else {
                await Notification.updateMany(
                    { type: 'medication_payment_required', 'data.prescriptionId': prescription._id, recipientRole: 'reception' },
                    { $set: { read: false, 'data.paymentStatus': 'partial', 'data.outstandingAmount': (updatedInvoice && updatedInvoice.balance !== undefined) ? updatedInvoice.balance : (invoice ? invoice.balance : newBalance), timestamp: new Date() } }
                );
                
                // Also update individual medication amounts to reflect the current amount due
                const notifications = await Notification.find({
                    type: 'medication_payment_required', 
                    'data.prescriptionId': prescription._id, 
                    recipientRole: 'reception'
                });
                
                for (const notification of notifications) {
                    if (notification.data?.medications && notification.data.medications.length > 0) {
                        const totalOriginalAmount = notification.data.medications.reduce((sum, med) => sum + (med.totalPrice || 0), 0);
                        const remainingAmount = (updatedInvoice && updatedInvoice.balance !== undefined) ? updatedInvoice.balance : (invoice ? invoice.balance : newBalance);
                        
                        if (totalOriginalAmount > 0 && remainingAmount !== totalOriginalAmount) {
                            // Calculate proportional amounts for each medication
                            const updatedMedications = notification.data.medications.map(med => {
                                const originalPrice = med.totalPrice || med.price || 0;
                                const proportion = totalOriginalAmount > 0 ? originalPrice / totalOriginalAmount : 0;
                                const currentAmount = remainingAmount * proportion;
                                
                                return {
                                    ...med,
                                    totalPrice: currentAmount,
                                    price: currentAmount
                                };
                            });
                            
                            // Update the notification with corrected medication amounts
                            await Notification.findByIdAndUpdate(notification._id, {
                                $set: {
                                    'data.medications': updatedMedications
                                }
                            });
                        }
                    }
                }
            }
        } catch (e) {
            console.warn('⚠️ Failed to update reception notification state:', e?.message || e);
        }

        console.log('✅ Extended prescription payment processed successfully');

        res.json({
            success: true,
            message: 'Extension payment processed successfully',
            data: {
                prescription: prescription,
                invoice: updatedInvoice || invoice,
                payment: payment,
                remainingBalance: (updatedInvoice && updatedInvoice.balance !== undefined) ? updatedInvoice.balance : (invoice ? invoice.balance : 0)
            }
        });

    } catch (error) {
        console.error('❌ Error processing extended prescription payment:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process extension payment',
            details: error.message
        });
    }
});

// GET extension payment details for a prescription
router.get('/:id/extension-payment-details', auth, async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`🔍 [ROUTE] Getting extension payment details for prescription: ${id}`);
        
        const result = await getExtensionPaymentDetails(id);
        
        if (result.success) {
            console.log(`✅ [ROUTE] Successfully retrieved extension payment details for prescription: ${id}`);
            res.json(result);
        } else {
            console.log(`❌ [ROUTE] Failed to get extension payment details: ${result.message}`);
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('❌ [ROUTE] Error getting extension payment details:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// TEMPORARY: Fix Natan Kinfe's BID medication extension invoice
router.post('/fix-natan-invoice', auth, async (req, res) => {
  try {
    console.log('🔧 Fixing Natan Kinfe\'s BID medication extension invoice...');
    
    // Find the specific invoice by invoice number
    const invoice = await MedicalInvoice.findOne({
      invoiceNumber: 'INV-EXT-1756132268415-ibriy'
    });
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice INV-EXT-1756132268415-ibriy not found'
      });
    }
    
    console.log(`📄 Found invoice: ${invoice.invoiceNumber}`);
    console.log(`   Current Status: ${invoice.status}`);
    console.log(`   Current Total: ${invoice.total} ETB`);
    console.log(`   Current Balance: ${invoice.balance} ETB`);
    
    if (invoice.items && invoice.items.length > 0) {
      const item = invoice.items[0];
      console.log(`\n🔍 Current Item Details:`);
      console.log(`   Description: ${item.description}`);
      console.log(`   Quantity: ${item.quantity}`);
      console.log(`   Unit Price: ${item.unitPrice} ETB`);
      console.log(`   Total: ${item.total} ETB`);
      
      // Check if this is the problematic invoice (3 doses instead of 6 for BID)
      if (item.quantity === 3 && item.total === 900) {
        console.log(`\n🎯 CONFIRMED: This is the invoice with incorrect BID calculation!`);
        console.log(`   Expected: 6 doses (3 days × 2 doses/day) for BID medication`);
        console.log(`   Actual: 3 doses (calculated as QD instead of BID)`);
        
        // Fix the calculation for BID (twice daily)
        const correctQuantity = 6; // 3 days × 2 doses/day
        const correctTotal = correctQuantity * item.unitPrice; // 6 × 300 = 1800 ETB
        const correctDescription = `Medication Extension - Dexamethasone (+3 days × 2 doses/day = 6 total doses)`;
        
        console.log(`\n🔧 Fixing calculation:`);
        console.log(`   Quantity: ${item.quantity} → ${correctQuantity}`);
        console.log(`   Total: ${item.total} ETB → ${correctTotal} ETB`);
        console.log(`   Description: ${item.description} → ${correctDescription}`);
        
        // Update the invoice item
        item.quantity = correctQuantity;
        item.total = correctTotal;
        item.description = correctDescription;
        
        // Update metadata
        if (item.metadata) {
          item.metadata.additionalDoses = correctQuantity;
          item.metadata.totalDoses = correctQuantity;
          item.metadata.dosesPerDay = 2; // BID
          item.metadata.frequency = 'BID (twice daily)';
        }
        
        // Recalculate invoice totals
        const newSubtotal = invoice.items.reduce((sum, item) => sum + item.total, 0);
        const newTotal = newSubtotal;
        const newBalance = newTotal - (invoice.amountPaid || 0);
        
        invoice.subtotal = newSubtotal;
        invoice.total = newTotal;
        invoice.balance = newBalance;
        invoice.status = newBalance <= 0 ? 'paid' : (invoice.amountPaid > 0 ? 'partial' : 'pending');
        
        // Update extension details if they exist
        if (invoice.extensionDetails) {
          invoice.extensionDetails.explicitAdditionalDoses = correctQuantity;
          invoice.extensionDetails.totalDoses = correctQuantity;
          invoice.extensionDetails.dosesPerDay = 2;
          invoice.extensionDetails.frequency = 'BID (twice daily)';
          invoice.extensionDetails.extensionType = 'dose-based';
        }
        
        // Save the updated invoice
        await invoice.save();
        
        console.log(`\n✅ Invoice fixed successfully!`);
        console.log(`   New total: ${invoice.total} ETB`);
        console.log(`   New balance: ${invoice.balance} ETB`);
        console.log(`   New status: ${invoice.status}`);
        
        return res.json({
          success: true,
          message: 'Invoice fixed successfully',
          data: {
            invoiceNumber: invoice.invoiceNumber,
            oldQuantity: 3,
            newQuantity: correctQuantity,
            oldTotal: 900,
            newTotal: correctTotal,
            oldDescription: "Medication Extension - Dexamethasone (+3 days × 1 dose/day = 3 total doses)",
            newDescription: correctDescription,
            newBalance: invoice.balance,
            newStatus: invoice.status
          }
        });
        
      } else {
        console.log(`\nℹ️ This invoice doesn't match the expected pattern for the BID calculation issue.`);
        console.log(`   Expected: 3 doses, 900 ETB total`);
        console.log(`   Actual: ${item.quantity} doses, ${item.total} ETB total`);
        
        return res.status(400).json({
          success: false,
          message: 'Invoice doesn\'t match the expected pattern for BID calculation issue',
          data: {
            currentQuantity: item.quantity,
            currentTotal: item.total,
            expectedQuantity: 3,
            expectedTotal: 900
          }
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invoice has no items'
      });
    }
    
  } catch (error) {
    console.error('❌ Error fixing invoice:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fixing invoice',
      error: error.message 
    });
  }
});

// Update prescription frequency
router.put('/:prescriptionId/frequency', auth, async (req, res) => {
  try {
    const { prescriptionId } = req.params;
    const { frequency } = req.body;

    console.log(`🔧 [FREQUENCY UPDATE] Updating frequency for prescription: ${prescriptionId}`);
    console.log(`🔧 [FREQUENCY UPDATE] New frequency: ${frequency}`);

    // Validate frequency
    const validFrequencies = [
      'QD (once daily)',
      'BID (twice daily)',
      'TID (three times daily)',
      'QID (four times daily)',
      'Once daily (QD)',
      'Twice daily (BID)',
      'Three times daily (TID)',
      'Four times daily (QID)'
    ];

    if (!validFrequencies.includes(frequency)) {
      return res.status(400).json({
        success: false,
        message: `Invalid frequency. Must be one of: ${validFrequencies.join(', ')}`
      });
    }

    // Find the prescription
    const prescription = await Prescription.findById(prescriptionId);
    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found'
      });
    }

    // Check if user has permission to update this prescription
    if (prescription.doctor.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this prescription'
      });
    }

    // Update the frequency
    const oldFrequency = prescription.frequency;
    prescription.frequency = frequency;
    
    // Also update frequency in medications array if it exists
    if (prescription.medications && prescription.medications.length > 0) {
      prescription.medications.forEach(med => {
        med.frequency = frequency;
      });
    }

    // Update dosesPerDay based on new frequency
    const { parseFrequencyToDosesPerDay } = require('../utils/frequencyDetection');
    const frequencyResult = parseFrequencyToDosesPerDay(frequency);
    prescription.dosesPerDay = frequencyResult.dosesPerDay;

    await prescription.save();

    console.log(`✅ [FREQUENCY UPDATE] Successfully updated frequency from "${oldFrequency}" to "${frequency}"`);

    res.json({
      success: true,
      message: `Frequency updated from ${oldFrequency} to ${frequency}`,
      data: {
        prescriptionId: prescription._id,
        oldFrequency,
        newFrequency: frequency,
        dosesPerDay: frequencyResult.dosesPerDay
      }
    });

  } catch (error) {
    console.error('Error updating prescription frequency:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating prescription frequency',
      error: error.message
    });
  }
});

// DEBUG: Get latest prescription and invoice for a patient
router.get('/debug/prescription-latest/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    // Find the latest prescription for this patient
    const prescription = await Prescription.findOne({ patient: patientId }).sort({ createdAt: -1 });
    if (!prescription) {
      return res.status(404).json({ error: 'No prescription found for this patient.' });
    }
    // Find the invoice for this prescription
    const invoice = await MedicalInvoice.findOne({ 'items.metadata.prescriptionId': prescription._id });
    
    // CRITICAL FIX: Verify individual medication durations
    const medicationDurations = prescription.medications.map(med => ({
      name: med.name,
      duration: med.duration,
      frequency: med.frequency
    }));
    
    const invoiceItemDurations = invoice ? invoice.items.map(item => ({
      description: item.description,
      duration: item.metadata?.duration,
      frequency: item.metadata?.frequency
    })) : [];
    
    res.json({
      prescription: {
        _id: prescription._id,
        medicationName: prescription.medicationName,
        duration: prescription.duration,
        medications: medicationDurations
      },
      invoice: invoice ? {
        _id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        total: invoice.total,
        items: invoiceItemDurations
      } : null,
      verification: {
        prescriptionMedicationCount: prescription.medications.length,
        invoiceItemCount: invoice ? invoice.items.length : 0,
        durationsMatch: medicationDurations.every(med => 
          invoiceItemDurations.some(item => 
            item.duration === med.duration && item.frequency === med.frequency
          )
        )
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 

