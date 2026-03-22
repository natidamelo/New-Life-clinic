const mongoose = require('mongoose');
const express = require('express');
const MedicalInvoice = require('./models/MedicalInvoice');
const Notification = require('./models/Notification');
const LabOrder = require('./models/LabOrder');
const Patient = require('./models/Patient');

// Connect to database
mongoose.connect('mongodb://localhost:27017/clinic-cms')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Get the latest lab payment notification
    const notification = await Notification.findOne({type: 'lab_payment_required'}).sort({createdAt: -1});
    
    if (!notification) {
      console.log('No lab payment notification found');
      process.exit(1);
    }
    
    console.log('Found notification:');
    console.log('- Invoice ID:', notification.data.invoiceId);
    console.log('- Lab Order IDs:', notification.data.labOrderIds);
    console.log('- Total Amount:', notification.data.totalAmount);
    
    // Mock req, res, next
    const req = {
      body: {
        invoiceId: notification.data.invoiceId,
        labOrderIds: notification.data.labOrderIds,
        paymentMethod: 'cash',
        amountPaid: notification.data.totalAmount,
        notes: 'Test payment'
      },
      user: {
        _id: '507f1f77bcf86cd799439011' // Mock user ID
      }
    };
    
    const res = {
      status: (code) => ({
        json: (data) => {
          console.log(`Response ${code}:`, JSON.stringify(data, null, 2));
          process.exit(code === 200 ? 0 : 1);
        }
      })
    };
    
    // Test the payment logic directly
    try {
      const { labOrderId, labOrderIds, invoiceId, paymentMethod, amountPaid, notes } = req.body;

      // Get the invoice
      const invoice = await MedicalInvoice.findById(invoiceId);
      if (!invoice) {
        return res.status(404).json({ message: 'Invoice not found' });
      }

      console.log('Found invoice:', {
        id: invoice._id,
        total: invoice.total,
        status: invoice.status
      });

      // Verify the payment amount matches the invoice total
      console.log(`Payment validation - Amount paid: ${amountPaid}, Invoice total: ${invoice.total}`);
      if (Math.abs(amountPaid - invoice.total) > 0.01) {
        return res.status(400).json({ 
          message: 'Payment amount does not match invoice total',
          amountPaid,
          invoiceTotal: invoice.total
        });
      }

      // Update the invoice as paid
      invoice.amountPaid = amountPaid;
      invoice.balance = 0;
      invoice.status = 'paid';
      invoice.payments = [{
        amount: amountPaid,
        method: paymentMethod,
        date: new Date(),
        reference: `LAB-PAY-${Date.now()}`,
        notes: notes || 'Lab test payment'
      }];
      await invoice.save();

      console.log('Invoice updated successfully');

      // Handle both single and multiple lab orders
      const orderIds = labOrderIds || (labOrderId ? [labOrderId] : []);
      
      if (orderIds.length === 0) {
        return res.status(400).json({ message: 'No lab order IDs provided' });
      }

      console.log('Processing lab orders:', orderIds);

      const updatedLabOrders = [];
      let patient = null;

      // Update all lab orders status to allow processing
      for (const orderId of orderIds) {
        const labOrder = await LabOrder.findById(orderId);
        if (!labOrder) {
          console.warn(`Lab order not found: ${orderId}`);
          continue;
        }

        console.log('Found lab order:', {
          id: labOrder._id,
          testName: labOrder.testName,
          status: labOrder.status
        });

        labOrder.status = 'Ordered';
        labOrder.paymentStatus = 'paid';
        labOrder.paidAt = new Date();
        await labOrder.save();
        updatedLabOrders.push(labOrder);

        // Get patient details (same for all orders)
        if (!patient) {
          patient = await Patient.findById(labOrder.patientId);
          console.log('Found patient:', patient ? `${patient.firstName} ${patient.lastName}` : 'Not found');
        }
      }

      console.log('All lab orders updated successfully');

      res.status(200).json({
        success: true,
        message: `Lab test payment processed successfully. ${updatedLabOrders.length} tests ready for processing.`,
        data: {
          invoice: invoice,
          labOrders: updatedLabOrders
        }
      });

    } catch (error) {
      console.error('Error processing lab payment:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to process lab payment',
        error: error.message 
      });
    }
    
  })
  .catch(error => {
    console.error('Database connection error:', error);
    process.exit(1);
  }); 