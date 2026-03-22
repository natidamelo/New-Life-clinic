const Appointment = require('../models/Appointment');
const MedicalInvoice = require('../models/MedicalInvoice');
const Patient = require('../models/Patient');
const Service = require('../models/Service');
const mongoose = require('mongoose');

// @desc    Create invoice for appointment when patient arrives
// @route   POST /api/appointment-payments/:id/check-in
// @access  Private (Reception, Admin)
exports.checkInAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod, amountPaid, notes } = req.body;
    
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

    // Create invoice
    const invoiceData = {
      patientId: appointment.patientId._id,
      invoiceNumber: `INV-${Date.now()}`,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      status: 'pending',
      items: [{
        itemType: 'service',
        category: appointment.type,
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
      taxAmount: 0,
      discountAmount: 0,
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
      servicePrice
    });

    res.status(200).json({
      success: true,
      message: 'Appointment checked in successfully',
      data: {
        appointmentId: appointment._id,
        invoiceId: invoice._id,
        serviceName,
        servicePrice,
        serviceDescription
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
};

// @desc    Process payment for appointment invoice
// @route   POST /api/appointment-payments/:id/payment
// @access  Private (Reception, Admin, Finance)
exports.processAppointmentPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod, amountPaid, notes } = req.body;
    
    // Find the appointment
    const appointment = await Appointment.findById(id)
      .populate('invoiceId');

    if (!appointment || !appointment.invoiceId) {
      return res.status(404).json({
        success: false,
        message: 'Appointment or invoice not found'
      });
    }

    // Update invoice with payment
    const invoice = appointment.invoiceId;
    invoice.amountPaid = (invoice.amountPaid || 0) + parseFloat(amountPaid);
    invoice.balance = invoice.total - invoice.amountPaid;
    
    if (invoice.balance <= 0) {
      invoice.status = 'paid';
    }

    await invoice.save();

    res.status(200).json({
      success: true,
      message: 'Payment processed successfully',
      data: {
        invoiceId: invoice._id,
        amountPaid: invoice.amountPaid,
        balance: invoice.balance,
        status: invoice.status
      }
    });

  } catch (error) {
    console.error('Error processing appointment payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process payment',
      error: error.message
    });
  }
};

// @desc    Get appointment payment status
// @route   GET /api/appointment-payments/:id/payment-status
// @access  Private (Reception, Admin, Finance, Doctor)
exports.getAppointmentPaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
    const appointment = await Appointment.findById(id)
      .populate('invoiceId')
      .populate('patientId', 'firstName lastName patientId');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    let paymentStatus = {
      appointmentId: appointment._id,
      patientName: `${appointment.patientId.firstName} ${appointment.patientId.lastName}`,
      status: 'no_invoice',
      totalAmount: 0,
      amountPaid: 0,
      balance: 0,
      payments: []
    };

    if (appointment.invoiceId) {
      paymentStatus = {
        appointmentId: appointment._id,
        patientName: `${appointment.patientId.firstName} ${appointment.patientId.lastName}`,
        status: appointment.invoiceId.status,
        totalAmount: appointment.invoiceId.total,
        amountPaid: appointment.invoiceId.amountPaid || 0,
        balance: appointment.invoiceId.balance || appointment.invoiceId.total,
        payments: appointment.invoiceId.payments || []
      };
    }
    
    res.status(200).json({
      success: true,
      data: paymentStatus
    });
    
  } catch (error) {
    console.error('Error getting appointment payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment status',
      error: error.message
    });
  }
};