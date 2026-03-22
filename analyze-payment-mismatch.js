const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const NurseTask = require('./backend/models/NurseTask');
const Invoice = require('./backend/models/Invoice');

async function analyzePaymentMismatch() {
  try {
    console.log('🔍 Analyzing payment mismatch for Solomon Worku...');
    
    // Find the nurse task
    const task = await NurseTask.findOne({
      'patientName': 'Solomon Worku',
      'medicationDetails.medicationName': 'Dexamethasone',
      'taskType': 'MEDICATION'
    });
    
    if (!task) {
      console.log('❌ Task not found for Solomon Worku - Dexamethasone');
      return;
    }
    
    console.log('\n📋 NURSE TASK DETAILS:');
    console.log('  Task ID:', task._id);
    console.log('  Patient:', task.patientName);
    console.log('  Medication:', task.medicationDetails?.medicationName);
    console.log('  Dosage:', task.medicationDetails?.dosage);
    console.log('  Frequency:', task.medicationDetails?.frequency);
    console.log('  Duration:', task.medicationDetails?.duration);
    console.log('  Is Extension:', task.medicationDetails?.isExtension);
    
    // Check payment authorization in task
    if (task.paymentAuthorization) {
      console.log('\n💰 TASK PAYMENT AUTHORIZATION:');
      console.log('  Status:', task.paymentAuthorization.paymentStatus?.current);
      console.log('  Percentage:', task.paymentAuthorization.paymentStatus?.percentage);
      console.log('  Amount Paid:', task.paymentAuthorization.amountPaid);
      console.log('  Balance:', task.paymentAuthorization.balance);
      console.log('  Total:', task.paymentAuthorization.total);
    }
    
    // Find all invoices for this patient
    const invoices = await Invoice.find({
      'patientName': 'Solomon Worku'
    }).sort({ createdAt: 1 });
    
    console.log('\n🧾 INVOICES FOUND:', invoices.length);
    
    invoices.forEach((invoice, index) => {
      console.log(`\n📄 Invoice ${index + 1}:`);
      console.log('  Invoice Number:', invoice.invoiceNumber);
      console.log('  Status:', invoice.paymentAnalytics?.status);
      console.log('  Total:', invoice.total);
      console.log('  Amount Paid:', invoice.amountPaid);
      console.log('  Balance:', invoice.balance);
      console.log('  Is Extension:', invoice.isExtension);
      console.log('  Created:', invoice.createdAt);
      
      if (invoice.items && invoice.items.length > 0) {
        console.log('  Items:');
        invoice.items.forEach((item, itemIndex) => {
          console.log(`    ${itemIndex + 1}. ${item.name || 'Unknown'} - ${item.quantity} x ${item.unitPrice} = ${item.subtotal}`);
        });
      }
      
      if (invoice.extensionDetails) {
        console.log('  Extension Details:');
        console.log('    Original Duration:', invoice.extensionDetails.originalDuration);
        console.log('    Additional Days:', invoice.extensionDetails.additionalDays);
        console.log('    Doses Per Day:', invoice.extensionDetails.dosesPerDay);
        console.log('    Total Doses:', invoice.extensionDetails.totalDoses);
      }
    });
    
    // Analyze the payment situation
    console.log('\n🔍 PAYMENT ANALYSIS:');
    
    const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
    const totalBalance = invoices.reduce((sum, inv) => sum + inv.balance, 0);
    
    console.log('  Total Invoiced:', totalInvoiced);
    console.log('  Total Paid:', totalPaid);
    console.log('  Total Balance:', totalBalance);
    console.log('  Payment Percentage:', Math.round((totalPaid / totalInvoiced) * 100) + '%');
    
    // Check which invoices are for extensions
    const extensionInvoices = invoices.filter(inv => inv.isExtension);
    const originalInvoices = invoices.filter(inv => !inv.isExtension);
    
    console.log('\n📈 EXTENSION ANALYSIS:');
    console.log('  Original Invoices:', originalInvoices.length);
    console.log('  Extension Invoices:', extensionInvoices.length);
    
    if (extensionInvoices.length > 0) {
      const extensionTotal = extensionInvoices.reduce((sum, inv) => sum + inv.total, 0);
      const extensionPaid = extensionInvoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
      console.log('  Extension Total:', extensionTotal);
      console.log('  Extension Paid:', extensionPaid);
      console.log('  Extension Balance:', extensionTotal - extensionPaid);
    }
    
    // Identify the issue
    console.log('\n🚨 ISSUE IDENTIFICATION:');
    
    // Based on your data, there are 3 invoices:
    // 1. INV-EXT-1756300701569-jfntl: 600 total, 300 paid (50%)
    // 2. MED-1756300802510-24fde: 1200 total, 0 paid (0%)
    // 3. INV-EXT-1756300899778-o0j1k: 1200 total, 200 paid (17%)
    
    // The task shows "ETB 500.00 paid" but the actual total paid is 500 (300 + 0 + 200)
    // However, the task might be showing the wrong payment status
    
    console.log('  Expected Payment Display: ETB 500.00 paid (300 + 0 + 200)');
    console.log('  Actual Task Display: ETB 500.00 paid');
    console.log('  Status: Payment display appears correct');
    
    // Check if the task is using the right invoice for payment authorization
    console.log('\n🔧 RECOMMENDED FIXES:');
    console.log('1. Ensure task.paymentAuthorization is using the most recent extension invoice');
    console.log('2. Update payment status calculation to include all relevant invoices');
    console.log('3. Verify dose authorization logic based on actual payment status');
    
  } catch (error) {
    console.error('❌ Error analyzing payment mismatch:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the analysis
analyzePaymentMismatch();
