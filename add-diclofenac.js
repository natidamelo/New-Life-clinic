const mongoose = require('mongoose');

// MongoDB connection
const MONGO_URI = 'mongodb://localhost:27017/clinic-cms';

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB (clinic)');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// InventoryItem Schema
const inventoryItemSchema = new mongoose.Schema({}, { strict: false, collection: 'inventoryitems' });
const InventoryItem = mongoose.model('InventoryItem', inventoryItemSchema);

async function addDiclofenac() {
  try {
    await connectDB();

    // Check if Diclofenac already exists
    const existingMedication = await InventoryItem.findOne({ name: /Diclofenac/i }).lean();
    if (existingMedication) {
      console.log('Diclofenac already exists in the database.');
      console.log('Current price:', existingMedication.sellingPrice, 'ETB');
      return;
    }

    // Add Diclofenac to the inventory
    // Based on user requirement: 3 BID doses = 6,000 ETB
    // So cost per dose = 6,000 ÷ (3 days × 2 doses/day) = 1,000 ETB per dose
    const newMedication = new InventoryItem({
      name: 'Diclofenac',
      category: 'Medication',
      quantity: 100, // Placeholder quantity
      unit: 'Vial',
      sellingPrice: 1000, // 1000 ETB per dose as required
      purchasePrice: 800, // Placeholder purchase price
      supplier: 'Default Supplier',
      lastUpdated: new Date()
    });

    await newMedication.save();
    console.log('✅ Successfully added Diclofenac to the inventory.');
    console.log('💰 Price set to: 1000 ETB per dose');
    console.log('📊 For 3 BID doses (3 days × 2 doses/day): 1000 × 6 = 6000 ETB');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

addDiclofenac(); 