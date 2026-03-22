const mongoose = require('mongoose');

const dataShareSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    dataset: {
      type: String,
      enum: ['patients', 'appointments', 'invoices', 'lab-orders', 'inventory'],
      required: true,
      index: true,
    },
    fields: [{ type: String }],
    filter: { type: mongoose.Schema.Types.Mixed, default: {} },
    token: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: false },
    isActive: { type: Boolean, default: true },
    allowedRoles: [{ type: String }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    accessCount: { type: Number, default: 0 },
    lastAccessedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DataShare', dataShareSchema);


