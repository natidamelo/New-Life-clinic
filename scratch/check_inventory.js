const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://kinfenati7_db_user:Natkinfe2325@cluster0.smcnulu.mongodb.net/clinic-cms?retryWrites=true&w=majority&appName=Cluster0';

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB Atlas');

    const schema = new mongoose.Schema({}, { strict: false, collection: 'inventoryitems' });
    const InventoryItem = mongoose.model('InventoryItem', schema);

    const items = await InventoryItem.find({ category: 'medication', isActive: true }).lean();
    console.log(`Found ${items.length} active inventory medications:`);
    items.forEach(item => {
      console.log(`- ${item.name}: Form: ${item.form}, Route: ${item.administrationRoute || item.route || 'Not specified'}, Dosage: ${item.dosage || 'Not specified'}, Qty: ${item.quantity}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

run();
