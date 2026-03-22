/**
 * Comprehensive Payment Status Check and Fix
 * 
 * This script checks for payment status inconsistencies across the system
 * and provides fixes for any issues found.
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Prescription = require('./backend/models/Prescription');
const NurseTask = require('./backend/models/NurseTask');
const MedicalInvoice = require('./backend/models/MedicalInvoice');

async function checkPaymentStatusIssues() {
  try {
    console.log('🔍 Comprehensive Payment Status Check...\n');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to database\n');
    
    // Check 1: Inconsistent payment status between invoice and prescription
    console.log('📋 Check 1: Invoice vs Prescription Payment Status Mismatch');
    const invoicePrescriptionMismatches = await MedicalInvoice.aggregate([
      {
        $lookup: {
          from: 'prescriptions',
          localField: '_id',
          foreignField: 'invoiceId',
          as: 'prescriptions'
        }
      },
      {
        $match: {
          'prescriptions.0': { $exists: true },
          $or: [
            { status: 'paid', 'prescriptions.paymentStatus': { $ne: 'paid' } },
            { status: 'partial', 'prescriptions.paymentStatus': { $nin: ['partial', 'paid'] } },
            { status: 'pending', 'prescriptions.paymentStatus': { $nin: ['pending', 'unpaid'] } }
          ]
        }
      },
      { $limit: 10 }
    ]);
    
    console.log(`   Found ${invoicePrescriptionMismatches.length} invoice-prescription payment status mismatches:`);
    for (const mismatch of invoicePrescriptionMismatches) {
      console.log(`   - Invoice ID: ${mismatch._id}`);
      console.log(`     Invoice Status: ${mismatch.status}`);
      console.log(`     Invoice Balance: ${mismatch.balance}`);
      console.log(`     Invoice Amount Paid: ${mismatch.amountPaid}`);
      console.log(`     Prescription Status: ${mismatch.prescriptions[0]?.paymentStatus}`);
      console.log('');
    }
    
    // Check 2: Prescriptions with payment authorization issues
    console.log('📋 Check 2: Prescription Payment Authorization Issues');
    const prescriptionAuthIssues = await Prescription.find({
      $or: [
        { paymentStatus: 'paid', 'paymentAuthorization.paymentStatus': 'unpaid' },
        { paymentStatus: 'paid', 'paymentAuthorization.authorizedDoses': 0 },
        { paymentStatus: 'partial', 'paymentAuthorization.paymentStatus': 'unpaid' },
        { paymentStatus: 'partial', 'paymentAuthorization.authorizedDoses': 0 },
        { totalCost: 0, paymentStatus: { $in: ['paid', 'partial'] } }
      ]
    }).limit(10);
    
    console.log(`   Found ${prescriptionAuthIssues.length} prescription payment authorization issues:`);
    for (const prescription of prescriptionAuthIssues) {
      console.log(`   - Prescription ID: ${prescription._id}`);
      console.log(`     Patient: ${prescription.patient}`);
      console.log(`     Medication: ${prescription.medicationName}`);
      console.log(`     Top-level paymentStatus: ${prescription.paymentStatus}`);
      console.log(`     paymentAuthorization.paymentStatus: ${prescription.paymentAuthorization?.paymentStatus}`);
      console.log(`     paymentAuthorization.authorizedDoses: ${prescription.paymentAuthorization?.authorizedDoses}`);
      console.log(`     totalCost: ${prescription.totalCost}`);
      console.log('');
    }
    
    // Check 3: Nurse tasks with payment authorization issues
    console.log('📋 Check 3: Nurse Task Payment Authorization Issues');
    const nurseTaskIssues = await NurseTask.find({
      $or: [
        { 'paymentAuthorization.paymentStatus': 'unpaid', 'paymentAuthorization.authorizedDoses': { $gt: 0 } },
        { 'paymentAuthorization.paymentStatus': 'fully_paid', 'paymentAuthorization.authorizedDoses': 0 },
        { 'paymentAuthorization.paymentStatus': 'partial', 'paymentAuthorization.authorizedDoses': 0 },
        { 'paymentAuthorization.canAdminister': false, 'paymentAuthorization.authorizedDoses': { $gt: 0 } }
      ]
    }).limit(10);
    
    console.log(`   Found ${nurseTaskIssues.length} nurse task payment authorization issues:`);
    for (const task of nurseTaskIssues) {
      console.log(`   - Task ID: ${task._id}`);
      console.log(`     Patient: ${task.patientId}`);
      console.log(`     Medication: ${task.medicationDetails?.medicationName}`);
      console.log(`     paymentAuthorization.paymentStatus: ${task.paymentAuthorization?.paymentStatus}`);
      console.log(`     paymentAuthorization.authorizedDoses: ${task.paymentAuthorization?.authorizedDoses}`);
      console.log(`     paymentAuthorization.canAdminister: ${task.paymentAuthorization?.canAdminister}`);
      console.log('');
    }
    
    // Check 4: Recent invoices with status issues
    console.log('📋 Check 4: Recent Invoices with Status Issues');
    const recentInvoiceIssues = await MedicalInvoice.find({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      $or: [
        { status: 'paid', balance: { $gt: 0 } },
        { status: 'partial', balance: 0 },
        { status: 'pending', amountPaid: { $gt: 0 } },
        { amountPaid: { $gt: 0 }, total: 0 }
      ]
    }).sort({ createdAt: -1 }).limit(10);
    
    console.log(`   Found ${recentInvoiceIssues.length} recent invoices with status issues:`);
    for (const invoice of recentInvoiceIssues) {
      console.log(`   - Invoice ID: ${invoice._id}`);
      console.log(`     Invoice Number: ${invoice.invoiceNumber}`);
      console.log(`     Patient: ${invoice.patient}`);
      console.log(`     Status: ${invoice.status}`);
      console.log(`     Total: ${invoice.total}`);
      console.log(`     Amount Paid: ${invoice.amountPaid}`);
      console.log(`     Balance: ${invoice.balance}`);
      console.log('');
    }
    
    // Check 5: Payment status enum inconsistencies
    console.log('📋 Check 5: Payment Status Enum Inconsistencies');
    const statusEnumIssues = await MedicalInvoice.find({
      status: { $nin: ['pending', 'paid', 'cancelled', 'partial', 'partially_paid', 'overdue', 'disputed'] }
    }).limit(5);
    
    console.log(`   Found ${statusEnumIssues.length} invoices with invalid status values:`);
    for (const invoice of statusEnumIssues) {
      console.log(`   - Invoice ID: ${invoice._id}`);
      console.log(`     Invalid Status: ${invoice.status}`);
      console.log('');
    }
    
    // Summary
    console.log('📊 Summary:');
    console.log(`   - Invoice-prescription mismatches: ${invoicePrescriptionMismatches.length}`);
    console.log(`   - Prescription authorization issues: ${prescriptionAuthIssues.length}`);
    console.log(`   - Nurse task authorization issues: ${nurseTaskIssues.length}`);
    console.log(`   - Recent invoice status issues: ${recentInvoiceIssues.length}`);
    console.log(`   - Invalid status enum values: ${statusEnumIssues.length}`);
    
    const totalIssues = invoicePrescriptionMismatches.length + prescriptionAuthIssues.length + 
                       nurseTaskIssues.length + recentInvoiceIssues.length + statusEnumIssues.length;
    
    if (totalIssues === 0) {
      console.log('\n🎉 No payment status issues found! The system is working correctly.');
    } else {
      console.log(`\n⚠️ ${totalIssues} payment status issues found. Creating fix script...`);
      await createPaymentStatusFixScript({
        invoicePrescriptionMismatches,
        prescriptionAuthIssues,
        nurseTaskIssues,
        recentInvoiceIssues,
        statusEnumIssues
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking payment status issues:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from database');
  }
}

async function createPaymentStatusFixScript(issues) {
  const fixScript = `
/**
 * Payment Status Fix Script
 * 
 * This script fixes the payment status issues found in the system.
 * Generated automatically based on detected issues.
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Prescription = require('./backend/models/Prescription');
const NurseTask = require('./backend/models/NurseTask');
const MedicalInvoice = require('./backend/models/MedicalInvoice');
const PaymentCalculation = require('./backend/utils/paymentCalculation');

async function fixPaymentStatusIssues() {
  try {
    console.log('🔧 Fixing Payment Status Issues...\\n');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to database\\n');
    
    let fixedCount = 0;
    
    // Fix 1: Invoice-prescription payment status mismatches
    console.log('🔧 Fix 1: Invoice-Prescription Payment Status Mismatches');
    ${issues.invoicePrescriptionMismatches.map(mismatch => `
    try {
      const invoice = await MedicalInvoice.findById('${mismatch._id}');
      const prescription = await Prescription.findOne({ invoiceId: '${mismatch._id}' });
      
      if (invoice && prescription) {
        // Sync prescription status with invoice status
        let newPrescriptionStatus;
        if (invoice.status === 'paid') {
          newPrescriptionStatus = 'paid';
        } else if (invoice.status === 'partial' || invoice.status === 'partially_paid') {
          newPrescriptionStatus = 'partial';
        } else {
          newPrescriptionStatus = 'pending';
        }
        
        if (prescription.paymentStatus !== newPrescriptionStatus) {
          prescription.paymentStatus = newPrescriptionStatus;
          await prescription.save();
          console.log(\`   ✅ Fixed prescription \${prescription._id}: \${prescription.paymentStatus} -> \${newPrescriptionStatus}\`);
          fixedCount++;
        }
      }
    } catch (error) {
      console.error(\`   ❌ Error fixing invoice \${'${mismatch._id}'}:\`, error.message);
    }`).join('')}
    
    // Fix 2: Prescription payment authorization issues
    console.log('\\n🔧 Fix 2: Prescription Payment Authorization Issues');
    ${issues.prescriptionAuthIssues.map(prescription => `
    try {
      const prescription = await Prescription.findById('${prescription._id}');
      
      if (prescription) {
        // Recalculate payment authorization
        const paymentAuth = PaymentCalculation.calculatePaymentAuthorization(
          {
            frequency: prescription.frequency,
            duration: prescription.duration,
            medicationName: prescription.medicationName
          },
          prescription.totalCost || 0,
          prescription.totalCost || 0
        );
        
        prescription.paymentAuthorization = {
          ...paymentAuth,
          lastUpdated: new Date()
        };
        
        await prescription.save();
        console.log(\`   ✅ Fixed prescription \${prescription._id} payment authorization\`);
        fixedCount++;
      }
    } catch (error) {
      console.error(\`   ❌ Error fixing prescription \${'${prescription._id}'}:\`, error.message);
    }`).join('')}
    
    // Fix 3: Nurse task payment authorization issues
    console.log('\\n🔧 Fix 3: Nurse Task Payment Authorization Issues');
    ${issues.nurseTaskIssues.map(task => `
    try {
      const nurseTask = await NurseTask.findById('${task._id}');
      
      if (nurseTask) {
        // Find associated prescription
        const prescription = await Prescription.findById(nurseTask.medicationDetails?.prescriptionId);
        
        if (prescription && prescription.paymentAuthorization) {
          // Sync nurse task with prescription payment authorization
          nurseTask.paymentAuthorization = {
            ...prescription.paymentAuthorization,
            lastUpdated: new Date()
          };
          
          await nurseTask.save();
          console.log(\`   ✅ Fixed nurse task \${nurseTask._id} payment authorization\`);
          fixedCount++;
        }
      }
    } catch (error) {
      console.error(\`   ❌ Error fixing nurse task \${'${task._id}'}:\`, error.message);
    }`).join('')}
    
    // Fix 4: Recent invoice status issues
    console.log('\\n🔧 Fix 4: Recent Invoice Status Issues');
    ${issues.recentInvoiceIssues.map(invoice => `
    try {
      const invoice = await MedicalInvoice.findById('${invoice._id}');
      
      if (invoice) {
        // Recalculate status based on balance and amount paid
        let newStatus;
        if (invoice.balance <= 0 && invoice.amountPaid > 0) {
          newStatus = 'paid';
        } else if (invoice.amountPaid > 0 && invoice.balance > 0) {
          newStatus = 'partial';
        } else if (invoice.amountPaid <= 0 && invoice.balance > 0) {
          newStatus = 'pending';
        } else {
          newStatus = invoice.status; // Keep current status if no change needed
        }
        
        if (invoice.status !== newStatus) {
          invoice.status = newStatus;
          await invoice.save();
          console.log(\`   ✅ Fixed invoice \${invoice._id}: \${invoice.status} -> \${newStatus}\`);
          fixedCount++;
        }
      }
    } catch (error) {
      console.error(\`   ❌ Error fixing invoice \${'${invoice._id}'}:\`, error.message);
    }`).join('')}
    
    // Fix 5: Invalid status enum values
    console.log('\\n🔧 Fix 5: Invalid Status Enum Values');
    ${issues.statusEnumIssues.map(invoice => `
    try {
      const invoice = await MedicalInvoice.findById('${invoice._id}');
      
      if (invoice) {
        // Fix invalid status values
        let newStatus;
        if (invoice.status === 'fully_paid') {
          newStatus = 'paid';
        } else if (invoice.status === 'partially_paid') {
          newStatus = 'partial';
        } else if (invoice.status === 'unpaid') {
          newStatus = 'pending';
        } else {
          newStatus = 'pending'; // Default fallback
        }
        
        invoice.status = newStatus;
        await invoice.save();
        console.log(\`   ✅ Fixed invoice \${invoice._id}: \${invoice.status} -> \${newStatus}\`);
        fixedCount++;
      }
    } catch (error) {
      console.error(\`   ❌ Error fixing invoice \${'${invoice._id}'}:\`, error.message);
    }`).join('')}
    
    console.log(\`\\n📊 Fix Summary:\`);
    console.log(\`   ✅ Total issues fixed: \${fixedCount}\`);
    
    if (fixedCount > 0) {
      console.log('\\n🎉 Payment status issues have been fixed!');
    } else {
      console.log('\\n✅ No issues needed fixing.');
    }
    
  } catch (error) {
    console.error('❌ Error fixing payment status issues:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\\n✅ Disconnected from database');
  }
}

// Run the fix
fixPaymentStatusIssues();
`;

  // Write the fix script to a file
  const fs = require('fs');
  fs.writeFileSync('fix-payment-status-issues.js', fixScript);
  console.log('✅ Created fix script: fix-payment-status-issues.js');
}

// Run the check
checkPaymentStatusIssues();
