const express = require('express');
const router = express.Router();
const NurseTask = require('../models/NurseTask');
const Prescription = require('../models/Prescription');
// v12b

/**
 * Get doses per day based on frequency
 */
function getDosesPerDay(frequency) {
    if (!frequency) return 1;
    
    const f = frequency.toLowerCase();
    if (f.includes('four') || f.includes('qid') || f.includes('4x')) return 4;
    if (f.includes('three') || f.includes('tid') || f.includes('thrice') || f.includes('3x')) return 3;
    if (f.includes('twice') || f.includes('bid') || f.includes('2x')) return 2;
    return 1; // Default to once daily (QD)
}

/**
 * Generate dose records for medication period
 */
function generateDoseRecords(frequency, totalDoses, startDate = new Date()) {
  const dosesPerDay = getDosesPerDay(frequency);
  const doseRecords = [];
  const timeSlotsMap = {
    1: ['09:00'], // QD
    2: ['09:00', '21:00'], // BID
    3: ['09:00', '15:00', '21:00'], // TID
    4: ['06:00', '12:00', '18:00', '00:00'] // QID
  };
  const slots = timeSlotsMap[dosesPerDay] || ['09:00'];

  for (let i = 0; i < totalDoses; i++) {
    const doseIndexInDay = i % dosesPerDay;
    const day = Math.floor(i / dosesPerDay) + 1;
    const timeSlot = slots[doseIndexInDay];

    doseRecords.push({
      day: day,
      timeSlot: timeSlot,
      administered: false,
      administeredAt: null,
      administeredBy: null,
      notes: ''
    });
  }
  return doseRecords;
}

// Fix nurse task extension frequency display
router.post('/fix-extension-frequency', async (req, res) => {
  try {
    console.log('🔧 Starting nurse task extension frequency fix...');
    
    // Find all medication nurse tasks with extensions
    const nurseTasks = await NurseTask.find({
      taskType: 'MEDICATION',
      'medicationDetails.isExtension': true
    }).populate('prescriptionId');
    
    console.log(`📋 Found ${nurseTasks.length} extension medication nurse tasks`);
    
    let fixedCount = 0;
    const fixedTasks = [];
    
    for (const task of nurseTasks) {
      try {
        const prescription = task.prescriptionId;
        if (!prescription || !prescription.extensionDetails) continue;

        const extensionFrequency = prescription.extensionDetails?.frequency;
        const currentFrequency = task.medicationDetails?.frequency;
        
        if (!extensionFrequency || extensionFrequency === currentFrequency) continue;

        console.log(`🔧 Fixing task for ${prescription.medicationName}: ${currentFrequency} → ${extensionFrequency}`);

        // Update the task with extension frequency
        await NurseTask.updateOne(
          { _id: task._id },
          {
            $set: {
              'medicationDetails.frequency': extensionFrequency,
              'medicationDetails.extensionDetails.frequency': extensionFrequency
            }
          }
        );

        fixedTasks.push({
          taskId: task._id,
          medicationName: prescription.medicationName,
          oldFrequency: currentFrequency,
          newFrequency: extensionFrequency
        });

        fixedCount++;
      } catch (error) {
        console.error(`Error fixing task ${task._id}:`, error.message);
      }
    }
    
    res.json({
      success: true,
      message: `Successfully fixed ${fixedCount} nurse task frequencies`,
      totalChecked: nurseTasks.length,
      fixed: fixedCount,
      fixedTasks: fixedTasks
    });
    
  } catch (error) {
    console.error('Error fixing nurse task frequencies:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fix nurse task frequencies',
      details: error.message
    });
  }
});

