/**
 * Cleanup Script: Remove Duplicate Diclofenac Tasks for Girmay
 * 
 * This script finds and removes duplicate nurse tasks for Diclofenac
 * for patient Girmay Alefom, keeping only the most recent one.
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms';

async function cleanupDuplicateTasks() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const NurseTask = require('./backend/models/NurseTask');
    const Patient = require('./backend/models/Patient');

    // Find patient Girmay Alefom
    const patient = await Patient.findOne({
      image.png    $or: [
        { firstName: /girmay/i, lastName: /alefom/i },
        { firstName: /girmay/i }
      ]
    });

    if (!patient) {
      console.log('❌ Patient Girmay Alefom not found');
      return;
    }

    console.log(`✅ Found patient: ${patient.firstName} ${patient.lastName} (ID: ${patient._id})`);

    // Find all Diclofenac tasks for this patient
    const diclofenacTasks = await NurseTask.find({
      patientId: patient._id,
      'medicationDetails.medicationName': /diclofenac/i,
      taskType: 'MEDICATION',
      status: { $in: ['PENDING', 'IN_PROGRESS'] }
    }).sort({ createdAt: -1 }); // Most recent first

    console.log(`\n📋 Found ${diclofenacTasks.length} Diclofenac tasks for ${patient.firstName} ${patient.lastName}`);

    if (diclofenacTasks.length <= 1) {
      console.log('✅ No duplicates found. All good!');
      return;
    }

    // Group tasks by prescription ID
    const tasksByPrescription = new Map();
    diclofenacTasks.forEach(task => {
      const prescriptionId = task.medicationDetails?.prescriptionId || task.prescriptionId || 'no-prescription';
      if (!tasksByPrescription.has(prescriptionId)) {
        tasksByPrescription.set(prescriptionId, []);
      }
      tasksByPrescription.get(prescriptionId).push(task);
    });

    console.log(`\n📦 Grouped into ${tasksByPrescription.size} prescription groups`);

    let totalRemoved = 0;

    // For each prescription group, keep the most recent task and remove duplicates
    for (const [prescriptionId, tasks] of tasksByPrescription) {
      if (tasks.length <= 1) {
        continue; // No duplicates in this group
      }

      console.log(`\n🔍 Prescription: ${prescriptionId}`);
      console.log(`   Found ${tasks.length} tasks - keeping the most recent one`);

      // Sort by creation date (most recent first)
      tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Keep the first (most recent) task
      const taskToKeep = tasks[0];
      const tasksToRemove = tasks.slice(1);

      console.log(`   ✅ Keeping task: ${taskToKeep._id} (created: ${taskToKeep.createdAt})`);

      // Remove duplicate tasks
      for (const task of tasksToRemove) {
        await NurseTask.findByIdAndDelete(task._id);
        totalRemoved++;
        console.log(`   🗑️  Removed duplicate task: ${task._id} (created: ${task.createdAt})`);
      }
    }

    console.log(`\n✅ Cleanup complete! Removed ${totalRemoved} duplicate task(s)`);
    console.log(`   Remaining tasks: ${diclofenacTasks.length - totalRemoved}`);

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the cleanup
cleanupDuplicateTasks();

