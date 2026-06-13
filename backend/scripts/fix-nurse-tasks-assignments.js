const mongoose = require('mongoose');
require('dotenv').config();

const NurseTask = require('../models/NurseTask');
const Prescription = require('../models/Prescription');
const User = require('../models/User');

async function fixNurseTaskAssignments() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/clinic-cms';
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // 1. Find all active/inactive nurses to help with names
    const nurses = await User.find({ role: 'nurse' });
    console.log(`📊 Found ${nurses.length} total nurses in database`);
    const nurseMap = new Map();
    nurses.forEach(n => {
      nurseMap.set(n._id.toString(), `${n.firstName || ''} ${n.lastName || ''}`.trim());
    });

    // Find Nuhamin specifically
    const nuhamin = nurses.find(n => n.username === 'Nuhamin' || n.email === 'nuhamin@clinic.com');
    if (nuhamin) {
      console.log(`👤 Found Nuhamin's user ID: ${nuhamin._id}`);
    } else {
      console.log('⚠️ Nuhamin user not found in database!');
    }

    // 2. Find all NurseTasks where assignedTo is missing
    const tasksToFix = await NurseTask.find({
      $or: [
        { assignedTo: null },
        { assignedTo: { $exists: false } }
      ]
    });

    console.log(`📋 Found ${tasksToFix.length} nurse tasks with missing 'assignedTo' field`);

    let fixedCount = 0;

    for (const task of tasksToFix) {
      let resolvedNurseId = null;

      // Try to find nurse from prescription
      if (task.prescriptionId) {
        const rx = await Prescription.findById(task.prescriptionId);
        if (rx) {
          // If the prescription itself has medications, check for matching medication name
          if (rx.medications && rx.medications.length > 0) {
            const match = rx.medications.find(m => 
              m.name && task.medicationDetails?.medicationName &&
              m.name.toLowerCase() === task.medicationDetails.medicationName.toLowerCase()
            );
            if (match && match.assignedNurseId) {
              resolvedNurseId = match.assignedNurseId.toString();
              console.log(`🔍 Resolved nurse ${resolvedNurseId} from prescription medications for task: ${task.description}`);
            }
          }
        }
      }

      // Fallback: If no nurse resolved yet, but Nuhamin exists, assign to Nuhamin
      if (!resolvedNurseId && nuhamin) {
        resolvedNurseId = nuhamin._id.toString();
        console.log(`💡 Falling back to assign task to Nuhamin: ${task.description}`);
      }

      if (resolvedNurseId) {
        task.assignedTo = resolvedNurseId;
        
        // Also set assignedToName
        const nurseName = nurseMap.get(resolvedNurseId);
        if (nurseName) {
          task.assignedToName = nurseName;
        } else {
          // Fetch from DB if not in map
          const user = await User.findById(resolvedNurseId);
          if (user) {
            const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
            task.assignedToName = name;
            nurseMap.set(resolvedNurseId, name);
          }
        }
        
        // Also set assignedNurse for backward compatibility in case any query uses it
        task.assignedNurse = resolvedNurseId;

        await task.save();
        fixedCount++;
      }
    }

    console.log(`\n🎉 Completed! Successfully fixed and assigned ${fixedCount} tasks.`);

  } catch (error) {
    console.error('❌ Error fixing nurse task assignments:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

fixNurseTaskAssignments();
