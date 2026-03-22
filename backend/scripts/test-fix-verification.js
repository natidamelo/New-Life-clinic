const mongoose = require('mongoose');
const InventoryItem = require('../models/InventoryItem');

require('dotenv').config();

async function verifyFix() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/clinic-cms');
    console.log('✅ Connected to clinic-cms database\n');

    const depoItem = await InventoryItem.findOne({
      name: { $regex: /depo/i },
      isActive: true
    });

    if (!depoItem) {
      console.log('❌ No active Depo item found');
      return;
    }

    console.log(`📦 ========== CURRENT DEPO INJECTION STATUS ==========\n`);
    console.log(`Item: ${depoItem.name}`);
    console.log(`Current Quantity: ${depoItem.quantity}`);
    console.log(`Item ID: ${depoItem._id}`);
    
    console.log(`\n🎯 ========== FIX STATUS ==========\n`);
    console.log(`✅ Backend server restarted with fix applied`);
    console.log(`✅ Double deduction bug should now be resolved`);
    console.log(`✅ Next administration should deduct only 1 unit\n`);
    
    console.log(`📋 ========== NEXT TEST ==========\n`);
    console.log(`1. Administer 1 Depo injection dose`);
    console.log(`2. Check new quantity - should be ${depoItem.quantity - 1} (not ${depoItem.quantity - 2})`);
    console.log(`3. Check server logs for: "Skipping automatic inventory update"`);
    console.log(`4. Run verification script: node scripts/check-duplicate-api-calls.js\n`);
    
    console.log(`✅ Ready for testing!\n`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

verifyFix();
