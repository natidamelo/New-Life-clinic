const axios = require('axios');

// API configuration
const API_BASE_URL = 'http://192.168.78.157:5002/api';
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODIzODU5NDg1ZTJhMzdkOGNiNDIwZWQiLCJlbWFpbCI6InNlbWhhbEBleGFtcGxlLmNvbSIsInJvbGUiOiJudXJzZSIsImlhdCI6MTczMzE5NzQ5NiwiZXhwIjoxNzMzMjgzODk2fQ.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

async function createBloodPressureTasks() {
  try {
    console.log('🔍 Creating Blood Pressure Check tasks via API...\n');

    // Create a Blood Pressure Check task for testing
    const taskData = {
      patientId: '688f7f4aa354287d78558014', // Hana Dejene
      patientName: 'Hana Dejene',
      serviceName: 'Blood Pressure Check - 50 ETB',
      description: 'Blood Pressure Check for Hana Dejene',
      taskType: 'VITAL_SIGNS',
      priority: 'MEDIUM',
      status: 'PENDING',
      assignedBy: '6823859485e2a37d8cb420ed',
      assignedByName: 'Reception',
      assignedTo: '6823859485e2a37d8cb420ed',
      assignedToName: 'Semhal Melaku',
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      notes: 'Blood Pressure Check requested for Hana Dejene',
      servicePrice: 50,
      paymentAuthorization: {
        paidDays: 1,
        totalDays: 1,
        paymentStatus: 'paid',
        canAdminister: true,
        authorizedDoses: 1,
        unauthorizedDoses: 0,
        outstandingAmount: 0,
        totalCost: 50,
        amountPaid: 50,
        lastUpdated: new Date().toISOString()
      },
      vitalSignsOptions: {
        measurementType: 'blood_pressure',
        requiredFields: ['systolic', 'diastolic', 'position', 'arm'],
        fileType: 'single'
      }
    };

    console.log('📝 Creating Blood Pressure Check task...');
    
    const response = await axios.post(`${API_BASE_URL}/nurse-tasks`, taskData, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Blood Pressure Check task created successfully!');
    console.log('Task ID:', response.data._id);
    console.log('Patient:', response.data.patientName);
    console.log('Task Type:', response.data.taskType);

    // Create another task for "Game" patient
    const gameTaskData = {
      ...taskData,
      patientId: '688f84faef722da62382c0e8', // Game patient
      patientName: 'Game',
      description: 'Blood Pressure Check for Game',
      notes: 'Blood Pressure Check requested for Game'
    };

    console.log('\n📝 Creating Blood Pressure Check task for Game...');
    
    const gameResponse = await axios.post(`${API_BASE_URL}/nurse-tasks`, gameTaskData, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Blood Pressure Check task for Game created successfully!');
    console.log('Task ID:', gameResponse.data._id);
    console.log('Patient:', gameResponse.data.patientName);
    console.log('Task Type:', gameResponse.data.taskType);

    console.log('\n🎉 Blood Pressure Check tasks created successfully!');
    console.log('   Check the nurse dashboard "Administer Meds" section with "Vital Signs" filter.');

  } catch (error) {
    console.error('❌ Error creating Blood Pressure Check tasks:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('🔑 Authentication error. Please check the auth token.');
    } else if (error.response?.status === 400) {
      console.log('📝 Validation error. Check the task data format.');
    }
  }
}

createBloodPressureTasks(); 
 
 
 
 
 