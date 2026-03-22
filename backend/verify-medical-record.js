const mongoose = require('mongoose');
const MedicalRecord = require('./models/MedicalRecord');
const Patient = require('./models/Patient'); // Add Patient model

// MongoDB connection string
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/clinic-cms';

// Verify the medical record in the database
async function verifyMedicalRecord() {
  try {
    console.log('Connecting to MongoDB (clinic-cms database)...');
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('MongoDB Connected Successfully!');
    
    // Check the specific medical record that was just created
    const recordId = '6874c5e909f36a8b27081b24';
    console.log(`\n🔍 Looking for medical record with ID: ${recordId}`);
    
    const record = await MedicalRecord.findById(recordId).populate('patient', 'firstName lastName patientId');
    
    if (record) {
      console.log('✅ MEDICAL RECORD FOUND IN DATABASE!');
      console.log('\n📋 Record Details:');
      console.log(`- ID: ${record._id}`);
      console.log(`- Patient: ${record.patient?.firstName} ${record.patient?.lastName} (${record.patient?.patientId})`);
      console.log(`- Status: ${record.status}`);
      console.log(`- Chief Complaint: ${record.chiefComplaint?.description}`);
      console.log(`- Diagnosis: ${record.primaryDiagnosis?.description}`);
      console.log(`- Treatment Plan: ${record.treatmentPlan}`);
      console.log(`- Created: ${record.createdAt}`);
      console.log(`- Created By: ${record.createdBy}`);
    } else {
      console.log('❌ Medical record not found in database');
    }
    
    // Get total count of medical records
    const totalRecords = await MedicalRecord.countDocuments();
    console.log(`\n📊 Total medical records in database: ${totalRecords}`);
    
    // Get the latest medical records without populate to avoid schema issues
    const latestRecords = await MedicalRecord.find()
      .sort({ createdAt: -1 })
      .limit(5);
    
    console.log('\n📝 Latest 5 medical records:');
    latestRecords.forEach((record, index) => {
      console.log(`${index + 1}. ID: ${record._id}`);
      console.log(`   Patient ID: ${record.patient}`);
      console.log(`   Chief Complaint: ${record.chiefComplaint?.description || 'N/A'}`);
      console.log(`   Status: ${record.status}`);
      console.log(`   Created: ${record.createdAt}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error verifying medical record:', error);
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed.');
  }
}

// Run the script
verifyMedicalRecord(); 