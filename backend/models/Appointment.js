const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
    index: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
    // required: true // Might not be assigned initially
  },
  nurseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  appointmentDateTime: {
    type: Date,
    required: true,
    index: true
  },
  durationMinutes: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['New Patient', 'Follow-up', 'follow-up', 'Consultation', 'consultation', 'Check-up', 'checkup', 'Procedure', 'Emergency', 'lab-test', 'imaging'],
    required: true
  },
  status: {
    type: String,
    enum: ['Scheduled', 'Checked In', 'Completed', 'Cancelled', 'No Show'],
    default: 'Scheduled',
    index: true
  },
  notes: { // Notes related to scheduling
    type: String,
    trim: true
  },
  visitId: { // Optional link to the actual visit/encounter created from this appointment
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Visit'
  },
  selectedLabService: { // Reference to selected lab service
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service'
  },
  selectedImagingService: { // Reference to selected imaging service
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service'
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Index for efficient querying
appointmentSchema.index({ appointmentDateTime: 1, doctorId: 1 });
appointmentSchema.index({ patientId: 1, appointmentDateTime: 1 });
appointmentSchema.index({ doctorId: 1, status: 1, appointmentDateTime: 1 });
appointmentSchema.index({ status: 1, appointmentDateTime: 1 });
appointmentSchema.index({ appointmentDateTime: 1 });

const Appointment = mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment;
