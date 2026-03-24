const mongoose = require('mongoose');
const PaymentStatusUtils = require('../utils/paymentStatusUtils');
const Schema = mongoose.Schema;

// Define schema for invoice items
const InvoiceItemSchema = new Schema({
  itemType: {
    type: String,
    enum: ['service', 'product', 'consultation', 'procedure', 'medication', 'card', 'lab', 'imaging'],
    required: true
  },
  category: {
    type: String,
    enum: ['card', 'medication', 'lab', 'imaging', 'service', 'procedure', 'consultation', 'product', 'other'],
    default: 'other'
  },
  description: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 1
  },
  unitPrice: {
    type: Number,
    required: true
  },
  totalPrice: {
    type: Number,
    get: function() {
      return this.total || (this.quantity * this.unitPrice);
    }
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  tax: {
    type: Number,
    default: 0,
    min: 0
  },
  total: {
    type: Number,
    required: true
  },
  metadata: {
    type: Schema.Types.Mixed, // Store additional service-specific data
    default: {}
  },
  addedAt: {
    type: Date,
    default: Date.now
  },
  addedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  // References to related records
  serviceId: {
    type: Schema.Types.ObjectId,
    ref: 'Service'
  },
  inventoryItemId: {
    type: Schema.Types.ObjectId,
    ref: 'InventoryItem'
  },
  labTestId: {
    type: Schema.Types.ObjectId,
    ref: 'LabTest'
  },
  imagingId: {
    type: Schema.Types.ObjectId,
    ref: 'Imaging'
  },
  // Reference to LabOrder
  labOrderId: {
    type: Schema.Types.ObjectId,
    ref: 'LabOrder'
  },
  procedureId: {
    type: Schema.Types.ObjectId
  },
  // Track inventory transactions
  inventoryTransactionId: {
    type: Schema.Types.ObjectId,
    ref: 'InventoryTransaction'
  },
  // Provide a reference from medical record
  medicalRecordReference: {
    type: String
  },
  notes: {
    type: String
  }
});

// Define schema for payments
const PaymentSchema = new Schema({
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  method: {
    type: String,
    enum: ['cash', 'card', 'bank_transfer', 'insurance', 'other'],
    required: true
  },
  reference: {
    type: String // Reference number, transaction ID, etc.
  },
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  notes: {
    type: String
  },
  processedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Bank transfer specific details
  bankDetails: {
    bankName: {
      type: String,
      required: function() {
        return this.method === 'bank_transfer';
      }
    },
    accountNumber: {
      type: String,
      required: function() {
        return this.method === 'bank_transfer';
      }
    },
    accountHolderName: {
      type: String
    },
    branchName: {
      type: String
    },
    swiftCode: {
      type: String
    },
    transferType: {
      type: String,
      enum: ['domestic', 'international', 'wire', 'ach'],
      default: 'domestic'
    }
  },
  // Card payment details
  cardDetails: {
    cardType: {
      type: String,
      enum: ['visa', 'mastercard', 'amex', 'discover', 'other']
    },
    lastFourDigits: {
      type: String
    },
    cardHolderName: {
      type: String
    }
  }
}, {
  timestamps: true
});

