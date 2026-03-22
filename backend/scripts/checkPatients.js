const mongoose = require('mongoose');
const Patient = require('../models/Patient');

async function checkPatients() {
  try {
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('Connected to MongoDB');
    
    // Find all patients
    const patients = await Patient.find({});
    console.log(`\n=== ALL PATIENTS (${patients.length}) ===`);
    
    for (const patient of patients) {
      console.log(`\nPatient ID: ${patient._id}`);
      console.log(`Name: ${patient.firstName} ${patient.lastName}`);
      console.log(`Patient Number: ${patient.patientNumber}`);
      console.log(`Created: ${patient.createdAt}`);
    }
    
    // Find ato eliyas specifically
    const atoEliyas = await Patient.find({
      $or: [
        { firstName: { $regex: /ato/i } },
        { lastName: { $regex: /eliyas/i } },
        { firstName: { $regex: /eliyas/i } }
      ]
    });
    
    console.log(`\n=== ATO ELIYAS PATIENTS (${atoEliyas.length}) ===`);
    for (const patient of atoEliyas) {
      console.log(`\nPatient ID: ${patient._id}`);
      console.log(`Name: ${patient.firstName} ${patient.lastName}`);
      console.log(`Patient Number: ${patient.patientNumber}`);
      console.log(`Created: ${patient.createdAt}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkPatients();
