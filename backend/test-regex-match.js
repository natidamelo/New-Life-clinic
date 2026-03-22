const mongoose = require('mongoose');
require('dotenv').config();

async function testRegex() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms');
  
  const InventoryItem = require('./models/InventoryItem');
  
  const medicationName = "Ringer Lactate (Hartmann Solution)";
  console.log(`Testing search for: "${medicationName}"`);
  
  // Test 1: Exact regex match
  console.log('\nTest 1: Exact regex');
  const regex1 = new RegExp(medicationName, 'i');
  console.log('Regex:', regex1);
  const result1 = await InventoryItem.findOne({
    name: { $regex: regex1 },
    isActive: true
  });
  console.log('Result:', result1 ? `Found: ${result1.name}` : 'Not found');
  
  // Test 2: Without category restriction
  console.log('\nTest 2: Without category restriction');
  const result2 = await InventoryItem.findOne({
    name: { $regex: regex1 },
    isActive: true
  });
  console.log('Result:', result2 ? `Found: ${result2.name}` : 'Not found');
  
  // Test 3: Exact match
  console.log('\nTest 3: Exact match');
  const result3 = await InventoryItem.findOne({
    name: medicationName,
    isActive: true
  });
  console.log('Result:', result3 ? `Found: ${result3.name}` : 'Not found');
  
  // Test 4: Case insensitive exact match
  console.log('\nTest 4: Case insensitive with regex option');
  const result4 = await InventoryItem.findOne({
    name: { $regex: medicationName, $options: 'i' },
    isActive: true
  });
  console.log('Result:', result4 ? `Found: ${result4.name}` : 'Not found');
  
  await mongoose.disconnect();
}

testRegex();
