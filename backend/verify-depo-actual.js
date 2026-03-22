const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const InventoryItem = require('./models/InventoryItem');

async function verify() {
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
    console.log('📊 ACTUAL DATABASE VALUES (RIGHT NOW)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`Medication: ${depoMed.quantity}`);
    console.log(`Service: ${depoService.quantity}`);
    console.log(`\nLast updated:`);
    console.log(`  Medication: ${depoMed.updatedAt}`);
    console.log(`  Service: ${depoService.updatedAt}`);
    
    if (depoMed.quantity === 49 && depoService.quantity === 49) {
      console.log('\n✅ DATABASE IS CORRECT! Both are 49.');
      console.log('⚠️  The issue is FRONTEND CACHING - refresh the pharmacy page!');
    } else {
      console.log(`\n⚠️  Mismatch! Expected both to be 49.`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

verify();



































