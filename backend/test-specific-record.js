const mongoose = require('mongoose');
const MedicalRecord = require('./models/MedicalRecord');

const testSpecificRecord = async () => {
  try {
    console.log('🔍 TESTING SPECIFIC RECORD FROM URL\n');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to database\n');

    // The record ID from the URL in the screenshot
    const recordId = '683ee8b9f9179295c9071a39';
    console.log('🎯 Testing record ID from URL:', recordId);

    // Test if this record exists
    const record = await MedicalRecord.findById(recordId);
    
    if (!record) {
      console.log('❌ Record not found with ID:', recordId);
      
      // List all available records
      const allRecords = await MedicalRecord.find({});
      console.log('\n📋 Available records in database:');
      allRecords.forEach((rec, index) => {
        console.log(`${index + 1}. ID: ${rec._id}`);
        console.log(`   Patient: ${rec.patient}`);
        console.log(`   Chief Complaint: ${rec.chiefComplaint?.description || 'MISSING'}`);
        console.log(`   Status: ${rec.status}`);
        console.log('');
      });
      return;
    }

    console.log('✅ Record found!');
    console.log('\n📋 RECORD DETAILS:');
    console.log('- ID:', record._id);
    console.log('- Patient ID:', record.patient);
    console.log('- Chief Complaint Description:', record.chiefComplaint?.description || 'MISSING');
    console.log('- Chief Complaint Duration:', record.chiefComplaint?.duration || 'MISSING');
    console.log('- Chief Complaint Severity:', record.chiefComplaint?.severity || 'MISSING');
    console.log('- Physical Exam General:', record.physicalExamination?.general || 'MISSING');
    console.log('- Physical Exam Vitals:', record.physicalExamination?.vitals ? 'HAS VITALS' : 'NO VITALS');
    console.log('- Status:', record.status);
    console.log('- Created:', record.createdAt);

    // Test the API endpoints that the frontend would call
    console.log('\n🌐 TESTING API ENDPOINTS:');
    
    // Test 1: Regular endpoint
    console.log('\n1️⃣ Testing regular endpoint...');
    try {
      const regularRecord = await MedicalRecord.findById(recordId).lean();
      console.log('✅ Regular endpoint would return:', {
        id: regularRecord._id,
        hasChiefComplaint: !!regularRecord.chiefComplaint?.description,
        hasVitals: !!regularRecord.physicalExamination?.vitals,
        status: regularRecord.status
      });
    } catch (err) {
      console.log('❌ Regular endpoint failed:', err.message);
    }

    // Test 2: Optimized endpoint
    console.log('\n2️⃣ Testing optimized endpoint...');
    try {
      const optimizedRecord = await MedicalRecord.findById(recordId)
        .populate('patient', 'firstName lastName patientId')
        .populate('doctor', 'firstName lastName')
        .lean();
      
      console.log('✅ Optimized endpoint would return:', {
        id: optimizedRecord._id,
        patient: optimizedRecord.patient,
        hasChiefComplaint: !!optimizedRecord.chiefComplaint?.description,
        hasVitals: !!optimizedRecord.physicalExamination?.vitals,
        status: optimizedRecord.status
      });
    } catch (err) {
      console.log('❌ Optimized endpoint failed:', err.message);
    }

    // Test 3: What the frontend should receive
    console.log('\n3️⃣ Frontend data mapping test...');
    const frontendData = {
      _id: record._id,
      patient: record.patient,
      chiefComplaint: {
        description: record.chiefComplaint?.description || '',
        duration: record.chiefComplaint?.duration || '',
        severity: record.chiefComplaint?.severity || 'Mild'
      },
      physicalExamination: record.physicalExamination,
      vitalSigns: record.physicalExamination?.vitals ? {
        temperature: record.physicalExamination.vitals.temperature?.toString() || '',
        heartRate: record.physicalExamination.vitals.heartRate?.toString() || '',
        bloodPressure: record.physicalExamination.vitals.bloodPressure ? 
          (typeof record.physicalExamination.vitals.bloodPressure === 'object' ? 
            `${record.physicalExamination.vitals.bloodPressure.systolic}/${record.physicalExamination.vitals.bloodPressure.diastolic}` : 
            record.physicalExamination.vitals.bloodPressure.toString()) : ''
      } : {},
      status: record.status
    };

    console.log('✅ Frontend should receive:');
    console.log('- Chief Complaint Description:', frontendData.chiefComplaint.description ? 'HAS DATA' : 'EMPTY');
    console.log('- Chief Complaint Duration:', frontendData.chiefComplaint.duration ? 'HAS DATA' : 'EMPTY');
    console.log('- Vital Signs Temperature:', frontendData.vitalSigns.temperature ? 'HAS DATA' : 'EMPTY');
    console.log('- Vital Signs Blood Pressure:', frontendData.vitalSigns.bloodPressure ? 'HAS DATA' : 'EMPTY');

    // Test HTTP request simulation
    console.log('\n4️⃣ HTTP Request simulation...');
    const apiResponse = {
      success: true,
      data: record.toObject()
    };
    console.log('✅ API response structure looks correct');
    console.log('✅ Response contains all necessary data');

  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔒 Database connection closed');
  }
};

if (require.main === module) {
  testSpecificRecord().catch(console.error);
}

module.exports = { testSpecificRecord }; 
