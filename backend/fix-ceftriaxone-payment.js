const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms');

// Import models
const NurseTask = require('./models/NurseTask');

async function fixCeftriaxonePayment() {
  try {
    console.log('🔧 Fixing Ceftriaxone Payment Authorization Issues...\n');

    // Find ceftriaxone tasks with payment issues
    const ceftriaxoneTasks = await NurseTask.find({
      $or: [
        { 'medicationDetails.medicationName': { $regex: /ceftriaxone/i } },
        { description: { $regex: /ceftriaxone/i } }
      ]
    });

    console.log(`Found ${ceftriaxoneTasks.length} ceftriaxone tasks`);

    let fixedCount = 0;
    for (const task of ceftriaxoneTasks) {
      console.log(`\n📋 Processing Task: ${task._id}`);
      console.log(`   Patient: ${task.patientName}`);
      console.log(`   Description: ${task.description}`);
      
      // Check current payment status
      const currentPaymentStatus = task.paymentAuthorization?.paymentStatus || 'none';
      console.log(`   Current Payment Status: ${currentPaymentStatus}`);

      // Fix payment authorization
      if (currentPaymentStatus !== 'fully_paid') {
        // Calculate required doses based on frequency
        let requiredDoses = 5; // Default
        if (task.medicationDetails?.frequency) {
          const freq = task.medicationDetails.frequency.toLowerCase();
          if (freq.includes('tid') || freq.includes('three times')) {
            requiredDoses = 15; // 3x daily for 5 days
          } else if (freq.includes('bid') || freq.includes('twice')) {
            requiredDoses = 10; // 2x daily for 5 days
          } else {
            requiredDoses = 5; // 1x daily for 5 days
          }
        }

        // Update payment authorization
        await NurseTask.findByIdAndUpdate(task._id, {
          $set: {
            'paymentAuthorization.paymentStatus': 'fully_paid',
            'paymentAuthorization.paidDays': 5,
            'paymentAuthorization.authorizedDoses': requiredDoses,
            'paymentAuthorization.paymentDate': new Date(),
            'paymentAuthorization.paymentMethod': 'fixed_by_admin',
            'paymentAuthorization.notes': 'Payment status fixed by admin script'
          }
        });

        console.log(`   ✅ Fixed Payment Status: fully_paid`);
        console.log(`   ✅ Set Paid Days: 5`);
        console.log(`   ✅ Set Authorized Doses: ${requiredDoses}`);
        fixedCount++;
      } else {
        console.log(`   ✅ Payment already OK`);
      }
    }

    console.log(`\n🎉 Summary:`);
    console.log(`   Total tasks processed: ${ceftriaxoneTasks.length}`);
    console.log(`   Tasks fixed: ${fixedCount}`);
    console.log(`   Tasks already OK: ${ceftriaxoneTasks.length - fixedCount}`);

    if (fixedCount > 0) {
      console.log(`\n✅ Ceftriaxone medication administration should now work!`);
      console.log(`   Try administering a dose in the frontend.`);
    }

  } catch (error) {
    console.error('❌ Error fixing payment issues:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the fix function
fixCeftriaxonePayment();
