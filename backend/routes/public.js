const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const HealthPackage = require('../models/HealthPackage');
const Patient = require('../models/Patient');
const PatientCard = require('../models/PatientCard');
const Appointment = require('../models/Appointment');
const User = require('../models/User');

// GET /api/public/doctors - Get active doctors for booking
router.get('/doctors', async (req, res) => {
  try {
    const doctors = await User.find({ role: 'doctor', isActive: true })
      .select('firstName lastName specialization')
      .sort({ firstName: 1 })
      .lean();

    const formatted = doctors.map(doc => ({
      id: doc._id,
      firstName: doc.firstName || '',
      lastName: doc.lastName || '',
      specialization: doc.specialization || 'General Practitioner',
    }));

    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (error) {
    console.error('Error fetching public doctors:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch doctors', error: error.message });
  }
});

// GET /api/public/services - Get all active services
router.get('/services', async (req, res) => {
  try {
    const services = await Service.find({ isActive: true }).sort({ name: 1 }).lean();
    res.json({ success: true, count: services.length, data: services });
  } catch (error) {
    console.error('Error fetching public services:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch services', error: error.message });
  }
});

// GET /api/public/packages - Get all active health packages
router.get('/packages', async (req, res) => {
  try {
    const packages = await HealthPackage.find({ is_active: true }).sort({ name: 1 }).lean();
    res.json({ success: true, count: packages.length, data: packages });
  } catch (error) {
    console.error('Error fetching public health packages:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch health packages', error: error.message });
  }
});

// POST /api/public/find-patient - Check if patient exists
router.post('/find-patient', async (req, res) => {
  try {
    const { patientId, contactNumber } = req.body;
    if (!patientId || !contactNumber) {
      return res.status(400).json({ success: false, message: 'Patient ID and Contact Number are required.' });
    }

    const patient = await Patient.findOne({
      patientId: patientId.trim(),
      contactNumber: contactNumber.trim()
    }).lean();

    if (!patient) {
      return res.status(404).json({ success: false, message: 'No patient matches the provided ID and Contact Number.' });
    }

    res.json({ success: true, data: patient });
  } catch (error) {
    console.error('Error finding patient:', error);
    res.status(500).json({ success: false, message: 'Error checking patient profile', error: error.message });
  }
});

// POST /api/public/register-patient - Register new patient and generate card
router.post('/register-patient', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      gender,
      age,
      dateOfBirth,
      contactNumber,
      email,
      bloodType,
      allergies,
      cardType
    } = req.body;

    if (!firstName || !lastName || !gender || !contactNumber) {
      return res.status(400).json({ success: false, message: 'First name, last name, gender, and contact number are required.' });
    }

    // 1. Create Patient
    const parsedAllergies = allergies
      ? String(allergies).split(',').map(a => ({ allergen: a.trim(), severity: 'mild' }))
      : [];

    const patient = new Patient({
      clinicId: 'new-life',
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      gender,
      age: age ? Number(age) : undefined,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      contactNumber: contactNumber.trim(),
      email: email ? email.trim() : undefined,
      bloodType: bloodType || undefined,
      allergies: parsedAllergies,
      status: 'Outpatient'
    });

    await patient.save();

    // 2. Create Patient Card
    const cardCount = await PatientCard.countDocuments();
    const cardNumber = `CARD${String(cardCount + 1).padStart(6, '0')}`;
    const now = new Date();
    const expiryDate = new Date(now);
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    let amountPaid = 0;
    let benefits = { discountPercentage: 0, freeConsultations: 0, priorityAppointments: false, freeLabTests: 0 };

    if (cardType === 'Basic') {
      amountPaid = 500;
      benefits = { discountPercentage: 5, freeConsultations: 1, priorityAppointments: false, freeLabTests: 0 };
    } else if (cardType === 'Premium') {
      amountPaid = 1200;
      benefits = { discountPercentage: 15, freeConsultations: 3, priorityAppointments: true, freeLabTests: 0 };
    } else if (cardType === 'VIP') {
      amountPaid = 2500;
      benefits = { discountPercentage: 25, freeConsultations: 999, priorityAppointments: true, freeLabTests: 5 };
    } else if (cardType === 'Family') {
      amountPaid = 4000;
      benefits = { discountPercentage: 20, freeConsultations: 5, priorityAppointments: true, freeLabTests: 2 };
    }

    const patientCard = new PatientCard({
      patient: patient._id,
      cardNumber,
      type: cardType || 'Basic',
      status: 'Active',
      issuedDate: now,
      expiryDate,
      lastPaymentDate: now,
      amountPaid,
      benefits
    });

    await patientCard.save();

    res.status(201).json({
      success: true,
      message: 'Patient registered and card generated successfully.',
      data: {
        patient,
        patientCard
      }
    });
  } catch (error) {
    console.error('Error registering public patient:', error);
    res.status(500).json({ success: false, message: 'Patient registration failed', error: error.message });
  }
});

// POST /api/public/book-appointment - Schedule appointment (registers patient if new)
router.post('/book-appointment', async (req, res) => {
  try {
    const { isNewPatient, patientData, appointmentData } = req.body;

    if (isNewPatient && (!patientData || !patientData.firstName || !patientData.lastName || !patientData.contactNumber)) {
      return res.status(400).json({ success: false, message: 'New patient details (first name, last name, and contact) are required.' });
    }
    if (!appointmentData || !appointmentData.appointmentDateTime || !appointmentData.type) {
      return res.status(400).json({ success: false, message: 'Appointment details (date/time, type) are required.' });
    }

    let patientId;
    let patientDoc;

    if (isNewPatient) {
      patientDoc = new Patient({
        clinicId: 'new-life',
        firstName: patientData.firstName.trim(),
        lastName: patientData.lastName.trim(),
        gender: patientData.gender || 'other',
        age: patientData.age ? Number(patientData.age) : undefined,
        dateOfBirth: patientData.dateOfBirth ? new Date(patientData.dateOfBirth) : undefined,
        contactNumber: patientData.contactNumber.trim(),
        email: patientData.email ? patientData.email.trim() : undefined,
        status: 'Outpatient'
      });
      await patientDoc.save();
      patientId = patientDoc._id;
    } else {
      patientId = appointmentData.patientId;
      patientDoc = await Patient.findById(patientId);
      if (!patientDoc) {
        return res.status(404).json({ success: false, message: 'Patient profile not found.' });
      }
    }

    // Book appointment
    const appointment = new Appointment({
      clinicId: 'new-life',
      patientId,
      doctorId: appointmentData.doctorId || undefined,
      appointmentDateTime: new Date(appointmentData.appointmentDateTime),
      durationMinutes: appointmentData.durationMinutes ? Number(appointmentData.durationMinutes) : 30,
      reason: appointmentData.reason ? appointmentData.reason.trim() : 'Self-scheduled visit',
      type: appointmentData.type,
      status: 'Scheduled',
      notes: 'Self-booked via online portal'
    });

    await appointment.save();

    res.status(201).json({
      success: true,
      message: 'Appointment scheduled successfully.',
      data: {
        appointment,
        patient: {
          _id: patientDoc._id,
          patientId: patientDoc.patientId,
          firstName: patientDoc.firstName,
          lastName: patientDoc.lastName,
          contactNumber: patientDoc.contactNumber
        }
      }
    });
  } catch (error) {
    console.error('Error booking public appointment:', error);
    res.status(500).json({ success: false, message: 'Failed to schedule appointment', error: error.message });
  }
});

module.exports = router;