// Fix nurse task dose calculations
router.post('/fix-doses', async (req, res) => {
  try {
    console.log('🔧 Starting nurse task dose fix...');
    
    // Find all medication nurse tasks
    const nurseTasks = await NurseTask.find({
      taskType: 'MEDICATION'
    }).populate('prescriptionId');
    
    console.log(`📋 Found ${nurseTasks.length} medication nurse tasks`);
    
    let fixedCount = 0;
    const fixedTasks = [];
    
    for (const task of nurseTasks) {
      try {
        const prescription = task.prescriptionId;
        if (!prescription) continue;

        const frequency = prescription.frequency || task.medicationDetails?.frequency || 'once daily';
        const extensionDetails = prescription.extensionDetails;
        
        if (!extensionDetails || !extensionDetails.additionalDays) continue;

        const additionalDays = extensionDetails.additionalDays;
        const dosesPerDay = getDosesPerDay(frequency);
        const correctTotalDoses = dosesPerDay * additionalDays;
        
        const currentDoseRecords = task.medicationDetails?.doseRecords || [];
        const currentTotalDoses = currentDoseRecords.length;

        if (currentTotalDoses === correctTotalDoses) continue;

        console.log(`🔧 Fixing task for ${prescription.medicationName}: ${frequency} (${dosesPerDay} doses/day) × ${additionalDays} days = ${correctTotalDoses} doses`);

        // Generate correct dose records
        const newDoseRecords = generateDoseRecords(frequency, correctTotalDoses);

        // Update the task
        await NurseTask.updateOne(
          { _id: task._id },
          {
            $set: {
              'medicationDetails.doseRecords': newDoseRecords,
              'medicationDetails.duration': additionalDays
            }
          }
        );

        fixedTasks.push({
          taskId: task._id,
          medicationName: prescription.medicationName,
          frequency: frequency,
          dosesPerDay: dosesPerDay,
          additionalDays: additionalDays,
          oldDoses: currentTotalDoses,
          newDoses: correctTotalDoses
        });

        fixedCount++;
      } catch (error) {
        console.error(`Error fixing task ${task._id}:`, error.message);
      }
    }
    
    res.json({
      success: true,
      message: `Successfully fixed ${fixedCount} nurse tasks`,
      totalChecked: nurseTasks.length,
      fixed: fixedCount,
      fixedTasks: fixedTasks
    });
    
  } catch (error) {
    console.error('Error fixing nurse tasks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fix nurse tasks',
      details: error.message
    });
  }
});

