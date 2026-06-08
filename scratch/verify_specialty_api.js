const path = require('path');
const dotenv = require('dotenv');

// Load environment from backend/.env where MongoDB details reside
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

// Avoid model buffering mismatch by loading the same mongoose version used by backend models
const mongoose = require('../backend/node_modules/mongoose');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const MedicalRecord = require('../backend/models/MedicalRecord');
const Patient = require('../backend/models/Patient');
const User = require('../backend/models/User');

const API_URL = 'http://localhost:5002/api/medical-records';
const JWT_SECRET = process.env.JWT_SECRET || 'clinic-management-system-default-secret-key-12345';
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms';

const maskUri = (uri) => {
  return uri.replace(/:([^:@/]+)@/, ':***@');
};

async function verify() {
  console.log('--- 🧪 STARTING MULTI-SPECIALTY MEDICAL RECORD SYSTEM VERIFICATION ---');
  console.log('Using Mongo URI:', maskUri(mongoURI));
  console.log('Mongoose version (from backend):', mongoose.version);
  
  // Disable buffering globally so we fail fast instead of hanging
  mongoose.set('bufferCommands', false);

  const opts = {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
    family: 4 // Force IPv4
  };

  console.log('Connecting to MongoDB...');
  try {
    await mongoose.connect(mongoURI, opts);
    console.log('Connected to MongoDB. Connection state:', mongoose.connection.readyState);
  } catch (connErr) {
    console.error('❌ Connection failed:', connErr.message);
    process.exit(1);
  }

  let testPatient = null;
  let testDoctor = null;
  let createdRecordId = null;

  try {
    // 1. Fetch or create a test doctor
    console.log('\n1. Fetching doctor or admin user...');
    try {
      testDoctor = await User.findOne({ role: { $in: ['doctor', 'admin', 'super_admin'] } }).maxTimeMS(10000);
    } catch (dbErr) {
      console.error('❌ Failed to fetch user from DB:', dbErr.message);
      throw dbErr;
    }

    if (!testDoctor) {
      console.log('No doctor user found. Creating a temporary doctor user...');
      testDoctor = new User({
        username: 'temp_doc',
        email: 'temp_doc@clinic.local',
        password: 'password123',
        firstName: 'Test',
        lastName: 'Doctor',
        role: 'doctor',
        clinicId: 'new-life',
        permissions: { managePatients: true, viewReports: true }
      });
      await testDoctor.save();
      console.log(`Created temporary doctor user: ${testDoctor._id}`);
    } else {
      console.log(`Found doctor user: ${testDoctor.firstName} ${testDoctor.lastName} (Role: ${testDoctor.role}, ID: ${testDoctor._id})`);
    }

    // 2. Fetch or create a test patient
    console.log('\n2. Fetching patient...');
    testPatient = await Patient.findOne({}).maxTimeMS(10000);
    if (!testPatient) {
      console.log('No patient found. Creating a temporary patient...');
      testPatient = new Patient({
        firstName: 'Emma',
        lastName: 'Watson',
        dateOfBirth: new Date('2018-05-15'), // Under 12 years old for pediatrics test
        gender: 'Female',
        patientId: 'PT-99999',
        clinicId: 'new-life'
      });
      await testPatient.save();
      console.log(`Created temporary patient: ${testPatient._id}`);
    } else {
      console.log(`Found patient: ${testPatient.firstName} ${testPatient.lastName} (Age: ${testPatient.age || 'N/A'}, ID: ${testPatient._id})`);
    }

    // 3. Generate JWT token for authorization
    console.log('\n3. Generating JWT Token...');
    const token = jwt.sign(
      { userId: testDoctor._id, role: testDoctor.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    console.log('Token successfully generated.');

    const authHeaders = {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    // 4. Test POST with missing specialty
    console.log('\n4. Testing POST /api/medical-records with MISSING specialty...');
    try {
      const payload = {
        patient: testPatient._id,
        patientId: testPatient._id,
        chiefComplaint: { description: 'Fever and cough' },
        diagnosis: 'Flu',
        status: 'draft'
      };
      await axios.post(API_URL, payload, authHeaders);
      console.log('❌ FAIL: API allowed creation of record without specialty.');
    } catch (err) {
      if (err.response && err.response.status === 400) {
        console.log('✅ PASS: API rejected missing specialty with 400 Bad Request:', err.response.data.message);
      } else {
        console.log('❌ FAIL: Unexpected error for missing specialty:', err.message);
      }
    }

    // 5. Test POST with valid specialty and details
    console.log('\n5. Testing POST /api/medical-records with VALID specialty and details...');
    const createPayload = {
      patient: testPatient._id,
      patientId: testPatient._id,
      chiefComplaint: { description: 'Fever and cough' },
      diagnosis: 'Flu',
      specialty: 'pediatrics',
      details: {
        developmentMilestones: 'All met',
        vaccinationStatus: 'Up to date',
        caregiverRelationship: 'Mother'
      },
      status: 'draft'
    };

    const postRes = await axios.post(API_URL, createPayload, authHeaders);
    if (postRes.data && postRes.data.success) {
      createdRecordId = postRes.data.data._id;
      console.log('✅ PASS: Medical record created successfully!');
      console.log('Created record ID:', createdRecordId);
      console.log('Saved Specialty:', postRes.data.data.specialty);
      console.log('Saved Details:', postRes.data.data.details);
    } else {
      console.log('❌ FAIL: Could not create medical record. Response:', postRes.data);
      throw new Error('Create record failed');
    }

    // 6. Test GET /api/medical-records/:id (smart getter - returns single record)
    console.log('\n6. Testing GET /api/medical-records/:id (Smart getter - single record)...');
    const getSingleRes = await axios.get(`${API_URL}/${createdRecordId}`, authHeaders);
    if (getSingleRes.data && getSingleRes.data.success) {
      console.log('✅ PASS: Smart getter successfully returned single record!');
      console.log('Returned specialty:', getSingleRes.data.data.specialty);
      console.log('Returned details:', getSingleRes.data.data.details);
    } else {
      console.log('❌ FAIL: Smart getter failed to retrieve single record. Response:', getSingleRes.data);
    }

    // 7. Test PATCH /api/medical-records/:id (save draft updates)
    console.log('\n7. Testing PATCH /api/medical-records/:id (Save draft updates)...');
    const updatePayload = {
      specialty: 'pediatrics',
      details: {
        developmentMilestones: 'All met',
        vaccinationStatus: 'Complete', // Update vaccinationStatus
        caregiverRelationship: 'Mother',
        pediatricNotes: 'Child is very active'
      },
      status: 'draft'
    };

    const patchRes = await axios.patch(`${API_URL}/${createdRecordId}`, updatePayload, authHeaders);
    if (patchRes.data && patchRes.data.success) {
      console.log('✅ PASS: Medical record draft updated successfully!');
      console.log('Updated details:', patchRes.data.data.details);
      if (patchRes.data.data.details.vaccinationStatus === 'Complete' && patchRes.data.data.details.pediatricNotes === 'Child is very active') {
        console.log('✅ PASS: Updates correctly persisted to details.');
      } else {
        console.log('❌ FAIL: Updates were not correctly merged in details.');
      }
    } else {
      console.log('❌ FAIL: Could not update draft. Response:', patchRes.data);
    }

    // 8. Test GET /api/medical-records/specialty/:type (Filter by specialty)
    console.log('\n8. Testing GET /api/medical-records/specialty/pediatrics (Filter by specialty)...');
    const filterRes = await axios.get(`${API_URL}/specialty/pediatrics`, authHeaders);
    if (filterRes.data && filterRes.data.success) {
      console.log(`✅ PASS: Specialty filter works! Found ${filterRes.data.count} pediatrics records.`);
      const found = filterRes.data.data.some(r => r._id === createdRecordId);
      if (found) {
        console.log('✅ PASS: Our newly created record is returned in the specialty list!');
      } else {
        console.log('❌ FAIL: Created record was not found in the filtered list.');
      }
    } else {
      console.log('❌ FAIL: Specialty filter failed. Response:', filterRes.data);
    }

    // 9. Test PUT /api/medical-records/:id/finalize (Finalize medical record)
    console.log('\n9. Testing PUT /api/medical-records/:id/finalize (Finalize record)...');
    const finalizeRes = await axios.put(`${API_URL}/${createdRecordId}/finalize`, {}, authHeaders);
    if (finalizeRes.data && finalizeRes.data.success) {
      console.log('✅ PASS: Record finalized successfully!');
      console.log('Finalized Record status:', finalizeRes.data.data.status);
      if (finalizeRes.data.data.status === 'Finalized') {
        console.log('✅ PASS: Status is correctly mapped to "Finalized".');
      } else {
        console.log('❌ FAIL: Finalized status is not "Finalized".');
      }
    } else {
      console.log('❌ FAIL: Finalize failed. Response:', finalizeRes.data);
    }

  } catch (error) {
    console.error('\n❌ ERROR during verification script execution:', error.message);
    if (error.response) {
      console.error('API Error Response:', error.response.data);
    }
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    try {
      if (createdRecordId) {
        await MedicalRecord.deleteOne({ _id: createdRecordId }).maxTimeMS(5000);
        console.log('Deleted created test medical record.');
      }
      // Only delete patient if it was created as a temp patient
      if (testPatient && testPatient.patientId === 'PT-99999') {
        await Patient.deleteOne({ _id: testPatient._id }).maxTimeMS(5000);
        console.log('Deleted temporary patient.');
      }
      // Only delete doctor if it was created as a temp doctor
      if (testDoctor && testDoctor.username === 'temp_doc') {
        await User.deleteOne({ _id: testDoctor._id }).maxTimeMS(5000);
        console.log('Deleted temporary doctor.');
      }
    } catch (cleanupErr) {
      console.error('Cleanup warning:', cleanupErr.message);
    }

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    console.log('\n--- 🏁 VERIFICATION COMPLETE ---');
  }
}

verify();
