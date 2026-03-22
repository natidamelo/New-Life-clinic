const mongoose = require('mongoose');
const Patient = require('./models/Patient');

async function fixPatientIds() {
  try {
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('Connected to MongoDB');
    
    // Find all patients
    const patients = await Patient.find({});
    
    console.log(`Total patients: ${patients.length}`);
    
    for (const patient of patients) {
      console.log(`\nProcessing patient: ${patient.firstName} ${patient.lastName}`);
      console.log(`Current patientId: ${patient.patientId}`);
      
      // Check if patientId is missing or not in the correct format
      if (!patient.patientId || !patient.patientId.match(/^P\d{5}-\d{4}$/)) {
        const sequence = patient._id.toString().slice(-5).padStart(5, '0');
        const timestamp = Date.now().toString().slice(-4);
        const newPatientId = `P${sequence}-${timestamp}`;
        
        console.log(`Generating new patientId: ${newPatientId}`);
        
        patient.patientId = newPatientId;
        await patient.save();
        
        console.log(`✅ Updated patient ID to: ${newPatientId}`);
      } else {
        console.log(`✓ Patient ID already correct: ${patient.patientId}`);
      }
    }
    
    console.log('\n✅ Patient ID verification and fix complete');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

fixPatientIds(); 