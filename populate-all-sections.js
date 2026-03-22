const mongoose = require('mongoose');

async function populateAllSections() {
  try {
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to MongoDB');

    // Get existing patients
    const patients = await mongoose.connection.collection('patients').find({}).limit(5).toArray();
    console.log(`👥 Found ${patients.length} patients to work with`);

    if (patients.length === 0) {
      console.log('❌ No patients found. Cannot create data.');
      return;
    }

    const semhalNurseId = new mongoose.Types.ObjectId('6823859485e2a37d8cb420ed');
    const currentDate = new Date();

    // 1. BLOOD PRESSURE - Create pending blood pressure tasks
    console.log('\n🩺 Creating Blood Pressure tasks...');
    const bloodPressureTasks = [];
    
    patients.forEach((patient, index) => {
      bloodPressureTasks.push({
        patientId: patient._id,
        patientName: `${patient.firstName} ${patient.lastName}`,
        taskType: 'VITAL_SIGNS',
        description: 'Record blood pressure measurements',
        status: 'PENDING',
        priority: index % 2 === 0 ? 'HIGH' : 'MEDIUM',
        assignedBy: semhalNurseId,
        assignedByName: 'Dr. Admin',
        assignedTo: semhalNurseId,
        assignedToName: 'Semhal Melaku',
        dueDate: new Date(currentDate.getTime() + (index * 2 * 60 * 60 * 1000)), // 2 hours apart
        vitalSignsType: 'blood_pressure',
        notes: 'Regular blood pressure monitoring required'
      });
    });

    // Insert blood pressure tasks
    const bpResult = await mongoose.connection.collection('nursetasks').insertMany(bloodPressureTasks);
    console.log(`✅ Created ${bpResult.insertedCount} blood pressure tasks`);

    // 2. PROCEDURES - Create nurse procedures
    console.log('\n🔧 Creating Procedures...');
    const procedures = [
      {
        patientId: patients[0]._id,
        patientName: `${patients[0].firstName} ${patients[0].lastName}`,
        procedureType: 'wound_care',
        procedureName: 'Wound Dressing Change',
        description: 'Change dressing for surgical wound on right leg',
        status: 'scheduled',
        priority: 'high',
        scheduledTime: new Date(currentDate.getTime() + 3 * 60 * 60 * 1000), // 3 hours from now
        duration: 30,
        location: 'Ward A',
        roomNumber: '101',
        bedNumber: '1',
        instructions: 'Clean wound with saline, apply new dressing',
        assignedNurseName: 'Semhal Melaku',
        assignedNurseId: semhalNurseId,
        amount: 150,
        currency: 'ETB',
        billingStatus: 'pending',
        woundDetails: {
          woundType: 'surgical',
          woundLocation: 'Right leg',
          woundSize: { length: 5, width: 3, depth: 1 },
          woundStage: 'Stage 2',
          woundCharacteristics: {
            tissueType: 'granulation',
            exudateType: 'serous',
            exudateAmount: 'minimal',
            odor: 'none'
          },
          woundAge: '5 days',
          riskFactors: ['diabetes', 'poor circulation']
        }
      },
      {
        patientId: patients[1]?._id || patients[0]._id,
        patientName: patients[1] ? `${patients[1].firstName} ${patients[1].lastName}` : `${patients[0].firstName} ${patients[0].lastName}`,
        procedureType: 'catheter_care',
        procedureName: 'Catheter Care and Maintenance',
        description: 'Routine catheter care and hygiene',
        status: 'in_progress',
        priority: 'normal',
        scheduledTime: new Date(currentDate.getTime() + 1 * 60 * 60 * 1000), // 1 hour from now
        duration: 20,
        location: 'Ward B',
        roomNumber: '102',
        bedNumber: '2',
        instructions: 'Clean catheter site, check for signs of infection',
        assignedNurseName: 'Semhal Melaku',
        assignedNurseId: semhalNurseId,
        amount: 80,
        currency: 'ETB',
        billingStatus: 'pending'
      }
    ];

    const procedureResult = await mongoose.connection.collection('procedures').insertMany(procedures);
    console.log(`✅ Created ${procedureResult.insertedCount} procedures`);

    // 3. SCHEDULE - Create appointments for nurse schedule
    console.log('\n📅 Creating Schedule/Appointments...');
    const appointments = [
      {
        patientId: patients[0]._id,
        patientName: `${patients[0].firstName} ${patients[0].lastName}`,
        appointmentType: 'nurse_visit',
        description: 'Morning vital signs check',
        scheduledTime: new Date(currentDate.getTime() + 30 * 60 * 1000), // 30 minutes from now
        duration: 15,
        status: 'scheduled',
        assignedNurseId: semhalNurseId,
        assignedNurseName: 'Semhal Melaku',
        location: 'Ward A',
        roomNumber: '101',
        priority: 'normal'
      },
      {
        patientId: patients[1]?._id || patients[0]._id,
        patientName: patients[1] ? `${patients[1].firstName} ${patients[1].lastName}` : `${patients[0].firstName} ${patients[0].lastName}`,
        appointmentType: 'medication_administration',
        description: 'Administer scheduled medications',
        scheduledTime: new Date(currentDate.getTime() + 2 * 60 * 60 * 1000), // 2 hours from now
        duration: 20,
        status: 'scheduled',
        assignedNurseId: semhalNurseId,
        assignedNurseName: 'Semhal Melaku',
        location: 'Ward B',
        roomNumber: '102',
        priority: 'high'
      },
      {
        patientId: patients[2]?._id || patients[0]._id,
        patientName: patients[2] ? `${patients[2].firstName} ${patients[2].lastName}` : `${patients[0].firstName} ${patients[0].lastName}`,
        appointmentType: 'wound_care',
        description: 'Wound dressing change',
        scheduledTime: new Date(currentDate.getTime() + 4 * 60 * 60 * 1000), // 4 hours from now
        duration: 30,
        status: 'scheduled',
        assignedNurseId: semhalNurseId,
        assignedNurseName: 'Semhal Melaku',
        location: 'Ward C',
        roomNumber: '103',
        priority: 'high'
      }
    ];

    const appointmentResult = await mongoose.connection.collection('appointments').insertMany(appointments);
    console.log(`✅ Created ${appointmentResult.insertedCount} appointments`);

    // 4. MONTHLY REPORT DATA - Create data for monthly reports
    console.log('\n📊 Creating Monthly Report data...');
    
    // Create some completed tasks for reporting
    const completedTasks = [
      {
        patientId: patients[0]._id,
        patientName: `${patients[0].firstName} ${patients[0].lastName}`,
        taskType: 'VITAL_SIGNS',
        description: 'Blood pressure monitoring',
        status: 'COMPLETED',
        priority: 'MEDIUM',
        assignedBy: semhalNurseId,
        assignedByName: 'Dr. Admin',
        assignedTo: semhalNurseId,
        assignedToName: 'Semhal Melaku',
        dueDate: new Date(currentDate.getTime() - 24 * 60 * 60 * 1000), // Yesterday
        completedDate: new Date(currentDate.getTime() - 23 * 60 * 60 * 1000), // Yesterday
        vitalSignsType: 'blood_pressure',
        notes: 'BP: 120/80, Pulse: 72'
      },
      {
        patientId: patients[1]?._id || patients[0]._id,
        patientName: patients[1] ? `${patients[1].firstName} ${patients[1].lastName}` : `${patients[0].firstName} ${patients[0].lastName}`,
        taskType: 'PROCEDURE',
        description: 'Wound dressing change',
        status: 'COMPLETED',
        priority: 'HIGH',
        assignedBy: semhalNurseId,
        assignedByName: 'Dr. Admin',
        assignedTo: semhalNurseId,
        assignedToName: 'Semhal Melaku',
        dueDate: new Date(currentDate.getTime() - 48 * 60 * 60 * 1000), // 2 days ago
        completedDate: new Date(currentDate.getTime() - 47 * 60 * 60 * 1000), // 2 days ago
        notes: 'Wound healing well, no signs of infection'
      }
    ];

    const completedResult = await mongoose.connection.collection('nursetasks').insertMany(completedTasks);
    console.log(`✅ Created ${completedResult.insertedCount} completed tasks for reporting`);

    // 5. VITAL SIGNS RECORDS - Create some blood pressure records
    console.log('\n💓 Creating Blood Pressure records...');
    const vitalSignsRecords = [
      {
        patientId: patients[0]._id,
        patientName: `${patients[0].firstName} ${patients[0].lastName}`,
        systolic: 120,
        diastolic: 80,
        pulse: 72,
        temperature: 36.8,
        weight: 70,
        height: 170,
        bmi: 24.2,
        spo2: 98,
        respiratoryRate: 16,
        position: 'sitting',
        arm: 'left',
        notes: 'Normal blood pressure reading',
        measurementDate: new Date(),
        recordedAt: new Date(),
        measuredBy: semhalNurseId,
        measuredByName: 'Semhal Melaku',
        fileType: 'single',
        status: 'normal'
      },
      {
        patientId: patients[1]?._id || patients[0]._id,
        patientName: patients[1] ? `${patients[1].firstName} ${patients[1].lastName}` : `${patients[0].firstName} ${patients[0].lastName}`,
        systolic: 140,
        diastolic: 90,
        pulse: 85,
        temperature: 37.2,
        weight: 65,
        height: 165,
        bmi: 23.9,
        spo2: 96,
        respiratoryRate: 18,
        position: 'sitting',
        arm: 'right',
        notes: 'Slightly elevated BP, monitor closely',
        measurementDate: new Date(),
        recordedAt: new Date(),
        measuredBy: semhalNurseId,
        measuredByName: 'Semhal Melaku',
        fileType: 'single',
        status: 'warning'
      }
    ];

    const vitalSignsResult = await mongoose.connection.collection('vitalsigns').insertMany(vitalSignsRecords);
    console.log(`✅ Created ${vitalSignsResult.insertedCount} vital signs records`);

    // Summary
    console.log('\n📋 SUMMARY - All sections populated:');
    console.log('   🩺 Blood Pressure: PENDING tasks created');
    console.log('   🔧 Procedures: Wound care and catheter care procedures created');
    console.log('   📅 Schedule: Nurse appointments created');
    console.log('   📊 Monthly Report: Completed tasks and vital signs records created');
    console.log('\n✅ All sections now have real data and should not show empty states!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

populateAllSections();
