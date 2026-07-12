// patientCardController - Controller implementation

const PatientCard = require('../models/PatientCard');
const Patient = require('../models/Patient');
const MedicalInvoice = require('../models/MedicalInvoice');
const mongoose = require('mongoose');

// Map payment method from route (e.g. Cash, Credit Card) to MedicalInvoice enum (cash, card, etc.)
function mapPaymentMethodForInvoice(method) {
  if (!method || typeof method !== 'string') return 'cash';
  const m = method.trim().toLowerCase();
  if (m === 'cash') return 'cash';
  if (m.includes('credit') || m.includes('debit') || m === 'card') return 'card';
  if (m.includes('bank') || m.includes('transfer')) return 'bank_transfer';
  if (m.includes('insurance')) return 'insurance';
  return 'other';
}

// @desc    Get all patient cards
// @route   GET /api/patient-cards
// @access  Private
const getPatientCards = async (req, res) => {
  try {
    const { patient } = req.query;
    const query = {};
    
    if (patient) {
      query.patient = patient;
    }
    
    const cards = await PatientCard.find(query)
      .populate('patient', 'firstName lastName patientId')
      .sort({ createdAt: -1 });
    
    res.json(cards);
  } catch (error) {
    console.error('Error fetching patient cards:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get patient card by ID
// @route   GET /api/patient-cards/:id
// @access  Private
const getPatientCardById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid card ID'
      });
    }
    
    const card = await PatientCard.findById(id)
      .populate('patient', 'firstName lastName patientId');
    
    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Patient card not found'
      });
    }
    
    res.json(card);
  } catch (error) {
    console.error('Error fetching patient card:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Create new patient card
// @route   POST /api/patient-cards
// @access  Private
const createPatientCard = async (req, res) => {
  try {
    const { patient, type, amountPaid, paymentMethod, pendingPayment } = req.body;
    
    if (!patient || !type || !amountPaid) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: patient, type, amountPaid'
      });
    }

    // Patient must renew existing card; do not allow creating a second card
    const existingCard = await PatientCard.findOne({ patient }).sort({ issuedDate: -1 }).lean();
    if (existingCard) {
      return res.status(400).json({
        success: false,
        message: 'Patient already has a card. Please renew the existing card instead.',
        code: 'CARD_ALREADY_EXISTS',
        existingCardId: existingCard._id
      });
    }
    
    // Fetch card type benefits
    const CardType = require('../models/CardType');
    const cardTypeDoc = await CardType.findOne({ $or: [{ name: type }, { value: type.toLowerCase() }] });
    const cardBenefits = {
      discountPercentage: cardTypeDoc ? (cardTypeDoc.discounts?.service || 0) : 0,
      discounts: {
        service: cardTypeDoc?.discounts?.service || 0,
        lab: cardTypeDoc?.discounts?.lab || 0,
        consultation: cardTypeDoc?.discounts?.consultation || 0
      },
      freeConsultations: cardTypeDoc?.freeConsultations || 0,
      freeLabTests: cardTypeDoc?.freeLabTests || 0,
      priorityAppointments: cardTypeDoc?.priorityAppointments || false
    };

    // Generate card number
    const cardCount = await PatientCard.countDocuments();
    const cardNumber = `CARD${String(cardCount + 1).padStart(6, '0')}`;
    
    const now = new Date();
    const expiryDate = new Date(now);
    expiryDate.setFullYear(expiryDate.getFullYear() + 1); // 1 year validity
    const amountNum = typeof amountPaid === 'number' ? amountPaid : parseFloat(amountPaid);
    
    // If pendingPayment flag is set (e.g. from renewal flow), create card as Expired
    // and invoice as PENDING. Card will be activated when invoice is paid in Billing.
    if (pendingPayment) {
      const newCard = new PatientCard({
        patient,
        cardNumber,
        type,
        status: 'Expired',  // stays expired until billing payment activates it
        issuedDate: now,
        expiryDate: new Date(0), // expired until payment
        amountPaid: 0,
        benefits: cardBenefits,
        paymentHistory: [],
        createdBy: req.user._id
      });
      await newCard.save();

      // Create PENDING billing invoice
      const patientDoc = await Patient.findById(patient).select('firstName lastName patientId').lean();
      const patientName = patientDoc ? (String(patientDoc.firstName || '') + ' ' + String(patientDoc.lastName || '')).trim() || 'Unknown Patient' : 'Unknown Patient';
      const patientIdStr = (patientDoc && patientDoc.patientId) ? patientDoc.patientId : String(patient);
      const invoiceNumber = await MedicalInvoice.generateInvoiceNumber();
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + 30);

      const cardInvoice = new MedicalInvoice({
        invoiceNumber,
        patient,
        patientId: patientIdStr,
        patientName,
        issueDate: now,
        dueDate,
        items: [{
          itemType: 'card',
          category: 'card',
          description: 'Card Renewal (' + (type || 'Basic') + ')',
          quantity: 1,
          unitPrice: amountNum,
          total: amountNum,
          discount: 0,
          tax: 0,
          metadata: { patientCardId: newCard._id }
        }],
        subtotal: amountNum,
        taxTotal: 0,
        discountTotal: 0,
        total: amountNum,
        amountPaid: 0,
        balance: amountNum,
        status: 'pending',
        payments: [],
        createdBy: req.user._id
      });
      await cardInvoice.save();
      console.log('[Create Card - Pending] Pending invoice ' + cardInvoice.invoiceNumber + ' created. Pay in Billing to activate card.');

      return res.status(201).json({
        success: true,
        invoiceOnly: true,
        invoiceId: cardInvoice._id,
        invoiceNumber: cardInvoice.invoiceNumber,
        message: 'Renewal sent to Billing. Process payment there to activate the card; then the patient will appear in the queue.'
      });
    }

    // Normal flow: create Active card with paid invoice (for new patient registration)
    const newCard = new PatientCard({
      patient,
      cardNumber,
      type,
      status: 'Active',
      issuedDate: now,
      expiryDate,
      lastPaymentDate: now,
      amountPaid,
      benefits: cardBenefits,
      paymentHistory: [{
        amount: amountPaid,
        paymentDate: now,
        paymentMethod: paymentMethod || 'cash'
      }],
      createdBy: req.user._id
    });
    
    await newCard.save();
    
    // Update Patient document
    await Patient.findByIdAndUpdate(patient, {
      cardStatus: 'active',
      cardIssueDate: now,
      cardExpiryDate: expiryDate
    });
    
    // Create a billing invoice so the card payment shows in the billing area
    const patientDoc = await Patient.findById(patient).select('firstName lastName patientId').lean();
    const patientName = patientDoc ? (String(patientDoc.firstName || '') + ' ' + String(patientDoc.lastName || '')).trim() || 'Unknown Patient' : 'Unknown Patient';
    const patientIdStr = (patientDoc && patientDoc.patientId) ? patientDoc.patientId : String(patient);
    const invoiceNumber = await MedicalInvoice.generateInvoiceNumber();
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + 30);
    const paymentMethodForInvoice = mapPaymentMethodForInvoice(paymentMethod);
    const cardIssueInvoice = new MedicalInvoice({
      invoiceNumber,
      patient,
      patientId: patientIdStr,
      patientName,
      issueDate: now,
      dueDate,
      items: [{
        itemType: 'card',
        category: 'card',
        description: `Patient Card - ${type || 'Basic'}`,
        quantity: 1,
        unitPrice: amountNum,
        total: amountNum,
        discount: 0,
        tax: 0,
        metadata: { patientCardId: newCard._id }
      }],
      subtotal: amountNum,
      taxTotal: 0,
      discountTotal: 0,
      total: amountNum,
      amountPaid: amountNum,
      balance: 0,
      status: 'paid',
      paidDate: now,
      paymentMethod: paymentMethodForInvoice,
      payments: [{
        amount: amountNum,
        method: paymentMethodForInvoice,
        reference: `CARD-NEW-${newCard.cardNumber}`,
        date: now,
        notes: `New patient card - ${newCard.cardNumber}`,
        processedBy: req.user._id
      }],
      createdBy: req.user._id
    });
    await cardIssueInvoice.save();
    console.log(`✅ [Create Card] Billing invoice ${cardIssueInvoice.invoiceNumber} created for new card (ETB ${amountNum}) - visible in billing area`);
    
    res.status(201).json(newCard);
  } catch (error) {
    console.error('Error creating patient card:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Renew patient card: ALWAYS creates a PENDING billing invoice. Card renews only after payment in Billing.
// @route   POST /api/patient-cards/:id/renew
const renewPatientCard = async (req, res) => {
  try {
    const { id } = req.params;
    const amount = req.body.amount || req.body.amountPaid;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid card ID' });
    }
    if (!amount) {
      return res.status(400).json({ success: false, message: 'Missing required field: amount (or amountPaid)' });
    }

    const card = await PatientCard.findById(id);
    if (!card) {
      return res.status(404).json({ success: false, message: 'Patient card not found' });
    }

    const amountNum = parseFloat(amount);
    const now = new Date();
    const patientDoc = await Patient.findById(card.patient).select('firstName lastName patientId').lean();
    const patientName = patientDoc ? (String(patientDoc.firstName || '') + ' ' + String(patientDoc.lastName || '')).trim() || 'Unknown Patient' : 'Unknown Patient';
    const patientIdStr = (patientDoc && patientDoc.patientId) ? patientDoc.patientId : String(card.patient);
    const invoiceNumber = await MedicalInvoice.generateInvoiceNumber();
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + 30);

    // Always create PENDING invoice; card will be renewed when this invoice is paid in Billing.
    const cardRenewalInvoice = new MedicalInvoice({
      invoiceNumber,
      patient: card.patient,
      patientId: patientIdStr,
      patientName,
      issueDate: now,
      dueDate,
      items: [{
        itemType: 'card',
        category: 'card',
        description: 'Card Renewal (' + (card.type || 'Basic') + ')',
        quantity: 1,
        unitPrice: amountNum,
        total: amountNum,
        discount: 0,
        tax: 0,
        metadata: { patientCardId: card._id }
      }],
      subtotal: amountNum,
      taxTotal: 0,
      discountTotal: 0,
      total: amountNum,
      amountPaid: 0,
      balance: amountNum,
      status: 'pending',
      payments: [],
      createdBy: req.user._id
    });
    await cardRenewalInvoice.save();
    console.log('[Renew Card] Pending invoice ' + cardRenewalInvoice.invoiceNumber + ' created. Pay in Billing to activate card.');

    return res.json({
      success: true,
      invoiceOnly: true,
      invoiceId: cardRenewalInvoice._id,
      invoiceNumber: cardRenewalInvoice.invoiceNumber,
      message: 'Renewal sent to Billing. Process payment there to activate the card; then the patient will appear in the queue.'
    });
  } catch (error) {
    console.error('Error renewing patient card:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Cancel patient card
// @route   POST /api/patient-cards/:id/cancel
// @access  Private
const cancelPatientCard = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid card ID'
      });
    }
    
    const card = await PatientCard.findById(id);
    
    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Patient card not found'
      });
    }
    
    card.status = 'Cancelled';
    await card.save();
    
    // Update Patient document
    await Patient.findByIdAndUpdate(card.patient, {
      cardStatus: 'cancelled'
    });
    
    res.json({
      success: true,
      data: card,
      message: 'Card cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling patient card:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Check all cards for expiry
// @route   POST /api/patient-cards/check-expiry
// @access  Private (Admin)
const checkAllCardsExpiry = async (req, res) => {
  try {
    const cards = await PatientCard.find({ status: { $in: ['Active', 'Grace'] } });
    let updatedCount = 0;
    
    for (const card of cards) {
      await card.checkExpiry();
      if (card.isModified()) {
        updatedCount++;
      }
    }
    
    res.json({
      success: true,
      message: `Checked ${cards.length} cards, updated ${updatedCount}`
    });
  } catch (error) {
    console.error('Error checking card expiry:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Process card payment from notification
// @route   POST /api/patient-cards/process-payment/:notificationId
// @access  Private
const processCardPayment = async (req, res) => {
  try {
    // Implementation for processing card payment from notification
    res.json({
      success: true,
      message: 'Card payment processed'
    });
  } catch (error) {
    console.error('Error processing card payment:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get patient card benefit usage details
// @route   GET /api/patient-cards/usage/:patientId
// @access  Private
const getPatientCardUsage = async (req, res) => {
  try {
    const { patientId } = req.params;
    
    // Resolve patient
    const patientDoc = await Patient.findById(patientId).populate('cardType');
    if (!patientDoc) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }
    
    // 1. Get active card
    let card = await PatientCard.findOne({
      patient: patientId,
      status: { $in: ['Active', 'Grace'] }
    });
    
    let benefits = {
      discounts: { service: 0, lab: 0, consultation: 0 },
      freeLabTests: 0,
      freeConsultations: 0
    };
    let activeCardId = null;
    let cardDetails = null;
    
    if (card) {
      await card.checkExpiry();
      if (card.isValid) {
        activeCardId = card._id;
        benefits = {
          discounts: {
            service: card.benefits?.discounts?.service ?? card.benefits?.discountPercentage ?? 0,
            lab: card.benefits?.discounts?.lab ?? card.benefits?.discountPercentage ?? 0,
            consultation: card.benefits?.discounts?.consultation ?? card.benefits?.discountPercentage ?? 0
          },
          freeLabTests: card.benefits?.freeLabTests ?? 0,
          freeConsultations: card.benefits?.freeConsultations ?? 0
        };
        cardDetails = {
          cardNumber: card.cardNumber,
          type: card.type,
          status: card.status,
          issuedDate: card.issuedDate,
          expiryDate: card.expiryDate
        };
      }
    } else if (patientDoc.cardStatus === 'active' && patientDoc.cardType) {
      const cardTypeDoc = patientDoc.cardType;
      activeCardId = cardTypeDoc._id;
      benefits = {
        discounts: {
          service: cardTypeDoc.discounts?.service ?? 0,
          lab: cardTypeDoc.discounts?.lab ?? 0,
          consultation: cardTypeDoc.discounts?.consultation ?? 0
        },
        freeLabTests: cardTypeDoc.freeLabTests ?? 0,
        freeConsultations: cardTypeDoc.freeConsultations ?? 0
      };
      cardDetails = {
        cardNumber: 'DIRECT',
        type: cardTypeDoc.name,
        status: 'Active',
        issuedDate: patientDoc.cardIssueDate || new Date(),
        expiryDate: patientDoc.cardExpiryDate || new Date(Date.now() + 365*24*60*60*1000)
      };
    }
    
    if (!activeCardId) {
      return res.json({
        hasActiveCard: false,
        message: 'Patient does not have an active membership card.'
      });
    }
    
    // 2. Count used lab tests and consultations
    let startDate = cardDetails.issuedDate;
    
    const invoices = await MedicalInvoice.find({
      patient: patientId,
      status: { $nin: ['cancelled', 'refunded'] },
      createdAt: { $gte: startDate }
    });
    
    let freeLabTestsUsed = 0;
    let freeConsultationsUsed = 0;
    const benefitUsageDetails = [];
    
    for (const inv of invoices) {
      let labsInInvoice = [];
      let consultsInInvoice = [];
      
      for (const item of inv.items) {
        const isLab = item.category === 'lab' || item.itemType === 'lab';
        const isConsult = item.category === 'consultation' || item.itemType === 'consultation';
        const isFree = item.unitPrice > 0 && item.discount >= (item.unitPrice * item.quantity);
        
        if (isFree) {
          if (isLab) {
            freeLabTestsUsed += item.quantity;
            labsInInvoice.push(`${item.description} (x${item.quantity})`);
          }
          if (isConsult) {
            freeConsultationsUsed += item.quantity;
            consultsInInvoice.push(`${item.description} (x${item.quantity})`);
          }
        }
      }
      
      if (labsInInvoice.length > 0 || consultsInInvoice.length > 0) {
        benefitUsageDetails.push({
          invoiceNumber: inv.invoiceNumber,
          date: inv.createdAt,
          labs: labsInInvoice,
          consultations: consultsInInvoice
        });
      }
    }
    
    res.json({
      hasActiveCard: true,
      card: cardDetails,
      benefits: {
        discounts: benefits.discounts,
        labTests: {
          allowed: benefits.freeLabTests,
          used: freeLabTestsUsed,
          remaining: Math.max(0, benefits.freeLabTests - freeLabTestsUsed)
        },
        consultations: {
          allowed: benefits.freeConsultations,
          used: freeConsultationsUsed,
          remaining: Math.max(0, benefits.freeConsultations - freeConsultationsUsed)
        }
      },
      usageHistory: benefitUsageDetails
    });
  } catch (error) {
    console.error('Error fetching card usage details:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

module.exports = {
  getPatientCards,
  getPatientCardById,
  getPatientCardUsage,
  createPatientCard,
  renewPatientCard,
  cancelPatientCard,
  checkAllCardsExpiry,
  processCardPayment
};