// Fix nurse task dose records for a specific patient by rebuilding from prescriptions
// POST /api/fix-nurse-tasks/fix-patient-doses  { patientId, medicationName (optional) }
router.post('/fix-patient-doses', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const { patientId, medicationName } = req.body;
    if (!patientId) {
      return res.status(400).json({ success: false, error: 'patientId is required' });
    }

    console.log(`🔧 [FIX PATIENT DOSES] Fixing doses for patient ${patientId}${medicationName ? `, medication: ${medicationName}` : ''}`);

    // Normalize a medication name for fuzzy comparison: lowercase, remove spaces/punctuation, deduplicate consecutive chars
    const normalizeMedName = (name) => {
      if (!name) return '';
      return name.toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .replace(/(.)\1+/g, '$1');
    };

    // Build query for nurse tasks
    const taskQuery = {
      patientId: patientId,
      taskType: 'MEDICATION',
      status: { $in: ['PENDING', 'IN_PROGRESS'] }
    };
    if (medicationName) {
      taskQuery['medicationDetails.medicationName'] = { $regex: new RegExp(medicationName, 'i') };
    }

    const nurseTasks = await NurseTask.find(taskQuery);
    console.log(`📋 [FIX PATIENT DOSES] Found ${nurseTasks.length} nurse tasks`);

    // Get medical record IDs for this patient to find prescriptions linked via medicalRecord field
    const MedicalRecord = require('../models/MedicalRecord');
    const patientMedRecords = await MedicalRecord.find({
      $or: [{ patient: patientId }, { patientId: patientId }],
      isDeleted: { $ne: true }
    }).select('_id');
    const patientMedRecordIds = patientMedRecords.map(r => r._id);

    // Load ALL prescriptions for this patient (any payment status, all field variants)
    const prescriptionQuery = {
      $or: [
        { patient: patientId },
        { patientId: patientId },
        ...(patientMedRecordIds.length > 0 ? [{ medicalRecord: { $in: patientMedRecordIds } }] : [])
      ]
    };
    if (medicationName) {
      prescriptionQuery.medicationName = { $regex: new RegExp(medicationName, 'i') };
    }

    const prescriptions = await Prescription.find(prescriptionQuery).sort({ createdAt: 1 });
    console.log(`📋 [FIX PATIENT DOSES] Found ${prescriptions.length} prescriptions`);

    // Fetch patient and a fallback assignedBy user once
    const Patient = require('../models/Patient');
    const User = require('../models/User');
    const patient = await Patient.findById(patientId);
    const patientName = patient ? `${patient.firstName || ''} ${patient.lastName || ''}`.trim() : 'Unknown';

    // Find a fallback assignedBy (any doctor/admin user)
    let fallbackAssignedBy = null;
    if (patient && patient.assignedDoctorId) {
      fallbackAssignedBy = patient.assignedDoctorId;
    } else {
      const anyDoctor = await User.findOne({ role: { $in: ['doctor', 'admin'] } });
      if (anyDoctor) fallbackAssignedBy = anyDoctor._id;
    }
    if (!fallbackAssignedBy) {
      fallbackAssignedBy = new mongoose.Types.ObjectId();
    }

    const fixedTasks = [];
    const createdTasks = [];
    const deletedTasks = [];

    // --- Step 1: Match each prescription to exactly one task ---
    // Build a map: prescriptionId → best matching task
    const prescriptionTaskMap = new Map(); // prescriptionId → task
    const claimedTaskIds = new Set();

    // First pass: match by explicit prescriptionId link
    for (const prescription of prescriptions) {
      const pid = prescription._id.toString();
      const linkedTask = nurseTasks.find(t =>
        !claimedTaskIds.has(t._id.toString()) && (
          t.medicationDetails?.prescriptionId?.toString() === pid ||
          t.prescriptionId?.toString() === pid
        )
      );
      if (linkedTask) {
        prescriptionTaskMap.set(pid, linkedTask);
        claimedTaskIds.add(linkedTask._id.toString());
      }
    }

    // Second pass: fuzzy name match for unlinked prescriptions
    for (const prescription of prescriptions) {
      const pid = prescription._id.toString();
      if (prescriptionTaskMap.has(pid)) continue;

      const normPrescName = normalizeMedName(prescription.medicationName);
      const matchedTask = nurseTasks.find(t =>
        !claimedTaskIds.has(t._id.toString()) &&
        normalizeMedName(t.medicationDetails?.medicationName) === normPrescName
      );
      if (matchedTask) {
        prescriptionTaskMap.set(pid, matchedTask);
        claimedTaskIds.add(matchedTask._id.toString());
      }
    }

    // --- Step 2: Delete tasks that are duplicates for the SAME medication ---
    // Only delete a task if it was NOT claimed AND there is already another task claimed for the same med name.
    // Never delete tasks for medications that simply have no prescription match (could be unpaid/different status).
    const claimedMedNames = new Set();
    for (const [pid, task] of prescriptionTaskMap.entries()) {
      const n = normalizeMedName(task.medicationDetails?.medicationName);
      if (n) claimedMedNames.add(n);
    }

    for (const task of nurseTasks) {
      if (!claimedTaskIds.has(task._id.toString())) {
        const taskMedName = task.medicationDetails?.medicationName || 'Unknown';
        const normTask = normalizeMedName(taskMedName);
        // Only delete if another task for the same medication WAS claimed (true duplicate)
        if (claimedMedNames.has(normTask)) {
          console.log(`🗑️ [FIX PATIENT DOSES] Deleting duplicate task ${task._id} (${taskMedName}) — another task already covers this prescription`);
          await NurseTask.deleteOne({ _id: task._id });
          deletedTasks.push({ taskId: task._id, medicationName: taskMedName });
        } else {
          console.log(`⏭️ [FIX PATIENT DOSES] Keeping task ${task._id} (${taskMedName}) — no prescription match but not a duplicate`);
        }
      }
    }

    // --- Step 3: Fix or create tasks for each prescription ---
    for (const prescription of prescriptions) {
      const pid = prescription._id.toString();
      const frequency = prescription.frequency || 'Once daily (QD)';
      const rawDuration = prescription.duration;

      let numericDuration = null;
      if (typeof rawDuration === 'number') {
        numericDuration = rawDuration;
      } else if (typeof rawDuration === 'string') {
        const m = rawDuration.match(/(\d+)/);
        if (m) numericDuration = parseInt(m[1], 10);
      }

      if (!numericDuration) {
        console.log(`⚠️ [FIX PATIENT DOSES] Skipping prescription ${pid} — no valid duration`);
        continue;
      }

      const dosesPerDay = getDosesPerDay(frequency);
      const correctTotalDoses = dosesPerDay * numericDuration;

      const existingTask = prescriptionTaskMap.get(pid);

      if (existingTask) {
        // Fix dose count if wrong
        const currentDoseCount = (existingTask.medicationDetails?.doseRecords || []).length;

        // Also update prescriptionId link if missing
        const updateFields = {
          'medicationDetails.frequency': frequency,
          'medicationDetails.duration': numericDuration,
          'prescriptionId': prescription._id,
          'medicationDetails.prescriptionId': prescription._id
        };

        if (currentDoseCount !== correctTotalDoses) {
          console.log(`🔧 [FIX PATIENT DOSES] Fixing task ${existingTask._id} (${existingTask.medicationDetails?.medicationName}): ${currentDoseCount} → ${correctTotalDoses} doses`);

          const existingRecords = existingTask.medicationDetails?.doseRecords || [];
          const newDoseRecords = generateDoseRecords(frequency, correctTotalDoses);
          existingRecords.filter(r => r.administered).forEach(adm => {
            const match = newDoseRecords.find(r => r.day === adm.day && r.timeSlot === adm.timeSlot);
            if (match) {
              match.administered = true;
              match.administeredAt = adm.administeredAt;
              match.administeredBy = adm.administeredBy;
              match.notes = adm.notes;
            }
          });

          updateFields['medicationDetails.doseRecords'] = newDoseRecords;

          fixedTasks.push({
            taskId: existingTask._id,
            medicationName: existingTask.medicationDetails?.medicationName,
            frequency,
            duration: numericDuration,
            oldDoses: currentDoseCount,
            newDoses: correctTotalDoses
          });
        } else {
          console.log(`✅ [FIX PATIENT DOSES] Task ${existingTask._id} already correct: ${currentDoseCount} doses`);
        }

        await NurseTask.updateOne({ _id: existingTask._id }, { $set: updateFields });

      } else {
        // Only create missing tasks for paid/partial prescriptions
        const pStatus = prescription.paymentStatus;
        if (!['paid', 'partial'].includes(pStatus)) {
          console.log(`⏭️ [FIX PATIENT DOSES] Skipping task creation for prescription ${pid} (${prescription.medicationName}) — payment status: ${pStatus}`);
          continue;
        }

        // Create missing task
        console.log(`⚠️ [FIX PATIENT DOSES] Creating missing task for prescription ${pid} (${prescription.medicationName})`);

        try {
          const doseRecords = generateDoseRecords(frequency, correctTotalDoses);
          const assignedBy = prescription.doctor || fallbackAssignedBy;

          const normPrescMed = normalizeMedName(prescription.medicationName);
          const existingSameMed = nurseTasks.filter(t =>
            normalizeMedName(t.medicationDetails?.medicationName) === normPrescMed
          ).length;
          const createdSameMedInRun = createdTasks.filter(c =>
            normalizeMedName(c.medicationName) === normPrescMed
          ).length;
          const instanceOrder = existingSameMed + createdSameMedInRun + 1;
          const ordinalSuffix = (n) => {
            if (n % 10 === 1 && n % 100 !== 11) return 'st';
            if (n % 10 === 2 && n % 100 !== 12) return 'nd';
            if (n % 10 === 3 && n % 100 !== 13) return 'rd';
            return 'th';
          };
          const instanceLabel = `${instanceOrder}${ordinalSuffix(instanceOrder)}`;

          const newTask = new NurseTask({
            patientId: patientId,
            patientName: patientName,
            description: `Administer ${prescription.medicationName} - ${prescription.dosage || ''} - ${frequency}`,
            taskType: 'MEDICATION',
            status: 'PENDING',
            priority: 'MEDIUM',
            assignedBy: assignedBy,
            assignedByName: 'System (auto-fix)',
            dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
            prescriptionId: prescription._id,
            medicationDetails: {
              medicationName: prescription.medicationName,
              dosage: prescription.dosage || '',
              frequency: frequency,
              route: prescription.route || 'Oral',
              instructions: prescription.notes || prescription.instructions || '',
              duration: numericDuration,
              startDate: prescription.datePrescribed || prescription.createdAt,
              prescriptionId: prescription._id,
              doseRecords: doseRecords,
              instanceOrder: instanceOrder,
              instanceLabel: instanceLabel
            },
            paymentAuthorization: {
              paymentStatus: 'paid',
              canAdminister: true,
              authorizedDoses: correctTotalDoses,
              unauthorizedDoses: 0,
              outstandingAmount: 0,
              paidDays: numericDuration,
              totalDays: numericDuration,
              lastUpdated: new Date()
            }
          });

          await newTask.save();
          console.log(`✅ [FIX PATIENT DOSES] Created task for prescription ${pid} with ${correctTotalDoses} doses`);
          createdTasks.push({
            taskId: newTask._id,
            medicationName: prescription.medicationName,
            frequency,
            duration: numericDuration,
            doses: correctTotalDoses
          });
        } catch (createErr) {
          console.error(`❌ [FIX PATIENT DOSES] Failed to create task for prescription ${pid}:`, createErr.message);
        }
      }
    }

    res.json({
      success: true,
      message: `Fixed ${fixedTasks.length} task(s), created ${createdTasks.length} missing task(s), deleted ${deletedTasks.length} orphaned task(s)`,
      fixed: fixedTasks,
      created: createdTasks,
      deleted: deletedTasks,
      totalChecked: nurseTasks.length
    });

  } catch (error) {
    console.error('❌ [FIX PATIENT DOSES] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fix patient doses',
      details: error.message
    });
  }
});

