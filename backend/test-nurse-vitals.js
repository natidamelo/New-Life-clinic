const mongoose = require('mongoose');
const VitalSigns = require('./models/VitalSigns');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/clinic-cms');

const createTestVitals = async () => {
  try {
    // Sample patient ID (replace with actual patient ID from your database)
    const patientId = '683ee8b9f9179295c9071a39'; // Use the patient ID you've been testing with
    
    // Create sample nurse vitals
    const nurseVitals = new VitalSigns({
      patient: patientId,
      temperature: {
        value: 98.6,
        unit: 'Fahrenheit'
      },
      bloodPressure: {
        systolic: 120,
        diastolic: 80,
        unit: 'mmHg'
      },
      heartRate: {
        value: 75,
        unit: 'bpm'
      },
      respiratoryRate: {
        value: 16,
        unit: 'breaths/min'
      },
      oxygenSaturation: {
        value: 98,
        unit: '%'
      },
      height: {
        value: 68,
        unit: 'inches'
      },
      weight: {
        value: 150,
        unit: 'lbs'
      },
      bmi: 22.8,
      nurse: '507f1f77bcf86cd799439011', // Sample nurse ID
      recordedAt: new Date(),
      notes: 'Patient vitals taken during routine check-up'
    });

    await nurseVitals.save();
    console.log('✅ Test nurse vitals created successfully!');
    console.log('Patient ID:', patientId);
    console.log('Vitals ID:', nurseVitals._id);
    console.log('Temperature:', nurseVitals.temperature.value + '°' + nurseVitals.temperature.unit.charAt(0));
    console.log('Blood Pressure:', `${nurseVitals.bloodPressure.systolic}/${nurseVitals.bloodPressure.diastolic}`);
    console.log('Heart Rate:', nurseVitals.heartRate.value + ' ' + nurseVitals.heartRate.unit);
    console.log('BMI:', nurseVitals.bmi);
    
  } catch (error) {
    console.error('❌ Error creating test vitals:', error);
  } finally {
    mongoose.connection.close();
  }
};

createTestVitals(); 