// Main invoice schema
const MedicalInvoiceSchema = new Schema({
  clinicId: {
    type: String,
    required: true,
    default: 'default',
    index: true,
    trim: true
  },
  // Invoice identification
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
  },
  // Patient and visit information
  patient: {
    type: Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
    index: true
  },
  patientId: {
    type: String,
    required: true
  },
  patientName: {
    type: String,
    required: true
  },
  visit: {
    type: Schema.Types.ObjectId,
    ref: 'Visit',
    index: true
  },
  medicalRecord: {
    type: Schema.Types.ObjectId,
    ref: 'MedicalRecord',
    index: true
  },
  // Primary provider/doctor
  provider: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  // Financial details
  items: [InvoiceItemSchema],
  subtotal: {
    type: Number,
    required: true,
    default: 0
  },
  taxTotal: {
    type: Number,
    default: 0
  },
  discountTotal: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true
  },
  amountPaid: {
    type: Number,
    default: 0
  },
  balance: {
    type: Number,
    required: true
  },
  // Enhanced payment tracking
  paymentHistory: [{
    paymentId: {
      type: Schema.Types.ObjectId,
      auto: true
    },
    amount: {
      type: Number,
      required: true
    },
    method: {
      type: String,
      enum: ['cash', 'card', 'bank_transfer', 'insurance', 'other'],
      required: true
    },
    reference: String,
    date: {
      type: Date,
      default: Date.now
    },
    processedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    notes: String,
    paymentType: {
      type: String,
      enum: ['full', 'partial', 'advance', 'refund'],
      default: 'partial'
    },
    previousBalance: Number,
    newBalance: Number,
    paymentPercentage: Number // Percentage of total invoice paid
  }],
  // Payment analytics
  paymentAnalytics: {
    totalPayments: {
      type: Number,
      default: 0
    },
    averagePaymentAmount: {
      type: Number,
      default: 0
    },
    largestPayment: {
      type: Number,
      default: 0
    },
    smallestPayment: {
      type: Number,
      default: 0
    },
    paymentFrequency: {
      type: Number,
      default: 0 // Days between payments
    },
    lastPaymentDate: Date,
    firstPaymentDate: Date,
    daysToFullPayment: Number, // Days from issue to full payment
    partialPaymentCount: {
      type: Number,
      default: 0
    },
    fullPaymentCount: {
      type: Number,
      default: 0
    }
  },
  // Payments (keeping for backward compatibility)
  payments: [PaymentSchema],
  // Enhanced invoice status
  status: {
    type: String,
    enum: ['pending', 'paid', 'cancelled', 'partial', 'overdue', 'disputed'],
    default: 'pending',
    index: true
  },
  // Payment status details
  paymentStatus: {
    current: {
      type: String,
      enum: ['unpaid', 'partial', 'fully_paid', 'overpaid'],
      default: 'unpaid'
    },
    percentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    },
    paymentPlan: {
      type: String,
      enum: ['single_payment', 'installments', 'custom'],
      default: 'single_payment'
    },
    installmentDetails: {
      totalInstallments: Number,
      currentInstallment: Number,
      installmentAmount: Number,
      nextDueDate: Date
    }
  },
  // Dates
  issueDate: {
    type: Date,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: true
  },
  paidDate: {
    type: Date
  },
  // Insurance information
  insurance: {
    provider: { type: String },
    policyNumber: { type: String },
    claimNumber: { type: String },
    coveragePercent: { type: Number, min: 0, max: 100 },
    approvalCode: { type: String },
    status: { 
      type: String, 
      enum: ['pending', 'approved', 'partial', 'denied', 'not_submitted'] 
    }
  },
  // Additional information
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'bank_transfer', 'insurance', 'other']
  },
  paymentNotes: {
    type: String
  },
  // Payment information for insurance
  paymentTIN: {
    type: String
  },
  paymentCustomerName: {
    type: String
  },
  notes: {
    type: String
  },
  attachment: {
    type: String
  },
  termsAndConditions: {
    type: String
  },
  // Audit trail
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastUpdatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  // Consolidated invoice flag
  isConsolidated: {
    type: Boolean,
    default: false,
    index: true
  },
  // Daily consolidated invoice flag
  isDailyConsolidated: {
    type: Boolean,
    default: false,
    index: true
  },
  // Additional fields for consolidated invoices
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  // Finalized flag - when reception completes/finalizes the invoice
  finalized: {
    type: Boolean,
    default: false,
    index: true
  },
  finalizedAt: {
    type: Date
  },
  finalizedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // ROOT CAUSE FIX: Extension-specific fields for medication extensions
  isExtension: {
    type: Boolean,
    default: false,
    index: true
  },
  originalPrescriptionId: {
    type: Schema.Types.ObjectId,
    ref: 'Prescription',
    index: true
  },
  extensionDate: {
    type: Date
  },
  extensionDetails: {
    originalDuration: Number,
    additionalDays: Number,
    explicitAdditionalDoses: Number,
    dosesPerDay: Number,
    totalDoses: Number,
    medicationName: String,
    dosage: String,
    frequency: String,
    extensionType: {
      type: String,
      enum: ['dose-based', 'day-based'],
      default: 'day-based'
    }
  }
}, {
  timestamps: true
});

