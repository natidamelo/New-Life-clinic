const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const InventoryItem = require('./models/InventoryItem');
const InventoryTransaction = require('./models/InventoryTransaction');

async function checkSync() {
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
    console.log('📊 CURRENT DEPO INVENTORY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`Medication: ${depoMed.quantity}`);
    console.log(`Service: ${depoService.quantity}`);
    console.log(`Difference: ${Math.abs(depoMed.quantity - depoService.quantity)}`);
    
    if (depoMed.quantity !== depoService.quantity) {
      console.log('\n⚠️  OUT OF SYNC!\n');
    } else {
      console.log('\n✅ IN SYNC!\n');
    }

    // Check last 3 transactions for each category
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 LAST 3 MEDICATION TRANSACTIONS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const lastMedTrans = await InventoryTransaction.find({
      item: depoMed._id
    }).sort({ createdAt: -1 }).limit(3);

    for (const trans of lastMedTrans) {
      console.log(`${trans.createdAt.toISOString()}`);
      console.log(`  ${trans.previousQuantity} → ${trans.newQuantity} (${trans.quantity})`);
      console.log(`  Reason: ${trans.reason}`);
      console.log(`  Ref: ${trans.documentReference}`);
      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 LAST 3 SERVICE TRANSACTIONS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const lastServiceTrans = await InventoryTransaction.find({
      item: depoService._id
    }).sort({ createdAt: -1 }).limit(3);

    for (const trans of lastServiceTrans) {
      console.log(`${trans.createdAt.toISOString()}`);
      console.log(`  ${trans.previousQuantity} → ${trans.newQuantity} (${trans.quantity})`);
      console.log(`  Reason: ${trans.reason}`);
      console.log(`  Ref: ${trans.documentReference}`);
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

checkSync();







