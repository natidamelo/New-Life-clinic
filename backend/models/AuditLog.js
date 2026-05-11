const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  // WHO
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  userName: { type: String, required: true },
  userRole: { type: String, required: true },

  // WHAT
  action: {
    type: String,
    enum: ['VIEW', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT', 'PRINT', 'LOGIN', 'LOGOUT'],
    required: true,
    index: true
  },
  resourceType: {
    type: String,
    enum: [
      'Patient', 'MedicalRecord', 'Prescription', 'LabOrder', 'Invoice',
      'Appointment', 'User', 'Inventory', 'Report', 'Certificate', 'System'
    ],
    required: true,
    index: true
  },
  resourceId: { type: String },
  resourceName: { type: String },

  // CONTEXT
  description: { type: String },
  ipAddress: { type: String },
  userAgent: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed },

  // WHEN
  timestamp: { type: Date, default: Date.now, index: true }
}, {
  timestamps: false
});

// Compound indexes for audit queries
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
// TTL index: auto-delete logs older than 2 years
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 63072000 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