// Pre-save hook to calculate totals and update payment analytics
MedicalInvoiceSchema.pre('save', function(next) {
  // Validate invoice data before saving
  try {
    // Check for zero pricing issues
    if (this.items && this.items.length > 0) {
      this.items.forEach((item, index) => {
        if (!item.unitPrice || item.unitPrice <= 0) {
          throw new Error(`Item ${index + 1} has invalid unit price: ${item.unitPrice}. Unit price must be greater than 0.`);
        }
        if (!item.quantity || item.quantity <= 0) {
          throw new Error(`Item ${index + 1} has invalid quantity: ${item.quantity}. Quantity must be greater than 0.`);
        }
      });
    }

    // Calculate total for each item if not already set
    this.items.forEach(item => {
      if (item.quantity && item.unitPrice) {
        const grossAmount = item.quantity * item.unitPrice;
        const discountAmount = item.discount || 0;
        const taxAmount = (grossAmount - discountAmount) * (item.tax || 0) / 100;
        item.total = grossAmount - discountAmount + taxAmount;
      }
    });

    // Calculate invoice subtotal
    this.subtotal = this.items.reduce((sum, item) => sum + item.total, 0);

    // Calculate total discounts and taxes (from individual items)
    this.discountTotal = this.items.reduce((sum, item) => sum + (item.discount || 0), 0);
    this.taxTotal = this.items.reduce((sum, item) => {
      const grossAmount = item.quantity * item.unitPrice;
      const discountAmount = item.discount || 0;
      return sum + ((grossAmount - discountAmount) * (item.tax || 0) / 100);
    }, 0);

    // Calculate total
    this.total = this.subtotal;

    // Calculate amount paid and balance from both payment arrays
    const allPayments = [...(this.payments || []), ...(this.paymentHistory || [])];
    
    // Recalculate amountPaid from all payment entries, clamped to invoice total
    const rawAmountPaid = allPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    // Never allow amountPaid to exceed the invoice total — prevents overpayment bugs
    this.amountPaid = Math.min(rawAmountPaid, this.total);

    // Snap rounding pennies: if the remaining gap is <= 0.05 and invoice is marked paid,
    // treat it as fully paid to avoid phantom overdue/outstanding balances
    const rawBalance = this.total - this.amountPaid;
    if (rawBalance > 0 && rawBalance <= 0.05 && this.status === 'paid') {
      this.amountPaid = this.total;
    }

    // Skip balance recalculation for insurance patients (balance already set to 0)
    // Also preserve balance if flag is set (for insurance invoice updates)
    if ((this.balance === 0 && this.status === 'paid') || this._preserveInsuranceBalance) {
      // Keep the insurance balance as-is, don't recalculate
      // But update amountPaid to match the new total
      if (this._preserveInsuranceBalance) {
        this.amountPaid = this.total;
        this.balance = 0;
        delete this._preserveInsuranceBalance; // Clean up the flag
        console.log('🔍 [Pre-save] Preserving insurance patient balance: 0, updated amountPaid to match new total');
      } else {
        console.log('🔍 [Pre-save] Preserving insurance patient balance: 0');
      }
    } else {
      // Balance is always >= 0; amountPaid is already clamped to total above
      this.balance = Math.max(0, this.total - this.amountPaid);
    }

    // Update payment status details
    if (this.balance <= 0) {
      this.paymentStatus.current = 'fully_paid';
      this.paymentStatus.percentage = 100;
      if (!this.paidDate) {
        this.paidDate = new Date();
      }

      // Auto-create a synthetic payment record if invoice is fully paid
      // but there are no explicit payment entries recorded.
      // This helps frontends display a payment method consistently
      // for flows that mark invoices as paid without pushing to payments[].
      try {
        const hasAnyPaymentEntries = (this.payments && this.payments.length > 0) || (this.paymentHistory && this.paymentHistory.length > 0);
        const recordedAmount = typeof this.amountPaid === 'number' ? this.amountPaid : 0;
        const shouldAutofill = !hasAnyPaymentEntries && recordedAmount > 0;
        const envAllowsAutofill = (process.env.AUTO_CREATE_PAYMENT_RECORDS || 'true').toLowerCase() !== 'false';
        if (shouldAutofill && envAllowsAutofill) {
          const fallbackMethod = (process.env.DEFAULT_AUTO_PAYMENT_METHOD || 'cash').toLowerCase();
          const normalizedFallback = ['cash', 'card', 'bank_transfer', 'insurance', 'other'].includes(fallbackMethod)
            ? fallbackMethod
            : 'cash';
          const method = this.paymentMethod || normalizedFallback;
          // Ensure arrays
          if (!Array.isArray(this.payments)) this.payments = [];
          // Push a single synthetic payment using available context
          this.payments.push({
            amount: recordedAmount,
            method,
            reference: `AUTO-PAY-${Date.now()}`,
            date: this.paidDate || new Date(),
            notes: 'Auto-recorded payment to reconcile fully paid invoice without explicit payment entry',
            processedBy: this.lastUpdatedBy || this.createdBy || new mongoose.Types.ObjectId('000000000000000000000000')
          });
        }
      } catch (autoErr) {
        // Never fail a save due to autofill issues; just log
        console.error('MedicalInvoice auto-payment fill error:', autoErr?.message || autoErr);
      }
    } else if (this.amountPaid > 0) {
      this.paymentStatus.current = 'partial';
      this.paymentStatus.percentage = Math.round((this.amountPaid / this.total) * 100);
    } else {
      this.paymentStatus.current = 'unpaid';
      this.paymentStatus.percentage = 0;
    }

    // Update payment analytics
    if (this.paymentHistory && this.paymentHistory.length > 0) {
      const payments = this.paymentHistory;
      this.paymentAnalytics.totalPayments = payments.length;
      this.paymentAnalytics.averagePaymentAmount = this.amountPaid / payments.length;
      this.paymentAnalytics.largestPayment = Math.max(...payments.map(p => p.amount));
      this.paymentAnalytics.smallestPayment = Math.min(...payments.map(p => p.amount));
      
      // Calculate payment frequency
      if (payments.length > 1) {
        const sortedPayments = payments.sort((a, b) => new Date(a.date) - new Date(b.date));
        const totalDays = (new Date(sortedPayments[sortedPayments.length - 1].date) - new Date(sortedPayments[0].date)) / (1000 * 60 * 60 * 24);
        this.paymentAnalytics.paymentFrequency = totalDays / (payments.length - 1);
      }

      // Set first and last payment dates
      const sortedPayments = payments.sort((a, b) => new Date(a.date) - new Date(b.date));
      this.paymentAnalytics.firstPaymentDate = sortedPayments[0].date;
      this.paymentAnalytics.lastPaymentDate = sortedPayments[sortedPayments.length - 1].date;

      // Calculate days to full payment
      if (this.paymentStatus.current === 'fully_paid' && this.paymentAnalytics.firstPaymentDate) {
        this.paymentAnalytics.daysToFullPayment = Math.ceil(
          (new Date(this.paidDate) - new Date(this.issueDate)) / (1000 * 60 * 60 * 24)
        );
      }

      // Count payment types
      this.paymentAnalytics.partialPaymentCount = payments.filter(p => p.paymentType === 'partial').length;
      this.paymentAnalytics.fullPaymentCount = payments.filter(p => p.paymentType === 'full').length;
    }

    // Update status based on payments - always recalculate to ensure consistency
    // Check if status was explicitly set (e.g., by payment processing) - but allow recalculation
    const wasStatusExplicitlySet = this.isModified('status') || this.isModified('paymentStatus.current');
    
    // Only update if not explicitly set to 'cancelled' to allow manual override
    if (this.status !== 'cancelled') {
      // Skip status recalculation for insurance patients (status already set to 'paid' with balance 0)
      if (this.status === 'paid' && this.balance === 0) {
        // Keep the insurance status as-is, don't recalculate
        console.log('🔍 [Pre-save] Preserving insurance patient status: paid, balance: 0');
      } else {
        // Use centralized status determination for non-insurance cases
        this.status = PaymentStatusUtils.determineInvoiceStatus(this.balance, this.amountPaid, this.dueDate);
      }
    }

    // Update payment status timestamp
    this.paymentStatus.lastUpdated = new Date();

    next();
  } catch (error) {
    console.error('MedicalInvoice pre-save validation error:', error);
    return next(error);
  }
});

