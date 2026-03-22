const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middleware/auth');
const {
  syncPaidMedicationsWithNurseTasks,
  findAndFixOrphanedPaidMedications,
  processMedicationPaymentWithNurseTaskGuarantee,
  createNurseTaskForPaidMedication
} = require('../utils/medicationNurseTaskSync');
const Prescription = require('../models/Prescription');
const NurseTask = require('../models/NurseTask');
const User = require('../models/User');
const Patient = require('../models/Patient');

// @route   POST /api/medication-nurse-sync/sync-all
// @desc    Synchronize all paid medications with nurse tasks
// @access  Private (Admin/Nurse)
router.post('/sync-all', auth, checkRole(['admin', 'nurse', 'doctor']), async (req, res) => {
  try {
    console.log(`🔄 [SYNC API] Starting complete medication-nurse task synchronization...`);
    
    const results = await syncPaidMedicationsWithNurseTasks();
    
    res.json({
      success: true,
      message: `Synchronization completed: ${results.tasksCreated} tasks created, ${results.tasksSkipped} skipped, ${results.errors} errors`,
      data: results
    });
    
  } catch (error) {
    console.error('❌ [SYNC API] Error in sync-all:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to synchronize medications with nurse tasks',
      error: error.message
    });
  }
});

// @route   POST /api/medication-nurse-sync/find-orphaned
// @desc    Find and fix paid medications without nurse tasks
// @access  Private (Admin/Nurse)
router.post('/find-orphaned', auth, checkRole(['admin', 'nurse', 'doctor']), async (req, res) => {
  try {
    console.log(`🔍 [SYNC API] Finding orphaned paid medications...`);
    
    const results = await findAndFixOrphanedPaidMedications();
    
    res.json({
      success: true,
      message: `Found ${results.orphanedMedications} orphaned medications, fixed ${results.fixed}, ${results.errors} errors`,
      data: results
    });
    
  } catch (error) {
    console.error('❌ [SYNC API] Error in find-orphaned:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to find orphaned medications',
      error: error.message
    });
  }
});

// @route   POST /api/medication-nurse-sync/process-payment/:prescriptionId
// @desc    Process a medication payment and guarantee nurse task creation
// @access  Private
router.post('/process-payment/:prescriptionId', auth, async (req, res) => {
  try {
    const { prescriptionId } = req.params;
    const paymentDetails = req.body;
    
    console.log(`💰 [SYNC API] Processing payment guarantee for prescription: ${prescriptionId}`);
    
    const result = await processMedicationPaymentWithNurseTaskGuarantee(prescriptionId, paymentDetails);
    
    if (result.success) {
      res.json({
        success: true,
        message: `Payment processed and nurse task ${result.created ? 'created' : 'confirmed'}`,
        data: result
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.reason || result.error || 'Failed to process payment guarantee',
        data: result
      });
    }
    
  } catch (error) {
    console.error('❌ [SYNC API] Error in process-payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process payment with nurse task guarantee',
      error: error.message
    });
  }
});

// @route   POST /api/medication-nurse-sync/create-task/:prescriptionId
// @desc    Manually create nurse task for a specific paid prescription
// @access  Private
router.post('/create-task/:prescriptionId', auth, async (req, res) => {
  try {
    const { prescriptionId } = req.params;
    
    console.log(`🏥 [SYNC API] Manually creating nurse task for prescription: ${prescriptionId}`);
    
    // Find the prescription
    const prescription = await Prescription.findById(prescriptionId).populate('patient');
    
    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found'
      });
    }
    
    const result = await createNurseTaskForPaidMedication(prescription);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.created ? 'Nurse task created successfully' : 'Nurse task already exists',
        data: result
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to create nurse task',
        data: result
      });
    }
    
  } catch (error) {
    console.error('❌ [SYNC API] Error in create-task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create nurse task',
      error: error.message
    });
  }
});