// Restore deleted tasks: recreate nurse tasks for ALL prescriptions that have no task
// POST /api/fix-nurse-tasks/restore-missing-tasks  { patientId }
router.post('/restore-missing-tasks', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const { patientId } = req.body;
    if (!patientId) {
      return res.status(400).json({ success: false, error: 'patientId is required' });
    }

    console.log(`🔄 [RESTORE] Restoring missing tasks for patient ${patientId}`);

    const normalizeMedName = (name) => {
      if (!name) return '';
      return name.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/(.)\1+/g, '$1');
    };

    const Patient = require('../models/Patient');
    const User = require('../models/User');
    const patient = await Patient.findById(patientId);
    const patientName = patient ? `${patient.firstName || ''} ${patient.lastName || ''}`.trim() : 'Unknown';

    let fallbackAssignedBy = null;
    if (patient && patient.assignedDoctorId) {
      fallbackAssignedBy = patient.assignedDoctorId;
    } else {
      const anyDoctor = await User.findOne({ role: { $in: ['doctor', 'admin'] } });
      if (anyDoctor) fallbackAssignedBy = anyDoctor._id;
    }
    if (!fallbackAssignedBy) fallbackAssignedBy = new mongoose.Types.ObjectId();

    // Clean up any tasks with bad names from previous restore attempts
    await NurseTask.deleteMany({
      patientId: patientId,
      taskType: 'MEDICATION',
      $or: [
        { 'medicationDetails.medicationName': { $regex: /^Medication:\s/i } },
        { 'medicationDetails.medicationName': { $regex: /\(\d+\s*doses?/i } }
      ]
    });

    // Get all existing tasks for this patient
    const existingTasks = await NurseTask.find({
      patientId: patientId,
      taskType: 'MEDICATION',
      status: { $in: ['PENDING', 'IN_PROGRESS'] }
    });

    // Also get medications from MedicalRecord treatment plans
    const MedicalRecord = require('../models/MedicalRecord');
    const medicalRecords = await MedicalRecord.find({
      $or: [{ patient: patientId }, { patientId: patientId }],
      isDeleted: { $ne: true }
    }).sort({ createdAt: 1 });

    const medicalRecordIds = medicalRecords.map(r => r._id);

    // Get ALL prescriptions for this patient — via patient field OR medicalRecord link
    const prescriptions = await Prescription.find({
      $or: [
        { patient: patientId },
        { patientId: patientId },
        ...(medicalRecordIds.length > 0 ? [{ medicalRecord: { $in: medicalRecordIds } }] : [])
      ]
    }).sort({ createdAt: 1 });
    console.log(`📋 [RESTORE] Found ${prescriptions.length} standalone prescriptions, ${existingTasks.length} existing tasks`);

    // Collect all prescription-like objects to process — one source per medication LINE
    // so that one prescription with medications: [Diclofenac, Dexamethasone, Dexamethasone] creates 3 tasks
    const allMedSources = [];
    for (const p of prescriptions) {
      const base = {
        dosage: p.dosage,
        route: p.route,
        notes: p.notes,
        instructions: p.instructions,
        paymentStatus: p.paymentStatus,
        doctor: p.doctor,
        datePrescribed: p.datePrescribed,
        createdAt: p.createdAt,
        source: 'prescription'
      };
      if (p.medications && Array.isArray(p.medications) && p.medications.length > 0) {
        p.medications.forEach((med, index) => {
          const name = med.name || med.medication;
          if (!name) return;
          allMedSources.push({
            _id: p._id,
            _medicationIndex: index,
            medicationName: name,
            dosage: med.dosage || p.dosage || '',
            frequency: med.frequency || p.frequency || 'Once daily (QD)',
            duration: med.duration || p.duration,
            ...base
          });
        });
      } else {
        allMedSources.push({
          _id: p._id,
          _medicationIndex: 0,
          medicationName: p.medicationName,
          frequency: p.frequency,
          duration: p.duration,
          ...base
        });
      }
    }

    // Add medications from medical record prescriptions (populated refs)
    // Only add if not already in allMedSources (Prescription.find already includes medicalRecord-linked docs)
    for (const record of medicalRecords) {
      if (record.prescriptions && record.prescriptions.length > 0) {
        for (const p of record.prescriptions) {
          if (!p || !p._id) continue;
          const alreadyHas = allMedSources.some(s => s._id && s._id.toString() === p._id.toString());
          if (alreadyHas) continue;
          if (p.medications && Array.isArray(p.medications) && p.medications.length > 0) {
            p.medications.forEach((med, idx) => {
              const name = med.name || med.medication;
              if (!name) return;
              allMedSources.push({
                _id: p._id,
                _medicationIndex: idx,
                medicationName: name,
                dosage: med.dosage || p.dosage || '',
                frequency: med.frequency || p.frequency || 'Once daily (QD)',
                duration: med.duration || p.duration,
                route: p.route || med.route || 'Oral',
                notes: p.notes || med.notes || '',
                instructions: p.instructions || '',
                paymentStatus: p.paymentStatus,
                doctor: p.doctor || record.doctor || record.doctorId,
                datePrescribed: p.datePrescribed || record.visitDate,
                createdAt: p.createdAt || record.createdAt,
                source: 'medicalRecord'
              });
            });
          } else {
            allMedSources.push({
              _id: p._id,
              _medicationIndex: 0,
              medicationName: p.medicationName,
              dosage: p.dosage,
              frequency: p.frequency,
              duration: p.duration,
              route: p.route,
              notes: p.notes,
              instructions: p.instructions,
              paymentStatus: p.paymentStatus,
              doctor: p.doctor || record.doctor || record.doctorId,
              datePrescribed: p.datePrescribed || record.visitDate,
              createdAt: p.createdAt || record.createdAt,
              source: 'medicalRecord'
            });
          }
        }
      }
      // Also check treatment.medications array (inline meds, no separate prescription doc)
      const inlineMeds = record.treatment?.medications || [];
      for (const med of inlineMeds) {
        if (!med.name) continue;
        const normName = normalizeMedName(med.name);
        // Only add if no existing source covers this med name
        if (!allMedSources.find(s => normalizeMedName(s.medicationName) === normName)) {
          allMedSources.push({
            _id: null,
            medicationName: med.name,
            dosage: med.dosage || '',
            frequency: med.frequency || 'Once daily (QD)',
            duration: med.duration || '1 day',
            route: 'Oral',
            notes: med.notes || '',
            instructions: '',
            paymentStatus: 'paid',
            doctor: record.doctor || record.doctorId,
            datePrescribed: record.visitDate,
            createdAt: record.createdAt,
            source: 'inlineMed',
            recordId: record._id
          });
        }
      }
    }

    // Also look at MedicalInvoice medication items for this patient
    const MedicalInvoice = require('../models/MedicalInvoice');
    const invoices = await MedicalInvoice.find({
      $or: [{ patient: patientId }]
    }).sort({ createdAt: 1 });
    console.log(`📋 [RESTORE] Found ${invoices.length} medical invoices`);

    for (const invoice of invoices) {
      for (const item of (invoice.items || [])) {
        if (item.itemType !== 'medication' && item.category !== 'medication') continue;
        const rawDesc = item.description || '';
        // Strip "Medication: " prefix, then take everything before " - " or " (" 
        let medName = rawDesc
          .replace(/^(medication|med|drug):\s*/i, '')
          .split(/\s+\(|\s+-\s+/)[0]
          .trim();
        if (!medName) continue;

        const normName = normalizeMedName(medName);
        // Skip if already in sources list or already has an existing task
        if (allMedSources.find(s => normalizeMedName(s.medicationName) === normName)) continue;
        if (existingTasks.some(t => normalizeMedName(t.medicationDetails?.medicationName) === normName)) continue;

        const meta = item.metadata || {};
        const frequency = meta.frequency || 'Once daily (QD)';
        // Use metadata duration/days first; fall back to quantity as number of doses (not days)
        const rawDuration = meta.duration || meta.days || meta.numDays;
        const dosesPerDayForItem = getDosesPerDay(frequency);
        // If we have explicit duration use it, otherwise derive days from quantity/dosesPerDay
        const durationDays = rawDuration
          ? (typeof rawDuration === 'number' ? rawDuration : parseInt(String(rawDuration).match(/\d+/)?.[0] || '1', 10))
          : Math.ceil((item.quantity || 1) / dosesPerDayForItem);
        const descParts = rawDesc.split(/\s+-\s+/);
        const dosage = meta.dosage || descParts[1]?.trim() || '';

        allMedSources.push({
          _id: null,
          medicationName: medName,
          dosage: dosage,
          frequency: frequency,
          duration: `${durationDays} days`,
          route: meta.route || 'Oral',
          notes: item.notes || '',
          instructions: '',
          paymentStatus: invoice.balance <= 0 ? 'paid' : 'partial',
          doctor: invoice.provider || fallbackAssignedBy,
          datePrescribed: invoice.createdAt,
          createdAt: invoice.createdAt,
          source: 'invoice',
          invoiceId: invoice._id
        });
      }
    }

    console.log(`📋 [RESTORE] Found ${medicalRecords.length} medical records`);
    for (const r of medicalRecords) {
      console.log(`  Record ${r._id}: prescriptions=${r.prescriptions?.length || 0}, inlineMeds=${r.treatment?.medications?.length || 0}`);
    }

    // Deduplicate: same order saved multiple times (e.g. double-submit) → keep only one task
    const DUPE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
    const getDateDay = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
    const getNumericDuration = (raw) => {
      if (typeof raw === 'number') return raw;
      const m = (raw && String(raw)).match(/(\d+)/);
      return m ? parseInt(m[1], 10) : null;
    };
    allMedSources.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    const deduped = [];
    for (const med of allMedSources) {
      const norm = normalizeMedName(med.medicationName);
      const day = getDateDay(med.datePrescribed || med.createdAt);
      const dur = getNumericDuration(med.duration);
      const created = new Date(med.createdAt || 0).getTime();
      const isDuplicate = deduped.some((existing) => {
        const sameMed = normalizeMedName(existing.medicationName) === norm;
        const sameDay = getDateDay(existing.datePrescribed || existing.createdAt) === day;
        const sameDur = getNumericDuration(existing.duration) === dur;
        const samePrescId = med._id && existing._id && med._id.toString() === existing._id.toString();
        if (samePrescId && (med._medicationIndex ?? 0) === (existing._medicationIndex ?? 0)) return true;
        if (!sameMed || !sameDay || sameDur === null) return false;
        if (sameDur && Math.abs(created - new Date(existing.createdAt || 0).getTime()) <= DUPE_WINDOW_MS) return true;
        return false;
      });
      if (!isDuplicate) deduped.push(med);
      else console.log(`🔄 [RESTORE] Skipping duplicate source: ${med.medicationName} (same order within ${DUPE_WINDOW_MS / 60000} min)`);
    }
    // Replace so taskExists and instanceOrder use deduped list
    allMedSources.length = 0;
    allMedSources.push(...deduped);

    console.log(`📋 [RESTORE] Total medication sources after dedup: ${allMedSources.length} (${allMedSources.map(s => s.medicationName).join(', ')})`);

    const createdTasks = [];

    for (const med of allMedSources) {
      const normMedName = normalizeMedName(med.medicationName);

      // Check if a task already exists for THIS specific prescription/source.
      // For prescription sources: match by prescriptionId + medicationIndex (one task per medication line).
      // For inline/invoice sources (no _id), match by medication name only.
      const medIndex = med._medicationIndex ?? 0;
      const taskExists = med._id
        ? existingTasks.some(t => {
            const samePresc = (t.medicationDetails?.prescriptionId?.toString() === med._id.toString()) ||
              (t.prescriptionId?.toString() === med._id.toString());
            const taskIndex = t.medicationDetails?.medicationIndex ?? 0;
            return samePresc && taskIndex === medIndex;
          })
        : existingTasks.some(t => normalizeMedName(t.medicationDetails?.medicationName) === normMedName);

      if (taskExists) {
        console.log(`✅ [RESTORE] Task already exists for ${med.medicationName}${med._id ? ` (prescription ${med._id}, index ${medIndex})` : ''}`);
        continue;
      }

      const frequency = med.frequency || 'Once daily (QD)';
      const rawDuration = med.duration;
      let numericDuration = null;
      if (typeof rawDuration === 'number') {
        numericDuration = rawDuration;
      } else if (typeof rawDuration === 'string') {
        const m = rawDuration.match(/(\d+)/);
        if (m) numericDuration = parseInt(m[1], 10);
      }

      if (!numericDuration) {
        console.log(`⚠️ [RESTORE] Skipping ${med.medicationName} — no valid duration`);
        continue;
      }

      const dosesPerDay = getDosesPerDay(frequency);
      const totalDoses = dosesPerDay * numericDuration;
      const doseRecords = generateDoseRecords(frequency, totalDoses);
      const assignedBy = med.doctor || fallbackAssignedBy;

      const pStatus = ['paid', 'partial'].includes(med.paymentStatus) ? med.paymentStatus : 'paid';
      const canAdminister = true;

      // Instance order for same patient + medication (1st, 2nd, 3rd...) for Administer Meds display and sequential dosing
      const existingSameMed = existingTasks.filter(t =>
        normalizeMedName(t.medicationDetails?.medicationName) === normMedName
      ).length;
      const createdSameMedInThisRun = createdTasks.filter(c =>
        normalizeMedName(c.medicationName) === normMedName
      ).length;
      const instanceOrder = existingSameMed + createdSameMedInThisRun + 1;
      const ordinalSuffix = (n) => {
        if (n % 10 === 1 && n % 100 !== 11) return 'st';
        if (n % 10 === 2 && n % 100 !== 12) return 'nd';
        if (n % 10 === 3 && n % 100 !== 13) return 'rd';
        return 'th';
      };
      const instanceLabel = `${instanceOrder}${ordinalSuffix(instanceOrder)}`;

      try {
        const taskData = {
          patientId: patientId,
          patientName: patientName,
          description: `Administer ${med.medicationName} - ${med.dosage || ''} - ${frequency}`,
          taskType: 'MEDICATION',
          status: 'PENDING',
          priority: 'MEDIUM',
          assignedBy: assignedBy,
          assignedByName: 'System (restore)',
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          medicationDetails: {
            medicationName: med.medicationName,
            dosage: med.dosage || '',
            frequency: frequency,
            route: med.route || 'Oral',
            instructions: med.notes || med.instructions || '',
            duration: numericDuration,
            startDate: med.datePrescribed || med.createdAt,
            doseRecords: doseRecords,
            instanceOrder: instanceOrder,
            instanceLabel: instanceLabel,
            medicationIndex: med._medicationIndex ?? 0
          },
          paymentAuthorization: {
            paymentStatus: pStatus,
            canAdminister: canAdminister,
            authorizedDoses: totalDoses,
            unauthorizedDoses: 0,
            outstandingAmount: 0,
            paidDays: numericDuration,
            totalDays: numericDuration,
            lastUpdated: new Date()
          }
        };

        if (med._id) {
          taskData.prescriptionId = med._id;
          taskData.medicationDetails.prescriptionId = med._id;
        }

        const newTask = new NurseTask(taskData);
        await newTask.save();
        console.log(`✅ [RESTORE] Created task for ${med.medicationName} (${totalDoses} doses) from ${med.source}`);
        createdTasks.push({
          taskId: newTask._id,
          medicationName: med.medicationName,
          frequency,
          duration: numericDuration,
          doses: totalDoses,
          paymentStatus: pStatus,
          source: med.source
        });
      } catch (err) {
        console.error(`❌ [RESTORE] Failed to create task for ${med.medicationName}:`, err.message);
      }
    }

    res.json({
      success: true,
      message: `Restored ${createdTasks.length} missing task(s)`,
      created: createdTasks
    });

  } catch (error) {
    console.error('❌ [RESTORE] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to restore tasks', details: error.message });
  }
});

// POST /api/fix-nurse-tasks/ensure-from-invoice  { invoiceId } — backfill nurse tasks from paid medication lines
router.post('/ensure-from-invoice', async (req, res) => {
  try {
    const { invoiceId } = req.body || {};
    if (!invoiceId) {
      return res.status(400).json({ success: false, error: 'invoiceId is required' });
    }
    const MedicalInvoice = require('../models/MedicalInvoice');
    const Patient = require('../models/Patient');
    const { ensureNurseTasksFromInvoiceMedicationItems } = require('../utils/invoiceNurseTaskEnsure');

    const invoice = await MedicalInvoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    let patientData = null;
    if (invoice.patient) {
      patientData = await Patient.findById(invoice.patient);
    }
    if (!patientData && invoice.patientId) {
      patientData = await Patient.findOne({ patientId: invoice.patientId });
      if (!patientData && /^[0-9a-fA-F]{24}$/.test(String(invoice.patientId))) {
        patientData = await Patient.findById(invoice.patientId);
      }
    }

    const result = await ensureNurseTasksFromInvoiceMedicationItems(invoice, patientData);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('❌ [ENSURE FROM INVOICE]', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
