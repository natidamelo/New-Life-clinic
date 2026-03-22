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

async function findAllMedications() {
  try {
    await connectDB();

    // Find all medications and log their names
    const medications = await InventoryItem.find({}, 'name').lean();

    if (medications.length > 0) {
      console.log('Found medications:');
      medications.forEach(med => console.log(`- ${med.name}`));
    } else {
      console.log('No medications found in the inventoryitems collection.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

findAllMedications();