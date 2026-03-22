// Test utility to help verify the patient workflow
// This file can be used to create test patients and assignments

export const createTestPatient = async () => {
  const testPatient = {
    firstName: 'Test',
    lastName: 'Patient',
    age: 35,
    gender: 'male',
    contactNumber: '555-TEST-001',
    email: 'test.patient@clinic.com',
    address: '123 Test Street, Test City',
    department: 'general',
    priority: 'normal',
    chiefComplaint: 'Test complaint for workflow verification',
    status: 'waiting'
  };

  try {
    const response = await fetch('/api/patients', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(testPatient)
    });

    if (response.ok) {
      const createdPatient = await response.json();
      console.log('Test patient created:', createdPatient);
      return createdPatient;
    } else {
      console.error('Failed to create test patient:', response.statusText);
      return null;
    }
  } catch (error) {
    console.error('Error creating test patient:', error);
    return null;
  }
};

export const assignPatientToNurseAndDoctor = async (patientId, nurseId, doctorId) => {
  try {
    const response = await fetch(`/api/patients/${patientId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        status: 'Admitted',
        assignedNurseId: nurseId,
        assignedDoctorId: doctorId,
        lastUpdated: new Date().toISOString()
      })
    });

    if (response.ok) {
      const updatedPatient = await response.json();
      console.log('Patient assigned to nurse and doctor:', updatedPatient);
      return updatedPatient;
    } else {
      console.error('Failed to assign patient:', response.statusText);
      return null;
    }
  } catch (error) {
    console.error('Error assigning patient:', error);
    return null;
  }
};

export const addVitalsToPatient = async (patientId, vitals) => {
  const defaultVitals = {
    temperature: '98.6',
    bloodPressure: '120/80',
    heartRate: '72',
    respiratoryRate: '16',
    oxygenSaturation: '98',
    ...vitals
  };

  try {
    // Update vitals
    const vitalsResponse = await fetch(`/api/patients/${patientId}/vitals`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(defaultVitals)
    });

    if (vitalsResponse.ok) {
      // Update status to scheduled
      const statusResponse = await fetch(`/api/patients/${patientId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          status: 'scheduled',
          lastUpdated: new Date().toISOString()
        })
      });

      if (statusResponse.ok) {
        const updatedPatient = await statusResponse.json();
        console.log('Patient vitals added and status updated to scheduled:', updatedPatient);
        return updatedPatient;
      }
    }

    console.error('Failed to add vitals or update status');
    return null;
  } catch (error) {
    console.error('Error adding vitals:', error);
    return null;
  }
};

// Complete workflow test
export const testCompleteWorkflow = async (nurseId, doctorId) => {
  console.log('Starting complete workflow test...');
  
  // Step 1: Create test patient
  const patient = await createTestPatient();
  if (!patient) {
    console.error('Failed to create test patient');
    return false;
  }

  // Step 2: Assign to nurse and doctor (Reception step)
  const assignedPatient = await assignPatientToNurseAndDoctor(patient.id, nurseId, doctorId);
  if (!assignedPatient) {
    console.error('Failed to assign patient');
    return false;
  }

  console.log('✅ Step 1 & 2 Complete: Patient created and assigned');
  console.log('🏥 Reception → Patient should now appear in Nurse dashboard');
  
  // Wait a moment for user to check nurse dashboard
  console.log('⏳ Check the Nurse dashboard now. The patient should appear there.');
  console.log('⏳ After nurse fills vitals, run: testWorkflow.addVitalsToPatient("' + patient.id + '")');
  
  return {
    patientId: patient.id,
    nurseId: nurseId,
    doctorId: doctorId
  };
};

// Make functions available globally for testing in browser console
if (typeof window !== 'undefined') {
  window.testWorkflow = {
    createTestPatient,
    assignPatientToNurseAndDoctor,
    addVitalsToPatient,
    testCompleteWorkflow
  };
} 