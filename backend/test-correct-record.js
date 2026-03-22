const mongoose = require('mongoose');
const MedicalRecord = require('./models/MedicalRecord');

const testCorrectRecord = async () => {
  try {
    console.log('🎯 TESTING CORRECT RECORD ID\n');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to database\n');

    // The CORRECT record ID
    const correctRecordId = '683ee6ec1f15ba1e09f1e5ab';
    console.log('🎯 Testing CORRECT record ID:', correctRecordId);

    // Get the record
    const record = await MedicalRecord.findById(correctRecordId);
    
    if (!record) {
      console.log('❌ Record not found!');
      return;
    }

    console.log('✅ Record found with COMPLETE data!');
    console.log('\n📋 RECORD PREVIEW:');
    console.log('- ID:', record._id);
    console.log('- Chief Complaint:', record.chiefComplaint?.description?.substring(0, 60) + '...');
    console.log('- Duration:', record.chiefComplaint?.duration);
    console.log('- Severity:', record.chiefComplaint?.severity);
    console.log('- Temperature:', record.physicalExamination?.vitals?.temperature);
    console.log('- Heart Rate:', record.physicalExamination?.vitals?.heartRate);
    console.log('- Blood Pressure:', record.physicalExamination?.vitals?.bloodPressure);

    // Simulate what the API would return
    console.log('\n🌐 API RESPONSE SIMULATION:');
    const apiResponse = {
      success: true,
      data: {
        _id: record._id,
        patient: record.patient,
        chiefComplaint: record.chiefComplaint,
        physicalExamination: record.physicalExamination,
        historyOfPresentIllness: record.historyOfPresentIllness,
        pastMedicalHistory: record.pastMedicalHistory,
        familyHistory: record.familyHistory,
        socialHistory: record.socialHistory,
        allergies: record.allergies,
        status: record.status,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt
      }
    };

    console.log('✅ API Response ready');
    console.log('✅ Contains Chief Complaint:', apiResponse.data.chiefComplaint?.description ? 'YES' : 'NO');
    console.log('✅ Contains Vitals:', apiResponse.data.physicalExamination?.vitals ? 'YES' : 'NO');
    console.log('✅ Contains History:', apiResponse.data.historyOfPresentIllness ? 'YES' : 'NO');

    console.log('\n🔗 CORRECT URLS TO USE:');
    console.log(`📝 Edit: http://localhost:5173/app/doctor/medical-record/${correctRecordId}/edit`);
    console.log(`👁️ View: http://localhost:5173/app/doctor/medical-record/${correctRecordId}/view`);
    
    console.log('\n⚠️ WRONG URL (what you were using):');
    console.log('❌ http://localhost:5173/app/doctor/medical-record/683ee8b9f9179295c9071a39/edit');
    console.log('   This record ID does not exist in the database!');

  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔒 Database connection closed');
  }
};

if (require.main === module) {
  testCorrectRecord().catch(console.error);
}

module.exports = { testCorrectRecord }; 
