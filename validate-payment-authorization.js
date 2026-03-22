/**
 * Payment Authorization Validation Script
 * 
 * This script validates the current state of payment authorization
 * across prescriptions, invoices, and nurse tasks.
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function validatePaymentAuthorization() {
  try {
    console.log('🔍 Validating payment authorization across the system...\n');
    
    const Prescription = require('./backend/models/Prescription');
    const NurseTask = require('./backend/models/NurseTask');
    const MedicalInvoice = require('./backend/models/MedicalInvoice');
    
    // 1. Check prescriptions with payment data
    console.log('📋 Checking prescriptions...');
    const prescriptions = await Prescription.find({
      $or: [
        { paymentAuthorization: { $exists: true } },
        { paymentStatus: { $exists: true } }
      ]
    });
    
    console.log(`   Found ${prescriptions.length} prescriptions with payment data`);
    
    let prescriptionIssues = 0;
    for (const prescription of prescriptions) {
      const issues = [];
      
      // Check for payment status consistency
      if (prescription.paymentStatus && prescription.paymentAuthorization?.paymentStatus) {
        const topLevel = prescription.paymentStatus;
        const authLevel = prescription.paymentAuthorization.paymentStatus;
        
        // Map to consistent values for comparison
        const statusMap = {
          'pending': 'unpaid',
          'paid': 'fully_paid',
          'partial': 'partial',
          'partially_paid': 'partial',
          'fully_paid': 'fully_paid',
          'unpaid': 'unpaid'
        };
        
        const normalizedTop = statusMap[topLevel] || topLevel;
        const normalizedAuth = statusMap[authLevel] || authLevel;
        
        if (normalizedTop !== normalizedAuth) {
          issues.push(`Payment status mismatch: "${topLevel}" vs "${authLevel}"`);
        }
      }
      
      // Check for duration parsing issues
      if (prescription.duration && typeof prescription.duration === 'string') {
        const durationStr = prescription.duration;
        if (!durationStr.match(/\d+/)) {
          issues.push(`Invalid duration format: "${durationStr}"`);
        }
      }
      
      if (issues.length > 0) {
        prescriptionIssues++;
        console.log(`   ❌ Prescription ${prescription._id} (${prescription.medicationName}):`);
        issues.forEach(issue => console.log(`      - ${issue}`));
      }
    }
    
    console.log(`   ${prescriptionIssues} prescriptions have issues\n`);
    
    // 2. Check nurse tasks with payment authorization
    console.log('👩‍⚕️ Checking nurse tasks...');
    const nurseTasks = await NurseTask.find({
      taskType: 'MEDICATION',
      paymentAuthorization: { $exists: true }
    });
    
    console.log(`   Found ${nurseTasks.length} nurse tasks with payment authorization`);
    
    let nurseTaskIssues = 0;
    for (const task of nurseTasks) {
      const issues = [];
      const paymentAuth = task.paymentAuthorization;
      
      // Check for logical consistency
      const authorizedDoses = paymentAuth.authorizedDoses || 0;
      const canAdminister = paymentAuth.canAdminister;
      
      if (canAdminister && authorizedDoses === 0) {
        issues.push(`canAdminister=true but authorizedDoses=0`);
      }
      
      if (!canAdminister && authorizedDoses > 0) {
        issues.push(`canAdminister=false but authorizedDoses=${authorizedDoses}`);
      }
      
      // Check for missing invoice links
      if (!task.medicationDetails?.invoiceId) {
        issues.push(`Missing invoice link`);
      }
      
      // Check dose records consistency
      if (task.medicationDetails?.doseRecords) {
        const totalDoses = task.medicationDetails.doseRecords.length;
        const authorizedCount = task.medicationDetails.doseRecords.filter(d => d.paymentAuthorized).length;
        
        if (authorizedCount !== authorizedDoses) {
          issues.push(`Dose records mismatch: ${authorizedCount} authorized in records vs ${authorizedDoses} in paymentAuth`);
        }
      }
      
      if (issues.length > 0) {
        nurseTaskIssues++;
        console.log(`   ❌ Nurse task ${task._id} (${task.medicationDetails?.medicationName}):`);
        issues.forEach(issue => console.log(`      - ${issue}`));
      }
    }
    
    console.log(`   ${nurseTaskIssues} nurse tasks have issues\n`);
    
    // 3. Check for orphaned data
    console.log('🔗 Checking for orphaned data...');
    
    // Find prescriptions without corresponding invoices
    const prescriptionsWithoutInvoices = await Prescription.find({
      paymentStatus: { $in: ['paid', 'partial'] },
      invoiceId: { $exists: false }
    });
    
    console.log(`   ${prescriptionsWithoutInvoices.length} paid prescriptions without invoice links`);
    
    // Find nurse tasks without prescription links
    const nurseTasksWithoutPrescriptions = await NurseTask.find({
      taskType: 'MEDICATION',
      'medicationDetails.prescriptionId': { $exists: false }
    });
    
    console.log(`   ${nurseTasksWithoutPrescriptions.length} nurse tasks without prescription links\n`);
    
    // 4. Summary
    console.log('📊 VALIDATION SUMMARY:');
    console.log(`   - Total prescriptions checked: ${prescriptions.length}`);
    console.log(`   - Prescriptions with issues: ${prescriptionIssues}`);
    console.log(`   - Total nurse tasks checked: ${nurseTasks.length}`);
    console.log(`   - Nurse tasks with issues: ${nurseTaskIssues}`);
    console.log(`   - Orphaned prescriptions: ${prescriptionsWithoutInvoices.length}`);
    console.log(`   - Orphaned nurse tasks: ${nurseTasksWithoutPrescriptions.length}`);
    
    const totalIssues = prescriptionIssues + nurseTaskIssues + prescriptionsWithoutInvoices.length + nurseTasksWithoutPrescriptions.length;
    
    if (totalIssues === 0) {
      console.log('\n✅ All payment authorization data is consistent!');
    } else {
      console.log(`\n⚠️  Found ${totalIssues} issues that need to be fixed.`);
      console.log('   Run the payment authorization fix script to resolve these issues.');
    }
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
    throw error;
  }
}

// Main function
async function main() {
  try {
    await connectDB();
    await validatePaymentAuthorization();
  } catch (error) {
    console.error('❌ Validation script failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { validatePaymentAuthorization };
