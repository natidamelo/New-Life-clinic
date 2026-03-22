const axios = require('axios');

const API_BASE_URL = 'http://192.168.78.157:5002/api';

async function createBloodPressureTasksViaAPI() {
  try {
    console.log('🔍 Creating Blood Pressure Check tasks via API...');
    
    // First, let's get all patients to find Hana, Game, and Semhal
    const patientsResponse = await axios.get(`${API_BASE_URL}/patients`);
    const patients = patientsResponse.data.patients || patientsResponse.data;
    
    console.log(`Found ${patients.length} patients`);
    
    // Find the specific patients
    const targetPatients = patients.filter(patient => 
      patient.name && (
        patient.name.toLowerCase().includes('hana') ||
        patient.name.toLowerCase().includes('game') ||
        patient.name.toLowerCase().includes('semhal')
      )
    );
    
    console.log('Target patients found:', targetPatients.map(p => p.name));
    
    for (const patient of targetPatients) {
      console.log(`\n📋 Creating Blood Pressure Check task for ${patient.name}...`);
      
      try {
        const taskData = {
          patientId: patient._id || patient.id,
          patientName: patient.name,
          description: 'Blood Pressure Check',
          type: 'VITAL_SIGNS',
          taskType: 'VITAL_SIGNS',
          priority: 'normal',
          status: 'PENDING',
          notes: 'Blood pressure measurement required',
          location: 'Clinic',
          department: 'nurse',
          paymentAuthorization: {
            isAuthorized: true,
            paymentStatus: 'fully_paid',
            amount: 50,
            paidAmount: 50,
            remainingAmount: 0,
            paymentMethod: 'cash',
            paymentDate: new Date().toISOString()
          }
        };
        
        const response = await axios.post(`${API_BASE_URL}/nurse-tasks`, taskData);
        console.log(`✅ Created Blood Pressure Check task for ${patient.name}:`, response.data._id);
        
      } catch (error) {
        if (error.response && error.response.status === 409) {
          console.log(`⚠️  Task already exists for ${patient.name}`);
        } else {
          console.error(`❌ Error creating task for ${patient.name}:`, error.response?.data || error.message);
        }
      }
    }
    
    console.log('\n🎉 Blood Pressure Check tasks creation completed!');
    
    // Show summary of existing tasks
    try {
      const tasksResponse = await axios.get(`${API_BASE_URL}/nurse-tasks?description=Blood Pressure Check`);
      const tasks = tasksResponse.data;
      console.log(`\n📊 Summary: ${tasks.length} Blood Pressure Check tasks found`);
      for (const task of tasks) {
        console.log(`  - ${task.patientName}: ${task.status}`);
      }
    } catch (error) {
      console.log('Could not fetch task summary:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Wait a bit for the server to start
setTimeout(createBloodPressureTasksViaAPI, 3000); 
 
 