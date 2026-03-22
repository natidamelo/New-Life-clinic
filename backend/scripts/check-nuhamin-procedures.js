const mongoose = require('mongoose');
require('dotenv').config();

const Procedure = require('../models/Procedure');
const User = require('../models/User');

async function checkNuhaminProcedures() {
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

    console.log('\n👤 Nuhamin User Info:');
    console.log('  ID:', nuhamin._id);
    console.log('  Name:', nuhamin.firstName, nuhamin.lastName);
    console.log('  Username:', nuhamin.username);
    console.log('  Email:', nuhamin.email);
    console.log('  Role:', nuhamin.role);

    // Check all procedures
    const allProcedures = await Procedure.find({})
      .populate('assignedNurse', 'firstName lastName username')
      .populate('patientId', 'firstName lastName')
      .sort({ createdAt: -1 });

    console.log('\n📊 Total Procedures in Database:', allProcedures.length);

    // Check procedures assigned to Nuhamin
    const nuhaminProcedures = await Procedure.find({ assignedNurse: nuhamin._id })
      .populate('patientId', 'firstName lastName')
      .sort({ scheduledTime: 1 });

    console.log('\n📋 Procedures Assigned to Nuhamin:', nuhaminProcedures.length);

    if (nuhaminProcedures.length === 0) {
      console.log('\n⚠️  No procedures assigned to Nuhamin!');
      
      if (allProcedures.length > 0) {
        console.log('\n📝 Procedures assigned to other nurses:');
        allProcedures.slice(0, 10).forEach((proc, index) => {
          const nurse = proc.assignedNurse;
          const nurseName = nurse ? `${nurse.firstName} ${nurse.lastName} (${nurse.username})` : 'Unassigned';
          console.log(`  ${index + 1}. ${proc.procedureName} - Patient: ${proc.patientName} - Assigned to: ${nurseName}`);
        });
      } else {
        console.log('\n⚠️  No procedures exist in the database at all!');
      }
    } else {
      console.log('\n✅ Nuhamin has procedures:');
      nuhaminProcedures.forEach((proc, index) => {
        console.log(`  ${index + 1}. ${proc.procedureName} - Patient: ${proc.patientName} - Status: ${proc.status}`);
      });
    }

    // Check if there are unassigned procedures
    const unassignedProcedures = await Procedure.find({ assignedNurse: null });
    console.log('\n📋 Unassigned Procedures:', unassignedProcedures.length);

    // Check procedures by assigned nurse
    const proceduresByNurse = await Procedure.aggregate([
      {
        $group: {
          _id: '$assignedNurse',
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'nurse'
        }
      }
    ]);

    console.log('\n📊 Procedures by Nurse:');
    proceduresByNurse.forEach(item => {
      const nurse = item.nurse[0];
      const nurseName = nurse ? `${nurse.firstName} ${nurse.lastName} (${nurse.username})` : 'Unassigned';
      console.log(`  ${nurseName}: ${item.count} procedures`);
    });

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

checkNuhaminProcedures();

