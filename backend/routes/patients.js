const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const mongoose = require('mongoose'); // Added for mongoose.Types.ObjectId.isValid
const User = require('../models/User'); // Import the User model
const MedicalRecord = require('../models/MedicalRecord');
const telegramService = require('../services/telegramService'); // Import Telegram service

/** Patient may only be marked 'completed' when they have at least one finalized medical record (not when only lab order or medication was sent). */
async function patientHasFinalizedMedicalRecord(patientId) {
  const FINALIZED = ['Finalized', 'finalized', 'Completed', 'completed', 'Closed', 'closed', 'Archived', 'archived'];
  const count = await MedicalRecord.countDocuments({
    $or: [{ patient: patientId }, { patientId }],
    status: { $in: FINALIZED }
  });
  return count > 0;
}

// @route   GET /api/patients
// @desc    Get all patients (excluding completed ones by default)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const Patient = require('../models/Patient');
    const { includeCompleted = false } = req.query;
    
    // Build query - exclude completed patients by default
    const query = { isActive: true };
    if (includeCompleted !== 'true') {
      query.status = { $ne: 'completed' };
    }
    
    const patients = await Patient.find(query).populate('cardType').sort({ createdAt: -1 });
    res.json({
      success: true,
      data: patients
    });
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/patients/demographics
// @desc    Get patient demographics for analytics (population stats, gender, age, monthly trends)
// @access  Private
router.get('/demographics', auth, async (req, res) => {
  try {
    const Patient = require('../models/Patient');
    const { timeRange = '1year' } = req.query;

    // All patients including completed (true population analytics)
    const patients = await Patient.find({ isActive: true })
      .select('firstName lastName gender dateOfBirth age contactNumber email createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const now = new Date();
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth(), 1);

    const newThisMonth = patients.filter(p => {
      const d = p.createdAt || p.registrationDate;
      return d && new Date(d) >= oneMonthAgo;
    }).length;

    // Age groups and average age (use age if available, else calculate from dateOfBirth)
    const ageGroups = [
      { name: '0–18', value: 0, color: '#3b82f6' },
      { name: '19–35', value: 0, color: '#10b981' },
      { name: '36–50', value: 0, color: '#f59e0b' },
      { name: '51–65', value: 0, color: '#ef4444' },
      { name: '65+', value: 0, color: '#8b5cf6' },
    ];
    let totalAge = 0, withAge = 0;

    patients.forEach(p => {
      let age = null;
      if (typeof p.age === 'number' && p.age >= 0) {
        age = p.age;
      } else if (p.dateOfBirth) {
        age = Math.floor((now.getTime() - new Date(p.dateOfBirth).getTime()) / (365.25 * 86400000));
      }
      if (age !== null && age >= 0 && age <= 120) {
        totalAge += age;
        withAge++;
        if (age <= 18) ageGroups[0].value++;
        else if (age <= 35) ageGroups[1].value++;
        else if (age <= 50) ageGroups[2].value++;
        else if (age <= 65) ageGroups[3].value++;
        else ageGroups[4].value++;
      }
    });

    const averageAge = withAge > 0 ? Math.round(totalAge / withAge) : 0;

    // Gender distribution (model uses lowercase: male, female, other)
    const genderCounts = {};
    patients.forEach(p => {
      const g = (p.gender || 'other').toLowerCase();
      const label = g === 'male' ? 'male' : g === 'female' ? 'female' : 'other';
      genderCounts[label] = (genderCounts[label] || 0) + 1;
    });
    const GENDER_COLORS = ['#3b82f6', '#ec4899', '#94a3b8', '#f59e0b'];
    const genderDistribution = Object.entries(genderCounts).map(([name, value], i) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: GENDER_COLORS[i % GENDER_COLORS.length],
    }));

    // Monthly registration trend - filter by timeRange (use YYYY-MM for uniqueness across years)
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthsBack = timeRange === '3months' ? 3 : timeRange === '6months' ? 6 : 12;
    const startDate = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);

    const monthlyCounts = {}; // key: 'YYYY-MM', value: count
    patients.forEach(p => {
      const d = p.createdAt || p.registrationDate;
      if (!d) return;
      const regDate = new Date(d);
      if (regDate < startDate) return;
      const key = `${regDate.getFullYear()}-${String(regDate.getMonth() + 1).padStart(2, '0')}`;
      monthlyCounts[key] = (monthlyCounts[key] || 0) + 1;
    });

    // Build monthlyGrowth array in order for selected range
    const monthlyGrowth = [];
    for (let i = 0; i < monthsBack; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyGrowth.push({
        month: `${monthLabels[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`,
        newPatients: monthlyCounts[key] || 0,
      });
    }

    // Recent patients for table
    const recentPatients = patients.slice(0, 10).map(p => ({
      _id: p._id,
      firstName: p.firstName,
      lastName: p.lastName,
      email: p.email,
      phone: p.contactNumber,
      dateOfBirth: p.dateOfBirth,
      age: typeof p.age === 'number' ? p.age : null,
      gender: (p.gender || '').charAt(0).toUpperCase() + (p.gender || '').slice(1),
      registrationDate: p.createdAt,
    }));

    res.json({
      success: true,
      data: {
        totalPatients: patients.length,
        newPatientsThisMonth: newThisMonth,
        averageAge,
        ageGroups,
        genderDistribution,
        monthlyGrowth,
        recentPatients,
      },
    });
  } catch (error) {
    console.error('Error fetching patient demographics:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// @route   POST /api/patients
// @desc    Create a new patient
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const Patient = require('../models/Patient');
    
    // Sanitize the request body to handle empty strings for array fields
    const sanitizedData = { ...req.body };
    
    // Handle medicalHistory field - convert empty string to empty array
    if (sanitizedData.medicalHistory === '' || sanitizedData.medicalHistory === null || sanitizedData.medicalHistory === undefined) {
      sanitizedData.medicalHistory = [];
    }
    
    // Handle allergies field - convert empty string to empty array
    if (sanitizedData.allergies === '' || sanitizedData.allergies === null || sanitizedData.allergies === undefined) {
      sanitizedData.allergies = [];
    }
    
    // Handle other array fields that might be empty strings
    const arrayFields = ['medications', 'treatments', 'woundCare', 'imaging', 'doctorOrders'];
    arrayFields.forEach(field => {
      if (sanitizedData[field] === '' || sanitizedData[field] === null || sanitizedData[field] === undefined) {
        sanitizedData[field] = [];
      }
    });
    
    // Handle address field - ensure it's an object
    if (typeof sanitizedData.address === 'string' && sanitizedData.address.trim() === '') {
      sanitizedData.address = {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: ''
      };
    }
    
    // Handle cardType field - convert empty string to null if not provided or invalid
    // Frontend sends selectedCardTypeId, so map it to cardType
    console.log('🔍 [DEBUG] Original data received:', JSON.stringify(req.body, null, 2));
    
    if (sanitizedData.selectedCardTypeId) {
      console.log('🔍 [DEBUG] Found selectedCardTypeId:', sanitizedData.selectedCardTypeId);
      sanitizedData.cardType = sanitizedData.selectedCardTypeId;
      delete sanitizedData.selectedCardTypeId;
      console.log('🔍 [DEBUG] Mapped to cardType:', sanitizedData.cardType);
    }
    
    if (sanitizedData.cardType === '' || sanitizedData.cardType === null || sanitizedData.cardType === undefined) {
      console.log('🔍 [DEBUG] No cardType provided, setting to null');
      sanitizedData.cardType = null;
    } else if (typeof sanitizedData.cardType === 'string' && !mongoose.Types.ObjectId.isValid(sanitizedData.cardType)) {
      // Optionally, handle cases where a non-empty but invalid ObjectId string is sent
      console.warn('🔍 [DEBUG] Invalid cardType provided, setting to null:', sanitizedData.cardType);
      sanitizedData.cardType = null;
    } else {
      console.log('🔍 [DEBUG] Valid cardType found:', sanitizedData.cardType);
    }

    // Ensure new registrations do not appear in the patient queue until billing payment is processed
    if (
      !sanitizedData.status ||
      (typeof sanitizedData.status === 'string' && sanitizedData.status.toLowerCase() === 'waiting')
    ) {
      sanitizedData.status = 'scheduled';
    }
    
    // Duplicate check: same person by name, email, or Fayda ID only (phone is not used—families share numbers)
    const firstName = (sanitizedData.firstName || '').trim();
    const lastName = (sanitizedData.lastName || '').trim();
    const email = (sanitizedData.email || '').trim().toLowerCase();
    const faydaId = (sanitizedData.faydaId || '').trim();
    
    const duplicateConditions = [];
    if (firstName && lastName) {
      duplicateConditions.push({
        firstName: new RegExp('^' + firstName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i'),
        lastName: new RegExp('^' + lastName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i')
      });
    }
    if (email) {
      duplicateConditions.push({ email: email });
    }
    if (faydaId) {
      duplicateConditions.push({ faydaId: new RegExp('^' + faydaId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') });
    }
    
    if (duplicateConditions.length > 0) {
      const existing = await Patient.findOne({
        isActive: true,
        $or: duplicateConditions
      }).select('firstName lastName contactNumber email patientId _id').lean();
      
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'A patient with the same name, email, or Fayda ID is already registered.',
          code: 'PATIENT_DUPLICATE',
          existingPatient: {
            _id: existing._id,
            patientId: existing.patientId,
            firstName: existing.firstName,
            lastName: existing.lastName,
            contactNumber: existing.contactNumber,
            email: existing.email
          }
        });
      }
    }
    
    console.log('Creating patient with sanitized data:', sanitizedData);
    
    const patient = new Patient(sanitizedData);
    await patient.save();

    // Send Telegram notification to assigned doctor for new patient registration
    try {
      await telegramService.initialize(); // Ensure Telegram service is initialized

      if (telegramService.isBotInitialized() && patient.assignedDoctorId) {
        // Check if the assigned doctor has Telegram notifications enabled
        const User = require('../models/User');
        const assignedDoctor = await User.findById(patient.assignedDoctorId);

        if (assignedDoctor && assignedDoctor.telegramNotificationsEnabled && assignedDoctor.telegramChatId) {
          // Prepare card type information for notification
          let cardTypeInfo = null;
          if (sanitizedData.cardType) {
            const CardType = require('../models/CardType');
            const selectedCardType = await CardType.findById(sanitizedData.cardType);
            if (selectedCardType) {
              cardTypeInfo = {
                name: selectedCardType.name,
                price: selectedCardType.price
              };
            }
          }

          // Send personalized notification to the assigned doctor
          const doctorNotification = await telegramService.sendPatientRegistrationNotificationToDoctor(
            patient.toObject(),
            assignedDoctor,
            cardTypeInfo
          );

          if (doctorNotification.success) {
            console.log(`📱 Telegram notification sent to Dr. ${assignedDoctor.firstName} ${assignedDoctor.lastName} for new patient registration`);
          }
        }
      }
    } catch (telegramError) {
      console.error('❌ Error sending Telegram notification to doctor:', telegramError);
      // Don't fail patient creation if Telegram notification fails
    }

    // Create automatic daily consolidated invoice for the patient
    try {
      let registrationAmount = 0; // No base registration fee
      let cardTypeFee = 0;
      let cardTypeName = '';
      
      // If a card type is selected, get its price
      console.log('🔍 [DEBUG] Checking for cardType in sanitizedData:', sanitizedData.cardType);
      if (sanitizedData.cardType) {
        console.log('🔍 [DEBUG] CardType found, looking up in database...');
        const CardType = require('../models/CardType');
        const selectedCardType = await CardType.findById(sanitizedData.cardType);
        console.log('🔍 [DEBUG] Database lookup result:', selectedCardType);
        if (selectedCardType) {
          cardTypeFee = selectedCardType.price;
          cardTypeName = selectedCardType.name;
          registrationAmount = cardTypeFee; // Only card type fee, no base fee
          console.log('🔍 [DEBUG] Card type details - Name:', cardTypeName, 'Price:', cardTypeFee, 'Total Amount:', registrationAmount);
        } else {
          console.log('🔍 [DEBUG] CardType not found in database for ID:', sanitizedData.cardType);
        }
      } else {
        console.log('🔍 [DEBUG] No cardType provided, no fee charged');
      }
      
      // Use billing service to create or get daily consolidated invoice
      const billingService = require('../services/billingService');
      
      // Create invoice items array - only include card type if selected
      const invoiceItems = [];
      
      // Add card type fee if a card was selected
      if (cardTypeFee > 0) {
        invoiceItems.push({
          itemType: 'card',
          category: 'card',
          description: `${cardTypeName} patient card membership`,
          quantity: 1,
          unitPrice: cardTypeFee,
          totalPrice: cardTypeFee,
          total: cardTypeFee,
          metadata: {
            cardTypeId: sanitizedData.cardType,
            cardTypeName: cardTypeName,
            patientId: patient._id
          },
          addedAt: new Date(),
          addedBy: req.user._id
        });
      }
      
      // Create or get daily consolidated invoice
      const invoiceData = {
        patient: patient._id,
        items: invoiceItems,
        serviceType: 'card',
        notes: `Daily consolidated invoice for ${patient.firstName} ${patient.lastName}${cardTypeName ? ` with ${cardTypeName} card` : ''} - Created on registration`
      };
      
      const dailyInvoice = await billingService.createOrUpdateConsolidatedInvoice(invoiceData, req.user._id);
      console.log(`✅ Daily consolidated invoice created/updated: ${dailyInvoice.invoiceNumber} for patient ${patient._id}`);
      
      // Add invoice reference to patient
      patient.registrationInvoiceId = dailyInvoice._id;
      await patient.save();
      
    } catch (invoiceError) {
      console.error('❌ Error creating daily consolidated invoice:', invoiceError);
      // Don't fail patient creation if invoice creation fails
    }
    
    res.status(201).json({
      success: true,
      data: patient
    });
  } catch (error) {
    console.error('Error creating patient:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/patients/search
// @desc    Search patients by name or patient ID
// @access  Private
router.get('/search', auth, async (req, res) => {
  try {
    const Patient = require('../models/Patient');
    const { q } = req.query;
    
    if (!q || q.trim().length < 1) {
      return res.json({
        success: true,
        data: []
      });
    }
    
    const searchTerm = q.trim();
    console.log('🔍 [Patient Search] Searching for:', searchTerm);
    
    // Create search query
    const searchQuery = {
      $or: [
        { firstName: { $regex: searchTerm, $options: 'i' } },
        { lastName: { $regex: searchTerm, $options: 'i' } },
        { patientId: { $regex: searchTerm, $options: 'i' } },
        { contactNumber: { $regex: searchTerm, $options: 'i' } },
        { 
          $expr: {
            $regexMatch: {
              input: { $concat: ['$firstName', ' ', '$lastName'] },
              regex: searchTerm,
              options: 'i'
            }
          }
        }
      ]
    };
    
    const patients = await Patient.find(searchQuery)
      .select('firstName lastName patientId age gender contactNumber cardType cardStatus cardIssueDate cardExpiryDate')
      .populate('cardType', 'name price validityMonths description')
      .limit(20)
      .lean()
      .sort({ firstName: 1, lastName: 1 });
    
    console.log('✅ [Patient Search] Found', patients.length, 'patients');
    
    res.json({
      success: true,
      data: patients
    });
    
  } catch (error) {
    console.error('❌ [Patient Search] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during patient search',
      error: error.message
    });
  }
});

// @route   GET /api/patients/completed
// @desc    Get completed patients only
// @access  Private
router.get('/completed', auth, async (req, res) => {
  try {
    const Patient = require('../models/Patient');
    const { page = 1, limit = 50, search = '', dateFrom, dateTo } = req.query;
    const skip = (page - 1) * limit;
    
    // Build query for completed patients only
    const query = {
      status: 'completed',
      isActive: true
    };
    
    // Add date range filter if provided
    if (dateFrom || dateTo) {
      query.lastUpdated = {};
      if (dateFrom) {
        query.lastUpdated.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        query.lastUpdated.$lte = new Date(dateTo);
      }
    }
    
    // Add search functionality
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { patientId: searchRegex },
        { contactNumber: searchRegex }
      ];
    }
    
    // Get completed patients with pagination
    const patients = await Patient.find(query)
      .populate('assignedDoctorId', 'firstName lastName')
      .populate('assignedNurseId', 'firstName lastName')
      .populate('completedBy', 'firstName lastName')
      .sort({ lastUpdated: -1, completedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const totalPatients = await Patient.countDocuments(query);
    
    res.json({
      success: true,
      data: patients,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalPatients / limit),
        totalPatients,
        hasNextPage: page < Math.ceil(totalPatients / limit),
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching completed patients:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/patients/quick-load
// @desc    Get all patients with optimized loading (no pagination) and payment status
// @access  Private
router.get('/quick-load', auth, async (req, res) => {
  try {
    const Patient = require('../models/Patient');
    const MedicalInvoice = require('../models/MedicalInvoice');
    const limit = parseInt(req.query.limit) || 1000;
    const search = req.query.search || req.query.q || '';
    
    // Get all patients (excluding completed by default)
    const query = { isActive: true };
    if (req.query.includeCompleted !== 'true') {
      query.status = { $ne: 'completed' };
    }
    
    // Add search functionality - when searching, search ALL patients in database
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { patientId: searchRegex },
        { contactNumber: searchRegex },
        { 
          $expr: {
            $regexMatch: {
              input: { $concat: ['$firstName', ' ', '$lastName'] },
              regex: search.trim(),
              options: 'i'
            }
          }
        }
      ];
    }
    
    const patients = await Patient.find(query)
      .populate('cardType', 'name price validityMonths description')
      .select('firstName lastName patientId age gender contactNumber status department priority createdAt lastUpdated registrationDate cardType cardIssueDate cardExpiryDate cardStatus vitals assignedNurseId assignedDoctorId registrationInvoiceId')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    
    if (patients.length === 0) {
      return res.json({
        success: true,
        patients: [],
        currentPage: 1,
        totalPages: 1,
        totalPatients: 0
      });
    }
    
    // Extract patient IDs for batch querying
    const patientIds = patients.map(patient => patient._id);

    // Get unpaid invoices (pending and overdue)
    const unpaidInvoices = await MedicalInvoice.find({
      patient: { $in: patientIds },
      status: { $in: ['pending', 'overdue'] }
    })
    .select('patient status balance total')
    .lean();

    // Also get partial invoices to check if they have remaining balance
    const partialInvoices = await MedicalInvoice.find({
      patient: { $in: patientIds },
      status: { $in: ['partial', 'partially_paid'] }
    })
    .select('patient status balance total')
    .lean();

    // Only consider partial invoices as "unpaid" if they have remaining balance
    const partialWithBalance = partialInvoices.filter(invoice => (invoice.balance || 0) > 0);

    // Combine unpaid and partial invoices with balance
    const allUnpaidInvoices = [...unpaidInvoices, ...partialWithBalance];

    // Create a map of patient IDs to their unpaid invoices
    const patientUnpaidInvoicesMap = {};
    allUnpaidInvoices.forEach(invoice => {
      const patientId = invoice.patient.toString();
      if (!patientUnpaidInvoicesMap[patientId]) {
        patientUnpaidInvoicesMap[patientId] = [];
      }
      patientUnpaidInvoicesMap[patientId].push(invoice);
    });

    // Get active service requests (pending and in-progress)
    let activeServiceRequests = [];
    try {
      const ServiceRequest = require('../models/ServiceRequest');
      activeServiceRequests = await ServiceRequest.find({
        patient: { $in: patientIds },
        status: { $in: ['pending', 'in-progress'] }
      })
      .populate('service', 'name category price')
      .populate('assignedNurse', 'firstName lastName')
      .populate('assignedDoctor', 'firstName lastName')
      .lean();
    } catch (serviceRequestError) {
      console.warn('Could not load ServiceRequest model:', serviceRequestError.message);
      activeServiceRequests = [];
    }

    // Create a map of patient IDs to their active service requests
    const patientServiceRequestsMap = {};
    activeServiceRequests.forEach(sr => {
      const patientId = sr.patient.toString();
      if (!patientServiceRequestsMap[patientId]) {
        patientServiceRequestsMap[patientId] = [];
      }
      patientServiceRequestsMap[patientId].push(sr);
    });

    // Check which patients have a paid card using ALL possible sources:
    // 1. PatientCard collection (amountPaid > 0, status Active/Grace)
    // 2. MedicalInvoice with a 'card' category item that is fully paid (status: 'paid')
    // 3. Patient.cardIssueDate set (legacy)
    const patientCardPaidSet = new Set();
    try {
      // Source 1: PatientCard records
      const PatientCard = require('../models/PatientCard');
      const paidCards = await PatientCard.find({
        patient: { $in: patientIds },
        $or: [
          { status: 'Active', amountPaid: { $gt: 0 } },
          { status: 'Grace', amountPaid: { $gt: 0 } }
        ]
      }).select('patient status amountPaid').lean();
      paidCards.forEach(card => patientCardPaidSet.add(card.patient.toString()));

      // Source 2: MedicalInvoice with paid card items
      // This covers the case where card payment is recorded as an invoice (most common flow)
      const paidCardInvoices = await MedicalInvoice.find({
        patient: { $in: patientIds },
        status: 'paid',
        'items.category': 'card'
      }).select('patient status items').lean();
      paidCardInvoices.forEach(inv => {
        // Confirm at least one item is a card item
        const hasCardItem = inv.items && inv.items.some(item => item.category === 'card');
        if (hasCardItem) {
          patientCardPaidSet.add(inv.patient.toString());
        }
      });

      // Also check partially-paid card invoices where balance is 0 (fully settled)
      const partialCardInvoices = await MedicalInvoice.find({
        patient: { $in: patientIds },
        status: { $in: ['partial', 'partially_paid'] },
        balance: 0,
        'items.category': 'card'
      }).select('patient status balance items').lean();
      partialCardInvoices.forEach(inv => {
        const hasCardItem = inv.items && inv.items.some(item => item.category === 'card');
        if (hasCardItem && (inv.balance === 0)) {
          patientCardPaidSet.add(inv.patient.toString());
        }
      });

      // Source 3: Check registrationInvoiceId — if the patient's registration invoice is paid,
      // the card fee was collected at registration
      const registrationInvoiceIds = patients
        .filter(p => p.registrationInvoiceId)
        .map(p => p.registrationInvoiceId);

      if (registrationInvoiceIds.length > 0) {
        const paidRegInvoices = await MedicalInvoice.find({
          _id: { $in: registrationInvoiceIds },
          status: 'paid'
        }).select('_id patient').lean();

        // Build a map from invoiceId -> patientId
        const invoiceToPatientMap = {};
        patients.forEach(p => {
          if (p.registrationInvoiceId) {
            invoiceToPatientMap[p.registrationInvoiceId.toString()] = p._id.toString();
          }
        });

        paidRegInvoices.forEach(inv => {
          const patId = invoiceToPatientMap[inv._id.toString()];
          if (patId) patientCardPaidSet.add(patId);
        });
      }

    } catch (cardErr) {
      console.warn('Could not check card payment status:', cardErr.message);
    }

    // Patients who have an unpaid invoice that includes a card item (real "card payment required")
    const patientIdsWithUnpaidCardInvoice = new Set();
    try {
      const unpaidCardInvoices = await MedicalInvoice.find({
        patient: { $in: patientIds },
        $or: [
          { status: { $in: ['pending', 'overdue'] } },
          { status: { $in: ['partial', 'partially_paid'] }, balance: { $gt: 0 } }
        ],
        'items.category': 'card'
      }).select('patient items').lean();
      unpaidCardInvoices.forEach(inv => {
        const hasCardItem = inv.items && inv.items.some(item => item.category === 'card');
        if (hasCardItem) patientIdsWithUnpaidCardInvoice.add(inv.patient.toString());
      });
    } catch (e) {
      console.warn('Could not check unpaid card invoices:', e.message);
    }
    
    // Add payment status and service requests to each patient
    const patientsWithPaymentStatus = patients.map(patient => {
      const patientId = patient._id.toString();
      const unpaidInvoices = patientUnpaidInvoicesMap[patientId] || [];
      const hasUnpaidInvoices = unpaidInvoices.length > 0;
      const activeServiceRequests = patientServiceRequestsMap[patientId] || [];
      const hasActiveServiceRequests = activeServiceRequests.length > 0;

      // Verified card fee: invoice/PatientCard/registration payment only (not legacy cardIssueDate alone).
      const hasPaidCardFee = patientCardPaidSet.has(patientId);

      // A patient has a paid card if any of these are true:
      // 1. PatientCard record with amountPaid > 0 exists (patientCardPaidSet)
      // 2. MedicalInvoice with paid card item exists (also in patientCardPaidSet)
      // 3. Patient.cardIssueDate is set (legacy) — still used elsewhere; reception queue uses hasPaidCardFee only
      const hasCardPayment = hasPaidCardFee || Boolean(patient.cardIssueDate);

      // Only show in "Card Payment Required" when they have an actual unpaid invoice containing a card charge
      const hasUnpaidCardInvoice = patientIdsWithUnpaidCardInvoice.has(patientId);

      const enhancedPatient = {
        ...patient,
        hasUnpaidInvoices,
        unpaidInvoices,
        activeServiceRequests: activeServiceRequests || [],
        hasActiveServiceRequests: hasActiveServiceRequests || false,
        hasCardPayment,
        hasPaidCardFee,
        hasUnpaidCardInvoice
      };

      // Log service request info for debugging
      if (hasActiveServiceRequests) {
        console.log('🔍 [quick-load] Patient', patient.firstName, patient.lastName, 'has active service requests:', activeServiceRequests.length);
      }

      return enhancedPatient;
    });
    
    res.json({
      success: true,
      patients: patientsWithPaymentStatus,
      currentPage: 1,
      totalPages: 1,
      totalPatients: patientsWithPaymentStatus.length
    });
  } catch (error) {
    console.error('Error fetching patients (quick-load):', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/patients/with-service-requests
// @desc    Get all patients with their service requests populated
// @access  Private
router.get('/with-service-requests', auth, async (req, res) => {
  try {
    console.log('🔍 [with-service-requests] Starting endpoint...');
    
    const Patient = require('../models/Patient');
    console.log('🔍 [with-service-requests] Patient model loaded');
    
    // Get all patients first
    const patients = await Patient.find()
      .sort({ createdAt: -1 })
      .lean();
    
    console.log('🔍 [with-service-requests] Found patients:', patients.length);
    
    if (patients.length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }
    
    // Try to load ServiceRequest model
    let ServiceRequest;
    try {
      ServiceRequest = require('../models/ServiceRequest');
      console.log('🔍 [with-service-requests] ServiceRequest model loaded successfully');
    } catch (modelError) {
      console.error('🔍 [with-service-requests] Error loading ServiceRequest model:', modelError);
      // Return patients without service requests if model doesn't exist
      const patientsWithEmptyServiceRequests = patients.map(patient => ({
        ...patient,
        serviceRequests: []
      }));
      
      return res.json({
        success: true,
        data: patientsWithEmptyServiceRequests
      });
    }
    
    // Get all service requests for these patients
    const patientIds = patients.map(patient => patient._id);
    console.log('🔍 [with-service-requests] Patient IDs:', patientIds.length);
    
    const serviceRequests = await ServiceRequest.find({
      patient: { $in: patientIds }
    })
    .populate('service', 'name category price')
    .populate('assignedNurse', 'firstName lastName')
    .populate('assignedDoctor', 'firstName lastName')
    .lean();
    
    console.log('🔍 [with-service-requests] Found service requests:', serviceRequests.length);
    
    // Group service requests by patient
    const serviceRequestsByPatient = {};
    serviceRequests.forEach(sr => {
      const patientId = sr.patient.toString();
      if (!serviceRequestsByPatient[patientId]) {
        serviceRequestsByPatient[patientId] = [];
      }
      serviceRequestsByPatient[patientId].push(sr);
    });
    
    // Add service requests to each patient
    const patientsWithServiceRequests = patients.map(patient => {
      const patientId = patient._id.toString();
      return {
        ...patient,
        serviceRequests: serviceRequestsByPatient[patientId] || []
      };
    });
    
    console.log('🔍 [with-service-requests] Returning patients with service requests:', patientsWithServiceRequests.length);
    
    res.json({
      success: true,
      data: patientsWithServiceRequests
    });
  } catch (error) {
    console.error('🔍 [with-service-requests] Error fetching patients with service requests:', error);
    console.error('🔍 [with-service-requests] Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// @route   GET /api/patients/debug-collections
// @desc    Debug endpoint to check database collections and data
// @access  Private
router.get('/debug-collections', auth, async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    
    // Get all collections
    const collections = await db.listCollections().toArray();
    console.log('🔍 [debug] Available collections:', collections.map(c => c.name));
    
    // Check specific collections for data
    const results = {};
    
    // Check patients
    const Patient = require('../models/Patient');
    const patientCount = await Patient.countDocuments();
    results.patients = { count: patientCount };
    
    // Check service requests
    try {
      const ServiceRequest = require('../models/ServiceRequest');
      const serviceRequestCount = await ServiceRequest.countDocuments();
      results.serviceRequests = { count: serviceRequestCount };
      
      // Get sample service requests
      const sampleServiceRequests = await ServiceRequest.find().limit(5).lean();
      results.serviceRequests.sample = sampleServiceRequests;
    } catch (error) {
      results.serviceRequests = { error: 'Model not found or error loading' };
    }
    
    // Check services
    try {
      const Service = require('../models/Service');
      const serviceCount = await Service.countDocuments();
      results.services = { count: serviceCount };
      
      // Get consultation services
      const consultationServices = await Service.find({ category: 'consultation' }).lean();
      results.services.consultationServices = consultationServices;
    } catch (error) {
      results.services = { error: 'Model not found or error loading' };
    }
    
    // Check medical invoices
    try {
      const MedicalInvoice = require('../models/MedicalInvoice');
      const invoiceCount = await MedicalInvoice.countDocuments();
      results.medicalInvoices = { count: invoiceCount };
    } catch (error) {
      results.medicalInvoices = { error: 'Model not found or error loading' };
    }
    
    res.json({
      success: true,
      collections: collections.map(c => c.name),
      data: results
    });
  } catch (error) {
    console.error('🔍 [debug] Error checking collections:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/patients/check-service/:serviceId
// @desc    Check service details by ID
// @access  Private
router.get('/check-service/:serviceId', auth, async (req, res) => {
  try {
    const Service = require('../models/Service');
    const service = await Service.findById(req.params.serviceId);
    
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }
    
    res.json({
      success: true,
      data: service
    });
  } catch (error) {
    console.error('Error fetching service:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/patients/create-sample-consultations
// @desc    Create sample consultation data for testing
// @access  Private
router.post('/create-sample-consultations', auth, async (req, res) => {
  try {
    console.log('🔍 [create-sample-consultations] Starting...');
    
    const Patient = require('../models/Patient');
    const Service = require('../models/Service');
    const ServiceRequest = require('../models/ServiceRequest');
    
    // First, create a consultation service if it doesn't exist
    let consultationService = await Service.findOne({ category: 'consultation' });
    if (!consultationService) {
      consultationService = new Service({
        name: 'General Consultation',
        code: 'CONS001',
        category: 'consultation',
        price: 500,
        unit: 'per visit',
        description: 'General medical consultation with doctor',
        isActive: true
      });
      await consultationService.save();
      console.log('🔍 [create-sample-consultations] Created consultation service');
    }
    
    // Get existing patients
    const patients = await Patient.find().limit(3);
    console.log('🔍 [create-sample-consultations] Found patients:', patients.length);
    
    if (patients.length === 0) {
      return res.json({
        success: false,
        message: 'No patients found. Please create some patients first.'
      });
    }
    
    // Create service requests for consultation
    const serviceRequests = [];
    for (const patient of patients) {
      // Assign the first patient to the current doctor
      if (patients.indexOf(patient) === 0) {
        patient.assignedDoctorId = req.user._id;
        patient.status = 'scheduled';
        await patient.save();
      }
      
      const serviceRequest = new ServiceRequest({
        patient: patient._id,
        service: consultationService._id,
        status: 'pending',
        requestDate: new Date(),
        notes: `Consultation request for ${patient.firstName} ${patient.lastName}`
      });
      
      await serviceRequest.save();
      serviceRequests.push(serviceRequest);
      console.log(`🔍 [create-sample-consultations] Created service request for patient: ${patient.firstName} ${patient.lastName}`);
    }
    
    res.json({
      success: true,
      message: `Created ${serviceRequests.length} consultation service requests`,
      data: {
        consultationService: consultationService,
        serviceRequests: serviceRequests,
        patients: patients.map(p => ({
          id: p._id,
          name: `${p.firstName} ${p.lastName}`,
          assignedDoctorId: p.assignedDoctorId,
          status: p.status
        }))
      }
    });
  } catch (error) {
    console.error('🔍 [create-sample-consultations] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/patients/:id
// @desc    Get patient by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const Patient = require('../models/Patient');
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }
    res.json({
      success: true,
      data: patient
    });
  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/patients/:id
// @desc    Update patient
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const Patient = require('../models/Patient');
    
    // Sanitize the request body to handle empty strings for array fields
    const sanitizedData = { ...req.body };
    
    // Handle medicalHistory field - convert empty string to empty array
    if (sanitizedData.medicalHistory === '' || sanitizedData.medicalHistory === null || sanitizedData.medicalHistory === undefined) {
      sanitizedData.medicalHistory = [];
    }
    
    // Handle allergies field - convert empty string to empty array
    if (sanitizedData.allergies === '' || sanitizedData.allergies === null || sanitizedData.allergies === undefined) {
      sanitizedData.allergies = [];
    }
    
    // Handle other array fields that might be empty strings
    const arrayFields = ['medications', 'treatments', 'woundCare', 'imaging', 'doctorOrders'];
    arrayFields.forEach(field => {
      if (sanitizedData[field] === '' || sanitizedData[field] === null || sanitizedData[field] === undefined) {
        sanitizedData[field] = [];
      }
    });
    
    // Handle address field - ensure it's an object
    if (typeof sanitizedData.address === 'string' && sanitizedData.address.trim() === '') {
      sanitizedData.address = {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: ''
      };
    }
    
    const oldPatient = await Patient.findById(req.params.id);

    // Function to check if patient has valid card payment
    const checkCardPaymentStatus = async (patientId) => {
      try {
        const PatientCard = require('../models/PatientCard');
        const CardType = require('../models/CardType');
        
        // First check if patient has a card type assigned
        const patientForCard = await Patient.findById(patientId);
        if (!patientForCard) {
          console.log('❌ [Patient Update] Patient not found for card check');
          return { hasValidCard: false, card: null };
        }

        // If no card type, allow it (for backward compatibility)
        if (!patientForCard.cardType) {
          console.log('⚠️ [Patient Update] Patient has no card type - allowing for backward compatibility');
          return { hasValidCard: true, card: null };
        }

        // Get card type details
        let isInsuranceCard = false;
        try {
          const cardType = await CardType.findById(patientForCard.cardType);
          isInsuranceCard = cardType?.name?.toLowerCase() === 'insurance';
          console.log(`🔍 [Patient Update] Card type: ${cardType?.name}, Is Insurance: ${isInsuranceCard}`);
        } catch (cardTypeError) {
          console.error('❌ [Patient Update] Error fetching card type:', cardTypeError.message);
          // If card type lookup fails, allow it to proceed
          return { hasValidCard: true, card: null };
        }

        // Check PatientCard collection
        const card = await PatientCard.findOne({ patient: patientId });

        if (!card) {
          // For insurance patients, we might not have a PatientCard record
          if (isInsuranceCard) {
            console.log('✅ [Patient Update] Insurance patient - no PatientCard record needed');
            return { hasValidCard: true, card: null };
          }
          console.log('❌ [Patient Update] No PatientCard record and not an insurance patient');
          return { hasValidCard: false, card: null };
        }

        // For regular cards, check if card is active and has been paid for
        // For insurance cards, be more lenient
        let isValid;
        if (isInsuranceCard) {
          isValid = card.status === 'Active' || card.status === 'active';
          console.log('✅ [Patient Update] Insurance card validation - more lenient check');
        } else {
          isValid = card.status === 'Active' && card.amountPaid > 0 && card.lastPaymentDate;
        }
        
        return { hasValidCard: isValid, card };
      } catch (error) {
        console.error('❌ [Patient Update] Error checking card payment status:', error.message);
        console.error('Stack:', error.stack);
        // On error, allow the operation to proceed to avoid blocking
        return { hasValidCard: true, card: null };
      }
    };

    // If status is being changed to 'Admitted', check card payment (unless forceAssignment is true)
    if (sanitizedData.status === 'Admitted' && oldPatient.status !== 'Admitted' && !sanitizedData.forceAssignment) {
      const cardCheck = await checkCardPaymentStatus(req.params.id);

      console.log('🔍 [Patient Update] Card validation result:', {
        patientId: req.params.id,
        patientName: `${oldPatient.firstName} ${oldPatient.lastName}`,
        hasValidCard: cardCheck.hasValidCard,
        cardType: oldPatient.cardType,
        forceAssignment: sanitizedData.forceAssignment
      });

      if (!cardCheck.hasValidCard) {
        console.log('⏳ [Patient Update] Patient has no valid card payment - blocking Admitted status change');

        // Create notification for reception about card payment requirement
        const Notification = require('../models/Notification');
        await new Notification({
          title: 'Card Payment Required',
          message: `Patient ${oldPatient.firstName} ${oldPatient.lastName} needs card payment before being admitted to medical staff`,
          type: 'card_payment_required',
          priority: 'high',
          recipient: 'reception',
          senderId: req.user._id.toString(),
          senderRole: req.user.role,
          recipientRole: 'reception',
          data: {
            patientId: oldPatient._id,
            patientName: `${oldPatient.firstName} ${oldPatient.lastName}`,
            requiredAction: 'card_payment'
          },
          createdBy: req.user._id
        }).save();

        return res.status(402).json({
          success: false,
          message: 'Patient needs valid card payment before admission to medical staff',
          requiresCardPayment: true
        });
      } else {
        console.log('✅ [Patient Update] Card validation passed - allowing Admitted status change');
      }
    } else if (sanitizedData.forceAssignment) {
      console.log('✅ [Patient Update] Force assignment enabled - bypassing card validation');
    }

    // Validate patient ID
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid patient ID format'
      });
    }

    // Remove forceAssignment from sanitizedData before saving to database
    delete sanitizedData.forceAssignment;

    // If vitals is being explicitly reset to an empty object (e.g. when reception
    // re-sends a returning patient to the nurse), we must unset all vitals sub-fields
    // so the nurse sees a clean "Not recorded" state rather than stale values.
    let updatePayload = sanitizedData;
    if (
      sanitizedData.vitals !== undefined &&
      typeof sanitizedData.vitals === 'object' &&
      Object.keys(sanitizedData.vitals).length === 0
    ) {
      const { vitals: _vitals, ...rest } = sanitizedData;
      updatePayload = {
        ...rest,
        $unset: {
          'vitals.temperature': '',
          'vitals.bloodPressure': '',
          'vitals.heartRate': '',
          'vitals.respiratoryRate': '',
          'vitals.bloodSugar': '',
          'vitals.oxygenSaturation': '',
          'vitals.pain': '',
          'vitals.height': '',
          'vitals.weight': '',
          'vitals.bmi': '',
          'vitals.timestamp': '',
        }
      };
    }

    const patient = await Patient.findByIdAndUpdate(
      req.params.id,
      updatePayload,
      { new: true, runValidators: true }
    );
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Send Telegram notification if patient was assigned to a doctor (non-blocking)
    setImmediate(async () => {
      try {
        await telegramService.initialize(); // Ensure Telegram service is initialized

        if (telegramService.isBotInitialized()) {
          console.log('🔍 [NOTIFICATION DEBUG] Checking patient assignment notification...');
          console.log('   - Patient assignedDoctorId:', patient.assignedDoctorId);
          console.log('   - Old patient assignedDoctorId:', oldPatient.assignedDoctorId);
          console.log('   - Bot initialized:', telegramService.isBotInitialized());

          // Check if patient was just assigned to a doctor
          if (patient.assignedDoctorId) {
            console.log('✅ [NOTIFICATION DEBUG] Patient is assigned to a doctor - checking conditions');

            // Check if the assigned doctor has Telegram notifications enabled
            const User = require('../models/User');
            const assignedDoctor = await User.findById(patient.assignedDoctorId);

            console.log('🔍 [NOTIFICATION DEBUG] Assigned doctor check:');
            console.log('   - Doctor found:', !!assignedDoctor);
            console.log('   - Doctor telegram enabled:', assignedDoctor?.telegramNotificationsEnabled);
            console.log('   - Doctor chat ID:', assignedDoctor?.telegramChatId);

            if (assignedDoctor && assignedDoctor.telegramNotificationsEnabled && assignedDoctor.telegramChatId) {
              console.log('✅ [NOTIFICATION DEBUG] All conditions met - sending notification');

              // Send personalized notification to the assigned doctor
              const doctorNotification = await telegramService.sendPatientAssignmentNotification(
                patient.toObject(),
                assignedDoctor
              );

              if (doctorNotification.success) {
                console.log(`📱 Telegram notification sent to Dr. ${assignedDoctor.firstName} ${assignedDoctor.lastName} for patient assignment`);
              } else {
                console.log('❌ [NOTIFICATION DEBUG] Notification failed:', doctorNotification.message);
              }
            } else {
              console.log('❌ [NOTIFICATION DEBUG] Doctor notification conditions not met');
            }
          } else {
            console.log('❌ [NOTIFICATION DEBUG] Patient not assigned to doctor or invalid doctor ID');
          }
        } else {
          console.log('❌ [NOTIFICATION DEBUG] Telegram bot not initialized');
        }
      } catch (telegramError) {
        console.error('❌ Error sending Telegram notification for patient assignment:', telegramError);
        // Don't fail patient update if Telegram notification fails
      }
    });

    res.json({
      success: true,
      data: patient
    });
  } catch (error) {
    console.error('Error updating patient:', error);
    console.error('Error stack:', error.stack);
    console.error('Request params:', req.params);
    console.error('Request body:', req.body);
    
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// @route   DELETE /api/patients/:id
// @desc    Delete patient
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const Patient = require('../models/Patient');
    const patient = await Patient.findByIdAndDelete(req.params.id);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }
    res.json({
      success: true,
      message: 'Patient deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting patient:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/patients/:id/vitals
// @desc    Update patient vitals
// @access  Private
router.put('/:id/vitals', auth, async (req, res) => {
  try {
    const Patient = require('../models/Patient');
    const VitalSigns = require('../models/VitalSigns');
    
    const { id } = req.params;
    const vitalsData = req.body;
    
    // Check if patient exists
    const patient = await Patient.findById(id);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }
    
    // Update patient vitals in the patient record
    const updatedPatient = await Patient.findByIdAndUpdate(
      id,
      { 
        vitals: vitalsData,
        lastVitalsTimestamp: new Date()
      },
      { new: true, runValidators: true }
    );
    
    // Helper function to safely parse numbers, returning undefined for invalid/empty values
    const safeParseFloat = (value) => {
      if (!value || (typeof value === 'string' && value.trim() === '')) return undefined;
      const parsed = parseFloat(value);
      return isNaN(parsed) ? undefined : parsed;
    };
    
    const safeParseInt = (value) => {
      if (!value || (typeof value === 'string' && value.trim() === '')) return undefined;
      const parsed = parseInt(value);
      return isNaN(parsed) ? undefined : parsed;
    };
    
    // Also create a separate vital signs record
    // Parse blood pressure safely
    let systolic = null;
    let diastolic = null;
    
    if (vitalsData.bloodPressure) {
      if (typeof vitalsData.bloodPressure === 'string' && vitalsData.bloodPressure.trim() !== '' && vitalsData.bloodPressure.includes('/')) {
        const [sys, dia] = vitalsData.bloodPressure.split('/').map(v => {
          const trimmed = v.trim();
          return trimmed !== '' ? parseInt(trimmed) : NaN;
        });
        if (!isNaN(sys) && !isNaN(dia)) {
          systolic = sys;
          diastolic = dia;
        }
      } else if (typeof vitalsData.bloodPressure === 'object' && vitalsData.bloodPressure !== null) {
        // Handle object format {systolic: X, diastolic: Y}
        systolic = vitalsData.bloodPressure.systolic ? safeParseInt(vitalsData.bloodPressure.systolic) : null;
        diastolic = vitalsData.bloodPressure.diastolic ? safeParseInt(vitalsData.bloodPressure.diastolic) : null;
      }
    }
    
    // Parse BMI and validate it's within acceptable range
    let bmiValue = safeParseFloat(vitalsData.bmi);
    if (bmiValue !== undefined && (bmiValue < 5 || bmiValue > 100)) {
      // Skip BMI if it's outside valid range
      bmiValue = undefined;
    }
    
    const vitalSignsData = {
      patientId: id,
      patientName: `${patient.firstName} ${patient.lastName}`,
      measurementType: 'comprehensive',
      temperature: safeParseFloat(vitalsData.temperature),
      systolic: systolic !== null && systolic !== undefined ? systolic : undefined,
      diastolic: diastolic !== null && diastolic !== undefined ? diastolic : undefined,
      pulse: safeParseInt(vitalsData.heartRate),
      respiratoryRate: safeParseInt(vitalsData.respiratoryRate),
      bloodSugar: safeParseFloat(vitalsData.bloodSugar),
      spo2: safeParseFloat(vitalsData.oxygenSaturation),
      pain: safeParseInt(vitalsData.pain),
      height: safeParseFloat(vitalsData.height),
      weight: safeParseFloat(vitalsData.weight),
      bmi: bmiValue,
      notes: vitalsData.notes || '',
      measuredBy: req.user.id,
      measuredByName: `${req.user.firstName} ${req.user.lastName}`,
      measurementDate: new Date()
    };
    
    // Remove undefined and null values to avoid validation issues
    Object.keys(vitalSignsData).forEach(key => {
      if (vitalSignsData[key] === undefined || vitalSignsData[key] === null) {
        delete vitalSignsData[key];
      }
    });
    
    // Check if at least one vital sign is present before saving
    const hasVitalSigns = vitalSignsData.systolic !== undefined || 
                         vitalSignsData.diastolic !== undefined ||
                         vitalSignsData.pulse !== undefined ||
                         vitalSignsData.temperature !== undefined ||
                         vitalSignsData.weight !== undefined ||
                         vitalSignsData.height !== undefined ||
                         vitalSignsData.spo2 !== undefined ||
                         vitalSignsData.respiratoryRate !== undefined ||
                         vitalSignsData.bloodSugar !== undefined ||
                         vitalSignsData.pain !== undefined;
    
    if (!hasVitalSigns) {
      return res.status(400).json({
        success: false,
        message: 'At least one vital sign measurement must be provided',
        error: 'Validation error'
      });
    }
    
    console.log('📊 Attempting to save vital signs with data:', JSON.stringify(vitalSignsData, null, 2));
    
    const vitalSigns = new VitalSigns(vitalSignsData);
    await vitalSigns.save();
    
    console.log('✅ Vital signs saved successfully:', vitalSigns._id);

    // 📱 Send Telegram notification for vitals update
    try {
      const notificationService = require('../services/notificationService');
      const telegramService = require('../services/telegramService');

      // Initialize telegram service
      await telegramService.initialize();

      if (telegramService.isInitialized) {
        console.log('📱 Sending vitals update notification...');

        const vitalsNotification = await notificationService.sendNotification(
          'vitalsUpdate',
          {
            patientId: patient.patientId || patient._id,
            patientName: `${patient.firstName} ${patient.lastName}`,
            age: patient.age,
            gender: patient.gender,
            vitals: vitalsData
          }
        );

        if (vitalsNotification.success) {
          console.log('📱 Vitals update notification sent successfully');
        } else {
          console.log('❌ Vitals update notification failed:', vitalsNotification.message);
        }
      } else {
        console.log('📱 Telegram bot not initialized, skipping vitals update notification');
      }
    } catch (telegramError) {
      console.error('❌ Error sending vitals update notification:', telegramError);
      // Don't fail vitals update if notification fails
    }

    res.json({
      success: true,
      data: {
        patient: updatedPatient,
        vitalSigns: vitalSigns
      },
      message: 'Patient vitals updated successfully'
    });
  } catch (error) {
    console.error('Error updating patient vitals:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    
    // Check if it's a validation error
    if (error.name === 'ValidationError') {
      const errorDetails = {};
      if (error.errors) {
        Object.keys(error.errors).forEach(key => {
          errorDetails[key] = error.errors[key].message;
        });
      }
      
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        error: error.message,
        details: errorDetails
      });
    }
    
    // Check if it's a cast error (invalid ObjectId)
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid patient ID format',
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while updating vitals',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// @route   GET /api/patients/:id/vitals/history
// @desc    Get patient vitals history
// @access  Private
router.get('/:id/vitals/history', auth, async (req, res) => {
  try {
    const Patient = require('../models/Patient');
    const VitalSigns = require('../models/VitalSigns');
    
    const { id } = req.params;
    
    // Check if patient exists
    const patient = await Patient.findById(id);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }
    
    // Get vital signs history
    const vitalSignsHistory = await VitalSigns.find({
      patientId: id,
      isActive: true
    })
    .sort({ measurementDate: -1 })
    .populate('measuredBy', 'firstName lastName');
    
    res.json({
      success: true,
      data: {
        patient: {
          _id: patient._id,
          firstName: patient.firstName,
          lastName: patient.lastName,
          patientId: patient.patientId
        },
        vitalsHistory: vitalSignsHistory
      }
    });
  } catch (error) {
    console.error('Error fetching patient vitals history:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/patients/:id/status
// @desc    Update patient status. Patient may only be set to 'completed' when they have a finalized medical record (stays in active area until doctor writes medical record).
// @access  Private
router.put('/:id/status', auth, async (req, res) => {
  try {
    const Patient = require('../models/Patient');
    
    const { id } = req.params;
    const { status } = req.body;
    
    // Validate status
    const validStatuses = ['Admitted', 'Discharged', 'Outpatient', 'Emergency', 'waiting', 'in-progress', 'scheduled', 'completed', 'Active'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Valid statuses are: ' + validStatuses.join(', ')
      });
    }
    
    // Check if patient exists
    const patient = await Patient.findById(id);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }
    
    // Patient may only be marked completed when they have at least one finalized medical record (not after lab order or medication alone)
    if (status === 'completed') {
      const hasFinalized = await patientHasFinalizedMedicalRecord(id);
      if (!hasFinalized) {
        return res.status(400).json({
          success: false,
          message: 'Patient cannot be marked completed until a medical record has been written and finalized. Sending lab order or medication alone does not complete the visit.'
        });
      }
    }
    
    // Update patient status
    const updatedPatient = await Patient.findByIdAndUpdate(
      id,
      { 
        status: status,
        lastUpdated: new Date()
      },
      { new: true, runValidators: true }
    );
    
    res.json({
      success: true,
      data: updatedPatient,
      message: `Patient status updated to ${status}`
    });
  } catch (error) {
    console.error('Error updating patient status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/patients/:id/notify-doctor
// @desc    Send notification to doctor about patient
// @access  Private
router.post('/:id/notify-doctor', auth, async (req, res) => {
  try {
    const Patient = require('../models/Patient');
    const Notification = require('../models/Notification');
    
    const { id } = req.params;
    const notificationData = req.body;
    
    // Check if patient exists
    const patient = await Patient.findById(id);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }
    
    // Validate and set priority
    let priority = notificationData.priority || 'medium'; // Default to 'medium'
    const validPriorities = ['low', 'medium', 'high', 'critical'];
    if (!validPriorities.includes(priority)) {
      console.warn(`Invalid priority value received: ${notificationData.priority}. Defaulting to 'medium'.`);
      priority = 'medium';
    }

    let recipientId = patient.assignedDoctorId || req.user.id;
    let recipientRole = req.user.role; // Default to sender's role

    console.log(`[notify-doctor] Patient assignedDoctorId: ${patient.assignedDoctorId}`);
    console.log(`[notify-doctor] Current user ID: ${req.user.id}, Role: ${req.user.role}`);

    if (patient.assignedDoctorId) {
      const assignedDoctor = await User.findById(patient.assignedDoctorId);
      if (assignedDoctor) {
        recipientRole = assignedDoctor.role;
        console.log(`[notify-doctor] Assigned doctor found. Role: ${assignedDoctor.role}`);
      } else {
        console.warn(`[notify-doctor] Assigned doctor with ID ${patient.assignedDoctorId} not found. Defaulting recipientRole to sender's role.`);
      }
    } else {
      console.log(`[notify-doctor] No assigned doctor for patient ${id}. Recipient is current user.`);
    }

    // Create notification for the doctor
    const notification = new Notification({
      type: notificationData.type || 'PATIENT_UPDATE',
      title: notificationData.title || 'Patient Update',
      message: notificationData.message || 'Patient information has been updated',
      recipientId: recipientId, // Use the determined recipientId
      recipientRole: recipientRole, // Use the determined recipientRole
      senderId: req.user.id,
      senderRole: req.user.role, // Explicitly set senderRole
      data: {
        patientId: patient._id,
        patientName: `${patient.firstName} ${patient.lastName}`,
        ...notificationData.data
      },
      priority: priority, // Use the validated priority
      category: 'patient'
    });
    
    await notification.save();
    
    res.json({
      success: true,
      data: notification,
      message: 'Notification sent to doctor successfully'
    });
  } catch (error) {
    console.error('Error sending notification to doctor:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/patients/:id/status (duplicate route - same rule: completed only with finalized medical record)
// @desc    Update patient status
// @access  Private
router.put('/:id/status', auth, async (req, res) => {
  try {
    const Patient = require('../models/Patient');
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }
    
    // Validate patient ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid patient ID'
      });
    }
    
    const patient = await Patient.findById(id);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }
    
    // Patient may only be marked completed when they have a finalized medical record (stays in active until doctor writes record)
    if (status === 'completed') {
      const hasFinalized = await patientHasFinalizedMedicalRecord(id);
      if (!hasFinalized) {
        return res.status(400).json({
          success: false,
          message: 'Patient cannot be marked completed until a medical record has been written and finalized. Sending lab order or medication alone does not complete the visit.'
        });
      }
    }
    
    // Update patient status
    patient.status = status;
    patient.lastUpdated = new Date();
    await patient.save();
    
    console.log(`[DEBUG] Updated patient ${patient.firstName} ${patient.lastName} status to: ${status}`);
    
    res.json({
      success: true,
      message: `Patient status updated to ${status}`,
      data: {
        id: patient._id,
        name: `${patient.firstName} ${patient.lastName}`,
        status: patient.status,
        lastUpdated: patient.lastUpdated
      }
    });
    
  } catch (error) {
    console.error('Error updating patient status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
