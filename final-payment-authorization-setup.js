const mongoose = require('mongoose');

async function setupPaymentAuthorization() {
  try {
    // Connect to the correct database: clinic_cms
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to MongoDB (clinic_cms)');

    // Define the NurseTask schema
    const nurseTaskSchema = new mongoose.Schema({
      patientId: mongoose.Schema.Types.ObjectId,
      patientName: String,
      medicationDetails: {
        medicationName: String,
        dosage: String,
        frequency: String,
        duration: Number,
        route: String,
        instructions: String
      },
      paymentAuthorization: {
        paymentStatus: {
          type: String,
          enum: ['unpaid', 'partially_paid', 'fully_paid'],
          default: 'unpaid'
        },
        authorizedDoses: { type: Number, default: 0 },
        unauthorizedDoses: { type: Number, default: 0 },
        paidDays: { type: Number, default: 0 },
        totalDays: { type: Number, default: 0 },
        outstandingAmount: { type: Number, default: 0 }
      },
      taskType: { type: String, default: 'MEDICATION' },
      status: { type: String, default: 'PENDING' },
      assignedTo: mongoose.Schema.Types.ObjectId,
      priority: { type: String, default: 'MEDIUM' },
      scheduledTime: Date,
      doseNumber: Number,
      dayNumber: Number
    }, { timestamps: true });

    const NurseTask = mongoose.model('NurseTask', nurseTaskSchema);

    // Get existing patients
    const Patient = mongoose.connection.collection('patients');
    const existingPatients = await Patient.find({}).toArray();
    console.log(`📋 Found ${existingPatients.length} existing patients`);

    existingPatients.forEach((patient, i) => {
      console.log(`${i+1}. ${patient.firstName} ${patient.lastName} (ID: ${patient._id})`);
    });

    // Find Samuel
    const samuelPatient = existingPatients.find(p => 
      p.firstName.toLowerCase().includes('samuel') || 
      p.lastName.toLowerCase().includes('negatu')
    );

    if (!samuelPatient) {
      console.log('❌ Samuel Negatu not found in patients');
      return;
    }

    console.log(`✅ Found Samuel: ${samuelPatient.firstName} ${samuelPatient.lastName}`);

    // Create Natan Kinfe patient
    let natanPatient;
    try {
      const natanResult = await Patient.insertOne({
        firstName: 'Natan',
        lastName: 'Kinfe',
        age: 32,
        gender: 'male',
        contactNumber: '0912399449',
        email: '',
        address: 'Bahir Dar',
        department: 'general',
        priority: 'normal',
        status: 'scheduled',
        vitals: {},
        treatments: [],
        woundCare: [],
        medicalHistory: [],
        allergies: [],
        imaging: [],
        doctorOrders: [],
        diabetic: false,
        isActive: true,
        lastVisit: new Date(),
        cardStatus: 'active',
        medications: [],
        createdAt: new Date()
      });
      natanPatient = { _id: natanResult.insertedId, firstName: 'Natan', lastName: 'Kinfe' };
      console.log(`✅ Created Natan Kinfe patient: ${natanPatient._id}`);
    } catch (error) {
      console.log('⚠️ Could not create Natan patient, will use Samuel only');
    }

    // Clear existing nurse tasks
    await NurseTask.deleteMany({});
    console.log('🗑️ Cleared existing nurse tasks');

    // Get Semhal's nurse ID (the logged-in nurse)
    const semhalNurseId = new mongoose.Types.ObjectId('6823859485e2a37d8cb420ed');

    // Create medication tasks for Samuel Negatu (Ceftriaxone - 7 days, twice daily)
    const samuelTasks = [];
    const baseTime = new Date();
    baseTime.setHours(9, 0, 0, 0); // Start at 9 AM

    for (let day = 1; day <= 7; day++) {
      // Morning dose (9 AM)
      const morningTime = new Date(baseTime);
      morningTime.setDate(baseTime.getDate() + day - 1);
      morningTime.setHours(9, 0, 0, 0);

      samuelTasks.push({
        patientId: samuelPatient._id,
        patientName: `${samuelPatient.firstName} ${samuelPatient.lastName}`,
        medicationDetails: {
          medicationName: 'Ceftriaxone',
          dosage: '1g',
          frequency: 'Twice daily',
          duration: 7,
          route: 'IV',
          instructions: 'Administer slowly over 30 minutes'
        },
        paymentAuthorization: {
          paymentStatus: 'unpaid',
          authorizedDoses: 0,
          unauthorizedDoses: 14, // 7 days × 2 doses
          paidDays: 0,
          totalDays: 7,
          outstandingAmount: 350 // ETB 50 per dose × 14 doses
        },
        taskType: 'MEDICATION',
        status: 'PENDING',
        assignedTo: semhalNurseId,
        priority: 'HIGH',
        scheduledTime: morningTime,
        doseNumber: 1,
        dayNumber: day
      });

      // Evening dose (9 PM)
      const eveningTime = new Date(morningTime);
      eveningTime.setHours(21, 0, 0, 0);

      samuelTasks.push({
        patientId: samuelPatient._id,
        patientName: `${samuelPatient.firstName} ${samuelPatient.lastName}`,
        medicationDetails: {
          medicationName: 'Ceftriaxone',
          dosage: '1g',
          frequency: 'Twice daily',
          duration: 7,
          route: 'IV',
          instructions: 'Administer slowly over 30 minutes'
        },
        paymentAuthorization: {
          paymentStatus: 'unpaid',
          authorizedDoses: 0,
          unauthorizedDoses: 14,
          paidDays: 0,
          totalDays: 7,
          outstandingAmount: 350
        },
        taskType: 'MEDICATION',
        status: 'PENDING',
        assignedTo: semhalNurseId,
        priority: 'HIGH',
        scheduledTime: eveningTime,
        doseNumber: 2,
        dayNumber: day
      });
    }

    // Create medication tasks for Natan Kinfe if we have the patient
    const natanTasks = [];
    if (natanPatient) {
      for (let day = 1; day <= 5; day++) {
        const morningTime = new Date(baseTime);
        morningTime.setDate(baseTime.getDate() + day - 1);
        morningTime.setHours(8, 0, 0, 0);

        natanTasks.push({
          patientId: natanPatient._id,
          patientName: `${natanPatient.firstName} ${natanPatient.lastName}`,
          medicationDetails: {
            medicationName: 'Amoxicillin',
            dosage: '500mg',
            frequency: 'Once daily',
            duration: 5,
            route: 'Oral',
            instructions: 'Take with food'
          },
          paymentAuthorization: {
            paymentStatus: 'partially_paid',
            authorizedDoses: 3, // Only 3 doses paid
            unauthorizedDoses: 2, // 2 doses unpaid
            paidDays: 3,
            totalDays: 5,
            outstandingAmount: 50 // ETB 25 per dose × 2 remaining doses
          },
          taskType: 'MEDICATION',
          status: 'PENDING',
          assignedTo: semhalNurseId,
          priority: 'MEDIUM',
          scheduledTime: morningTime,
          doseNumber: 1,
          dayNumber: day
        });
      }
    }

    // Insert all tasks
    const allTasks = [...samuelTasks, ...natanTasks];
    await NurseTask.insertMany(allTasks);

    console.log(`\n✅ Created ${samuelTasks.length} medication tasks for ${samuelPatient.firstName} ${samuelPatient.lastName}`);
    if (natanPatient) {
      console.log(`✅ Created ${natanTasks.length} medication tasks for ${natanPatient.firstName} ${natanPatient.lastName}`);
    }
    console.log(`✅ Total tasks created: ${allTasks.length}`);

    // Verify the data
    const taskCount = await NurseTask.countDocuments();
    console.log(`\n📋 Total tasks in database: ${taskCount}`);

    // Show payment status summary
    console.log('\n💰 Payment Status Summary:');
    console.log(`   ${samuelPatient.firstName} ${samuelPatient.lastName}: ${samuelTasks[0].paymentAuthorization.paymentStatus} (ETB ${samuelTasks[0].paymentAuthorization.outstandingAmount} outstanding)`);
    if (natanPatient && natanTasks.length > 0) {
      console.log(`   ${natanPatient.firstName} ${natanPatient.lastName}: ${natanTasks[0].paymentAuthorization.paymentStatus} (ETB ${natanTasks[0].paymentAuthorization.outstandingAmount} outstanding)`);
    }

    // Show sample tasks
    console.log('\n📋 Sample tasks created:');
    const sampleTasks = await NurseTask.find({}).limit(4).lean();
    sampleTasks.forEach((task, i) => {
      console.log(`${i+1}. ${task.patientName} - ${task.medicationDetails.medicationName} (${task.paymentAuthorization.paymentStatus}) - Day ${task.dayNumber}, Dose ${task.doseNumber}`);
    });

    console.log('\n🎯 Payment Authorization System Ready!');
    console.log('   - Samuel Negatu has UNPAID Ceftriaxone (red badge expected)');
    if (natanPatient) {
      console.log('   - Natan Kinfe has PARTIALLY PAID Amoxicillin (yellow badge expected)');
    }
    console.log('   - Refresh your frontend to see the payment status indicators');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

setupPaymentAuthorization();
