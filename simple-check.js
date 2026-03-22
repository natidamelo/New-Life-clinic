const mongoose = require('mongoose');
const MedicalRecord = require('./backend/models/MedicalRecord');

async function checkRecords() {
  try {
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('Connected to MongoDB');
    
    // Check all medical records
    const allRecords = await MedicalRecord.find({}).select('_id patientId status patientName createdAt updatedAt').limit(10);
    console.log('Total medical records in database:', allRecords.length);
    console.log('Sample records:', allRecords);
    
    // Check for any finalized records
    const finalizedRecords = await MedicalRecord.find({ status: 'Finalized' }).select('_id patientId status patientName createdAt updatedAt');
    console.log('Total finalized records:', finalizedRecords.length);
    console.log('Finalized records:', finalizedRecords);
    
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
  }
}

checkRecords();
