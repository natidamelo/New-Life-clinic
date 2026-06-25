const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { auth } = require('../middleware/auth');

const HealthPackage = require('../models/HealthPackage');
const PatientPackage = require('../models/PatientPackage');
const PackageVisit = require('../models/PackageVisit');
const Patient = require('../models/Patient');
const NurseTask = require('../models/NurseTask');
const LabOrder = require('../models/LabOrder');

// ==========================================
// 1. HEALTH PACKAGE TEMPLATES (ADMIN CATALOG)
// ==========================================

// @route   POST /api/packages
// @desc    Create a new package template
// @access  Private (Admin)
router.post('/packages', auth, async (req, res) => {
  try {
    const { name, description, total_visits, validity_days, price, services } = req.body;
    
    if (!name || !total_visits || !validity_days || price === undefined) {
      return res.status(400).json({ success: false, message: 'Please provide name, total visits, validity days, and price.' });
    }

    const newPackage = new HealthPackage({
      clinicId: req.user?.clinicId || 'default',
      name,
      description,
      total_visits,
      validity_days,
      price,
      services: services || []
    });

    await newPackage.save();
    res.status(201).json({ success: true, message: 'Package template created successfully', data: newPackage });
  } catch (error) {
    console.error('Error creating package template:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   GET /api/packages
// @desc    List all package templates (both active and inactive)
// @access  Private
router.get('/packages', auth, async (req, res) => {
  try {
    const packages = await HealthPackage.find();
    res.json({ success: true, data: packages });
  } catch (error) {
    console.error('Error listing package templates:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/packages/:id
// @desc    Update a package template
// @access  Private (Admin)
router.put('/packages/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, total_visits, validity_days, price, services, is_active } = req.body;

    const healthPackage = await HealthPackage.findById(id);
    if (!healthPackage) {
      return res.status(404).json({ success: false, message: 'Package template not found' });
    }

    if (name !== undefined) healthPackage.name = name;
    if (description !== undefined) healthPackage.description = description;
    if (total_visits !== undefined) healthPackage.total_visits = total_visits;
    if (validity_days !== undefined) healthPackage.validity_days = validity_days;
    if (price !== undefined) healthPackage.price = price;
    if (services !== undefined) healthPackage.services = services;
    if (is_active !== undefined) healthPackage.is_active = is_active;

    await healthPackage.save();
    res.json({ success: true, message: 'Package template updated successfully', data: healthPackage });
  } catch (error) {
    console.error('Error updating package template:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ==========================================
// 2. PATIENT PACKAGE SUBSCRIPTIONS
// ==========================================

// @route   POST /api/patients/:id/packages
// @desc    Assign a package to a patient
// @access  Private
router.post('/patients/:id/packages', auth, async (req, res) => {
  try {
    const { id } = req.params; // patient_id
    const { package_id, start_date, amount_paid } = req.body;

    if (!package_id) {
      return res.status(400).json({ success: false, message: 'Package ID is required.' });
    }

    const patient = await Patient.findById(id);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const healthPackage = await HealthPackage.findById(package_id);
    if (!healthPackage || !healthPackage.is_active) {
      return res.status(404).json({ success: false, message: 'Active package template not found' });
    }

    const startDate = start_date ? new Date(start_date) : new Date();
    const expiryDate = new Date(startDate);
    expiryDate.setDate(expiryDate.getDate() + healthPackage.validity_days);

    const paid = 0; // Enforced 0 to ensure initial payment is processed through the billing cashier workflow
    const balance = healthPackage.price;
    const paymentStatus = 'pending';

    const patientPackage = new PatientPackage({
      clinicId: req.user?.clinicId || 'default',
      patient_id: id,
      package_id,
      purchased_date: startDate,
      expiry_date: expiryDate,
      total_visits: healthPackage.total_visits,
      visits_used: 0,
      visits_remaining: healthPackage.total_visits,
      status: 'active',
      payment_status: paymentStatus,
      amount_paid: paid,
      balance_due: balance
    });

    await patientPackage.save();

    // Create MedicalInvoice for health package subscription
    try {
      const MedicalInvoice = require('../models/MedicalInvoice');
      const invoiceNumber = await MedicalInvoice.generateInvoiceNumber();
      
      const invoiceData = {
        clinicId: patient.clinicId || req.user?.clinicId || 'default',
        invoiceNumber,
        patient: patient._id,
        patientId: patient.patientId,
        patientName: `${patient.firstName} ${patient.lastName}`.trim(),
        issueDate: startDate,
        dueDate: expiryDate,
        items: [{
          itemType: 'service',
          category: 'service',
          description: `Health Package Subscription: ${healthPackage.name}`,
          quantity: 1,
          unitPrice: healthPackage.price,
          total: healthPackage.price,
          notes: `Predefined package containing ${healthPackage.total_visits} visits, valid for ${healthPackage.validity_days} days.`
        }],
        subtotal: healthPackage.price,
        total: healthPackage.price,
        amountPaid: 0,
        balance: healthPackage.price,
        status: 'pending',
        paymentStatus: {
          current: 'unpaid',
          percentage: 0,
          lastUpdated: new Date()
        },
        createdBy: req.user._id,
        finalized: true,
        finalizedAt: new Date(),
        finalizedBy: req.user._id
      };



      const medicalInvoice = new MedicalInvoice(invoiceData);
      await medicalInvoice.save();
      console.log(`✅ [BILLING INTEGRATION] Created MedicalInvoice ${invoiceNumber} for health package subscription.`);
    } catch (billingErr) {
      console.error('❌ [BILLING INTEGRATION] Error creating invoice for package subscription:', billingErr);
    }

    res.status(201).json({ success: true, message: 'Package assigned to patient successfully', data: patientPackage });
  } catch (error) {
    console.error('Error assigning package to patient:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   GET /api/patient-packages
// @desc    Get all patient packages across the clinic
// @access  Private
router.get('/patient-packages', auth, async (req, res) => {
  try {
    const patientPackages = await PatientPackage.find()
      .populate('patient_id', 'firstName lastName patientId age gender contactNumber')
      .populate('package_id', 'name description price services')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, data: patientPackages });
  } catch (error) {
    console.error('Error fetching all patient packages:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   GET /api/patients/:id/packages
// @desc    Get all packages assigned to a specific patient
// @access  Private
router.get('/patients/:id/packages', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const patientPackages = await PatientPackage.find({ patient_id: id })
      .populate('package_id', 'name description price services');
    
    res.json({ success: true, data: patientPackages });
  } catch (error) {
    console.error('Error fetching patient packages:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   GET /api/patients/:id/packages/:pkgId
// @desc    Get single patient package + visit details
// @access  Private
router.get('/patients/:id/packages/:pkgId', auth, async (req, res) => {
  try {
    const { id, pkgId } = req.params;
    
    const patientPackage = await PatientPackage.findOne({ _id: pkgId, patient_id: id })
      .populate('package_id', 'name description price services');
    
    if (!patientPackage) {
      return res.status(404).json({ success: false, message: 'Subscribed package not found for this patient' });
    }

    const visits = await PackageVisit.find({ patient_package_id: pkgId })
      .sort({ visit_date: -1 })
      .populate('attended_by', 'firstName lastName');

    res.json({
      success: true,
      data: {
        package: patientPackage,
        visits
      }
    });
  } catch (error) {
    console.error('Error fetching package details:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ==========================================
// 3. VISIT RECORDING
// ==========================================

// @route   POST /api/patient-packages/:id/visits
// @desc    Record a new visit (consume 1 slot)
// @access  Private
router.post('/patient-packages/:id/visits', auth, async (req, res) => {
  try {
    const { id } = req.params; // patient_package_id
    const {
      visit_date,
      attended_by,
      blood_pressure_systolic,
      blood_pressure_diastolic,
      blood_sugar_fasting,
      blood_sugar_random,
      weight_kg,
      bmi,
      diagnosis_notes,
      medications_given,
      lab_results,
      next_visit_due_date,
      next_visit_notes,
      payment_collected,
      needs_consultation,
      needs_vitals,
      needs_lab,
      lab_services_ordered,
      assignedNurseId,
      assignedDoctorId,
      bypassSameDayWarning
    } = req.body;

    const patientPackage = await PatientPackage.findById(id);
    if (!patientPackage) {
      return res.status(404).json({ success: false, message: 'Patient package not found' });
    }

    // Expiry check
    if (patientPackage.status === 'active' && new Date(patientPackage.expiry_date) < new Date()) {
      patientPackage.status = 'expired';
      await patientPackage.save();
    }

    if (patientPackage.status !== 'active') {
      return res.status(400).json({ 
        success: false, 
        message: `Visit cannot be recorded. Package status is ${patientPackage.status.toUpperCase()}.` 
      });
    }

    if (patientPackage.visits_remaining <= 0) {
      return res.status(400).json({ success: false, message: 'Package visits have been fully consumed.' });
    }

    // Check same-day visit rule
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const sameDayVisit = await PackageVisit.findOne({
      patient_package_id: id,
      visit_date: { $gte: todayStart, $lte: todayEnd }
    });

    if (sameDayVisit && !bypassSameDayWarning) {
      return res.status(409).json({
        success: false,
        warning: 'same_day_visit',
        message: 'A visit has already been recorded for this package today.'
      });
    }

    // Vitals skipped soft warning check
    const hasVitals = blood_pressure_systolic || blood_pressure_diastolic || blood_sugar_fasting || blood_sugar_random || weight_kg || bmi;
    const vitalsWarning = !hasVitals ? 'Vitals were skipped for this visit.' : null;

    const visitNumber = patientPackage.visits_used + 1;
    const newVisit = new PackageVisit({
      clinicId: patientPackage.clinicId || 'default',
      patient_package_id: id,
      patient_id: patientPackage.patient_id,
      visit_date: visit_date || new Date(),
      visit_number: visitNumber,
      attended_by: attended_by || req.user._id,
      blood_pressure_systolic,
      blood_pressure_diastolic,
      blood_sugar_fasting,
      blood_sugar_random,
      weight_kg,
      bmi,
      diagnosis_notes,
      medications_given: medications_given || [],
      lab_results: lab_results || [],
      next_visit_due_date,
      next_visit_notes,
      payment_collected: payment_collected || 0,
      needs_consultation: !!needs_consultation,
      needs_vitals: !!needs_vitals,
      needs_lab: !!needs_lab,
      lab_services_ordered: lab_services_ordered || []
    });

    await newVisit.save();

    // Increment used visits, decrement remaining
    patientPackage.visits_used += 1;
    patientPackage.visits_remaining -= 1;

    // Completed check
    if (patientPackage.visits_remaining === 0) {
      patientPackage.status = 'completed';
    }

    // Apply installment payments
    if (payment_collected && payment_collected > 0) {
      patientPackage.amount_paid += parseFloat(payment_collected);
      patientPackage.balance_due = Math.max(0, patientPackage.balance_due - parseFloat(payment_collected));
      if (patientPackage.balance_due === 0) {
        patientPackage.payment_status = 'paid';
      } else {
        patientPackage.payment_status = 'partial';
      }

      // Update MedicalInvoice for the health package subscription
      try {
        const MedicalInvoice = require('../models/MedicalInvoice');
        const healthPackage = await HealthPackage.findById(patientPackage.package_id);
        if (healthPackage) {
          const descriptionStr = `Health Package Subscription: ${healthPackage.name}`;
          const invoice = await MedicalInvoice.findOne({
            patient: patientPackage.patient_id,
            'items.description': descriptionStr,
            clinicId: patientPackage.clinicId || 'default'
          });

          if (invoice) {
            if (invoice.balance > 0) {
              await invoice.addPaymentWithTracking({
                amount: parseFloat(payment_collected),
                method: 'cash',
                reference: `PKG-VISIT-${newVisit._id}-${Date.now()}`,
                notes: `Installment payment collected during package visit #${visitNumber}`,
                processedBy: req.user._id
              });
              console.log(`✅ [BILLING INTEGRATION] Updated MedicalInvoice ${invoice.invoiceNumber} with payment ${payment_collected} ETB.`);
            } else {
              console.log(`ℹ️ [BILLING INTEGRATION] MedicalInvoice ${invoice.invoiceNumber} is already fully paid.`);
            }
          } else {
            console.warn(`⚠️ [BILLING INTEGRATION] Invoice with description "${descriptionStr}" not found for patient.`);
          }
        }
      } catch (billingErr) {
        console.error('❌ [BILLING INTEGRATION] Error updating invoice for package visit payment:', billingErr);
      }
    }

    await patientPackage.save();

    // Route dynamically to Doctor / Nurse / Lab Dashboard Queues
    const patient = await Patient.findById(patientPackage.patient_id);
    if (patient) {
      if (assignedNurseId) patient.assignedNurseId = assignedNurseId;
      if (assignedDoctorId) patient.assignedDoctorId = assignedDoctorId;
      
      // Update patient status to waiting if vitals are needed, or scheduled if consultation is needed
      if (needs_vitals) {
        patient.status = 'waiting';
      } else if (needs_consultation) {
        patient.status = 'scheduled';
      }
      
      await patient.save();

      // Create NurseTask for Vitals Sign
      if (needs_vitals) {
        const nurseTask = new NurseTask({
          patientId: patient._id,
          patientName: `${patient.firstName} ${patient.lastName}`,
          taskType: 'VITAL_SIGNS',
          description: `Vital signs check for ${patient.firstName} ${patient.lastName} (Package: Visit ${visitNumber})`,
          status: 'PENDING',
          priority: 'MEDIUM',
          assignedBy: req.user._id,
          assignedByName: `${req.user.firstName || 'Staff'} ${req.user.lastName || ''}`.trim(),
          assignedTo: assignedNurseId,
          dueDate: new Date(),
          notes: `Vitals check needed for health package visit. Please record temperature, BP, blood sugar, weight and BMI.`,
          metadata: { packageVisitId: newVisit._id }
        });
        await nurseTask.save();
      }

      // Create LabOrders
      if (needs_lab && lab_services_ordered && lab_services_ordered.length > 0) {
        for (const testName of lab_services_ordered) {
          const labOrder = new LabOrder({
            patientId: patient._id,
            orderingDoctorId: assignedDoctorId || req.user._id,
            createdBy: req.user._id,
            source: 'reception',
            testName,
            status: 'Ordered',
            paymentStatus: 'paid',
            orderDateTime: new Date(),
            notes: `Ordered under package visit #${visitNumber}`
          });
          await labOrder.save();
        }
      }
    }

    res.json({
      success: true,
      message: 'Visit consumed and recorded successfully.',
      vitalsWarning,
      data: newVisit
    });

  } catch (error) {
    console.error('Error recording package visit:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   GET /api/patient-packages/:id/visits
// @desc    List all visits for a patient package
// @access  Private
router.get('/patient-packages/:id/visits', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const visits = await PackageVisit.find({ patient_package_id: id })
      .sort({ visit_date: -1 })
      .populate('attended_by', 'firstName lastName');
    res.json({ success: true, data: visits });
  } catch (error) {
    console.error('Error fetching visits list:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/patient-packages/:id/visits/:vid
// @desc    Edit a visit record (e.g. from nurse/doctor updating vitals/notes later)
// @access  Private
router.put('/patient-packages/:id/visits/:vid', auth, async (req, res) => {
  try {
    const { id, vid } = req.params;
    const updateData = req.body;

    // Filter out fields that shouldn't be edited directly
    delete updateData.patient_package_id;
    delete updateData.patient_id;
    delete updateData.visit_number;
    delete updateData.clinicId;

    const updatedVisit = await PackageVisit.findOneAndUpdate(
      { _id: vid, patient_package_id: id },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedVisit) {
      return res.status(404).json({ success: false, message: 'Visit record not found' });
    }

    res.json({ success: true, message: 'Visit record updated successfully', data: updatedVisit });
  } catch (error) {
    console.error('Error updating visit record:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ==========================================
// 4. REPORTS & UTILIZATION ANALYTICS
// ==========================================

// @route   GET /api/reports/packages/utilization
// @desc    Admin report: visits used vs total across packages
// @access  Private (Admin)
router.get('/reports/packages/utilization', auth, async (req, res) => {
  try {
    const clinicId = req.user?.clinicId || 'default';
    
    // Aggregate patient package data
    const utilization = await PatientPackage.aggregate([
      { $match: { clinicId } },
      {
        $group: {
          _id: '$package_id',
          totalAssigned: { $sum: 1 },
          totalVisitsAllocated: { $sum: '$total_visits' },
          totalVisitsConsumed: { $sum: '$visits_used' },
          activeCount: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          completedCount: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          expiredCount: { $sum: { $cond: [{ $eq: ['$status', 'expired'] }, 1, 0] } }
        }
      },
      {
        $lookup: {
          from: 'healthpackages',
          localField: '_id',
          foreignField: '_id',
          as: 'details'
        }
      },
      { $unwind: '$details' },
      {
        $project: {
          _id: 1,
          name: '$details.name',
          totalAssigned: 1,
          totalVisitsAllocated: 1,
          totalVisitsConsumed: 1,
          activeCount: 1,
          completedCount: 1,
          expiredCount: 1,
          utilizationRate: {
            $cond: [
              { $gt: ['$totalVisitsAllocated', 0] },
              { $multiply: [{ $divide: ['$totalVisitsConsumed', '$totalVisitsAllocated'] }, 100] },
              0
            ]
          }
        }
      }
    ]);

    res.json({ success: true, data: utilization });
  } catch (error) {
    console.error('Error generating utilization report:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   GET /api/reports/patients/:id/vitals
// @desc    Vitals trend per patient per package
// @access  Private
router.get('/reports/patients/:id/vitals', auth, async (req, res) => {
  try {
    const { id } = req.params; // patient_id
    const { patient_package_id } = req.query;

    const query = { patient_id: id };
    if (patient_package_id) {
      query.patient_package_id = patient_package_id;
    }

    const visits = await PackageVisit.find(query)
      .sort({ visit_date: 1 })
      .select('visit_date visit_number blood_pressure_systolic blood_pressure_diastolic blood_sugar_fasting blood_sugar_random weight_kg bmi');

    // Format vitals trend for line charting
    const trendData = visits.map(v => ({
      visit_number: `Visit ${v.visit_number}`,
      date: v.visit_date.toLocaleDateString(),
      systolic: v.blood_pressure_systolic || null,
      diastolic: v.blood_pressure_diastolic || null,
      sugar_fasting: v.blood_sugar_fasting || null,
      sugar_random: v.blood_sugar_random || null,
      weight: v.weight_kg || null,
      bmi: v.bmi || null
    }));

    res.json({ success: true, data: trendData });
  } catch (error) {
    console.error('Error generating vitals trend report:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