// Method to add a payment with enhanced tracking
MedicalInvoiceSchema.methods.addPayment = async function(paymentData) {
  this.payments.push(paymentData);
  await this.save(); // This will trigger the pre-save hook that recalculates totals
  return this;
};

// Enhanced method to add payment with detailed tracking
MedicalInvoiceSchema.methods.addPaymentWithTracking = async function(paymentData) {
  const previousBalance = this.balance;
  const paymentPercentage = Math.round((paymentData.amount / this.total) * 100);
  
  // Determine payment type
  let paymentType = 'partial';
  if (paymentData.amount >= this.balance) {
    paymentType = 'full';
  } else if (this.amountPaid === 0) {
    paymentType = 'advance';
  }

  // Create enhanced payment record
  const enhancedPayment = {
    paymentId: new mongoose.Types.ObjectId(),
    amount: paymentData.amount,
    method: paymentData.method,
    reference: paymentData.reference || `PAY-${Date.now()}`,
    date: new Date(),
    processedBy: paymentData.processedBy,
    notes: paymentData.notes,
    paymentType: paymentType,
    previousBalance: previousBalance,
    newBalance: this.balance - paymentData.amount,
    paymentPercentage: paymentPercentage
  };

  // Add to payment history
  this.paymentHistory.push(enhancedPayment);
  
  // Also add to legacy payments array for backward compatibility
  this.payments.push(paymentData);
  
  await this.save();
  return this;
};

