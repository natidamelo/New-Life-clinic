/**
 * Debug Normal Saline Inventory Deduction Issue
 * 
 * This script will help diagnose why Normal Saline medication inventory
 * is not being deducted when the task is administered.
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

async function debugNormalSalineInventory() {
  try {
    console.log('🔍 [DEBUG] Starting Normal Saline inventory deduction diagnosis...\n');
    
    // Import models
    const NurseTask = require('./models/NurseTask');
    const InventoryItem = require('./models/InventoryItem');
    const InventoryTransaction = require('./models/InventoryTransaction');
    const Patient = require('./models/Patient');
    
    // 1. Check the specific task
    console.log('📋 Step 1: Checking Normal Saline task...');
    const taskId = '68e388c80919058eaa403683';
    const task = await NurseTask.findById(taskId);
    
    if (!task) {
      console.log('❌ Task not found with ID:', taskId);
      return;
    }
    
    console.log('✅ Task found:');
    console.log(`   - Patient: ${task.patientName} (${task.patientId})`);
    console.log(`   - Medication: ${task.medicationDetails?.medicationName || task.description}`);
    console.log(`   - Status: ${task.status}`);
    console.log(`   - Task Type: ${task.taskType}`);
    console.log(`   - Payment Status: ${task.paymentStatus}`);
    console.log(`   - Due Date: ${task.dueDate}`);
    
    // 2. Check patient information
    console.log('\n👤 Step 2: Checking patient information...');
    const patient = await Patient.findById(task.patientId);
    if (patient) {
      console.log(`✅ Patient found: ${patient.firstName} ${patient.lastName}`);
    } else {
      console.log('❌ Patient not found');
    }
    
    // 3. Check inventory items for Normal Saline
    console.log('\n📦 Step 3: Checking inventory items...');
    const medicationName = task.medicationDetails?.medicationName || 'Normal Saline';
    console.log(`Searching for medication: "${medicationName}"`);
    
    // Try different search patterns
    const searchPatterns = [
      { name: { $regex: /normal saline/i } },
      { name: { $regex: /0\.9% nacl/i } },
      { name: { $regex: /sodium chloride/i } },
      { name: { $regex: /saline/i } }
    ];
    
    let inventoryItem = null;
    for (const pattern of searchPatterns) {
      inventoryItem = await InventoryItem.findOne(pattern);
      if (inventoryItem) {
        console.log(`✅ Found inventory item: ${inventoryItem.name}`);
        console.log(`   - Category: ${inventoryItem.category}`);
        console.log(`   - Current Quantity: ${inventoryItem.quantity}`);
        console.log(`   - Cost Price: ${inventoryItem.costPrice}`);
        console.log(`   - Selling Price: ${inventoryItem.sellingPrice}`);
        console.log(`   - Is Active: ${inventoryItem.isActive}`);
        break;
      }
    }
    
    if (!inventoryItem) {
      console.log('❌ No inventory item found for Normal Saline');
      console.log('💡 This is likely the root cause - medication not found in inventory');
      
      // List all medication items to help identify the correct name
      console.log('\n📋 Available medication items:');
      const allMedications = await InventoryItem.find({ 
        category: { $in: ['medication', 'service'] },
        isActive: true 
      }).select('name category quantity');
      
      allMedications.forEach(item => {
        console.log(`   - ${item.name} (${item.category}) - Qty: ${item.quantity}`);
      });
      
      return;
    }
    
    // 4. Check if task has been administered
    console.log('\n💉 Step 4: Checking dose administration...');
    if (task.medicationDetails?.doseRecords) {
      const administeredDoses = task.medicationDetails.doseRecords.filter(dose => dose.administered);
      console.log(`✅ Found ${administeredDoses.length} administered doses out of ${task.medicationDetails.doseRecords.length} total doses`);
      
      if (administeredDoses.length > 0) {
        console.log('📋 Administered doses:');
        administeredDoses.forEach((dose, index) => {
          console.log(`   ${index + 1}. Day ${dose.day}, ${dose.timeSlot} - Administered by: ${dose.administeredBy}`);
        });
      } else {
        console.log('⚠️ No doses have been administered yet');
        console.log('💡 This explains why inventory hasn\'t been deducted');
        return;
      }
    } else {
      console.log('❌ No dose records found in task');
      return;
    }
    
    // 5. Check for existing inventory transactions
    console.log('\n📊 Step 5: Checking inventory transactions...');
    const transactions = await InventoryTransaction.find({
      $or: [
        { item: inventoryItem._id },
        { reason: { $regex: new RegExp(medicationName, 'i') } },
        { documentReference: taskId }
      ]
    }).sort({ createdAt: -1 });
    
    console.log(`Found ${transactions.length} related transactions:`);
    transactions.forEach((txn, index) => {
      console.log(`   ${index + 1}. ${txn.reason} - Qty: ${txn.quantity} - Status: ${txn.status} - Date: ${txn.createdAt}`);
    });
    
    if (transactions.length === 0) {
      console.log('❌ No inventory transactions found for this medication');
      console.log('💡 This confirms inventory deduction is not working');
    }
    
    // 6. Check payment authorization
    console.log('\n💰 Step 6: Checking payment authorization...');
    if (task.paymentAuthorization) {
      console.log('Payment Authorization Details:');
      console.log(`   - Payment Status: ${task.paymentAuthorization.paymentStatus}`);
      console.log(`   - Can Administer: ${task.paymentAuthorization.canAdminister}`);
      console.log(`   - Paid Days: ${task.paymentAuthorization.paidDays}/${task.paymentAuthorization.totalDays}`);
      console.log(`   - Authorized Doses: ${task.paymentAuthorization.authorizedDoses}`);
      
      if (task.paymentAuthorization.paymentStatus === 'unpaid' && !task.paymentAuthorization.canAdminister) {
        console.log('⚠️ Payment authorization issue - medication cannot be administered until payment is made');
      }
    } else {
      console.log('⚠️ No payment authorization found');
    }
    
    // 7. Recommendations
    console.log('\n🔧 Step 7: Recommendations...');
    
    if (!inventoryItem) {
      console.log('❌ CRITICAL: Add Normal Saline to inventory');
      console.log('   1. Go to Stock Management');
      console.log('   2. Add new inventory item:');
      console.log('      - Name: "Normal Saline (0.9% NaCl)"');
      console.log('      - Category: "medication"');
      console.log('      - Quantity: 100 (or current stock)');
      console.log('      - Cost Price: 50');
      console.log('      - Selling Price: 200');
    }
    
    if (task.paymentStatus === 'unpaid') {
      console.log('❌ CRITICAL: Process payment for medication');
      console.log('   1. Go to Billing/Invoicing');
      console.log('   2. Find the prescription invoice');
      console.log('   3. Process payment');
      console.log('   4. Update payment authorization');
    }
    
    if (task.medicationDetails?.doseRecords) {
      const administeredDoses = task.medicationDetails.doseRecords.filter(dose => dose.administered);
      if (administeredDoses.length === 0) {
        console.log('❌ CRITICAL: Administer the medication');
        console.log('   1. Go to Nurse Dashboard');
        console.log('   2. Find the Normal Saline task');
        console.log('   3. Mark dose as administered');
      }
    }
    
    console.log('\n✅ Diagnosis complete!');
    
  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the diagnosis
if (require.main === module) {
  connectDB().then(() => {
    debugNormalSalineInventory();
  });
}

module.exports = { debugNormalSalineInventory };
