/**
 * Ensures nurse tasks exist for each medication line on a paid invoice.
 * Covers cases where prescription sync only produced one task but billing has two+ lines.
 */

const mongoose = require('mongoose');
const Prescription = require('../models/Prescription');

function parseMedNameFromDescription(description) {
  if (!description) return null;
  const m = String(description).match(/Medication:\s*([^(]+)/i);
  return m ? m[1].trim() : null;
}

function isMedicationInvoiceItem(item) {
  const t = (item.itemType || '').toLowerCase();
  const c = (item.category || '').toLowerCase();
  if (t === 'medication' || c === 'medication') return true;
  if (String(item.description || '').toLowerCase().includes('medication:')) return true;
  return false;
}

function escapeRe(s) {
  return String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findMedInPrescription(prescription, medName) {
  if (!prescription?.medications?.length || !medName) return null;
  const target = String(medName).toLowerCase().trim();
  return prescription.medications.find((m) => {
    const n = String(m.name || m.medication || '').toLowerCase().trim();
    if (!n) return false;
    return n === target || n.includes(target) || target.includes(n);
  });
}

async function resolvePrescriptionIdForLine(prescId, medName, patientId) {
  if (prescId) return prescId;
  if (!patientId || !medName) return null;
  const rx = await Prescription.findOne({
    patient: patientId,
    status: { $in: ['Active', 'Pending', 'Payment Required', 'Extended'] },
    $or: [
      { medicationName: new RegExp(`^${escapeRe(medName)}$`, 'i') },
      { 'medications.name': new RegExp(escapeRe(medName), 'i') }
    ]
  })
    .sort({ createdAt: -1 })
    .lean();
  return rx?._id || null;
}

/**
 * @param {object} invoice - Saved MedicalInvoice (paid or balance 0)
 * @param {object|null} patientData - Resolved Patient doc when available
 * @returns {{ ensured: number, skipped: number, errors: string[] }}
 */
async function ensureNurseTasksFromInvoiceMedicationItems(invoice, patientData) {
  const results = { ensured: 0, skipped: 0, errors: [] };
  try {
    const balance = Number(invoice.balance || 0);
    const st = String(invoice.status || '').toLowerCase();
    const paid = balance <= 0.01 || st === 'paid' || st === 'fully_paid';
    if (!paid) {
      return results;
    }

    const Patient = require('../models/Patient');
    let patientDoc = patientData;

    if (!patientDoc && invoice.patient) {
      patientDoc = await Patient.findById(invoice.patient).catch(() => null);
    }
    if (!patientDoc && invoice.patientId) {
      patientDoc = await Patient.findOne({ patientId: invoice.patientId }).catch(() => null);
      if (!patientDoc && mongoose.Types.ObjectId.isValid(String(invoice.patientId))) {
        patientDoc = await Patient.findById(invoice.patientId).catch(() => null);
      }
    }
    if (!patientDoc) {
      console.warn('[INVOICE TASK ENSURE] Could not resolve patient document');
      return results;
    }

    const patientId = patientDoc._id;
    const { checkNurseTaskExists } = require('./medicationNurseTaskSync');
    const { createNurseTaskFromPrescription } = require('./nurseTaskCreation');

    for (const item of invoice.items || []) {
      if (!isMedicationInvoiceItem(item)) continue;

      const meta = item.metadata || {};
      let medName =
        meta.medicationName ||
        item.medicationName ||
        item.serviceName ||
        parseMedNameFromDescription(item.description);
      if (!medName || !String(medName).trim()) continue;
      medName = String(medName).trim();

      let prescId = meta.prescriptionId;
      if (!prescId) {
        prescId = await resolvePrescriptionIdForLine(null, medName, patientId);
      }
      if (!prescId) {
        results.skipped++;
        continue;
      }

      const existing = await checkNurseTaskExists(prescId, medName);
      if (existing.exists) {
        results.skipped++;
        continue;
      }

      const prescription = await Prescription.findById(prescId);
      const sub = prescription ? findMedInPrescription(prescription, medName) : null;

      const base = prescription ? prescription.toObject() : {};
      const medicationPrescription = {
        ...base,
        _id: prescId,
        patient: patientId,
        patientId,
        medicationName: medName,
        dosage: sub?.dosage || meta.dosage || prescription?.dosage || 'As prescribed',
        frequency: sub?.frequency || meta.frequency || prescription?.frequency || 'Once daily (QD)',
        duration: sub?.duration || meta.duration || prescription?.duration || '3 days',
        route: sub?.route || meta.route || prescription?.route || 'Oral',
        doctor: prescription?.doctor || prescription?.doctorId || invoice.createdBy || meta.doctorId,
        doctorId: prescription?.doctorId || prescription?.doctor || invoice.createdBy || meta.doctorId,
        medications: undefined,
        paymentStatus: prescription?.paymentStatus || 'paid',
        paymentAuthorization: prescription?.paymentAuthorization || {
          paymentStatus: 'fully_paid',
          canAdminister: true
        }
      };

      if (!medicationPrescription.doctor && !medicationPrescription.doctorId) {
        console.warn(`[INVOICE TASK ENSURE] No doctor on prescription ${prescId} for ${medName}; task may use system assigner`);
      }

      try {
        const created = await createNurseTaskFromPrescription(medicationPrescription, patientDoc);
        if (created.created && created.task) {
          if (!created.task.medicationDetails) created.task.medicationDetails = {};
          created.task.medicationDetails.invoiceId = invoice._id;
          if (!created.task.prescriptionId) created.task.prescriptionId = prescId;
          if (!created.task.medicationDetails.prescriptionId) {
            created.task.medicationDetails.prescriptionId = prescId;
          }
          await created.task.save();
          results.ensured++;
        } else {
          results.skipped++;
        }
      } catch (e) {
        results.errors.push(`${medName}: ${e.message}`);
        console.error(`[INVOICE TASK ENSURE] Failed for ${medName}:`, e.message);
      }
    }

    if (results.ensured > 0 || results.errors.length > 0) {
      console.log(
        `[INVOICE TASK ENSURE] invoice=${invoice._id} ensured=${results.ensured} skipped=${results.skipped} errors=${results.errors.length}`
      );
    }
    return results;
  } catch (e) {
    console.error('[INVOICE TASK ENSURE] Fatal:', e);
    return results;
  }
}

module.exports = { ensureNurseTasksFromInvoiceMedicationItems };
