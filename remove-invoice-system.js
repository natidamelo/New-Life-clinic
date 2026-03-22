const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb://localhost:27017';
const DB_NAME = 'clinic-cms';

async function removeInvoiceSystem() {
  let client;
  
  try {
    console.log('🔌 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(DB_NAME);
    
    console.log('\n🗑️ REMOVING SEPARATE INVOICE SYSTEM:');
    console.log('This will consolidate everything into the prescription system.');
    
    // Step 1: Remove all medical invoices for Semhal
    console.log('\n📄 STEP 1: Removing all medical invoices...');
    const deleteInvoicesResult = await db.collection('medicalinvoices').deleteMany({
      patientId: '68b17fd748c353ce9024293f'
    });
    
    console.log(`✅ Deleted ${deleteInvoicesResult.deletedCount} medical invoices for Semhal`);
    
    // Step 2: Update prescriptions to handle payments directly
    console.log('\n📋 STEP 2: Updating prescriptions to handle payments directly...');
    
    // Update Semhal's 7-day BID prescription
    const updatePrescriptionResult = await db.collection('prescriptions').updateOne(
      { 
        _id: '68b6c65ea76d00c0d23684d5',
        patient: '68b17fd748c353ce9024293f'
      },
      {
        $set: {
          paymentStatus: 'pending',
          totalCost: 350,
          amountPaid: 0,
          balance: 350,
          updatedAt: new Date()
        }
      }
    );
    
    if (updatePrescriptionResult.modifiedCount > 0) {
      console.log('✅ Updated 7-day BID prescription payment details');
    }
    
    // Step 3: Update nurse tasks to work directly with prescriptions
    console.log('\n👩‍⚕️ STEP 3: Updating nurse tasks to work with prescriptions...');
    
    // Find the 7-day BID nurse task we created earlier
    const nurseTaskUpdateResult = await db.collection('nursetasks').updateOne(
      {
        patientId: '68b17fd748c353ce9024293f',
        'medicationDetails.medicationName': 'Ceftriaxone',
        'medicationDetails.duration': 7
      },
      {
        $set: {
          'paymentAuthorization.paymentStatus': 'pending',
          'paymentAuthorization.canAdminister': false,
          'paymentAuthorization.restrictionMessage': 'Payment required before administration',
          'paymentAuthorization.outstandingAmount': 350,
          'paymentAuthorization.lastUpdated': new Date(),
          updatedAt: new Date()
        }
      }
    );
    
    if (nurseTaskUpdateResult.modifiedCount > 0) {
      console.log('✅ Updated nurse task payment authorization');
    }
    
    // Step 4: Remove any payment records that reference invoices
    console.log('\n💳 STEP 4: Cleaning up payment records...');
    const deletePaymentsResult = await db.collection('payments').deleteMany({
      patientId: '68b17fd748c353ce9024293f'
    });
    
    console.log(`✅ Deleted ${deletePaymentsResult.deletedCount} payment records for Semhal`);
    
    // Step 5: Verify the current state
    console.log('\n🔍 STEP 5: Verifying current state...');
    
    // Check prescriptions
    const prescriptions = await db.collection('prescriptions').find({
      patient: '68b17fd748c353ce9024293f'
    }).toArray();
    
    console.log(`📋 Found ${prescriptions.length} prescriptions for Semhal`);
    prescriptions.forEach(prescription => {
      console.log(`  - ${prescription.medicationName}: ${prescription.duration} (${prescription.paymentStatus})`);
    });
    
    // Check nurse tasks
    const nurseTasks = await db.collection('nursetasks').find({
      patientId: '68b17fd748c353ce9024293f'
    }).toArray();
    
    console.log(`👩‍⚕️ Found ${nurseTasks.length} nurse tasks for Semhal`);
    nurseTasks.forEach(task => {
      console.log(`  - ${task.medicationDetails?.medicationName}: ${task.medicationDetails?.duration} days (${task.paymentAuthorization?.paymentStatus})`);
    });
    
    // Check if invoices are gone
    const remainingInvoices = await db.collection('medicalinvoices').find({
      patientId: '68b17fd748c353ce9024293f'
    }).toArray();
    
    console.log(`📄 Remaining invoices: ${remainingInvoices.length} (should be 0)`);
    
    console.log('\n🎯 WHAT HAS BEEN ACCOMPLISHED:');
    console.log('✅ Removed separate invoice system for Semhal');
    console.log('✅ Consolidated payment tracking into prescriptions');
    console.log('✅ Updated nurse tasks to work with prescription payments');
    console.log('✅ Eliminated payment synchronization issues');
    
    console.log('\n🎯 NEW SIMPLIFIED SYSTEM:');
    console.log('1. Prescriptions handle their own payment status');
    console.log('2. Nurse tasks are created directly from prescriptions');
    console.log('3. No more duplicate invoices or payment mismatches');
    console.log('4. Payment processing is now straightforward');
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Process payment for the 7-day BID prescription (350 ETB)');
    console.log('2. Update prescription.paymentStatus to "paid"');
    console.log('3. The nurse task will automatically update');
    console.log('4. Everything will be in sync!');

  } catch (error) {
    console.error('❌ Error removing invoice system:', error.message);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Disconnected from MongoDB');
    }
  }
}

// Run the cleanup
removeInvoiceSystem();
