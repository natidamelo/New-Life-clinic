const mongoose = require('mongoose');

async function createCompleteTestData() {
  try {
    // Connect to the correct database: clinic_cms
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to MongoDB (clinic_cms)');

    // Define schemas
    const patientSchema = new mongoose.Schema({
      firstName: String,
      lastName: String,
      dateOfBirth: Date,
      gender: String,
      phoneNumber: String,
      address: String,
      emergencyContact: {
        name: String,
        relationship: String,
        phoneNumber: String
      }
    }, { timestamps: true });

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

    const Patient = mongoose.model('Patient', patientSchema);
    const NurseTask = mongoose.model('NurseTask', nurseTaskSchema);

    // Clear existing data
    await Patient.deleteMany({});
    await NurseTask.deleteMany({});
    console.log('🗑️ Cleared existing data');

    // Create Samuel Negatu patient
    const samuelPatient = new Patient({
      firstName: 'Samuel',
      lastName: 'Negatu',
      dateOfBirth: new Date('1985-03-15'),
      gender: 'Male',
      phoneNumber: '+251911234567',
      address: 'Addis Ababa, Ethiopia',
      emergencyContact: {
        name: 'Almaz Negatu',
        relationship: 'Wife',
        phoneNumber: '+251911234568'
      }
    });
    await samuelPatient.save();
    console.log(`✅ Created Samuel Negatu patient: ${samuelPatient._id}`);

    // Create Natan Kinfe patient
    const natanPatient = new Patient({
      firstName: 'Natan',
      lastName: 'Kinfe',
      dateOfBirth: new Date('1978-08-22'),
      gender: 'Male',
      phoneNumber: '+251922345678',
      address: 'Bahir Dar, Ethiopia',
      emergencyContact: {
        name: 'Hanan Kinfe',
        relationship: 'Sister',
        phoneNumber: '+251922345679'
      }
    });
    await natanPatient.save();
    console.log(`✅ Created Natan Kinfe patient: ${natanPatient._id}`);

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
        patientName: 'Samuel Negatu',
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
        patientName: 'Samuel Negatu',
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

    // Create medication tasks for Natan Kinfe (Amoxicillin - 5 days, once daily)
    const natanTasks = [];
    
    for (let day = 1; day <= 5; day++) {
      const morningTime = new Date(baseTime);
      morningTime.setDate(baseTime.getDate() + day - 1);
      morningTime.setHours(8, 0, 0, 0);

      natanTasks.push({
        patientId: natanPatient._id,
        patientName: 'Natan Kinfe',
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

    // Insert all tasks
    const allTasks = [...samuelTasks, ...natanTasks];
    await NurseTask.insertMany(allTasks);

    console.log(`\n✅ Created ${samuelTasks.length} medication tasks for Samuel Negatu`);
    console.log(`✅ Created ${natanTasks.length} medication tasks for Natan Kinfe`);
    console.log(`✅ Total tasks created: ${allTasks.length}`);

    // Verify the data
    const patientCount = await Patient.countDocuments();
    const taskCount = await NurseTask.countDocuments();
    
    console.log('\n📋 Final Verification:');
    console.log(`   Total patients: ${patientCount}`);
    console.log(`   Total tasks: ${taskCount}`);

    // Show payment status summary
    console.log('\n💰 Payment Status Summary:');
    console.log(`   Samuel Negatu: ${samuelTasks[0].paymentAuthorization.paymentStatus} (ETB ${samuelTasks[0].paymentAuthorization.outstandingAmount} outstanding)`);
    console.log(`   Natan Kinfe: ${natanTasks[0].paymentAuthorization.paymentStatus} (ETB ${natanTasks[0].paymentAuthorization.outstandingAmount} outstanding)`);

    // Show sample tasks
    console.log('\n📋 Sample tasks created:');
    const sampleTasks = await NurseTask.find({}).limit(3).lean();
    sampleTasks.forEach((task, i) => {
      console.log(`${i+1}. ${task.patientName} - ${task.medicationDetails.medicationName} (${task.paymentAuthorization.paymentStatus})`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

createCompleteTestData();
