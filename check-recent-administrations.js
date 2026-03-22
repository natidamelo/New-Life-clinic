const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms');
  console.log('✅ Connected to database');
};

const NurseTask = require('./backend/models/NurseTask');
const InventoryTransaction = require('./backend/models/InventoryTransaction');
const InventoryItem = require('./backend/models/InventoryItem');

const checkAdministrations = async () => {
  try {
    console.log('\n📋 RECENT NORMAL SALINE ADMINISTRATIONS\n');
    console.log('═'.repeat(70));
    
    const tasks = await NurseTask.find({ 
      'medicationDetails.medicationName': /normal saline/i 
    }).sort({ updatedAt: -1 }).limit(5);
    
    if (tasks.length === 0) {
      console.log('No Normal Saline tasks found');
    } else {
      tasks.forEach((t, i) => {
        console.log(`\n${i+1}. Patient: ${t.patientName}`);
        console.log(`   Task ID: ${t._id}`);
        console.log(`   Updated: ${t.updatedAt}`);
        
        if (t.medicationDetails?.doseRecords) {
          t.medicationDetails.doseRecords.forEach(d => {
            if (d.administered) {
              console.log(`   ✅ Day ${d.day} ${d.timeSlot}: Administered at ${d.administeredAt} by ${d.administeredBy}`);
            }
          });
        }
      });
    }
    
    console.log('\n\n💰 RECENT INVENTORY TRANSACTIONS\n');
    console.log('═'.repeat(70));
    
    const trans = await InventoryTransaction.find({ 
      reason: /normal saline/i 
    }).sort({ createdAt: -1 }).limit(5);
    
    console.log(`Found ${trans.length} transactions\n`);
    
    if (trans.length > 0) {
      trans.forEach((t, i) => {
        console.log(`${i+1}. Date: ${t.createdAt}`);
        console.log(`   Reason: ${t.reason}`);
        console.log(`   Quantity: ${t.previousQuantity} → ${t.newQuantity}`);
        console.log(`   Type: ${t.transactionType}`);
        console.log('');
      });
    } else {
      console.log('❌ No inventory transactions found for Normal Saline');
      console.log('   This means inventory deduction has NOT happened yet.');
    }
    
    console.log('\n📦 CURRENT INVENTORY STATUS\n');
    console.log('═'.repeat(70));
    
    const item = await InventoryItem.findOne({ name: /normal saline/i });
    
    if (item) {
      console.log(`Name: ${item.name}`);
      console.log(`Current Quantity: ${item.quantity} ${item.unit || 'units'}`);
      console.log(`Category: ${item.category}`);
      console.log(`Last Updated: ${item.updatedAt}`);
    } else {
      console.log('❌ Normal Saline not found in inventory');
    }
    
    console.log('\n═'.repeat(70));
    console.log('✅ Check complete\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

connectDB().then(() => checkAdministrations());