// Method to get payment summary
MedicalInvoiceSchema.methods.getPaymentSummary = function() {
  return {
    totalAmount: this.total,
    amountPaid: this.amountPaid,
    balance: this.balance,
    paymentPercentage: this.paymentStatus.percentage,
    paymentStatus: this.paymentStatus.current,
    totalPayments: this.paymentAnalytics.totalPayments,
    averagePaymentAmount: this.paymentAnalytics.averagePaymentAmount,
    largestPayment: this.paymentAnalytics.largestPayment,
    smallestPayment: this.paymentAnalytics.smallestPayment,
    daysToFullPayment: this.paymentAnalytics.daysToFullPayment,
    partialPaymentCount: this.paymentAnalytics.partialPaymentCount,
    fullPaymentCount: this.paymentAnalytics.fullPaymentCount,
    lastPaymentDate: this.paymentAnalytics.lastPaymentDate,
    firstPaymentDate: this.paymentAnalytics.firstPaymentDate
  };
};

// Method to get payment history
MedicalInvoiceSchema.methods.getPaymentHistory = function() {
  return this.paymentHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
};

// Method to check if invoice is overdue
MedicalInvoiceSchema.methods.isOverdue = function() {
  return this.balance > 0 && new Date() > this.dueDate;
};

// Method to get overdue days
MedicalInvoiceSchema.methods.getOverdueDays = function() {
  if (!this.isOverdue()) return 0;
  return Math.ceil((new Date() - new Date(this.dueDate)) / (1000 * 60 * 60 * 24));
};

// Method to calculate payment plan
MedicalInvoiceSchema.methods.calculatePaymentPlan = function(installmentCount) {
  if (this.balance <= 0) return null;
  
  const installmentAmount = Math.ceil(this.balance / installmentCount);
  const nextDueDate = new Date();
  nextDueDate.setDate(nextDueDate.getDate() + 30); // 30 days from now
  
  return {
    totalInstallments: installmentCount,
    currentInstallment: 1,
    installmentAmount: installmentAmount,
    nextDueDate: nextDueDate,
    remainingBalance: this.balance
  };
};

