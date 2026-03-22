const mongoose = require('mongoose');
const Patient = require('./backend/models/Patient');

async function updatePatientStatus() {
  try {
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('Connected to database');
    
    // Find the patient "melody Natan"
    const patient = await Patient.findOne({
      $or: [
        { firstName: 'melody', lastName: 'Natan' },
        { firstName: 'Melody', lastName: 'Natan' },
        { firstName: 'melody', lastName: 'natan' },
        { firstName: 'Melody', lastName: 'natan' }
      ]
    });
    
    if (!patient) {
      console.log('Patient "melody Natan" not found');
      return;
    }
    
    console.log('Found patient:', {
      id: patient._id,
      name: `${patient.firstName} ${patient.lastName}`,
      currentStatus: patient.status,
      patientId: patient.patientId
    });
    
    // Update patient status to 'waiting'
    const updatedPatient = await Patient.findByIdAndUpdate(
      patient._id,
      { 
        $set: { 
          status: 'waiting',
          updatedAt: new Date()
        } 
      },
      { new: true }
    );
    
    console.log('✅ Patient status updated to:', updatedPatient.status);
    console.log('Patient should now appear in the queue (but will be filtered out due to unpaid invoices)');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

updatePatientStatus(); 