// @route   GET /api/medication-nurse-sync/status
// @desc    Get synchronization status for all paid medications
// @access  Private
router.get('/status', auth, async (req, res) => {
  try {
    console.log(`📊 [SYNC API] Getting synchronization status...`);
    
    const NurseTask = require('../models/NurseTask');
    
    // Get basic statistics
    const totalPaidPrescriptions = await Prescription.countDocuments({
      paymentStatus: { $in: ['paid', 'fully_paid'] }
    });
    
    const totalMedicationTasks = await NurseTask.countDocuments({
      taskType: 'MEDICATION'
    });
    
    const pendingMedicationTasks = await NurseTask.countDocuments({
      taskType: 'MEDICATION',
      status: 'PENDING'
    });
    
    // Get recent activity
    const recentTasks = await NurseTask.find({
      taskType: 'MEDICATION',
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    }).sort({ createdAt: -1 }).limit(10);
    
    res.json({
      success: true,
      data: {
        totalPaidPrescriptions,
        totalMedicationTasks,
        pendingMedicationTasks,
        recentTasks: recentTasks.map(task => ({
          id: task._id,
          patientName: task.patientName,
          medicationName: task.medicationDetails?.medicationName,
          status: task.status,
          createdAt: task.createdAt
        }))
      }
    });
    
  } catch (error) {
    console.error('❌ [SYNC API] Error in status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get synchronization status',
      error: error.message
    });
  }
});

// ----------------------------------------------
// Create missing invoices for existing prescriptions
// ----------------------------------------------
router.post('/create-missing-invoices', auth, checkRole(['admin', 'nurse', 'doctor']), async (req, res) => {
  try {
    const Prescription = require('../models/Prescription');
    const MedicalInvoice = require('../models/MedicalInvoice');
    const Patient = require('../models/Patient');

    // Find prescriptions without invoices
    const prescriptions = await Prescription.find({}).populate('patient', 'firstName lastName');
    const invoicePromises = [];
    let created = 0;

    for (const prescription of prescriptions) {
      // Check if invoice already exists
      const existingInvoice = await MedicalInvoice.findOne({ prescriptionId: prescription._id });
      if (existingInvoice) continue;

      // Calculate prescription details
      const durationMatch = (prescription.duration || '1 day').match(/(\d+)\s*(day|days)/i);
      const durationDays = durationMatch ? parseInt(durationMatch[1]) : 1;
      const freq = (prescription.frequency || '').toLowerCase();
      let frequencyPerDay = 1;
      if (freq.includes('four') || freq.includes('qid')) frequencyPerDay = 4;
      else if (freq.includes('three') || freq.includes('tid')) frequencyPerDay = 3;
      else if (freq.includes('twice') || freq.includes('bid')) frequencyPerDay = 2;
      else if (freq.includes('once') || freq.includes('daily') || freq.includes('qd')) frequencyPerDay = 1;

      const totalDoses = durationDays * frequencyPerDay;
      const costPerDose = 50; // Default cost
      const totalCost = totalDoses * costPerDose;

      const generateInvoiceNumber = () => {
        const randomSuffix = Math.floor(100 + Math.random() * 900);
        return `PRES-${Date.now()}-${randomSuffix}`;
      };

      const patientName = `${prescription.patient?.firstName || ''} ${prescription.patient?.lastName || ''}`.trim() || 'Unknown Patient';

      // Build invoice items with medicationName and prescriptionId to support lookups
      const items = [{
        itemType: 'medication',
        category: 'medication',
        description: `Medication: ${prescription.medicationName} (${totalDoses} doses)`,
        quantity: totalDoses,
        unitPrice: costPerDose,
        total: totalCost,
        medicationName: prescription.medicationName,
        prescriptionId: prescription._id
      }];

      const invoiceDate = prescription.createdAt || new Date();
      const dueDate = new Date(invoiceDate.getTime() + 26 * 24 * 60 * 60 * 1000);

      const invoiceData = {
        // Required identity fields
        patient: prescription.patient?._id || prescription.patient,
        patientId: prescription.patient?._id || prescription.patient,
        patientName: patientName,
        provider: prescription.doctor || req.user?._id,

        // Core invoice meta
        invoiceNumber: generateInvoiceNumber(),
        invoiceDate: invoiceDate,
        dueDate: dueDate,

        // Line items
        items: items,

        // Totals (support models that expect either total or totalAmount)
        total: totalCost,
        totalAmount: totalCost,
        subtotal: totalCost,
        taxTotal: 0,
        discountTotal: 0,

        // Balances
        amountPaid: prescription.paymentStatus === 'paid' ? totalCost : 0,
        balance: prescription.paymentStatus === 'paid' ? 0 : totalCost,
        status: prescription.paymentStatus === 'paid' ? 'paid' : 'pending',

        // Links
        prescriptionId: prescription._id,
        createdBy: prescription.doctor || req.user?._id,
        updatedAt: new Date()
      };

      // If prescription is marked as paid, add a payment record
      if (prescription.paymentStatus === 'paid') {
        invoiceData.payments = [{
          amount: totalCost,
          method: prescription.paymentMethod || 'cash',
          date: prescription.paidAt || new Date(),
          reference: `BACKFILL-${prescription._id}`,
          notes: 'Backfilled payment for existing paid prescription',
          processedBy: req.user?._id || req.user?.id || prescription.doctor
        }];
      }

      invoicePromises.push(MedicalInvoice.create(invoiceData));
      created++;
    }

    await Promise.all(invoicePromises);

    res.json({
      success: true,
      message: `Created ${created} missing invoices for existing prescriptions`,
      created
    });

  } catch (error) {
    console.error('❌ Error creating missing invoices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create missing invoices',
      error: error.message
    });
  }
});

