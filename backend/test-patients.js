/**
 * Test script to directly query patients from the database
 * Run with: node test-patients.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Patient = require('./models/Patient');

// Connect to the database
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms')
  .then(async () => {
    console.log('Connected to MongoDB...');
    
    try {
      // Count patients
      const count = await Patient.countDocuments();
      console.log(`Total patients in database: ${count}`);
      
      if (count > 0) {
        // Get all patients with basic info
        const patients = await Patient.find()
          .select('firstName lastName patientId dateOfBirth gender contactNumber email')
          .limit(20);
        
        console.log('\nPatient list:');
        patients.forEach(patient => {
          console.log(`- ${patient.firstName} ${patient.lastName} (ID: ${patient.patientId}), Email: ${patient.email}`);
        });
        
        // Check patient schema
        console.log('\nPatient schema fields:');
        const patientKeys = Object.keys(Patient.schema.paths);
        console.log(patientKeys.join(', '));
        
        // Check if any patients are hidden
        const hiddenPatients = await Patient.countDocuments({ isActive: false });
        console.log(`\nHidden patients (isActive=false): ${hiddenPatients}`);
      }
    } catch (error) {
      console.error('Error querying patients:', error);
    } finally {
      mongoose.disconnect();
      console.log('\nDatabase connection closed.');
    }
  })
  .catch(err => {
    console.error('Could not connect to MongoDB:', err);
}); 