// Method to generate from medical record
MedicalInvoiceSchema.statics.generateFromMedicalRecord = async function(medicalRecordId, userData) {
  const MedicalRecord = mongoose.model('MedicalRecord');
  const medicalRecord = await MedicalRecord.findById(medicalRecordId)
    .populate('patient')
    .populate('visit')
    .populate('primaryProvider')
    .populate({
      path: 'servicesProvided.service',
      model: 'Service'
    })
    .populate({
      path: 'medicationsAdministered.medication',
      model: 'InventoryItem'
    })
    .populate({
      path: 'labResults.test',
      model: 'LabTest'
    })
    .populate({
      path: 'imagingResults.type',
      model: 'Imaging'
    });
    
  if (!medicalRecord) {
    throw new Error('Medical record not found');
  }
  
  // Generate invoice number
  const invoiceNumber = await this.generateInvoiceNumber();
  
  // Set due date (e.g., 30 days from now)
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);
  
  // Create invoice object
  const invoiceData = {
    invoiceNumber,
    patient: medicalRecord.patient._id,
    patientId: medicalRecord.patient.id,
    patientName: medicalRecord.patient.name,
    visit: medicalRecord.visit._id,
    medicalRecord: medicalRecord._id,
    provider: medicalRecord.primaryProvider._id,
    issueDate: new Date(),
    dueDate,
    items: [],
    createdBy: userData._id,
    status: 'pending'
  };
  
  // Add services
  if (medicalRecord.servicesProvided && medicalRecord.servicesProvided.length > 0) {
    medicalRecord.servicesProvided.forEach(service => {
      invoiceData.items.push({
        itemType: 'service',
        description: service.service.name,
        quantity: service.quantity || 1,
        unitPrice: service.service.price || 0,
        total: (service.quantity || 1) * (service.service.price || 0),
        serviceId: service.service._id,
        medicalRecordReference: `Service provided on ${new Date(service.providedAt).toLocaleDateString()}`
      });
    });
  }
  
  // Add medications
  if (medicalRecord.medicationsAdministered && medicalRecord.medicationsAdministered.length > 0) {
    medicalRecord.medicationsAdministered.forEach(medication => {
      invoiceData.items.push({
        itemType: 'medication',
        description: medication.medication.name,
        quantity: 1,
        unitPrice: medication.medication.sellingPrice || 0,
        total: medication.medication.sellingPrice || 0,
        inventoryItemId: medication.medication._id,
        inventoryTransactionId: medication.inventoryTransactionId,
        medicalRecordReference: `Medication administered on ${new Date(medication.administeredAt).toLocaleDateString()}`
      });
    });
  }
  
  // Add lab tests
  if (medicalRecord.labResults && medicalRecord.labResults.length > 0) {
    medicalRecord.labResults.forEach(lab => {
      if (lab.test && lab.test.price) {
        invoiceData.items.push({
          itemType: 'lab',
          description: lab.test.name,
          quantity: 1,
          unitPrice: lab.test.price || 0,
          total: lab.test.price || 0,
          labTestId: lab.test._id,
          medicalRecordReference: `Lab test ordered on ${new Date(lab.orderedAt).toLocaleDateString()}`
        });
      }
    });
  }
  
  // Add imaging
  if (medicalRecord.imagingResults && medicalRecord.imagingResults.length > 0) {
    medicalRecord.imagingResults.forEach(imaging => {
      invoiceData.items.push({
        itemType: 'imaging',
        description: `${imaging.type} - ${imaging.bodyPart}`,
        quantity: 1,
        unitPrice: 0, // Need to get actual price
        total: 0,
        imagingId: imaging._id,
        medicalRecordReference: `Imaging ordered on ${new Date(imaging.orderedAt).toLocaleDateString()}`
      });
    });
  }
  
  // Create and save the invoice
  const invoice = new this(invoiceData);
  // This will trigger the pre-save hook to calculate totals
  await invoice.save();
  
  // Update the medical record with the invoice reference
  medicalRecord.invoice = invoice._id;
  await medicalRecord.save();
  
  return invoice;
};

// Helper method to generate invoice numbers
MedicalInvoiceSchema.statics.generateInvoiceNumber = async function() {
  const today = new Date();
  const year = today.getFullYear().toString().slice(-2);
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  
  // Find the highest invoice number for the current month to avoid duplicates
  const currentMonthPattern = `INV-${year}-${month}-`;
  const latestInvoice = await this.findOne({
    invoiceNumber: { $regex: `^${currentMonthPattern}` }
  }).sort({ invoiceNumber: -1 });
  
  let nextNumber = 1;
  if (latestInvoice && latestInvoice.invoiceNumber) {
    // Extract the number part if follows the pattern
    const match = latestInvoice.invoiceNumber.match(/INV-\d{2}-\d{2}-(\d+)/);
    if (match && match[1]) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }
  
  // Add timestamp to ensure uniqueness in case of concurrent requests
  const timestamp = Date.now().toString().slice(-3);
  return `INV-${year}-${month}-${nextNumber.toString().padStart(4, '0')}-${timestamp}`;
};

MedicalInvoiceSchema.index({ patient: 1, status: 1 });
MedicalInvoiceSchema.index({ clinicId: 1, patient: 1, status: 1 });
MedicalInvoiceSchema.index({ patientId: 1, status: 1 });
MedicalInvoiceSchema.index({ invoiceNumber: 1 });
MedicalInvoiceSchema.index({ clinicId: 1, issueDate: -1, status: 1 });
MedicalInvoiceSchema.index({ clinicId: 1, createdAt: -1 });

module.exports = mongoose.model('MedicalInvoice', MedicalInvoiceSchema); 
