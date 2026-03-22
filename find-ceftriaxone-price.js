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

async function findCeftriaxonePrice() {
  try {
    await connectDB();

    // Find the medication "Ceftriaxone" (case-insensitive)
    const medication = await InventoryItem.findOne({ name: /Ceftriaxone/i }).lean();

    if (medication) {
      console.log(`Found medication: ${medication.name}`);
      console.log(`Selling Price: ${medication.sellingPrice}`);
    } else {
      console.log('Medication "Ceftriaxone" not found.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

findCeftriaxonePrice();