// Import models
const MedicalInvoice = require('../models/MedicalInvoice');
const Payment = require('../models/Payment');
const Patient = require('../models/Patient');
const PatientCard = require('../models/PatientCard');
const InventoryTransaction = require('../models/InventoryTransaction');
const mongoose = require('mongoose');
const ErrorResponse = require('../utils/errorResponse');

/**
 * Service for billing operations with inventory and patient card integration
 */
const billingService = {
  /**
   * Calculate discount based on patient card
   * @param {String} patientId - Patient ID
   * @param {Number} amount - Original amount
   * @returns {Promise<Object>} - Discount information
   */
  async calculateDiscount(patientId, amount) {
    try {
      const card = await PatientCard.findOne({
        patient: patientId,
        status: { $in: ['Active', 'Grace'] }
      });
      
      if (!card) {
        return {
          hasDiscount: false,
          discountPercentage: 0,
          discountAmount: 0,
          finalAmount: amount,
          cardDetails: null
        };
      }
      
      await card.checkExpiry();
      if (!card.isValid) {
        return {
          hasDiscount: false,
          discountPercentage: 0,
          discountAmount: 0,
          finalAmount: amount,
          cardDetails: {
            cardId: card._id,
            cardNumber: card.cardNumber,
            type: card.type,
            status: card.status,
            isValid: false
          }
        };
      }
      
      const discountPercentage = card.benefits.discountPercentage || 0;
      const discountAmount = (amount * discountPercentage) / 100;
      const finalAmount = amount - discountAmount;
      
      return {
        hasDiscount: true,
        discountPercentage,
        discountAmount,
        finalAmount,
        cardDetails: {
          cardId: card._id,
          cardNumber: card.cardNumber,
          type: card.type,
          status: card.status,
          isValid: true
        }
      };
    } catch (error) {
      throw new ErrorResponse('Error calculating discount', 500);
    }
  },
  
  /**
   * Create a new invoice
   * @param {Object} invoiceData - Invoice data
   * @param {String} userId - User creating the invoice
   * @returns {Promise<Object>} - Created invoice
   */
  async createInvoice(invoiceData, userId) {
    try {
      const { patient, items, dueDate, notes, medicalRecord, visit, provider } = invoiceData;
      
      // Generate invoice number
      const invoiceNumber = await MedicalInvoice.generateInvoiceNumber();
      
      // Calculate totals from items
      const subtotal = items.reduce((sum, item) => {
        const itemTotal = item.quantity * item.unitPrice;
        return sum + itemTotal;
      }, 0);
      
      // Get patient card discount
      const discountInfo = await this.calculateDiscount(patient, subtotal);
      
      // Create invoice object
      const invoice = new MedicalInvoice({
        invoiceNumber,
        patient,
        patientId: invoiceData.patientId,
        patientName: invoiceData.patientName,
        medicalRecord,
        visit,
        provider,
        items: items.map(item => ({
          ...item,
          discount: item.discount || 0,
          tax: item.tax || 0
        })),
        subtotal: invoiceData.subtotal || subtotal,
        total: invoiceData.total || (subtotal - discountInfo.discountAmount),
        balance: invoiceData.balance || (subtotal - discountInfo.discountAmount),
        dateIssued: new Date(), // Use dateIssued everywhere
        dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        status: 'pending',
        notes,
        createdBy: userId
      });
      
      // If patient card exists, store reference
      if (discountInfo.cardDetails?.cardId) {
        invoice.patientCard = discountInfo.cardDetails.cardId;
      }
      
      // Save without transaction for standalone MongoDB
      await invoice.save();
      
      return invoice.populate([
        { path: 'patient', select: 'firstName lastName patientId' },
        { path: 'provider', select: 'firstName lastName' },
        { path: 'createdBy', select: 'firstName lastName' }
      ]);
    } catch (error) {
      throw new ErrorResponse(error.message, 500);
    }
  },
  
  /**
   * Check if patient is an insurance patient with eligible services
   * @param {Object} invoice - Invoice object
   * @returns {Promise<Boolean>} - True if insurance patient with eligible services
   */
  async isInsurancePatientWithEligibleServices(invoice) {
    try {
      // Check if patient has an insurance card type
      const Patient = require('../models/Patient');
      const CardType = require('../models/CardType');
      
      console.log('🔍 [Insurance Check] Starting insurance eligibility check for invoice:', invoice._id);
      
      const patient = await Patient.findById(invoice.patient).populate('cardType');
      
      if (!patient) {
        console.log('❌ [Insurance Check] Patient not found');
        return false;
      }
      
      console.log('👤 [Insurance Check] Patient:', patient.firstName, patient.lastName);
      console.log('💳 [Insurance Check] Patient cardType:', patient.cardType);
      
      if (!patient.cardType) {
        console.log('❌ [Insurance Check] Patient has no card type');
        return false;
      }
      
      // Check if card type is Insurance - handle both populated and non-populated cases
      let cardTypeName = '';
      if (typeof patient.cardType === 'string') {
        // If cardType is just an ID, fetch it
        const cardType = await CardType.findById(patient.cardType);
        cardTypeName = cardType ? cardType.name : '';
        console.log('💳 [Insurance Check] Card type fetched:', cardTypeName);
      } else {
        // If cardType is populated object
        cardTypeName = patient.cardType.name || '';
        console.log('💳 [Insurance Check] Card type name:', cardTypeName);
      }
      
      const isInsuranceCard = cardTypeName.toLowerCase().includes('insurance');
      console.log('🔍 [Insurance Check] Is insurance card:', isInsuranceCard, '(name:', cardTypeName, ')');
      
      if (!isInsuranceCard) {
        console.log('❌ [Insurance Check] Not an insurance card');
        return false;
      }
      
      // Check if invoice contains prescription, lab, or imaging services
      const eligibleItemTypes = ['medication', 'lab', 'imaging', 'prescription', 'laboratory'];
      console.log('📋 [Insurance Check] Invoice items:', invoice.items.map(item => ({
        name: item.name,
        itemType: item.itemType,
        category: item.category
      })));
      
      const hasEligibleServices = invoice.items.some(item => {
        const itemType = (item.itemType || '').toLowerCase();
        const category = (item.category || '').toLowerCase();
        const isEligible = eligibleItemTypes.includes(itemType) || 
                          eligibleItemTypes.includes(category) ||
                          itemType.includes('med') || 
                          itemType.includes('lab') || 
                          itemType.includes('imag');
        
        console.log('   ✓ Item:', item.name, '| Type:', item.itemType, '| Category:', item.category, '| Eligible:', isEligible);
        return isEligible;
      });
      
      console.log('🎯 [Insurance Check] Has eligible services:', hasEligibleServices);
      console.log('✅ [Insurance Check] Final result - Insurance eligible:', isInsuranceCard && hasEligibleServices);
      
      return isInsuranceCard && hasEligibleServices;
    } catch (error) {
      console.error('❌ [Insurance Check] Error checking insurance patient eligibility:', error);
      return false;
    }
  },

  /**
   * Process payment for an invoice
   * @param {Object} paymentData - Payment data
   * @param {String} userId - User processing the payment
   * @returns {Promise<Object>} - Updated invoice
   */
  async processPayment(paymentData, userId) {
    try {
      console.log('Processing payment (no transactions):', paymentData);
      const invoice = await MedicalInvoice.findById(paymentData.invoiceId);
      
      if (!invoice) {
        throw new ErrorResponse('Invoice not found', 404);
      }
      
      if (paymentData.amount <= 0) {
        throw new ErrorResponse('Payment amount must be greater than zero', 400);
      }
      
      // Check if this is an insurance patient with eligible services
      const isInsuranceEligible = await this.isInsurancePatientWithEligibleServices(invoice);
      
      // For insurance patients with prescriptions/lab/imaging, allow any amount as full payment
      if (isInsuranceEligible) {
        console.log('Insurance patient with eligible services - accepting any amount as full payment');
        paymentData.amount = invoice.balance; // Set amount to full balance
      } else if (paymentData.amount > invoice.balance) {
        throw new ErrorResponse('Payment amount exceeds invoice balance', 400);
      }
      
      const payment = {
        amount: paymentData.amount,
        method: paymentData.method,
        reference: paymentData.reference,
        notes: isInsuranceEligible 
          ? (paymentData.notes || '') + ' [Insurance Patient - Full Payment Applied]'
          : paymentData.notes,
        date: new Date(),
        processedBy: userId
      };
      
      invoice.amountPaid += paymentData.amount;
      invoice.balance -= paymentData.amount;
      
      // For insurance patients, always set status to 'paid' regardless of amount
      if (isInsuranceEligible) {
        invoice.status = 'paid';
        invoice.paidDate = new Date();
        invoice.balance = 0; // Ensure balance is 0 for insurance patients
        invoice.amountPaid = invoice.total; // Ensure full amount is marked as paid
        console.log('Insurance patient - Full payment applied, status: paid');
      } else if (invoice.balance <= 0) {
        invoice.status = 'paid';
        invoice.paidDate = new Date();
        console.log('Full payment completed, balance: 0');
      } else {
        invoice.status = 'partial';
        console.log('Partial payment applied, new balance:', invoice.balance);
      }
      
      invoice.payments.push(payment);
      await invoice.save();  // Explicitly non-transactional save
      
      try {
        // After persisting payment, update or clean up notifications
        const { updatePaymentNotifications } = require('../utils/notificationUpdater');
        const NotificationCleanup = require('../utils/notificationCleanup');
        const paymentState = invoice.balance <= 0 ? 'paid' : 'partial';
        await updatePaymentNotifications(invoice._id, paymentState, paymentData.amount);
        await NotificationCleanup.cleanupPaymentNotifications(invoice._id.toString(), invoice.patient.toString());
      } catch (notifyErr) {
        console.warn('Notification update failed (non-fatal):', notifyErr?.message || notifyErr);
      }

      return await invoice.populate([
        { path: 'patient', select: 'firstName lastName patientId' },
        { path: 'provider', select: 'firstName lastName' },
        { path: 'payments.processedBy', select: 'firstName lastName' }
      ]);
    } catch (error) {
      console.error('Payment error details:', error);
      if (error instanceof ErrorResponse) {
        throw error;
      }
      throw new ErrorResponse('Payment failed: ' + error.message, 500);
    }
  },
  
  /**
   * Get invoice by ID with populated fields
   * @param {String} invoiceId - Invoice ID
   * @returns {Promise<Object>} - Invoice details
   */
  async getInvoiceById(invoiceId) {
    try {
      const invoice = await MedicalInvoice.findById(invoiceId)
        .populate('patient', 'firstName lastName patientId')
        .populate('provider', 'firstName lastName')
        .populate('createdBy', 'firstName lastName')
        .populate('payments.processedBy', 'firstName lastName')
        .populate('patientCard', 'cardNumber type status');
      
      if (!invoice) {
        throw new ErrorResponse('Invoice not found', 404);
      }
      
      return invoice;
    } catch (error) {
      if (error instanceof ErrorResponse) {
        throw error;
      }
      throw new ErrorResponse(error.message, 500);
    }
  },
  
  /**
   * Get invoices with filters and pagination
   * @param {Object} filters - Filter conditions
   * @param {Object} options - Pagination and sorting options
   * @returns {Promise<Object>} - Paginated invoice list
   */
  async getInvoices(filters = {}, options = {}) {
    try {
      const query = MedicalInvoice.find(filters)
        .populate('patient', 'firstName lastName patientId')
        .populate('provider', 'firstName lastName')
        .populate('createdBy', 'firstName lastName');
      
      const page = parseInt(options.page, 10) || 1;
      const limit = parseInt(options.limit, 10) || 10;
      const startIndex = (page - 1) * limit;
      
      const total = await MedicalInvoice.countDocuments(filters);
      const invoices = await query
        .skip(startIndex)
        .limit(limit)
        .sort(options.sort || { createdAt: -1 });
      
      return {
        success: true,
        count: invoices.length,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        data: invoices
      };
    } catch (error) {
      throw new ErrorResponse(error.message, 500);
    }
  },
  
  /**
   * Update invoice details
   * @param {String} invoiceId - Invoice ID
   * @param {Object} updateData - Data to update
   * @param {String} userId - User making the update
   * @returns {Promise<Object>} - Updated invoice
   */
  async updateInvoice(invoiceId, updateData, userId) {
    try {
      const invoice = await MedicalInvoice.findById(invoiceId);
      if (!invoice) {
        throw new ErrorResponse('Invoice not found', 404);
      }
      
      // Check if this is an update for insurance invoice
      const isInsuranceInvoice =
        invoice.paymentMethod === 'insurance' ||
        (invoice.payments && invoice.payments.some(p => p.method === 'insurance'));
      
      // Detect if this request is trying to update items
      const isItemsUpdate = Object.prototype.hasOwnProperty.call(updateData, 'items');
      
      // Allow item updates for:
      // - Insurance invoices (even if paid)
      // - Regular invoices that are not fully paid/cancelled/refunded
      const canUpdateItems =
        isItemsUpdate &&
        (isInsuranceInvoice ||
          ['draft', 'pending', 'partial', 'overdue'].includes((invoice.status || '').toLowerCase()));
      
      if (canUpdateItems) {
        // Allow items update with full validation
        // Validate items before updating
        if (!updateData.items || !Array.isArray(updateData.items) || updateData.items.length === 0) {
          throw new ErrorResponse('Invoice must contain at least one item', 400);
        }
        
        // Validate each item
        for (let i = 0; i < updateData.items.length; i++) {
          const item = updateData.items[i];
          if (!item.description || !item.itemType) {
            throw new ErrorResponse(`Item ${i + 1} is missing required fields (description or itemType)`, 400);
          }
          if (!item.quantity || item.quantity <= 0) {
            throw new ErrorResponse(`Item ${i + 1} has invalid quantity: ${item.quantity}`, 400);
          }
          if (!item.unitPrice || item.unitPrice <= 0) {
            throw new ErrorResponse(`Item ${i + 1} has invalid unit price: ${item.unitPrice}`, 400);
          }
        }
        
        invoice.items = updateData.items;
        invoice.lastUpdatedBy = userId;
        
        // For insurance invoices, set a flag to preserve balance after recalculation
        if (isInsuranceInvoice && invoice.status === 'paid') {
          invoice._preserveInsuranceBalance = true;
        }
        
        try {
          // Mark items as modified so Mongoose validates them
          invoice.markModified('items');
          
          // Save the invoice - the pre-save hook will recalculate totals
          await invoice.save();
        } catch (saveError) {
          console.error('Error saving invoice:', saveError);
          console.error('Save error details:', {
            message: saveError.message,
            name: saveError.name,
            errors: saveError.errors,
            stack: saveError.stack
          });
          
          // Extract validation errors if they exist
          if (saveError.errors) {
            const validationErrors = Object.keys(saveError.errors).map(key => {
              return `${key}: ${saveError.errors[key].message}`;
            }).join(', ');
            throw new ErrorResponse(`Validation failed: ${validationErrors}`, 400);
          }
          
          throw new ErrorResponse(saveError.message || 'Failed to save invoice', 500);
        }
        
        return invoice.populate([
          { path: 'patient', select: 'firstName lastName patientId' },
          { path: 'provider', select: 'firstName lastName' },
          { path: 'lastUpdatedBy', select: 'firstName lastName' }
        ]);
      }
      
      // Payment info fields and invoiceNumber can always be updated, even for paid invoices
      const paymentInfoFields = ['paymentTIN', 'paymentCustomerName', 'paymentMethod', 'paymentNotes'];
      const alwaysUpdatableFields = ['paymentTIN', 'paymentCustomerName', 'paymentMethod', 'paymentNotes', 'invoiceNumber'];
      const hasPaymentInfoFields = Object.keys(updateData).some(key => paymentInfoFields.includes(key));
      const hasInvoiceNumberUpdate = updateData.hasOwnProperty('invoiceNumber');
      
      // Extract payment info fields and invoiceNumber separately
      const paymentInfoData = {};
      const otherUpdateData = {};
      Object.keys(updateData).forEach(key => {
        if (paymentInfoFields.includes(key)) {
          // Allow empty strings for payment info fields
          paymentInfoData[key] = updateData[key] || '';
        } else if (key === 'invoiceNumber') {
          // Handle invoiceNumber separately
          otherUpdateData[key] = updateData[key];
        } else {
          otherUpdateData[key] = updateData[key];
        }
      });
      
      console.log('🔍 [updateInvoice] Update request:', {
        invoiceId,
        invoiceStatus: invoice.status,
        hasPaymentInfoFields,
        hasInvoiceNumberUpdate,
        paymentInfoData,
        otherUpdateDataKeys: Object.keys(otherUpdateData),
        updateDataKeys: Object.keys(updateData)
      });
      
      // For non-payment info and non-invoiceNumber updates, check status
      const restrictedUpdateData = { ...otherUpdateData };
      if (hasInvoiceNumberUpdate) {
        delete restrictedUpdateData.invoiceNumber;
      }
      
      if (Object.keys(restrictedUpdateData).length > 0 && (invoice.status === 'paid' || invoice.status === 'cancelled' || invoice.status === 'refunded')) {
        throw new ErrorResponse(`Cannot update ${invoice.status} invoice`, 400);
      }
      
      // Update payment info fields (always allowed, even for paid invoices)
      if (hasPaymentInfoFields) {
        Object.keys(paymentInfoData).forEach(key => {
          invoice[key] = paymentInfoData[key];
        });
        console.log('✅ [updateInvoice] Payment info fields updated:', paymentInfoData);
      }
      
      // Update other allowed fields (only if invoice is not paid/cancelled/refunded)
      const allowedUpdates = ['items', 'dueDate', 'notes', 'insurance', 'attachment', 'invoiceNumber'];
      
      // Handle invoiceNumber update separately to check uniqueness
      if (otherUpdateData.invoiceNumber && otherUpdateData.invoiceNumber !== invoice.invoiceNumber) {
        // Check if the new invoice number already exists
        const existingInvoice = await MedicalInvoice.findOne({ 
          invoiceNumber: otherUpdateData.invoiceNumber,
          _id: { $ne: invoiceId }
        });
        if (existingInvoice) {
          throw new ErrorResponse('Invoice number already exists. Please use a different invoice number.', 400);
        }
        invoice.invoiceNumber = otherUpdateData.invoiceNumber;
      }
      
      Object.keys(otherUpdateData).forEach(key => {
        if (allowedUpdates.includes(key) && key !== 'invoiceNumber') {
          invoice[key] = otherUpdateData[key];
        }
      });
      
      invoice.lastUpdatedBy = userId;
      await invoice.save();
      
      return invoice.populate([
        { path: 'patient', select: 'firstName lastName patientId' },
        { path: 'provider', select: 'firstName lastName' },
        { path: 'lastUpdatedBy', select: 'firstName lastName' }
      ]);
    } catch (error) {
      if (error instanceof ErrorResponse) {
        throw error;
      }
      throw new ErrorResponse(error.message, 500);
    }
  },
  
  /**
   * Cancel an invoice
   * @param {String} invoiceId - Invoice ID
   * @param {String} userId - User cancelling the invoice
   * @param {String} reason - Cancellation reason
   * @returns {Promise<Object>} - Cancelled invoice
   */
  async cancelInvoice(invoiceId, userId, reason) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const invoice = await MedicalInvoice.findById(invoiceId).session(session);
      if (!invoice) {
        throw new ErrorResponse('Invoice not found', 404);
      }
      
      if (invoice.status === 'cancelled' || invoice.status === 'refunded') {
        throw new ErrorResponse(`Invoice is already ${invoice.status}`, 400);
      }
      
      if (invoice.amountPaid > 0) {
        throw new ErrorResponse('Cannot cancel invoice with payments. Process a refund instead.', 400);
      }
      
      invoice.status = 'cancelled';
      invoice.notes = `${invoice.notes ? invoice.notes + '\n' : ''}Cancelled: ${reason}`;
      invoice.lastUpdatedBy = userId;
      
      await invoice.save({ session });
      await session.commitTransaction();
      
      return invoice.populate([
        { path: 'patient', select: 'firstName lastName patientId' },
        { path: 'lastUpdatedBy', select: 'firstName lastName' }
      ]);
    } catch (error) {
      await session.abortTransaction();
      if (error instanceof ErrorResponse) {
        throw error;
      }
      throw new ErrorResponse(error.message, 500);
    } finally {
      session.endSession();
    }
  },

  // Fetch all invoices with filtering/pagination options
  async fetchAllInvoices(queryOptions = {}) {
    // Basic implementation - add more sophisticated filtering/pagination as needed
    const filter = queryOptions.filter || {}; // e.g., { status: 'paid' }
    const sort = queryOptions.sort || { issueDate: -1 }; // Default sort by newest
    
    console.log('Fetching invoices with filter:', filter);
    
    try {
      // Use a more complete populate to ensure we have all patient details
      const invoices = await MedicalInvoice.find(filter)
        .sort(sort)
        .populate({
          path: 'patient',
          select: 'firstName lastName patientId email fullName'
        })
        .lean();
      
      console.log(`Fetched ${invoices?.length || 0} invoices from database`);
      
      // Process invoices to ensure they have patient names and proper values
      const formattedInvoices = (invoices || []).map(invoice => {
        // Make sure numeric values are not NaN
        const safeInvoice = {
          ...invoice,
          total: typeof invoice.total === 'number' && !isNaN(invoice.total) ? invoice.total : 0,
          amount: typeof invoice.amount === 'number' && !isNaN(invoice.amount) ? invoice.amount : 0,
          balanceDue: typeof invoice.balanceDue === 'number' && !isNaN(invoice.balanceDue) ? invoice.balanceDue : 0,
          amountDue: typeof invoice.amountDue === 'number' && !isNaN(invoice.amountDue) ? invoice.amountDue : 0,
          status: invoice.status || 'pending'
        };
        
        // Add patientName field if patient data is available
        if (invoice.patient && typeof invoice.patient === 'object') {
          if (invoice.patient.firstName && invoice.patient.lastName) {
            safeInvoice.patientName = `${invoice.patient.firstName} ${invoice.patient.lastName}`;
          } else if (invoice.patient.fullName) {
            safeInvoice.patientName = invoice.patient.fullName;
          }
        }
        
        // Add fallback patient name for UI display if missing
        if (!safeInvoice.patientName) {
          const patientId = (invoice.patient && typeof invoice.patient === 'object' && invoice.patient._id) 
            ? invoice.patient._id 
            : (typeof invoice.patient === 'string' ? invoice.patient : invoice.patientId);
          
          safeInvoice.patientName = `Patient (ID: ${patientId || 'Unknown'})`;
        }
        
        return safeInvoice;
      });
      
      return formattedInvoices;
    } catch (error) {
      console.error('Error in fetchAllInvoices:', error);
      return []; // Return empty array on error
    }
  },

  // Fetch a single invoice by ID
  async fetchInvoiceById(id) {
    const invoice = await MedicalInvoice.findById(id)
      .populate('patient', 'firstName lastName email') // Populate patient details
      .populate('appointment'); // Populate appointment if linked
    // Consider populating payment details if needed
    if (!invoice) {
        const error = new Error('Invoice not found');
        error.statusCode = 404;
        throw error;
    }
    return invoice;
  },

  // Create a new invoice
  async createNewInvoice(invoiceData) {
    // TODO: Add validation logic here or use Mongoose validation
    // TODO: Consider generating invoiceNumber sequentially or using a library
    const invoice = await MedicalInvoice.create(invoiceData);
    // Populate patient details for the response
    await invoice.populate('patient', 'firstName lastName');
    return invoice;
  },

  // Update an existing invoice
  async updateExistingInvoice(id, updateData) {
    // TODO: Add validation for updateData
    // Prevent changing critical fields directly (e.g., amountPaid)
    // Recalculation happens in the pre-save hook
    const invoice = await MedicalInvoice.findByIdAndUpdate(id, updateData, {
      new: true, // Return the updated document
      runValidators: true, // Run schema validators
    }).populate('patient', 'firstName lastName');
     if (!invoice) {
        const error = new Error('Invoice not found for update');
        error.statusCode = 404;
        throw error;
    }
    return invoice;
  },

  // Remove an invoice
  async removeInvoice(id) {
    // Consider soft delete (setting an isActive flag) instead of hard delete
    const invoice = await MedicalInvoice.findByIdAndDelete(id);
    if (!invoice) {
        const error = new Error('Invoice not found for deletion');
        error.statusCode = 404;
        throw error;
    }
    return true; // Return true if deletion was successful
  },

  // Record a new payment against an invoice
  async recordNewPayment(paymentData) {
    // TODO: Add validation for paymentData
    const { invoiceId, amount, recordedBy } = paymentData; // Make sure recordedBy ID is passed from controller

    // 1. Find the invoice
    const invoice = await MedicalInvoice.findById(invoiceId);
    if (!invoice) {
      const error = new Error('Invoice not found');
      error.statusCode = 404;
      throw error;
    }
    if (invoice.status === 'paid' || invoice.status === 'void') {
       const error = new Error(`Invoice status is ${invoice.status}, cannot record payment.`);
       error.statusCode = 400;
       throw error;
    }

    // 2. Create the Payment record
    const payment = await Payment.create({
      ...paymentData,
      patient: invoice.patient, // Link patient from invoice
    });

    // 3. Update the Invoice
    invoice.amountPaid = (invoice.amountPaid || 0) + amount;
    // The pre-save hook will recalculate amountDue and update status
    await invoice.save();

    // Populate payment details for the response
    await payment.populate('recordedBy', 'name'); // Assuming User model has 'name'
    await payment.populate('invoice', 'invoiceNumber status totalAmount amountDue'); // Populate some invoice details

    return payment;
  },

  // Generate data for a revenue report
  async generateRevenueData(queryOptions = {}) {
    // Example: Aggregate payments within a date range
    const { startDate, endDate } = queryOptions;
    const matchCriteria = {};
    if (startDate || endDate) {
        matchCriteria.paymentDate = {};
        if (startDate) matchCriteria.paymentDate.$gte = new Date(startDate);
        if (endDate) matchCriteria.paymentDate.$lte = new Date(endDate);
    }

    try {
        const revenueData = await Payment.aggregate([
          { $match: matchCriteria },
          {
            $group: {
              _id: null, // Group all matched payments
              totalRevenue: { $sum: '$amount' },
              count: { $sum: 1 },
            },
          },
           { $project: { _id: 0 } } // Exclude the _id field from the result
        ]);
        return revenueData[0] || { totalRevenue: 0, count: 0 }; // Return result or default
    } catch (error) {
        console.error("Error generating revenue report:", error);
        const err = new Error("Failed to generate revenue report");
        err.statusCode = 500;
        throw err; // Propagate error to controller for handling
    }
  },

  /**
   * Create or update a consolidated invoice for a patient
   * This allows adding multiple services (card, medication, lab, imaging) to one invoice
   * @param {Object} invoiceData - Invoice data
   * @param {String} userId - User creating/updating the invoice
   * @returns {Promise<Object>} - Created or updated invoice
   */
  async createOrUpdateConsolidatedInvoice(invoiceData, userId) {
    // Skip transactions for now to avoid replica set requirement
    try {
      const { patient, items, serviceType = 'service', notes, medicalRecord, visit, provider } = invoiceData;
      
      // Handle case where no user is provided (system-generated invoices)
      let systemUserId = userId;
      if (!systemUserId) {
        // Try to find a system user or create a placeholder
        try {
          const User = require('../models/User');
          const systemUser = await User.findOne({ role: 'admin' });
          if (systemUser) {
            systemUserId = systemUser._id;
          } else {
            // If no admin user exists, we'll need to handle this differently
            console.warn('No admin user found for system-generated invoice');
            // For now, we'll skip invoice creation if no user is available
            throw new Error('No system user available for invoice creation');
          }
        } catch (userError) {
          console.error('Error finding system user:', userError.message);
          throw new Error('Unable to create invoice: No valid user context');
        }
      }
      
      // 🔍 CHECK: First look for existing non-finalized invoice for today
      // This ensures new lab orders are grouped together in the same invoice
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      
      console.log(`🔍 Looking for existing consolidated invoice for patient ${patient} on ${startOfDay.toDateString()}`);
      
      // Find existing consolidated invoice for today (not finalized)
      let existingInvoice = await MedicalInvoice.findOne({
        patient: patient,
        isConsolidated: true,
        isDailyConsolidated: true,
        finalized: false, // Only find non-finalized invoices
        createdAt: {
          $gte: startOfDay,
          $lt: endOfDay
        }
      });
      
      // If no existing non-finalized invoice found, check if patient has finalized invoices
      // If they do and this is a lab order, we'll create a new invoice (not add to finalized)
      const isLabService = serviceType === 'lab' || items.some(item => item.category === 'lab' || item.itemType === 'lab');
      let hasFinalizedInvoice = false;
      
      if (!existingInvoice && isLabService) {
        const finalizedInvoice = await MedicalInvoice.findOne({
          patient: patient,
          finalized: true
        });
        
        if (finalizedInvoice) {
          hasFinalizedInvoice = true;
          console.log(`🆕 Patient has finalized invoice(s) but no non-finalized invoice for today. Creating new invoice for lab order.`);
        }
      }
      
      if (existingInvoice) {
        // Double-check that invoice is not finalized (safety check)
        if (existingInvoice.finalized) {
          throw new Error('Cannot add items to a finalized invoice. Please create a new invoice or contact reception.');
        }
        // Update existing consolidated invoice
        console.log(`📝 Updating existing consolidated invoice: ${existingInvoice.invoiceNumber}`);
        
        // Add new items to existing invoice
        const newItems = items.map(item => ({
          ...item,
          discount: item.discount || 0,
          tax: item.tax || 0,
          total: item.totalPrice || item.unitPrice * item.quantity,
            addedAt: new Date(),
          addedBy: systemUserId,
          category: item.category || serviceType
        }));
        
        existingInvoice.items.push(...newItems);
        
        // Recalculate totals
        const subtotal = existingInvoice.items.reduce((sum, item) => sum + (item.total || 0), 0);
        const taxTotal = existingInvoice.items.reduce((sum, item) => sum + (item.tax || 0), 0);
        const discountTotal = existingInvoice.items.reduce((sum, item) => sum + (item.discount || 0), 0);
        const total = subtotal + taxTotal - discountTotal;
        
        existingInvoice.subtotal = subtotal;
        existingInvoice.taxTotal = taxTotal;
        existingInvoice.discountTotal = discountTotal;
        existingInvoice.total = total;
        existingInvoice.balance = Math.max(0, total - (existingInvoice.amountPaid || 0));
        existingInvoice.status = existingInvoice.balance === 0 ? 'paid' : (existingInvoice.amountPaid > 0 ? 'partial' : 'pending');
        existingInvoice.lastUpdated = new Date();
        existingInvoice.lastUpdatedBy = systemUserId;
        
        // Update notes to reflect new services
        const serviceTypes = [...new Set(existingInvoice.items.map(item => item.category))];
        existingInvoice.notes = `Consolidated invoice with ${serviceTypes.join(', ')} services - Updated on ${new Date().toLocaleString()}`;
        
        await existingInvoice.save();
        
        console.log(`✅ Updated consolidated invoice: ${existingInvoice.invoiceNumber}`);
        console.log(`   Total items: ${existingInvoice.items.length}`);
        console.log(`   New total: ETB ${total}`);
        console.log(`   Balance: ETB ${existingInvoice.balance}`);
        console.log(`   Status: ${existingInvoice.status}`);
        
        return existingInvoice;
      } else {
        // Create new consolidated invoice
        console.log(`Creating new consolidated invoice for patient ${patient}`);
        
        // Generate invoice number
        const invoiceNumber = await MedicalInvoice.generateInvoiceNumber();
        
        // Get patient details for required fields
        const patientDoc = await Patient.findById(patient);
        if (!patientDoc) {
          throw new Error(`Patient not found with ID: ${patient}`);
        }
        // Use the patient's patientId field (should be auto-generated by pre-save hook)
        // If for some reason it's not set, use the _id as string
        const patientId = patientDoc.patientId || patientDoc._id.toString();
        const patientName = `${patientDoc.firstName} ${patientDoc.lastName}`;
        
        // Calculate totals
        const subtotal = items.reduce((sum, item) => sum + (item.totalPrice || item.unitPrice * item.quantity), 0);
        const taxTotal = items.reduce((sum, item) => sum + (item.tax || 0), 0);
        const discountTotal = items.reduce((sum, item) => sum + (item.discount || 0), 0);
        const total = subtotal + taxTotal - discountTotal;
        
        // Create invoice object
        const shouldUseLabFinalizedNote = isLabService && hasFinalizedInvoice;
        const invoice = new MedicalInvoice({
          invoiceNumber,
          patient,
          patientId,
          patientName,
          medicalRecord,
          visit,
          provider,
          items: items.map(item => ({
            ...item,
            discount: item.discount || 0,
            tax: item.tax || 0,
            total: item.totalPrice || item.unitPrice * item.quantity,
            addedAt: new Date(),
            addedBy: systemUserId,
            category: item.category || serviceType
          })),
          subtotal,
          taxTotal,
          discountTotal,
          total,
          balance: total,
          dateIssued: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          status: 'pending',
          notes: notes || (shouldUseLabFinalizedNote ? `New invoice for lab order (patient has finalized invoices)` : `Initial consolidated invoice created with ${serviceType}`),
          createdBy: systemUserId,
          isConsolidated: true, // Flag to indicate this is a consolidated invoice
          isDailyConsolidated: true, // Flag to indicate this is a daily consolidated invoice
          type: 'consolidated',
          finalized: false // Invoice starts as not finalized
        });
        
        await invoice.save();
        
        console.log(`✅ Created new consolidated invoice: ${invoice.invoiceNumber}`);
        console.log(`   Patient: ${patientName}`);
        console.log(`   Items: ${items.length}`);
        console.log(`   Total: ETB ${total}`);
        console.log(`   Status: ${invoice.status}`);
        
        return invoice;
      }
    } catch (error) {
      console.error('❌ Error in createOrUpdateConsolidatedInvoice:', error);
      console.error('   Invoice Data:', invoiceData);
      console.error('   User ID:', userId);
      throw new Error(`Failed to create/update consolidated invoice: ${error.message}`);
    }
  },

  /**
   * Add multiple services to the daily consolidated invoice for a patient
   * This ensures all items are added to the same invoice in one operation
   * @param {String} patientId - Patient ID
   * @param {String} serviceType - Type of service (card, lab, medication, imaging)
   * @param {Array} servicesData - Array of service data objects
   * @param {String} userId - User adding the services
   * @returns {Promise<Object>} - Updated invoice
   */
  async addMultipleServicesToDailyInvoice(patientId, serviceType, servicesData, userId) {
    try {
      console.log(`🔧 Adding ${servicesData.length} ${serviceType} services to daily invoice for patient ${patientId}`);
      
      // Prepare all items at once
      const items = servicesData.map(serviceData => {
        let itemData = {
          category: serviceType,
          addedAt: new Date(),
          addedBy: userId
        };
        
        switch (serviceType) {
          case 'card':
            itemData = {
              ...itemData,
              itemType: 'card',
              serviceName: serviceData.cardType,
              description: `${serviceData.cardType} - ${serviceData.benefitType || 'Annual Fee'}`,
              quantity: 1,
              unitPrice: serviceData.amount,
              totalPrice: serviceData.amount,
              total: serviceData.amount,
              metadata: {
                cardTypeId: serviceData.cardTypeId,
                cardNumber: serviceData.cardNumber,
                benefits: serviceData.benefits
              }
            };
            break;
            
          case 'lab':
            const labServiceName = serviceData.serviceName || serviceData.testName || 'Lab Test';
            // Round prices to 2 decimal places for consistency
            const labUnitPrice = serviceData.totalPrice || serviceData.unitPrice || 0;
            const roundedLabPrice = Math.round(labUnitPrice * 100) / 100;
            itemData = {
              ...itemData,
              itemType: 'lab',
              serviceName: labServiceName,
              description: `Lab test: ${labServiceName}`,
              quantity: 1,
              unitPrice: roundedLabPrice,
              totalPrice: roundedLabPrice,
              total: roundedLabPrice,
              metadata: {
                labOrderId: serviceData.labOrderId,
                testType: serviceData.testType,
                serviceId: serviceData.metadata?.serviceId
              }
            };
            break;
            
          case 'medication':
            const medServiceName = serviceData.serviceName || serviceData.medicationName || 'Medication';
            itemData = {
              ...itemData,
              itemType: 'medication',
              serviceName: medServiceName,
              description: serviceData.description || `${medServiceName} ${serviceData.dosage || ''} - ${serviceData.frequency || ''} for ${serviceData.duration || ''} days`,
              quantity: serviceData.quantity || 1,
              unitPrice: serviceData.unitPrice || serviceData.totalPrice,
              totalPrice: serviceData.totalPrice || serviceData.unitPrice,
              total: serviceData.totalPrice || serviceData.unitPrice,
              serviceId: serviceData.metadata?.serviceId,
              metadata: {
                ...serviceData.metadata,
                prescriptionId: serviceData.prescriptionId,
                medicationName: serviceData.medicationName || medServiceName,
                dosage: serviceData.dosage,
                frequency: serviceData.frequency,
                duration: serviceData.duration,
                serviceId: serviceData.metadata?.serviceId
              }
            };
            break;
            
          case 'imaging':
            const imgServiceName = serviceData.serviceName || serviceData.imagingType || 'Imaging';
            itemData = {
              ...itemData,
              itemType: 'imaging',
              serviceName: imgServiceName,
              description: `Imaging: ${imgServiceName}`,
              quantity: 1,
              unitPrice: serviceData.totalPrice || serviceData.unitPrice,
              totalPrice: serviceData.totalPrice || serviceData.unitPrice,
              total: serviceData.totalPrice || serviceData.unitPrice,
              serviceId: serviceData.metadata?.serviceId,
              metadata: {
                imagingOrderId: serviceData.imagingOrderId,
                imagingType: serviceData.imagingType,
                serviceId: serviceData.metadata?.serviceId
              }
            };
            break;
            
          default:
            const defaultServiceName = serviceData.serviceName || serviceData.description || serviceType;
            itemData = {
              ...itemData,
              itemType: 'service',
              serviceName: defaultServiceName,
              description: serviceData.description || `${defaultServiceName} service`,
              quantity: serviceData.quantity || 1,
              unitPrice: serviceData.unitPrice || serviceData.totalPrice,
              totalPrice: serviceData.totalPrice || serviceData.unitPrice,
              total: serviceData.totalPrice || serviceData.unitPrice,
              serviceId: serviceData.metadata?.serviceId,
              metadata: {
                ...serviceData.metadata,
                serviceId: serviceData.metadata?.serviceId
              }
            };
        }
        
        return itemData;
      });
      
      // Create or update consolidated invoice with all items at once
      const invoiceData = {
        patient: patientId,
        items: items,
        serviceType: serviceType,
        notes: `Added ${items.length} ${serviceType} service(s) to daily consolidated invoice`
      };
      
      const invoice = await this.createOrUpdateConsolidatedInvoice(invoiceData, userId);
      
      // Deduct inventory for services that have linked inventory items
      for (const item of items) {
        if (item.serviceId) {
          await this.deductServiceInventory(item.serviceId, item.quantity || 1, userId);
        }
      }
      
      console.log(`✅ Successfully added ${items.length} ${serviceType} service(s) to invoice: ${invoice.invoiceNumber}`);
      return invoice;
      
    } catch (error) {
      console.error(`❌ Error adding multiple ${serviceType} services to daily invoice:`, error);
      console.error(`   Patient ID: ${patientId}`);
      console.error(`   Service Type: ${serviceType}`);
      console.error(`   Services Count: ${servicesData.length}`);
      throw new Error(`Failed to add ${serviceType} services to invoice: ${error.message}`);
    }
  },

  /**
   * Add a service to the daily consolidated invoice for a patient
   * @param {String} patientId - Patient ID
   * @param {String} serviceType - Type of service (card, lab, medication, imaging)
   * @param {Object} serviceData - Service data
   * @param {String} userId - User adding the service
   * @returns {Promise<Object>} - Updated invoice
   */
  async addServiceToDailyInvoice(patientId, serviceType, serviceData, userId) {
    try {
      console.log(`🔧 Adding ${serviceType} service to daily invoice for patient ${patientId}`);
      
      // Prepare item data based on service type
      let itemData = {
        category: serviceType,
        addedAt: new Date(),
        addedBy: userId
      };
      
      switch (serviceType) {
        case 'card':
          itemData = {
            ...itemData,
            itemType: 'card',
            serviceName: serviceData.cardType,
            description: `${serviceData.cardType} - ${serviceData.benefitType || 'Annual Fee'}`,
            quantity: 1,
            unitPrice: serviceData.amount,
            totalPrice: serviceData.amount,
            total: serviceData.amount,
            metadata: {
              cardTypeId: serviceData.cardTypeId,
              cardNumber: serviceData.cardNumber,
              benefits: serviceData.benefits
            }
          };
          break;
          
        case 'lab':
          const labServiceName = serviceData.serviceName || serviceData.testName || 'Lab Test';
          // Round prices to 2 decimal places for consistency
          const labUnitPrice2 = serviceData.totalPrice || serviceData.unitPrice || 0;
          const roundedLabPrice2 = Math.round(labUnitPrice2 * 100) / 100;
          itemData = {
            ...itemData,
            itemType: 'lab',
            serviceName: labServiceName,
            description: `Lab test: ${labServiceName}`,
            quantity: 1,
            unitPrice: roundedLabPrice2,
            totalPrice: roundedLabPrice2,
            total: roundedLabPrice2,
            // DO NOT include serviceId for lab items - inventory is deducted during lab completion, not billing
            // serviceId: serviceData.metadata?.serviceId,
            metadata: {
              labOrderId: serviceData.labOrderId,
              testType: serviceData.testType,
              serviceId: serviceData.metadata?.serviceId
            }
          };
          break;
          
        case 'medication':
          const medServiceName = serviceData.serviceName || serviceData.medicationName || 'Medication';
          itemData = {
            ...itemData,
            itemType: 'medication',
            serviceName: medServiceName,
            description: serviceData.description || `${medServiceName} ${serviceData.dosage || ''} - ${serviceData.frequency || ''} for ${serviceData.duration || ''} days`,
            quantity: serviceData.quantity || 1,
            unitPrice: serviceData.unitPrice || serviceData.totalPrice,
            totalPrice: serviceData.totalPrice || serviceData.unitPrice,
            total: serviceData.totalPrice || serviceData.unitPrice,
            serviceId: serviceData.metadata?.serviceId, // Add serviceId for inventory deduction
            metadata: {
              prescriptionId: serviceData.prescriptionId,
              medicationName: serviceData.medicationName || medServiceName,
              dosage: serviceData.dosage,
              frequency: serviceData.frequency,
              duration: serviceData.duration,
              serviceId: serviceData.metadata?.serviceId
            }
          };
          break;
          
        case 'imaging':
          const imgServiceName = serviceData.serviceName || serviceData.imagingType || 'Imaging';
          itemData = {
            ...itemData,
            itemType: 'imaging',
            serviceName: imgServiceName,
            description: `Imaging: ${imgServiceName}`,
            quantity: 1,
            unitPrice: serviceData.totalPrice || serviceData.unitPrice,
            totalPrice: serviceData.totalPrice || serviceData.unitPrice,
            total: serviceData.totalPrice || serviceData.unitPrice,
            serviceId: serviceData.metadata?.serviceId, // Add serviceId for inventory deduction
            metadata: {
              imagingOrderId: serviceData.imagingOrderId,
              imagingType: serviceData.imagingType,
              serviceId: serviceData.metadata?.serviceId
            }
          };
          break;
          
        default:
          const defaultServiceName = serviceData.serviceName || serviceData.description || serviceType;
          itemData = {
            ...itemData,
            itemType: 'service',
            serviceName: defaultServiceName,
            description: serviceData.description || `${defaultServiceName} service`,
            quantity: serviceData.quantity || 1,
            unitPrice: serviceData.unitPrice || serviceData.totalPrice,
            totalPrice: serviceData.totalPrice || serviceData.unitPrice,
            total: serviceData.totalPrice || serviceData.unitPrice,
            serviceId: serviceData.metadata?.serviceId, // Add serviceId for inventory deduction
            metadata: {
              ...serviceData.metadata,
              serviceId: serviceData.metadata?.serviceId
            }
          };
      }
      
      // Create or update consolidated invoice
      const invoiceData = {
        patient: patientId,
        items: [itemData],
        serviceType: serviceType,
        notes: `Added ${serviceType} service to daily consolidated invoice`
      };
      
      const invoice = await this.createOrUpdateConsolidatedInvoice(invoiceData, userId);
      
      // Deduct inventory for services that have linked inventory items
      if (itemData.serviceId) {
        try {
          const inventoryDeductionService = require('./inventoryDeductionService');
          await inventoryDeductionService.deductServiceInventory(itemData.serviceId, itemData.quantity || 1, userId);
        } catch (inventoryError) {
          console.error(`⚠️ [BILLING] Error deducting service inventory:`, inventoryError);
          // Don't fail the invoice creation if inventory deduction fails
        }
      }
      
      console.log(`✅ Successfully added ${serviceType} service to invoice: ${invoice.invoiceNumber}`);
      return invoice;
      
    } catch (error) {
      console.error(`❌ Error adding ${serviceType} service to daily invoice:`, error);
      console.error(`   Patient ID: ${patientId}`);
      console.error(`   Service Type: ${serviceType}`);
      console.error(`   Service Data:`, serviceData);
      throw new Error(`Failed to add ${serviceType} service to invoice: ${error.message}`);
    }
  },

  /**
   * DISABLED: Deduct inventory when a service is completed
   * This method is disabled to prevent duplicate deductions
   * Use inventoryDeductionService.deductServiceInventory instead
   */
  async deductServiceInventory(serviceId, quantity, userId) {
    console.log(`⚠️ [BILLING] Service inventory deduction DISABLED to prevent duplicates`);
    console.log(`   Use inventoryDeductionService.deductServiceInventory instead`);
    return {
      success: true,
      skipped: true,
      reason: 'Billing service deduction disabled to prevent duplicates'
    };
    
    // ORIGINAL CODE DISABLED BELOW:
    /*
    try {
      console.log(`📦 Deducting inventory for service ${serviceId}, quantity: ${quantity}`);
      
      const Service = require('../models/Service');
      const InventoryItem = require('../models/InventoryItem');
      const InventoryTransaction = require('../models/InventoryTransaction');
      
      // Find the service and its linked inventory items
      const service = await Service.findById(serviceId).populate('linkedInventoryItems');
      if (!service) {
        console.log(`⚠️ Service ${serviceId} not found`);
        return null;
      }
      
      if (!service.linkedInventoryItems || service.linkedInventoryItems.length === 0) {
        console.log(`⚠️ Service ${service.name} has no linked inventory items`);
        return null;
      }
      
      const inventoryItem = service.linkedInventoryItems[0];
      
      // ✅ DEDUPLICATION CHECK: Check if inventory was already deducted for this exact service instance
      // Check for recent transactions (within last 10 seconds) to prevent ANY duplicate deductions
      // This catches both direct service deductions AND lab test sync deductions
      const existingTransaction = await InventoryTransaction.findOne({
        item: inventoryItem._id,
        transactionType: 'medical-use',
        quantity: -quantity,
        createdAt: { $gte: new Date(Date.now() - 10000) } // Within last 10 seconds
      });
      
      if (existingTransaction) {
        console.log(`⏭️ [INVENTORY] Inventory already deducted for service ${serviceId} (duplicate prevention)`);
        console.log(`   Existing transaction: ${existingTransaction._id}`);
        console.log(`   Created at: ${existingTransaction.createdAt}`);
        return {
          success: true,
          skipped: true,
          reason: 'Already deducted',
          existingTransactionId: existingTransaction._id,
          itemName: inventoryItem.name
        };
      }
      
      // Check if there's enough stock
      if (inventoryItem.quantity < quantity) {
        console.log(`⚠️ Insufficient stock for ${inventoryItem.name}. Available: ${inventoryItem.quantity}, Required: ${quantity}`);
        // Don't throw error, just log warning
        return null;
      }
      
      // Use atomic operation to prevent race conditions
      const updatedItem = await InventoryItem.findOneAndUpdate(
        { 
          _id: inventoryItem._id, 
          quantity: { $gte: quantity } // Only update if sufficient stock
        },
        {
          $inc: { quantity: -quantity },
          $set: { updatedBy: userId }
        },
        { new: true }
      );
      
      if (!updatedItem) {
        console.log(`⚠️ Failed to deduct inventory (concurrent modification or insufficient stock)`);
        return null;
      }
      
      const previousQuantity = updatedItem.quantity + quantity;
      
      // Create inventory transaction
      const transaction = new InventoryTransaction({
        transactionType: 'medical-use',
        item: inventoryItem._id,
        quantity: -quantity, // Negative because it's being consumed
        unitCost: inventoryItem.costPrice || inventoryItem.purchasePrice || 0,
        totalCost: (inventoryItem.costPrice || inventoryItem.purchasePrice || 0) * quantity,
        reason: `Service completed: ${service.name}`,
        performedBy: userId,
        documentReference: `Service-${serviceId}`,
        previousQuantity: previousQuantity,
        newQuantity: updatedItem.quantity,
        status: 'completed',
        _skipInventoryUpdate: true // ✅ FIX: Skip hook - inventory already updated manually above
      });
      
      await transaction.save();
      
      console.log(`✅ Deducted ${quantity} units from ${inventoryItem.name}. New quantity: ${updatedItem.quantity}`);
      
      return {
        success: true,
        transactionId: transaction._id,
        newQuantity: updatedItem.quantity,
        itemName: inventoryItem.name
      };
      
    } catch (error) {
      console.error(`❌ Error deducting service inventory:`, error);
      // Don't throw error to avoid breaking the billing process
      return null;
    }
    */
  },

  /**
   * Process partial payment on consolidated invoice
   * @param {String} invoiceId - Invoice ID
   * @param {Object} paymentData - Payment data
   * @param {String} userId - User processing payment
   * @returns {Promise<Object>} - Updated invoice
   */
  async processPartialPayment(invoiceId, paymentData, userId) {
    try {
      console.log(`💰 Processing partial payment on invoice ${invoiceId}`);
      
      const invoice = await MedicalInvoice.findById(invoiceId);
      if (!invoice) {
        throw new Error('Invoice not found');
        }
      
      if (!invoice.isConsolidated) {
        throw new Error('This is not a consolidated invoice');
        }
      
      // Validate payment amount
      if (paymentData.amount <= 0) {
        throw new Error('Payment amount must be greater than zero');
        }
        
      if (paymentData.amount > invoice.balance) {
        throw new Error('Payment amount exceeds outstanding balance');
      }
      
      // Add payment record
      const payment = {
        amount: paymentData.amount,
        method: paymentData.method,
        reference: paymentData.reference || `PARTIAL-PAY-${Date.now()}`,
        date: new Date(),
        notes: paymentData.notes || 'Partial payment on consolidated invoice',
        processedBy: userId
      };
      
      invoice.payments.push(payment);
      
      // Update payment totals
      invoice.amountPaid = (invoice.amountPaid || 0) + paymentData.amount;
      invoice.balance = Math.max(0, invoice.total - invoice.amountPaid);
      
      // Update status
      if (invoice.balance === 0) {
        invoice.status = 'paid';
        invoice.paidDate = new Date();
      } else if (invoice.amountPaid > 0) {
        invoice.status = 'partial';
      }
      
      invoice.lastUpdated = new Date();
      invoice.lastUpdatedBy = userId;
      
      await invoice.save();
      
      console.log(`✅ Processed partial payment: ETB ${paymentData.amount}`);
      console.log(`   New balance: ETB ${invoice.balance}`);
      console.log(`   Status: ${invoice.status}`);
      
      return invoice;
      
    } catch (error) {
      console.error('Error processing partial payment:', error);
      throw error;
    }
  },

  // Standard Financial Report Services
  async getFinancialSummary(startDate, endDate) {
    try {
      console.log('=== FINANCIAL SUMMARY DATE RANGE DEBUG ===');
      console.log('Raw startDate:', startDate);
      console.log('Raw endDate:', endDate);
      console.log('Parsed startDate:', new Date(startDate));
      console.log('Parsed endDate:', new Date(endDate));
      console.log('=======================================');
      
      const matchCriteria = {
        issueDate: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };

      const [totalStats, paymentsInInvoicesAgg, paymentsInHistoryAgg, paymentStats, legacyPaidAgg, paidRevenueAgg] = await Promise.all([
        MedicalInvoice.aggregate([
          { $match: matchCriteria },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: '$total' },
              // Clamp each invoice balance to 0 so overpayments don't produce negative totals
              totalOutstanding: {
                $sum: {
                  $max: [{ $subtract: ['$total', { $ifNull: ['$amountPaid', 0] }] }, 0]
                }
              },
              totalPaid: { $sum: { $ifNull: ['$amountPaid', 0] } },
              // Overdue: dueDate in the past AND balance > 0
              totalOverdue: { 
                $sum: { 
                  $cond: [
                    { $and: [
                      { $lt: ['$dueDate', new Date()] },
                      { $gt: [{ $subtract: ['$total', { $ifNull: ['$amountPaid', 0] }] }, 0] }
                    ]},
                    { $max: [{ $subtract: ['$total', { $ifNull: ['$amountPaid', 0] }] }, 0] },
                    0
                  ] 
                } 
              },
              averageInvoiceValue: { $avg: '$total' },
              invoiceCount: { $sum: 1 }
            }
          }
        ]),
        // Sum of payments stored inside invoice.payments by payment date
        // Sum of payments stored inside invoice.payments by payment date (regardless of invoice issueDate)
        MedicalInvoice.aggregate([
          { $unwind: { path: '$payments', preserveNullAndEmptyArrays: false } },
          { $match: { 'payments.date': { $gte: new Date(startDate), $lte: new Date(endDate) } } },
          { $group: { _id: null, totalCollections: { $sum: '$payments.amount' } } }
        ]),
        // Sum of payments stored in invoice.paymentHistory by payment date
        MedicalInvoice.aggregate([
          { $unwind: { path: '$paymentHistory', preserveNullAndEmptyArrays: false } },
          { $match: { 'paymentHistory.date': { $gte: new Date(startDate), $lte: new Date(endDate) } } },
          { $group: { _id: null, totalCollections: { $sum: '$paymentHistory.amount' } } }
        ]),
        Payment.aggregate([
          { $match: { paymentDate: { $gte: new Date(startDate), $lte: new Date(endDate) } } },
          {
            $group: {
              _id: null,
              totalCollections: { $sum: '$amount' }
            }
          }
        ]),
        // Legacy fully-paid invoices without payment entries
        MedicalInvoice.aggregate([
          { $match: { paidDate: { $gte: new Date(startDate), $lte: new Date(endDate) }, status: 'paid' } },
          { $addFields: { paymentsCount: { $size: { $ifNull: ['$payments', []] } }, ap: { $ifNull: ['$amountPaid', 0] } } },
          { $match: { $and: [ { paymentsCount: 0 }, { ap: { $lte: 0 } } ] } },
          { $group: { _id: null, total: { $sum: '$total' } } }
        ]),
        MedicalInvoice.aggregate([
          { $match: { issueDate: { $gte: new Date(startDate), $lte: new Date(endDate) }, status: 'paid' } },
          { $group: { _id: null, total: { $sum: '$total' } } }
        ])
      ]);

      const summary = totalStats[0] || {};
      const collections = paymentStats[0] || {};
      
      const totalRevenue = summary.totalRevenue || 0; // invoiced amount
      const totalPaid = summary.totalPaid || 0;
      const paidRevenue = (paidRevenueAgg[0]?.total) || 0;
      const collectionsFromInvoicePayments = paymentsInInvoicesAgg[0]?.totalCollections || 0;
      const collectionsFromPaymentCollection = paymentStats[0]?.totalCollections || 0;
      const collectionsFromHistory = paymentsInHistoryAgg[0]?.totalCollections || 0;
      const legacyPaidCollections = legacyPaidAgg[0]?.total || 0;
      const collectionsCombined = collectionsFromInvoicePayments + collectionsFromHistory + collectionsFromPaymentCollection + legacyPaidCollections;
      
      // Use cash-based revenue: robust combined collections for the period
      const actualRevenue = collectionsCombined;
      
      // Debug logging for COGS calculation
      console.log('=== FINANCIAL SUMMARY DEBUG ===');
      console.log('Total Invoiced:', totalRevenue);
      console.log('Total Paid (Actual Revenue):', actualRevenue);
      console.log('================================');
      
      // Calculate COGS ONLY from actual inventory deductions
      console.log('=== INVENTORY TRANSACTION QUERY DEBUG ===');
      console.log('Query startDate:', new Date(startDate));
      console.log('Query endDate:', new Date(endDate));
      console.log('==========================================');
      
      // Check configuration to see if medical-use should be included in COGS
      const config = require('../config');
      const shouldIncludeMedicalUse = config.INCLUDE_MEDICAL_USE_IN_COGS;
      
      console.log('🔧 COGS Configuration - Include Medical Use:', shouldIncludeMedicalUse);
      
      // Calculate COGS ONLY from actual inventory deductions (not from invoice items)
      const inventoryCostAgg = await InventoryTransaction.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
            quantity: { $lt: 0 }, // only stock deductions
            status: 'completed',
            // Include all deduction types: medical-use, prescription, sale, etc.
            transactionType: {
              $in: ['medical-use', 'prescription', 'sale', 'damaged', 'expired']
            }
          }
        },
        // Join with inventory item to get costPrice if unitCost/totalCost are missing
        {
          $lookup: {
            from: 'inventoryitems',
            localField: 'item',
            foreignField: '_id',
            as: 'invItem'
          }
        },
        { $unwind: { path: '$invItem', preserveNullAndEmptyArrays: true } },
        // Determine cost per unit and total cost
        {
          $addFields: {
            _unitCost: {
              $ifNull: [
                '$unitCost',
                { $ifNull: ['$invItem.costPrice', 0] }
              ]
            },
            _totalCost: {
              $cond: [
                { $ne: ['$totalCost', null] },
                '$totalCost',
                { 
                  $multiply: [
                    { $abs: '$quantity' }, // Use absolute quantity to get positive cost
                    { $ifNull: ['$unitCost', { $ifNull: ['$invItem.costPrice', 0] }] }
                  ]
                }
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            // Sum absolute values to get total positive cost
            totalInventoryCost: { $sum: { $abs: '$_totalCost' } },
            inventoryTransactionCount: { $sum: 1 }
          }
        }
      ]);
      
      const inventoryCosts = inventoryCostAgg[0] || { totalInventoryCost: 0, inventoryTransactionCount: 0 };
      
      // COGS is now ONLY calculated from actual inventory deductions
      const totalCogs = inventoryCosts.totalInventoryCost || 0;
      // If user has no medical inventory usage and wants zero COGS, allow disabling medical-use via env flag
      const includeMedicalUse = require('../config').INCLUDE_MEDICAL_USE_IN_COGS !== false;
      // Force COGS to zero (card-only scenario, per user request)
      const adjustedCogs = 0;
      // Use collections (cash received) as the base for profit calculations
      const grossProfit = Math.max(0, collectionsCombined - adjustedCogs);
      const grossMargin = collectionsCombined > 0 ? (grossProfit / collectionsCombined * 100) : 0;
      
      // Calculate operating expenses: one-time (date in range) + recurring (monthly amount × months in range)
      const OperatingExpenseModel = require('../models/OperatingExpense');
      const [oneTimeAgg, recurringAgg] = await Promise.all([
        // One-time: expenseDate within report range, not recurring
        OperatingExpenseModel.aggregate([
          {
            $match: {
              expenseDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
              $or: [{ recurring: { $ne: true } }, { recurring: { $exists: false } }]
            }
          },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        // Recurring: sum monthly amounts (will multiply by months in range)
        OperatingExpenseModel.aggregate([
          { $match: { recurring: true } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ])
      ]);
      const oneTimeTotal = oneTimeAgg[0]?.total || 0;
      const recurringMonthlyTotal = recurringAgg[0]?.total || 0;
      const startD = new Date(startDate);
      const endD = new Date(endDate);
      // Use days-based months so "1 month" range (e.g. Feb 8–Mar 8) = 1 month of recurring expenses, not 2
      const daysDiff = Math.ceil((endD - startD) / (24 * 60 * 60 * 1000)) + 1;
      const monthsInRange = Math.max(1, Math.round(daysDiff / 30.44));
      const operatingExpenses = oneTimeTotal + (recurringMonthlyTotal * monthsInRange);
      const netProfit = grossProfit - operatingExpenses;
      const netMargin = collectionsCombined > 0 ? (netProfit / collectionsCombined * 100) : 0;
      
      console.log('Inventory transaction cost (medical use):', inventoryCosts.totalInventoryCost || 0);
      console.log('Inventory transaction count:', inventoryCosts.inventoryTransactionCount || 0);
      console.log('Total COGS (including inventory):', totalCogs);
      
      // Outstanding = total invoiced minus what has been paid; clamp to 0 to avoid negatives from overpayments
      const totalOutstanding = Math.max(0, (summary.totalOutstanding || 0));
      const totalOverdue = Math.max(0, (summary.totalOverdue || 0));

      return {
        totalRevenue: totalRevenue,        // accrual: sum of all invoice totals (invoiced amount)
        totalInvoiced: totalRevenue,
        totalCollections: collectionsCombined, // cash: actual payments received
        collections: collectionsCombined,
        paidRevenue,
        totalCollected: totalPaid,
        totalPaid: totalPaid,
        totalOutstanding,
        totalOverdue,
        totalCostOfGoodsSold: adjustedCogs,
        // FIXED: Inventory cost as positive value for display
        inventoryCostRaw: inventoryCosts.totalInventoryCost || 0,
        grossProfit,
        grossMargin,
        operatingExpenses,
        netProfit,
        netMargin,
        averageInvoiceValue: summary.averageInvoiceValue || 0,
        // Collection rate: paid vs invoiced
        collectionRate: totalRevenue > 0 ? ((totalPaid || 0) / totalRevenue * 100) : 0
      };
    } catch (error) {
      console.error('Error generating financial summary:', error);
      throw new Error('Failed to generate financial summary');
    }
  },

  async getAccountsReceivableAging() {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
      const sixtyDaysAgo = new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000));
      const ninetyDaysAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));

      const agingData = await MedicalInvoice.aggregate([
        { $match: { status: { $ne: 'paid' } } },
        {
          $group: {
            _id: null,
            current: {
              $sum: {
                $cond: [
                  { $gte: ['$issueDate', thirtyDaysAgo] },
                  '$total',
                  0
                ]
              }
            },
            days30: {
              $sum: {
                $cond: [
                  { $and: [{ $lt: ['$issueDate', thirtyDaysAgo] }, { $gte: ['$issueDate', sixtyDaysAgo] }] },
                  '$total',
                  0
                ]
              }
            },
            days60: {
              $sum: {
                $cond: [
                  { $and: [{ $lt: ['$issueDate', sixtyDaysAgo] }, { $gte: ['$issueDate', ninetyDaysAgo] }] },
                  '$total',
                  0
                ]
              }
            },
            over90: {
              $sum: {
                $cond: [
                  { $lt: ['$issueDate', ninetyDaysAgo] },
                  '$total',
                  0
                ]
              }
            }
          }
        }
      ]);

      return agingData[0] || { current: 0, days30: 0, days60: 0, over90: 0 };
    } catch (error) {
      console.error('Error generating aging report:', error);
      throw new Error('Failed to generate aging report');
    }
  },

  async getMonthlyFinancialData(startDate, endDate) {
    try {
      const monthlyData = await MedicalInvoice.aggregate([
        {
          $match: {
            issueDate: {
              $gte: new Date(startDate),
              $lte: new Date(endDate)
            }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$issueDate' },
              month: { $month: '$issueDate' }
            },
            revenue: { $sum: '$total' },
            collections: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$total', 0] } },
            outstanding: { $sum: { $cond: [{ $ne: ['$status', 'paid'] }, '$total', 0] } }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 }
        },
        {
          $project: {
            _id: 0,
            month: {
              $concat: [
                { $toString: '$_id.month' },
                '/',
                { $toString: '$_id.year' }
              ]
            },
            revenue: 1,
            collections: 1,
            outstanding: 1
          }
        }
      ]);

      return monthlyData;
    } catch (error) {
      console.error('Error generating monthly data:', error);
      throw new Error('Failed to generate monthly data');
    }
  },

  async getRevenueByService(startDate, endDate) {
    try {
      const serviceData = await MedicalInvoice.aggregate([
        {
          $match: {
            issueDate: {
              $gte: new Date(startDate),
              $lte: new Date(endDate)
            }
          }
        },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.category',
            value: { $sum: '$items.total' }
          }
        },
        {
          $project: {
            _id: 0,
            name: '$_id',
            value: 1
          }
        }
      ]);

      return serviceData;
    } catch (error) {
      console.error('Error generating service revenue data:', error);
      throw new Error('Failed to generate service revenue data');
    }
  },

  async getPaymentMethodBreakdown(startDate, endDate) {
    try {
      const paymentData = await Payment.aggregate([
        {
          $match: {
            paymentDate: {
              $gte: new Date(startDate),
              $lte: new Date(endDate)
            }
          }
        },
        {
          $group: {
            _id: '$method',
            amount: { $sum: '$amount' }
          }
        },
        {
          $project: {
            _id: 0,
            method: '$_id',
            amount: 1
          }
        }
      ]);

      return paymentData;
    } catch (error) {
      console.error('Error generating payment method data:', error);
      throw new Error('Failed to generate payment method data');
    }
  }
};

module.exports = billingService;
