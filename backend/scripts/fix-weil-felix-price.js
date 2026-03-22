/**
 * Script to check and fix the Weil-Felix Test price discrepancy
 * 
 * This script:
 * 1. Finds the Weil-Felix Test inventory item
 * 2. Checks its sellingPrice
 * 3. If it's 99.99 but should be 100, updates it to 100
 * 4. Also checks for any floating point precision issues
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Try to load config, fallback to environment variable
let MONGO_URI;
try {
  const config = require('../config');
  MONGO_URI = config.MONGODB_URI || config.MONGO_URI || process.env.MONGODB_URI || process.env.MONGO_URI;
} catch (error) {
  MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
}

if (!MONGO_URI) {
  console.error('❌ Error: MongoDB URI not found in config or environment variables');
  console.error('   Please ensure MONGODB_URI or MONGO_URI is set in your .env file or config.js');
  process.exit(1);
}

const InventoryItem = require('../models/InventoryItem');

async function fixWeilFelixPrice() {
  try {
    // Connect to database
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Find Weil-Felix Test inventory item
    const weilFelixItem = await InventoryItem.findOne({
      name: { $regex: /weil-felix/i },
      category: 'laboratory',
      isActive: true
    });

    if (!weilFelixItem) {
      console.log('❌ Weil-Felix Test inventory item not found');
      console.log('   Searching for similar items...');
      
      // Try to find similar items
      const similarItems = await InventoryItem.find({
        name: { $regex: /weil|felix/i },
        category: 'laboratory'
      }).select('name sellingPrice');
      
      if (similarItems.length > 0) {
        console.log('   Found similar items:');
        similarItems.forEach(item => {
          console.log(`   - ${item.name}: ${item.sellingPrice} ETB`);
        });
      }
      
      await mongoose.connection.close();
      return;
    }

    console.log(`\n📋 Found inventory item: ${weilFelixItem.name}`);
    console.log(`   Current sellingPrice: ${weilFelixItem.sellingPrice} ETB`);
    console.log(`   Item ID: ${weilFelixItem._id}`);
    console.log(`   Category: ${weilFelixItem.category}`);

    // Check if price is close to 100 but not exactly 100
    const currentPrice = weilFelixItem.sellingPrice;
    const roundedPrice = Math.round(currentPrice * 100) / 100;
    
    if (currentPrice !== 100 && roundedPrice === 100) {
      console.log(`\n⚠️  Price is ${currentPrice} but rounds to ${roundedPrice}`);
      console.log('   This is likely a floating point precision issue.');
    }

    // If price is 99.99 or very close to 100, update it to 100
    if (currentPrice >= 99.99 && currentPrice < 100.01) {
      console.log(`\n🔧 Updating price from ${currentPrice} to 100.00 ETB...`);
      weilFelixItem.sellingPrice = 100;
      await weilFelixItem.save();
      console.log('✅ Price updated successfully!');
    } else if (currentPrice === 100) {
      console.log('\n✅ Price is already 100 ETB - no update needed');
    } else {
      console.log(`\n⚠️  Price is ${currentPrice} ETB - not updating (not close to 100)`);
      console.log('   If you want to change it to 100, please do so manually in the inventory management system.');
    }

    // Also check for any lab orders with this test that might have incorrect prices
    const LabOrder = require('../models/LabOrder');
    const labOrders = await LabOrder.find({
      testName: { $regex: /weil-felix/i },
      totalPrice: { $lt: 100 }
    }).select('testName totalPrice createdAt').limit(10);

    if (labOrders.length > 0) {
      console.log(`\n⚠️  Found ${labOrders.length} lab orders with prices less than 100 ETB:`);
      labOrders.forEach(order => {
        console.log(`   - ${order.testName}: ${order.totalPrice} ETB (created: ${order.createdAt})`);
      });
      console.log('   Note: Existing lab orders will not be automatically updated.');
      console.log('   New lab orders will use the corrected price from inventory.');
    }

    await mongoose.connection.close();
    console.log('\n✅ Script completed successfully');
  } catch (error) {
    console.error('❌ Error:', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  fixWeilFelixPrice();
}

module.exports = fixWeilFelixPrice;

