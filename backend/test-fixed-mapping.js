const mongoose = require('mongoose');
const MedicalRecord = require('./models/MedicalRecord');

const testFixedMapping = async () => {
  try {
    console.log('🧪 TESTING FIXED DATA MAPPING\n');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to database\n');

    // Get a medical record
    const records = await MedicalRecord.find({}).limit(1);
    
    if (records.length === 0) {
      console.log('❌ No records found to test');
      return;
    }

    const record = records[0];
    console.log('🔬 TESTING RECORD:', record._id);
    console.log('');

    // Simulate what the optimized API endpoint returns
    console.log('📡 SIMULATING OPTIMIZED API RESPONSE:');
    const apiResponse = {
      success: true,
      data: {
        _id: record._id,
        patient: record.patient,
        doctor: record.doctor,
        chiefComplaint: record.chiefComplaint,
        physicalExamination: record.physicalExamination,
        historyOfPresentIllness: record.historyOfPresentIllness,
        pastMedicalHistory: record.pastMedicalHistory,
        familyHistory: record.familyHistory,
        socialHistory: record.socialHistory,
        allergies: record.allergies,
        status: record.status,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        primaryDiagnosis: record.primaryDiagnosis,
        plan: record.plan
      }
    };

    console.log('API Response Data Structure:');
    console.log('- _id:', apiResponse.data._id);
    console.log('- chiefComplaint.description:', apiResponse.data.chiefComplaint?.description ? 'HAS DATA' : 'MISSING');
    console.log('- physicalExamination.vitals:', apiResponse.data.physicalExamination?.vitals ? 'HAS DATA' : 'MISSING');
    console.log('- physicalExamination.vitals structure:', JSON.stringify(apiResponse.data.physicalExamination?.vitals, null, 2));

    // Simulate the frontend mapping logic
    console.log('\n🔧 SIMULATING FRONTEND MAPPING LOGIC:');
    
    const loadedData = apiResponse.data;
    console.log('Loaded data physicalExamination:', loadedData.physicalExamination ? 'Present' : 'Missing');
    console.log('Loaded data physicalExamination.vitals:', loadedData.physicalExamination?.vitals ? 'Present' : 'Missing');

    // Extract vitals the same way the frontend does
    const dbVitals = loadedData.physicalExamination?.vitals || loadedData.vitalSigns || {};
    console.log('Extracted dbVitals:', dbVitals);

    // Map vital signs the same way frontend does
    const mappedVitalSigns = {
      temperature: dbVitals.temperature?.toString() || '',
      heartRate: dbVitals.heartRate?.toString() || '',
      bloodPressure: dbVitals.bloodPressure ? 
        (typeof dbVitals.bloodPressure === 'object' ? 
          `${dbVitals.bloodPressure.systolic}/${dbVitals.bloodPressure.diastolic}` : 
          dbVitals.bloodPressure.toString()) : '',
      respiratoryRate: dbVitals.respiratoryRate?.toString() || '',
      oxygenSaturation: dbVitals.oxygenSaturation?.toString() || '',
      height: dbVitals.height?.toString() || '',
      weight: dbVitals.weight?.toString() || '',
      bmi: dbVitals.bmi?.toString() || '',
    };

    console.log('\n✨ FINAL MAPPED VITAL SIGNS:');
    Object.entries(mappedVitalSigns).forEach(([key, value]) => {
      const status = value ? `✅ "${value}"` : '❌ EMPTY';
      console.log(`  - ${key}: ${status}`);
    });

    // Test chief complaint mapping
    console.log('\n💬 CHIEF COMPLAINT MAPPING:');
    const chiefComplaint = {
      description: loadedData.chiefComplaint?.description || '',
      duration: loadedData.chiefComplaint?.duration || '',
      severity: loadedData.chiefComplaint?.severity || 'Mild',
      // ... other fields
    };

    Object.entries(chiefComplaint).forEach(([key, value]) => {
      const status = value ? `✅ "${value}"` : '❌ EMPTY';
      console.log(`  - ${key}: ${status}`);
    });

    // Test physical examination mapping
    console.log('\n🩺 PHYSICAL EXAMINATION MAPPING:');
    const physicalExam = {
      general: loadedData.physicalExamination?.general || '',
      heent: loadedData.physicalExamination?.heent || '',
      cardiovascular: loadedData.physicalExamination?.cardiovascular || '',
      respiratory: loadedData.physicalExamination?.respiratory || '',
      // Add vitals to physicalExamination
      vitals: mappedVitalSigns
    };

    Object.entries(physicalExam).forEach(([key, value]) => {
      if (key === 'vitals') {
        console.log(`  - ${key}: ${Object.keys(value).length > 0 ? '✅ MAPPED' : '❌ EMPTY'}`);
      } else {
        const status = value ? `✅ HAS DATA` : '❌ EMPTY';
        console.log(`  - ${key}: ${status}`);
      }
    });

    console.log('\n🎯 FINAL ASSESSMENT:');
    
    const hasVitals = Object.values(mappedVitalSigns).some(v => v !== '');
    const hasChiefComplaint = chiefComplaint.description !== '';
    const hasPhysicalExam = physicalExam.general !== '';

    console.log('✅ Vitals will be displayed:', hasVitals ? 'YES' : 'NO');
    console.log('✅ Chief complaint will be displayed:', hasChiefComplaint ? 'YES' : 'NO');
    console.log('✅ Physical exam will be displayed:', hasPhysicalExam ? 'YES' : 'NO');

    if (hasVitals && hasChiefComplaint && hasPhysicalExam) {
      console.log('\n🎉 SUCCESS! The record should display properly now!');
    } else {
      console.log('\n⚠️ Some fields might still appear empty');
    }

  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔒 Database connection closed');
  }
};

if (require.main === module) {
  testFixedMapping().catch(console.error);
}

module.exports = { testFixedMapping }; 
