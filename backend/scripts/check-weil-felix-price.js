/**
 * Script to check the actual stored price for Weil-Felix Test
 * This will help diagnose the 99.99 vs 100 discrepancy
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
const LabOrder = require('../models/LabOrder');

async function checkWeilFelixPrice() {
  try {
    // Connect to database
    console.log('🔌 Connecting to MongoDB...');
    console.log('   URI:', MONGO_URI ? MONGO_URI.substring(0, 20) + '...' : 'NOT SET');
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB\n');

    // Find Weil-Felix Test inventory item
    const weilFelixItem = await InventoryItem.findOne({
      name: { $regex: /weil-felix/i },
      category: 'laboratory',
      isActive: true
    });

    if (!weilFelixItem) {
      console.log('❌ Weil-Felix Test inventory item not found');
      await mongoose.connection.close();
      return;
    }

    console.log('📋 Inventory Item Details:');
    console.log(`   Name: ${weilFelixItem.name}`);
    console.log(`   ID: ${weilFelixItem._id}`);
    console.log(`   Raw sellingPrice (typeof): ${typeof weilFelixItem.sellingPrice}`);
    console.log(`   Raw sellingPrice (value): ${weilFelixItem.sellingPrice}`);
    console.log(`   Raw sellingPrice (JSON): ${JSON.stringify(weilFelixItem.sellingPrice)}`);
    console.log(`   Raw sellingPrice (toFixed(10)): ${weilFelixItem.sellingPrice.toFixed(10)}`);
    
    // Test rounding
    const rounded = Math.round(weilFelixItem.sellingPrice * 100) / 100;
    console.log(`   Rounded (Math.round * 100 / 100): ${rounded}`);
    console.log(`   Rounded (toFixed(2)): ${rounded.toFixed(2)}`);
    
    // Check if it's exactly 100
    if (weilFelixItem.sellingPrice === 100) {
      console.log('   ✅ Price is exactly 100');
    } else if (Math.abs(weilFelixItem.sellingPrice - 100) < 0.01) {
      console.log(`   ⚠️  Price is very close to 100 (difference: ${Math.abs(weilFelixItem.sellingPrice - 100)})`);
    } else {
      console.log(`   ❌ Price is not 100 (difference: ${Math.abs(weilFelixItem.sellingPrice - 100)})`);
    }

    // Check recent lab orders
    console.log('\n📋 Recent Lab Orders (last 10):');
    const recentOrders = await LabOrder.find({
      testName: { $regex: /weil-felix/i }
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .select('testName totalPrice createdAt paymentStatus');

    if (recentOrders.length === 0) {
      console.log('   No lab orders found');
    } else {
      recentOrders.forEach((order, index) => {
        console.log(`   ${index + 1}. ${order.testName}`);
        console.log(`      Price: ${order.totalPrice} (${typeof order.totalPrice})`);
        console.log(`      Payment Status: ${order.paymentStatus}`);
        console.log(`      Created: ${order.createdAt}`);
        console.log('');
      });
    }

    // Test the pricing service
    console.log('\n🔍 Testing LabPricingService:');
    const LabPricingService = require('../services/labPricingService');
    const priceResult = await LabPricingService.findInventoryPrice('Weil-Felix Test');
    
    if (priceResult) {
      console.log(`   Retrieved price: ${priceResult.price}`);
      console.log(`   Price type: ${typeof priceResult.price}`);
      console.log(`   Price toFixed(10): ${priceResult.price.toFixed(10)}`);
    } else {
      console.log('   ❌ Could not retrieve price from LabPricingService');
    }

    await mongoose.connection.close();
    console.log('\n✅ Script completed');
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
  checkWeilFelixPrice();
}

module.exports = checkWeilFelixPrice;

