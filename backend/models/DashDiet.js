const mongoose = require('mongoose');

const dashDietSchema = new mongoose.Schema({
  patientId: {
    type: String,
    required: true,
    index: true
  },
  patientName: {
    type: String,
    required: true
  },
  planType: {
    type: String,
    enum: ['dash', 'low_sodium', 'heart_healthy'],
    default: 'dash'
  },
  riskLevel: {
    type: String,
    enum: ['low', 'moderate', 'high'],
    default: 'moderate'
  },
  bloodPressure: {
    systolic: { type: Number, required: true },
    diastolic: { type: Number, required: true }
  },
  bmi: { type: Number, required: true },
  weight: { type: Number, required: true },
  height: { type: Number, required: true },
  dietaryRestrictions: [{ type: String }],
  goals: [{ type: String }],
  notes: { type: String, default: '' },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  },
  aiInsights: {
    summary: { type: String, default: '' },
    recommendations: [{ type: String }],
    warnings: [{ type: String }],
    generatedAt: { type: Date }
  },
  generatedBy: { type: String },
  generatedByName: { type: String },
  updatedBy: { type: String },
  updatedByName: { type: String }
}, {
  timestamps: { createdAt: 'generatedAt', updatedAt: 'updatedAt' }
});

dashDietSchema.index({ patientId: 1, status: 1 });
dashDietSchema.index({ riskLevel: 1 });
dashDietSchema.index({ generatedAt: -1 });

module.exports = mongoose.model('DashDiet', dashDietSchema);
