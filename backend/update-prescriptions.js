const Prescription = require('./models/Prescription');
const InventoryItem = require('./models/InventoryItem');
const mongoose = require('mongoose');

async function updatePrescriptions() {
  try {
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('Connected to MongoDB');
    
    // Find the Ceftriaxone inventory item
    const ceftriaxone = await InventoryItem.findOne({ name: { $regex: /ceftriaxone/i } });
    if (!ceftriaxone) {
      console.log('Ceftriaxone not found in inventory');
      process.exit(1);
    }
    
    console.log('Found Ceftriaxone inventory item:', ceftriaxone._id);
    
    // Find all Ceftriaxone prescriptions
    const prescriptions = await Prescription.find({
      medicationName: { $regex: /ceftriaxone/i }
    });
    
    console.log(`Found ${prescriptions.length} Ceftriaxone prescriptions`);
    
    // Update each prescription to link to the inventory item
    for (const prescription of prescriptions) {
      prescription.medicationItem = ceftriaxone._id;
      await prescription.save();
      console.log(`Updated prescription ${prescription._id} to link to inventory item`);
    }
    
    console.log('All prescriptions updated successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updatePrescriptions(); 
