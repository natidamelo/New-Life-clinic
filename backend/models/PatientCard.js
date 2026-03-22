const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PatientCardSchema = new Schema({
  patient: {
    type: Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
    index: true
  },
  cardNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  type: {
    type: String,
    enum: ['Basic', 'Premium', 'VIP', 'Family'],
    required: true
  },
  status: {
    type: String,
    enum: ['Active', 'Expired', 'Cancelled', 'Grace'],
    default: 'Active'
  },
  issuedDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  expiryDate: {
    type: Date,
    required: true
  },
  lastPaymentDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  amountPaid: {
    type: Number,
    required: true
  },
  graceEndDate: {
    type: Date
  },
  benefits: {
    discountPercentage: {
      type: Number,
      default: 0
    },
    freeConsultations: {
      type: Number,
      default: 0
    },
    priorityAppointments: {
      type: Boolean,
      default: false
    },
    freeLabTests: {
      type: Number,
      default: 0
    }
  },
  paymentHistory: [{
    amount: Number,
    paymentDate: Date,
    paymentMethod: String,
    transaction: {
      type: Schema.Types.ObjectId,
      ref: 'Payment'
    }
  }],
  autoRenewal: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Virtual for checking if card is in grace period
PatientCardSchema.virtual('inGracePeriod').get(function() {
  if (this.status !== 'Grace') {
    return false;
  }
  
  const now = new Date();
  return now <= this.graceEndDate;
});

// Virtual for days left in grace period
PatientCardSchema.virtual('daysLeftInGrace').get(function() {
  if (this.status !== 'Grace' || !this.graceEndDate) {
    return 0;
  }
  
  const now = new Date();
  if (now > this.graceEndDate) {
    return 0;
  }
  
  const diffTime = Math.abs(this.graceEndDate - now);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for checking if card is valid
PatientCardSchema.virtual('isValid').get(function() {
  if (this.status === 'Cancelled') {
    return false;
  }
  
  const now = new Date();
  return (this.status === 'Active' && now <= this.expiryDate) || 
         (this.status === 'Grace' && now <= this.graceEndDate);
});

// Method to check if the card has expired and update status
PatientCardSchema.methods.checkExpiry = async function() {
  const now = new Date();
  
  // If already expired or cancelled, do nothing
  if (this.status === 'Expired' || this.status === 'Cancelled') {
    return this;
  }
  
  // Check if active card is expired
  if (this.status === 'Active' && now > this.expiryDate) {
    // Set to grace period (15 days)
    this.status = 'Grace';
    const graceEnd = new Date(this.expiryDate);
    graceEnd.setDate(graceEnd.getDate() + 15); // 15 days grace period
    this.graceEndDate = graceEnd;
    await this.save();
  }
  
  // Check if grace period has ended
  if (this.status === 'Grace' && now > this.graceEndDate) {
    this.status = 'Expired';
    await this.save();
  }
  
  return this;
};

// Method to renew the card
PatientCardSchema.methods.renew = async function(paymentDetails) {
  const { amount, paymentMethod, transactionId } = paymentDetails;
  
  // Calculate new expiry date (1 year from current expiry if still valid, or 1 year from now if expired)
  let newExpiryDate;
  const now = new Date();
  
  if (this.status === 'Active' && now <= this.expiryDate) {
    // If active and not expired, extend by 1 year from current expiry
    newExpiryDate = new Date(this.expiryDate);
    newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);
  } else {
    // If expired or in grace, 1 year from now
    newExpiryDate = new Date();
    newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);
  }
  
  // Update card details
  this.status = 'Active';
  this.expiryDate = newExpiryDate;
  this.lastPaymentDate = now;
  this.amountPaid = amount;
  this.graceEndDate = null; // Clear grace period
  
  // Add to payment history
  this.paymentHistory.push({
    amount,
    paymentDate: now,
    paymentMethod,
    transaction: transactionId
  });
  
  return this.save();
};

const PatientCard = mongoose.model('PatientCard', PatientCardSchema);

module.exports = PatientCard; 
