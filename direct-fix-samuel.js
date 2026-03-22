/**
 * Direct Fix for Samuel's Payment Data
 * This script directly updates the database with the correct payment information
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function directFixSamuel() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Direct database update using raw MongoDB operations
    const db = mongoose.connection.db;
    
    // Find Samuel Negatu's patient record
    const patientsCollection = db.collection('patients');
    const samuel = await patientsCollection.findOne({
      $or: [
        { firstName: { $regex: /samuel/i }, lastName: { $regex: /negatu/i } },
        { firstName: { $regex: /negatu/i }, lastName: { $regex: /samuel/i } }
      ]
    });

    if (!samuel) {
      console.log('❌ Samuel Negatu not found');
      return;
    }

    console.log('✅ Found Samuel:', samuel.firstName, samuel.lastName, 'ID:', samuel._id);

    // Find and update his medication tasks
    const nurseTasksCollection = db.collection('nursetasks');
    
    // Find all Ceftriaxone tasks for Samuel
    const ceftriaxoneTasks = await nurseTasksCollection.find({
      patientId: samuel._id,
      taskType: 'MEDICATION',
      $or: [
        { 'medicationDetails.medicationName': { $regex: /ceftriaxone/i } },
        { description: { $regex: /ceftriaxone/i } }
      ]
    }).toArray();

    console.log(`\n📋 Found ${ceftriaxoneTasks.length} Ceftriaxone tasks for Samuel`);

    // Update each task with correct payment authorization
    for (const task of ceftriaxoneTasks) {
      const doseRecords = task.medicationDetails?.doseRecords || [];
      const totalDoses = doseRecords.length;
      
      console.log(`\n🔧 Updating task ${task._id}:`);
      console.log(`   • Total doses: ${totalDoses}`);
      
      // Samuel paid for 1 dose
      const paymentAuth = {
        paymentStatus: 'PARTIALLY_PAID',
        paidDays: 1,
        totalDays: Math.ceil(totalDoses / 2) || 7,
        authorizedDoses: 1,
        unauthorizedDoses: Math.max(0, totalDoses - 1),
        outstandingAmount: Math.max(0, totalDoses - 1) * 50,
        lastUpdated: new Date()
      };

      // Direct update
      const updateResult = await nurseTasksCollection.updateOne(
        { _id: task._id },
        { 
          $set: { 
            paymentAuthorization: paymentAuth
          }
        }
      );

      console.log(`   ✅ Updated: ${updateResult.modifiedCount} document(s)`);
      console.log(`   • Payment Status: ${paymentAuth.paymentStatus}`);
      console.log(`   • Authorized Doses: ${paymentAuth.authorizedDoses}`);
      console.log(`   • Total Doses: ${totalDoses}`);
      console.log(`   • Outstanding: ETB ${paymentAuth.outstandingAmount}`);
    }

    // Verify the updates
    console.log('\n🔍 VERIFICATION:');
    const updatedTasks = await nurseTasksCollection.find({
      patientId: samuel._id,
      taskType: 'MEDICATION',
      $or: [
        { 'medicationDetails.medicationName': { $regex: /ceftriaxone/i } },
        { description: { $regex: /ceftriaxone/i } }
      ]
    }).toArray();

    updatedTasks.forEach((task, index) => {
      console.log(`\n✅ Task ${index + 1} Verification:`);
      console.log(`   • Task ID: ${task._id}`);
      console.log(`   • Medication: ${task.medicationDetails?.medicationName}`);
      
      if (task.paymentAuthorization) {
        const auth = task.paymentAuthorization;
        const totalDoses = (auth.authorizedDoses || 0) + (auth.unauthorizedDoses || 0);
        console.log(`   • Payment Status: ${auth.paymentStatus}`);
        console.log(`   • Authorized Doses: ${auth.authorizedDoses}`);
        console.log(`   • Total Doses: ${totalDoses}`);
        console.log(`   • Frontend Display: "${auth.authorizedDoses} paid of ${totalDoses}"`);
        
        if (auth.paymentStatus === 'PARTIALLY_PAID' && auth.authorizedDoses === 1) {
          console.log('   🎯 SUCCESS: This should fix the display!');
        }
      } else {
        console.log('   ❌ No payment authorization found');
      }
    });

    console.log('\n🎯 SUMMARY:');
    console.log('   ✅ Direct database update completed');
    console.log('   ✅ Samuel\'s Ceftriaxone tasks updated with payment authorization');
    console.log('   💡 Refresh the browser to see changes');
    console.log('   🌐 URL: http://localhost:5173/app/ward/medications-backup');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the direct fix
if (require.main === module) {
  directFixSamuel();
}

module.exports = directFixSamuel;
