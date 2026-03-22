const mongoose = require('mongoose');

// MongoDB connection
const MONGO_URI = 'mongodb://localhost:27017/clinic-cms';

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB (clinic_cms)');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// InventoryItem Schema
const inventoryItemSchema = new mongoose.Schema({}, { strict: false, collection: 'inventoryitems' });
const InventoryItem = mongoose.model('InventoryItem', inventoryItemSchema);

async function addCeftriaxone() {
  try {
    await connectDB();

    // Check if Ceftriaxone already exists
    const existingMedication = await InventoryItem.findOne({ name: /Ceftriaxone/i }).lean();
    if (existingMedication) {
      console.log('Ceftriaxone already exists in the database.');
      return;
    }

    // Add Ceftriaxone to the inventory
    const newMedication = new InventoryItem({
      name: 'Ceftriaxone',
      category: 'Medication',
      quantity: 100, // Placeholder quantity
      unit: 'Vial',
      sellingPrice: 100, // Placeholder price
      purchasePrice: 80, // Placeholder price
      supplier: 'Default Supplier',
      lastUpdated: new Date()
    });

    await newMedication.save();
    console.log('Successfully added Ceftriaxone to the inventory.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

addCeftriaxone();