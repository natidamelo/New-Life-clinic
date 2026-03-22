const mongoose = require('mongoose');
require('dotenv').config();

const Procedure = require('../models/Procedure');
const User = require('../models/User');

async function assignProceduresToNuhamin() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/clinic-cms';
    console.log('🔌 Connecting to MongoDB:', mongoUri.replace(/mongodb:\/\/([^:]+):([^@]+)@/, 'mongodb://****:****@'));
    
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log('✅ Connected to MongoDB');

    // Find Nuhamin user
    const nuhamin = await User.findOne({
      $or: [
        { username: 'Nuhamin' },
        { email: 'nuhamin@clinic.com' },
        { firstName: 'Nuhamin', lastName: 'Yohannes' }
      ]
    });

    if (!nuhamin) {
      console.log('❌ Nuhamin user not found!');
      return;
    }

    console.log('👤 Found Nuhamin:', nuhamin.firstName, nuhamin.lastName);
    console.log('   ID:', nuhamin._id);

    // Find all procedures
    const allProcedures = await Procedure.find({})
      .populate('assignedNurse', 'firstName lastName');

    console.log(`\n📊 Total procedures in database: ${allProcedures.length}`);

    // Option 1: Assign all unassigned procedures to Nuhamin
    const unassignedProcedures = await Procedure.find({ 
      $or: [
        { assignedNurse: null },
        { assignedNurse: { $exists: false } }
      ]
    });

    if (unassignedProcedures.length > 0) {
      console.log(`\n📋 Found ${unassignedProcedures.length} unassigned procedures`);
      
      const result = await Procedure.updateMany(
        { 
          $or: [
            { assignedNurse: null },
            { assignedNurse: { $exists: false } }
          ]
        },
        {
          $set: {
            assignedNurse: nuhamin._id,
            assignedNurseName: `${nuhamin.firstName} ${nuhamin.lastName}`
          }
        }
      );

      console.log(`✅ Assigned ${result.modifiedCount} unassigned procedures to Nuhamin`);
    }

    // Option 2: Reassign all existing procedures to Nuhamin (if user wants)
    // Check if there are procedures assigned to other nurses
    const proceduresAssignedToOthers = await Procedure.find({
      assignedNurse: { $ne: nuhamin._id, $ne: null, $exists: true }
    }).populate('assignedNurse', 'firstName lastName username');

    if (proceduresAssignedToOthers.length > 0) {
      console.log(`\n📋 Found ${proceduresAssignedToOthers.length} procedures assigned to other nurses:`);
      proceduresAssignedToOthers.slice(0, 5).forEach((proc, index) => {
        const nurse = proc.assignedNurse;
        const nurseName = nurse ? `${nurse.firstName} ${nurse.lastName} (${nurse.username})` : 'Unknown';
        console.log(`  ${index + 1}. ${proc.procedureName} - ${proc.patientName} - Assigned to: ${nurseName}`);
      });
      
      if (proceduresAssignedToOthers.length > 5) {
        console.log(`  ... and ${proceduresAssignedToOthers.length - 5} more`);
      }

      // Reassign all procedures to Nuhamin
      console.log(`\n🔄 Reassigning all procedures to Nuhamin...`);
      const reassignResult = await Procedure.updateMany(
        { assignedNurse: { $ne: nuhamin._id, $ne: null, $exists: true } },
        {
          $set: {
            assignedNurse: nuhamin._id,
            assignedNurseName: `${nuhamin.firstName} ${nuhamin.lastName}`
          }
        }
      );

      console.log(`✅ Reassigned ${reassignResult.modifiedCount} procedures to Nuhamin`);
    }

    // Option 3: If no procedures exist, we can't assign any
    if (allProcedures.length === 0) {
      console.log('\n⚠️  No procedures exist in the database.');
      console.log('   You need to create procedures first (from service requests or manually).');
      return;
    }

    // Check final count
    const nuhaminProcedures = await Procedure.find({ assignedNurse: nuhamin._id });
    console.log(`\n✅ Nuhamin now has ${nuhaminProcedures.length} procedures assigned`);

    if (nuhaminProcedures.length > 0) {
      console.log('\n📝 Sample procedures assigned to Nuhamin:');
      nuhaminProcedures.slice(0, 5).forEach((proc, index) => {
        console.log(`  ${index + 1}. ${proc.procedureName} - ${proc.patientName} - Status: ${proc.status}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('   Stack:', error.stack);
    if (error.name === 'MongoServerSelectionError') {
      console.error('\n⚠️  MongoDB connection failed. Please ensure:');
      console.error('   1. MongoDB is running (check with: net start MongoDB)');
      console.error('   2. MongoDB service is started');
      console.error('   3. Connection string is correct:', process.env.MONGO_URI || 'mongodb://localhost:27017/clinic-cms');
    }
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('\n🔌 Disconnected from MongoDB');
    }
  }
}

assignProceduresToNuhamin();

