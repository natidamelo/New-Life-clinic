const mongoose = require('mongoose');
require('dotenv').config();

const Patient = require('./models/Patient');

async function testIncrementalVitals() {
  try {
    console.log('🧪 Testing Incremental Vitals Saving...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to MongoDB');

    // Find a test patient
    const patient = await Patient.findOne({ firstName: 'Hana' });
    if (!patient) {
      console.log('❌ Test patient not found');
      return;
    }

    console.log(`📋 Testing with patient: ${patient.firstName} ${patient.lastName} (ID: ${patient._id})`);

    // Test 1: Save only blood pressure
    console.log('\n🔬 Test 1: Saving only blood pressure...');
    const vitals1 = {
      bloodPressure: '120/80',
      timestamp: new Date()
    };

    const updatedPatient1 = await Patient.findByIdAndUpdate(
      patient._id,
      { 
        $set: { 
          vitals: vitals1,
          updatedAt: new Date() 
        } 
      },
      { new: true }
    );

    console.log('✅ Blood pressure saved:', updatedPatient1.vitals);

    // Test 2: Add temperature (should merge with existing blood pressure)
    console.log('\n🌡️ Test 2: Adding temperature...');
    const vitals2 = {
      temperature: '37.2',
      timestamp: new Date()
    };

    const existingVitals = updatedPatient1.vitals || {};
    const mergedVitals = {
      ...existingVitals,
      ...vitals2,
      timestamp: new Date()
    };

    const updatedPatient2 = await Patient.findByIdAndUpdate(
      patient._id,
      { 
        $set: { 
          vitals: mergedVitals,
          updatedAt: new Date() 
        } 
      },
      { new: true }
    );

    console.log('✅ Temperature added, merged vitals:', updatedPatient2.vitals);

    // Test 3: Add heart rate (should merge with existing vitals)
    console.log('\n💓 Test 3: Adding heart rate...');
    const vitals3 = {
      heartRate: '75',
      timestamp: new Date()
    };

    const existingVitals2 = updatedPatient2.vitals || {};
    const mergedVitals2 = {
      ...existingVitals2,
      ...vitals3,
      timestamp: new Date()
    };

    const updatedPatient3 = await Patient.findByIdAndUpdate(
      patient._id,
      { 
        $set: { 
          vitals: mergedVitals2,
          updatedAt: new Date() 
        } 
      },
      { new: true }
    );

    console.log('✅ Heart rate added, final merged vitals:', updatedPatient3.vitals);

    console.log('\n🎉 Incremental vitals saving test completed successfully!');
    console.log('📊 Final vitals state:', {
      bloodPressure: updatedPatient3.vitals.bloodPressure,
      temperature: updatedPatient3.vitals.temperature,
      heartRate: updatedPatient3.vitals.heartRate,
      timestamp: updatedPatient3.vitals.timestamp
    });

  } catch (error) {
    console.error('❌ Error testing incremental vitals:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the test
testIncrementalVitals(); 