module.exports = router;

// ----------------------------------------------
// Legacy backfill: fix existing tasks missing critical fields
// ----------------------------------------------
router.post('/backfill-legacy', auth, checkRole(['admin', 'nurse', 'doctor']), async (req, res) => {
  try {
    console.log('🧩 [BACKFILL] Starting legacy nurse task backfill...');
    const query = { taskType: 'MEDICATION' };
    const tasks = await NurseTask.find(query).limit(2000);

    let updated = 0;
    for (const task of tasks) {
      let changed = false;

      // 1) Ensure root-level prescriptionId exists
      if (!task.prescriptionId && task.medicationDetails?.prescriptionId) {
        task.prescriptionId = task.medicationDetails.prescriptionId;
        changed = true;
      }
      // Also ensure medicationDetails.prescriptionId exists if root-level is present
      if (task.prescriptionId && (!task.medicationDetails || !task.medicationDetails.prescriptionId)) {
        task.medicationDetails = task.medicationDetails || {};
        task.medicationDetails.prescriptionId = task.prescriptionId.toString();
        changed = true;
      }

      // 2) Ensure assignedBy set
      if (!task.assignedBy) {
        let doctorId = null;
        try {
          // Try from prescription
          if (task.prescriptionId) {
            const pres = await Prescription.findById(task.prescriptionId);
            if (pres) doctorId = pres.doctor || pres.doctorId || null;
          }
          // Fallback: patient.assignedDoctorId
          if (!doctorId && task.patientId) {
            const patient = await Patient.findById(task.patientId);
            if (patient) doctorId = patient.assignedDoctorId || null;
          }
          // Fallback: any doctor user
          if (!doctorId) {
            const anyDoc = await User.findOne({ role: 'doctor' }).select('_id');
            doctorId = anyDoc ? anyDoc._id : null;
          }
        } catch (e) {
          console.warn('⚠️ [BACKFILL] assignedBy resolution error:', e.message);
        }

        if (doctorId) {
          task.assignedBy = doctorId;
          changed = true;
        }
      }

      // 3) Ensure paymentAuthorization set (basic inference)
      if (!task.paymentAuthorization) {
        let paymentStatus = 'unpaid';
        try {
          if (task.prescriptionId) {
            const pres = await Prescription.findById(task.prescriptionId);
            if (pres && pres.paymentStatus) paymentStatus = pres.paymentStatus;
          }
        } catch {}
        task.paymentAuthorization = {
          paymentStatus: ['paid', 'fully_paid'].includes((paymentStatus || '').toLowerCase()) ? 'fully_paid'
                        : ['partial', 'partially_paid'].includes((paymentStatus || '').toLowerCase()) ? 'partially_paid'
                        : 'unpaid',
          canAdminister: ['paid', 'fully_paid'].includes((paymentStatus || '').toLowerCase()),
          totalDays: task.medicationDetails?.duration || 7,
          paidDays: undefined,
          authorizedDoses: undefined,
          unauthorizedDoses: undefined,
          outstandingAmount: undefined,
          lastUpdated: new Date()
        };
        // mirror inside medicationDetails for consistency
        if (task.medicationDetails) task.medicationDetails.paymentAuthorization = task.paymentAuthorization;
        changed = true;
      }

      if (changed) {
        try {
          await task.save();
          updated++;
        } catch (e) {
          console.error('❌ [BACKFILL] Save failed for task', task._id, e.message);
        }
      }
    }

    console.log(`✅ [BACKFILL] Completed. Updated ${updated}/${tasks.length} tasks.`);
    res.json({ success: true, updated, total: tasks.length });
  } catch (error) {
    console.error('❌ [BACKFILL] Error:', error);
    res.status(500).json({ success: false, message: 'Backfill failed', error: error.message });
  }
});
