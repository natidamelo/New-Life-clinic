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

module.exports = {
  getPatientCards,
  getPatientCardById,
  createPatientCard,
  renewPatientCard,
  cancelPatientCard,
  checkAllCardsExpiry,
  processCardPayment
};
