const mongoose = require('mongoose');
const Prescription = require('../models/Prescription');

async function checkPrescriptions() {
  try {
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('Connected to MongoDB');
    
    // Find all prescriptions
    const prescriptions = await Prescription.find({});
    console.log(`\n=== ALL PRESCRIPTIONS (${prescriptions.length}) ===`);
    
    for (const prescription of prescriptions) {
      console.log(`\nPrescription ID: ${prescription._id}`);
      console.log(`Patient: ${prescription.patient}`);
      console.log(`Patient ID: ${prescription.patientId}`);
      console.log(`Medication: ${prescription.medicationName}`);
      console.log(`Created: ${prescription.createdAt}`);
    }
    
    // Find prescriptions for ato eliyas
    const atoEliyasPrescriptions = await Prescription.find({
      $or: [
        { patient: 'e1fe3d35' },
        { patientId: 'e1fe3d35' }
      ]
    });
    
    console.log(`\n=== ATO ELIYAS PRESCRIPTIONS (${atoEliyasPrescriptions.length}) ===`);
    for (const prescription of atoEliyasPrescriptions) {
      console.log(`\nPrescription ID: ${prescription._id}`);
      console.log(`Patient: ${prescription.patient}`);
      console.log(`Patient ID: ${prescription.patientId}`);
      console.log(`Medication: ${prescription.medicationName}`);
      console.log(`Created: ${prescription.createdAt}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkPrescriptions();
