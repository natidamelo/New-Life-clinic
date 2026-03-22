const mongoose = require('mongoose');

const RouteUsageSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    role: { type: String, index: true },
    path: { type: String, required: true, index: true },
    label: { type: String },
    action: { type: String, enum: ['click', 'enter', 'leave'], required: true },
    durationMs: { type: Number },
    timestamp: { type: Date, default: Date.now, index: true },
    userAgent: { type: String },
    device: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RouteUsage', RouteUsageSchema);




