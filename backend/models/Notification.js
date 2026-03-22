const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: [
      'appointment_reminder', 
      'new_message', 
      'lab_result_ready', 
      'prescription_refill', 
      'critical_alert', 
      'system_update', 
      'info', 
      'warning',
      'error',
      'PATIENT_READY',
      'PATIENT_VITALS',
      'PATIENT_COMPLETED',
      'PATIENT_REOPENED',
      'vitals_update',
      'payment_required',
      'card_payment_required',
      'lab_payment_required',
      'medication_payment_required',
      'imaging_payment_required',
      'service_payment_required',
      'service_ready',
      'imaging_report_finalized',
      'imaging_report_sent',
      'nurse_medication_task',
      'ipd_nurse_report',
      // Added to support procedure completion billing notifications
      'PROCEDURE_PAYMENT',
      // Added to support leave request notifications
      'leave_request_pending'
    ],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },
  senderId: {
    type: String,
    required: true
  },
  senderRole: {
    type: String,
    required: true
  },
  recipientId: {
    type: String,
    default: null
  },
  recipientRole: {
    type: String,
    default: null
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  category: {
    type: String,
    enum: ['patient', 'payment', 'system', 'appointment', 'lab', 'medication', 'service'],
    default: 'system'
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  }
});

// Add compound index to prevent duplicate medication payment notifications
notificationSchema.index(
  { 
    type: 1, 
    'data.prescriptionId': 1, 
    'data.patientId': 1, 
    read: 1 
  }, 
  { 
    unique: true,
    partialFilterExpression: {
      type: 'medication_payment_required',
      read: false
    }
  }
);

// Add compound index to prevent duplicate lab payment notifications
notificationSchema.index(
  { 
    type: 1, 
    'data.patientId': 1, 
    'data.labOrderIds': 1, 
    read: 1 
  }, 
  { 
    unique: true,
    partialFilterExpression: {
      type: 'lab_payment_required',
      read: false
    }
  }
);

// Add compound index to prevent duplicate lab payment notifications (single lab order)
notificationSchema.index(
  { 
    type: 1, 
    'data.patientId': 1, 
    'data.labOrderId': 1, 
    read: 1 
  }, 
  { 
    unique: true,
    partialFilterExpression: {
      type: 'lab_payment_required',
      read: false
    }
  }
);

module.exports = mongoose.model('Notification', notificationSchema); 
