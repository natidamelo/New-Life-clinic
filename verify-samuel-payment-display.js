/**
 * Verify Samuel's Payment Display Fix
 * This script checks if the payment authorization data is correctly set for frontend display
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const NurseTask = require('./backend/models/NurseTask');
const Patient = require('./backend/models/Patient');

async function verifySamuelPaymentDisplay() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to MongoDB');

    // Find Samuel Negatu
    const samuel = await Patient.findOne({
      $or: [
        { firstName: { $regex: /samuel/i }, lastName: { $regex: /negatu/i } },
        { firstName: { $regex: /negatu/i }, lastName: { $regex: /samuel/i } },
        { firstName: { $regex: /samuel negatu/i } },
        { lastName: { $regex: /samuel negatu/i } }
      ]
    });

    if (!samuel) {
      console.log('❌ Samuel Negatu not found in database');
      return;
    }

    console.log('✅ Found Samuel Negatu:', {
      id: samuel._id,
      name: `${samuel.firstName} ${samuel.lastName}`
    });

    // Find his medication tasks
    const medicationTasks = await NurseTask.find({
      patientId: samuel._id,
      taskType: 'MEDICATION',
      $or: [
        { 'medicationDetails.medicationName': { $regex: /ceftriaxone/i } },
        { description: { $regex: /ceftriaxone/i } }
      ]
    });

    console.log(`\n📋 Found ${medicationTasks.length} Ceftriaxone medication tasks for Samuel`);

    if (medicationTasks.length === 0) {
      console.log('❌ No Ceftriaxone medication tasks found for Samuel');
      console.log('💡 This might be why you don\'t see changes in the frontend');
      return;
    }

    medicationTasks.forEach((task, index) => {
      console.log(`\n🔍 Task ${index + 1}:`);
      console.log('   • Task ID:', task._id);
      console.log('   • Description:', task.description);
      console.log('   • Status:', task.status);
      
      if (task.medicationDetails) {
        console.log('   • Medication:', task.medicationDetails.medicationName);
        console.log('   • Frequency:', task.medicationDetails.frequency);
        console.log('   • Duration:', task.medicationDetails.duration, 'days');
        
        if (task.medicationDetails.doseRecords) {
          const administered = task.medicationDetails.doseRecords.filter(r => r.administered).length;
          const total = task.medicationDetails.doseRecords.length;
          console.log('   • Dose Records:', `${administered}/${total} administered`);
        }
      }
      
      if (task.paymentAuthorization) {
        const auth = task.paymentAuthorization;
        console.log('   • Payment Authorization:');
        console.log('     - Payment Status:', auth.paymentStatus);
        console.log('     - Paid Days:', auth.paidDays);
        console.log('     - Total Days:', auth.totalDays);
        console.log('     - Authorized Doses:', auth.authorizedDoses);
        console.log('     - Unauthorized Doses:', auth.unauthorizedDoses);
        console.log('     - Outstanding Amount:', `ETB ${auth.outstandingAmount}`);
        
        // Simulate the exact frontend display logic
        const totalDoses = (auth.authorizedDoses || 0) + (auth.unauthorizedDoses || 0);
        let frontendDisplay;
        
        if (auth.authorizedDoses && auth.authorizedDoses > 0 && totalDoses > 0) {
          frontendDisplay = `${auth.authorizedDoses} paid of ${totalDoses}`;
        } else {
          frontendDisplay = `${auth.paidDays}/${auth.totalDays} days paid`;
        }
        
        console.log('     - Frontend Display:', `"${frontendDisplay}"`);
        
        // Check if this is the expected result
        if (auth.authorizedDoses === 1 && totalDoses === 14) {
          console.log('     ✅ SUCCESS: Frontend should show "1 paid of 14"');
        } else if (auth.authorizedDoses === 1 && totalDoses > 1) {
          console.log('     ✅ PARTIAL SUCCESS: Shows dose-based payment');
        } else {
          console.log('     ⚠️  ISSUE: May not show expected "1 paid of 14"');
        }
      } else {
        console.log('   • ❌ No payment authorization found');
      }
    });

    console.log('\n🎯 Frontend Access Instructions:');
    console.log('   1. Open browser to: http://localhost:5173');
    console.log('   2. Login as nurse: semhal@clinic.com / password123');
    console.log('   3. Navigate to: http://localhost:5173/nurse/tasks');
    console.log('   4. Look for Samuel Negatu\'s Ceftriaxone medication');
    console.log('   5. Check if payment shows "1 paid of 14" instead of "0/7 doses"');

    console.log('\n📝 Summary:');
    if (medicationTasks.length > 0 && medicationTasks[0].paymentAuthorization) {
      const auth = medicationTasks[0].paymentAuthorization;
      const totalDoses = (auth.authorizedDoses || 0) + (auth.unauthorizedDoses || 0);
      if (auth.authorizedDoses === 1 && totalDoses > 1) {
        console.log('   ✅ Database has been updated correctly');
        console.log('   ✅ Frontend should now show dose-based payment');
        console.log('   💡 If you still don\'t see changes, try refreshing the browser page');
      } else {
        console.log('   ⚠️  Database may need additional updates');
      }
    } else {
      console.log('   ❌ No payment authorization data found');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the verification
if (require.main === module) {
  verifySamuelPaymentDisplay();
}

module.exports = verifySamuelPaymentDisplay;
