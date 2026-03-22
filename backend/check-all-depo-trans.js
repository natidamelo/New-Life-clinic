const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const InventoryItem = require('./models/InventoryItem');
const InventoryTransaction = require('./models/InventoryTransaction');

async function checkAll() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to MongoDB\n');

    const depoMed = await InventoryItem.findOne({
      name: /^depo$/i,
      category: 'medication',
      isActive: true
    });

    const depoService = await InventoryItem.findOne({
      name: /^depo$/i,
      category: 'service',
      isActive: true
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 CURRENT DATABASE VALUES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`Medication: ${depoMed.quantity}`);
    console.log(`Service: ${depoService.quantity}`);
    console.log(`\nDifference: ${Math.abs(depoMed.quantity - depoService.quantity)}`);
    
    if (depoMed.quantity !== depoService.quantity) {
      console.log('⚠️  OUT OF SYNC!\n');
    } else {
      console.log('✅ IN SYNC!\n');
    }

    // Get last 10 transactions for Medication
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 LAST 10 MEDICATION TRANSACTIONS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const medTrans = await InventoryTransaction.find({
      item: depoMed._id
    }).sort({ createdAt: -1 }).limit(10);

    for (let i = 0; i < medTrans.length; i++) {
      const trans = medTrans[i];
      const date = new Date(trans.createdAt).toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' });
      console.log(`${i + 1}. ${date}`);
      console.log(`   ${trans.previousQuantity} → ${trans.newQuantity} (${trans.quantity})`);
      console.log(`   ${trans.reason}`);
      console.log(`   Ref: ${trans.documentReference}`);
      console.log('');
    }

    // Get last 10 transactions for Service
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 LAST 10 SERVICE TRANSACTIONS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const serviceTrans = await InventoryTransaction.find({
      item: depoService._id
    }).sort({ createdAt: -1 }).limit(10);

    for (let i = 0; i < serviceTrans.length; i++) {
      const trans = serviceTrans[i];
      const date = new Date(trans.createdAt).toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' });
      console.log(`${i + 1}. ${date}`);
      console.log(`   ${trans.previousQuantity} → ${trans.newQuantity} (${trans.quantity})`);
      console.log(`   ${trans.reason}`);
      console.log(`   Ref: ${trans.documentReference}`);
      console.log('');
    }

    // Count total transactions
    const medCount = await InventoryTransaction.countDocuments({ item: depoMed._id });
    const serviceCount = await InventoryTransaction.countDocuments({ item: depoService._id });
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total Medication transactions: ${medCount}`);
    console.log(`Total Service transactions: ${serviceCount}`);
    console.log(`Difference: ${Math.abs(medCount - serviceCount)}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

checkAll();



































