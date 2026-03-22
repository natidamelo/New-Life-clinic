const mongoose = require('mongoose');
const MedicalInvoice = require('../models/MedicalInvoice');
const Patient = require('../models/Patient');

async function checkInvoices() {
  try {
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('Connected to MongoDB');
    
    const invoices = await MedicalInvoice.find({}).populate('patient', 'firstName lastName');
    console.log('\n=== ALL INVOICES ===');
    
    for (const invoice of invoices) {
      console.log('\nInvoice:', invoice.invoiceNumber);
      console.log('Patient:', invoice.patient?.firstName, invoice.patient?.lastName);
      console.log('Total:', invoice.total);
      console.log('Amount Paid:', invoice.amountPaid);
      console.log('Balance:', invoice.balance);
      console.log('Status:', invoice.status);
      console.log('Items:', invoice.items?.map(item => item.description).join(', '));
    }
    
    // Check specifically for ato eliyas
    const atoEliyasInvoices = await MedicalInvoice.find({
      $or: [
        { patientName: { $regex: /ato eliyas/i } },
        { 'patient.firstName': { $regex: /ato/i } },
        { 'patient.lastName': { $regex: /eliyas/i } }
      ]
    }).populate('patient', 'firstName lastName');
    
    console.log('\n=== ATO ELIYAS INVOICES ===');
    for (const invoice of atoEliyasInvoices) {
      console.log('\nInvoice:', invoice.invoiceNumber);
      console.log('Patient:', invoice.patient?.firstName, invoice.patient?.lastName);
      console.log('Total:', invoice.total);
      console.log('Amount Paid:', invoice.amountPaid);
      console.log('Balance:', invoice.balance);
      console.log('Status:', invoice.status);
      console.log('Items:', invoice.items?.map(item => item.description).join(', '));
    }
    
    // Check for partial payments
    const partialInvoices = await MedicalInvoice.find({ status: 'partial' });
    console.log('\n=== PARTIAL PAYMENT INVOICES ===');
    for (const invoice of partialInvoices) {
      console.log('\nInvoice:', invoice.invoiceNumber);
      console.log('Patient:', invoice.patient?.firstName, invoice.patient?.lastName);
      console.log('Total:', invoice.total);
      console.log('Amount Paid:', invoice.amountPaid);
      console.log('Balance:', invoice.balance);
      console.log('Status:', invoice.status);
      console.log('Items:', invoice.items?.map(item => item.description).join(', '));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkInvoices();
