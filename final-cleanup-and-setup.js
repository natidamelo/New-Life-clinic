const mongoose = require('mongoose');

// MongoDB connection
const MONGO_URI = 'mongodb://localhost:27017/clinic-cms';

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB (clinic_cms)');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// Schemas
const nurseTaskSchema = new mongoose.Schema({}, { strict: false });
const NurseTask = mongoose.model('NurseTask', nurseTaskSchema);

const patientSchema = new mongoose.Schema({}, { strict: false });
const Patient = mongoose.model('Patient', patientSchema);

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema);

async function finalCleanupAndSetup() {
  try {
    await connectDB();
    
    console.log('🗑️ Step 1: Deleting ALL existing medication tasks...\n');
    
    // Delete ALL medication tasks to start fresh
    const deleteResult = await NurseTask.deleteMany({ taskType: 'MEDICATION' });
    console.log(`✅ Deleted ${deleteResult.deletedCount} medication tasks\n`);
    
    console.log('👥 Step 2: Finding patients and users...\n');
    
    // Find patients
    const patients = await Patient.find({}).limit(5);
    console.log(`Found ${patients.length} patients:`);
    patients.forEach(p => console.log(`   - ${p.firstName} ${p.lastName} (ID: ${p._id})`));
    
    // Find users (for assignedBy and assignedTo)
    const users = await User.find({}).limit(5);
    console.log(`\nFound ${users.length} users:`);
    users.forEach(u => console.log(`   - ${u.firstName} ${u.lastName} (ID: ${u._id})`));
    
    if (patients.length === 0) {
      console.log('❌ No patients found. Cannot create medication tasks.');
      return;
    }
    
    if (users.length === 0) {
      console.log('❌ No users found. Cannot create medication tasks.');
      return;
    }
    
    console.log('\n💊 Step 3: Creating fresh medication tasks with payment authorization...\n');
    
    const medications = ['Ceftriaxone', 'Metoclopramide', 'Amoxicillin'];
    const frequencies = ['Once daily', 'Twice daily', 'Three times daily'];
    const durations = [5, 7, 10];
    
    const newTasks = [];
    let taskCount = 0;
    
    // Create 3 tasks for each patient
    for (const patient of patients) {
      for (let i = 0; i < 3; i++) {
        const medication = medications[i % medications.length];
        const frequency = frequencies[i % frequencies.length];
        const duration = durations[i % durations.length];
        
        // Calculate doses and cost
        let dosesPerDay = 1;
        if (frequency.includes('Twice')) dosesPerDay = 2;
        else if (frequency.includes('Three')) dosesPerDay = 3;
        
        const totalDoses = dosesPerDay * duration;
        const costPerDose = 25;
        const totalCost = totalDoses * costPerDose;
        
        // Determine payment status based on patient name
        let paymentStatus, paidDays, authorizedDoses, unauthorizedDoses, outstandingAmount;
        const patientName = `${patient.firstName} ${patient.lastName}`;
        
        if (patientName.toLowerCase().includes('samuel')) {
          // Samuel: unpaid
          paymentStatus = 'unpaid';
          paidDays = 0;
          authorizedDoses = 0;
          unauthorizedDoses = totalDoses;
          outstandingAmount = totalCost;
        } else if (patientName.toLowerCase().includes('natan')) {
          // Natan: partially paid
          paymentStatus = 'partially_paid';
          paidDays = Math.floor(duration * 0.6);
          authorizedDoses = paidDays * dosesPerDay;
          unauthorizedDoses = totalDoses - authorizedDoses;
          outstandingAmount = unauthorizedDoses * costPerDose;
        } else {
          // Others: mix of statuses
          if (i === 0) {
            paymentStatus = 'fully_paid';
            paidDays = duration;
            authorizedDoses = totalDoses;
            unauthorizedDoses = 0;
            outstandingAmount = 0;
          } else if (i === 1) {
            paymentStatus = 'partially_paid';
            paidDays = Math.floor(duration * 0.5);
            authorizedDoses = paidDays * dosesPerDay;
            unauthorizedDoses = totalDoses - authorizedDoses;
            outstandingAmount = unauthorizedDoses * costPerDose;
          } else {
            paymentStatus = 'unpaid';
            paidDays = 0;
            authorizedDoses = 0;
            unauthorizedDoses = totalDoses;
            outstandingAmount = totalCost;
          }
        }
        
        const newTask = {
          patientId: patient._id,
          patientName: patientName,
          taskType: 'MEDICATION',
          description: `Administer ${medication} to patient ${patientName}. Payment status: ${paymentStatus}.`,
          status: 'PENDING',
          priority: 'HIGH',
          assignedBy: users[0]._id,
          assignedTo: users[users.length > 1 ? 1 : 0]._id,
          assignedToName: `${users[users.length > 1 ? 1 : 0].firstName} ${users[users.length > 1 ? 1 : 0].lastName}`,
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
          medicationDetails: {
            medicationName: medication,
            dosage: '1g',
            frequency: frequency,
            route: 'oral',
            instructions: 'Administer as prescribed',
            duration: duration,
            doseRecords: []
          },
          serviceName: medication,
          paymentAuthorization: {
            paymentStatus: paymentStatus,
            paidDays: paidDays,
            totalDays: duration,
            authorizedDoses: authorizedDoses,
            unauthorizedDoses: unauthorizedDoses,
            outstandingAmount: outstandingAmount,
            lastUpdated: new Date()
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        newTasks.push(newTask);
        taskCount++;
        
        console.log(`📋 Task ${taskCount}: ${patientName} - ${medication}`);
        console.log(`   💰 Payment: ${paymentStatus} | Outstanding: ETB ${outstandingAmount}`);
        console.log(`   📊 Doses: ${authorizedDoses}/${totalDoses} | Duration: ${duration} days`);
      }
    }
    
    // Insert all tasks
    const insertResult = await NurseTask.insertMany(newTasks);
    console.log(`\n✅ Created ${insertResult.length} new medication tasks\n`);
    
    // Summary by payment status
    const unpaidTasks = newTasks.filter(t => t.paymentAuthorization.paymentStatus === 'unpaid');
    const partiallyPaidTasks = newTasks.filter(t => t.paymentAuthorization.paymentStatus === 'partially_paid');
    const fullyPaidTasks = newTasks.filter(t => t.paymentAuthorization.paymentStatus === 'fully_paid');
    
    console.log('📊 Payment Status Summary:');
    console.log(`   🔴 Unpaid: ${unpaidTasks.length} tasks`);
    console.log(`   🟡 Partially Paid: ${partiallyPaidTasks.length} tasks`);
    console.log(`   🟢 Fully Paid: ${fullyPaidTasks.length} tasks`);
    
    console.log('\n🎯 Setup Complete!');
    console.log('   - Database is now clean with fresh medication tasks');
    console.log('   - All tasks have proper payment authorization data');
    console.log('   - Samuel tasks: UNPAID (red badges expected)');
    console.log('   - Natan tasks: PARTIALLY_PAID (yellow badges expected)');
    console.log('   - Other patients: Mixed status for variety');
    console.log('\n💡 Refresh your frontend to see the payment status indicators!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Run the cleanup and setup
finalCleanupAndSetup();
