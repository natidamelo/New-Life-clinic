const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Appointment = require('../models/Appointment');
const MedicalInvoice = require('../models/MedicalInvoice');
const Patient = require('../models/Patient');
const User = require('../models/User');
const Service = require('../models/Service');
const mongoose = require('mongoose');

// Simple middleware function for admin/reception
const requireAdminOrReception = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }
  
  const userRoles = req.user.roles || (req.user.role ? [req.user.role] : []);
  const hasPermission = userRoles.includes('admin') || userRoles.includes('reception');
  
  if (!hasPermission) {
    return res.status(403).json({ 
      success: false, 
      message: 'Permission denied. Requires admin or reception role.' 
    });
  }
  
  next();
};

// @route   POST /api/appointment-payments/:id/check-in
// @desc    Check in appointment and create invoice
// @access  Private (Reception, Admin)
router.post('/:id/check-in', auth, requireAdminOrReception, async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod = 'cash', amountPaid = 0, notes = '' } = req.body;
    
    console.log('🔍 [checkInAppointment] Starting check-in for appointment:', id);
    console.log('🔍 [checkInAppointment] Payment data:', { paymentMethod, amountPaid, notes });
    
    // Find the appointment
    const appointment = await Appointment.findById(id)
      .populate('patientId', 'firstName lastName patientId')
      .populate('doctorId', 'firstName lastName')
      .populate('selectedLabService', 'name price category description')
      .populate('selectedImagingService', 'name price category description');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Check if appointment is already checked in
    if (appointment.status === 'Checked In') {
      return res.status(400).json({
        success: false,
        message: 'Appointment is already checked in'
      });
    }

    console.log('🔍 [checkInAppointment] Found appointment:', {
      id: appointment._id,
      type: appointment.type,
      patient: appointment.patientId?.firstName,
      selectedLabService: appointment.selectedLabService?.name,
      selectedImagingService: appointment.selectedImagingService?.name
    });

    // Determine service and pricing
    let servicePrice = 500; // Default fallback
    let serviceName = `${appointment.type} Appointment`;
    let serviceDescription = `Standard ${appointment.type} appointment service`;

    if (appointment.type === 'lab-test' && appointment.selectedLabService) {
      servicePrice = appointment.selectedLabService.price;
      serviceName = appointment.selectedLabService.name;
      serviceDescription = appointment.selectedLabService.description || `${appointment.selectedLabService.name} - ${appointment.selectedLabService.category}`;
    } else if (appointment.type === 'imaging' && appointment.selectedImagingService) {
      servicePrice = appointment.selectedImagingService.price;
      serviceName = appointment.selectedImagingService.name;
      serviceDescription = appointment.selectedImagingService.description || `${appointment.selectedImagingService.name} - ${appointment.selectedImagingService.category}`;
    }

    console.log('🔍 [checkInAppointment] Service details:', {
      servicePrice,
      serviceName,
      serviceDescription
    });

    // Map appointment type to valid category
    let category = 'other';
    if (appointment.type === 'lab-test') {
      category = 'lab';
    } else if (appointment.type === 'imaging') {
      category = 'imaging';
    } else if (appointment.type === 'consultation' || appointment.type === 'Consultation') {
      category = 'consultation';
    } else if (appointment.type === 'procedure' || appointment.type === 'Procedure') {
      category = 'procedure';
    } else {
      category = 'service';
    }

    // Create invoice
    const invoiceData = {
      patient: appointment.patientId._id,
      patientId: appointment.patientId.patientId, // Patient ID string
      patientName: `${appointment.patientId.firstName} ${appointment.patientId.lastName}`,
      invoiceNumber: `INV-${Date.now()}`,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      status: 'pending',
      items: [{
        itemType: 'service',
        category: category,
        serviceName: serviceName,
        description: serviceDescription,
        quantity: 1,
        unitPrice: servicePrice,
        total: servicePrice,
        discount: 0,
        tax: 0,
        metadata: {
          appointmentId: appointment._id,
          appointmentType: appointment.type,
          doctorName: `Dr. ${appointment.doctorId?.firstName} ${appointment.doctorId?.lastName}`,
          appointmentDateTime: appointment.appointmentDateTime,
          serviceType: 'appointment'
        },
        addedAt: new Date(),
        addedBy: req.user._id
      }],
      subtotal: servicePrice,
      taxTotal: 0,
      discountTotal: 0,
      total: servicePrice,
      amountPaid: 0,
      balance: servicePrice,
      notes: notes || `Appointment check-in for ${appointment.type}`,
      createdBy: req.user._id
    };

    const invoice = new MedicalInvoice(invoiceData);
    await invoice.save();

    // Update appointment status
    appointment.status = 'Checked In';
    appointment.invoiceId = invoice._id;
    await appointment.save();

    console.log('✅ [checkInAppointment] Check-in successful:', {
      appointmentId: appointment._id,
      invoiceId: invoice._id,
      servicePrice,
      patientName: appointment.patientId.firstName + ' ' + appointment.patientId.lastName
    });

    res.status(200).json({
      success: true,
      message: 'Appointment checked in successfully',
      data: {
        appointmentId: appointment._id,
        invoiceId: invoice._id,
        serviceName,
        servicePrice,
        serviceDescription,
        patientName: appointment.patientId.firstName + ' ' + appointment.patientId.lastName
      }
    });

  } catch (error) {
    console.error('❌ [checkInAppointment] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check in appointment',
      error: error.message
    });
  }
});

module.exports = router;