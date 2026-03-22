const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define schema for invoice items
const InvoiceItemSchema = new Schema({
  itemType: {
    type: String,
    enum: ['service', 'procedure', 'medication', 'supply', 'lab', 'imaging', 'consultation', 'other'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 1,
    min: 0.1
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
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
    required: true,
    min: 0
  },
  // References to related records
  serviceId: { type: Schema.Types.ObjectId, ref: 'Service' },
  inventoryItemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem' },
  labTestId: { type: Schema.Types.ObjectId, ref: 'LabTest' },
  imagingId: { type: Schema.Types.ObjectId, ref: 'Imaging' },
  procedureId: { type: Schema.Types.ObjectId },
  notes: String
});

// Main invoice schema
const InvoiceSchema = new Schema({
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
    min: 0
  },
  taxTotal: {
    type: Number,
    default: 0,
    min: 0
  },
  discountTotal: {
    type: Number,
    default: 0,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  amountPaid: {
    type: Number,
    default: 0,
    min: 0
  },
  balance: {
    type: Number,
    // required: true, // Balance will be calculated, so not strictly required on input
    // min: 0 // Balance can be negative if overpaid, or we handle overpayments differently
  },
  // Invoice status
  status: {
    type: String,
    enum: ['draft', 'pending', 'paid', 'partial', 'overdue', 'cancelled', 'refunded'],
    default: 'draft',
    index: true
  },
  // Dates
  issueDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  // Insurance information
  insurance: {
    provider: String,
    policyNumber: String,
    claimNumber: String,
    coveragePercent: {
      type: Number,
      min: 0,
      max: 100
    },
    approvalCode: String,
    status: {
      type: String,
      enum: ['pending', 'approved', 'partial', 'denied', 'not_submitted']
    }
  },
  // Patient card information
  patientCard: {
    type: Schema.Types.ObjectId,
    ref: 'PatientCard'
  },
  // Additional information
  notes: String,
  termsAndConditions: String,
  // Audit trail
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastUpdatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Pre-save hook to calculate totals and update status
InvoiceSchema.pre('save', async function(next) {
  // Calculate total for each item
  this.items.forEach(item => {
    if (item.quantity && item.unitPrice) {
      const grossAmount = item.quantity * item.unitPrice;
      const discountAmount = item.discount || 0;
      // Ensure tax is a number; default to 0 if not provided or invalid
      const taxRate = (typeof item.tax === 'number' && !isNaN(item.tax)) ? item.tax : 0;
      const taxAmount = (grossAmount - discountAmount) * taxRate / 100;
      item.total = grossAmount - discountAmount + taxAmount;
    }
  });

  // Calculate invoice subtotal
  this.subtotal = this.items.reduce((sum, item) => sum + (item.total || 0), 0);

  // Calculate total discounts and taxes
  this.discountTotal = this.items.reduce((sum, item) => sum + (item.discount || 0), 0);
  this.taxTotal = this.items.reduce((sum, item) => {
    const grossAmount = (item.quantity || 0) * (item.unitPrice || 0);
    const discountAmount = item.discount || 0;
    // Ensure tax is a number; default to 0 if not provided or invalid
    const taxRate = (typeof item.tax === 'number' && !isNaN(item.tax)) ? item.tax : 0;
    return sum + ((grossAmount - discountAmount) * taxRate / 100);
  }, 0);

  // Calculate total (ensure it handles potential NaN from items without totals, though item.total should always be set)
  this.total = this.items.reduce((sum, item) => sum + (item.total || 0), 0); // Simpler: this.total = this.subtotal;

  // Balance is now calculated based on total and amountPaid (which is updated by paymentController)
  this.balance = this.total - (this.amountPaid || 0);

  // Update status based on payments and due date
  // Only update status if it's not 'cancelled' or 'refunded' by an explicit action
  // AND if the status wasn't explicitly set during payment processing
  if (this.status !== 'cancelled' && this.status !== 'refunded' && !this._statusExplicitlySet) {
    // Ensure we have valid numeric values
    const balance = Math.max(0, this.balance || 0);
    const amountPaid = this.amountPaid || 0;
    const total = this.total || 0;
    
    // Check if invoice is fully paid (balance is 0 or negative AND some payment was made)
    if (balance <= 0.01 && amountPaid > 0 && total > 0) {
      this.status = 'paid';
    } 
    // Check if invoice is partially paid (some payment made but balance remains)
    else if (amountPaid > 0 && balance > 0.01) {
      this.status = 'partial';
    } 
    // Check if invoice is overdue (past due date and has outstanding balance)
    else if (this.status !== 'draft' && this.dueDate && this.dueDate < new Date() && balance > 0.01) {
      this.status = 'overdue';
    } 
    // Check if no payment has been made
    else if (amountPaid <= 0 && this.status !== 'draft') {
      // If no amount is paid and it's not a draft, it could be pending or overdue based on due date
      this.status = (this.dueDate && this.dueDate < new Date()) ? 'overdue' : 'pending';
    } 
    // Keep as draft if no payment and was draft
    else if (this.status === 'draft' && amountPaid <= 0) {
      // Keep as draft if no payment and was draft
    } 
    // Default to pending if not draft and no other conditions met
    else {
      if (this.status !== 'draft') this.status = 'pending';
    }
  }
  next();
});

// Post-save hook to clean up temporary flags
InvoiceSchema.post('save', function() {
  // Clean up the temporary flag after save
  if (this._statusExplicitlySet) {
    delete this._statusExplicitlySet;
  }
});

// Static method to generate invoice number
InvoiceSchema.statics.generateInvoiceNumber = async function() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');

  // Find the latest invoice for today to determine the sequence number
  const latestInvoice = await this.findOne({
    invoiceNumber: new RegExp(`^INV-${year}${month}${day}-\\d{4}$`)
  }).sort({ invoiceNumber: -1 });

  let sequence = 1;
  if (latestInvoice && latestInvoice.invoiceNumber) {
    const lastSeq = parseInt(latestInvoice.invoiceNumber.split('-').pop(), 10);
    if (!isNaN(lastSeq)) {
      sequence = lastSeq + 1;
    }
  }
  const sequenceStr = sequence.toString().padStart(4, '0');
  return `INV-${year}${month}${day}-${sequenceStr}`;
};

// Method to add an item to the invoice
InvoiceSchema.methods.addItem = function(itemData) {
  this.items.push(itemData);
  // No need to save here, pre-save hook will recalculate totals
};

// Method to remove an item from the invoice
InvoiceSchema.methods.removeItem = function(itemId) {
  this.items = this.items.filter(item => item._id.toString() !== itemId.toString());
  // No need to save here, pre-save hook will recalculate totals
};

// Method to update an item in the invoice
InvoiceSchema.methods.updateItem = function(itemId, updateData) {
  const itemIndex = this.items.findIndex(item => item._id.toString() === itemId.toString());
  if (itemIndex > -1) {
    this.items[itemIndex] = { ...this.items[itemIndex], ...updateData };
    // No need to save here, pre-save hook will recalculate totals
  }
};

const Invoice = mongoose.model('Invoice', InvoiceSchema);
module.exports = Invoice; 
