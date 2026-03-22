const InventoryItem = require('./models/InventoryItem');
const mongoose = require('mongoose');

async function addCeftriaxone() {
  try {
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('Connected to MongoDB');
    
    // Check if Ceftriaxone already exists
    const existing = await InventoryItem.findOne({ name: { $regex: /ceftriaxone/i } });
    if (existing) {
      console.log('Ceftriaxone already exists:', existing);
      process.exit(0);
    }
    
    // Add Ceftriaxone to inventory
    const ceftriaxone = new InventoryItem({
      itemCode: 'CEFT-001',
      name: 'Ceftriaxone',
      category: 'medication',
      unit: 'vial',
      sellingPrice: 250,
      costPrice: 200,
      quantity: 100,
      minimumStockLevel: 10,
      reorderPoint: 20,
      description: 'Ceftriaxone 1g injection',
      manufacturer: 'Generic',
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      batchNumber: 'CEFT-2025-001',
      location: 'Pharmacy',
      dosage: '1g',
      administrationRoute: 'Intravenous',
      prescriptionRequired: true,
      isActive: true
    });
    
    await ceftriaxone.save();
    console.log('Ceftriaxone added to inventory:', {
      _id: ceftriaxone._id,
      name: ceftriaxone.name,
      sellingPrice: ceftriaxone.sellingPrice
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addCeftriaxone(); 
