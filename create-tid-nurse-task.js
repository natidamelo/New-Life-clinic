const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const NurseTask = require('./backend/models/NurseTask');
const Prescription = require('./backend/models/Prescription');

async function createTIDNurseTask() {
  try {
    console.log('🔍 [TID NURSE TASK] Looking for TID prescription...');
    
    // Find the TID prescription
    const prescription = await Prescription.findOne({
      frequency: { $regex: /tid|three times daily/i }
    }).populate('patient').populate('doctor');
    
    if (!prescription) {
      console.log('❌ [TID NURSE TASK] No TID prescription found');
      return;
    }
    
    console.log(`✅ [TID NURSE TASK] Found TID prescription: ${prescription._id}`);
    console.log(`📋 [TID NURSE TASK] Medication: ${prescription.medicationName}`);
    console.log(`📋 [TID NURSE TASK] Frequency: ${prescription.frequency}`);
    console.log(`📋 [TID NURSE TASK] Duration: ${prescription.duration}`);
    console.log(`📋 [TID NURSE TASK] Patient: ${prescription.patient?.firstName} ${prescription.patient?.lastName}`);
    
    // Check if nurse task already exists
    const existingTask = await NurseTask.findOne({
      prescriptionId: prescription._id
    });
    
    if (existingTask) {
      console.log(`⚠️ [TID NURSE TASK] Nurse task already exists: ${existingTask._id}`);
      console.log(`📋 [TID NURSE TASK] Current frequency: ${existingTask.medicationDetails.frequency}`);
      console.log(`📋 [TID NURSE TASK] Current dose records: ${existingTask.medicationDetails.doseRecords?.length || 0}`);
      return;
    }
    
    // Calculate duration
    let duration = 14; // Default from prescription
    if (prescription.duration) {
      const durationMatch = prescription.duration.toString().match(/(\d+)/);
      if (durationMatch) {
        duration = parseInt(durationMatch[1]);
      }
    }
    
    console.log(`📋 [TID NURSE TASK] Calculated duration: ${duration} days`);
    
    // Create dose records for TID (3 doses per day)
    const doseRecords = [];
    const timeSlots = ['09:00', '15:00', '21:00']; // Morning, Afternoon, Evening
    
    for (let day = 1; day <= duration; day++) {
      for (let doseIndex = 0; doseIndex < 3; doseIndex++) {
        doseRecords.push({
          day: day,
          timeSlot: timeSlots[doseIndex],
          administered: false,
          administeredAt: null,
          administeredBy: null,
          notes: ''
        });
      }
    }
    
    console.log(`📋 [TID NURSE TASK] Created ${doseRecords.length} dose records (${duration} days × 3 doses/day)`);
    
    // Create the nurse task
    const nurseTask = new NurseTask({
      patientId: prescription.patient._id,
      patientName: `${prescription.patient.firstName} ${prescription.patient.lastName}`,
      taskType: 'MEDICATION',
      description: `Administer ${prescription.medicationName} ${prescription.dosage} ${prescription.frequency} for ${duration} days`,
      status: 'PENDING',
      priority: 'MEDIUM',
      assignedBy: prescription.doctor._id,
      dueDate: new Date(Date.now() + (duration * 24 * 60 * 60 * 1000)), // Due in duration days
      notes: `TID prescription created by doctor on ${new Date().toLocaleString()}`,
      prescriptionId: prescription._id,
      medicationDetails: {
        medicationName: prescription.medicationName,
        dosage: prescription.dosage,
        frequency: prescription.frequency,
        route: prescription.route,
        instructions: prescription.instructions,
        duration: duration,
        startDate: prescription.datePrescribed || new Date(),
        doseRecords: doseRecords,
        dosesPerDay: 3,
        isExtension: prescription.status === 'Extended',
        extensionDetails: prescription.extensionDetails || null
      }
    });
    
    await nurseTask.save();
    
    console.log(`✅ [TID NURSE TASK] Successfully created nurse task: ${nurseTask._id}`);
    console.log(`📋 [TID NURSE TASK] Task details:`);
    console.log(`   - Patient: ${nurseTask.patientName}`);
    console.log(`   - Medication: ${nurseTask.medicationDetails.medicationName}`);
    console.log(`   - Frequency: ${nurseTask.medicationDetails.frequency}`);
    console.log(`   - Duration: ${nurseTask.medicationDetails.duration} days`);
    console.log(`   - Dose records: ${nurseTask.medicationDetails.doseRecords.length}`);
    console.log(`   - Doses per day: ${nurseTask.medicationDetails.dosesPerDay}`);
    
    // Verify the dose records
    console.log(`\n🔍 [TID NURSE TASK] Verifying dose records...`);
    const doseRecordsByDay = {};
    doseRecords.forEach(record => {
      if (!doseRecordsByDay[record.day]) {
        doseRecordsByDay[record.day] = [];
      }
      doseRecordsByDay[record.day].push(record);
    });
    
    Object.keys(doseRecordsByDay).forEach(day => {
      const dayRecords = doseRecordsByDay[day];
      const timeSlots = dayRecords.map(r => r.timeSlot).sort();
      console.log(`   Day ${day}: ${timeSlots.join(', ')} (${dayRecords.length} doses)`);
    });
    
    console.log(`\n🎉 [TID NURSE TASK] TID nurse task creation completed successfully!`);
    console.log(`💡 [TID NURSE TASK] The nurse should now see 3 dose slots per day (Morning, Afternoon, Evening)`);
    
  } catch (error) {
    console.error('❌ [TID NURSE TASK] Error creating TID nurse task:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the script
createTIDNurseTask();
