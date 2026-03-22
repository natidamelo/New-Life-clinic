#!/usr/bin/env node

/**
 * EMERGENCY SYNC SCRIPT: Create Nurse Tasks for Paid Medications
 * 
 * This script ensures that all paid prescriptions have corresponding nurse tasks.
 * It's designed to fix the root cause where payments were processed but nurse tasks weren't created.
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

const syncPaidMedicationsToNurseTasks = async () => {
  try {
    const Prescription = require('../models/Prescription');
    const NurseTask = require('../models/NurseTask');
    const Patient = require('../models/Patient');
    const User = require('../models/User');
    
    console.log('🔍 Finding paid prescriptions without nurse tasks...');
    
    // Find all paid prescriptions
    const paidPrescriptions = await Prescription.find({
      paymentStatus: { $in: ['paid', 'fully_paid', 'partial', 'partially_paid'] },
      sendToNurse: { $ne: false } // Include prescriptions that should go to nurse
    }).populate('patient').populate('doctor');
    
    console.log(`📋 Found ${paidPrescriptions.length} paid prescriptions`);
    
    let tasksCreated = 0;
    let tasksSkipped = 0;
    let errors = 0;
    
    for (const prescription of paidPrescriptions) {
      try {
        // Check if nurse task already exists for this prescription
        const existingTask = await NurseTask.findOne({
          'medicationDetails.prescriptionId': prescription._id.toString()
        });
        
        if (existingTask) {
          console.log(`⏭️ Task already exists for prescription ${prescription._id}`);
          tasksSkipped++;
          continue;
        }
        
        // Get patient info
        const patient = prescription.patient;
        if (!patient) {
          console.error(`❌ No patient found for prescription ${prescription._id}`);
          errors++;
          continue;
        }
        
        // Find an available nurse
        const nurse = await User.findOne({ role: 'nurse', isActive: true });
        
        // Handle multiple medications or single medication
        const medicationsToProcess = prescription.medications && prescription.medications.length > 0 
          ? prescription.medications 
          : [{
              name: prescription.medicationName,
              dosage: prescription.dosage,
              frequency: prescription.frequency,
              route: prescription.route || 'Oral',
              duration: prescription.duration || '5 days'
            }];
        
        for (const medication of medicationsToProcess) {
          // Generate dose records based on frequency
          const frequency = medication.frequency || 'Once daily (QD)';
          const duration = parseInt((medication.duration || prescription.duration || '5 days').match(/(\d+)/)?.[1] || '5');
          
          let dosesPerDay = 1;
          let timeSlots = ['09:00'];
          
          if (frequency.toLowerCase().includes('bid') || frequency.toLowerCase().includes('twice')) {
            dosesPerDay = 2;
            timeSlots = ['09:00', '21:00'];
          } else if (frequency.toLowerCase().includes('tid') || frequency.toLowerCase().includes('three')) {
            dosesPerDay = 3;
            timeSlots = ['08:00', '14:00', '20:00'];
          } else if (frequency.toLowerCase().includes('qid') || frequency.toLowerCase().includes('four')) {
            dosesPerDay = 4;
            timeSlots = ['06:00', '12:00', '18:00', '24:00'];
          }
          
          const doseRecords = [];
          for (let day = 1; day <= duration; day++) {
            for (let slotIndex = 0; slotIndex < timeSlots.length; slotIndex++) {
              doseRecords.push({
                day: day,
                timeSlot: timeSlots[slotIndex],
                slotIndex: slotIndex,
                administered: false,
                administeredAt: null,
                administeredBy: null,
                notes: '',
                period: 'active'
              });
            }
          }
          
          // Create nurse task
          const nurseTask = new NurseTask({
            patientId: patient._id,
            patientName: `${patient.firstName} ${patient.lastName}`,
            taskType: 'MEDICATION',
            status: 'PENDING',
            priority: 'MEDIUM',
            description: `Administer ${medication.name} - ${medication.dosage} - ${frequency}`,
            assignedBy: prescription.doctor?._id || null,
            assignedByName: prescription.doctor ? `${prescription.doctor.firstName || ''} ${prescription.doctor.lastName || ''}`.trim() : 'System',
            assignedTo: nurse?._id || null,
            assignedToName: nurse ? `${nurse.firstName || ''} ${nurse.lastName || ''}`.trim() : null,
            dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Due in 24 hours
            notes: `Payment completed. Ready for administration. Created by sync script.`,
            medicationDetails: {
              medicationName: medication.name,
              dosage: medication.dosage,
              frequency: frequency,
              route: medication.route || 'Oral',
              instructions: prescription.instructions || prescription.notes || 'Follow prescription',
              duration: duration,
              startDate: prescription.datePrescribed || prescription.createdAt || new Date(),
              prescriptionId: prescription._id.toString(),
              doseRecords: doseRecords
            },
            paymentAuthorization: {
              paidDays: duration,
              totalDays: duration,
              paymentStatus: 'fully_paid',
              canAdminister: true,
              authorizedDoses: doseRecords.length,
              unauthorizedDoses: 0,
              outstandingAmount: 0,
              totalCost: prescription.totalCost || 0,
              amountPaid: prescription.totalCost || 0,
              lastUpdated: new Date()
            },
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          await nurseTask.save();
          console.log(`✅ Created nurse task for ${medication.name} - Patient: ${patient.firstName} ${patient.lastName}`);
          tasksCreated++;
        }
        
      } catch (error) {
        console.error(`❌ Error processing prescription ${prescription._id}:`, error);
        errors++;
      }
    }
    
    console.log('\n🎉 SYNC COMPLETE!');
    console.log(`📊 Summary:`);
    console.log(`   ✅ Tasks Created: ${tasksCreated}`);
    console.log(`   ⏭️ Tasks Skipped: ${tasksSkipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📋 Total Prescriptions Processed: ${paidPrescriptions.length}`);
    
  } catch (error) {
    console.error('❌ Script failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

const main = async () => {
  console.log('🚀 Starting paid medications to nurse tasks sync...');
  await connectDB();
  await syncPaidMedicationsToNurseTasks();
};

// Run the script if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { syncPaidMedicationsToNurseTasks };
