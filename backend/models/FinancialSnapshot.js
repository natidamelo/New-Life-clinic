const mongoose = require('mongoose');

const financialSnapshotSchema = new mongoose.Schema({
  // Period
  year:  { type: Number, required: true },
  month: { type: Number, required: true, min: 1, max: 12 },

  // Revenue Breakdown
  revenue: {
    total:          { type: Number, default: 0 },
    consultations:  { type: Number, default: 0 },
    labTests:       { type: Number, default: 0 },
    medications:    { type: Number, default: 0 },
    procedures:     { type: Number, default: 0 },
    imaging:        { type: Number, default: 0 },
    services:       { type: Number, default: 0 },
    other:          { type: Number, default: 0 }
  },

  // Expense Breakdown
  expenses: {
    total:          { type: Number, default: 0 },
    rent:           { type: Number, default: 0 },
    salary:         { type: Number, default: 0 },
    overtime:       { type: Number, default: 0 },
    utilities:      { type: Number, default: 0 },
    maintenance:    { type: Number, default: 0 },
    supplies:       { type: Number, default: 0 },
    other:          { type: Number, default: 0 }
  },

  // RCM Metrics
  rcm: {
    totalInvoices:     { type: Number, default: 0 },
    paidInvoices:      { type: Number, default: 0 },
    pendingInvoices:   { type: Number, default: 0 },
    overdueInvoices:   { type: Number, default: 0 },
    cancelledInvoices: { type: Number, default: 0 },
    collectionRate:    { type: Number, default: 0 },
    avgDaysToPayment:  { type: Number, default: 0 }
  },

  // Visit Metrics
  visits: {
    totalVisits:       { type: Number, default: 0 },
    totalPatients:     { type: Number, default: 0 },
    newPatients:       { type: Number, default: 0 },
    returningPatients: { type: Number, default: 0 },
    noShows:           { type: Number, default: 0 },
    noShowRate:        { type: Number, default: 0 }
  },

  // Calculated KPIs
  kpis: {
    netIncome:       { type: Number, default: 0 },
    costPerVisit:    { type: Number, default: 0 },
    revenuePerVisit: { type: Number, default: 0 },
    profitMargin:    { type: Number, default: 0 }
  },

  // Metadata
  generatedAt: { type: Date, default: Date.now },
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

financialSnapshotSchema.index({ year: 1, month: 1 }, { unique: true });

const FinancialSnapshot = mongoose.model('FinancialSnapshot', financialSnapshotSchema);

module.exports = FinancialSnapshot;
