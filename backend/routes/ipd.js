const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const mongoose = require('mongoose');
const IPDAdmission = require('../models/IPDAdmission');
const Patient = require('../models/Patient');
const User = require('../models/User');
const NurseTask = require('../models/NurseTask');
const MedicalInvoice = require('../models/MedicalInvoice');
const Notification = require('../models/Notification');

/**
 * GET /api/ipd/admissions
 * List IPD admissions. Query: status=active|discharged (optional)
 */
router.get('/admissions', auth, async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status && ['active', 'discharged'].includes(status)) {
      query.status = status;
    }
    const admissions = await IPDAdmission.find(query)
      .populate('patientId', 'firstName lastName patientId dateOfBirth gender')
      .populate('admittingDoctorId', 'firstName lastName')
      .sort({ admitDate: -1 })
      .lean();
    return res.json({ success: true, data: admissions });
  } catch (err) {
    console.error('IPD admissions list error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/ipd/patients
 * List currently admitted patients (status Admitted). For nurse/doctor ward view.
 */
router.get('/patients', auth, async (req, res) => {
  try {
    const patients = await Patient.find({ status: 'Admitted', isActive: true })
      .populate('assignedDoctorId', 'firstName lastName')
      .populate('assignedNurseId', 'firstName lastName')
      .sort({ lastUpdated: -1 })
      .lean();
    const admissions = await IPDAdmission.find({ status: 'active' })
      .populate('patientId', 'firstName lastName patientId')
      .lean();
    const admissionByPatient = {};
    admissions.forEach(a => {
      if (a.patientId && a.patientId._id) {
        admissionByPatient[a.patientId._id.toString()] = a;
      }
    });
    const enriched = patients.map(p => {
      const adm = admissionByPatient[p._id.toString()];
      return {
        ...p,
        admission: adm ? {
          wardName: adm.wardName,
          roomNumber: adm.roomNumber,
          bedNumber: adm.bedNumber,
          admitDate: adm.admitDate,
          admissionId: adm._id
        } : null
      };
    });
    return res.json({ success: true, data: enriched });
  } catch (err) {
    console.error('IPD patients list error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/ipd/admit
 * Admit a patient to IPD (ward/bed). Creates admission, sets patient status to Admitted.
 * Body: patientId (MongoDB _id or patientId string), wardName?, roomNumber, bedNumber, admissionNotes?
 */
router.post('/admit', auth, async (req, res) => {
  try {
    const { patientId, wardName, roomNumber, bedNumber, admissionNotes } = req.body;
    if (!patientId || !roomNumber || !bedNumber) {
      return res.status(400).json({
        success: false,
        message: 'patientId, roomNumber, and bedNumber are required'
      });
    }
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    // Support both MongoDB _id and patientId string (e.g. P24650-4650)
    let patient = null;
    if (mongoose.Types.ObjectId.isValid(patientId) && String(patientId).length === 24) {
      patient = await Patient.findById(patientId);
    }
    if (!patient) {
      patient = await Patient.findOne({ patientId: String(patientId) });
    }
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }
    const existingActive = await IPDAdmission.findOne({
      patientId: patient._id,
      status: 'active'
    });
    if (existingActive) {
      return res.status(400).json({
        success: false,
        message: 'Patient is already admitted. Discharge first to admit again.'
      });
    }
    const doctorName = req.user.firstName && req.user.lastName
      ? `${req.user.firstName} ${req.user.lastName}` : (req.user.email || 'Doctor');
    const patientName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Unknown';
    const admission = new IPDAdmission({
      patientId: patient._id,
      patientName,
      wardName: wardName || 'General Ward',
      roomNumber: String(roomNumber).trim(),
      bedNumber: String(bedNumber).trim(),
      admittingDoctorId: req.user._id,
      admittingDoctorName: doctorName,
      status: 'active',
      admissionNotes: admissionNotes || ''
    });
    await admission.save();
    patient.status = 'Admitted';
    patient.roomNumber = admission.roomNumber;
    patient.lastUpdated = new Date();
    await patient.save();
    const populated = await IPDAdmission.findById(admission._id)
      .populate('patientId', 'firstName lastName patientId')
      .populate('admittingDoctorId', 'firstName lastName')
      .lean();
    return res.status(201).json({ success: true, data: populated });
  } catch (err) {
    console.error('IPD admit error:', err);
    const status = err.name === 'ValidationError' ? 400 : 500;
    return res.status(status).json({ success: false, message: err.message });
  }
});

/**
 * PATCH /api/ipd/admissions/:id/discharge
 * Discharge patient: set admission status to discharged, set patient status to Discharged.
 */
router.patch('/admissions/:id/discharge', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { dischargeNotes } = req.body || {};
    const admission = await IPDAdmission.findById(id);
    if (!admission) {
      return res.status(404).json({ success: false, message: 'Admission not found' });
    }
    if (admission.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Admission is already discharged' });
    }
    admission.status = 'discharged';
    admission.dischargeDate = new Date();
    if (dischargeNotes) admission.dischargeNotes = dischargeNotes;
    await admission.save();
    await Patient.findByIdAndUpdate(admission.patientId, {
      status: 'Discharged',
      lastUpdated: new Date()
    });
    const populated = await IPDAdmission.findById(admission._id)
      .populate('patientId', 'firstName lastName patientId')
      .lean();
    return res.json({ success: true, data: populated });
  } catch (err) {
    console.error('IPD discharge error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/ipd/admissions/:id/bed-charge
 * Add bed charge (per day) to the patient's invoice for this admission.
 * Body: days (number), unitPrice (optional; default from service or env), description?
 * Creates or uses admission.invoiceId.
 */
router.post('/admissions/:id/bed-charge', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { days, unitPrice, description } = req.body || {};
    const numDays = Math.max(1, parseInt(days, 10) || 1);
    const admission = await IPDAdmission.findById(id).populate('patientId');
    if (!admission) {
      return res.status(404).json({ success: false, message: 'Admission not found' });
    }
    const pricePerDay = typeof unitPrice === 'number' && unitPrice >= 0 ? unitPrice : 0;
    if (pricePerDay <= 0) {
      return res.status(400).json({
        success: false,
        message: 'unitPrice (bed charge per day) is required and must be > 0'
      });
    }
    const total = numDays * pricePerDay;
    const desc = description || `IPD Bed - ${admission.wardName} Room ${admission.roomNumber} Bed ${admission.bedNumber} (${numDays} day(s))`;
    let invoice = admission.invoiceId
      ? await MedicalInvoice.findById(admission.invoiceId)
      : null;
    if (!invoice) {
      const invoiceNumber = `IPD-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const patientName = admission.patientId.firstName && admission.patientId.lastName
        ? `${admission.patientId.firstName} ${admission.patientId.lastName}` : 'Unknown';
      invoice = new MedicalInvoice({
        patient: admission.patientId._id,
        patientId: admission.patientId.patientId || admission.patientId._id.toString(),
        patientName,
        invoiceNumber,
        items: [],
        subtotal: 0,
        total: 0,
        balance: 0,
        amountPaid: 0,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'pending'
      });
      await invoice.save();
      admission.invoiceId = invoice._id;
      await admission.save();
    }
    const newItem = {
      itemType: 'service',
      category: 'service',
      description: desc,
      quantity: numDays,
      unitPrice: pricePerDay,
      totalPrice: total,
      total,
      discount: 0,
      tax: 0,
      metadata: { ipdAdmissionId: admission._id, type: 'bed' },
      addedBy: req.user._id
    };
    invoice.items.push(newItem);
    const newTotal = (invoice.total || 0) + total;
    invoice.subtotal = newTotal;
    invoice.total = newTotal;
    invoice.balance = newTotal - (invoice.amountPaid || 0);
    await invoice.save();
    return res.json({
      success: true,
      data: { invoiceId: invoice._id, item: newItem, total }
    });
  } catch (err) {
    console.error('IPD bed charge error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/ipd/admissions/:id/order-vitals
 * Create a VITAL_SIGNS nurse task for this admitted patient (nurse will see and record).
 */
router.post('/admissions/:id/order-vitals', auth, async (req, res) => {
  try {
    const admission = await IPDAdmission.findById(req.params.id).populate('patientId');
    if (!admission || admission.status !== 'active') {
      return res.status(404).json({ success: false, message: 'Active admission not found' });
    }
    const patient = admission.patientId;
    const patientName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Unknown';
    const doctorName = req.user.firstName && req.user.lastName
      ? `${req.user.firstName} ${req.user.lastName}` : req.user.email || 'Doctor';
    const task = new NurseTask({
      patientId: patient._id,
      patientName,
      taskType: 'VITAL_SIGNS',
      description: `Record vitals (IPD - ${admission.wardName} Rm ${admission.roomNumber}/Bed ${admission.bedNumber})`,
      status: 'PENDING',
      priority: 'MEDIUM',
      assignedBy: req.user._id,
      assignedByName: doctorName,
      dueDate: new Date(),
      admissionId: admission._id,
      metadata: { source: 'ipd', admissionId: admission._id }
    });
    await task.save();
    return res.status(201).json({ success: true, data: task });
  } catch (err) {
    console.error('IPD order vitals error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/ipd/admissions/:id
 * Get one admission with patient and invoice info.
 */
router.get('/admissions/:id', auth, async (req, res) => {
  try {
    const admission = await IPDAdmission.findById(req.params.id)
      .populate('patientId', 'firstName lastName patientId dateOfBirth gender contactNumber')
      .populate('admittingDoctorId', 'firstName lastName')
      .populate('invoiceId')
      .lean();
    if (!admission) {
      return res.status(404).json({ success: false, message: 'Admission not found' });
    }
    return res.json({ success: true, data: admission });
  } catch (err) {
    console.error('IPD get admission error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/ipd/admissions/:id/send-report
 * Nurse sends IPD nursing report to the admitting doctor (creates notification).
 * Body: { reportText: string }
 */
router.post('/admissions/:id/send-report', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { reportText } = req.body || {};
    if (!reportText || typeof reportText !== 'string') {
      return res.status(400).json({ success: false, message: 'reportText is required' });
    }
    const admission = await IPDAdmission.findById(id)
      .populate('patientId', 'firstName lastName patientId')
      .populate('admittingDoctorId', 'firstName lastName');
    if (!admission) {
      return res.status(404).json({ success: false, message: 'Admission not found' });
    }
    if (admission.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Admission is not active' });
    }
    const doctorId = admission.admittingDoctorId && admission.admittingDoctorId._id
      ? admission.admittingDoctorId._id
      : admission.admittingDoctorId;
    if (!doctorId) {
      return res.status(400).json({ success: false, message: 'No admitting doctor for this admission' });
    }
    const patientName = admission.patientName || (admission.patientId
      ? `${admission.patientId.firstName || ''} ${admission.patientId.lastName || ''}`.trim()
      : 'Patient') || 'Patient';
    const nurseName = req.user.firstName && req.user.lastName
      ? `${req.user.firstName} ${req.user.lastName}`
      : req.user.email || 'Nurse';
    const shortMessage = reportText.length > 200 ? reportText.slice(0, 200) + '…' : reportText;
    const notification = new Notification({
      title: `IPD nursing report: ${patientName}`,
      message: shortMessage,
      type: 'ipd_nurse_report',
      senderId: req.user._id.toString(),
      senderRole: req.user.role || 'nurse',
      recipientId: doctorId.toString(),
      recipientRole: 'doctor',
      priority: 'medium',
      category: 'patient',
      data: {
        patientId: admission.patientId && admission.patientId._id ? admission.patientId._id : admission.patientId,
        patientName,
        admissionId: admission._id,
        wardName: admission.wardName,
        roomNumber: admission.roomNumber,
        bedNumber: admission.bedNumber,
        reportText,
        nurseName
      }
    });
    await notification.save();
    return res.status(201).json({ success: true, data: { notificationId: notification._id }, message: 'Report sent to doctor.' });
  } catch (err) {
    console.error('IPD send report error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
