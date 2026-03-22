const mongoose = require('mongoose');
const MedicalRecord = require('./models/MedicalRecord');

const testFrontendLoad = async () => {
  try {
    console.log('🔍 TESTING WHAT FRONTEND RECEIVES WHEN LOADING RECORDS\n');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to database\n');

    // Get all medical records
    const records = await MedicalRecord.find({}).limit(3);
    console.log(`📊 Found ${records.length} medical records\n`);

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      console.log(`--- TESTING RECORD ${i + 1} (ID: ${record._id}) ---`);
      
      // Test 1: Raw record as saved in DB
      console.log('🔬 RAW DATABASE RECORD:');
      console.log('  Patient ID:', record.patient);
      console.log('  Chief Complaint Description:', record.chiefComplaint?.description);
      console.log('  Chief Complaint Duration:', record.chiefComplaint?.duration);
      console.log('  Physical Exam General:', record.physicalExamination?.general);
      console.log('  Physical Exam Vitals:', record.physicalExamination?.vitals);
      console.log('  History Present Illness:', record.historyOfPresentIllness);
      console.log('  Status:', record.status);
      
      // Test 2: What the optimized API returns
      console.log('\n🚀 OPTIMIZED API SIMULATION:');
      try {
        const optimizedRecord = await MedicalRecord.findById(record._id)
          .populate('patient', 'firstName lastName patientId')
          .populate('doctor', 'firstName lastName')
          .lean()
          .exec();
        
        console.log('  - API Response Structure:');
        console.log('    * ID:', optimizedRecord._id);
        console.log('    * Patient:', optimizedRecord.patient);
        console.log('    * Doctor:', optimizedRecord.doctor);
        console.log('    * ChiefComplaint.description:', optimizedRecord.chiefComplaint?.description);
        console.log('    * ChiefComplaint.duration:', optimizedRecord.chiefComplaint?.duration);
        console.log('    * PhysicalExam.general:', optimizedRecord.physicalExamination?.general);
        console.log('    * PhysicalExam.vitals:', optimizedRecord.physicalExamination?.vitals);
        
      } catch (apiError) {
        console.log('  ❌ API Simulation Error:', apiError.message);
      }
      
      // Test 3: Check for empty fields that frontend might be looking for
      console.log('\n🔍 FRONTEND FIELD MAPPING CHECK:');
      const frontendFields = {
        'chiefComplaint.description': record.chiefComplaint?.description,
        'chiefComplaint.duration': record.chiefComplaint?.duration,
        'chiefComplaint.severity': record.chiefComplaint?.severity,
        'physicalExamination.general': record.physicalExamination?.general,
        'physicalExamination.vitals.temperature': record.physicalExamination?.vitals?.temperature,
        'physicalExamination.vitals.heartRate': record.physicalExamination?.vitals?.heartRate,
        'physicalExamination.vitals.bloodPressure': record.physicalExamination?.vitals?.bloodPressure,
        'historyOfPresentIllness': record.historyOfPresentIllness,
        'pastMedicalHistory': record.pastMedicalHistory,
        'familyHistory': record.familyHistory,
        'socialHistory': record.socialHistory,
        'allergies': record.allergies,
        'reviewOfSystems': record.reviewOfSystems
      };
      
      console.log('  Fields the frontend expects:');
      Object.entries(frontendFields).forEach(([key, value]) => {
        const status = value ? '✅ HAS DATA' : '❌ EMPTY/MISSING';
        console.log(`    - ${key}: ${status}`);
        if (value && typeof value === 'string' && value.length > 50) {
          console.log(`      Preview: "${value.substring(0, 50)}..."`);
        } else if (value) {
          console.log(`      Value: ${JSON.stringify(value)}`);
        }
      });
      
      console.log('\n' + '='.repeat(60) + '\n');
    }

    // Test 4: Check what a fresh API call would return
    console.log('🌐 TESTING ACTUAL API RESPONSE FORMAT:\n');
    
    if (records.length > 0) {
      const testRecord = records[0];
      
      // Simulate what controller sends to frontend
      const apiResponse = {
        success: true,
        data: {
          _id: testRecord._id,
          patient: testRecord.patient,
          doctor: testRecord.doctor,
          chiefComplaint: testRecord.chiefComplaint,
          physicalExamination: testRecord.physicalExamination,
          historyOfPresentIllness: testRecord.historyOfPresentIllness,
          pastMedicalHistory: testRecord.pastMedicalHistory,
          familyHistory: testRecord.familyHistory,
          socialHistory: testRecord.socialHistory,
          allergies: testRecord.allergies,
          status: testRecord.status,
          createdAt: testRecord.createdAt,
          updatedAt: testRecord.updatedAt
        }
      };
      
      console.log('API Response Structure:');
      console.log(JSON.stringify(apiResponse, null, 2));
    }

  } catch (error) {
    console.error('❌ Error during frontend load test:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔒 Database connection closed');
  }
};

if (require.main === module) {
  testFrontendLoad().catch(console.error);
}

module.exports = { testFrontendLoad }; 
